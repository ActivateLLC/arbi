/**
 * Tests for the Autonomous Engine
 *
 * These tests verify the core functionality of the autonomous arbitrage
 * scanning and opportunity management system.
 */

// Mock axios before importing
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
  })),
}));

import {
  AutonomousEngine,
  AutonomousConfig,
  ArbitrageOpportunity,
} from '../autonomous/autonomousEngine';

describe('AutonomousEngine', () => {
  let engine: AutonomousEngine;

  beforeEach(() => {
    engine = new AutonomousEngine();
  });

  describe('constructor', () => {
    it('should create an instance with default state', () => {
      expect(engine).toBeInstanceOf(AutonomousEngine);
      expect(engine.getStats().totalOpportunities).toBe(0);
      expect(engine.getStats().dailySpent).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct initial stats', () => {
      const stats = engine.getStats();

      expect(stats).toHaveProperty('totalOpportunities');
      expect(stats).toHaveProperty('alertedCount');
      expect(stats).toHaveProperty('purchasedCount');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('totalPotentialProfit');
      expect(stats).toHaveProperty('dailySpent');
      expect(stats).toHaveProperty('lastScan');
    });

    it('should return zero for all counts initially', () => {
      const stats = engine.getStats();

      expect(stats.totalOpportunities).toBe(0);
      expect(stats.alertedCount).toBe(0);
      expect(stats.purchasedCount).toBe(0);
      expect(stats.dailySpent).toBe(0);
    });
  });

  describe('getOpportunities', () => {
    it('should return empty array initially', () => {
      const opportunities = engine.getOpportunities();
      expect(opportunities).toEqual([]);
    });

    it('should accept filter parameters', () => {
      const opportunities = engine.getOpportunities({
        minScore: 80,
        status: 'pending',
        limit: 10,
      });
      expect(opportunities).toEqual([]);
    });
  });

  describe('resetDailyCounters', () => {
    it('should reset daily spending', () => {
      engine.resetDailyCounters();
      const stats = engine.getStats();
      expect(stats.dailySpent).toBe(0);
    });
  });

  describe('cleanupExpired', () => {
    it('should not throw when called with no opportunities', () => {
      expect(() => engine.cleanupExpired()).not.toThrow();
    });
  });

  describe('runScan', () => {
    const defaultConfig: AutonomousConfig = {
      minScore: 70,
      minROI: 20,
      minProfit: 5,
      maxPrice: 100,
      categories: [],
      scanInterval: 15,
      autoBuyEnabled: false,
      autoBuyScore: 90,
      dailyBudget: 500,
    };

    it('should return an array of opportunities', async () => {
      const opportunities = await engine.runScan(defaultConfig);

      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should update lastScan time after scan', async () => {
      const beforeScan = new Date();
      await engine.runScan(defaultConfig);
      const stats = engine.getStats();

      // Last scan should be recent
      expect(new Date(stats.lastScan).getTime()).toBeGreaterThanOrEqual(
        beforeScan.getTime() - 1000
      );
    });
  });
});
