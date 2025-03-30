import { Router } from 'express';

import aiRoutes from './ai';
import webRoutes from './web';
import voiceRoutes from './voice';
import paymentRoutes from './payment';

const router = Router();

// AI routes
router.use('/ai', aiRoutes);

// Web automation routes
router.use('/web', webRoutes);

// Voice interface routes
router.use('/voice', voiceRoutes);

// Payment routes
router.use('/payment', paymentRoutes);

export default router;
