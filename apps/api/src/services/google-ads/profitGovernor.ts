/**
 * Profit-reinvestment governor — the money-printing flywheel.
 *
 * Extends the optimizer's per-campaign decision (reuse decideCampaignAction) with
 * two account-level guardrails it lacks:
 *   1. a HARD global daily-spend cap (never let total budget exceed it), and
 *   2. a per-cycle ramp clamp (maxStepPct) so budgets ease up, never lurch.
 *
 * Money-safety invariants (each tested):
 *   - Absolute budgets only (idempotent — applying twice is a no-op).
 *   - The cap math only ever REDUCES proposed increases, never raises a budget.
 *   - allowIncreases=false (stale/missing data) ⇒ scale-ups are dropped; pauses
 *     and reductions (which only ever LOWER spend) still flow.
 */
import { listCampaigns, setCampaignStatus, setCampaignBudget } from './campaignAutomation';
import { decideCampaignAction, OptimizationConfig, DEFAULT_OPTIMIZATION_CONFIG } from './campaignOptimizer';
import { GovernorConfig, DEFAULT_GOVERNOR } from '../autonomousSettings';

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface GovernorPlanItem {
  campaignId: string; name: string; budgetResource?: string;
  action: 'scale' | 'reduce' | 'pause' | 'hold';
  fromBudget: number; toBudget: number; reason: string;
}
export interface GovernorPlan { items: GovernorPlanItem[]; projectedSpend: number; cap: number }

function toOptConfig(g: GovernorConfig): OptimizationConfig {
  return {
    targetRoas: g.targetRoas,
    minSpendToAct: g.minSpendToAct,
    zeroConvSpendCap: DEFAULT_OPTIMIZATION_CONFIG.zeroConvSpendCap,
    minConversionsToScale: DEFAULT_OPTIMIZATION_CONFIG.minConversionsToScale,
    scaleStep: g.maxStepPct,                       // ramp = single governor knob
    reduceStep: DEFAULT_OPTIMIZATION_CONFIG.reduceStep,
    maxDailyBudget: g.maxDailyBudget,
    minDailyBudget: g.minDailyBudget,
  };
}

/**
 * Pure planner: decide each ENABLED campaign's absolute next budget, then enforce
 * the ramp clamp and the account cap. No I/O.
 */
export function planBudgets(campaigns: any[], g: GovernorConfig = DEFAULT_GOVERNOR, opts: { allowIncreases?: boolean } = {}): GovernorPlan {
  const allowIncreases = opts.allowIncreases !== false; // default true; false on stale data
  const cfg = toOptConfig(g);
  const items: GovernorPlanItem[] = [];

  for (const c of campaigns) {
    if (c.status !== 'ENABLED') continue;
    const from = Number(c.dailyBudget) || 0;
    const spend = Number(c.spend) || 0;
    const conversions = Number(c.conversions) || 0;
    const d = decideCampaignAction(
      { status: c.status, spend, conversions, revenue: Number(c.revenue) || 0, dailyBudget: from },
      cfg
    );
    // CONFIDENCE-SCALED AUTHORITY: the more proven the data, the bigger a step the
    // governor may take. Thin data ⇒ near minStepPct (timid); rich data ⇒ maxStepPct.
    // "Rich" = ~5× the act thresholds. This makes always-on safe: it can't move
    // budgets aggressively until the evidence justifies it.
    const richSpend = g.minSpendToAct * 5;
    const richConv = DEFAULT_OPTIMIZATION_CONFIG.minConversionsToScale * 5;
    const dataConfidence = clamp(Math.min(spend / (richSpend || 1), conversions / (richConv || 1)), 0, 1);
    const effStep = g.minStepPct + (g.maxStepPct - g.minStepPct) * dataConfidence;
    let action = d.action as GovernorPlanItem['action'];
    let to = from;
    if (action === 'pause') {
      to = from; // budget unchanged; status will be paused
    } else if ((action === 'scale' || action === 'reduce') && typeof d.newBudget === 'number') {
      // Ramp clamp by the CONFIDENCE-SCALED step (not the raw max).
      const ramped = clamp(d.newBudget, from * (1 - effStep), from * (1 + effStep));
      to = round2(clamp(ramped, g.minDailyBudget, g.maxDailyBudget));
      if (round2(to) === round2(from)) action = 'hold';
    }
    // Stale/missing data: forbid increases (fail toward not spending). Reductions/pauses stay.
    if (!allowIncreases && to > from) { to = from; action = 'hold'; }
    items.push({ campaignId: String(c.id), name: c.name, budgetResource: c.budgetResource, action, fromBudget: from, toBudget: to, reason: d.reason });
  }

  // ACCOUNT CAP — only ever reduces increases (never raises a budget).
  const cap = g.accountMaxDailySpend;
  const nonPaused = () => items.filter((i) => i.action !== 'pause');
  let projected = nonPaused().reduce((s, i) => s + i.toBudget, 0);
  if (cap > 0 && projected > cap) {
    const increases = items.filter((i) => i.toBudget > i.fromBudget);
    const totalIncrease = increases.reduce((s, i) => s + (i.toBudget - i.fromBudget), 0);
    const baseline = projected - totalIncrease; // spend if NO increases applied
    if (totalIncrease > 0 && baseline < cap) {
      // Proportionally trim the increases so the total lands exactly at the cap.
      const factor = clamp((cap - baseline) / totalIncrease, 0, 1);
      for (const i of increases) {
        i.toBudget = round2(i.fromBudget + (i.toBudget - i.fromBudget) * factor);
        if (i.toBudget <= i.fromBudget) i.action = 'hold';
        i.reason += ` (capped to account max $${cap})`;
      }
    } else if (baseline >= cap) {
      // Even current budgets exceed the cap: throttle all non-paused down to fit.
      const f = clamp(cap / baseline, 0, 1);
      for (const i of items) {
        if (i.action === 'pause') continue;
        i.toBudget = round2(Math.max(g.minDailyBudget, i.fromBudget * f));
        if (i.toBudget < i.fromBudget) i.action = 'reduce';
        i.reason = `account over cap $${cap} — throttling to fit`;
      }
    }
    projected = nonPaused().reduce((s, i) => s + i.toBudget, 0);
  }
  return { items, projectedSpend: round2(projected), cap };
}

export interface GovernorResult {
  evaluated: number; scaled: number; reduced: number; paused: number; held: number;
  projectedSpend: number; cap: number; actions: GovernorPlanItem[];
}

/** Apply the plan via the existing budget/status helpers (idempotent absolute budgets). */
export async function runProfitGovernor(
  customerIdOverride?: string,
  opts: { allowIncreases?: boolean; governor?: GovernorConfig } = {}
): Promise<GovernorResult> {
  const g = opts.governor || DEFAULT_GOVERNOR;
  const campaigns = (await listCampaigns(customerIdOverride)) as any[];
  const plan = planBudgets(campaigns, g, { allowIncreases: opts.allowIncreases });
  let scaled = 0, reduced = 0, paused = 0, held = 0;
  const applied: GovernorPlanItem[] = [];

  for (const i of plan.items) {
    try {
      if (i.action === 'pause') {
        await setCampaignStatus(i.campaignId, 'PAUSED', customerIdOverride);
        paused++; applied.push(i);
      } else if (i.toBudget !== i.fromBudget && i.budgetResource) {
        await setCampaignBudget(i.budgetResource, i.toBudget, customerIdOverride);
        if (i.toBudget > i.fromBudget) scaled++; else reduced++;
        applied.push(i);
      } else {
        held++;
      }
    } catch (e: any) {
      applied.push({ ...i, action: 'hold', reason: `apply-failed: ${e?.message || e}` });
    }
  }
  return { evaluated: plan.items.length, scaled, reduced, paused, held, projectedSpend: plan.projectedSpend, cap: plan.cap, actions: applied };
}
