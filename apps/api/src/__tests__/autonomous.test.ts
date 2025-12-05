/**
 * Tests for the autonomous arbitrage routes
 *
 * These tests verify that the autonomous scanning and control routes
 * are working properly for the autonomous arbitrage engine.
 */

import express, { Express } from 'express';
import request from 'supertest';

// Mock the arbitrage engine before importing routes
jest.mock('@arbi/arbitrage-engine', () => ({
  AutonomousEngine: jest.fn().mockImplementation(() => ({
    runScan: jest.fn().mockResolvedValue([]),
    getOpportunities: jest.fn().mockReturnValue([]),
    getStats: jest.fn().mockReturnValue({
      totalOpportunities: 0,
      alertedCount: 0,
      purchasedCount: 0,
      averageScore: 0,
      totalPotentialProfit: 0,
      dailySpent: 0,
      lastScan: new Date(),
    }),
    cleanupExpired: jest.fn(),
    resetDailyCounters: jest.fn(),
  })),
  AutonomousConfig: {},
}));

import autonomousRoutes from '../routes/autonomous';

describe('Autonomous Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/autonomous', autonomousRoutes);
  });

  describe('GET /api/autonomous/status', () => {
    it('should return system status', async () => {
      const res = await request(app).get('/api/autonomous/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('config');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('uptime');
    });

    it('should return stopped status when not running', async () => {
      const res = await request(app).get('/api/autonomous/status');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('stopped');
    });
  });

  describe('GET /api/autonomous/stats', () => {
    it('should return detailed statistics', async () => {
      const res = await request(app).get('/api/autonomous/stats');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalOpportunities');
      expect(res.body).toHaveProperty('isRunning');
      expect(res.body).toHaveProperty('config');
      expect(res.body).toHaveProperty('distribution');
      expect(res.body.distribution).toHaveProperty('byTier');
      expect(res.body.distribution).toHaveProperty('byProfit');
    });
  });

  describe('GET /api/autonomous/opportunities', () => {
    it('should return opportunities list', async () => {
      const res = await request(app).get('/api/autonomous/opportunities');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('opportunities');
      expect(Array.isArray(res.body.opportunities)).toBe(true);
    });

    it('should accept query parameters', async () => {
      const res = await request(app)
        .get('/api/autonomous/opportunities')
        .query({ minScore: 80, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('opportunities');
    });
  });

  describe('POST /api/autonomous/start', () => {
    it('should start autonomous scanning', async () => {
      const res = await request(app)
        .post('/api/autonomous/start')
        .send({ config: { minScore: 70, minROI: 20 } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Autonomous system started');
      expect(res.body).toHaveProperty('config');
    });

    it('should return error if already running', async () => {
      // Start once
      await request(app)
        .post('/api/autonomous/start')
        .send({ config: { minScore: 70 } });

      // Try to start again
      const res = await request(app)
        .post('/api/autonomous/start')
        .send({ config: { minScore: 70 } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Autonomous system is already running');
    });
  });

  describe('POST /api/autonomous/stop', () => {
    it('should stop autonomous scanning after starting', async () => {
      // Start first
      await request(app)
        .post('/api/autonomous/start')
        .send({ config: { minScore: 70 } });

      // Then stop
      const res = await request(app).post('/api/autonomous/stop');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Autonomous system stopped');
      expect(res.body).toHaveProperty('finalStats');
    });

    it('should return error if not running', async () => {
      const res = await request(app).post('/api/autonomous/stop');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Autonomous system is not running');
    });
  });

  describe('PUT /api/autonomous/config', () => {
    it('should update configuration', async () => {
      const res = await request(app).put('/api/autonomous/config').send({
        minScore: 80,
        minROI: 25,
        minProfit: 10,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config.minScore).toBe(80);
      expect(res.body.config.minROI).toBe(25);
      expect(res.body.config.minProfit).toBe(10);
    });

    it('should reject invalid minScore', async () => {
      const res = await request(app).put('/api/autonomous/config').send({
        minScore: 150, // Invalid - should be 0-100
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('minScore must be between 0 and 100');
    });

    it('should reject negative minROI', async () => {
      const res = await request(app).put('/api/autonomous/config').send({
        minROI: -10, // Invalid - should be positive
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('minROI must be positive');
    });
  });

  describe('POST /api/autonomous/scan-now', () => {
    it('should trigger immediate scan', async () => {
      const res = await request(app).post('/api/autonomous/scan-now');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Scan completed');
      expect(res.body).toHaveProperty('opportunitiesFound');
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('DELETE /api/autonomous/opportunities', () => {
    it('should clear opportunities', async () => {
      const res = await request(app).delete('/api/autonomous/opportunities');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Opportunities cleared and counters reset');
    });
  });
});
