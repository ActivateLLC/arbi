/**
 * Expected-Value Opportunity Model
 * ================================
 *
 * Ranks sourcing opportunities by how much money they are *expected* to make,
 * using methodologies proven in product research and quantitative ranking —
 * not an ad-hoc point ladder, and deliberately independent of a product's
 * absolute price. A cheap high-velocity item and an expensive low-velocity item
 * compete purely on expected profit.
 *
 * Methodologies:
 *
 * 1. Unit-economics Expected Value (the core lucrativeness metric):
 *      expectedMonthlyProfit = estimatedMonthlySales × profitPerUnit
 *    This is how product-research tools (Jungle Scout, Helium 10) judge a
 *    product. It is price-agnostic: $4 profit × 200 sales == $400 profit × 2
 *    sales. Demand and the premium drive it, not the sticker price.
 *
 * 2. Bayesian (IMDb) weighted rating for conversion quality:
 *      WR = (v·R + m·C) / (v + m)
 *    A 5.0 from 3 reviews is shrunk toward the prior mean C; only ratings backed
 *    by enough reviews (m) move the needle. Prevents thin, noisy signals from
 *    looking like sure things.
 *
 * 3. Confidence shrinkage:
 *    The final 0–100 score is blended toward a low neutral baseline in
 *    proportion to how much real evidence (sales data, review volume) we have.
 *    Well-evidenced opportunities rise; speculative ones stay modest.
 *
 * 4. Log-saturation normalization:
 *    Expected profit is unbounded, so it is mapped to 0–100 via 1 − e^(−x/K),
 *    which rewards bigger winners with diminishing returns instead of letting a
 *    single huge outlier dominate.
 */

export interface OpportunityValueInput {
  /** Contribution margin per unit in dollars (sell price − landed cost − fees). */
  profitPerUnit: number;
  /** Gross margin percent (the premium). */
  marginPercent: number;
  /** Observed/estimated units sold per month — the demand velocity proxy. */
  monthlySalesProxy?: number;
  /** Average product rating, 0–5. */
  rating?: number;
  /** Number of ratings/reviews backing `rating` (confidence for the rating). */
  reviewCount?: number;
  /** Demand momentum flag (e.g. trending on TikTok Shop). */
  trending?: boolean;
}

export interface OpportunityValue {
  /** Bayesian-shrunk rating, 0–5. */
  weightedRating: number;
  /** Conversion-quality multiplier derived from weightedRating, ~0.1–1.0. */
  conversionFactor: number;
  /** Demand momentum multiplier (≥1). */
  demandMomentum: number;
  /** Demand- and quality-adjusted monthly unit sales. */
  estimatedMonthlySales: number;
  /** THE lucrativeness figure: expected profit per month, in dollars. */
  expectedMonthlyProfit: number;
  /** Evidence sufficiency, 0–1. */
  confidence: number;
  /** Composite 0–100 ranking score (confidence-shrunk). */
  lucrativeScore: number;
}

// --- Tunable, named constants (documented so the model is auditable) ---
const RATING_PRIOR_MEAN = 3.8;        // C: typical average rating across catalog
const RATING_PRIOR_WEIGHT = 50;       // m: reviews needed before a rating is "trusted"
const MOMENTUM_BOOST = 1.3;           // trending products convert/sell faster
const EV_SATURATION_SCALE = 600;      // K: ~$600/mo profit ≈ 63/100; $1.8k ≈ 95/100
const NEUTRAL_BASELINE = 22;          // score a no-evidence opportunity shrinks toward

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** IMDb-style Bayesian weighted rating. */
export function weightedRating(rating = RATING_PRIOR_MEAN, reviewCount = 0): number {
  const v = Math.max(0, reviewCount);
  const r = clamp(rating, 0, 5);
  return (v * r + RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN) / (v + RATING_PRIOR_WEIGHT);
}

/**
 * Score an opportunity by expected value. Pure and deterministic.
 */
export function scoreExpectedValue(input: OpportunityValueInput): OpportunityValue {
  const profitPerUnit = Math.max(0, input.profitPerUnit || 0);
  const marginPercent = clamp(input.marginPercent || 0, 0, 100);
  const salesProxy = Math.max(0, input.monthlySalesProxy ?? 0);

  // Conversion quality from a confidence-shrunk rating (3.0→~0.1, 5.0→1.0).
  const wr = weightedRating(input.rating, input.reviewCount);
  const conversionFactor = clamp((wr - 3.0) / 2.0, 0.1, 1.0);

  const demandMomentum = input.trending ? MOMENTUM_BOOST : 1.0;

  // Demand-adjusted velocity, then expected profit (unit economics).
  const estimatedMonthlySales = salesProxy * demandMomentum * conversionFactor;
  const expectedMonthlyProfit = estimatedMonthlySales * profitPerUnit;

  // Evidence sufficiency: real demand data + enough reviews → high confidence.
  let confidence = 0.3;
  if (salesProxy > 0) confidence += 0.4;
  if ((input.reviewCount ?? 0) >= RATING_PRIOR_WEIGHT) confidence += 0.3;
  confidence = clamp(confidence, 0, 1);

  // Normalize the three signals to 0–100.
  const evScore = 100 * (1 - Math.exp(-expectedMonthlyProfit / EV_SATURATION_SCALE));
  const marginScore = clamp(marginPercent / 50, 0, 1) * 100; // 50%+ margin = full marks
  const momentumScore = input.trending ? 100 : 60;

  // Expected value is the dominant signal; margin (premium) and momentum support it.
  const rawScore = 0.6 * evScore + 0.25 * marginScore + 0.15 * momentumScore;

  // Shrink toward a low baseline when evidence is thin.
  const lucrativeScore = clamp(confidence * rawScore + (1 - confidence) * NEUTRAL_BASELINE, 0, 100);

  return {
    weightedRating: wr,
    conversionFactor,
    demandMomentum,
    estimatedMonthlySales,
    expectedMonthlyProfit,
    confidence,
    lucrativeScore: Math.round(lucrativeScore * 10) / 10,
  };
}
