/**
 * TikTok Marketing API Service
 * Real API integration for creating and managing TikTok ad campaigns
 *
 * Documentation: https://business-api.tiktok.com/portal/docs
 * API Version: v1.3
 */

import axios from 'axios';

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

interface TikTokCampaignConfig {
  productTitle: string;
  productDescription: string;
  productImage: string;
  landingPageUrl: string;
  marketplacePrice: number;
  dailyBudget?: number;
}

interface TikTokCampaignResult {
  success: boolean;
  campaignId?: string;
  adGroupId?: string;
  adId?: string;
  error?: string;
}

export class TikTokMarketingService {
  private accessToken: string;
  private advertiserId: string;

  constructor() {
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN || '';
    this.advertiserId = process.env.TIKTOK_ADVERTISER_ID || '';
  }

  /**
   * Check if TikTok Marketing API is configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.advertiserId);
  }

  /**
   * Get OAuth access token using App ID and Secret
   * Call this to get initial access token - save result to TIKTOK_ACCESS_TOKEN
   */
  async getAccessToken(authCode: string): Promise<string> {
    try {
      const response = await axios.post(`${TIKTOK_API_BASE}/oauth2/access_token/`, {
        app_id: process.env.TIKTOK_APP_ID,
        secret: process.env.TIKTOK_APP_SECRET,
        auth_code: authCode,
      });

      if (response.data.code === 0) {
        this.accessToken = response.data.data.access_token;
        console.log('✅ TikTok access token obtained');
        console.log('   Add to Railway: TIKTOK_ACCESS_TOKEN=' + this.accessToken);
        return this.accessToken;
      }

      throw new Error(`TikTok OAuth failed: ${response.data.message}`);
    } catch (error: any) {
      console.error('❌ TikTok OAuth error:', error.message);
      throw error;
    }
  }

  /**
   * Create a complete TikTok ad campaign
   * Creates: Campaign → Ad Group → Image Ad → Launches live
   */
  async createCampaign(config: TikTokCampaignConfig): Promise<TikTokCampaignResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'TikTok Marketing API not configured. Set TIKTOK_ACCESS_TOKEN and TIKTOK_ADVERTISER_ID',
      };
    }

    console.log('\n🎯 Creating TikTok Ad Campaign...');
    console.log(`   Product: ${config.productTitle}`);
    console.log(`   Landing: ${config.landingPageUrl}`);

    try {
      // Step 1: Create Campaign
      const campaignId = await this.createCampaignObject(config);
      console.log(`   ✅ Campaign created: ${campaignId}`);

      // Step 2: Create Ad Group (targeting, budget, schedule)
      const adGroupId = await this.createAdGroup(campaignId, config);
      console.log(`   ✅ Ad Group created: ${adGroupId}`);

      // Step 3: Upload image creative
      const imageId = await this.uploadImage(config.productImage);
      console.log(`   ✅ Image uploaded: ${imageId}`);

      // Step 4: Create ad with creative
      const adId = await this.createAd(adGroupId, imageId, config);
      console.log(`   ✅ Ad created: ${adId}`);

      console.log('   🎉 TikTok campaign is LIVE!');

      return {
        success: true,
        campaignId,
        adGroupId,
        adId,
      };

    } catch (error: any) {
      console.error('   ❌ TikTok campaign creation failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Step 1: Create Campaign
   */
  private async createCampaignObject(config: TikTokCampaignConfig): Promise<string> {
    const campaignName = `Arbi - ${config.productTitle.substring(0, 50)}`;

    const response = await axios.post(
      `${TIKTOK_API_BASE}/campaign/create/`,
      {
        advertiser_id: this.advertiserId,
        campaign_name: campaignName,
        objective_type: 'CONVERSIONS', // Optimize for purchases
        budget_mode: 'BUDGET_MODE_INFINITE', // Daily budget at ad group level
      },
      {
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`Campaign creation failed: ${response.data.message}`);
    }

    return response.data.data.campaign_id;
  }

  /**
   * Step 2: Create Ad Group (targeting, budget, bidding)
   */
  private async createAdGroup(campaignId: string, config: TikTokCampaignConfig): Promise<string> {
    const dailyBudget = config.dailyBudget || 20; // Default $20/day

    const response = await axios.post(
      `${TIKTOK_API_BASE}/adgroup/create/`,
      {
        advertiser_id: this.advertiserId,
        campaign_id: campaignId,
        adgroup_name: `AdGroup - ${config.productTitle.substring(0, 40)}`,

        // Budget
        budget_mode: 'BUDGET_MODE_DAY',
        budget: dailyBudget,

        // Bidding
        billing_event: 'CPC', // Cost per click
        bid_type: 'BID_TYPE_NO_BID', // Auto bid
        optimization_goal: 'CONVERT', // Optimize for conversions

        // Placement
        placement_type: 'PLACEMENT_TYPE_AUTOMATIC', // Auto placement
        placements: ['PLACEMENT_TIKTOK'], // TikTok platform

        // Targeting
        location_ids: ['6252001'], // United States
        languages: ['en'],
        age_groups: ['AGE_25_34', 'AGE_35_44', 'AGE_45_54'],
        gender: 'GENDER_UNLIMITED',

        // Pixel for conversion tracking
        pixel_id: process.env.TIKTOK_PIXEL_ID || null,
        optimization_event: 'COMPLETE_PAYMENT',

        // Schedule
        schedule_type: 'SCHEDULE_START_END',
        schedule_start_time: new Date().toISOString(),
        schedule_end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      },
      {
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`Ad Group creation failed: ${response.data.message}`);
    }

    return response.data.data.adgroup_id;
  }

  /**
   * Step 3: Upload image for ad creative
   */
  private async uploadImage(imageUrl: string): Promise<string> {
    // Download image first
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);
    const base64Image = imageBuffer.toString('base64');

    // Upload to TikTok
    const response = await axios.post(
      `${TIKTOK_API_BASE}/file/image/ad/upload/`,
      {
        advertiser_id: this.advertiserId,
        image_file: base64Image,
        upload_type: 'UPLOAD_BY_FILE',
        file_name: 'product.jpg',
      },
      {
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`Image upload failed: ${response.data.message}`);
    }

    return response.data.data.image_id;
  }

  /**
   * Step 4: Create the actual ad
   */
  private async createAd(adGroupId: string, imageId: string, config: TikTokCampaignConfig): Promise<string> {
    const adText = `${config.productTitle} - Only $${config.marketplacePrice}! 🔥 Limited time offer. Shop now! 🛍️`;

    const response = await axios.post(
      `${TIKTOK_API_BASE}/ad/create/`,
      {
        advertiser_id: this.advertiserId,
        adgroup_id: adGroupId,
        ad_name: `Ad - ${config.productTitle.substring(0, 40)}`,
        ad_format: 'SINGLE_IMAGE',
        ad_text: adText.substring(0, 100), // Max 100 chars

        // Creative
        creatives: [{
          image_ids: [imageId],
          identity_type: 'CUSTOMIZED_USER',
          identity_id: this.advertiserId,
          ad_text: adText.substring(0, 100),
        }],

        // Call to action
        call_to_action: 'SHOP_NOW',
        landing_page_url: config.landingPageUrl,

        // Display name
        display_name: 'Arbi',

        // Tracking
        tracking_pixel_id: process.env.TIKTOK_PIXEL_ID || null,

        // Video (not required for image ads)
        video_id: null,
      },
      {
        headers: {
          'Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`Ad creation failed: ${response.data.message}`);
    }

    return response.data.data.ad_id;
  }

  /**
   * Get campaign performance metrics
   */
  async getCampaignMetrics(campaignId: string): Promise<any> {
    try {
      const response = await axios.get(`${TIKTOK_API_BASE}/reports/integrated/get/`, {
        params: {
          advertiser_id: this.advertiserId,
          report_type: 'BASIC',
          data_level: 'AUCTION_CAMPAIGN',
          dimensions: JSON.stringify(['campaign_id']),
          metrics: JSON.stringify([
            'spend',
            'impressions',
            'clicks',
            'ctr',
            'cpc',
            'conversions',
            'conversion_rate',
            'cost_per_conversion',
          ]),
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          filtering: JSON.stringify([{
            field_name: 'campaign_id',
            filter_type: 'IN',
            filter_value: JSON.stringify([campaignId]),
          }]),
        },
        headers: {
          'Access-Token': this.accessToken,
        },
      });

      if (response.data.code === 0) {
        return response.data.data.list[0] || null;
      }

      return null;
    } catch (error: any) {
      console.error('Error fetching TikTok metrics:', error.message);
      return null;
    }
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${TIKTOK_API_BASE}/campaign/update/status/`,
        {
          advertiser_id: this.advertiserId,
          campaign_ids: [campaignId],
          opt_status: 'DISABLE', // Pause campaign
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.code === 0;
    } catch (error: any) {
      console.error('Error pausing TikTok campaign:', error.message);
      return false;
    }
  }

  /**
   * Enable a campaign
   */
  async enableCampaign(campaignId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${TIKTOK_API_BASE}/campaign/update/status/`,
        {
          advertiser_id: this.advertiserId,
          campaign_ids: [campaignId],
          opt_status: 'ENABLE',
        },
        {
          headers: {
            'Access-Token': this.accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.code === 0;
    } catch (error: any) {
      console.error('Error enabling TikTok campaign:', error.message);
      return false;
    }
  }
}

// Export singleton
export const tiktokMarketing = new TikTokMarketingService();
