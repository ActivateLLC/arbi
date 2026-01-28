import { Router } from 'express';

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

const router = Router();

// AI routes
router.use('/ai', aiRoutes);

// Web automation routes
router.use('/web', webRoutes);

// Voice interface routes
router.use('/voice', voiceRoutes);

// Payment routes
router.use('/payment', paymentRoutes);

// Payout routes (automated profit transfers to bank)
router.use('/payout', payoutRoutes);

// Marketplace routes (ZERO-CAPITAL dropshipping - buyer pays first)
router.use('/marketplace', marketplaceRoutes);

// Arbitrage routes
router.use('/arbitrage', arbitrageRoutes);

// Autonomous arbitrage routes
router.use('/autonomous', autonomousRoutes);
// Autonomous control routes
router.use('/autonomous-control', autonomousControlRoutes);
// Revenue tracking routes
router.use('/revenue', revenueRoutes);
// Dropshipping webhooks
router.use('/webhooks/dropshipping', dropshippingWebhooks);

// Trend detection routes (Kalodata TikTok Shop integration)
router.use('/trends', trendsRoutes);

// Test routes
router.use('/test', testGoogleAdsRoutes);

// Campaign management
router.use('/campaigns', campaignLauncherRoutes);

export default router;
