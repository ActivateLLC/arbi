/**
 * Automated test for the ad-campaign creation path — the revenue-critical piece.
 *
 * The automation talks to the Google Ads API over REST (axios). We mock axios so
 * we validate the EXACT request structure our automation builds (budget ->
 * campaign -> ad group -> keywords -> responsive search ad) without needing live
 * credentials. Catches v23 regressions before they ever reach a real account.
 */

jest.mock('axios');
import axios from 'axios';
import { createAutomatedCampaign, ProductAdData, CampaignConfig } from './campaignAutomation';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Map each :mutate endpoint to the resource name it should return.
const RESOURCE_BY_ENDPOINT: Record<string, string> = {
  campaignBudgets: 'customers/1/campaignBudgets/111',
  campaigns: 'customers/1/campaigns/222',
  adGroups: 'customers/1/adGroups/333',
  adGroupCriteria: 'customers/1/adGroupCriteria/abc',
  adGroupAds: 'customers/1/adGroupAds/444',
};

/** Find the recorded axios.post call whose URL targets a given resource. */
function bodyFor(resource: string): any {
  const call = mockedAxios.post.mock.calls.find(([url]) => String(url).includes(`/${resource}:mutate`));
  if (!call) throw new Error(`no :mutate call recorded for ${resource}`);
  return call[1]; // the request body { operations: [...] }
}

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
  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = '';

  mockedAxios.post.mockImplementation(async (url: string, _body?: any) => {
    // OAuth token exchange
    if (String(url).includes('oauth2.googleapis.com/token')) {
      return { data: { access_token: 'fake-token', expires_in: 3600 } } as any;
    }
    // {resource}:mutate
    const match = Object.keys(RESOURCE_BY_ENDPOINT).find((r) => String(url).includes(`/${r}:mutate`));
    if (match) {
      return { data: { results: [{ resourceName: RESOURCE_BY_ENDPOINT[match] }] } } as any;
    }
    return { data: {} } as any;
  });
});

describe('ad campaign automation (revenue-critical path)', () => {
  let result: { campaignId: string; adGroupId: string; adId: string };

  beforeAll(async () => {
    result = await createAutomatedCampaign(product, config);
  });

  it('creates a budget resource (correct micros, standard delivery, not shared)', () => {
    const budget = bodyFor('campaignBudgets').operations[0].create;
    expect(budget.amountMicros).toBe(20 * 1_000_000);
    expect(budget.deliveryMethod).toBe('STANDARD');
    expect(budget.explicitlyShared).toBe(false);
  });

  it('creates a PAUSED Search campaign with new-account-safe bidding, referencing the budget', () => {
    const campaign = bodyFor('campaigns').operations[0].create;
    expect(campaign.status).toBe('PAUSED'); // never auto-spend
    expect(campaign.advertisingChannelType).toBe('SEARCH');
    expect(campaign.maximizeConversions).toBeDefined(); // not Target ROAS (rejected on new campaigns)
    expect(campaign.campaignBudget).toBe('customers/1/campaignBudgets/111');
    // Required since API v17 — must be present or Google rejects the campaign.
    expect(campaign.containsEuPoliticalAdvertising).toBe('DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING');
  });

  it('creates a Search ad group linked to the campaign', () => {
    const adGroup = bodyFor('adGroups').operations[0].create;
    expect(adGroup.type).toBe('SEARCH_STANDARD');
    expect(adGroup.campaign).toBe('customers/1/campaigns/222');
    expect(adGroup.cpcBidMicros).toBe(Math.round(0.5 * 1_000_000));
  });

  it('adds phrase-match keywords so the campaign can serve', () => {
    const ops = bodyFor('adGroupCriteria').operations;
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0].create.adGroup).toBe('customers/1/adGroups/333');
    expect(ops[0].create.keyword.matchType).toBe('PHRASE');
  });

  it('creates a PAUSED responsive search ad within Google text limits', () => {
    const adOp = bodyFor('adGroupAds').operations[0].create;
    expect(adOp.status).toBe('PAUSED');
    expect(adOp.ad.finalUrls).toEqual([product.landingPageUrl]);

    const rsa = adOp.ad.responsiveSearchAd;
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
