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
import complianceRoutes from './routes/compliance';
import stripeWebhookRoutes from './routes/stripe-webhooks';
import testGoogleAdsRoutes from './routes/test-google-ads';

// Initialize logger
const logger = createLogger();

// Database persistence test: Products should survive this deployment

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Apply middleware with relaxed CSP for product pages
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for product pages
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: [
        "'self'",
        "data:",
        "https://m.media-amazon.com",
        "https://res.cloudinary.com",
        "https://placehold.co"
      ],
      connectSrc: ["'self'", "https://checkout.stripe.com"],
      frameSrc: ["'self'", "https://checkout.stripe.com", "https://js.stripe.com"],
      formAction: ["'self'", "https://checkout.stripe.com"]
    }
  }
}));
// Configure CORS to allow frontend domains
app.use(cors({
  origin: [
    'https://www.arbi.creai.dev',
    'https://arbi.creai.dev',
    'https://dashboard.arbi.creai.dev',
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'http://localhost:5174',  // Dashboard dev server
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Stripe webhooks need raw body - add BEFORE express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

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

// Test endpoints
app.use('/api/test', testGoogleAdsRoutes);

// Compliance pages (required for Google Ads)
app.use('/', complianceRoutes);

// Direct checkout links (shortest path: ad → checkout)
app.use('/', directCheckoutRoutes);

// Public product landing pages (for ad destinations)
app.use('/', publicProductRoutes);

// API routes
app.use('/api', apiRoutes);

// Campaign management routes
import campaignLauncherRoutes from './routes/campaign-launcher';
app.use('/api/campaigns', campaignLauncherRoutes);

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
