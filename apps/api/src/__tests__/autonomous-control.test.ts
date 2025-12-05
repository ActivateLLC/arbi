/**
 * Tests for the autonomous control routes
 *
 * These tests verify the start/stop functionality for
 * autonomous listing and system configuration.
 */

import express, { Express } from 'express';
import request from 'supertest';

// Mock the autonomousListing job before importing routes
jest.mock('../jobs/autonomousListing', () => ({
  autonomousListing: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    getStatus: jest.fn().mockReturnValue({
      running: false,
      hasInterval: false,
    }),
  },
}));

import autonomousControlRoutes from '../routes/autonomous-control';
import { autonomousListing } from '../jobs/autonomousListing';

describe('Autonomous Control Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/autonomous-control', autonomousControlRoutes);
  });

  describe('GET /api/autonomous-control/status', () => {
    it('should return autonomous system status', async () => {
      const res = await request(app).get('/api/autonomous-control/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('autonomous');
      expect(res.body).toHaveProperty('capabilities');
      expect(res.body).toHaveProperty('nextSteps');
    });

    it('should return capability flags', async () => {
      const res = await request(app).get('/api/autonomous-control/status');

      expect(res.body.capabilities).toEqual({
        autoScanning: true,
        autoListing: true,
        autoExecution: false,
        autoPayout: true,
      });
    });

    it('should return next steps for full autonomy', async () => {
      const res = await request(app).get('/api/autonomous-control/status');

      expect(res.body.nextSteps.forFullAutonomy).toContain(
        'Add real supplier purchase APIs (Amazon, Walmart, Target)'
      );
    });
  });

  describe('POST /api/autonomous-control/start-listing', () => {
    it('should start autonomous listing job', async () => {
      (autonomousListing.getStatus as jest.Mock).mockReturnValue({
        running: true,
        hasInterval: true,
      });

      const res = await request(app)
        .post('/api/autonomous-control/start-listing')
        .send({
          scanIntervalMinutes: 60,
          minScore: 75,
          minProfit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Autonomous listing started');
      expect(autonomousListing.start).toHaveBeenCalled();
    });

    it('should use default values if not provided', async () => {
      const res = await request(app).post('/api/autonomous-control/start-listing');

      expect(res.status).toBe(200);
      expect(autonomousListing.start).toHaveBeenCalledWith(
        expect.objectContaining({
          scanIntervalMinutes: 60,
          minScore: 75,
          minProfit: 20,
          minROI: 15,
          markupPercentage: 30,
          maxListingsPerRun: 10,
        })
      );
    });
  });

  describe('POST /api/autonomous-control/stop-listing', () => {
    it('should stop autonomous listing job', async () => {
      const res = await request(app).post('/api/autonomous-control/stop-listing');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Autonomous listing stopped');
      expect(autonomousListing.stop).toHaveBeenCalled();
    });

    it('should return current status after stopping', async () => {
      const res = await request(app).post('/api/autonomous-control/stop-listing');

      expect(res.body).toHaveProperty('status');
    });
  });

  describe('POST /api/autonomous-control/configure', () => {
    it('should configure autonomous system', async () => {
      const configData = {
        enableAutoListing: true,
        enableAutoExecution: false,
        budgetLimits: {
          dailyLimit: 1000,
          perOpportunityMax: 400,
          monthlyLimit: 10000,
        },
        qualityThresholds: {
          minScore: 75,
          minProfit: 20,
          minROI: 15,
        },
      };

      const res = await request(app)
        .post('/api/autonomous-control/configure')
        .send(configData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Autonomous system configured');
      expect(res.body).toHaveProperty('config');
    });

    it('should start auto-listing when enabled in config', async () => {
      const res = await request(app)
        .post('/api/autonomous-control/configure')
        .send({ enableAutoListing: true });

      expect(res.status).toBe(200);
      expect(autonomousListing.start).toHaveBeenCalled();
    });

    it('should stop auto-listing when disabled in config', async () => {
      const res = await request(app)
        .post('/api/autonomous-control/configure')
        .send({ enableAutoListing: false });

      expect(res.status).toBe(200);
      expect(autonomousListing.stop).toHaveBeenCalled();
    });
  });
});
