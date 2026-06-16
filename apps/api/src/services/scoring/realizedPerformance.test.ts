import { realizedScoreFromSnapshots, blendedScore } from './realizedPerformance';

describe('realized performance scorer', () => {
  it('zero snapshots → confidence 0, and blend returns the prior unchanged', () => {
    const r = realizedScoreFromSnapshots([]);
    expect(r.confidence).toBe(0);
    expect(blendedScore(72, r.score, r.confidence)).toBe(72); // predicted prior survives
  });

  it('high spend + high ROAS → high confidence and realized takes over', () => {
    const snaps = [{ spend: 100, conversions: 10, conversionValue: 500, clicks: 50, impressions: 1000 }];
    const r = realizedScoreFromSnapshots(snaps); // ROAS 5 >= target 3 → score ~100
    expect(r.confidence).toBeGreaterThan(0.9);
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(blendedScore(10, r.score, r.confidence)).toBeGreaterThan(80); // realized dominates a low prior
  });

  it('below-target ROAS pulls the score down proportionally', () => {
    const snaps = [{ spend: 100, conversions: 5, conversionValue: 150, clicks: 30, impressions: 1000 }]; // ROAS 1.5 / target 3 = 0.5
    const r = realizedScoreFromSnapshots(snaps);
    expect(r.score).toBeLessThan(60);
    expect(r.score).toBeGreaterThan(30);
  });

  it('low spend → low confidence even at great ROAS (cannot trust yet)', () => {
    const snaps = [{ spend: 2, conversions: 1, conversionValue: 50, clicks: 2, impressions: 20 }];
    const r = realizedScoreFromSnapshots(snaps);
    expect(r.confidence).toBeLessThan(0.5);
  });
});
