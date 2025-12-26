/**
 * Google Ads Performance Max Campaign Manager
 *
 * Performance Max is Google's AI-powered campaign type that automatically
 * optimizes across ALL Google properties:
 * - Google Search
 * - YouTube
 * - Display Network
 * - Discover
 * - Gmail
 * - Google Maps
 *
 * AI automatically:
 * - Finds best-performing audiences
 * - Optimizes bids in real-time
 * - Tests different ad combinations
 * - Places ads where they'll perform best
 *
 * Perfect for dropshipping - let AI do the heavy lifting!
 */

import { GoogleAdsApi, enums } from 'google-ads-api';

export interface PerformanceMaxConfig {
  productTitle: string;
  productDescription: string;
  productImages: string[]; // 3-20 images recommended
  productVideos?: string[]; // Optional video URLs (can use AI-generated)
  landingPageUrl: string;
  price: number;
  dailyBudget?: number; // Default: $20/day
  targetRoas?: number; // Target Return on Ad Spend (e.g., 3.0 = 300% ROAS)
}

export interface PerformanceMaxResult {
  success: boolean;
  campaignId?: string;
  campaignName?: string;
  assetGroupId?: string;
  budgetAmount?: number;
  error?: string;
}

export class GoogleAdsPerformanceMax {
  private client: any;
  private customer: any;

  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize Google Ads API client
   */
  private initializeClient() {
    if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET) {
      console.log('⚠️  Google Ads not configured');
      return;
    }

    this.client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    this.customer = this.client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      login_customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID, // For manager accounts
    });
  }

  /**
   * Create Performance Max campaign with AI-optimized asset groups
   */
  async createCampaign(config: PerformanceMaxConfig): Promise<PerformanceMaxResult> {
    if (!this.customer) {
      return {
        success: false,
        error: 'Google Ads not configured. Set GOOGLE_ADS_CLIENT_ID and related env vars.',
      };
    }

    try {
      console.log('🚀 Creating Performance Max campaign...');
      console.log(`   Product: ${config.productTitle}`);
      console.log(`   Budget: $${config.dailyBudget || 20}/day`);

      const campaignName = `Arbi PMax - ${config.productTitle.substring(0, 50)}`;
      const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;

      // Step 1: Create Campaign Budget
      const budgetResourceName = await this.createBudget(
        campaignName,
        config.dailyBudget || 20
      );

      console.log(`   ✅ Budget created: $${config.dailyBudget || 20}/day`);

      // Step 2: Create Performance Max Campaign
      const campaignResourceName = await this.createPerformanceMaxCampaign(
        campaignName,
        budgetResourceName,
        config.targetRoas
      );

      console.log(`   ✅ Performance Max campaign created`);

      // Step 3: Create Asset Group (images, videos, headlines, descriptions)
      const assetGroupId = await this.createAssetGroup(
        campaignResourceName,
        config
      );

      console.log(`   ✅ Asset group created with ${config.productImages.length} images` +
                  (config.productVideos ? ` and ${config.productVideos.length} videos` : ''));

      console.log(`   🎉 Performance Max campaign LIVE!`);
      console.log(`   🤖 Google AI is now optimizing across all platforms`);
      console.log(`   📊 Campaigns → ${campaignName}`);

      // Extract campaign ID from resource name
      const campaignId = campaignResourceName.split('/').pop();

      return {
        success: true,
        campaignId,
        campaignName,
        assetGroupId,
        budgetAmount: config.dailyBudget || 20,
      };

    } catch (error: any) {
      console.error(`❌ Performance Max campaign creation failed:`, error.message);
      console.error('Error details:', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create campaign budget
   */
  private async createBudget(name: string, dailyBudgetUsd: number): Promise<string> {
    const budgetResult = await this.customer.campaignBudgets.create({
      name: `Budget - ${name}`,
      amount_micros: dailyBudgetUsd * 1_000_000, // Convert dollars to micros
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      explicitly_shared: false,
    });

    return budgetResult.resource_name;
  }

  /**
   * Create Performance Max campaign
   */
  private async createPerformanceMaxCampaign(
    name: string,
    budgetResourceName: string,
    targetRoas?: number
  ): Promise<string> {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD

    const campaignConfig: any = {
      name,
      campaign_budget: budgetResourceName,
      status: enums.CampaignStatus.ENABLED,
      advertising_channel_type: enums.AdvertisingChannelType.PERFORMANCE_MAX,
      start_date: startDate,

      // Performance Max specific settings
      shopping_setting: {
        // Enable Google Merchant Center for product feeds (optional)
        // merchant_id: process.env.GOOGLE_MERCHANT_CENTER_ID,
        enable_local: true, // Show in local inventory ads
      },

      // URL expansion (let Google find related pages on your site)
      url_expansion_opt_out: false,

      // Final URL expansion (let Google optimize landing pages)
      final_url_suffix: 'utm_source=google&utm_medium=pmax&utm_campaign=arbi',
    };

    // Add Target ROAS if specified
    if (targetRoas) {
      campaignConfig.maximize_conversion_value = {
        target_roas: targetRoas, // e.g., 3.0 = 300% ROAS ($3 revenue per $1 spent)
      };
    } else {
      // Default: Maximize Conversion Value (let AI optimize for revenue)
      campaignConfig.bidding_strategy_type = enums.BiddingStrategyType.MAXIMIZE_CONVERSION_VALUE;
    }

    const campaignResult = await this.customer.campaigns.create(campaignConfig);

    return campaignResult.resource_name;
  }

  /**
   * Create Asset Group with images, videos, headlines, descriptions
   * This is where the magic happens - Google AI tests all combinations!
   */
  private async createAssetGroup(
    campaignResourceName: string,
    config: PerformanceMaxConfig
  ): Promise<string> {
    // Step 1: Upload images as assets
    const imageAssets = await this.uploadImageAssets(config.productImages);

    // Step 2: Upload videos as assets (if provided)
    const videoAssets = config.productVideos
      ? await this.uploadVideoAssets(config.productVideos)
      : [];

    // Step 3: Generate headlines (3-15 recommended)
    const headlines = this.generateHeadlines(config.productTitle, config.price);

    // Step 4: Generate descriptions (2-5 recommended)
    const descriptions = this.generateDescriptions(config.productDescription);

    // Step 5: Create Asset Group
    const assetGroupResult = await this.customer.assetGroups.create({
      campaign: campaignResourceName,
      name: `Assets - ${config.productTitle.substring(0, 50)}`,
      status: enums.AssetGroupStatus.ENABLED,

      // Final URLs (where users land after clicking)
      final_urls: [config.landingPageUrl],
      final_mobile_urls: [config.landingPageUrl],

      // Asset combinations
      // Google AI will test EVERY combination to find what works best
    });

    const assetGroupResourceName = assetGroupResult.resource_name;

    // Step 6: Link all assets to the asset group
    await this.linkAssetsToGroup(
      assetGroupResourceName,
      imageAssets,
      videoAssets,
      headlines,
      descriptions
    );

    return assetGroupResourceName.split('/').pop() || '';
  }

  /**
   * Upload product images as Google Ads assets
   */
  private async uploadImageAssets(imageUrls: string[]): Promise<string[]> {
    const assetResourceNames: string[] = [];

    for (const imageUrl of imageUrls.slice(0, 20)) { // Max 20 images
      try {
        const assetResult = await this.customer.assets.create({
          type: enums.AssetType.IMAGE,
          image_asset: {
            data: await this.downloadImageAsBase64(imageUrl),
          },
          name: `Product Image - ${Date.now()}`,
        });

        assetResourceNames.push(assetResult.resource_name);
      } catch (error: any) {
        console.error(`   ⚠️  Failed to upload image: ${error.message}`);
      }
    }

    return assetResourceNames;
  }

  /**
   * Upload videos as Google Ads assets
   */
  private async uploadVideoAssets(videoUrls: string[]): Promise<string[]> {
    const assetResourceNames: string[] = [];

    for (const videoUrl of videoUrls.slice(0, 5)) { // Max 5 videos
      try {
        // For videos, Google requires YouTube URLs
        // If video is not on YouTube, we need to upload to YouTube first
        // For now, we'll create a media bundle asset

        const assetResult = await this.customer.assets.create({
          type: enums.AssetType.YOUTUBE_VIDEO,
          youtube_video_asset: {
            youtube_video_id: this.extractYouTubeId(videoUrl),
          },
          name: `Product Video - ${Date.now()}`,
        });

        assetResourceNames.push(assetResult.resource_name);
      } catch (error: any) {
        console.error(`   ⚠️  Failed to upload video: ${error.message}`);
        console.log(`   ℹ️  Videos must be on YouTube. Upload ${videoUrl} to YouTube first.`);
      }
    }

    return assetResourceNames;
  }

  /**
   * Generate optimized headlines (Google tests all combinations)
   */
  private generateHeadlines(productTitle: string, price: number): string[] {
    const short = productTitle.substring(0, 30);

    return [
      short,
      `${short} - Best Deal`,
      `Buy ${short}`,
      `${short} on Sale`,
      `Get ${short} Today`,
      `${short} - Free Shipping`,
      `Save on ${short}`,
      `${short} - $${price.toFixed(2)}`,
      `Shop ${short}`,
      `${short} - Fast Delivery`,
      `Limited: ${short}`,
      `${short} - Top Rated`,
    ].map(h => h.substring(0, 30)); // Max 30 chars
  }

  /**
   * Generate optimized descriptions
   */
  private generateDescriptions(productDescription: string): string[] {
    const short = productDescription.substring(0, 90);

    return [
      short,
      `${short} Free shipping. Secure checkout.`,
      `${short} Buy now, pay later with Klarna.`,
      `${short} Fast delivery. Easy returns.`,
      `${short} Limited stock available.`,
    ].map(d => d.substring(0, 90)); // Max 90 chars
  }

  /**
   * Link all assets to asset group
   */
  private async linkAssetsToGroup(
    assetGroupResourceName: string,
    imageAssets: string[],
    videoAssets: string[],
    headlines: string[],
    descriptions: string[]
  ): Promise<void> {
    const assetGroupAssets: any[] = [];

    // Link headline text assets
    for (const headline of headlines) {
      assetGroupAssets.push({
        asset_group: assetGroupResourceName,
        field_type: enums.AssetFieldType.HEADLINE,
        asset: {
          text_asset: { text: headline },
        },
      });
    }

    // Link description text assets
    for (const description of descriptions) {
      assetGroupAssets.push({
        asset_group: assetGroupResourceName,
        field_type: enums.AssetFieldType.DESCRIPTION,
        asset: {
          text_asset: { text: description },
        },
      });
    }

    // Link image assets
    for (const imageAsset of imageAssets) {
      assetGroupAssets.push({
        asset_group: assetGroupResourceName,
        field_type: enums.AssetFieldType.MARKETING_IMAGE,
        asset: imageAsset,
      });

      // Also add as square marketing image
      assetGroupAssets.push({
        asset_group: assetGroupResourceName,
        field_type: enums.AssetFieldType.SQUARE_MARKETING_IMAGE,
        asset: imageAsset,
      });
    }

    // Link video assets
    for (const videoAsset of videoAssets) {
      assetGroupAssets.push({
        asset_group: assetGroupResourceName,
        field_type: enums.AssetFieldType.YOUTUBE_VIDEO,
        asset: videoAsset,
      });
    }

    // Batch create all asset links
    if (assetGroupAssets.length > 0) {
      await this.customer.assetGroupAssets.create(assetGroupAssets);
      console.log(`   ✅ Linked ${assetGroupAssets.length} assets to asset group`);
    }
  }

  /**
   * Download image and convert to base64
   */
  private async downloadImageAsBase64(url: string): Promise<Buffer> {
    const axios = require('axios');
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : url;
  }

  /**
   * Check if Performance Max is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN
    );
  }
}

// Export singleton
export const googleAdsPerformanceMax = new GoogleAdsPerformanceMax();
