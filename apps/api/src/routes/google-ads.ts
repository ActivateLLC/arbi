/**
 * Google Ads Campaign Automation API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { ApiError } from '../middleware/errorHandler';
import {
  createAutomatedCampaign,
  createBulkCampaigns,
  createVideoCampaign,
  getCampaignMetrics,
  setCampaignStatus,
  listCampaigns,
  demandRank,
  DEFAULT_DAILY_BUDGET,
  ProductAdData,
  CampaignConfig,
} from '../services/google-ads/campaignAutomation';
import { getListings, getListing } from './marketplace';
import { buildCreativeBrief, buildHooks } from '../services/google-ads/adCreative';
import { isConfigured as isVideoConfigured, generateProductVideo } from '../services/google-ads/higgsfieldVideo';
import { uploadVideoToYouTube } from '../services/google-ads/youtubeUpload';
import { scoreVariations } from '../services/ai/viralityScorer';
import { cjClient, isCJConfigured } from '../services/cjDropshipping';
import { extractReviews } from '../services/cjSourcing';
import { ensureConversionAction, conversionSendTo } from '../services/google-ads/googleAdsConversions';
import { runOptimizationPass } from '../services/google-ads/campaignOptimizer';
import { syncAdsToStock } from '../services/google-ads/stockSync';

const router = Router();

/** Map a marketplace listing to the ProductAdData shape. */
function listingToProduct(l: any): ProductAdData {
  const price = Number(l.marketplacePrice) || 0;
  const profit = Number(l.estimatedProfit) || 0;
  return {
    productId: l.listingId,
    productName: l.productTitle,
    productPrice: price,
    profitMargin: price > 0 ? Math.round((profit / price) * 100) : 0,
    category: l.supplierPlatform || 'general',
    targetCountry: 'US',
    imageUrl: Array.isArray(l.productImages) ? l.productImages[0] : undefined,
    landingPageUrl: `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/product/${l.listingId}`,
  };
}

/**
 * Fetch active marketplace listings (via getListings, which handles the DB +
 * in-memory fallback) and map them into the ProductAdData shape the campaign
 * automation expects. Optionally filter by a minimum profit margin (%).
 */
export async function getActiveProductsForAds(limit: number, minProfitMargin = 0): Promise<ProductAdData[]> {
  const listings = await getListings('active');

  return (listings as any[])
    .map((l) => {
      const price = Number(l.marketplacePrice) || 0;
      const profit = Number(l.estimatedProfit) || 0;
      const profitMargin = price > 0 ? Math.round((profit / price) * 100) : 0;
      const demandScore = Number(l.demandScore) || 0;
      return {
        product: {
          productId: l.listingId,
          productName: l.productTitle,
          productPrice: price,
          profitMargin,
          category: l.supplierPlatform || 'general',
          targetCountry: 'US',
          imageUrl: Array.isArray(l.productImages) ? l.productImages[0] : undefined,
          landingPageUrl: `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/product/${l.listingId}`,
          videoUrl: undefined,
        } as ProductAdData,
        demandScore,
        profit,
      };
    })
    .filter((x) => x.product.profitMargin >= minProfitMargin)
    // Demand-first: promote the most proven (highest-demand) products, breaking
    // ties by estimated profit — so we spend on what's most likely to sell now.
    .sort((a, b) => demandRank(b.demandScore, b.profit) - demandRank(a.demandScore, a.profit))
    .slice(0, limit)
    .map((x) => x.product);
}

/**
 * POST /api/google-ads/create-campaign
 * Create a single Google Ads campaign
 */
router.post('/create-campaign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product, config } = req.body;

    if (!product || !product.productName || !product.landingPageUrl) {
      throw new ApiError(400, 'Product data with productName and landingPageUrl is required');
    }

    if (!config || !config.dailyBudget) {
      throw new ApiError(400, 'Campaign config with dailyBudget is required');
    }

    const result = await createAutomatedCampaign(product, config);

    res.status(201).json({
      success: true,
      message: `Campaign created for ${product.productName}`,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Campaign creation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads/create-bulk-campaigns
 * Create campaigns for multiple products
 */
router.post('/create-bulk-campaigns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { products, config } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new ApiError(400, 'products array is required');
    }

    if (!config || !config.dailyBudget) {
      throw new ApiError(400, 'Campaign config with dailyBudget is required');
    }

    const result = await createBulkCampaigns(products, config);

    res.status(201).json({
      success: true,
      message: `Created ${result.success} campaigns, ${result.failed} failed`,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Bulk campaign creation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads/auto-campaign-from-marketplace
 * Automatically create campaigns for top Arbi marketplace products
 */
router.post('/auto-campaign-from-marketplace', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 10, minProfitMargin = 20, dailyBudgetPerProduct = 50 } = req.body;

    console.log(`🎯 Fetching top ${limit} products with ${minProfitMargin}% minimum profit margin...`);

    // Get top profitable active listings from the marketplace data store
    const productAdData = await getActiveProductsForAds(limit, minProfitMargin);

    if (productAdData.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No products found with minimum ${minProfitMargin}% profit margin`,
        campaigns: [],
      });
    }

    console.log(`✅ Found ${productAdData.length} products. Creating campaigns...`);

    // Create campaigns
    const config: CampaignConfig = {
      dailyBudget: dailyBudgetPerProduct,
      targetROAS: 3.0, // Target $3 revenue per $1 spent
      geoTargeting: ['US', 'CA', 'GB'],
      maxCPC: 2.0, // Max $2 per click
    };

    const result = await createBulkCampaigns(productAdData, config);

    res.status(201).json({
      success: true,
      message: `Created ${result.success} campaigns for top marketplace products`,
      totalProducts: productAdData.length,
      ...result,
      totalBudget: productAdData.length * dailyBudgetPerProduct,
      estimatedMonthlySpend: productAdData.length * dailyBudgetPerProduct * 30,
    });
  } catch (error: any) {
    console.error('❌ Auto-campaign creation failed:', error.message);
    next(error);
  }
});

/**
 * GET /api/google-ads/campaign/:campaignId/metrics
 * Get performance metrics for a campaign
 */
router.get('/campaign/:campaignId/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      throw new ApiError(400, 'campaignId is required');
    }

    const metrics = await getCampaignMetrics(campaignId);

    res.status(200).json({
      success: true,
      campaignId,
      metrics,
    });
  } catch (error: any) {
    console.error('❌ Failed to get metrics:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads/quick-start
 * One-click setup: Create campaigns for all high-profit products
 */
router.post('/quick-start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🚀 Google Ads Quick Start - Automated Campaign Creation');

    // Step 1: Get top 5 highest-margin active listings (30%+ margin)
    const products = await getActiveProductsForAds(5, 30);

    if (products.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No products with 30%+ profit margin found. Add products first.',
      });
    }

    console.log(`✅ Found ${products.length} high-margin products`);

    // Step 2: Create campaigns with conservative budget
    const config: CampaignConfig = {
      dailyBudget: DEFAULT_DAILY_BUDGET, // low test budget — spread across many products
      targetROAS: 4.0, // Target $4 revenue per $1 spent (aggressive)
      geoTargeting: ['US'],
      maxCPC: 1.5,
    };

    const result = await createBulkCampaigns(products, config);

    res.status(201).json({
      success: true,
      message: `🎉 Quick Start Complete! Created ${result.success} campaigns`,
      campaigns: result.results,
      budget: {
        dailyBudget: products.length * 20,
        estimatedMonthlySpend: products.length * 20 * 30,
        projectedMonthlyRevenue: products.length * 20 * 30 * 4, // 4x ROAS target
      },
      nextSteps: [
        'Review campaigns in Google Ads dashboard',
        'Enable campaigns when ready to start spending',
        'Monitor performance and adjust budgets',
        'Extract winning ad videos to improve performance',
      ],
    });
  } catch (error: any) {
    console.error('❌ Quick start failed:', error.message);
    next(error);
  }
});

/**
 * GET /api/google-ads/quick-start-now?confirm=yes
 * Mobile-tappable trigger for quick-start (creates PAUSED campaigns).
 */
router.get('/quick-start-now', async (req: Request, res: Response, next: NextFunction) => {
  if (req.query.confirm !== 'yes') {
    return res.status(400).json({ success: false, error: 'Add ?confirm=yes to create campaigns (they are created PAUSED).' });
  }
  try {
    // ?count=1 keeps the request fast (each campaign is several sequential
    // Google API calls; 5 can exceed a mobile browser's timeout).
    const count = Math.min(Math.max(Number(req.query.count) || 5, 1), 5);
    const products = await getActiveProductsForAds(count, 30);
    if (products.length === 0) {
      return res.status(200).json({ success: false, message: 'No products with 30%+ profit margin found.' });
    }
    const config: CampaignConfig = { dailyBudget: DEFAULT_DAILY_BUDGET, targetROAS: 4.0, geoTargeting: ['US'], maxCPC: 1.5 };
    const result = await createBulkCampaigns(products, config);
    res.status(201).json({ success: true, message: `Created ${result.success} PAUSED campaign(s)`, ...result });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/google-ads/creative-briefs?count=N
 * Preview the UGC-style creative (hooks, 5-beat captioned video script, social
 * copy) we'd generate for the top active products. This is the "brain" that
 * feeds video generation (Higgsfield/Reap), TikTok, and Demand Gen/PMax copy.
 */
router.get('/creative-briefs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = Math.min(Math.max(Number(req.query.count) || 3, 1), 10);
    const products = await getActiveProductsForAds(count, 0);
    const briefs = products.map((p) => buildCreativeBrief(p));
    res.json({ success: true, count: briefs.length, briefs });
  } catch (error: any) {
    next(error);
  }
});

/** GET /api/google-ads/video-config — is Higgsfield video generation configured? */
router.get('/video-config', (_req: Request, res: Response) => {
  res.json({ configured: isVideoConfigured() });
});

/**
 * POST /api/google-ads/generate-video  Body: { listingId, model? }
 * Generate a UGC-style 9:16 video from a listing's real product image.
 */
router.post('/generate-video', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isVideoConfigured()) {
      throw new ApiError(503, 'Higgsfield not configured: set HF_API_KEY and HF_API_SECRET.');
    }
    const { listingId, model } = req.body || {};
    if (!listingId) throw new ApiError(400, 'listingId is required');
    const listing: any = await getListing(listingId);
    if (!listing) throw new ApiError(404, 'Listing not found');
    const imageUrl = Array.isArray(listing.productImages) ? listing.productImages[0] : undefined;
    if (!imageUrl) throw new ApiError(409, 'Listing has no product image to animate');

    const result = await generateProductVideo(listingToProduct(listing), imageUrl, { model });
    res.status(201).json({ success: true, listingId, ...result });
  } catch (error: any) {
    next(error);
  }
});

/**
 * YouTube permission setup (one-time, admin). Grants the youtube.upload scope so
 * generated videos can be hosted on YouTube and used as Google Ads video assets.
 * The minted refresh token covers BOTH adwords + youtube, so one credential
 * drives ads AND uploads — replace GOOGLE_ADS_REFRESH_TOKEN with it.
 */
const youtubeRedirectUri = () =>
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  `${process.env.PUBLIC_URL || 'https://api.arbi.creai.dev'}/api/google-ads/youtube-oauth/callback`;

router.get('/youtube-oauth/url', (_req: Request, res: Response) => {
  const clientId = (process.env.GOOGLE_ADS_CLIENT_ID || '').trim();
  if (!clientId) return res.status(503).json({ success: false, error: 'GOOGLE_ADS_CLIENT_ID not set.' });
  const redirectUri = youtubeRedirectUri();
  const scope = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
  ].join(' ');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  res.json({
    success: true,
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
    note: 'First: in Google Cloud Console add this exact redirectUri to the OAuth client, and enable "YouTube Data API v3". Then open authUrl with the Google account that owns your YouTube channel + Google Ads.',
  });
});

router.get('/youtube-oauth/callback', async (req: Request, res: Response) => {
  const code = String(req.query.code || '');
  if (!code) return res.status(400).json({ success: false, error: 'Missing ?code. Start at /api/google-ads/youtube-oauth/url.' });
  try {
    const body = new URLSearchParams({
      client_id: (process.env.GOOGLE_ADS_CLIENT_ID || '').trim(),
      client_secret: (process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim(),
      code,
      redirect_uri: youtubeRedirectUri(),
      grant_type: 'authorization_code',
    }).toString();
    const r = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: () => true,
      timeout: 15000,
    });
    if (r.status !== 200 || !r.data?.refresh_token) {
      return res.status(400).json({
        success: false,
        error: r.data?.error || `status ${r.status}`,
        error_description: r.data?.error_description,
        hint: 'Ensure access_type=offline + prompt=consent and that the redirect URI matches the OAuth client exactly.',
      });
    }
    res.json({
      success: true,
      message: 'Set GOOGLE_ADS_REFRESH_TOKEN to this value in Railway (arbi-production) — it covers Google Ads AND YouTube — then redeploy.',
      refresh_token: r.data.refresh_token,
      scope: r.data.scope,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

/**
 * POST /api/google-ads/youtube/upload-from-listing  Body: { listingId, model? }
 * Generate a UGC video for a listing and host it on YouTube (unlisted). Returns
 * the YouTube video id to use as a Google Ads video asset.
 */
router.post('/youtube/upload-from-listing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isVideoConfigured()) throw new ApiError(503, 'Higgsfield not configured: set HF_API_KEY and HF_API_SECRET.');
    const { listingId, model } = req.body || {};
    if (!listingId) throw new ApiError(400, 'listingId is required');
    const listing: any = await getListing(listingId);
    if (!listing) throw new ApiError(404, 'Listing not found');
    const imageUrl = Array.isArray(listing.productImages) ? listing.productImages[0] : undefined;
    if (!imageUrl) throw new ApiError(409, 'Listing has no product image to animate');

    const product = listingToProduct(listing);

    // 1) Generate several hook variations and score them — only the BEST creative
    //    is used (cheap to score scripts; we render just the winner).
    let bestHook: string | undefined;
    let virality: any = null;
    try {
      const hooks = buildHooks(product).slice(0, 5); // proven-formula candidate hooks
      const scored = await scoreVariations(hooks.map(h => ({ hook: h })));
      bestHook = hooks[scored.bestIndex];
      virality = { bestIndex: scored.bestIndex, source: scored.source, scores: scored.scores, candidates: hooks };
    } catch { /* non-fatal — fall back to the default brief hook */ }

    // 2) Pull a real CJ supplier review (highest-rated) to use as the social-
    //    proof beat — concrete reviews convert far better than vague hype.
    let reviewQuote: string | undefined;
    try {
      if (listing.cjProductId && isCJConfigured()) {
        const reviews = extractReviews(await cjClient.getProductReviews(listing.cjProductId));
        const best = reviews.filter(r => r.text && r.text.length > 12).sort((a, b) => b.rating - a.rating)[0];
        reviewQuote = best?.text;
      } else if (Array.isArray(listing.reviews) && listing.reviews[0]?.text) {
        reviewQuote = listing.reviews[0].text;
      }
    } catch { /* non-fatal — fall back to generic proof line */ }

    // 3) Render the winning creative (with the real review baked in) and host it.
    const video = await generateProductVideo(product, imageUrl, { model, reviewQuote });
    const youtube = await uploadVideoToYouTube({
      videoUrl: video.videoUrl,
      title: (bestHook || product.productName).slice(0, 95),
      description: bestHook || video.brief.hooks[0],
    });

    // 4) Create a PAUSED Google Ads VIDEO campaign for it (no spend until go-live).
    //    Non-fatal: the video is already on YouTube even if campaign creation fails.
    let videoCampaign: any = null;
    try {
      const cfg: CampaignConfig = { dailyBudget: DEFAULT_DAILY_BUDGET, geoTargeting: ['US'], maxCPC: 1.5 };
      const created = await createVideoCampaign(product, youtube.videoId, cfg);
      videoCampaign = { status: 'created_paused', ...created };
    } catch (e: any) {
      videoCampaign = { status: 'failed', error: e?.message || String(e) };
    }

    res.status(201).json({ success: true, listingId, sourceVideoUrl: video.videoUrl, youtube, virality, videoCampaign });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/google-ads/campaigns — list campaigns with status + metrics.
 * Powers the dashboard "go live" view (what's PAUSED vs serving).
 */
router.get('/campaigns', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, campaigns: await listCampaigns() });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/google-ads/campaign/:id/enable — start serving (real spend begins).
 * POST /api/google-ads/campaign/:id/pause  — stop serving.
 * One-tap go-live: no Google Ads console needed.
 */
router.post('/campaign/:id/enable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceName = await setCampaignStatus(req.params.id, 'ENABLED');
    res.json({ success: true, campaignId: req.params.id, status: 'ENABLED', resourceName });
  } catch (error: any) {
    next(error);
  }
});

router.post('/campaign/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceName = await setCampaignStatus(req.params.id, 'PAUSED');
    res.json({ success: true, campaignId: req.params.id, status: 'PAUSED', resourceName });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/google-ads/conversions/setup
 * Create (idempotently) the purchase conversion action and return its gtag
 * send_to. Set GOOGLE_ADS_CONVERSION_SEND_TO to the returned value + redeploy,
 * and Smart Bidding starts learning from real purchases.
 */
router.get('/conversions/setup', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await ensureConversionAction();
    res.json({
      success: true,
      ...info,
      alreadyConfigured: conversionSendTo() === info.sendTo && !!info.sendTo,
      next: info.sendTo
        ? `Set GOOGLE_ADS_CONVERSION_SEND_TO=${info.sendTo} on arbi-production, then redeploy.`
        : 'Conversion action created, but the tag is still propagating — re-run in a minute to get the send_to.',
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/google-ads/optimize — run one autonomous optimization pass now
 * (scale winners / pause losers within caps). Safe: never enables a campaign.
 */
router.post('/optimize', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, ...(await runOptimizationPass()) });
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/google-ads/stock-sync — pause ads for out-of-stock products
 * (don't pay for clicks on things you can't ship). Only pauses, never enables.
 */
router.post('/stock-sync', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, ...(await syncAdsToStock()) });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/google-ads/status — setup health for the dashboard's Setup panel.
 * Reports config presence only (no secrets, no token exchange) so it's cheap to
 * poll: credentials present, manager header set, conversion tracking wired.
 */
router.get('/status', (_req: Request, res: Response) => {
  const t = (k: string) => (process.env[k] || '').trim();
  const f = (k: string) => t(k).toLowerCase() === 'true';
  res.json({
    credsPresent: !!(t('GOOGLE_ADS_CLIENT_ID') && t('GOOGLE_ADS_CLIENT_SECRET') &&
      t('GOOGLE_ADS_REFRESH_TOKEN') && t('GOOGLE_ADS_DEVELOPER_TOKEN') && t('GOOGLE_ADS_CUSTOMER_ID')),
    managerLinked: !!t('GOOGLE_ADS_LOGIN_CUSTOMER_ID'),
    conversionTracking: !!t('GOOGLE_ADS_CONVERSION_SEND_TO'),
    // Added-feature automations (so the dashboard can show what's live).
    amazonSourcing: !!t('RAINFOREST_API_KEY'),
    autonomous: f('ENABLE_AUTONOMOUS'),
    autoGoLive: f('AUTO_GO_LIVE'),
    stockMonitor: f('ENABLE_STOCK_MONITOR'),
  });
});

/** GET /api/google-ads/conversions/status — is conversion tracking wired? */
router.get('/conversions/status', (_req: Request, res: Response) => {
  const sendTo = conversionSendTo();
  res.json({ configured: !!sendTo, sendTo: sendTo || null });
});

/**
 * GET /api/google-ads/debug-auth
 * Diagnostic: shows the (masked) credentials the SERVICE actually sees, and
 * directly exchanges the refresh token with Google so we get the exact error.
 * Remove after debugging. Secrets are masked.
 */
router.get('/debug-auth', async (req: Request, res: Response) => {
  // Optional query overrides let you test a freshly-minted token directly,
  // bypassing Railway env entirely: ?rt=<refresh_token>[&cid=...&cs=...]
  const clientId = (String(req.query.cid || '') || process.env.GOOGLE_ADS_CLIENT_ID || '').trim();
  const clientSecret = (String(req.query.cs || '') || process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim();
  const refreshToken = (String(req.query.rt || '') || process.env.GOOGLE_ADS_REFRESH_TOKEN || '').trim();
  const source = req.query.rt ? 'QUERY OVERRIDE (bypassing Railway env)' : 'Railway env';

  const env = {
    source,
    clientId: clientId ? `${clientId.slice(0, 30)}… (len ${clientId.length})` : '(MISSING)',
    clientSecretPresent: !!clientSecret,
    clientSecretLen: clientSecret.length,
    refreshTokenMasked: refreshToken ? `${refreshToken.slice(0, 6)}…${refreshToken.slice(-6)} (len ${refreshToken.length})` : '(MISSING)',
    refreshTokenStartsWith1Slash: refreshToken.startsWith('1//'),
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '(MISSING)',
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '(not set)',
    developerTokenPresent: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  };

  let googleTokenExchange: any;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();
    const r = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: () => true,
      timeout: 15000,
    });
    googleTokenExchange = r.status === 200
      ? { status: 200, ok: true, hasAccessToken: !!r.data.access_token }
      : { status: r.status, error: r.data?.error, error_description: r.data?.error_description };
  } catch (e: any) {
    googleTokenExchange = { error: e.message };
  }

  res.json({ env, googleTokenExchange });
});

export default router;
