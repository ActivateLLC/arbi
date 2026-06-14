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
 *
 * MULTI-TENANT: under a manager (MCC) account, ONE set of manager credentials
 * (refresh token + developer token + login-customer-id = manager) manages every
 * child account — only the customer_id in the URL path changes per tenant. So
 * every entry point accepts an optional `customerId` override; omit it and it
 * falls back to GOOGLE_ADS_CUSTOMER_ID. `provisionChildAccount` creates a new
 * child account under the manager for a newly-subscribed tenant.
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

  // --- Performance layer (Smart Bidding) ---
  // Target CPA in USD. Steers Maximize Conversions toward a cost-per-acquisition
  // goal. Safe on new campaigns (unlike Target ROAS, which needs conversion
  // history). Omit for a pure Maximize Conversions start.
  targetCpa?: number;
  // Opt-in Target ROAS (Maximize Conversion Value). Only enable once the account
  // has conversion history, or Google rejects it on a fresh campaign.
  useTargetRoas?: boolean;
  // Audience signals (resource names, e.g. "customers/X/audiences/Y" for
  // remarketing, or in-market audiences) attached in OBSERVATION mode — feeds
  // Smart Bidding without restricting reach. Empty = none.
  audiences?: string[];
}

// Google Ads text limits
const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
const HEADLINE_MAX = 30;
const DESC_MAX = 90;

/**
 * Real retailer product titles are long, keyword-stuffed strings ("Infinity
 * Love God We Trust Christian Cross Birthstone…"). Using the whole title in
 * headlines/keywords blows past the 30-char headline limit and the 80-char
 * keyword limit (producing ZERO usable keywords). Derive a concise, human
 * brand-style name from the leading words instead.
 */
export function shortProductName(name: string, maxWords = 4, maxLen = 20): string {
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  let s = '';
  for (const w of words.slice(0, maxWords)) {
    const next = s ? `${s} ${w}` : w;
    if (next.length > maxLen) break;
    s = next;
  }
  return s || truncate(cleaned, maxLen);
}

/**
 * Google rejects a Responsive Search Ad if two headline (or description) assets
 * are identical (assetError=DUPLICATE_ASSET), and long product names make
 * variants collapse to the same string after truncation. Dedupe case-
 * insensitively (preserving order) and drop blanks.
 */
function dedupeAssets(candidates: string[], max: number): { text: string }[] {
  const seen = new Set<string>();
  const out: { text: string }[] = [];
  for (const c of candidates) {
    const text = truncate((c || '').trim(), max);
    const key = text.toLowerCase();
    if (text && !seen.has(key)) { seen.add(key); out.push({ text }); }
  }
  return out;
}

/**
 * Choose the Smart Bidding strategy for a campaign payload.
 * - Target ROAS (Maximize Conversion Value) only when explicitly opted in
 *   (needs conversion history; rejected on brand-new campaigns otherwise).
 * - Target CPA (Maximize Conversions toward a CPA) when provided — safe on new
 *   campaigns and a real efficiency lever.
 * - Otherwise plain Maximize Conversions (new-account-safe default).
 */
export function buildBiddingStrategy(config: CampaignConfig): Record<string, any> {
  if (config.useTargetRoas && config.targetROAS && config.targetROAS > 0) {
    return { maximizeConversionValue: { targetRoas: config.targetROAS } };
  }
  if (config.targetCpa && config.targetCpa > 0) {
    return { maximizeConversions: { targetCpaMicros: Math.round(config.targetCpa * 1_000_000) } };
  }
  return { maximizeConversions: {} };
}

const meaningfulCategory = (c: string) => {
  const t = (c || '').trim();
  return t && !/^(general|cj|cjdropshipping|uncategorized)$/i.test(t) ? t : '';
};

/**
 * Build a strong, varied set of RSA headlines (<=30 chars each, all unique).
 * Mixes product/brand, intent CTAs, offers, and trust signals — Google's
 * optimizer mixes-and-matches, and variety drives Ad Strength + Quality Score.
 */
export function buildHeadlines(product: ProductAdData): { text: string }[] {
  const short = shortProductName(product.productName);
  const cat = meaningfulCategory(product.category);
  return dedupeAssets([
    short,
    `Buy ${short}`,
    `Shop ${short}`,
    `${short} on Sale`,
    `${short} Online`,
    cat && `Top ${cat}`,
    cat && `Shop ${cat}`,
    'Free Shipping',
    'Fast Free Delivery',
    'Shop Now',
    'Order Today',
    'Limited Time Offer',
    'Top Rated',
    'Secure Checkout',
    '30-Day Returns',
  ].filter(Boolean) as string[], HEADLINE_MAX).slice(0, 15);
}

/**
 * Build benefit-rich RSA descriptions (<=90 chars each, all unique, min 2).
 */
export function buildDescriptions(product: ProductAdData): { text: string }[] {
  const short = shortProductName(product.productName);
  const cat = meaningfulCategory(product.category);
  return dedupeAssets([
    `Shop ${short} at a great price. Fast, secure checkout and free shipping.`,
    `Order ${short} today with free shipping and easy 30-day returns.`,
    cat && `Discover top-rated ${cat}. Secure checkout, fast delivery, easy returns.`,
    `Limited-time offer on ${short}. Buy now while supplies last.`,
    'Great prices, fast free shipping, and hassle-free returns. Order today.',
  ].filter(Boolean) as string[], DESC_MAX).slice(0, 4);
}

/**
 * Build phrase-match keyword terms (2..80 chars each, all unique, capped).
 * Derived from the SHORT name so long titles still yield real, servable terms.
 */
export function buildKeywords(product: ProductAdData): string[] {
  const base = shortProductName(product.productName).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cat = meaningfulCategory(product.category).toLowerCase();
  const candidates = [
    base,
    `buy ${base}`,
    `${base} online`,
    `${base} for sale`,
    `best ${base}`,
    `${base} deals`,
    cat,
  ];
  return Array.from(new Set(
    candidates.map(t => t.trim()).filter(t => t.length >= 2 && t.length <= 80)
  )).slice(0, 15);
}

// Google geo target constant IDs for our allowed countries (used to actually
// RESTRICT where ads serve — focusing spend instead of blanketing the globe).
const GEO_TARGET_CONSTANTS: Record<string, string> = {
  US: '2840', CA: '2124', GB: '2826', AU: '2036', JP: '2392',
  KR: '2410', SG: '2702', AE: '2784', BR: '2076', MX: '2484', IN: '2356',
};

// Default campaign-level NEGATIVE keywords. Research: excluding low-intent terms
// like "free/cheap/diy" cuts wasted spend 15–30% and lifts Quality Score, which
// lets us win auctions at lower CPCs than competitors.
const DEFAULT_NEGATIVE_KEYWORDS = [
  'free', 'cheap', 'used', 'second hand', 'diy', 'how to make', 'repair',
  'manual', 'pdf', 'job', 'jobs', 'salary', 'meaning', 'definition',
  'wikipedia', 'torrent', 'crack', 'knockoff', 'replica',
];

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
  // login-customer-id is ALWAYS the manager (MCC) — for both child mutates and
  // for provisioning new children — so it comes straight from env.
  const lc = loginCustomerId();
  if (lc) headers['login-customer-id'] = lc;
  return headers;
}

/**
 * POST a {resource}:mutate request and return the created resource names.
 * `customerIdOverride` targets a specific tenant's child account.
 */
async function mutate(resource: string, operations: any[], customerIdOverride?: string): Promise<string[]> {
  const cid = digits(customerIdOverride || '') || customerId();
  const url = `${ADS_BASE}/customers/${cid}/${resource}:mutate`;
  try {
    const r = await axios.post(url, { operations }, { headers: await adsHeaders(), timeout: REQUEST_TIMEOUT_MS });
    return (r.data?.results || []).map((x: any) => x.resourceName as string);
  } catch (e: any) {
    throw new Error(describeAdsError(e));
  }
}

/**
 * Provision a brand-new Google Ads child account under the Arbi manager (MCC),
 * for a newly-subscribed tenant. Returns the new account's customer id (digits)
 * which is then stored on the tenant and passed as `customerId` to campaign
 * creation. The manager id is GOOGLE_ADS_LOGIN_CUSTOMER_ID.
 */
export async function provisionChildAccount(opts: {
  descriptiveName: string;
  currencyCode?: string;
  timeZone?: string;
}): Promise<{ customerId: string; resourceName: string }> {
  const managerId = loginCustomerId() || customerId();
  if (!managerId) throw new Error('No manager account configured (set GOOGLE_ADS_LOGIN_CUSTOMER_ID).');
  const url = `${ADS_BASE}/customers/${managerId}:createCustomerClient`;
  const body = {
    customerClient: {
      descriptiveName: opts.descriptiveName,
      currencyCode: opts.currencyCode || 'USD',
      timeZone: opts.timeZone || 'America/New_York',
    },
  };
  try {
    const r = await axios.post(url, body, { headers: await adsHeaders(), timeout: REQUEST_TIMEOUT_MS });
    // Response carries the new client resource name as `customerClient`
    // ("customers/{newId}") or `resourceName`.
    const rn: string = r.data?.customerClient || r.data?.resourceName || '';
    const id = digits(String(rn).split('/').pop() || '');
    if (!id) throw new Error(`createCustomerClient returned no customer id: ${JSON.stringify(r.data).slice(0, 300)}`);
    return { customerId: id, resourceName: rn };
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
 * `customerId` scopes the campaign to a tenant's child account (default: env).
 */
export async function createAutomatedCampaign(
  product: ProductAdData,
  config: CampaignConfig,
  customerIdOverride?: string
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
  }], customerIdOverride);
  console.log(`✅ Budget created: ${budgetResource}`);

  // Step 2: Campaign (PAUSED, Maximize Conversions — Target ROAS needs history)
  const [campaignResource] = await mutate('campaigns', [{
    create: {
      name: `Arbi - ${product.productName} - ${product.targetCountry} - ${ts}`,
      advertisingChannelType: 'SEARCH',
      status: 'PAUSED', // never auto-spend
      campaignBudget: budgetResource,
      ...buildBiddingStrategy(config),
      // Required on every campaign since API v17 (EU political ad transparency).
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
        targetPartnerSearchNetwork: false,
      },
    },
  }], customerIdOverride);
  console.log(`✅ Campaign created: ${campaignResource}`);

  // Step 2b: Targeting — restrict geo + add negative keywords. This is what makes
  // the campaign competitive: spend stays in the target country and isn't burned
  // on low-intent "free/cheap/diy" searches.
  await applyCampaignTargeting(campaignResource, config, customerIdOverride);
  console.log(`✅ Targeting applied (geo + negative keywords)`);

  // Step 3: Ad Group
  const [adGroupResource] = await mutate('adGroups', [{
    create: {
      name: `AG - ${truncate(product.productName, 120)}`,
      campaign: campaignResource,
      status: 'ENABLED',
      type: 'SEARCH_STANDARD',
      cpcBidMicros: Math.round((config.maxCPC ?? 0.5) * 1_000_000),
    },
  }], customerIdOverride);
  console.log(`✅ Ad Group created: ${adGroupResource}`);

  // Step 3b: Audience signals (observation mode) — feeds Smart Bidding extra
  // signal without restricting reach. No-op unless audiences are configured.
  await attachAudienceSignals(adGroupResource, config, customerIdOverride);

  // Step 4: Keywords (so the search campaign can actually serve)
  const terms = buildKeywords(product);
  if (terms.length) {
    await mutate('adGroupCriteria', terms.map(text => ({
      create: {
        adGroup: adGroupResource,
        status: 'ENABLED',
        keyword: { text, matchType: 'PHRASE' },
      },
    })), customerIdOverride);
  }

  // Step 5: Responsive Search Ad (text-only; no asset uploads needed)
  const headlines = buildHeadlines(product);
  const descriptions = buildDescriptions(product);
  const [adResource] = await mutate('adGroupAds', [{
    create: {
      adGroup: adGroupResource,
      status: 'PAUSED', // paused with the campaign
      ad: {
        finalUrls: [product.landingPageUrl],
        responsiveSearchAd: { headlines, descriptions },
      },
    },
  }], customerIdOverride);
  console.log(`✅ Responsive Search Ad created: ${adResource}`);

  return { campaignId: campaignResource, adGroupId: adGroupResource, adId: adResource };
}

/**
 * Attach audience signals to an ad group in OBSERVATION mode (status ENABLED,
 * no negative). This gathers performance data and lets Smart Bidding lean into
 * high-intent audiences WITHOUT narrowing who sees the ad. No-op when no
 * audiences are configured. Failures are non-fatal.
 *
 * Audience resource names: remarketing lists ("customers/{cid}/audiences/{id}")
 * require the conversion/remarketing tag to be live first; in-market audiences
 * can be attached as soon as their resource names are supplied.
 */
async function attachAudienceSignals(
  adGroupResource: string,
  config: CampaignConfig,
  customerIdOverride?: string
): Promise<void> {
  const audiences = (config.audiences || []).filter(Boolean);
  if (!audiences.length) return;
  try {
    await mutate('adGroupCriteria', audiences.map(name => ({
      create: {
        adGroup: adGroupResource,
        status: 'ENABLED',
        audience: { audience: name },
      },
    })), customerIdOverride);
    console.log(`✅ Attached ${audiences.length} audience signal(s) (observation)`);
  } catch (e: any) {
    console.warn(`⚠️ Audience attach failed (non-fatal): ${e?.message || e}`);
  }
}

/**
 * Apply campaign-level targeting: geo (where ads serve) + negative keywords
 * (what searches to avoid). Both are campaignCriteria. Failures here are
 * non-fatal — the campaign still exists; we log and continue.
 */
async function applyCampaignTargeting(
  campaignResource: string,
  config: CampaignConfig,
  customerIdOverride?: string
): Promise<void> {
  const ops: any[] = [];

  // Geo: restrict to the configured countries (default US).
  const geos = config.geoTargeting && config.geoTargeting.length ? config.geoTargeting : ['US'];
  for (const code of geos) {
    const id = GEO_TARGET_CONSTANTS[code.toUpperCase()];
    if (id) ops.push({ create: { campaign: campaignResource, location: { geoTargetConstant: `geoTargetConstants/${id}` } } });
  }

  // Negative keywords (broad) to cut wasted spend.
  for (const text of DEFAULT_NEGATIVE_KEYWORDS) {
    ops.push({ create: { campaign: campaignResource, negative: true, keyword: { text, matchType: 'BROAD' } } });
  }

  if (!ops.length) return;
  try {
    await mutate('campaignCriteria', ops, customerIdOverride);
  } catch (e: any) {
    console.warn(`⚠️ Campaign targeting partially failed (non-fatal): ${e?.message || e}`);
  }
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
 * Bulk create campaigns for multiple products (optionally scoped to a tenant).
 */
export async function createBulkCampaigns(
  products: ProductAdData[],
  config: CampaignConfig,
  customerIdOverride?: string
): Promise<{ success: number; failed: number; results: any[] }> {
  const results = [];
  let success = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const result = await createAutomatedCampaign(product, config, customerIdOverride);
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
export async function getCampaignMetrics(campaignId: string, customerIdOverride?: string) {
  const cid = digits(customerIdOverride || '') || customerId();
  const url = `${ADS_BASE}/customers/${cid}/googleAds:search`;
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

/**
 * Enable or pause a campaign — the one-tap "go live" control, so flipping a
 * campaign on/off never requires the Google Ads console. Accepts a bare numeric
 * campaign id or a full resource name. Returns the updated resource name.
 */
export async function setCampaignStatus(
  campaignId: string,
  status: 'ENABLED' | 'PAUSED',
  customerIdOverride?: string
): Promise<string> {
  const cid = digits(customerIdOverride || '') || customerId();
  const resourceName = String(campaignId).includes('/')
    ? String(campaignId)
    : `customers/${cid}/campaigns/${campaignId}`;
  const [updated] = await mutate('campaigns', [{
    update: { resourceName, status },
    updateMask: 'status',
  }], customerIdOverride);
  return updated;
}

/**
 * List campaigns with status + headline metrics (drives the dashboard's
 * go-live view: see what's PAUSED vs serving, and the numbers if any).
 */
export async function listCampaigns(customerIdOverride?: string) {
  const cid = digits(customerIdOverride || '') || customerId();
  const url = `${ADS_BASE}/customers/${cid}/googleAds:search`;
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    ORDER BY campaign.id DESC
    LIMIT 200
  `;
  const r = await axios.post(url, { query }, { headers: await adsHeaders(), timeout: REQUEST_TIMEOUT_MS });
  const rows = r.data?.results || [];
  return rows.map((row: any) => {
    const m = row.metrics || {};
    const spend = Number(m.costMicros || 0) / 1_000_000;
    const revenue = Number(m.conversionsValue || 0);
    return {
      id: row.campaign?.id,
      name: row.campaign?.name,
      status: row.campaign?.status,
      channel: row.campaign?.advertisingChannelType,
      impressions: Number(m.impressions || 0),
      clicks: Number(m.clicks || 0),
      spend,
      conversions: Number(m.conversions || 0),
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
    };
  });
}
