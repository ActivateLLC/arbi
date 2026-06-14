/**
 * TikTok Ads Campaign Automation API Routes
 *
 * Mirrors the Google Ads route. Campaigns are created PAUSED (the service sets
 * operation_status DISABLE on every entity) so nothing spends until enabled.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { tiktokMarketing } from '../services/tiktokMarketing';
import { getListings, getListing } from './marketplace';
import { isConfigured as isVideoConfigured, generateProductVideo } from '../services/google-ads/higgsfieldVideo';
import { ProductAdData } from '../services/google-ads/campaignAutomation';

const router = Router();

/**
 * POST /api/tiktok/launch-video-from-listing  Body: { listingId, model? }
 *
 * The full creative pipeline: take a listing's real product photo → generate a
 * UGC-style 9:16 video with Higgsfield → launch it as a PAUSED TikTok video ad.
 * Both Higgsfield and TikTok must be configured (we check first so we never
 * burn a video generation that can't be used).
 */
router.post('/launch-video-from-listing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!tiktokMarketing.isConfigured()) {
      throw new ApiError(503, 'TikTok not configured: set TIKTOK_ACCESS_TOKEN and TIKTOK_ADVERTISER_ID.');
    }
    if (!isVideoConfigured()) {
      throw new ApiError(503, 'Higgsfield not configured: set HF_API_KEY and HF_API_SECRET.');
    }
    const { listingId, model } = req.body || {};
    if (!listingId) throw new ApiError(400, 'listingId is required');

    const listing: any = await getListing(listingId);
    if (!listing) throw new ApiError(404, 'Listing not found');
    const imageUrl = Array.isArray(listing.productImages) ? listing.productImages[0] : undefined;
    if (!imageUrl) throw new ApiError(409, 'Listing has no product image to animate');

    const price = Number(listing.marketplacePrice) || 0;
    const profit = Number(listing.estimatedProfit) || 0;
    const product: ProductAdData = {
      productId: listing.listingId,
      productName: listing.productTitle,
      productPrice: price,
      profitMargin: price > 0 ? Math.round((profit / price) * 100) : 0,
      category: listing.supplierPlatform || 'general',
      targetCountry: 'US',
      landingPageUrl: `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/product/${listing.listingId}`,
    };

    // 1) Generate the UGC video from the real product image.
    const video = await generateProductVideo(product, imageUrl, { model });

    // 2) Launch it as a PAUSED TikTok video ad, using the brief's hook as caption.
    const tiktok = await tiktokMarketing.createVideoCampaign({
      productTitle: listing.productTitle,
      productDescription: listing.productDescription || listing.productTitle,
      productImage: imageUrl,
      landingPageUrl: product.landingPageUrl,
      marketplacePrice: price,
      videoUrl: video.videoUrl,
      adText: video.brief.hooks[0],
    });

    res.status(tiktok.success ? 201 : 502).json({
      success: tiktok.success,
      listingId,
      videoUrl: video.videoUrl,
      hook: video.brief.hooks[0],
      tiktok,
    });
  } catch (error: any) {
    next(error);
  }
});

interface TikTokProduct {
  productTitle: string;
  productDescription: string;
  productImage: string;
  landingPageUrl: string;
  marketplacePrice: number;
  dailyBudget?: number;
}

/** Map top active marketplace listings into TikTok campaign configs. */
async function getActiveProductsForTikTok(limit: number, minProfitMargin = 0, dailyBudget = 20): Promise<TikTokProduct[]> {
  const listings = await getListings('active');
  return (listings as any[])
    .map((l) => {
      const price = Number(l.marketplacePrice) || 0;
      const profit = Number(l.estimatedProfit) || 0;
      const profitMargin = price > 0 ? Math.round((profit / price) * 100) : 0;
      return {
        _margin: profitMargin,
        productTitle: l.productTitle,
        productDescription: l.productDescription || l.productTitle,
        productImage: Array.isArray(l.productImages) && l.productImages[0] ? l.productImages[0] : '',
        landingPageUrl: `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/product/${l.listingId}`,
        marketplacePrice: price,
        dailyBudget,
      };
    })
    .filter((p: any) => p._margin >= minProfitMargin && p.productImage)
    .sort((a: any, b: any) => b._margin - a._margin)
    .slice(0, limit)
    .map(({ _margin, ...p }: any) => p);
}

/** GET /api/tiktok/status — is TikTok configured? */
router.get('/status', (_req: Request, res: Response) => {
  res.json({ configured: tiktokMarketing.isConfigured() });
});

/** POST /api/tiktok/create-campaign — create one PAUSED TikTok campaign. */
router.post('/create-campaign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product } = req.body;
    if (!product || !product.productTitle || !product.landingPageUrl || !product.productImage) {
      throw new ApiError(400, 'product with productTitle, landingPageUrl and productImage is required');
    }
    const result = await tiktokMarketing.createCampaign(product);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/tiktok/quick-start
 * Create PAUSED TikTok campaigns for the top high-margin active listings.
 * Body: { limit?, minProfitMargin?, dailyBudget? }
 */
router.post('/quick-start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 5, minProfitMargin = 30, dailyBudget = 20 } = req.body || {};
    const products = await getActiveProductsForTikTok(limit, minProfitMargin, dailyBudget);

    if (products.length === 0) {
      return res.status(200).json({
        success: false,
        message: `No active listings with a real image and ${minProfitMargin}%+ margin found.`,
      });
    }

    const campaigns = [];
    for (const p of products) {
      const r = await tiktokMarketing.createCampaign(p);
      campaigns.push({ product: p.productTitle, ...r });
    }
    const created = campaigns.filter((c) => c.success).length;

    res.status(201).json({
      success: true,
      message: `Created ${created} PAUSED TikTok campaign(s)`,
      campaigns,
      nextSteps: [
        'Review campaigns in TikTok Ads Manager',
        'Enable a campaign (POST /api/tiktok/campaign/:id/enable) when ready to spend',
      ],
    });
  } catch (error: any) {
    next(error);
  }
});

/** GET /api/tiktok/campaign/:id/metrics */
router.get('/campaign/:id/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metrics = await tiktokMarketing.getCampaignMetrics(req.params.id);
    res.json({ success: true, campaignId: req.params.id, metrics });
  } catch (error: any) {
    next(error);
  }
});

/** POST /api/tiktok/campaign/:id/enable — start spending on a campaign. */
router.post('/campaign/:id/enable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await tiktokMarketing.enableCampaign(req.params.id);
    res.json({ success: ok, campaignId: req.params.id, status: ok ? 'ENABLED' : 'FAILED' });
  } catch (error: any) {
    next(error);
  }
});

/** POST /api/tiktok/campaign/:id/pause */
router.post('/campaign/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ok = await tiktokMarketing.pauseCampaign(req.params.id);
    res.json({ success: ok, campaignId: req.params.id, status: ok ? 'PAUSED' : 'FAILED' });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/tiktok/quick-start-now?confirm=yes
 * Mobile-tappable trigger for quick-start (creates PAUSED TikTok campaigns).
 */
router.get('/quick-start-now', async (req: Request, res: Response, next: NextFunction) => {
  if (req.query.confirm !== 'yes') {
    return res.status(400).json({ success: false, error: 'Add ?confirm=yes to create campaigns (they are created PAUSED).' });
  }
  try {
    const products = await getActiveProductsForTikTok(5, 30, 20);
    if (products.length === 0) {
      return res.status(200).json({ success: false, message: 'No active listings with a real image and 30%+ margin found.' });
    }
    const campaigns = [];
    for (const p of products) {
      const r = await tiktokMarketing.createCampaign(p);
      campaigns.push({ product: p.productTitle, ...r });
    }
    const created = campaigns.filter((c) => c.success).length;
    res.status(201).json({ success: true, message: `Created ${created} PAUSED TikTok campaign(s)`, campaigns });
  } catch (error: any) {
    next(error);
  }
});

export default router;
