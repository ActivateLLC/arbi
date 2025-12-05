/**
 * Tests for the marketplace routes
 *
 * These tests verify the zero-capital dropshipping marketplace functionality
 * including listing products, handling buyer payments, and order management.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';

// Mock dependencies before importing routes
jest.mock('../config/database', () => ({
  getDatabase: jest.fn().mockReturnValue(null),
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
      }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 'ref_test_123',
      }),
    },
  }));
});

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://cloudinary.com/test-image.jpg',
      }),
    },
  },
}));

import marketplaceRoutes from '../routes/marketplace';
import { ApiError } from '../middleware/errorHandler';

// Simple error handler for testing
const testErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    status: statusCode,
  });
};

describe('Marketplace Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace', marketplaceRoutes);
    app.use(testErrorHandler);
  });

  describe('GET /api/marketplace/health', () => {
    it('should return marketplace health status', async () => {
      const res = await request(app).get('/api/marketplace/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.mode).toBe('dropshipping');
      expect(res.body.capitalRequired).toBe(0);
      expect(res.body.physicalHandling).toBe(false);
      expect(res.body).toHaveProperty('features');
      expect(res.body).toHaveProperty('stats');
    });

    it('should show correct feature flags', async () => {
      const res = await request(app).get('/api/marketplace/health');

      expect(res.body.features.buyerPaysFirst).toBe(true);
      expect(res.body.features.directShipping).toBe(true);
      expect(res.body.features.autoSupplierPurchase).toBe(true);
    });
  });

  describe('GET /api/marketplace/listings', () => {
    it('should return empty listings initially', async () => {
      const res = await request(app).get('/api/marketplace/listings');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('listings');
      expect(Array.isArray(res.body.listings)).toBe(true);
    });

    it('should accept status filter', async () => {
      const res = await request(app)
        .get('/api/marketplace/listings')
        .query({ status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('listings');
    });
  });

  describe('POST /api/marketplace/list', () => {
    it('should create a new listing', async () => {
      const listingData = {
        opportunityId: 'opp-test-001',
        productTitle: 'Test Product for Marketplace',
        productDescription: 'A test product description',
        productImageUrls: [],
        supplierPrice: 25.0,
        supplierUrl: 'https://amazon.com/dp/TEST123',
        supplierPlatform: 'amazon',
        markupPercentage: 30,
      };

      const res = await request(app)
        .post('/api/marketplace/list')
        .send(listingData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Product listed on marketplace');
      expect(res.body).toHaveProperty('listing');
      expect(res.body.listing.productTitle).toBe('Test Product for Marketplace');
      expect(res.body.listing.supplierPrice).toBe(25);
      expect(res.body.listing.marketplacePrice).toBe(32.5); // 25 + 30%
      expect(res.body.listing.estimatedProfit).toBe(7.5);
      expect(res.body.listing.status).toBe('active');
    });

    it('should include marketing info in response', async () => {
      const listingData = {
        opportunityId: 'opp-test-002',
        productTitle: 'Marketing Test Product',
        supplierPrice: 50.0,
        supplierUrl: 'https://amazon.com/dp/TEST456',
        supplierPlatform: 'amazon',
      };

      const res = await request(app)
        .post('/api/marketplace/list')
        .send(listingData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('marketingInfo');
      expect(res.body.marketingInfo).toHaveProperty('publicUrl');
      expect(res.body.marketingInfo).toHaveProperty('shareableLinks');
      expect(res.body.marketingInfo.shareableLinks).toHaveProperty('facebook');
      expect(res.body.marketingInfo.shareableLinks).toHaveProperty('twitter');
    });

    it('should reject listing without required fields', async () => {
      const res = await request(app).post('/api/marketplace/list').send({
        productTitle: 'Incomplete Listing',
        // Missing opportunityId, supplierPrice, supplierUrl
      });

      expect(res.status).toBe(400);
    });

    it('should use default markup of 30% when not specified', async () => {
      const listingData = {
        opportunityId: 'opp-test-003',
        productTitle: 'Default Markup Test',
        supplierPrice: 100.0,
        supplierUrl: 'https://amazon.com/dp/TEST789',
        supplierPlatform: 'amazon',
        // markupPercentage not specified
      };

      const res = await request(app)
        .post('/api/marketplace/list')
        .send(listingData);

      expect(res.status).toBe(201);
      expect(res.body.listing.marketplacePrice).toBe(130.0); // 100 + 30%
      expect(res.body.listing.estimatedProfit).toBe(30.0);
    });
  });

  describe('GET /api/marketplace/orders', () => {
    it('should return order history', async () => {
      const res = await request(app).get('/api/marketplace/orders');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('orders');
      expect(res.body).toHaveProperty('stats');
      expect(Array.isArray(res.body.orders)).toBe(true);
    });

    it('should return proper stats structure', async () => {
      const res = await request(app).get('/api/marketplace/orders');

      expect(res.body.stats).toHaveProperty('totalOrders');
      expect(res.body.stats).toHaveProperty('totalRevenue');
      expect(res.body.stats).toHaveProperty('totalProfit');
      expect(res.body.stats).toHaveProperty('successfulOrders');
      expect(res.body.stats).toHaveProperty('averageProfitPerOrder');
    });
  });

  describe('POST /api/marketplace/checkout', () => {
    it('should reject checkout without required fields', async () => {
      const res = await request(app).post('/api/marketplace/checkout').send({
        listingId: 'test-listing',
        // Missing buyerEmail, shippingAddress, paymentMethodId
      });

      expect(res.status).toBe(400);
    });

    it('should reject checkout for non-existent listing', async () => {
      const checkoutData = {
        listingId: 'non-existent-listing-id',
        buyerEmail: 'test@example.com',
        shippingAddress: {
          name: 'Test User',
          line1: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postal_code: '12345',
          country: 'US',
        },
        paymentMethodId: 'pm_test_123',
      };

      const res = await request(app)
        .post('/api/marketplace/checkout')
        .send(checkoutData);

      expect(res.status).toBe(404);
    });
  });
});
