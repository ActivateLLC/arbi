/**
 * END-TO-END revenue pipeline test (the money loop).
 *
 * Chains the REAL production functions across modules — exactly the path a live
 * deploy runs — with only the external boundaries mocked (Rainforest search +
 * Google Ads REST). No live server, no network, fully deterministic:
 *
 *   source (Amazon)  →  catalog listing w/ demandScore
 *                    →  demand-first promotion ranking
 *                    →  PAUSED Google Ads campaign
 *                    →  sale recorded (recordTrade — what the Stripe webhook calls)
 *                    →  revenue total reflects the sale
 *
 * If any link in the chain regresses, this fails before it reaches a real
 * account or real spend.
 */

jest.mock('axios');
import axios from 'axios';
import { sourceTrendingFromAmazon } from '../services/amazonSourcing';
import { getListings } from '../routes/marketplace';
import { getActiveProductsForAds } from '../routes/google-ads';
import { createAutomatedCampaign, CampaignConfig } from '../services/google-ads/campaignAutomation';
import { recordTrade } from '../routes/revenue';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Each Google Ads {resource}:mutate endpoint → the resource name it returns.
const GOOGLE_RESOURCE_BY_ENDPOINT: Record<string, string> = {
  campaignBudgets: 'customers/1234567890/campaignBudgets/111',
  campaigns: 'customers/1234567890/campaigns/222',
  campaignCriteria: 'customers/1234567890/campaignCriteria/770',
  adGroups: 'customers/1234567890/adGroups/333',
  adGroupCriteria: 'customers/1234567890/adGroupCriteria/abc',
  adGroupAds: 'customers/1234567890/adGroupAds/444',
};

/** Find the recorded Google Ads :mutate body for a resource. */
function googleBodyFor(resource: string): any {
  const call = mockedAxios.post.mock.calls.find(([url]) => String(url).includes(`/${resource}:mutate`));
  if (!call) throw new Error(`no :mutate call recorded for ${resource}`);
  return call[1];
}

// Two real-shaped Amazon results: a PROVEN seller (huge review count) and a
// niche one. Same price → same margin, so ONLY demand should reorder them.
const PROVEN = {
  title: 'Proven Best-Seller Wireless Earbuds',
  asin: 'B0PROVEN1',
  price: { value: 25 },
  ratings_total: 50000, // proven demand
  image: 'https://m.media-amazon.com/images/I/proven.jpg',
  link: 'https://www.amazon.com/dp/B0PROVEN1',
};
const NICHE = {
  title: 'Niche Low-Demand Gadget',
  asin: 'B0NICHE01',
  price: { value: 25 },
  ratings_total: 75, // above the demand floor, but far less proven
  image: 'https://m.media-amazon.com/images/I/niche.jpg',
  link: 'https://www.amazon.com/dp/B0NICHE01',
};

const config: CampaignConfig = { dailyBudget: 10, maxCPC: 0.5, geoTargeting: ['US'] };

beforeAll(() => {
  // Google Ads REST creds (direct child account, no manager indirection).
  process.env.GOOGLE_ADS_CLIENT_ID = 'x';
  process.env.GOOGLE_ADS_CLIENT_SECRET = 'x';
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'x';
  process.env.GOOGLE_ADS_CUSTOMER_ID = '1234567890';
  process.env.GOOGLE_ADS_REFRESH_TOKEN = 'x';
  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '';
  process.env.RAINFOREST_API_KEY = 'x';

  // Rainforest search (sourcing reads via axios.get).
  mockedAxios.get.mockImplementation(async (url: string) => {
    if (String(url).includes('rainforestapi.com')) {
      return { data: { search_results: [NICHE, PROVEN] } } as any; // deliberately niche-first
    }
    return { data: {} } as any;
  });

  // Google Ads OAuth + mutate (campaign creation writes via axios.post).
  mockedAxios.post.mockImplementation(async (url: string) => {
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return { data: { access_token: 'fake-token', expires_in: 3600 } } as any;
    }
    const match = Object.keys(GOOGLE_RESOURCE_BY_ENDPOINT).find((r) => String(url).includes(`/${r}:mutate`));
    if (match) return { data: { results: [{ resourceName: GOOGLE_RESOURCE_BY_ENDPOINT[match] }] } } as any;
    return { data: {} } as any;
  });
});

describe('E2E: source → catalog → demand-rank → campaign → sale → revenue', () => {
  it('1) sources Amazon products into the catalog WITH a demand score', async () => {
    const r = await sourceTrendingFromAmazon({ count: 5, minReviews: 50, maxPrice: 200 });
    expect(r.success).toBe(true);
    expect(r.sourced).toBe(2);

    const active = await getListings('active');
    const proven = active.find((l) => l.productTitle === PROVEN.title);
    expect(proven).toBeDefined();
    // Demand captured at sourcing (Amazon review count), not price.
    expect(proven!.demandScore).toBe(PROVEN.ratings_total);
    // 100% markup default → real profit per unit.
    expect(proven!.estimatedProfit).toBeGreaterThan(0);
  });

  it('2) ranks promotion DEMAND-FIRST (proven seller beats equal-margin niche)', async () => {
    const products = await getActiveProductsForAds(10, 0);
    expect(products.length).toBe(2);
    // Same price/margin on both, so demand is the only differentiator — the
    // proven product MUST be promoted first.
    expect(products[0].productName).toBe(PROVEN.title);
    expect(products[1].productName).toBe(NICHE.title);
  });

  it('3) creates a PAUSED Google Ads campaign for the top product (no auto-spend)', async () => {
    const [top] = await getActiveProductsForAds(1, 0);
    const result = await createAutomatedCampaign(top, config);

    expect(result.campaignId).toBe('customers/1234567890/campaigns/222');
    expect(result.adGroupId).toBe('customers/1234567890/adGroups/333');
    expect(result.adId).toBe('customers/1234567890/adGroupAds/444');

    // The campaign must be created PAUSED — the engine takes it live later.
    const campaign = googleBodyFor('campaigns').operations[0].create;
    expect(campaign.status).toBe('PAUSED');
    expect(campaign.advertisingChannelType).toBe('SEARCH');

    // Budget honored (10/day → micros).
    const budget = googleBodyFor('campaignBudgets').operations[0].create;
    expect(budget.amountMicros).toBe(10 * 1_000_000);

    // Ad points at THIS product's landing page (the conversion-tracked page).
    const adOp = googleBodyFor('adGroupAds').operations[0].create;
    expect(adOp.ad.finalUrls).toEqual([top.landingPageUrl]);
  });

  it('4) records a completed sale and the revenue total reflects it (what the dashboard reads)', () => {
    const profit = 25; // proven product: $25 marketplace markup over $25 cost

    // This is EXACTLY what the Stripe checkout.session.completed webhook calls.
    const before = recordTrade({ tradeId: 'warmup', grossProfit: 0 }).progress.totalRevenue;
    const after = recordTrade({
      tradeId: 'order_e2e_1',
      productTitle: PROVEN.title,
      grossProfit: profit,
    });

    expect(after.progress.totalRevenue).toBeCloseTo(before + profit, 2);
    expect(after.progress.tradesExecuted).toBeGreaterThanOrEqual(1);
    expect(after.trade.grossProfit).toBe(profit);
  });

  it('rejects an invalid sale amount (never logs a bogus negative transaction)', () => {
    expect(() => recordTrade({ grossProfit: -5 })).toThrow();
  });
});
