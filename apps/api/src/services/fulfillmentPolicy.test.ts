import { decideFulfillment } from './fulfillmentPolicy';

describe('fulfillment funding policy', () => {
  it('ships cheap items immediately (within float limit)', () => {
    const d = decideFulfillment(18, 50);
    expect(d.action).toBe('fulfill_now');
  });

  it('holds high-ticket items until customer funds settle', () => {
    const d = decideFulfillment(900, 50);
    expect(d.action).toBe('hold_for_funds');
  });

  it('treats the limit as inclusive', () => {
    expect(decideFulfillment(50, 50).action).toBe('fulfill_now');
    expect(decideFulfillment(50.01, 50).action).toBe('hold_for_funds');
  });

  it('with a $0 float limit, never fronts a cent', () => {
    expect(decideFulfillment(1, 0).action).toBe('hold_for_funds');
    expect(decideFulfillment(0, 0).action).toBe('fulfill_now'); // nothing to front
  });

  it('handles missing/negative cost safely', () => {
    expect(decideFulfillment(NaN, 50).action).toBe('fulfill_now');
    expect(decideFulfillment(-5, 50).action).toBe('fulfill_now');
  });
});
