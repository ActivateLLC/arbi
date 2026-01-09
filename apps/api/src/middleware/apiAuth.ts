import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

/**
 * API Key Authentication Middleware
 * Protects sensitive endpoints from unauthorized access
 *
 * Usage:
 *   router.post('/sensitive-endpoint', requireApiKey, handler);
 *
 * Client must provide API key in one of these ways:
 *   1. Header: x-api-key: YOUR_API_KEY
 *   2. Query param: ?apiKey=YOUR_API_KEY
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  // Get API key from header or query parameter
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  // Check if API key is provided
  if (!apiKey) {
    throw new ApiError(401, 'API key is required. Please provide it in x-api-key header or apiKey query parameter.');
  }

  // Verify API key matches environment variable
  const validApiKey = process.env.ARBI_API_KEY;

  if (!validApiKey) {
    console.error('⚠️  ARBI_API_KEY not configured in environment variables');
    throw new ApiError(500, 'API authentication not configured on server');
  }

  if (apiKey !== validApiKey) {
    console.warn(`⚠️  Invalid API key attempt from IP: ${req.ip}`);
    throw new ApiError(401, 'Invalid API key');
  }

  // API key is valid, continue
  next();
};

/**
 * Optional API Key Authentication
 * Allows requests with or without API key, but validates if provided
 * Useful for endpoints that have different behavior for authenticated vs public access
 */
export const optionalApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    // No API key provided, continue as public request
    (req as any).authenticated = false;
    return next();
  }

  const validApiKey = process.env.ARBI_API_KEY;

  if (apiKey === validApiKey) {
    // Valid API key provided
    (req as any).authenticated = true;
    next();
  } else {
    // Invalid API key provided
    console.warn(`⚠️  Invalid API key attempt from IP: ${req.ip}`);
    throw new ApiError(401, 'Invalid API key');
  }
};

/**
 * Admin-only authentication
 * Requires a separate admin API key for super-privileged operations
 */
export const requireAdminKey = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;

  if (!adminKey) {
    throw new ApiError(401, 'Admin key is required');
  }

  const validAdminKey = process.env.ARBI_ADMIN_KEY || process.env.ARBI_API_KEY; // Fallback to regular API key if admin not set

  if (adminKey !== validAdminKey) {
    console.warn(`⚠️  Invalid admin key attempt from IP: ${req.ip}`);
    throw new ApiError(403, 'Forbidden - admin access required');
  }

  next();
};
