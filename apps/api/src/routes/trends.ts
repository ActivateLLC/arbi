import { Router, Request, Response } from 'express';
import { TrendDetectionPipeline, KalodataScout, VideoDownloader } from '@arbi/arbitrage-engine';

const router = Router();

/**
 * GET /api/trends
 * Get trending arbitrage opportunities from Kalodata
 *
 * Query params:
 * - minMargin: Minimum profit margin % (default: 25)
 * - minTrendScore: Minimum trend score 0-100 (default: 70)
 * - downloadVideos: Download UGC videos (default: false)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('📊 [API] /api/trends - Detecting trending opportunities');

    const minMargin = parseInt(req.query.minMargin as string) || 25;
    const minTrendScore = parseInt(req.query.minTrendScore as string) || 70;
    const downloadVideos = req.query.downloadVideos === 'true';

    // Create pipeline
    const pipeline = new TrendDetectionPipeline({
      minMargin,
      minTrendScore,
      enableVideoDownload: downloadVideos,
      autoList: false, // Never auto-list from API
    });

    // Execute pipeline
    const opportunities = await pipeline.execute();

    // Generate report
    const report = pipeline.generateReport(opportunities);
    console.log(report);

    res.json({
      success: true,
      count: opportunities.length,
      opportunities: opportunities.map(opp => ({
        product: {
          id: opp.product.id,
          title: opp.product.title,
          price: opp.product.price,
          buyPrice: opp.product.buyPrice,
          margin: opp.product.margin,
          marginPercent: opp.product.marginPercent,
          images: opp.product.images,
          url: opp.product.url,
          platform: opp.product.platform,
          marketplace: opp.product.marketplace,
          category: opp.product.category,
        },
        trendScore: opp.trendScore,
        confidence: opp.confidence,
        estimatedProfit: opp.estimatedProfit,
        reasons: opp.reasons,
        videoCount: opp.videoUrls.length,
        videoUrls: downloadVideos ? opp.videoUrls : [],
      })),
      filters: {
        minMargin,
        minTrendScore,
        downloadVideos,
      },
      report: report.split('\n'),
    });
  } catch (error: any) {
    console.error('❌ [API] /api/trends failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/trends/videos/:productId
 * Get UGC videos for a specific product
 */
router.get('/videos/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const downloadVideos = req.query.download === 'true';

    console.log(`🎥 [API] /api/trends/videos/${productId} - Getting videos`);

    const scout = new KalodataScout();

    // Get product URL (you'll need to implement getProductUrl)
    // For now, construct hypothetical URL
    const productUrl = `https://www.kalodata.com/product/${productId}`;

    // Get videos
    const videos = await scout.getProductVideos(productUrl);

    // Download if requested
    let downloadedUrls: string[] = [];
    if (downloadVideos && videos.length > 0) {
      const downloader = new VideoDownloader();

      const videoData = videos.slice(0, 5).map(v => ({
        url: v.url,
        metadata: {
          productId,
          source: 'kalodata',
          creatorName: v.creatorName,
          viewCount: v.viewCount,
          tags: ['ugc', 'tiktok'],
        },
      }));

      const results = await downloader.downloadMultipleVideos(videoData, 2);
      downloadedUrls = results.map(r => typeof r === 'string' ? r : r.url);
    }

    res.json({
      success: true,
      productId,
      count: videos.length,
      videos: videos.map(v => ({
        url: v.url,
        thumbnailUrl: v.thumbnailUrl,
        creatorName: v.creatorName,
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        commentCount: v.commentCount,
        duration: v.duration,
      })),
      downloadedUrls: downloadVideos ? downloadedUrls : undefined,
    });
  } catch (error: any) {
    console.error('❌ [API] /api/trends/videos failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/trends/schedule
 * Schedule automatic trend detection
 *
 * Body:
 * - intervalHours: How often to run (default: 6)
 * - minMargin: Minimum profit margin %
 * - minTrendScore: Minimum trend score
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { intervalHours = 6, minMargin = 25, minTrendScore = 70 } = req.body;

    console.log(`⏰ [API] /api/trends/schedule - Scheduling every ${intervalHours} hours`);

    const pipeline = new TrendDetectionPipeline({
      minMargin,
      minTrendScore,
      enableVideoDownload: true,
      autoList: false,
    });

    // Schedule execution
    const timer = pipeline.scheduleExecution(intervalHours);

    // Store timer ID in global scope (for stopping later)
    // @ts-ignore
    global.trendDetectionTimer = timer;

    res.json({
      success: true,
      message: `Trend detection scheduled every ${intervalHours} hours`,
      config: {
        intervalHours,
        minMargin,
        minTrendScore,
      },
    });
  } catch (error: any) {
    console.error('❌ [API] /api/trends/schedule failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/trends/schedule
 * Stop scheduled trend detection
 */
router.delete('/schedule', (req: Request, res: Response) => {
  try {
    // @ts-ignore
    if (global.trendDetectionTimer) {
      // @ts-ignore
      clearInterval(global.trendDetectionTimer);
      // @ts-ignore
      global.trendDetectionTimer = null;

      console.log('🛑 [API] Trend detection schedule stopped');

      res.json({
        success: true,
        message: 'Trend detection schedule stopped',
      });
    } else {
      res.json({
        success: false,
        message: 'No active schedule found',
      });
    }
  } catch (error: any) {
    console.error('❌ [API] /api/trends/schedule DELETE failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
