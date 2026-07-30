import { stopLossBreached } from './stopLoss';

describe('stop-loss net-P&L circuit breaker', () => {
  it('does NOT trigger while loss is within the limit', () => {
    expect(stopLossBreached(9.08, 0, 50)).toBe(false);   // the real Jun 13-15 case: -$9.08, limit $50
    expect(stopLossBreached(50, 5, 50)).toBe(false);      // net -$45, within $50
    expect(stopLossBreached(100, 60, 50)).toBe(false);    // net -$40
  });

  it('triggers once cumulative loss exceeds the limit', () => {
    expect(stopLossBreached(60, 5, 50)).toBe(true);       // net -$55 < -$50
    expect(stopLossBreached(200, 0, 50)).toBe(true);
  });

  it('never triggers when profitable', () => {
    expect(stopLossBreached(100, 300, 50)).toBe(false);
  });
});
