import { Router } from 'express';

import aiRoutes from './ai';
import webRoutes from './web';
import voiceRoutes from './voice';
import paymentRoutes from './payment';
import arbitrageRoutes from './arbitrage';
import autonomousRoutes from './autonomous';
import autonomousControlRoutes from './autonomous-control';
import payoutRoutes from './payout';
import marketplaceRoutes from './marketplace';
import authRoutes from './auth';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

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

// Autonomous arbitrage routes (NEW - Multi-category intelligent scanning)
router.use('/autonomous', autonomousRoutes);

// Autonomous control routes (START/STOP autonomous operations)
router.use('/autonomous-control', autonomousControlRoutes);

export default router;
