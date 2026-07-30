import { scoreExpectedValue, weightedRating } from './expectedValue';

describe('expected-value opportunity model', () => {
  const baseGood = { rating: 4.5, reviewCount: 200, trending: false };

  it('is price-agnostic: equal expected profit => equal score regardless of price level', () => {
    // Cheap + high velocity vs expensive + low velocity, same EV ($ profit/mo).
    const cheapHighVolume = scoreExpectedValue({
      profitPerUnit: 4, marginPercent: 40, monthlySalesProxy: 200, ...baseGood,
    });
    const pricyLowVolume = scoreExpectedValue({
      profitPerUnit: 400, marginPercent: 40, monthlySalesProxy: 2, ...baseGood,
    });

    expect(cheapHighVolume.expectedMonthlyProfit).toBeCloseTo(pricyLowVolume.expectedMonthlyProfit, 5);
    expect(Math.abs(cheapHighVolume.lucrativeScore - pricyLowVolume.lucrativeScore)).toBeLessThan(0.5);
  });

  it('ranks by expected profit: more demand wins', () => {
    const low = scoreExpectedValue({ profitPerUnit: 10, marginPercent: 30, monthlySalesProxy: 10, ...baseGood });
    const high = scoreExpectedValue({ profitPerUnit: 10, marginPercent: 30, monthlySalesProxy: 500, ...baseGood });
    expect(high.expectedMonthlyProfit).toBeGreaterThan(low.expectedMonthlyProfit);
    expect(high.lucrativeScore).toBeGreaterThan(low.lucrativeScore);
  });

  it('applies Bayesian shrinkage: a 5.0 from few reviews < a 5.0 from many', () => {
    const thin = weightedRating(5.0, 3);
    const solid = weightedRating(5.0, 5000);
    expect(thin).toBeLessThan(solid);
    expect(thin).toBeLessThan(4.5);   // shrunk toward the prior
    expect(solid).toBeGreaterThan(4.9);
  });

  it('shrinks score toward a low baseline when evidence is thin', () => {
    const speculative = scoreExpectedValue({ profitPerUnit: 50, marginPercent: 40 }); // no sales/reviews
    const evidenced = scoreExpectedValue({
      profitPerUnit: 50, marginPercent: 40, monthlySalesProxy: 100, rating: 4.6, reviewCount: 500,
    });
    expect(speculative.confidence).toBeLessThan(evidenced.confidence);
    expect(speculative.lucrativeScore).toBeLessThan(evidenced.lucrativeScore);
    expect(speculative.lucrativeScore).toBeLessThan(40); // near the neutral baseline
  });

  it('rewards demand momentum (trending)', () => {
    const flat = scoreExpectedValue({ profitPerUnit: 8, marginPercent: 35, monthlySalesProxy: 100, rating: 4.4, reviewCount: 150 });
    const trending = scoreExpectedValue({ profitPerUnit: 8, marginPercent: 35, monthlySalesProxy: 100, rating: 4.4, reviewCount: 150, trending: true });
    expect(trending.expectedMonthlyProfit).toBeGreaterThan(flat.expectedMonthlyProfit);
    expect(trending.lucrativeScore).toBeGreaterThan(flat.lucrativeScore);
  });

  it('no premium => no expected profit', () => {
    const v = scoreExpectedValue({ profitPerUnit: 0, marginPercent: 0, monthlySalesProxy: 1000, ...baseGood });
    expect(v.expectedMonthlyProfit).toBe(0);
  });
});
