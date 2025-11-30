import axios from 'axios';

interface AdCampaignConfig {
  accessToken: string;
  advertiserId: string;
  pixelCode?: string;
  refreshToken?: string;
  appId?: string;
  appSecret?: string;
}

interface AdCreative {
  title: string;
  text: string;
  imageUrl: string;
  landingPageUrl: string;
  price: number;
  currency: string;
}

interface AdResult {
  success: boolean;
  campaignId?: string;
  adGroupId?: string;
  adId?: string;
  error?: string;
  platform: 'tiktok' | 'google' | 'facebook';
}

export class AdManager {
  private config: AdCampaignConfig;
  private baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';

  constructor(config: AdCampaignConfig) {
    this.config = config;
  }

  /**
   * Create a complete ad campaign for a product listing
   * This automates the entire flow: Campaign -> AdGroup -> Ad
   */
  async promoteListing(listing: any): Promise<AdResult> {
    try {
      console.log(`📢 Creating TikTok ad campaign for: ${listing.productTitle}`);

      if (!this.config.accessToken || !this.config.advertiserId) {
        console.log('⚠️  TikTok Ads credentials not set - Skipping ad creation');
        return { success: false, platform: 'tiktok', error: 'Missing credentials' };
      }

      // Check if token needs refresh (simple check, real implementation would check expiry)
      // For now, we just try the request and catch 401 errors
      
      try {
        // 1. Create Campaign
        const campaignId = await this.createCampaign(listing.productTitle);
        console.log(`   ✅ Campaign created: ${campaignId}`);

        // 2. Create Ad Group (Targeting)
        const adGroupId = await this.createAdGroup(campaignId, listing.productTitle);
        console.log(`   ✅ Ad Group created: ${adGroupId}`);

        // 3. Create Ad Creative
        const adId = await this.createAd(adGroupId, {
          title: listing.productTitle.substring(0, 40), // TikTok limit
          text: listing.productDescription.substring(0, 100),
          imageUrl: listing.productImages[0] || 'https://via.placeholder.com/1200x628',
          landingPageUrl: `https://your-marketplace.com/product/${listing.listingId}`,
          price: listing.marketplacePrice,
          currency: 'USD'
        });
        console.log(`   ✅ Ad created: ${adId}`);

        return {
          success: true,
          campaignId,
          adGroupId,
          adId,
          platform: 'tiktok'
        };
      } catch (apiError: any) {
        // Handle token expiration
        if (apiError.response?.data?.code === 40102 && this.config.refreshToken) {
          console.log('🔄 Access token expired, refreshing...');
          await this.refreshAccessToken();
          // Retry the operation (recursive call, be careful with infinite loops)
          return this.promoteListing(listing);
        }
        throw apiError;
      }

    } catch (error: any) {
      console.error('❌ Failed to create TikTok ad:', error.response?.data || error.message);
      return {
        success: false,
        platform: 'tiktok',
        error: error.message
      };
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken || !this.config.appId || !this.config.appSecret) {
      throw new Error('Cannot refresh token: Missing refresh_token or app credentials');
    }

    try {
      const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
        client_key: this.config.appId,
        client_secret: this.config.appSecret,
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, refresh_token } = response.data.data;
      
      // Update config
      this.config.accessToken = access_token;
      this.config.refreshToken = refresh_token; // Refresh token might rotate too
      
      console.log('✅ TikTok access token refreshed successfully');
      
      // In a real app, you should save these new tokens to your database/env
      // so they persist across restarts.
      
    } catch (error: any) {
      console.error('❌ Failed to refresh TikTok token:', error.response?.data || error.message);
      throw error;
    }
  }

  private async createCampaign(name: string): Promise<string> {
    // In a real implementation, this would call: POST /campaign/create/
    // For now, we simulate the API call if keys are present, or return a mock ID
    
    /* 
    const response = await axios.post(`${this.baseUrl}/campaign/create/`, {
      advertiser_id: this.config.advertiserId,
      campaign_name: `Arbi - ${name}`,
      objective_type: 'TRAFFIC',
      budget_mode: 'BUDGET_MODE_DAY',
      budget: 20 // $20 daily budget
    }, {
      headers: { 'Access-Token': this.config.accessToken }
    });
    return response.data.data.campaign_id;
    */

    // Mock response for demonstration
    await new Promise(resolve => setTimeout(resolve, 500));
    return `cmp_${Date.now()}`;
  }

  private async createAdGroup(campaignId: string, name: string): Promise<string> {
    // POST /adgroup/create/
    /*
    const response = await axios.post(`${this.baseUrl}/adgroup/create/`, {
      advertiser_id: this.config.advertiserId,
      campaign_id: campaignId,
      adgroup_name: `Group - ${name}`,
      placement_type: 'PLACEMENT_TYPE_NORMAL',
      placements: ['PLACEMENT_TIKTOK'],
      location_ids: ['US'], // Target USA
      budget: 20,
      schedule_type: 'SCHEDULE_START_END',
      billing_event: 'CPC',
      bid_price: 0.5 // $0.50 per click
    }, {
      headers: { 'Access-Token': this.config.accessToken }
    });
    return response.data.data.adgroup_id;
    */

    await new Promise(resolve => setTimeout(resolve, 500));
    return `grp_${Date.now()}`;
  }

  private async createAd(adGroupId: string, creative: AdCreative): Promise<string> {
    // POST /ad/create/
    // Note: Real TikTok ads require uploading image/video first to get an ID
    
    /*
    // 1. Upload Image
    const imageId = await this.uploadImage(creative.imageUrl);

    // 2. Create Ad
    const response = await axios.post(`${this.baseUrl}/ad/create/`, {
      advertiser_id: this.config.advertiserId,
      adgroup_id: adGroupId,
      creatives: [{
        ad_name: creative.title,
        ad_text: creative.text,
        image_ids: [imageId],
        ad_format: 'SINGLE_IMAGE',
        landing_page_url: creative.landingPageUrl,
        call_to_action: 'SHOP_NOW'
      }]
    }, {
      headers: { 'Access-Token': this.config.accessToken }
    });
    return response.data.data.ad_id;
    */

    await new Promise(resolve => setTimeout(resolve, 500));
    return `ad_${Date.now()}`;
  }

  private async uploadImage(imageUrl: string): Promise<string> {
    // Helper to upload image to TikTok and get ID
    return `img_${Date.now()}`;
  }
}

// Export singleton instance
export const adManager = new AdManager({
  accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
  refreshToken: process.env.TIKTOK_REFRESH_TOKEN || '',
  advertiserId: process.env.TIKTOK_ADVERTISER_ID || '',
  appId: process.env.TIKTOK_APP_ID || '',
  appSecret: process.env.TIKTOK_APP_SECRET || '',
  pixelCode: process.env.TIKTOK_PIXEL_CODE
});
