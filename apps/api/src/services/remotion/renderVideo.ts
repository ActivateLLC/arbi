/**
 * Remotion Video Rendering Service
 * Renders videos using Remotion programmatically
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { MarketplaceListing } from '../routes/marketplace';

export interface RemotionRenderOptions {
  duration?: number; // 15 or 30 seconds
  orientation?: 'horizontal' | 'vertical';
  includePrice?: boolean;
  includeCTA?: boolean;
  ctaText?: string;
}

/**
 * Render product video using Remotion
 * This is a FREE, open-source solution with full control
 */
export async function renderProductVideoWithRemotion(
  listing: MarketplaceListing,
  options: RemotionRenderOptions = {}
): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number }> {
  const {
    duration = 15,
    orientation = 'horizontal',
    includePrice = true,
    includeCTA = true,
    ctaText = 'Shop Now',
  } = options;

  console.log(`🎬 Remotion: Rendering ${duration}s ${orientation} video...`);
  console.log(`   Product: ${listing.productTitle}`);

  try {
    // Step 1: Bundle Remotion composition
    const compositionId =
      duration === 30
        ? 'ProductShowcase30s'
        : orientation === 'vertical'
        ? 'ProductShowcaseVertical'
        : 'ProductShowcase';

    const bundleLocation = await bundle({
      entryPoint: path.join(__dirname, 'remotion', 'index.tsx'),
      // Set to true only during development for helpful logs
      webpackOverride: (config) => config,
    });

    console.log(`   ✅ Bundle created: ${bundleLocation}`);

    // Step 2: Get composition details
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: {
        productTitle: listing.productTitle,
        productImages: listing.productImages.filter((img) =>
          img.includes('cloudinary.com')
        ),
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
        productImages: listing.productImages.filter((img) =>
          img.includes('cloudinary.com')
        ),
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

    return {
      videoUrl: uploadResult.secure_url,
      thumbnailUrl: uploadResult.secure_url.replace('.mp4', '.jpg'),
      duration,
    };
  } catch (error: any) {
    console.error('❌ Remotion rendering failed:', error.message);
    throw new Error(`Remotion video generation failed: ${error.message}`);
  }
}
