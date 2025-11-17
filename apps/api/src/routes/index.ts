import { Router } from 'express';

import aiRoutes from './ai';
import webRoutes from './web';
import voiceRoutes from './voice';
import paymentRoutes from './payment';
import arbitrageRoutes from './arbitrage';
import autonomousRoutes from './autonomous';
import payoutRoutes from './payout';

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

// Arbitrage routes
router.use('/arbitrage', arbitrageRoutes);

// Autonomous arbitrage routes (NEW - Multi-category intelligent scanning)
router.use('/autonomous', autonomousRoutes);

export default router;
