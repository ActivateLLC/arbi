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
import {
  createAutomatedCampaign,
  shortProductName,
  buildHeadlines,
  buildDescriptions,
  buildKeywords,
  buildBiddingStrategy,
  productCampaignKey,
  campaignProductKey,
  demandRank,
  DEFAULT_DAILY_BUDGET,
  ProductAdData,
  CampaignConfig,
} from './campaignAutomation';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Map each :mutate endpoint to the resource name it should return.
const RESOURCE_BY_ENDPOINT: Record<string, string> = {
  campaignBudgets: 'customers/1/campaignBudgets/111',
  campaigns: 'customers/1/campaigns/222',
  campaignCriteria: 'customers/1/campaignCriteria/770',
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
  imageUrl: 'https://cdn.example-store.io/earbuds.jpg', // real photo required to advertise
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

  it('restricts geo and adds negative keywords (competitive targeting)', () => {
    const ops = bodyFor('campaignCriteria').operations;
    // Geo: at least the US location is targeted.
    const geo = ops.find((o: any) => o.create?.location?.geoTargetConstant);
    expect(geo.create.location.geoTargetConstant).toBe('geoTargetConstants/2840'); // US
    // Negatives: low-intent terms are excluded as broad negatives.
    const negatives = ops.filter((o: any) => o.create?.negative === true).map((o: any) => o.create.keyword.text);
    expect(negatives).toContain('free');
    expect(negatives).toContain('cheap');
    for (const o of ops.filter((x: any) => x.create?.negative)) {
      expect(o.create.keyword.matchType).toBe('BROAD');
    }
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

  it('refuses to create a campaign without a real product photo (no photo, no ad)', async () => {
    await expect(createAutomatedCampaign({ ...product, imageUrl: undefined }, config)).rejects.toThrow(/no product image/i);
    // The placeholder/resolver path does not count as a real photo.
    await expect(
      createAutomatedCampaign({ ...product, imageUrl: 'https://api.arbi.creai.dev/api/product-image/listing_test' }, config)
    ).rejects.toThrow(/no product image/i);
  });

  it('scopes the campaign to a tenant child account when customerId is given', async () => {
    mockedAxios.post.mockClear();
    await createAutomatedCampaign(product, config, '999-888-7777');
    const urls = mockedAxios.post.mock.calls.map(([u]) => String(u));
    // Every :mutate call must target the tenant's bare-digit customer id.
    const mutateUrls = urls.filter((u) => u.includes(':mutate'));
    expect(mutateUrls.length).toBeGreaterThan(0);
    for (const u of mutateUrls) expect(u).toContain('/customers/9998887777/');
  });
});

// A real, messy retailer title — the kind that used to break keyword/headline
// generation (too long for the 30-char headline and 80-char keyword limits).
const LONG_NAME =
  'Infinity Love God We Trust Christian Cross Birthstone Crystal Pendant Necklace Colour Gems Zircon Heart Necklace Women Jewelry';

describe('ad creative generation (amazing-ads helpers)', () => {
  const longProduct: ProductAdData = { ...product, productName: LONG_NAME, category: 'Jewelry' };

  it('derives a concise brand-style name from a long title', () => {
    const short = shortProductName(LONG_NAME);
    expect(short.length).toBeLessThanOrEqual(20);
    expect(short.length).toBeGreaterThan(0);
  });

  it('produces >=3 unique headlines, each within 30 chars', () => {
    const hs = buildHeadlines(longProduct).map((h) => h.text);
    expect(hs.length).toBeGreaterThanOrEqual(3);
    for (const h of hs) expect(h.length).toBeLessThanOrEqual(30);
    expect(new Set(hs.map((h) => h.toLowerCase())).size).toBe(hs.length); // all unique
  });

  it('produces >=2 unique descriptions, each within 90 chars', () => {
    const ds = buildDescriptions(longProduct).map((d) => d.text);
    expect(ds.length).toBeGreaterThanOrEqual(2);
    for (const d of ds) expect(d.length).toBeLessThanOrEqual(90);
    expect(new Set(ds.map((d) => d.toLowerCase())).size).toBe(ds.length);
  });

  it('still yields servable keywords for very long titles (the latent bug)', () => {
    const kws = buildKeywords(longProduct);
    expect(kws.length).toBeGreaterThan(0); // long names used to yield ZERO
    for (const k of kws) {
      expect(k.length).toBeGreaterThanOrEqual(2);
      expect(k.length).toBeLessThanOrEqual(80);
    }
  });
});

describe('dedup + budget (portfolio testing)', () => {
  it('derives a stable product key that matches its campaign name', () => {
    const product = 'Fashionable Multilayer Boho Moon Map Necklace';
    const key = productCampaignKey(product);
    const campaignName = `Arbi - ${product} - US - 1781477577336`;
    expect(key.length).toBeGreaterThan(3);
    // The product key extracted from the campaign name must match the product's own key.
    expect(campaignProductKey(campaignName)).toBe(key);
  });

  it('uses a low default daily budget (test many products cheaply)', () => {
    expect(DEFAULT_DAILY_BUDGET).toBeGreaterThan(0);
    expect(DEFAULT_DAILY_BUDGET).toBeLessThanOrEqual(20);
  });
});

describe('demand-first ranking (promote proven sellers first)', () => {
  it('ranks higher demand above higher profit (demand dominates)', () => {
    const lowDemandHighProfit = demandRank(2, 500);
    const highDemandLowProfit = demandRank(50, 5);
    expect(highDemandLowProfit).toBeGreaterThan(lowDemandHighProfit);
  });

  it('breaks demand ties by estimated profit', () => {
    expect(demandRank(10, 40)).toBeGreaterThan(demandRank(10, 12));
  });

  it('treats missing/NaN signals as zero (never throws, sorts last)', () => {
    expect(demandRank(NaN as any, undefined as any)).toBe(0);
    expect(demandRank(5, 0)).toBeGreaterThan(demandRank(0, 0));
  });
});

describe('Smart Bidding strategy (performance layer)', () => {
  const base: CampaignConfig = { dailyBudget: 20, geoTargeting: ['US'] };

  it('defaults to Maximize Conversions on a fresh campaign (new-account-safe)', () => {
    const b = buildBiddingStrategy(base);
    expect(b.maximizeConversions).toEqual({});
    expect(b.maximizeConversionValue).toBeUndefined();
  });

  it('steers to a Target CPA when provided (Maximize Conversions + tCPA)', () => {
    const b = buildBiddingStrategy({ ...base, targetCpa: 12 });
    expect(b.maximizeConversions.targetCpaMicros).toBe(12_000_000);
  });

  it('uses Target ROAS only when explicitly opted in (needs conversion history)', () => {
    expect(buildBiddingStrategy({ ...base, targetROAS: 4 }).maximizeConversions).toEqual({}); // not auto-applied
    const b = buildBiddingStrategy({ ...base, targetROAS: 4, useTargetRoas: true });
    expect(b.maximizeConversionValue.targetRoas).toBe(4);
  });
});
