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
 * Scrape and analyze ads from Facebook Ad Library (FULLY AUTOMATED)
 */
router.post('/facebook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, limit = 5, autoAnalyze = true } = req.body;

    if (!query) {
      throw new ApiError(400, 'Search query is required');
    }

    console.log(`🚀 AUTOMATED: Scraping Facebook Ad Library for: "${query}"`);

    const { scrapeAndPrepareAds } = await import('../services/scraping/facebookAdLibraryScraper');

    // Step 1: Scrape, download, and upload ads automatically
    const { ads, videoUrls } = await scrapeAndPrepareAds({
      query,
      limit,
      adType: 'video',
    });

    console.log(`✅ Scraped ${videoUrls.length} video ads`);

    // Step 2: Automatically analyze if requested
    let analysis = null;
    if (autoAnalyze && videoUrls.length > 0) {
      console.log(`🤖 Auto-analyzing ${videoUrls.length} ads...`);

      const result = await analyzeBatch(videoUrls, {
        productCategory: query,
        platform: 'facebook',
      });

      analysis = result;
    }

    res.status(200).json({
      success: true,
      query,
      totalScraped: ads.length,
      ads: ads.map(ad => ({
        advertiser: ad.advertiser,
        adText: ad.adText,
        platforms: ad.platform,
        videoUrl: ad.cloudinaryUrl,
      })),
      videoUrls,
      analysis: autoAnalyze ? analysis : null,
      message: `✅ Automatically scraped and ${autoAnalyze ? 'analyzed' : 'prepared'} ${ads.length} video ads`,
      nextSteps: autoAnalyze
        ? [
            'Review the common patterns below',
            'Use the replication guide to create winning ads',
            'Generate videos with: POST /api/generate-video/:listingId/clone',
          ]
        : [
            'Analyze the videos with: POST /api/analyze-ads/batch',
            'Or use videoUrls for manual review',
          ],
    });
  } catch (error: any) {
    console.error('❌ Facebook scraping failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/analyze-ads/from-url
 * Extract and analyze a video from a specific Facebook Ad Library URL
 * FASTER: User provides the direct ad link
 */
router.post('/from-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { adUrl } = req.body;

    if (!adUrl) {
      throw new ApiError(400, 'adUrl is required');
    }

    if (!adUrl.includes('facebook.com/ads/library')) {
      throw new ApiError(400, 'Must be a Facebook Ad Library URL');
    }

    console.log(`🎯 Extracting specific ad from: ${adUrl}`);

    const { extractVideoFromAdPage, downloadVideo } = await import(
      '../services/scraping/extractSpecificAd'
    );
    const { v2: cloudinary } = await import('cloudinary');

    // Step 1: Extract video URL from ad page
    const adData = await extractVideoFromAdPage(adUrl);

    // Step 2: Download video
    const videoPath = await downloadVideo(adData.videoUrl);

    // Step 3: Upload to Cloudinary
    console.log('   ☁️  Uploading to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(videoPath, {
      resource_type: 'video',
      folder: 'arbi-scraped-ads',
      public_id: `fb-ad-manual-${Date.now()}`,
      tags: ['facebook', 'manual', adData.advertiser.toLowerCase().replace(/\s+/g, '-')],
    });

    const cloudinaryUrl = uploadResult.secure_url;
    console.log(`   ✅ Uploaded: ${cloudinaryUrl}`);

    // Clean up
    if (require('fs').existsSync(videoPath)) {
      require('fs').unlinkSync(videoPath);
    }

    // Step 4: Analyze with Claude Vision
    console.log('   🤖 Analyzing with Claude Vision...');
    const analysis = await analyzeVideoAd(cloudinaryUrl, {
      productCategory: 'user-provided',
      platform: 'facebook',
    });

    res.status(200).json({
      success: true,
      ad: {
        advertiser: adData.advertiser,
        adText: adData.adText,
        originalUrl: adUrl,
        videoUrl: cloudinaryUrl,
      },
      analysis,
      message: '✅ Ad extracted and analyzed successfully!',
      replicationGuide: analysis.replicationGuide,
      nextSteps: [
        'Review the analysis above',
        'Use replicationGuide to create similar ads',
        'Key elements: ' + analysis.replicationGuide.keyElements.join(', '),
      ],
    });
  } catch (error: any) {
    console.error('❌ URL extraction failed:', error.message);
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
