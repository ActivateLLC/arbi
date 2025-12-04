/**
 * Tests for Autonomous Listing Job
 *
 * Tests the autonomous listing system that:
 * - Scans for opportunities automatically
 * - Lists products on the marketplace
 * - Handles start/stop/status operations
 */

import { AutonomousListingJob } from '../jobs/autonomousListing';

describe('AutonomousListingJob', () => {
  let job: AutonomousListingJob;

  beforeEach(() => {
    job = new AutonomousListingJob();
    // Clear any running intervals
    job.stop();
  });

  afterEach(() => {
    // Ensure job is stopped after each test
    job.stop();
  });

  describe('getStatus', () => {
    it('should return running: false when not started', () => {
      const status = job.getStatus();
      expect(status.running).toBe(false);
      expect(status.hasInterval).toBe(false);
    });
  });

  describe('start', () => {
    it('should start the autonomous listing job with default config', async () => {
      const config = {
        scanIntervalMinutes: 60,
        minScore: 75,
        minProfit: 20,
        minROI: 15,
        markupPercentage: 30,
        maxListingsPerRun: 10,
      };

      // Start the job (this will run immediately and then on interval)
      await job.start(config);

      const status = job.getStatus();
      expect(status.running).toBe(true);
      expect(status.hasInterval).toBe(true);

      // Clean up
      job.stop();
    });

    it('should not start twice if already running', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const config = {
        scanIntervalMinutes: 60,
        minScore: 75,
        minProfit: 20,
        minROI: 15,
        markupPercentage: 30,
        maxListingsPerRun: 10,
      };

      await job.start(config);
      await job.start(config); // Try to start again

      // Check that a warning was logged
      expect(consoleSpy).toHaveBeenCalledWith('⚠️  Autonomous listing already running');

      consoleSpy.mockRestore();
      job.stop();
    });
  });

  describe('stop', () => {
    it('should stop the autonomous listing job', async () => {
      const config = {
        scanIntervalMinutes: 60,
        minScore: 75,
        minProfit: 20,
        minROI: 15,
        markupPercentage: 30,
        maxListingsPerRun: 10,
      };

      await job.start(config);
      expect(job.getStatus().running).toBe(true);

      job.stop();
      expect(job.getStatus().running).toBe(false);
      expect(job.getStatus().hasInterval).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should accept custom scan interval', async () => {
      const config = {
        scanIntervalMinutes: 30, // Custom interval
        minScore: 75,
        minProfit: 20,
        minROI: 15,
        markupPercentage: 30,
        maxListingsPerRun: 10,
      };

      await job.start(config);
      expect(job.getStatus().running).toBe(true);
      job.stop();
    });

    it('should accept custom quality thresholds', async () => {
      const config = {
        scanIntervalMinutes: 60,
        minScore: 85, // Higher threshold
        minProfit: 30, // Higher minimum profit
        minROI: 20, // Higher ROI
        markupPercentage: 35, // Higher markup
        maxListingsPerRun: 5, // Fewer listings per run
      };

      await job.start(config);
      expect(job.getStatus().running).toBe(true);
      job.stop();
    });
  });
});
