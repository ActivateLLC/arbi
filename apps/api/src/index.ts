import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initializeDatabase } from './config/database';
import apiRoutes from './routes';
import publicProductRoutes from './routes/public-product';
import directCheckoutRoutes from './routes/direct-checkout';

// Initialize logger
const logger = createLogger();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint - check configured keys (without exposing values)
app.get('/debug/config', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    keys: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      rainforest: !!process.env.RAINFOREST_API_KEY,
      googleAds: !!process.env.GOOGLE_ADS_CLIENT_ID,
      database: !!process.env.DATABASE_URL,
    }
  });
});

// Direct checkout links (shortest path: ad → checkout)
app.use('/', directCheckoutRoutes);

// Public product landing pages (for ad destinations)
app.use('/', publicProductRoutes);

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize database BEFORE starting server
async function startServer() {
  // Initialize database connection first
  try {
    await initializeDatabase();
    logger.info('✅ Database initialized - listings will persist across restarts');
  } catch (error: any) {
    logger.warn('⚠️  Database initialization failed - using in-memory storage');
    logger.warn(`   Error: ${error.message}`);
  }

  // Start server - bind to 0.0.0.0 for Railway/Docker compatibility
  const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`✅ Server running on http://0.0.0.0:${port}`);
    logger.info(`✅ Health check: http://0.0.0.0:${port}/health`);
    logger.info(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`✅ API ready at: http://0.0.0.0:${port}/api`);
  });

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${port} is already in use`);
    } else if (error.code === 'EACCES') {
      logger.error(`❌ Port ${port} requires elevated privileges`);
    } else {
      logger.error(`❌ Server error:`, error);
    }
    process.exit(1);
  });
}

// Start the server
startServer().catch((error) => {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
