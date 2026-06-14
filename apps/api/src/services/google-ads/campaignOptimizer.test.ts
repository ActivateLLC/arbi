const listCampaigns = jest.fn();
const setCampaignStatus = jest.fn();
const setCampaignBudget = jest.fn();
jest.mock('./campaignAutomation', () => ({
  listCampaigns: (...a: any[]) => listCampaigns(...a),
  setCampaignStatus: (...a: any[]) => setCampaignStatus(...a),
  setCampaignBudget: (...a: any[]) => setCampaignBudget(...a),
}));

import { decideCampaignAction, runOptimizationPass, DEFAULT_OPTIMIZATION_CONFIG, CampaignMetricsLike } from './campaignOptimizer';

const base: CampaignMetricsLike = { status: 'ENABLED', spend: 0, conversions: 0, revenue: 0, dailyBudget: 20 };

describe('decideCampaignAction (autonomous brain)', () => {
  it('never touches non-live campaigns', () => {
    expect(decideCampaignAction({ ...base, status: 'PAUSED', spend: 100 }).action).toBe('hold');
  });

  it('holds while still learning (below min spend)', () => {
    expect(decideCampaignAction({ ...base, spend: 5 }).action).toBe('hold');
  });

  it('pauses a money-loser (spend past cap, zero conversions)', () => {
    const d = decideCampaignAction({ ...base, spend: 40, conversions: 0 });
    expect(d.action).toBe('pause');
  });

  it('scales a winner (ROAS >= target) and respects the budget cap', () => {
    const d = decideCampaignAction({ ...base, spend: 50, conversions: 4, revenue: 200, dailyBudget: 20 });
    expect(d.action).toBe('scale');
    expect(d.newBudget).toBe(24); // 20 * 1.2
    // at the cap -> hold
    const capped = decideCampaignAction({ ...base, spend: 50, conversions: 4, revenue: 200, dailyBudget: 200 });
    expect(capped.action).toBe('hold');
  });

  it('reduces an underperformer (ROAS < 1) and floors at min budget', () => {
    const d = decideCampaignAction({ ...base, spend: 50, conversions: 1, revenue: 20, dailyBudget: 20 });
    expect(d.action).toBe('reduce');
    expect(d.newBudget).toBe(14); // 20 * 0.7
    const floored = decideCampaignAction({ ...base, spend: 50, conversions: 1, revenue: 20, dailyBudget: 5 });
    expect(floored.action).toBe('hold');
  });

  it('holds a profitable-but-below-target campaign', () => {
    // ROAS 2x (>=1, <3 target), enough spend, has a conversion
    const d = decideCampaignAction({ ...base, spend: 50, conversions: 2, revenue: 100, dailyBudget: 20 });
    expect(d.action).toBe('hold');
  });
});

describe('runOptimizationPass (executor)', () => {
  beforeEach(() => { listCampaigns.mockReset(); setCampaignStatus.mockReset(); setCampaignBudget.mockReset(); });

  it('pauses losers and scales winners, never enables anything', async () => {
    listCampaigns.mockResolvedValue([
      { id: '1', name: 'Loser', status: 'ENABLED', spend: 40, conversions: 0, revenue: 0, dailyBudget: 20, budgetResource: 'customers/1/campaignBudgets/10' },
      { id: '2', name: 'Winner', status: 'ENABLED', spend: 60, conversions: 5, revenue: 300, dailyBudget: 20, budgetResource: 'customers/1/campaignBudgets/20' },
      { id: '3', name: 'Paused', status: 'PAUSED', spend: 99, conversions: 0, revenue: 0, dailyBudget: 20, budgetResource: 'customers/1/campaignBudgets/30' },
    ]);

    const res = await runOptimizationPass();

    expect(res.evaluated).toBe(3);
    expect(setCampaignStatus).toHaveBeenCalledWith('1', 'PAUSED', undefined); // loser paused
    expect(setCampaignBudget).toHaveBeenCalledWith('customers/1/campaignBudgets/20', 24, undefined); // winner scaled
    // Never enables — setCampaignStatus only ever called with PAUSED here.
    expect(setCampaignStatus).not.toHaveBeenCalledWith(expect.anything(), 'ENABLED', expect.anything());
    // The PAUSED campaign is left untouched.
    expect(setCampaignStatus).toHaveBeenCalledTimes(1);
  });
});
