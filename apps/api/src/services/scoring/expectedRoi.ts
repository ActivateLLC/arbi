/**
 * Unified EXPECTED-ROI score — one ranking objective used across the funnel
 * (create → go-live → render). It blends every signal we have:
 *   demand · margin-after-CPA · virality · realized performance
 * into a single 0–100-ish number, with an EXPLORATION bonus that keeps the
 * self-optimizing loop from overfitting to past winners.
 *
 * Anti-overfit design (explore/exploit):
 *  - EXPLOIT: proven items are scored on their REALIZED performance (confidence-
 *    weighted), so the engine doubles down on what actually converts.
 *  - EXPLORE: an "optimism under uncertainty" bonus (∝ 1−confidence) lifts UNPROVEN
 *    items enough to get tried. New products keep getting a fair shot instead of
 *    the loop inbreeding on historical winners (a filter bubble / local maximum).
 *
 * Pure + dependency-free → trivially testable and shared everywhere.
 */
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const clamp01 = (n: number) => clamp(Number(n) || 0, 0, 1);
/** Saturating 0→100 normalizer (diminishing returns), k = the "half-ish" scale. */
const sat = (x: number, k: number) => 100 * (1 - Math.exp(-Math.max(0, Number(x) || 0) / (k || 1)));
const n = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) ? v : d; };

export interface RoiConfig {
  wDemand: number; wMargin: number; wVirality: number;  // exploit weights (normalized)
  demandScale: number; marginScale: number;             // saturation scales
  explorationWeight: number;                            // 0..~0.3 — explore vs exploit
}
export const DEFAULT_ROI: RoiConfig = {
  wDemand: n('ROI_W_DEMAND', 0.4),
  wMargin: n('ROI_W_MARGIN', 0.4),
  wVirality: n('ROI_W_VIRALITY', 0.2),
  demandScale: n('ROI_DEMAND_SCALE', 500),
  marginScale: n('ROI_MARGIN_SCALE', 20),
  explorationWeight: clamp(n('ROI_EXPLORATION_WEIGHT', 0.15), 0, 0.5),
};

export interface RoiInputs {
  demandScore?: number;        // proven-demand proxy
  profitPerUnit?: number;      // $ profit per sale
  viralityScore?: number;      // 0-100 predicted creative virality (optional)
  realizedScore?: number;      // 0-100 realized performance (optional)
  realizedConfidence?: number; // 0-1
}

/** Compute the unified Expected-ROI ranking score for one product. */
export function expectedRoiScore(i: RoiInputs, expectedCpa: number, cfg: RoiConfig = DEFAULT_ROI): number {
  const demandC = sat(i.demandScore || 0, cfg.demandScale);
  const netMargin = Math.max(0, (Number(i.profitPerUnit) || 0) - (Number(expectedCpa) || 0)); // $ after one acquisition
  const marginC = sat(netMargin, cfg.marginScale);
  const viralityC = Number.isFinite(i.viralityScore as number) ? clamp(i.viralityScore as number, 0, 100) : 50; // neutral if unknown
  const wsum = (cfg.wDemand + cfg.wMargin + cfg.wVirality) || 1;
  const predicted = (cfg.wDemand * demandC + cfg.wMargin * marginC + cfg.wVirality * viralityC) / wsum;

  const conf = clamp01(i.realizedConfidence);
  const realized = Number.isFinite(i.realizedScore as number) ? clamp(i.realizedScore as number, 0, 100) : predicted;
  // EXPLOIT: as confidence grows, realized performance takes over from the prior.
  const exploit = predicted * (1 - conf) + realized * conf;
  // EXPLORE: optimism for the unproven — full bonus at conf 0, none at conf 1.
  const exploreBonus = cfg.explorationWeight * 100 * (1 - conf);
  return Math.round((exploit + exploreBonus) * 100) / 100;
}

/** Best (max) virality across a listing's generated video assets, if any. */
export function bestVirality(videoAssets?: Array<{ viralityScore?: number }>): number | undefined {
  if (!Array.isArray(videoAssets) || !videoAssets.length) return undefined;
  const scores = videoAssets.map((a) => Number(a?.viralityScore)).filter((x) => Number.isFinite(x));
  return scores.length ? Math.max(...scores) : undefined;
}
