/**
 * Video Ad Generator Service
 * Automatically creates product videos for Performance Max campaigns
 *
 * Uses Remotion (FREE, open source) as primary method
 * Falls back to Shotstack API if Remotion unavailable
 * Generates 15-30 second videos from product images and text
 * Uploads to Cloudinary for use in Google Ads
 */

import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import { MarketplaceListing } from '../routes/marketplace';

export interface VideoGenerationConfig {
  duration?: number; // Video duration in seconds (default: 15)
  template?: 'slideshow' | 'product-showcase' | 'promotional';
  includePrice?: boolean;
  includeCTA?: boolean;
  ctaText?: string;
  orientation?: 'horizontal' | 'vertical'; // New: support vertical videos
}

export interface GeneratedVideo {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  width: number;
  height: number;
  method: 'remotion' | 'shotstack' | 'cloudinary'; // Track which method was used
}

/**
 * Video Ad Generator
 * Primary: Remotion (FREE, open source, unlimited videos)
 * Fallback: Shotstack API ($49/month, professional templates)
 * Last resort: Cloudinary (basic image enhancements)
 */
export class VideoAdGenerator {
  private shotstackApiKey: string | undefined;
  private remotionAvailable: boolean;
  private method: 'remotion' | 'shotstack' | 'cloudinary';

  constructor() {
    this.shotstackApiKey = process.env.SHOTSTACK_API_KEY;

    // Check if Remotion is available
    this.remotionAvailable = this.checkRemotionAvailability();

    // Determine which method to use (priority: Remotion > Shotstack > Cloudinary)
    if (this.remotionAvailable) {
      this.method = 'remotion';
      console.log('📹 Using Remotion (FREE open source) for video generation');
    } else if (this.shotstackApiKey) {
      this.method = 'shotstack';
      console.log('📹 Using Shotstack API ($49/month) for video generation');
    } else {
      this.method = 'cloudinary';
      console.log('📹 Using Cloudinary (basic enhancements) - install Remotion for full videos');
    }
  }

  /**
   * Check if Remotion is installed and available
   */
  private checkRemotionAvailability(): boolean {
    try {
      require('remotion');
      require('@remotion/bundler');
      require('@remotion/renderer');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a product video from marketplace listing
   * Routes to best available method: Remotion > Shotstack > Cloudinary
   */
  async generateProductVideo(
    listing: MarketplaceListing,
    config: VideoGenerationConfig = {}
  ): Promise<GeneratedVideo> {
    const {
      duration = 15,
      template = 'product-showcase',
      includePrice = true,
      includeCTA = true,
      ctaText = 'Shop Now',
      orientation = 'horizontal'
    } = config;

    console.log(`🎬 Generating ${duration}s ${orientation} video for: ${listing.productTitle}`);
    console.log(`   Method: ${this.method.toUpperCase()}`);

    // Filter to only Cloudinary-hosted images
    const cloudinaryImages = listing.productImages.filter(img =>
      img.includes('cloudinary.com')
    );

    if (cloudinaryImages.length === 0) {
      throw new Error('No Cloudinary-hosted images available for video generation');
    }

    console.log(`   Using ${cloudinaryImages.length} product images`);

    // Route to appropriate video generation method
    switch (this.method) {
      case 'remotion':
        return await this.generateWithRemotion(
          cloudinaryImages,
          listing,
          duration,
          orientation,
          includePrice,
          includeCTA,
          ctaText
        );

      case 'shotstack':
        return await this.generateWithShotstack(
          cloudinaryImages,
          listing,
          template,
          duration,
          includePrice,
          includeCTA,
          ctaText
        );

      case 'cloudinary':
      default:
        return await this.generateWithCloudinary(
          cloudinaryImages,
          listing,
          duration,
          includePrice,
          includeCTA,
          ctaText
        );
    }
  }

  /**
   * Generate video using Remotion (FREE, open source)
   * Professional videos with React-based templates
   */
  private async generateWithRemotion(
    images: string[],
    listing: MarketplaceListing,
    duration: number,
    orientation: 'horizontal' | 'vertical',
    includePrice: boolean,
    includeCTA: boolean,
    ctaText: string
  ): Promise<GeneratedVideo> {
    try {
      const { bundle } = require('@remotion/bundler');
      const { renderMedia, selectComposition } = require('@remotion/renderer');
      const path = require('path');
      const fs = require('fs');

      console.log(`   🎬 Remotion: Rendering ${duration}s ${orientation} video...`);

      // Determine composition ID based on duration and orientation
      const compositionId =
        duration === 30
          ? 'ProductShowcase30s'
          : orientation === 'vertical'
          ? 'ProductShowcaseVertical'
          : 'ProductShowcase';

      // Step 1: Bundle Remotion composition
      const remotionEntry = path.join(__dirname, 'remotion', 'index.tsx');

      if (!fs.existsSync(remotionEntry)) {
        throw new Error(`Remotion entry point not found: ${remotionEntry}`);
      }

      const bundleLocation = await bundle({
        entryPoint: remotionEntry,
        webpackOverride: (config: any) => config,
      });

      console.log(`   ✅ Bundle created: ${bundleLocation}`);

      // Step 2: Get composition details
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps: {
          productTitle: listing.productTitle,
          productImages: images,
          marketplacePrice: Number(listing.marketplacePrice),
          ctaText,
          includePrice,
        },
      });

      console.log(`   ✅ Composition selected: ${compositionId}`);

      // Step 3: Render video
      const outputPath = path.join(
        '/tmp',
        `video-${listing.listingId}-${Date.now()}.mp4`
      );

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        inputProps: {
          productTitle: listing.productTitle,
          productImages: images,
          marketplacePrice: Number(listing.marketplacePrice),
          ctaText,
          includePrice,
        },
      });

      console.log(`   ✅ Video rendered: ${outputPath}`);

      // Step 4: Upload to Cloudinary for permanent hosting
      const uploadResult = await cloudinary.uploader.upload(outputPath, {
        resource_type: 'video',
        folder: 'arbi-video-ads',
        public_id: `video-${listing.listingId}-${Date.now()}`,
      });

      console.log(`   ✅ Uploaded to Cloudinary: ${uploadResult.secure_url}`);

      // Clean up temporary file
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      return {
        videoUrl: uploadResult.secure_url,
        thumbnailUrl: uploadResult.secure_url.replace('.mp4', '.jpg'),
        duration,
        width: orientation === 'vertical' ? 1080 : 1920,
        height: orientation === 'vertical' ? 1920 : 1080,
        method: 'remotion',
      };
    } catch (error: any) {
      console.error('❌ Remotion rendering failed:', error.message);
      console.error('   Stack:', error.stack);
      throw new Error(`Remotion video generation failed: ${error.message}`);
    }
  }

  /**
   * Generate video using Cloudinary transformations (FREE)
   * Creates a simple slideshow-style video
   */
  private async generateWithCloudinary(
    images: string[],
    listing: MarketplaceListing,
    duration: number,
    includePrice: boolean,
    includeCTA: boolean,
    ctaText: string
  ): Promise<GeneratedVideo> {
    try {
      // Cloudinary doesn't natively create videos from multiple images via transformation
      // Instead, we'll create an animated slideshow using the first image with text overlay
      // For multi-image videos, we'd need to use Cloudinary's video creation API

      const firstImage = images[0];
      const publicId = this.extractPublicId(firstImage);

      if (!publicId) {
        throw new Error('Could not extract Cloudinary public ID from image URL');
      }

      // Create text overlays
      const overlays: string[] = [];

      // Product title overlay
      const titleText = this.truncateText(listing.productTitle, 40);
      overlays.push(`l_text:Arial_40_bold:${encodeURIComponent(titleText)},co_white,g_north,y_50`);

      // Price overlay (if enabled)
      if (includePrice) {
        const priceText = `$${listing.marketplacePrice.toFixed(2)}`;
        overlays.push(`l_text:Arial_60_bold:${encodeURIComponent(priceText)},co_rgb:FFD700,g_center,y_-50`);
      }

      // CTA overlay (if enabled)
      if (includeCTA) {
        overlays.push(`l_text:Arial_50_bold:${encodeURIComponent(ctaText)},co_white,g_south,y_50`);
      }

      // Note: This creates a static image with overlays, not an animated video
      // For true video generation, you'd need to:
      // 1. Use Cloudinary's video creation API with SDK
      // 2. Use Remotion (React-based, free)
      // 3. Use Shotstack API (paid)
      // 4. Use FFmpeg directly (complex but free)

      console.log('   ⚠️  Cloudinary method creates enhanced image, not video');
      console.log('   💡 For video generation, set SHOTSTACK_API_KEY or use Remotion');

      const enhancedImageUrl = cloudinary.url(publicId, {
        transformation: [
          { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' },
          ...overlays.map(overlay => ({ overlay: 'text' })) // Placeholder for overlay syntax
        ],
        fetch_format: 'auto',
        quality: 'auto',
      });

      return {
        videoUrl: enhancedImageUrl, // Actually an image, not video
        thumbnailUrl: enhancedImageUrl,
        duration: 0,
        width: 1920,
        height: 1080,
        method: 'cloudinary',
      };
    } catch (error: any) {
      console.error('❌ Cloudinary video generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate video using Shotstack API (PAID)
   * Professional video generation with templates
   */
  private async generateWithShotstack(
    images: string[],
    listing: MarketplaceListing,
    template: string,
    duration: number,
    includePrice: boolean,
    includeCTA: boolean,
    ctaText: string
  ): Promise<GeneratedVideo> {
    if (!this.shotstackApiKey) {
      throw new Error('Shotstack API key not configured');
    }

    try {
      // Calculate duration per image
      const durationPerImage = duration / images.length;

      // Build video timeline
      const clips: any[] = [];

      images.forEach((imageUrl, index) => {
        const start = index * durationPerImage;

        // Image clip
        clips.push({
          asset: {
            type: 'image',
            src: imageUrl,
          },
          start,
          length: durationPerImage,
          fit: 'cover',
          scale: 1,
          transition: {
            in: 'fade',
            out: 'fade',
          },
        });

        // Title text overlay (on first clip)
        if (index === 0) {
          clips.push({
            asset: {
              type: 'title',
              text: this.truncateText(listing.productTitle, 60),
              style: 'future',
              color: '#ffffff',
              size: 'medium',
            },
            start,
            length: durationPerImage,
            position: 'top',
          });
        }

        // Price overlay (on middle clip)
        if (includePrice && index === Math.floor(images.length / 2)) {
          clips.push({
            asset: {
              type: 'title',
              text: `$${listing.marketplacePrice.toFixed(2)}`,
              style: 'blockbuster',
              color: '#FFD700',
              size: 'large',
            },
            start,
            length: durationPerImage,
            position: 'center',
          });
        }

        // CTA overlay (on last clip)
        if (includeCTA && index === images.length - 1) {
          clips.push({
            asset: {
              type: 'title',
              text: ctaText,
              style: 'minimal',
              color: '#ffffff',
              size: 'medium',
              background: '#000000',
            },
            start,
            length: durationPerImage,
            position: 'bottom',
          });
        }
      });

      // Create Shotstack edit
      const edit = {
        timeline: {
          soundtrack: {
            src: 'https://shotstack-assets.s3.amazonaws.com/music/unminus/ambisax.mp3',
            effect: 'fadeInFadeOut',
            volume: 0.3,
          },
          background: '#000000',
          tracks: [
            {
              clips,
            },
          ],
        },
        output: {
          format: 'mp4',
          resolution: 'hd',
          aspectRatio: '16:9',
        },
      };

      // Submit to Shotstack
      const renderResponse = await axios.post(
        'https://api.shotstack.io/v1/render',
        edit,
        {
          headers: {
            'x-api-key': this.shotstackApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const renderId = renderResponse.data.response.id;
      console.log(`   🎬 Shotstack render started: ${renderId}`);

      // Poll for completion (with timeout)
      const videoUrl = await this.pollShotstackRender(renderId);

      // Upload to Cloudinary for permanent hosting
      const uploadResult = await cloudinary.uploader.upload(videoUrl, {
        resource_type: 'video',
        folder: 'arbi-video-ads',
        public_id: `video-${listing.listingId}-${Date.now()}`,
      });

      console.log(`   ✅ Video uploaded to Cloudinary: ${uploadResult.secure_url}`);

      return {
        videoUrl: uploadResult.secure_url,
        thumbnailUrl: uploadResult.secure_url.replace('.mp4', '.jpg'),
        duration,
        width: 1920,
        height: 1080,
        method: 'shotstack',
      };
    } catch (error: any) {
      console.error('❌ Shotstack video generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Poll Shotstack render status until complete
   */
  private async pollShotstackRender(
    renderId: string,
    maxAttempts: number = 60
  ): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await axios.get(
        `https://api.shotstack.io/v1/render/${renderId}`,
        {
          headers: {
            'x-api-key': this.shotstackApiKey!,
          },
        }
      );

      const status = statusResponse.data.response.status;
      console.log(`   📊 Render status: ${status}`);

      if (status === 'done') {
        return statusResponse.data.response.url;
      } else if (status === 'failed') {
        throw new Error('Shotstack render failed');
      }

      // Continue polling...
    }

    throw new Error('Shotstack render timeout (5 minutes)');
  }

  /**
   * Extract Cloudinary public ID from URL
   */
  private extractPublicId(url: string): string | null {
    const match = url.match(/\/v\d+\/(.+?)\.\w+$/);
    return match ? match[1] : null;
  }

  /**
   * Truncate text to max length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

// Export singleton instance
export const videoAdGenerator = new VideoAdGenerator();
