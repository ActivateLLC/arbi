/**
 * Video Ad Generation Routes
 * Generate product videos for Google Ads campaigns
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { videoAdGenerator } from '../services/videoAdGenerator';
import { getListing } from './marketplace';
import { generateVideoHooks, generateHookVariations } from '../services/ai/hookGenerator';
// import { requireApiKey } from '../middleware/apiAuth'; // Optional: Uncomment to require API key authentication

const router = Router();

/**
 * POST /api/generate-video/:listingId/modern
 * Generate a MODERN UGC-style video with AI-generated hooks
 * This uses 2026 best practices for high-converting video ads
 */
router.post('/:listingId/modern', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    const {
      format = 'deal-discovery', // deal-discovery, problem-solution, gift-idea, day-in-life
      orientation = 'horizontal', // horizontal or vertical
      duration = 15,
      generateVariations = false, // Generate 3 variations for A/B testing
    } = req.body;

    console.log(`🎬 MODERN video generation for listing: ${listingId}`);
    console.log(`   Format: ${format}`);
    console.log(`   Orientation: ${orientation}`);

    // Get listing
    const listing = await getListing(listingId);
    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    // Calculate original price for savings calculation
    const supplierPrice = parseFloat(listing.supplierPrice);
    const marketplacePrice = parseFloat(listing.marketplacePrice);

    // Generate AI hooks
    console.log('🤖 Generating AI-powered hooks...');

    let hooksData;
    if (generateVariations) {
      const variations = await generateHookVariations({
        productTitle: listing.productTitle,
        price: marketplacePrice,
        originalPrice: supplierPrice * 1.5, // Estimate retail price
        format: format as any,
      }, 3);
      hooksData = variations[0]; // Use first variation for now
    } else {
      hooksData = await generateVideoHooks({
        productTitle: listing.productTitle,
        price: marketplacePrice,
        originalPrice: supplierPrice * 1.5,
        format: format as any,
      });
    }

    console.log(`   ✅ Hook: "${hooksData.primaryHook}"`);
    console.log(`   ✅ Benefits: ${hooksData.benefits.length}`);

    // Use the new modern video generator
    const video = await videoAdGenerator.generateModernProductVideo(listing, {
      format: format as any,
      hook: hooksData.primaryHook,
      benefits: hooksData.benefits,
      originalPrice: supplierPrice * 1.5,
      orientation: orientation as any,
      duration,
    });

    console.log(`✅ Modern video generated: ${video.videoUrl}`);

    res.status(200).json({
      success: true,
      listingId,
      productTitle: listing.productTitle,
      format,
      hooks: hooksData,
      video: {
        url: video.videoUrl,
        thumbnail: video.thumbnailUrl,
        duration: video.duration,
        width: video.width,
        height: video.height,
        style: 'modern-ugc',
      },
      message: '🔥 Modern UGC-style video generated successfully!',
      tips: [
        'This video follows 2026 best practices',
        'UGC-style content performs 80% better than traditional ads',
        'The hook is designed to stop scrolling in 0.5 seconds',
        'Captions are included for sound-off viewing',
      ],
    });
  } catch (error: any) {
    console.error('❌ Modern video generation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/generate-video/:listingId
 * Generate a product video for a marketplace listing (CLASSIC template)
 * NOTE: Add requireApiKey middleware when ready to enable authentication
 */
router.post('/:listingId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;
    const {
      duration = 15,
      template = 'product-showcase',
      includePrice = true,
      includeCTA = true,
      ctaText = 'Shop Now'
    } = req.body;

    console.log(`🎬 Video generation request for listing: ${listingId}`);

    // Get listing
    const listing = await getListing(listingId);
    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    console.log(`   Product: ${listing.productTitle}`);
    console.log(`   Images: ${listing.productImages.length}`);

    // Generate video
    const video = await videoAdGenerator.generateProductVideo(listing, {
      duration,
      template,
      includePrice,
      includeCTA,
      ctaText,
    });

    console.log(`✅ Video generated successfully: ${video.videoUrl}`);

    res.status(200).json({
      success: true,
      listingId,
      productTitle: listing.productTitle,
      video: {
        url: video.videoUrl,
        thumbnail: video.thumbnailUrl,
        duration: video.duration,
        width: video.width,
        height: video.height,
      },
      message: 'Product video generated successfully',
      usage: 'Add this video URL to your Google Ads Performance Max campaign assets',
    });
  } catch (error: any) {
    console.error('❌ Video generation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/generate-video/batch
 * Generate videos for multiple listings
 * NOTE: Add requireApiKey middleware when ready to enable authentication
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      listingIds,
      duration = 15,
      template = 'product-showcase',
    } = req.body;

    if (!listingIds || !Array.isArray(listingIds)) {
      throw new ApiError(400, 'listingIds array is required');
    }

    console.log(`🎬 Batch video generation for ${listingIds.length} listings...`);

    const results = [];

    for (const listingId of listingIds) {
      try {
        const listing = await getListing(listingId);
        if (!listing) {
          results.push({
            listingId,
            success: false,
            error: 'Listing not found',
          });
          continue;
        }

        const video = await videoAdGenerator.generateProductVideo(listing, {
          duration,
          template,
        });

        results.push({
          listingId,
          productTitle: listing.productTitle,
          success: true,
          video: {
            url: video.videoUrl,
            thumbnail: video.thumbnailUrl,
          },
        });

        console.log(`   ✅ ${listing.productTitle}: ${video.videoUrl}`);
      } catch (error: any) {
        results.push({
          listingId,
          success: false,
          error: error.message,
        });
        console.error(`   ❌ ${listingId}: ${error.message}`);
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.status(200).json({
      success: true,
      total: listingIds.length,
      successful: successCount,
      failed: listingIds.length - successCount,
      results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/generate-video/status
 * Check video generation service status
 */
router.get('/status', async (req: Request, res: Response) => {
  // Check Remotion availability
  let hasRemotion = false;
  try {
    require('remotion');
    require('@remotion/bundler');
    require('@remotion/renderer');
    hasRemotion = true;
  } catch (error) {
    hasRemotion = false;
  }

  const hasShotstack = !!process.env.SHOTSTACK_API_KEY;
  const hasCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  // Determine active method (same priority as VideoAdGenerator)
  const activeMethod = hasRemotion ? 'remotion' : hasShotstack ? 'shotstack' : hasCloudinary ? 'cloudinary' : 'none';

  res.status(200).json({
    status: 'ok',
    videoGeneration: {
      available: hasRemotion || hasShotstack || hasCloudinary,
      activeMethod,
      features: {
        remotion: {
          enabled: hasRemotion,
          description: 'FREE open-source video generation with React',
          cost: '$0 (unlimited videos)',
          priority: 1,
          installation: hasRemotion ? 'Installed ✅' : 'Run: cd apps/api && pnpm install',
        },
        shotstack: {
          enabled: hasShotstack,
          description: 'Professional video generation with templates',
          cost: '$49/month',
          priority: 2,
        },
        cloudinary: {
          enabled: hasCloudinary,
          description: 'Basic image enhancements (not true video)',
          cost: 'Free tier available',
          priority: 3,
        },
      },
    },
    recommendation: hasRemotion
      ? '✅ Using Remotion (FREE) - unlimited professional videos!'
      : hasShotstack
      ? 'Using Shotstack ($49/month) - install Remotion for FREE unlimited videos'
      : hasCloudinary
      ? 'Install Remotion for FREE video generation: cd apps/api && pnpm install'
      : 'Configure CLOUDINARY_* env vars and install Remotion',
    nextSteps: hasRemotion
      ? [
          'Preview template: npx remotion preview src/services/remotion/index.tsx',
          'Generate video: POST /api/generate-video/:listingId',
        ]
      : [
          'Install Remotion: cd apps/api && pnpm install',
          'Preview template: npx remotion preview src/services/remotion/index.tsx',
        ],
  });
});

export default router;
