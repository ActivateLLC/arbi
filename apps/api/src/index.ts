import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import publicProductRoutes from './routes/public-product';
import directCheckoutRoutes from './routes/direct-checkout';

// Initialize logger
const logger = createLogger();

// Validate required environment variables
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  logger.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => logger.error(`   - ${varName}`));
  logger.error('Set these in Railway dashboard or .env file');
  process.exit(1);
} else if (missingVars.length > 0) {
  logger.warn('⚠️  Missing optional environment variables (OK in development):');
  missingVars.forEach(varName => logger.warn(`   - ${varName}`));
}

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Apply middleware
app.use(helmet());

// CORS configuration - allow specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // API dev server
      'http://localhost:4200', // Angular dev server
      'https://arbi-dashboard.vercel.app',
      'https://arbi-landing.vercel.app'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));

// Health check endpoint with database verification
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Try to query database to verify connection
    const { getDatabaseManager } = await import('./config/database');
    const db = getDatabaseManager();

    if (db) {
      // Simple query to test connection
      await db.query('SELECT 1');
      health.database = 'connected';
    } else {
      health.database = 'not_configured';
    }

    res.status(200).json(health);
  } catch (error) {
    health.status = 'degraded';
    health.database = 'error';
    health.error = error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json(health);
  }
});

// Direct checkout links (shortest path: ad → checkout)
app.use('/', directCheckoutRoutes);

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
