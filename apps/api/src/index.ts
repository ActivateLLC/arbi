import 'dotenv/config';

// google-auth-library (used by google-ads-api) otherwise probes the GCP metadata
// server on first call. On non-GCP hosts (Railway) that probe stalls/retries and
// can hang outbound API calls. Disable detection so it goes straight to the
// provided OAuth refresh-token credentials.
process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || 'none';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initializeDatabase } from './config/database';
import { getOrders } from './routes/marketplace';
import { seedRevenueFromOrders } from './routes/revenue';
import apiRoutes from './routes';
import publicProductRoutes from './routes/public-product';
import directCheckoutRoutes from './routes/direct-checkout';
import legalRoutes from './routes/legal';
import stripeWebhookRoutes from './routes/stripe-webhooks';

// Initialize logger
const logger = createLogger();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Apply middleware.
// The public product/checkout pages are server-rendered HTML that legitimately
// loads product images from external CDNs (Cloudinary and scraped retailer/CDN
// hosts), Google Fonts, and a charting/animation CDN, and uses inline scripts
// and inline handlers. Helmet's DEFAULT Content-Security-Policy sets
// `img-src 'self' data:` and `script-src-attr 'none'`, which silently BLOCKS
// every cross-origin product image and every inline onerror/onclick handler —
// that was leaving product images as empty boxes. Relax the CSP to permit
// https images/styles/scripts while keeping helmet's other protections.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'script-src': ["'self'", "'unsafe-inline'", 'https:'],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https:'],
      'font-src': ["'self'", 'https:', 'data:'],
      'connect-src': ["'self'", 'https:'],
      'frame-src': ["'self'", 'https://js.stripe.com', 'https://checkout.stripe.com'],
    },
  },
}));
app.use(cors());

// Stripe webhook signature verification requires the raw, unparsed request
// body, so this route must be mounted BEFORE express.json(). This closes the
// fulfillment loop: on checkout.session.completed it saves the BuyerOrder and
// (when ENABLE_AUTO_FULFILLMENT=true) triggers supplier purchase.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Direct checkout links (shortest path: ad → checkout)
app.use('/', directCheckoutRoutes);

// Legal / policy pages (footer links — required for Google Ads, Stripe, stores)
app.use('/', legalRoutes);

// Public product landing pages (for ad destinations)
app.use('/', publicProductRoutes);

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server - bind to 0.0.0.0 for Railway/Docker compatibility
const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`✅ Server running on http://0.0.0.0:${port}`);
  logger.info(`✅ Health check: http://0.0.0.0:${port}/health`);
  logger.info(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`✅ API ready at: http://0.0.0.0:${port}/api`);

  // Connect + sync the database so orders/listings PERSIST across redeploys,
  // then rehydrate the revenue tracker from those orders so the dashboard total
  // is durable and reconciles to logged sales. Non-fatal: if the DB is
  // unavailable we keep running on the in-memory fallback.
  (async () => {
    try {
      await initializeDatabase();
      logger.info('✅ Database connected + models synced (orders will persist)');
      // Restore the operator's last stated intent from the DB so a redeploy/crash
      // never resets the engine to env defaults (intent is sticky until stopped).
      try {
        await require('./services/autonomousSettings').hydrateAutonomousSettings();
      } catch (e: any) {
        logger.error('⚠️  Engine-state rehydration failed (keeping env defaults):', e?.message || e);
      }
      // Exactly-once health + one-time backfill: verify the UNIQUE index exists,
      // and if the campaign mapping is empty, populate it from the campaigns that
      // already live in Google Ads (and clear legacy duplicates). Idempotent;
      // runs once. Non-fatal + backgrounded so it never blocks boot.
      (async () => {
        try {
          const reg = require('./services/google-ads/campaignRegistry');
          await reg.verifyUniqueIndex();
          if ((await reg.countSlots()) === 0) {
            const { backfillCampaignRegistry } = require('./services/google-ads/campaignCleanup');
            const r = await backfillCampaignRegistry({});
            logger.info(`🧱 Campaign registry backfill: mapped ${r.mapped}, removed ${r.removed} legacy dupe(s), skipped ${r.skipped}`);
          }
          // Always purge brand/seed-junk campaigns (AirPods, Nintendo, Espresso…)
          // — they can never serve. Idempotent; runs every boot.
          const { purgeBrandCampaigns } = require('./services/google-ads/campaignCleanup');
          const bp = await purgeBrandCampaigns({});
          if (bp.removed) logger.info(`🧹 Purged ${bp.removed} brand/seed campaign(s) from the account`);
        } catch (e: any) {
          logger.error('⚠️  Campaign registry backfill failed (non-fatal):', e?.message || e);
        }
      })();
    } catch (e: any) {
      logger.error('⚠️  Database not available — using in-memory storage (no persistence):', e?.message || e);
    }
    try {
      const orders = await getOrders();
      const { totalRevenue, tradesExecuted } = seedRevenueFromOrders(orders as any);
      logger.info(`✅ Revenue rehydrated: $${totalRevenue.toFixed(2)} from ${tradesExecuted} order(s)`);
    } catch (e: any) {
      logger.error('⚠️  Revenue rehydration failed:', e?.message || e);
    }
  })();

  // 24/7 autonomous engine (no-op unless ENABLE_AUTONOMOUS=true).
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./jobs/autonomousEngine').startAutonomousEngine();
  } catch (e: any) {
    logger.error('Autonomous engine failed to start:', e?.message || e);
  }
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
