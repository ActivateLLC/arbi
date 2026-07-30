/**
 * Realized-performance scorer — turns recorded snapshots into a 0-100 score
 * comparable to the predicted viralityScore / demandScore, plus a CONFIDENCE
 * that gates how much it's allowed to override those priors.
 *
 * The confidence is the whole graceful-degradation mechanism: with no spend the
 * confidence is 0, so `blendedScore` returns the predicted prior unchanged. As
 * real spend + conversions accumulate, confidence → 1 and the realized score
 * takes over. So everything is byte-identical to "predicted-only" until there's
 * real data, then it quietly starts steering toward what actually converts.
 */

export interface RealizedScore {
  score: number;        // 0..100 (100 == at/above target ROAS)
  confidence: number;   // 0..1
  spend: number;
  conversions: number;
  roas: number;
}

export interface RealizedConfig {
  targetRoas: number;       // ROAS that maps to score 100
  minSpendToTrust: number;  // spend at which confidence approaches 1
  minConvToTrust: number;   // conversions at which confidence approaches 1
}

export const DEFAULT_REALIZED_CONFIG: RealizedConfig = {
  targetRoas: Number(process.env.OPTIMIZER_TARGET_ROAS) || 3.0,
  minSpendToTrust: Number(process.env.OPTIMIZER_MIN_SPEND) || 20,
  minConvToTrust: Number(process.env.OPTIMIZER_MIN_CONV_SCALE) || 2,
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Aggregate a listing's campaign snapshots into a realized score + confidence. */
export function realizedScoreFromSnapshots(snapshots: any[], config: RealizedConfig = DEFAULT_REALIZED_CONFIG): RealizedScore {
  let spend = 0, conv = 0, value = 0, clicks = 0, impressions = 0;
  for (const s of snapshots || []) {
    spend += Number(s.spend) || 0;
    conv += Number(s.conversions) || 0;
    value += Number(s.conversionValue) || 0;
    clicks += Number(s.clicks) || 0;
    impressions += Number(s.impressions) || 0;
  }
  const roas = spend > 0 ? value / spend : 0;
  // Score: ROAS relative to target (1.0 == at target → 100), with a small CTR bump.
  const roasComponent = clamp(roas / (config.targetRoas || 3), 0, 1);
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const ctrBump = clamp(ctr * 100, 0, 5); // up to +5 for strong CTR
  const score = clamp(Math.round(roasComponent * 95 + ctrBump), 0, 100);
  // Confidence: need both enough spend AND enough conversions to trust the signal.
  const spendConf = clamp(spend / (config.minSpendToTrust || 20), 0, 1);
  const convConf = clamp(conv / (config.minConvToTrust || 2), 0, 1);
  const confidence = clamp(Math.min(spendConf, convConf), 0, 1);
  return { score, confidence, spend, conversions: conv, roas };
}

/**
 * Blend a predicted prior (demand/virality) with the realized score, weighted by
 * confidence. confidence 0 → exactly the prior; confidence 1 → exactly realized.
 */
export function blendedScore(predicted: number, realized?: number | null, confidence?: number | null): number {
  const p = Number(predicted) || 0;
  const r = realized == null ? null : Number(realized);
  const c = clamp(Number(confidence) || 0, 0, 1);
  if (r == null || c <= 0) return p;
  return Math.round(p * (1 - c) + r * c);
}
