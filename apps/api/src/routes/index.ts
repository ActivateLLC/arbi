import { Router } from 'express';

import aiRoutes from './ai';
import webRoutes from './web';
import voiceRoutes from './voice';
import paymentRoutes from './payment';
import arbitrageRoutes from './arbitrage';
import autonomousRoutes from './autonomous';
import autonomousControlRoutes from './autonomous-control';
<<<<<<< HEAD
import payoutRoutes from './payout';
=======
import revenueRoutes from './revenue';
import dropshippingWebhooks from './dropshipping-webhooks';
>>>>>>> ea2bb28f (feat: add initial configuration and tests for API and AI engine)
import marketplaceRoutes from './marketplace';

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

<<<<<<< HEAD
// Autonomous arbitrage routes (NEW - Multi-category intelligent scanning)
router.use('/autonomous', autonomousRoutes);

// Autonomous control routes (START/STOP autonomous operations)
router.use('/autonomous-control', autonomousControlRoutes);

=======
// Autonomous arbitrage routes
router.use('/autonomous', autonomousRoutes);
router.use('/autonomous-control', autonomousControlRoutes);

// Revenue tracking routes
router.use('/revenue', revenueRoutes);

// Dropshipping webhooks
router.use('/webhooks/dropshipping', dropshippingWebhooks);

// Marketplace routes
router.use('/marketplace', marketplaceRoutes);

>>>>>>> ea2bb28f (feat: add initial configuration and tests for API and AI engine)
export default router;
