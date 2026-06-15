/**
 * Revenue rehydration test — proves the dashboard total survives redeploys by
 * reconciling to persisted orders (sum of actualProfit on non-refunded orders).
 */
import { seedRevenueFromOrders, recordTrade } from './revenue';

describe('seedRevenueFromOrders (durable revenue, survives restarts)', () => {
  it('sums actualProfit across orders and sets the baseline total', () => {
    const r = seedRevenueFromOrders([
      { orderId: 'o1', actualProfit: 25, status: 'payment_received' },
      { orderId: 'o2', actualProfit: 40, status: 'delivered' },
    ]);
    expect(r.totalRevenue).toBeCloseTo(65, 2);
    expect(r.tradesExecuted).toBe(2);
  });

  it('excludes refunds and non-positive/invalid profits', () => {
    const r = seedRevenueFromOrders([
      { orderId: 'o1', actualProfit: 50, status: 'delivered' },
      { orderId: 'o2', actualProfit: 30, status: 'refunded' }, // refund — excluded
      { orderId: 'o3', actualProfit: 0, status: 'payment_received' }, // zero — excluded
      { orderId: 'o4', actualProfit: undefined, status: 'payment_received' }, // missing — excluded
    ]);
    expect(r.totalRevenue).toBeCloseTo(50, 2);
    expect(r.tradesExecuted).toBe(1);
  });

  it('is a baseline (not additive), so a restart re-seed reconciles exactly', () => {
    seedRevenueFromOrders([{ orderId: 'o1', actualProfit: 100, status: 'delivered' }]);
    // Simulate a "redeploy": re-seed from the same persisted orders.
    const r = seedRevenueFromOrders([{ orderId: 'o1', actualProfit: 100, status: 'delivered' }]);
    expect(r.totalRevenue).toBeCloseTo(100, 2); // not 200 — it reconciles, doesn't double
  });

  it('empty/no orders → $0, never throws', () => {
    expect(seedRevenueFromOrders([]).totalRevenue).toBe(0);
    expect(seedRevenueFromOrders(undefined as any).totalRevenue).toBe(0);
  });

  it('live sales recorded after rehydration add on top of the baseline', () => {
    seedRevenueFromOrders([{ orderId: 'o1', actualProfit: 60, status: 'delivered' }]);
    const after = recordTrade({ tradeId: 'new_sale', grossProfit: 15 });
    expect(after.progress.totalRevenue).toBeCloseTo(75, 2); // 60 baseline + 15 new
  });
});
