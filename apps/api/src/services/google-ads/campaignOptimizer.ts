/**
 * Autonomous campaign optimizer.
 *
 * Runs a periodic pass over LIVE (ENABLED) campaigns and acts on performance:
 *   - PAUSE money-losers (spend with zero conversions past a cap, or ROAS < 1)
 *   - SCALE winners (ROAS >= target with enough conversions) — budget +step, capped
 *   - REDUCE underperformers (positive but below target) — budget -step, floored
 *   - HOLD while still learning (not enough spend yet)
 *
 * Hard guardrails (safety):
 *   - NEVER enables a campaign — only the human "Go Live" can start spend.
 *   - NEVER exceeds maxDailyBudget; never drops below minDailyBudget.
 *   - Ignores non-ENABLED campaigns entirely.
 *
 * The decision function is pure (no I/O) so it's fully unit-tested; the executor
 * applies decisions via the Google Ads REST helpers.
 */

import { listCampaigns, setCampaignStatus, setCampaignBudget } from './campaignAutomation';

export interface OptimizationConfig {
  targetRoas: number;          // scale at/above this ROAS (e.g. 3.0 = 300%)
  minSpendToAct: number;       // don't judge a campaign below this spend (learning)
  zeroConvSpendCap: number;    // spend with 0 conversions above this => pause
  minConversionsToScale: number;
  scaleStep: number;           // budget increase fraction (e.g. 0.20 = +20%)
  reduceStep: number;          // budget decrease fraction (e.g. 0.30 = -30%)
  maxDailyBudget: number;      // never scale above this
  minDailyBudget: number;      // never reduce below this
}

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = (() => {
  const n = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
  return {
    // Because conversion VALUE = profit, ROAS here means profit ÷ ad-spend.
    // targetRoas 3.0 => only scale when profit is 3x the ad spend ("by miles").
    targetRoas: n('OPTIMIZER_TARGET_ROAS', 3.0),
    minSpendToAct: n('OPTIMIZER_MIN_SPEND', 20),
    zeroConvSpendCap: n('OPTIMIZER_ZERO_CONV_CAP', 30),
    minConversionsToScale: n('OPTIMIZER_MIN_CONV_SCALE', 2),
    scaleStep: n('OPTIMIZER_SCALE_STEP', 0.2),
    reduceStep: n('OPTIMIZER_REDUCE_STEP', 0.3),
    maxDailyBudget: n('OPTIMIZER_MAX_BUDGET', 200),
    minDailyBudget: n('OPTIMIZER_MIN_BUDGET', 5),
  };
})();

export interface CampaignMetricsLike {
  status: string;
  spend: number;
  conversions: number;
  revenue: number;       // conversions value
  dailyBudget: number;
}

export interface OptimizationDecision {
  action: 'pause' | 'scale' | 'reduce' | 'hold';
  reason: string;
  newBudget?: number;    // for scale/reduce
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Decide what to do with one campaign. Pure — no side effects.
 */
export function decideCampaignAction(c: CampaignMetricsLike, config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG): OptimizationDecision {
  // Only ever touch LIVE campaigns. Paused ones are the human's call.
  if (c.status !== 'ENABLED') return { action: 'hold', reason: 'not live (only Go Live enables spend)' };

  const roas = c.spend > 0 ? c.revenue / c.spend : 0;

  // Still learning — not enough spend to judge.
  if (c.spend < config.minSpendToAct) {
    return { action: 'hold', reason: `learning (spend $${round2(c.spend)} < $${config.minSpendToAct})` };
  }

  // Bleeding: real spend, zero conversions.
  if (c.conversions === 0 && c.spend >= config.zeroConvSpendCap) {
    return { action: 'pause', reason: `$${round2(c.spend)} spent, 0 conversions — pausing to stop the bleed` };
  }

  // Winner: hitting target ROAS with enough conversions -> scale (capped).
  if (c.conversions >= config.minConversionsToScale && roas >= config.targetRoas) {
    if (c.dailyBudget >= config.maxDailyBudget) {
      return { action: 'hold', reason: `winner at budget cap ($${config.maxDailyBudget})` };
    }
    const newBudget = round2(Math.min(c.dailyBudget * (1 + config.scaleStep), config.maxDailyBudget));
    return { action: 'scale', reason: `ROAS ${round2(roas)}x >= ${config.targetRoas}x — scaling budget`, newBudget };
  }

  // Losing money (profit < ad spend) -> throttle; if already at min budget and
  // STILL losing, kill it — a chronic loser should never keep draining spend.
  if (roas > 0 && roas < 1) {
    if (c.dailyBudget <= config.minDailyBudget) {
      return { action: 'pause', reason: `ROAS ${round2(roas)}x < 1 at min budget — pausing chronic loser (profit never beat spend)` };
    }
    const newBudget = round2(Math.max(c.dailyBudget * (1 - config.reduceStep), config.minDailyBudget));
    return { action: 'reduce', reason: `ROAS ${round2(roas)}x < 1 — profit below ad spend, reducing budget`, newBudget };
  }

  return { action: 'hold', reason: `holding (ROAS ${round2(roas)}x, ${c.conversions} conv)` };
}

export interface OptimizationActionResult {
  campaignId: string;
  name: string;
  action: string;
  reason: string;
  fromBudget?: number;
  toBudget?: number;
}

/**
 * Run one optimization pass over all live campaigns and apply decisions.
 */
export async function runOptimizationPass(
  customerIdOverride?: string,
  config: OptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG
): Promise<{ evaluated: number; acted: number; actions: OptimizationActionResult[] }> {
  const campaigns = await listCampaigns(customerIdOverride);
  const actions: OptimizationActionResult[] = [];

  for (const c of campaigns as any[]) {
    const decision = decideCampaignAction({
      status: c.status,
      spend: c.spend,
      conversions: c.conversions,
      revenue: c.revenue,
      dailyBudget: c.dailyBudget,
    }, config);

    if (decision.action === 'hold') continue;

    try {
      if (decision.action === 'pause') {
        await setCampaignStatus(c.id, 'PAUSED', customerIdOverride);
        actions.push({ campaignId: c.id, name: c.name, action: 'pause', reason: decision.reason });
      } else if ((decision.action === 'scale' || decision.action === 'reduce') && c.budgetResource && decision.newBudget) {
        await setCampaignBudget(c.budgetResource, decision.newBudget, customerIdOverride);
        actions.push({
          campaignId: c.id, name: c.name, action: decision.action, reason: decision.reason,
          fromBudget: c.dailyBudget, toBudget: decision.newBudget,
        });
      }
    } catch (e: any) {
      actions.push({ campaignId: c.id, name: c.name, action: `${decision.action}-failed`, reason: e?.message || String(e) });
    }
  }

  return { evaluated: campaigns.length, acted: actions.length, actions };
}
