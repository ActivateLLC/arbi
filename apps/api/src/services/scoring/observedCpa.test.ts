import { getCachedObservedCpa, refreshObservedCpa } from './observedCpa';
import { DEFAULT_SOURCING } from '../autonomousSettings';

describe('observed CPA (self-tuning sourcing floor)', () => {
  it('falls back to the config estimate before any refresh', () => {
    expect(getCachedObservedCpa()).toBe(DEFAULT_SOURCING.targetCpa);
  });

  it('refresh resolves gracefully (estimate) when no DB / no conversions, never throwing', async () => {
    const r = await refreshObservedCpa();
    expect(r).toBeTruthy();
    expect(r.source).toBe('estimate');
    expect(r.cpa).toBe(DEFAULT_SOURCING.targetCpa);
    // and the cached sync read now reflects it (still the safe estimate)
    expect(getCachedObservedCpa()).toBe(DEFAULT_SOURCING.targetCpa);
  });
});
