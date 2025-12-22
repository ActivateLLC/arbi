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
import stripeWebhook from './stripe-webhook';
import campaignLauncherRoutes from './campaign-launcher';
import autonomousMarketplaceRoutes from './autonomous-marketplace';

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

// Campaign launcher routes (automated Google Ads)
router.use('/campaigns', campaignLauncherRoutes);

// AUTONOMOUS MARKETPLACE - Press "Start" → Make Money 🚀
router.use('/autonomous-marketplace', autonomousMarketplaceRoutes);

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
// Stripe webhooks (auto-purchase automation)
router.use('/stripe', stripeWebhook);
export default router;
