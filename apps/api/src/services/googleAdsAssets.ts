/**
 * Google Ads Asset Upload Service
 * Upload images, videos, headlines, and descriptions for Demand Gen campaigns
 */

import { GoogleAdsApi, enums } from 'google-ads-api';
import axios from 'axios';

interface AssetUploadResult {
  success: boolean;
  assetType: string;
  resourceName?: string;
  assetId?: string;
  error?: string;
}

interface DemandGenAssets {
  productTitle: string;
  productDescription: string;
  productImages: string[];
  productVideos?: string[];
  landingPageUrl: string;
  businessName?: string;
}

export class GoogleAdsAssetsService {
  private client: GoogleAdsApi | null = null;
  private customer: any = null;

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
      client_id: process.env.GOOGLE_ADS_CLIENT_ID.trim(),
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET.trim(),
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
    });

    this.customer = this.client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!.trim(),
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!.trim(),
    });
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.client !== null && this.customer !== null;
  }

  /**
   * Download image as base64
   */
  private async downloadImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error: any) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Upload image asset
   */
  async uploadImageAsset(imageUrl: string, name: string): Promise<AssetUploadResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        assetType: 'IMAGE',
        error: 'Google Ads not configured',
      };
    }

    try {
      console.log(`📤 Uploading image: ${name}`);

      // Download image
      const imageData = await this.downloadImageAsBase64(imageUrl);

      // Create image asset
      const assetResults = await this.customer.assets.create([{
        name: name,
        type: enums.AssetType.IMAGE,
        image_asset: {
          data: imageData,
        },
      }]);

      const resourceName = assetResults[0].resource_name;
      const assetId = resourceName.split('/').pop();

      console.log(`   ✅ Image uploaded: ${assetId}`);

      return {
        success: true,
        assetType: 'IMAGE',
        resourceName,
        assetId,
      };
    } catch (error: any) {
      console.error(`   ❌ Image upload failed: ${error.message}`);
      return {
        success: false,
        assetType: 'IMAGE',
        error: error.message,
      };
    }
  }

  /**
   * Upload YouTube video asset
   */
  async uploadVideoAsset(youtubeVideoId: string, name: string): Promise<AssetUploadResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        assetType: 'YOUTUBE_VIDEO',
        error: 'Google Ads not configured',
      };
    }

    try {
      console.log(`📤 Uploading video: ${name}`);

      // Create YouTube video asset
      const assetResults = await this.customer.assets.create([{
        name: name,
        type: enums.AssetType.YOUTUBE_VIDEO,
        youtube_video_asset: {
          youtube_video_id: youtubeVideoId,
        },
      }]);

      const resourceName = assetResults[0].resource_name;
      const assetId = resourceName.split('/').pop();

      console.log(`   ✅ Video uploaded: ${assetId}`);

      return {
        success: true,
        assetType: 'YOUTUBE_VIDEO',
        resourceName,
        assetId,
      };
    } catch (error: any) {
      console.error(`   ❌ Video upload failed: ${error.message}`);
      return {
        success: false,
        assetType: 'YOUTUBE_VIDEO',
        error: error.message,
      };
    }
  }

  /**
   * Upload text asset (headline or description)
   */
  async uploadTextAsset(text: string, name: string): Promise<AssetUploadResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        assetType: 'TEXT',
        error: 'Google Ads not configured',
      };
    }

    try {
      console.log(`📤 Uploading text: ${name}`);

      // Create text asset
      const assetResults = await this.customer.assets.create([{
        name: name,
        type: enums.AssetType.TEXT,
        text_asset: {
          text: text,
        },
      }]);

      const resourceName = assetResults[0].resource_name;
      const assetId = resourceName.split('/').pop();

      console.log(`   ✅ Text uploaded: ${assetId}`);

      return {
        success: true,
        assetType: 'TEXT',
        resourceName,
        assetId,
      };
    } catch (error: any) {
      console.error(`   ❌ Text upload failed: ${error.message}`);
      return {
        success: false,
        assetType: 'TEXT',
        error: error.message,
      };
    }
  }

  /**
   * Upload all assets for Demand Gen campaign
   */
  async uploadDemandGenAssets(assets: DemandGenAssets): Promise<{
    success: boolean;
    images: AssetUploadResult[];
    videos: AssetUploadResult[];
    headlines: AssetUploadResult[];
    descriptions: AssetUploadResult[];
  }> {
    console.log(`\n🎨 Uploading Demand Gen assets for: ${assets.productTitle}\n`);

    const results = {
      success: true,
      images: [] as AssetUploadResult[],
      videos: [] as AssetUploadResult[],
      headlines: [] as AssetUploadResult[],
      descriptions: [] as AssetUploadResult[],
    };

    // Upload images (up to 20)
    console.log('📸 Uploading images...');
    for (let i = 0; i < Math.min(assets.productImages.length, 20); i++) {
      const imageUrl = assets.productImages[i];
      const result = await this.uploadImageAsset(
        imageUrl,
        `${assets.productTitle} - Image ${i + 1}`
      );
      results.images.push(result);
      if (!result.success) results.success = false;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Upload videos (if any)
    if (assets.productVideos && assets.productVideos.length > 0) {
      console.log('\n🎥 Uploading videos...');
      for (let i = 0; i < assets.productVideos.length; i++) {
        const videoUrl = assets.productVideos[i];
        // Extract YouTube video ID from URL
        const videoId = this.extractYouTubeId(videoUrl);
        if (videoId) {
          const result = await this.uploadVideoAsset(
            videoId,
            `${assets.productTitle} - Video ${i + 1}`
          );
          results.videos.push(result);
          if (!result.success) results.success = false;

          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Generate and upload headlines (5-15 variations)
    console.log('\n📝 Uploading headlines...');
    const headlines = this.generateHeadlines(assets.productTitle, assets.businessName);
    for (let i = 0; i < headlines.length; i++) {
      const result = await this.uploadTextAsset(
        headlines[i],
        `Headline ${i + 1} - ${assets.productTitle.substring(0, 20)}`
      );
      results.headlines.push(result);
      if (!result.success) results.success = false;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate and upload descriptions (5 variations)
    console.log('\n📄 Uploading descriptions...');
    const descriptions = this.generateDescriptions(assets.productDescription);
    for (let i = 0; i < descriptions.length; i++) {
      const result = await this.uploadTextAsset(
        descriptions[i],
        `Description ${i + 1} - ${assets.productTitle.substring(0, 20)}`
      );
      results.descriptions.push(result);
      if (!result.success) results.success = false;

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Asset upload complete!');
    console.log(`   Images: ${results.images.filter(r => r.success).length}/${results.images.length}`);
    console.log(`   Videos: ${results.videos.filter(r => r.success).length}/${results.videos.length}`);
    console.log(`   Headlines: ${results.headlines.filter(r => r.success).length}/${results.headlines.length}`);
    console.log(`   Descriptions: ${results.descriptions.filter(r => r.success).length}/${results.descriptions.length}`);

    return results;
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  /**
   * Generate headline variations
   */
  private generateHeadlines(productTitle: string, businessName?: string): string[] {
    const business = businessName || 'Arbi Market';
    const shortTitle = productTitle.substring(0, 30); // Google Ads headline limit

    return [
      shortTitle,
      `${shortTitle} - ${business}`,
      `Shop ${shortTitle}`,
      `${shortTitle} on Sale`,
      `Get ${shortTitle} Today`,
      `${shortTitle} - Best Price`,
      `Limited Stock: ${shortTitle}`,
      `${shortTitle} - Free Ship`,
      `Buy ${shortTitle} Now`,
      `${shortTitle} Deals`,
    ].map(h => h.substring(0, 30)); // Ensure all under 30 chars
  }

  /**
   * Generate description variations
   */
  private generateDescriptions(productDescription: string): string[] {
    const shortDesc = productDescription.substring(0, 60); // Keep it concise

    return [
      `${shortDesc} Free shipping. Shop now!`,
      `${shortDesc} Best prices guaranteed.`,
      `${shortDesc} Fast delivery available.`,
      `${shortDesc} Limited time offer.`,
      `${shortDesc} Buy now, pay later options.`,
    ].map(d => d.substring(0, 90)); // Google Ads description limit
  }
}

// Export singleton
export const googleAdsAssets = new GoogleAdsAssetsService();
