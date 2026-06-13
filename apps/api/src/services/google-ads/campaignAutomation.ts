/**
 * Google Ads Campaign Automation
 * Automatically creates and manages Google Ads campaigns for Arbi products
 */

import { GoogleAdsApi, Customer, enums } from 'google-ads-api';

// Google Ads Compliance - Inline for build compatibility
const ALLOWED_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'JP', 'KR', 'SG', 'AE', 'BR', 'MX', 'IN'];
const AI_CONTENT_ALLOWED = ['US', 'CA', 'GB', 'AU', 'JP', 'KR', 'SG', 'AE', 'BR', 'MX', 'IN'];

function canUseAutomatedAds(countryCode: string): boolean {
  return ALLOWED_COUNTRIES.includes(countryCode);
}

function canUseAIContent(countryCode: string): boolean {
  return AI_CONTENT_ALLOWED.includes(countryCode);
}

// Initialize Google Ads API lazily — constructing the client at module load
// would crash boot wherever the GOOGLE_ADS_* env vars aren't set. Build it on
// first use instead.
let _client: GoogleAdsApi | null = null;
function getClient(): GoogleAdsApi {
  if (!_client) {
    _client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });
  }
  return _client;
}

export interface ProductAdData {
  productId: string;
  productName: string;
  productPrice: number;
  profitMargin: number;
  category: string;
  targetCountry: string;
  videoUrl?: string; // Cloudinary URL from ad extraction
  landingPageUrl: string;
}

export interface CampaignConfig {
  dailyBudget: number; // In USD
  targetROAS?: number; // Target Return on Ad Spend (e.g., 3.0 = $3 revenue per $1 spent)
  maxCPC?: number; // Max cost per click in USD
  geoTargeting: string[]; // Country codes ['US', 'CA', 'UK']
  ageRange?: { min: number; max: number };
  gender?: 'MALE' | 'FEMALE' | 'ALL';
}

// Google Ads text limits
const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
const HEADLINE_MAX = 30;
const DESC_MAX = 90;

/**
 * Create an automated Google Ads SEARCH campaign for a product.
 *
 * SEARCH + Responsive Search Ad is intentional: it's text-only (no image/video
 * asset uploads or YouTube linkage), uses new-account-safe MAXIMIZE_CONVERSIONS
 * bidding, and drives intent traffic straight to the product landing page.
 * Video (YouTube) campaigns require uploaded YouTube assets and are handled by
 * the Performance Max path instead.
 *
 * Everything is created PAUSED — nothing spends until enabled in Google Ads.
 */
export async function createAutomatedCampaign(
  product: ProductAdData,
  config: CampaignConfig
): Promise<{ campaignId: string; adGroupId: string; adId: string }> {
  // Compliance check
  if (!canUseAutomatedAds(product.targetCountry)) {
    throw new Error(`Automated ads not allowed in ${product.targetCountry}. Manual creation required.`);
  }

  const customer = getClient().Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });

  console.log(`🎯 Creating SEARCH campaign for: ${product.productName}`);

  // Step 1: Budget (a campaign references a budget resource, it can't inline one)
  const budgetResource = await createBudget(customer, product, config);
  console.log(`✅ Budget created: ${budgetResource}`);

  // Step 2: Campaign (PAUSED, MAXIMIZE_CONVERSIONS)
  const campaignResource = await createCampaign(customer, budgetResource, product);
  console.log(`✅ Campaign created: ${campaignResource}`);

  // Step 3: Ad Group
  const adGroupResource = await createAdGroup(customer, campaignResource, product, config);
  console.log(`✅ Ad Group created: ${adGroupResource}`);

  // Step 4: Keywords (so the search campaign can actually serve)
  await createKeywords(customer, adGroupResource, product);

  // Step 5: Responsive Search Ad
  const adResource = await createResponsiveSearchAd(customer, adGroupResource, product);
  console.log(`✅ Responsive Search Ad created: ${adResource}`);

  return {
    campaignId: campaignResource,
    adGroupId: adGroupResource,
    adId: adResource,
  };
}

/**
 * Create campaign budget resource, returns its resource name.
 */
async function createBudget(customer: Customer, product: ProductAdData, config: CampaignConfig): Promise<string> {
  const results = await customer.campaignBudgets.create([{
    name: `Budget - ${product.productName} - ${Date.now()}`,
    amount_micros: Math.round(config.dailyBudget * 1_000_000),
    delivery_method: enums.BudgetDeliveryMethod.STANDARD,
    explicitly_shared: false,
  }]);
  return results[0].resource_name;
}

/**
 * Create a PAUSED Search campaign with automated (Maximize Conversions) bidding.
 */
async function createCampaign(customer: Customer, budgetResource: string, product: ProductAdData): Promise<string> {
  const results = await customer.campaigns.create([{
    name: `Arbi - ${product.productName} - ${product.targetCountry} - ${Date.now()}`,
    advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
    status: enums.CampaignStatus.PAUSED, // never auto-spend
    campaign_budget: budgetResource,
    // Maximize Conversions is valid for brand-new campaigns (Target ROAS needs
    // conversion history, so it would be rejected here).
    maximize_conversions: {},
    network_settings: {
      target_google_search: true,
      target_search_network: true,
      target_content_network: false,
      target_partner_search_network: false,
    },
  }]);
  return results[0].resource_name;
}

/**
 * Create the ad group.
 */
async function createAdGroup(
  customer: Customer,
  campaignResource: string,
  product: ProductAdData,
  config: CampaignConfig
): Promise<string> {
  const results = await customer.adGroups.create([{
    name: `AG - ${truncate(product.productName, 120)}`,
    campaign: campaignResource,
    status: enums.AdGroupStatus.ENABLED,
    type: enums.AdGroupType.SEARCH_STANDARD,
    cpc_bid_micros: Math.round((config.maxCPC ?? 0.5) * 1_000_000),
  }]);
  return results[0].resource_name;
}

/**
 * Add phrase-match keywords derived from the product name so the campaign serves.
 */
async function createKeywords(customer: Customer, adGroupResource: string, product: ProductAdData): Promise<void> {
  const base = product.productName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const terms = Array.from(new Set([
    base,
    `buy ${base}`,
    `${base} online`,
  ].filter(t => t.length >= 2 && t.length <= 80))).slice(0, 10);

  if (terms.length === 0) return;

  await customer.adGroupCriteria.create(terms.map(text => ({
    ad_group: adGroupResource,
    status: enums.AdGroupCriterionStatus.ENABLED,
    keyword: {
      text,
      match_type: enums.KeywordMatchType.PHRASE,
    },
  })));
}

/**
 * Create a Responsive Search Ad (text-only; no asset uploads needed).
 */
async function createResponsiveSearchAd(customer: Customer, adGroupResource: string, product: ProductAdData): Promise<string> {
  const name = product.productName;
  const headlines = [
    truncate(name, HEADLINE_MAX),
    truncate(`Buy ${name}`, HEADLINE_MAX),
    truncate(`${name} Online`, HEADLINE_MAX),
    'Free Shipping',
    'Limited Time Offer',
  ].map(text => ({ text }));

  const descriptions = [
    truncate(`Shop ${name} at a great price. Fast, secure checkout.`, DESC_MAX),
    truncate(`Order ${name} today. Free shipping and easy returns.`, DESC_MAX),
  ].map(text => ({ text }));

  const results = await customer.adGroupAds.create([{
    ad_group: adGroupResource,
    status: enums.AdGroupAdStatus.PAUSED, // paused with the campaign
    ad: {
      final_urls: [product.landingPageUrl],
      responsive_search_ad: { headlines, descriptions },
    },
  }]);
  return results[0].resource_name;
}

/**
 * Bulk create campaigns for multiple products
 */
export async function createBulkCampaigns(
  products: ProductAdData[],
  config: CampaignConfig
): Promise<{ success: number; failed: number; results: any[] }> {
  const results = [];
  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const result = await createAutomatedCampaign(product, config);
      results.push({ product: product.productName, ...result, status: 'success' });
      success++;

      // Rate limit: Wait 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ Failed to create campaign for ${product.productName}:`, error.message);
      results.push({ product: product.productName, error: error.message, status: 'failed' });
      failed++;
    }
  }

  return { success, failed, results };
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignMetrics(campaignId: string) {
  const customer = getClient().Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.id = ${campaignId}
  `;

  const results = await customer.query(query);

  return {
    impressions: results[0].metrics.impressions,
    clicks: results[0].metrics.clicks,
    spend: results[0].metrics.cost_micros / 1_000_000,
    conversions: results[0].metrics.conversions,
    revenue: results[0].metrics.conversions_value,
    roas: results[0].metrics.conversions_value / (results[0].metrics.cost_micros / 1_000_000),
  };
}
