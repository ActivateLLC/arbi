/**
 * Runtime autonomous-engine settings — now DURABLE.
 *
 * Seeded from env at first boot, but the source of truth is the `engine_state`
 * table (a write-through cache). The dashboard can toggle autonomy at runtime AND
 * that intent SURVIVES redeploys/crashes — a restart rehydrates the last stated
 * intent instead of silently reverting to env defaults. (Prime directive: the bot
 * runs and earns until a human EXPLICITLY stops it; nothing transient resets it.)
 *
 * The public API stays synchronous (callers read a cache); persistence is
 * write-through and best-effort, with an in-memory fallback when there's no DB.
 */

import { getDatabase } from '../config/database';
import { DEFAULT_TENANT_ID } from './tenantContext';

export interface GovernorConfig {
  targetRoas: number;            // scale at/above this ROAS
  minDailyBudget: number;        // per-campaign floor
  maxDailyBudget: number;        // per-campaign ceiling
  maxStepPct: number;            // MAX % budget change per cycle once data is rich
  minStepPct: number;            // MIN % step when data is thin (authority floor)
  accountMaxDailySpend: number;  // global daily-spend target (sum of campaign budgets)
  minSpendToAct: number;         // learning floor
  staleHours: number;            // metrics older than this => no scale-ups
}

export interface SourcingConfig {
  minProfitPerUnit: number;    // hard floor on profit-per-unit (only when gateEnabled)
  minTicket: number;           // 0 = price/ticket doesn't matter (default); a floor only if you want one
  targetCpa: number;           // estimated cost-per-acquisition the margin must beat
  profitCpaMultiple: number;   // require profit >= targetCpa * this (e.g. 3x)
  markupPercent: number;       // retail markup over supplier cost — the MARGIN dial
  gateEnabled: boolean;        // hard profit floor on/off (off = rank-only, never empties catalog)
}

export interface AutonomousSettings {
  autonomous: boolean;   // master switch / intent — engine acts only when true
  autoSource: boolean;   // scan retailers each cycle
  autoCreate: boolean;   // create PAUSED campaigns for new products
  autoGoLive: boolean;   // enable campaigns (REAL SPEND)
  optimize: boolean;     // run the optimization pass
  autoVideo: boolean;    // auto-generate UGC video ads for top products (Higgsfield credits)
  profitGovernor: boolean; // use the reinvestment governor (account cap + reallocation) instead of the bare optimizer
  learningRank: boolean;   // rank create/go-live/render by realized performance, not just predicted demand/virality
  organicFirst: boolean;   // post UGC as PUBLIC YouTube Shorts (free reach); gate paid go-live on proven organic traction
  governor?: GovernorConfig; // reinvestment guardrails (persisted in the same JSON blob)
  sourcing?: SourcingConfig; // unit-economics sourcing config (margin optimizer + opt-in floor)
}

const num = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
export const DEFAULT_GOVERNOR: GovernorConfig = {
  targetRoas: num('OPTIMIZER_TARGET_ROAS', 3.0),
  minDailyBudget: num('OPTIMIZER_MIN_BUDGET', 5),
  maxDailyBudget: num('OPTIMIZER_MAX_BUDGET', 200),
  maxStepPct: num('GOVERNOR_MAX_STEP_PCT', 0.2),
  minStepPct: num('GOVERNOR_MIN_STEP_PCT', 0.05),
  accountMaxDailySpend: num('GOVERNOR_ACCOUNT_MAX_DAILY', 500),
  minSpendToAct: num('OPTIMIZER_MIN_SPEND', 20),
  staleHours: num('GOVERNOR_STALE_HOURS', 26),
};

// Sourcing toward EXPECTED ROI (demand × margin-after-CPA; virality + realized
// performance layer in at the funnel ranking). Price/ticket is NOT a factor
// (minTicket default 0). The hard profit floor is opt-in so it never empties the
// catalog; markupPercent is the margin dial that makes cheap CJ items clear CPA.
export const DEFAULT_SOURCING: SourcingConfig = {
  minProfitPerUnit: num('SOURCING_MIN_PROFIT_PER_UNIT', 8),
  minTicket: num('SOURCING_MIN_TICKET', 0),
  targetCpa: num('SOURCING_TARGET_CPA', 8),
  profitCpaMultiple: num('SOURCING_PROFIT_CPA_MULTIPLE', 1.5),
  markupPercent: num('SOURCING_MARKUP_PERCENT', 100),
  // Inline (not envFlag) — DEFAULT_SOURCING is initialized before envFlag below.
  gateEnabled: (process.env.SOURCING_GATE_ENABLED || '').toLowerCase() === 'true',
};

/** Clamp a numeric setting to a sane range; non-finite → default. Money-safe. */
const clampNum = (v: any, lo: number, hi: number, dflt: number) =>
  Number.isFinite(Number(v)) ? Math.min(Math.max(Number(v), lo), hi) : dflt;

const envFlag = (k: string, dflt = false) => {
  const v = (process.env[k] || '').toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return dflt;
};

let settings: AutonomousSettings = {
  autonomous: envFlag('ENABLE_AUTONOMOUS'),
  autoSource: envFlag('AUTO_SOURCE'),
  autoCreate: envFlag('AUTO_CREATE'),
  autoGoLive: envFlag('AUTO_GO_LIVE'),
  optimize: envFlag('AUTO_OPTIMIZE', true),
  autoVideo: envFlag('AUTO_VIDEO'),
  // Always-on by default: the governor is the optimizer PLUS strictly-tighter
  // guardrails (account cap + ramp), and its authority scales with data confidence
  // (near-passive when data is thin), so it's safe baked in. PROFIT_GOVERNOR=false
  // is the hidden emergency brake that reverts to the bare optimizer.
  profitGovernor: envFlag('PROFIT_GOVERNOR', true),
  learningRank: envFlag('LEARNING_RANK'),
  organicFirst: envFlag('ORGANIC_FIRST'),
  governor: { ...DEFAULT_GOVERNOR },
  sourcing: { ...DEFAULT_SOURCING },
};

let db: ReturnType<typeof getDatabase> | null = null;
try { db = getDatabase(); } catch { db = null; }

/** Write-through persist of the current settings to engine_state (best-effort). */
async function persistEngineState(updatedBy?: string): Promise<void> {
  if (!db) return;
  try {
    await (db as any).query(
      `INSERT INTO "engine_state" ("tenantId","settings","updatedAt","updatedBy")
       VALUES (:tid, CAST(:settings AS JSONB), NOW(), :by)
       ON CONFLICT ("tenantId") DO UPDATE SET "settings"=CAST(:settings AS JSONB), "updatedAt"=NOW(), "updatedBy"=:by;`,
      { replacements: { tid: DEFAULT_TENANT_ID, settings: JSON.stringify(settings), by: updatedBy || 'system' } }
    );
  } catch (e: any) {
    console.error('⚠️  engine_state persist failed (settings kept in memory):', e?.message || e);
  }
}

/**
 * Rehydrate settings from the DB at boot. If a row exists, the persisted intent
 * wins over env (that's the whole point — no reset on redeploy). If none exists,
 * seed the env-derived defaults so intent persists from here on. Call once after
 * the database is initialized.
 */
export async function hydrateAutonomousSettings(): Promise<void> {
  if (!db) return;
  try {
    const r: any = await (db as any).query(
      `SELECT "settings" FROM "engine_state" WHERE "tenantId"=:tid LIMIT 1;`,
      { replacements: { tid: DEFAULT_TENANT_ID } }
    );
    const rows = Array.isArray(r) ? r[0] : r?.rows;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (row && row.settings) {
      const persisted = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
      // Merge persisted over current so flags added in future code still get a value.
      settings = { ...settings, ...persisted };
      console.log(`✅ Engine intent restored from DB: autonomous=${settings.autonomous}, autoGoLive=${settings.autoGoLive}`);
    } else {
      await persistEngineState('env-seed');
      console.log('🌱 Seeded engine_state from env defaults');
    }
  } catch (e: any) {
    // Money-safe: on read failure we keep the (typically off) env defaults rather
    // than inventing an "on" state.
    console.error('⚠️  hydrateAutonomousSettings failed (keeping env defaults):', e?.message || e);
  }
}

export function getAutonomousSettings(): AutonomousSettings {
  return { ...settings };
}

/** Apply a partial update (only boolean fields are accepted) and PERSIST it. */
export function setAutonomousSettings(patch: Partial<AutonomousSettings>, updatedBy?: string): AutonomousSettings {
  const keys: (keyof AutonomousSettings)[] = ['autonomous', 'autoSource', 'autoCreate', 'autoGoLive', 'optimize', 'autoVideo', 'profitGovernor', 'learningRank', 'organicFirst'];
  for (const k of keys) {
    if (typeof patch[k] === 'boolean') (settings as any)[k] = patch[k] as boolean;
  }
  // Nested governor guardrails merge over defaults (keeps unknown/future keys).
  if (patch.governor && typeof patch.governor === 'object') {
    const merged = { ...DEFAULT_GOVERNOR, ...settings.governor, ...patch.governor };
    // VALIDATE money-affecting fields — a negative/NaN/absurd cap must never reach
    // the governor's budget math. Clamp to a sane range; ignore non-finite values.
    merged.accountMaxDailySpend = clampNum(merged.accountMaxDailySpend, 0, 1_000_000, DEFAULT_GOVERNOR.accountMaxDailySpend);
    merged.maxDailyBudget = clampNum(merged.maxDailyBudget, 1, 100_000, DEFAULT_GOVERNOR.maxDailyBudget);
    merged.minDailyBudget = clampNum(merged.minDailyBudget, 1, merged.maxDailyBudget, DEFAULT_GOVERNOR.minDailyBudget);
    merged.targetRoas = clampNum(merged.targetRoas, 0.1, 100, DEFAULT_GOVERNOR.targetRoas);
    merged.maxStepPct = clampNum(merged.maxStepPct, 0, 1, DEFAULT_GOVERNOR.maxStepPct);
    merged.minStepPct = clampNum(merged.minStepPct, 0, merged.maxStepPct, DEFAULT_GOVERNOR.minStepPct);
    settings.governor = merged;
  }
  // Sourcing config (unit-economics / margin optimizer). Clamps fail toward FEWER
  // sourced items (profitCpaMultiple >= 1), never flooding spend.
  if (patch.sourcing && typeof patch.sourcing === 'object') {
    const m = { ...DEFAULT_SOURCING, ...settings.sourcing, ...patch.sourcing };
    m.minProfitPerUnit = clampNum(m.minProfitPerUnit, 0, 1_000_000, DEFAULT_SOURCING.minProfitPerUnit);
    m.minTicket = clampNum(m.minTicket, 0, 1_000_000, DEFAULT_SOURCING.minTicket);
    m.targetCpa = clampNum(m.targetCpa, 0, 100_000, DEFAULT_SOURCING.targetCpa);
    m.profitCpaMultiple = clampNum(m.profitCpaMultiple, 1, 100, DEFAULT_SOURCING.profitCpaMultiple);
    m.markupPercent = clampNum(m.markupPercent, 0, 5_000, DEFAULT_SOURCING.markupPercent);
    if (typeof patch.sourcing.gateEnabled === 'boolean') m.gateEnabled = patch.sourcing.gateEnabled;
    settings.sourcing = m;
  }
  // Master switch cascades the no-spend build pipeline: turning Autonomous ON
  // means "run the whole thing" — source, create, generate UGC videos, optimize —
  // automatically. Only autoGoLive (REAL SPEND) is left out: explicit decision.
  // A caller can still opt a build step OUT in the same patch.
  if (patch.autonomous === true) {
    if (patch.autoSource === undefined) settings.autoSource = true;
    if (patch.autoCreate === undefined) settings.autoCreate = true;
    if (patch.autoVideo === undefined) settings.autoVideo = true;
    if (patch.optimize === undefined) settings.optimize = true;
  }
  // Write-through so the intent survives a redeploy/crash (fire-and-forget).
  void persistEngineState(updatedBy);
  return getAutonomousSettings();
}
