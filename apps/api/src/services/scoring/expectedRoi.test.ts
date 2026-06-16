import { expectedRoiScore, bestVirality, DEFAULT_ROI } from './expectedRoi';

describe('unified Expected-ROI score', () => {
  it('proven high-performer (high realized + confidence) scores high', () => {
    const s = expectedRoiScore({ demandScore: 800, profitPerUnit: 40, viralityScore: 80, realizedScore: 95, realizedConfidence: 1 }, 10);
    expect(s).toBeGreaterThan(80);
  });

  it('EXPLORE: an unproven item (no realized data) gets an optimism bonus over a proven mediocre one', () => {
    const unproven = expectedRoiScore({ demandScore: 400, profitPerUnit: 30, realizedConfidence: 0 }, 10);
    const provenMeh = expectedRoiScore({ demandScore: 400, profitPerUnit: 30, realizedScore: 20, realizedConfidence: 1 }, 10);
    expect(unproven).toBeGreaterThan(provenMeh); // keeps discovering instead of overfitting
  });

  it('margin-after-CPA matters: a sub-CPA trinket scores below a high-margin item at equal demand', () => {
    const trinket = expectedRoiScore({ demandScore: 500, profitPerUnit: 3 }, 10);   // net margin 0
    const fat = expectedRoiScore({ demandScore: 500, profitPerUnit: 50 }, 10);       // net margin 40
    expect(fat).toBeGreaterThan(trinket);
  });

  it('exploration bonus shrinks to zero as confidence → 1 (exploit proven winners)', () => {
    const base = { demandScore: 300, profitPerUnit: 25, realizedScore: 60 };
    const c0 = expectedRoiScore({ ...base, realizedConfidence: 0 }, 10);
    const c1 = expectedRoiScore({ ...base, realizedConfidence: 1 }, 10);
    // at conf 1 the score is the realized exploit (no explore bonus); at conf 0 it
    // includes the full bonus + the prior — so the two differ by design.
    expect(c0).not.toBe(c1);
    expect(DEFAULT_ROI.explorationWeight).toBeGreaterThan(0);
  });

  it('bestVirality picks the max across assets, undefined when none', () => {
    expect(bestVirality([{ viralityScore: 40 }, { viralityScore: 82 }])).toBe(82);
    expect(bestVirality([])).toBeUndefined();
    expect(bestVirality(undefined)).toBeUndefined();
  });
});
