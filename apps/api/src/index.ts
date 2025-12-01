import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes';
import { voiceRouter } from './routes/voice';
import { webRouter } from './routes/web';
import { paymentRouter } from './routes/payment';
import { startAutonomousScout } from './services/AutonomousScout';

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
app.use('/api/voice', voiceRouter);
app.use('/api/web', webRouter);
app.use('/api/payment', paymentRouter);

// Error handling middleware
app.use(errorHandler);

// Start server - bind to 0.0.0.0 for Railway/Docker compatibility
const server = app.listen(port, '0.0.0.0', () => {
  logger.info(`✅ Server is running on http://localhost:${port}`);
  
  // Start the autonomous scouting service
  startAutonomousScout();
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
