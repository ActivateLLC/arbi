import { planBudgets } from './profitGovernor';
import { GovernorConfig } from '../autonomousSettings';

const G: GovernorConfig = {
  targetRoas: 3, minDailyBudget: 5, maxDailyBudget: 200,
  maxStepPct: 0.2, accountMaxDailySpend: 100, minSpendToAct: 20, staleHours: 26,
};

const winner = (over: any = {}) => ({ id: 'w', name: 'W', status: 'ENABLED', budgetResource: 'b/w', dailyBudget: 50, spend: 100, conversions: 5, revenue: 400, ...over });

describe('profit governor — planBudgets', () => {
  it('ramp clamp caps a big optimizer increase to maxStepPct', () => {
    const plan = planBudgets([winner({ dailyBudget: 50 })], G);
    const it0 = plan.items[0];
    expect(it0.action).toBe('scale');
    expect(it0.toBudget).toBeLessThanOrEqual(50 * 1.2 + 0.001); // +20% max
  });

  it('account cap proportionally trims increases so total <= cap', () => {
    const camps = [
      winner({ id: 'a', name: 'A', budgetResource: 'b/a', dailyBudget: 40 }),
      winner({ id: 'b', name: 'B', budgetResource: 'b/b', dailyBudget: 40 }),
    ];
    const plan = planBudgets(camps, { ...G, accountMaxDailySpend: 85 });
    expect(plan.projectedSpend).toBeLessThanOrEqual(85 + 0.01);
    // never raised above the optimizer/ramp target
    for (const i of plan.items) expect(i.toBudget).toBeLessThanOrEqual(i.fromBudget * 1.2 + 0.01);
  });

  it('allowIncreases=false (stale data) drops scale-ups but keeps reductions/pauses', () => {
    const loser = { id: 'l', name: 'L', status: 'ENABLED', budgetResource: 'b/l', dailyBudget: 50, spend: 100, conversions: 1, revenue: 40 }; // ROAS 0.4 < 1
    const plan = planBudgets([winner(), loser], { ...G, accountMaxDailySpend: 1000 }, { allowIncreases: false });
    const w = plan.items.find((i) => i.campaignId === 'w')!;
    const l = plan.items.find((i) => i.campaignId === 'l')!;
    expect(w.toBudget).toBeLessThanOrEqual(w.fromBudget); // no increase on stale data
    expect(l.action).toBe('reduce'); // reductions still flow (lowers spend)
    expect(l.toBudget).toBeLessThan(l.fromBudget);
  });

  it('is idempotent: re-planning the same INPUT yields the same absolute budgets', () => {
    const a = planBudgets([winner()], G).items[0].toBudget;
    const b = planBudgets([winner()], G).items[0].toBudget;
    expect(a).toBe(b);
  });

  it('ignores non-ENABLED campaigns', () => {
    const plan = planBudgets([{ ...winner(), status: 'PAUSED' }], G);
    expect(plan.items.length).toBe(0);
  });
});
