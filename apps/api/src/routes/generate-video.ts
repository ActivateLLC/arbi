/**
 * Video Ad Generation Routes
 * Generate product videos for Google Ads campaigns
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { videoAdGenerator } from '../services/videoAdGenerator';
import { getListing } from './marketplace';
// import { requireApiKey } from '../middleware/apiAuth'; // Optional: Uncomment to require API key authentication

const router = Router();

/**
 * POST /api/generate-video/:listingId
 * Generate a product video for a marketplace listing
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
  const hasShotstack = !!process.env.SHOTSTACK_API_KEY;
  const hasCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    status: 'ok',
    videoGeneration: {
      available: hasCloudinary,
      method: hasShotstack ? 'shotstack' : hasCloudinary ? 'cloudinary' : 'none',
      features: {
        shotstack: {
          enabled: hasShotstack,
          description: 'Professional video generation with templates',
          cost: '$49/month',
        },
        cloudinary: {
          enabled: hasCloudinary,
          description: 'Basic image enhancements (video requires additional setup)',
          cost: 'Free tier available',
        },
        remotion: {
          enabled: false,
          description: 'React-based video generation (requires implementation)',
          cost: 'Free (open source)',
        },
      },
    },
    recommendation: hasShotstack
      ? 'Using Shotstack API for professional videos'
      : hasCloudinary
      ? 'Cloudinary available - consider adding Shotstack or Remotion for videos'
      : 'Configure CLOUDINARY_* env vars to enable video generation',
  });
});

export default router;
