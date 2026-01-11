/**
 * Google Ads Campaign Automation
 * Automatically creates and manages Google Ads campaigns for Arbi products
 */

import { GoogleAdsApi, Customer, Campaign, AdGroup, Ad } from 'google-ads-api';
import { canUseAutomatedAds, canUseAIContent } from '../../../../packages/arbitrage-engine/src/compliance/google-ads-restrictions';

// Initialize Google Ads API
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

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

/**
 * Create automated Google Ads campaign for a product
 */
export async function createAutomatedCampaign(
  product: ProductAdData,
  config: CampaignConfig
): Promise<{ campaignId: string; adGroupId: string; adId: string }> {
  // Compliance check
  if (!canUseAutomatedAds(product.targetCountry)) {
    throw new Error(`Automated ads not allowed in ${product.targetCountry}. Manual creation required.`);
  }

  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });

  console.log(`🎯 Creating campaign for: ${product.productName}`);

  // Step 1: Create Campaign
  const campaign = await createCampaign(customer, product, config);
  console.log(`✅ Campaign created: ${campaign.id}`);

  // Step 2: Create Ad Group
  const adGroup = await createAdGroup(customer, campaign.id, product, config);
  console.log(`✅ Ad Group created: ${adGroup.id}`);

  // Step 3: Create Video Ad (if video available)
  let ad;
  if (product.videoUrl) {
    ad = await createVideoAd(customer, adGroup.id, product);
    console.log(`✅ Video Ad created: ${ad.id}`);
  } else {
    ad = await createResponsiveAd(customer, adGroup.id, product);
    console.log(`✅ Responsive Ad created: ${ad.id}`);
  }

  return {
    campaignId: campaign.id,
    adGroupId: adGroup.id,
    adId: ad.id,
  };
}

/**
 * Create Campaign
 */
async function createCampaign(
  customer: Customer,
  product: ProductAdData,
  config: CampaignConfig
) {
  const campaign = {
    name: `Arbi - ${product.productName} - ${product.targetCountry}`,
    advertising_channel_type: 'VIDEO', // YouTube ads
    status: 'PAUSED', // Start paused for review
    bidding_strategy_type: config.targetROAS ? 'TARGET_ROAS' : 'MAXIMIZE_CONVERSIONS',
    campaign_budget: {
      amount_micros: config.dailyBudget * 1_000_000, // Convert to micros
      delivery_method: 'STANDARD',
    },
    target_roas: config.targetROAS,
    network_settings: {
      target_google_search: false,
      target_search_network: false,
      target_content_network: true, // YouTube
      target_partner_search_network: false,
    },
    geo_target_type_setting: {
      positive_geo_target_type: 'PRESENCE',
    },
  };

  const response = await customer.campaigns.create([campaign]);
  return response.results[0];
}

/**
 * Create Ad Group
 */
async function createAdGroup(
  customer: Customer,
  campaignId: string,
  product: ProductAdData,
  config: CampaignConfig
) {
  const adGroup = {
    name: `AG - ${product.productName}`,
    campaign: campaignId,
    status: 'ENABLED',
    type: 'VIDEO_TRUE_VIEW_IN_STREAM', // Skippable in-stream ads
    cpc_bid_micros: config.maxCPC ? config.maxCPC * 1_000_000 : 500000, // Default $0.50
    targeting_setting: {
      target_restrictions: [],
    },
  };

  const response = await customer.adGroups.create([adGroup]);
  return response.results[0];
}

/**
 * Create Video Ad (using extracted winning ad video)
 */
async function createVideoAd(
  customer: Customer,
  adGroupId: string,
  product: ProductAdData
) {
  const ad = {
    ad_group: adGroupId,
    status: 'ENABLED',
    ad: {
      type: 'VIDEO_AD',
      name: `Video Ad - ${product.productName}`,
      video_ad: {
        video: {
          asset: product.videoUrl, // Cloudinary URL
        },
        in_stream: {
          action_button_label: 'SHOP_NOW',
          action_headline: `Get ${product.productName}`,
          companion_banner: {
            headline: product.productName,
            description: `$${product.productPrice} - Limited Time Offer`,
          },
        },
      },
      final_urls: [product.landingPageUrl],
      display_url: 'arbi.creai.dev',
    },
  };

  const response = await customer.ads.create([ad]);
  return response.results[0];
}

/**
 * Create Responsive Display Ad (fallback if no video)
 */
async function createResponsiveAd(
  customer: Customer,
  adGroupId: string,
  product: ProductAdData
) {
  const ad = {
    ad_group: adGroupId,
    status: 'ENABLED',
    ad: {
      type: 'RESPONSIVE_DISPLAY_AD',
      name: `Display Ad - ${product.productName}`,
      responsive_display_ad: {
        headlines: [
          { text: product.productName },
          { text: `${product.productName} - Best Price` },
          { text: `Limited Time Offer` },
        ],
        descriptions: [
          { text: `Premium ${product.category} at $${product.productPrice}` },
          { text: `Fast Shipping - Money Back Guarantee` },
        ],
        business_name: 'Arbi Marketplace',
        call_to_action_text: 'SHOP_NOW',
      },
      final_urls: [product.landingPageUrl],
    },
  };

  const response = await customer.ads.create([ad]);
  return response.results[0];
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
  const customer = client.Customer({
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
