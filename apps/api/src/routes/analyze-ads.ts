/**
 * Ad Analysis Routes
 * Analyze successful video ads and extract replication blueprints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { analyzeVideoAd, analyzeBatch } from '../services/ai/adAnalyzer';

const router = Router();

/**
 * POST /api/analyze-ads/single
 * Analyze a single video ad
 */
router.post('/single', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoUrl, context } = req.body;

    if (!videoUrl) {
      throw new ApiError(400, 'videoUrl is required');
    }

    console.log(`🔍 Analyzing ad: ${videoUrl}`);

    const analysis = await analyzeVideoAd(videoUrl, context);

    res.status(200).json({
      success: true,
      analysis,
      message: 'Ad analyzed successfully',
      nextSteps: [
        'Use the replicationGuide to create a similar template',
        'Generate a video with: POST /api/generate-video/:listingId/clone',
      ],
    });
  } catch (error: any) {
    console.error('❌ Ad analysis failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/analyze-ads/batch
 * Analyze multiple ads and extract common patterns
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoUrls, context } = req.body;

    if (!videoUrls || !Array.isArray(videoUrls)) {
      throw new ApiError(400, 'videoUrls array is required');
    }

    if (videoUrls.length > 10) {
      throw new ApiError(400, 'Maximum 10 videos per batch');
    }

    console.log(`🔍 Analyzing ${videoUrls.length} ads in batch...`);

    const result = await analyzeBatch(videoUrls, context);

    res.status(200).json({
      success: true,
      totalAnalyzed: result.individualAnalyses.length,
      analyses: result.individualAnalyses,
      commonPatterns: result.commonPatterns,
      message: 'Batch analysis complete',
      recommendations: [
        `Average hook timing: ${result.commonPatterns.averageHookTiming}`,
        `Common pacing: ${result.commonPatterns.averagePacing}`,
        `Key success factors: ${result.commonPatterns.keySuccessFactors.join(', ')}`,
      ],
    });
  } catch (error: any) {
    console.error('❌ Batch analysis failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/analyze-ads/facebook
 * Scrape and analyze ads from Facebook Ad Library
 */
router.post('/facebook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      throw new ApiError(400, 'Search query is required');
    }

    console.log(`🔍 Searching Facebook Ad Library for: "${query}"`);

    // Note: This is a placeholder - Facebook Ad Library scraping requires
    // browser automation (Playwright/Puppeteer) or their official API
    res.status(200).json({
      success: false,
      message: 'Facebook Ad Library integration coming soon',
      workaround: {
        instructions: [
          '1. Visit https://www.facebook.com/ads/library/',
          `2. Search for: "${query}"`,
          '3. Find high-performing ads (look for recent ads from big brands)',
          '4. Download the video file',
          '5. Upload to Cloudinary or provide URL',
          '6. Use POST /api/analyze-ads/single with the video URL',
        ],
        example: {
          videoUrl: 'https://video-url-here.mp4',
          context: {
            productCategory: query,
            platform: 'facebook',
          },
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Facebook scraping failed:', error.message);
    next(error);
  }
});

/**
 * GET /api/analyze-ads/sources
 * Get recommended sources for finding high-performing ads
 */
router.get('/sources', async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    adLibraries: [
      {
        name: 'Facebook Ad Library',
        url: 'https://www.facebook.com/ads/library/',
        description: '100% public, searchable database of all active Facebook/Instagram ads',
        best_for: 'E-commerce, general products',
        free: true,
      },
      {
        name: 'TikTok Creative Center',
        url: 'https://ads.tiktok.com/business/creativecenter/',
        description: 'Top performing ads with metrics (CTR, conversion rate)',
        best_for: 'Viral content, short-form video',
        free: true,
      },
      {
        name: 'Google Ads Transparency Center',
        url: 'https://adstransparency.google.com/',
        description: 'Search Google/YouTube ads by advertiser',
        best_for: 'YouTube ads, search ads',
        free: true,
      },
    ],
    paidTools: [
      {
        name: 'Foreplay',
        url: 'https://foreplay.co/',
        description: 'Curated ad library with engagement metrics',
        price: '$49/month',
      },
      {
        name: 'MagicBrief',
        url: 'https://www.magicbrief.com/',
        description: 'Ad library + storyboarding tool',
        price: '$39/month',
      },
      {
        name: 'AdSpy',
        url: 'https://adspy.com/',
        description: 'Facebook/Instagram ad tracker with filtering',
        price: '$149/month',
      },
    ],
    recommendedWorkflow: [
      '1. Search Facebook Ad Library for your product category',
      '2. Look for ads from big brands (Apple, Samsung, Amazon)',
      '3. Download 3-5 video ads that look professional',
      '4. Analyze them with: POST /api/analyze-ads/batch',
      '5. Use the common patterns to generate videos for your products',
    ],
  });
});

export default router;
