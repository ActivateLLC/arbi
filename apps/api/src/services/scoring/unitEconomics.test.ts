import { profitFloor, viableForPaidAds, profitAfterCpa, cpaAdjustedEV, thresholdsFromConfig } from './unitEconomics';
import { DEFAULT_SOURCING } from '../autonomousSettings';

const T = { minProfitPerUnit: 8, minTicket: 0, expectedCpa: 10, profitCpaMultiple: 1.5 };

describe('unit economics (expected-ROI sourcing)', () => {
  it('profitFloor picks the larger of static floor and CPA×multiple', () => {
    expect(profitFloor(T)).toBe(15); // max(8, 10*1.5)
    expect(profitFloor({ ...T, minProfitPerUnit: 40 })).toBe(40);
  });

  it('viability is profit-only by default (ticket/price does not matter)', () => {
    expect(viableForPaidAds(5, 20, T)).toBe(true);   // cheap ticket, but profit 20 >= 15 → viable
    expect(viableForPaidAds(500, 10, T)).toBe(false); // expensive ticket, profit 10 < 15 → not viable
  });

  it('cpaAdjustedEV ranks a high-demand item with margin above a sub-CPA trinket', () => {
    const trinket = cpaAdjustedEV(2, 500, 10);  // profit 2 < cpa 10 → net clamped 0
    const winner = cpaAdjustedEV(25, 20, 10);   // (25-10)*20 = 300
    expect(trinket).toBe(0);
    expect(winner).toBeGreaterThan(trinket);
  });

  it('profitAfterCpa can be negative for junk', () => {
    expect(profitAfterCpa(3, 10)).toBe(-7);
  });

  it('thresholds use observed CPA only when it is higher than the estimate (never looser)', () => {
    expect(thresholdsFromConfig(DEFAULT_SOURCING, 25).expectedCpa).toBe(25); // observed higher → use it
    expect(thresholdsFromConfig(DEFAULT_SOURCING, 2).expectedCpa).toBe(DEFAULT_SOURCING.targetCpa); // observed lower → keep estimate
    expect(thresholdsFromConfig(DEFAULT_SOURCING).expectedCpa).toBe(DEFAULT_SOURCING.targetCpa); // no data → estimate
  });
});
