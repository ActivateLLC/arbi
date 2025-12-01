import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import { cronScheduler } from './jobs/cronScheduler';

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

  // Initialize and start cron scheduler for end-to-end product marketing
  logger.info('🕐 Initializing cron scheduler for product marketing and serving...');
  cronScheduler.initialize();
  cronScheduler.start();
  logger.info('✅ Cron scheduler started - products will be marketed and served automatically');
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - shutting down gracefully');
  cronScheduler.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received - shutting down gracefully');
  cronScheduler.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
