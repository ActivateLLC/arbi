import { Router, Request, Response, NextFunction } from 'express';
import { requireApiKey } from '../middleware/apiAuth';

import aiRoutes from './ai';
import webRoutes from './web';
import voiceRoutes from './voice';
import paymentRoutes from './payment';
import arbitrageRoutes from './arbitrage';
import autonomousRoutes from './autonomous';
import autonomousControlRoutes from './autonomous-control';
import payoutRoutes from './payout';
import revenueRoutes from './revenue';
import dropshippingWebhooks from './dropshipping-webhooks';
import marketplaceRoutes from './marketplace';
import trendsRoutes from './trends';
import testGoogleAdsRoutes from './test-google-ads';
import campaignLauncherRoutes from './campaign-launcher';
import googleAdsRoutes from './google-ads';
import productImageRoutes from './product-image';
import fulfillmentRoutes from './fulfillment';
import cjRoutes from './cj';
import tiktokRoutes from './tiktok';
import tenantRoutes from './tenants';
import sourcingRoutes from './sourcing';
import alertsRoutes from './alerts';

const router = Router();

// ---------------------------------------------------------------------------
// OPERATOR WALL — the Command Center's control surface (engine switches, spend
// caps, campaign enable/pause, sourcing, payouts) must never be publicly
// mutable: the dashboard ships with no login, so the API key IS the login.
// requireApiKey checks x-api-key against ARBI_API_KEY (fails closed when the
// env var is unset). Paths that must stay open are listed explicitly below.
// ---------------------------------------------------------------------------
const operatorWall = (openPaths: RegExp[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (openPaths.some((p) => p.test(req.path))) return next();
    return requireApiKey(req, res, next);
  };
// Google redirects the operator's browser here after consent — no header possible.
const GOOGLE_ADS_OPEN = [/^\/youtube-oauth\/callback/];
// Catalog reads the storefront + the arbi-api catalog-freshness loop depend on
// (server-to-server, keyless). Orders and every write stay behind the wall.
const MARKETPLACE_OPEN = [/^\/listings/, /^\/listing\//];

// AI routes
router.use('/ai', aiRoutes);

// Web automation routes
router.use('/web', webRoutes);

// Voice interface routes
router.use('/voice', requireApiKey, voiceRoutes);

// Payment routes
router.use('/payment', paymentRoutes);

// Payout routes (automated profit transfers to bank)
router.use('/payout', requireApiKey, payoutRoutes);

// Marketplace routes (ZERO-CAPITAL dropshipping - buyer pays first)
router.use('/marketplace', operatorWall(MARKETPLACE_OPEN), marketplaceRoutes);

// Arbitrage routes
router.use('/arbitrage', requireApiKey, arbitrageRoutes);

// Autonomous arbitrage routes
router.use('/autonomous', requireApiKey, autonomousRoutes);
// Autonomous control routes
router.use('/autonomous-control', requireApiKey, autonomousControlRoutes);
// Revenue tracking routes
router.use('/revenue', requireApiKey, revenueRoutes);
// Dropshipping webhooks
router.use('/webhooks/dropshipping', dropshippingWebhooks);

// Trend detection routes (Kalodata TikTok Shop integration)
router.use('/trends', requireApiKey, trendsRoutes);

// Test routes
router.use('/test', requireApiKey, testGoogleAdsRoutes);

// Campaign management
router.use('/campaigns', requireApiKey, campaignLauncherRoutes);

// Google Ads campaign automation (real google-ads-api; campaigns created PAUSED)
router.use('/google-ads', operatorWall(GOOGLE_ADS_OPEN), googleAdsRoutes);

// Product image resolver (guarantees a real product photo per listing)
router.use('/product-image', productImageRoutes);

// Fulfillment release (never front cash for high-ticket; wait for settled funds)
router.use('/fulfillment', requireApiKey, fulfillmentRoutes);

// CJ Dropshipping sourcing + account (creates fulfillable, CJ-sourced listings)
router.use('/cj', requireApiKey, cjRoutes);

// TikTok Ads automation (campaigns created PAUSED)
router.use('/tiktok', requireApiKey, tiktokRoutes);

// Multi-tenant advertisers — each subscribed customer gets their own Google Ads
// child account under the manager (MCC); campaigns are scoped to that account.
router.use('/tenants', requireApiKey, tenantRoutes);

// Multi-source product sourcing (CJ + Amazon/Rainforest, extensible).
router.use('/sourcing', requireApiKey, sourcingRoutes);

// Operator action items / alerts (what needs attention + quick links).
router.use('/alerts', requireApiKey, alertsRoutes);

export default router;
