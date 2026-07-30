/**
 * Observed CPA — the self-tuning input to the Expected-ROI sourcing floor.
 *
 * Computes the REAL cost-per-acquisition from campaign performance snapshots
 * (spend ÷ conversions) so the sourcing margin floor auto-tightens to what ads
 * actually cost, instead of a guessed estimate. Confidence-gated and clamped:
 *   - too few conversions → fall back to the env/config estimate,
 *   - and the effective CPA is NEVER below the estimate (so thin/cheap early data
 *     can't *loosen* the floor and let junk through — money-safe direction).
 *
 * Computed once per cycle (in the snapshot step) and cached; sourcing reads the
 * cached value synchronously so it never blocks the ranking loop on a DB call.
 */
import { getDatabase } from '../../config/database';
import { getAutonomousSettings, DEFAULT_SOURCING } from '../autonomousSettings';
import { DEFAULT_TENANT_ID } from '../tenantContext';

let db: ReturnType<typeof getDatabase> | null = null;
try { db = getDatabase(); } catch { db = null; }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const num = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
const MIN_CONV_FOR_CPA = num('SOURCING_MIN_CONV_FOR_CPA', 10); // conversions needed to fully trust observed CPA

export interface ObservedCpa { cpa: number; spend: number; conversions: number; confidence: number; source: 'observed' | 'estimate' }

// Cached so sourcing reads it synchronously; refreshed each cycle.
let cache: { value: ObservedCpa; at: number } | null = null;

/** The effective CPA sourcing should use right now (sync). Falls back to the
 *  config estimate when we haven't computed/observed anything yet. */
export function getCachedObservedCpa(): number {
  const estimate = getAutonomousSettings().sourcing?.targetCpa ?? DEFAULT_SOURCING.targetCpa;
  if (!cache) return estimate;
  return cache.value.cpa;
}

/** Recompute observed CPA from snapshots and update the cache. Call once per cycle. */
export async function refreshObservedCpa(tenantId: string = DEFAULT_TENANT_ID, lookbackDays = 30): Promise<ObservedCpa> {
  const estimate = getAutonomousSettings().sourcing?.targetCpa ?? DEFAULT_SOURCING.targetCpa;
  const fallback: ObservedCpa = { cpa: estimate, spend: 0, conversions: 0, confidence: 0, source: 'estimate' };
  if (!db) { cache = { value: fallback, at: Date.now() }; return fallback; }
  try {
    const r: any = await (db as any).query(
      `SELECT COALESCE(SUM("spend"),0) AS spend, COALESCE(SUM("conversions"),0) AS conv
       FROM "campaign_performance_snapshots"
       WHERE "tenantId"=:tid AND "snapshotDate" >= CURRENT_DATE - (:days)::int;`,
      { replacements: { tid: tenantId, days: lookbackDays } }
    );
    const rows = Array.isArray(r) ? r[0] : r?.rows;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    const spend = Number(row?.spend) || 0;
    const conversions = Number(row?.conv) || 0;
    if (conversions <= 0 || spend <= 0) { cache = { value: fallback, at: Date.now() }; return fallback; }

    const observed = spend / conversions;
    const confidence = clamp(conversions / MIN_CONV_FOR_CPA, 0, 1);
    // Blend toward the estimate by confidence, then NEVER below the estimate.
    const blended = observed * confidence + estimate * (1 - confidence);
    const cpa = Math.max(blended, estimate);
    const value: ObservedCpa = { cpa: Math.round(cpa * 100) / 100, spend, conversions, confidence, source: confidence > 0 ? 'observed' : 'estimate' };
    cache = { value, at: Date.now() };
    return value;
  } catch (e: any) {
    console.error('⚠️  refreshObservedCpa error (using estimate):', e?.message || e);
    cache = { value: fallback, at: Date.now() };
    return fallback;
  }
}
