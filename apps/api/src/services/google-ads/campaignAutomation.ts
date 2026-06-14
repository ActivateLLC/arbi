/**
 * Google Ads Campaign Automation (REST transport)
 *
 * Creates and manages Google Ads campaigns for Arbi products.
 *
 * NOTE ON TRANSPORT: this talks to the Google Ads API over plain HTTPS/REST
 * (axios), NOT the gRPC client library. The gRPC client's channel
 * establishment hangs intermittently from our Railway container (the first
 * write call wedges and every retry on the same channel hangs with it), while
 * plain HTTPS to googleapis.com is fast and reliable. REST sidesteps that
 * transport entirely. Field names are camelCase and enum values are strings,
 * per the REST API contract.
 */

import axios from 'axios';

const API_VERSION = 'v23'; // matches the google-ads-api package we had installed
const ADS_BASE = `https://googleads.googleapis.com/${API_VERSION}`;
const REQUEST_TIMEOUT_MS = 20000;

// Google Ads Compliance - Inline for build compatibility
const ALLOWED_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'JP', 'KR', 'SG', 'AE', 'BR', 'MX', 'IN'];
const AI_CONTENT_ALLOWED = ['US', 'CA', 'GB', 'AU', 'JP', 'KR', 'SG', 'AE', 'BR', 'MX', 'IN'];

function canUseAutomatedAds(countryCode: string): boolean {
  return ALLOWED_COUNTRIES.includes(countryCode);
}

function canUseAIContent(countryCode: string): boolean {
  return AI_CONTENT_ALLOWED.includes(countryCode);
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

const trimEnv = (k: string) => (process.env[k] || '').trim();
// REST wants bare digits for customer ids (no dashes).
const digits = (s: string) => s.replace(/-/g, '');
function customerId(): string { return digits(trimEnv('GOOGLE_ADS_CUSTOMER_ID')); }
function loginCustomerId(): string | undefined { return digits(trimEnv('GOOGLE_ADS_LOGIN_CUSTOMER_ID')) || undefined; }

// --- OAuth: exchange the refresh token for a short-lived access token, cached
// until ~1 min before expiry. This is the exact REST exchange that debug-auth
// proved works fast from the container. ---
let _token: { value: string; expiresAt: number } | null = null;
async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt) return _token.value;
  const body = new URLSearchParams({
    client_id: trimEnv('GOOGLE_ADS_CLIENT_ID'),
    client_secret: trimEnv('GOOGLE_ADS_CLIENT_SECRET'),
    refresh_token: trimEnv('GOOGLE_ADS_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  }).toString();
  const r = await axios.post('https://oauth2.googleapis.com/token', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });
  const ttlMs = (Number(r.data.expires_in) || 3600) * 1000;
  _token = { value: r.data.access_token, expiresAt: Date.now() + ttlMs - 60000 };
  return _token.value;
}

async function adsHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await getAccessToken()}`,
    'developer-token': trimEnv('GOOGLE_ADS_DEVELOPER_TOKEN'),
    'Content-Type': 'application/json',
  };
  const lc = loginCustomerId();
  if (lc) headers['login-customer-id'] = lc; // authenticate "through" the manager (MCC)
  return headers;
}

/**
 * POST a {resource}:mutate request and return the created resource names.
 */
async function mutate(resource: string, operations: any[]): Promise<string[]> {
  const url = `${ADS_BASE}/customers/${customerId()}/${resource}:mutate`;
  try {
    const r = await axios.post(url, { operations }, { headers: await adsHeaders(), timeout: REQUEST_TIMEOUT_MS });
    return (r.data?.results || []).map((x: any) => x.resourceName as string);
  } catch (e: any) {
    throw new Error(describeAdsError(e));
  }
}

/**
 * Create an automated Google Ads SEARCH campaign for a product (over REST).
 *
 * SEARCH + Responsive Search Ad is intentional: text-only (no asset uploads or
 * YouTube linkage), uses new-account-safe MAXIMIZE_CONVERSIONS bidding, and
 * drives intent traffic to the product landing page.
 *
 * Everything is created PAUSED — nothing spends until enabled in Google Ads.
 */
export async function createAutomatedCampaign(
  product: ProductAdData,
  config: CampaignConfig
): Promise<{ campaignId: string; adGroupId: string; adId: string }> {
  if (!canUseAutomatedAds(product.targetCountry)) {
    throw new Error(`Automated ads not allowed in ${product.targetCountry}. Manual creation required.`);
  }

  console.log(`🎯 Creating SEARCH campaign for: ${product.productName}`);
  const ts = Date.now();

  // Step 1: Budget (a campaign references a budget resource, can't inline one)
  const [budgetResource] = await mutate('campaignBudgets', [{
    create: {
      name: `Budget - ${product.productName} - ${ts}`,
      amountMicros: Math.round(config.dailyBudget * 1_000_000),
      deliveryMethod: 'STANDARD',
      explicitlyShared: false,
    },
  }]);
  console.log(`✅ Budget created: ${budgetResource}`);

  // Step 2: Campaign (PAUSED, Maximize Conversions — Target ROAS needs history)
  const [campaignResource] = await mutate('campaigns', [{
    create: {
      name: `Arbi - ${product.productName} - ${product.targetCountry} - ${ts}`,
      advertisingChannelType: 'SEARCH',
      status: 'PAUSED', // never auto-spend
      campaignBudget: budgetResource,
      maximizeConversions: {},
      // Required on every campaign since API v17 (EU political ad transparency).
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
        targetPartnerSearchNetwork: false,
      },
    },
  }]);
  console.log(`✅ Campaign created: ${campaignResource}`);

  // Step 3: Ad Group
  const [adGroupResource] = await mutate('adGroups', [{
    create: {
      name: `AG - ${truncate(product.productName, 120)}`,
      campaign: campaignResource,
      status: 'ENABLED',
      type: 'SEARCH_STANDARD',
      cpcBidMicros: Math.round((config.maxCPC ?? 0.5) * 1_000_000),
    },
  }]);
  console.log(`✅ Ad Group created: ${adGroupResource}`);

  // Step 4: Keywords (so the search campaign can actually serve)
  const base = product.productName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const terms = Array.from(new Set([
    base,
    `buy ${base}`,
    `${base} online`,
  ].filter(t => t.length >= 2 && t.length <= 80))).slice(0, 10);
  if (terms.length) {
    await mutate('adGroupCriteria', terms.map(text => ({
      create: {
        adGroup: adGroupResource,
        status: 'ENABLED',
        keyword: { text, matchType: 'PHRASE' },
      },
    })));
  }

  // Step 5: Responsive Search Ad (text-only; no asset uploads needed)
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

  const [adResource] = await mutate('adGroupAds', [{
    create: {
      adGroup: adGroupResource,
      status: 'PAUSED', // paused with the campaign
      ad: {
        finalUrls: [product.landingPageUrl],
        responsiveSearchAd: { headlines, descriptions },
      },
    },
  }]);
  console.log(`✅ Responsive Search Ad created: ${adResource}`);

  return { campaignId: campaignResource, adGroupId: adGroupResource, adId: adResource };
}

/**
 * Extract a meaningful message from a Google Ads REST error. The real detail
 * lives in error.details[].errors[], each with an errorCode, message, and a
 * location.fieldPathElements that pinpoints WHICH field/operation failed.
 */
function describeAdsError(error: any): string {
  try {
    const gerr = error?.response?.data?.error;
    if (gerr?.details?.length) {
      const parts: string[] = [];
      for (const d of gerr.details) {
        if (Array.isArray(d.errors)) {
          for (const er of d.errors) {
            const code = er.errorCode
              ? Object.entries(er.errorCode).map(([k, v]) => `${k}=${v}`).join(',')
              : '';
            const path = Array.isArray(er?.location?.fieldPathElements)
              ? er.location.fieldPathElements
                  .map((fp: any) => (fp.index !== undefined && fp.index !== null ? `${fp.fieldName}[${fp.index}]` : fp.fieldName))
                  .join('.')
              : '';
            parts.push([er.message, code, path && `@ ${path}`].filter(Boolean).join(' '));
          }
        }
      }
      if (parts.length) return parts.join(' | ');
    }
    if (gerr?.message) return gerr.message;
    if (error?.code === 'ECONNABORTED') return `request timed out after ${REQUEST_TIMEOUT_MS}ms (${error?.config?.url || ''})`;
  } catch { /* fall through */ }
  if (error?.message) return error.message;
  try { return JSON.stringify(error).slice(0, 600); } catch { return String(error); }
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
      // Rate limit: brief pause between products
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      const detail = error?.message || describeAdsError(error);
      console.error(`❌ Failed to create campaign for ${product.productName}:`, detail);
      results.push({ product: product.productName, error: detail, status: 'failed' });
      failed++;
    }
  }

  return { success, failed, results };
}

/**
 * Get campaign performance metrics (over REST via googleAds:search).
 */
export async function getCampaignMetrics(campaignId: string) {
  const url = `${ADS_BASE}/customers/${customerId()}/googleAds:search`;
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

  const r = await axios.post(url, { query }, { headers: await adsHeaders(), timeout: REQUEST_TIMEOUT_MS });
  const row = (r.data?.results || [])[0];
  if (!row) {
    return { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0, roas: 0 };
  }
  const m = row.metrics || {};
  const spend = Number(m.costMicros || 0) / 1_000_000;
  const revenue = Number(m.conversionsValue || 0);
  return {
    impressions: Number(m.impressions || 0),
    clicks: Number(m.clicks || 0),
    spend,
    conversions: Number(m.conversions || 0),
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
  };
}
