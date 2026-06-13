/**
 * Automated test for the ad-campaign creation path — the revenue-critical piece.
 *
 * Mocks the google-ads-api client so we validate the EXACT request structure our
 * automation builds (budget -> campaign -> ad group -> keywords -> responsive
 * search ad) without needing live credentials. Catches v23 regressions before
 * they ever reach a real Google Ads account.
 */

// Mock google-ads-api: keep the real `enums`, replace the network client with a
// recorder that returns the v23 MutateResponse shape ({ results: [...] }).
jest.mock('google-ads-api', () => {
  const actual = jest.requireActual('google-ads-api');
  const mk = (resourceName: string) =>
    jest.fn(async (_ops: any) => ({ results: [{ resource_name: resourceName }] }));
  const customer = {
    campaignBudgets: { create: mk('customers/1/campaignBudgets/111') },
    campaigns: { create: mk('customers/1/campaigns/222') },
    adGroups: { create: mk('customers/1/adGroups/333') },
    adGroupCriteria: { create: mk('customers/1/adGroupCriteria/abc') },
    adGroupAds: { create: mk('customers/1/adGroupAds/444') },
  };
  return {
    __esModule: true,
    ...actual,
    GoogleAdsApi: jest.fn(() => ({ Customer: () => customer })),
    __customer: customer,
  };
});

import { enums } from 'google-ads-api';
import { createAutomatedCampaign, ProductAdData, CampaignConfig } from './campaignAutomation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __customer: customer } = require('google-ads-api');

const product: ProductAdData = {
  productId: 'p1',
  productName: 'Premium Wireless Noise Cancelling Earbuds Special Edition',
  productPrice: 79.99,
  profitMargin: 40,
  category: 'Electronics',
  targetCountry: 'US',
  landingPageUrl: 'https://api.arbi.creai.dev/product/listing_test',
};

const config: CampaignConfig = {
  dailyBudget: 20,
  maxCPC: 0.5,
  geoTargeting: ['US'],
};

beforeAll(() => {
  process.env.GOOGLE_ADS_CLIENT_ID = 'x';
  process.env.GOOGLE_ADS_CLIENT_SECRET = 'x';
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'x';
  process.env.GOOGLE_ADS_CUSTOMER_ID = '1234567890';
  process.env.GOOGLE_ADS_REFRESH_TOKEN = 'x';
});

describe('ad campaign automation (revenue-critical path)', () => {
  let result: { campaignId: string; adGroupId: string; adId: string };

  beforeAll(async () => {
    result = await createAutomatedCampaign(product, config);
  });

  it('creates a budget resource (correct micros, standard delivery, not shared)', () => {
    const ops = customer.campaignBudgets.create.mock.calls[0][0];
    const budget = ops[0];
    expect(budget.amount_micros).toBe(20 * 1_000_000);
    expect(budget.delivery_method).toBe(enums.BudgetDeliveryMethod.STANDARD);
    expect(budget.explicitly_shared).toBe(false);
  });

  it('creates a PAUSED Search campaign with new-account-safe bidding, referencing the budget', () => {
    const campaign = customer.campaigns.create.mock.calls[0][0][0];
    expect(campaign.status).toBe(enums.CampaignStatus.PAUSED); // never auto-spend
    expect(campaign.advertising_channel_type).toBe(enums.AdvertisingChannelType.SEARCH);
    expect(campaign.maximize_conversions).toBeDefined(); // not Target ROAS (rejected on new campaigns)
    expect(campaign.campaign_budget).toBe('customers/1/campaignBudgets/111');
  });

  it('creates a Search ad group linked to the campaign', () => {
    const adGroup = customer.adGroups.create.mock.calls[0][0][0];
    expect(adGroup.type).toBe(enums.AdGroupType.SEARCH_STANDARD);
    expect(adGroup.campaign).toBe('customers/1/campaigns/222');
    expect(adGroup.cpc_bid_micros).toBe(Math.round(0.5 * 1_000_000));
  });

  it('adds phrase-match keywords so the campaign can serve', () => {
    const ops = customer.adGroupCriteria.create.mock.calls[0][0];
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0].ad_group).toBe('customers/1/adGroups/333');
    expect(ops[0].keyword.match_type).toBe(enums.KeywordMatchType.PHRASE);
  });

  it('creates a PAUSED responsive search ad within Google text limits', () => {
    const adOp = customer.adGroupAds.create.mock.calls[0][0][0];
    expect(adOp.status).toBe(enums.AdGroupAdStatus.PAUSED);
    expect(adOp.ad.final_urls).toEqual([product.landingPageUrl]);

    const rsa = adOp.ad.responsive_search_ad;
    expect(rsa.headlines.length).toBeGreaterThanOrEqual(3); // Google requires >=3
    expect(rsa.descriptions.length).toBeGreaterThanOrEqual(2); // Google requires >=2
    for (const h of rsa.headlines) expect(h.text.length).toBeLessThanOrEqual(30);
    for (const d of rsa.descriptions) expect(d.text.length).toBeLessThanOrEqual(90);
  });

  it('returns the created resource names', () => {
    expect(result).toEqual({
      campaignId: 'customers/1/campaigns/222',
      adGroupId: 'customers/1/adGroups/333',
      adId: 'customers/1/adGroupAds/444',
    });
  });

  it('refuses to create ads in non-compliant countries', async () => {
    await expect(
      createAutomatedCampaign({ ...product, targetCountry: 'CN' }, config)
    ).rejects.toThrow(/not allowed/i);
  });
});
