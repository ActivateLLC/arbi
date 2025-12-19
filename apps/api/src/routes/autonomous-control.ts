/**
 * Autonomous System Control API
 *
 * Start/stop autonomous operations:
 * - Automatic opportunity scanning
 * - Automatic listing on marketplace
 * - Automatic execution (when configured)
 */

import { Router } from 'express';
import { autonomousListing } from '../jobs/autonomousListing';
import type { Request, Response } from 'express';
const router = Router();

/**
 * POST /api/autonomous-control/start-listing
 * Start autonomous listing job
 */
router.post('/start-listing', async (req: Request, res: Response) => {
  const {
    scanIntervalMinutes = 60,
    minScore = 75,
    minProfit = 20,
    minROI = 15,
    markupPercentage = 30,
    maxListingsPerRun = 10,
  } = req.body;

  try {
    await autonomousListing.start({
      scanIntervalMinutes,
      minScore,
      minProfit,
      minROI,
      markupPercentage,
      maxListingsPerRun,
    });

    res.status(200).json({
      success: true,
      message: 'Autonomous listing started',
      config: {
        scanIntervalMinutes,
        minScore,
        minProfit,
        minROI,
        markupPercentage,
        maxListingsPerRun,
      },
      status: autonomousListing.getStatus(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/autonomous-control/stop-listing
 * Stop autonomous listing job
 */
router.post('/stop-listing', (req: Request, res: Response) => {
  autonomousListing.stop();

  res.status(200).json({
    success: true,
    message: 'Autonomous listing stopped',
    status: autonomousListing.getStatus(),
  });
});

/**
 * GET /api/autonomous-control/status
 * Get autonomous system status
 */
router.get('/status', (req: Request, res: Response) => {
  const listingStatus = autonomousListing.getStatus();

  res.status(200).json({
    autonomous: {
      listing: listingStatus,
    },
    capabilities: {
      autoScanning: true,
      autoListing: true,
      autoExecution: false, // Not yet implemented - needs real supplier APIs
      autoPayout: true, // Available with Stripe
    },
    nextSteps: {
      forFullAutonomy: [
        'Add real supplier purchase APIs (Amazon, Walmart, Target)',
        'Implement payment routing with virtual cards',
        'Build buyer marketplace frontend',
        'Configure auto-execution settings',
      ],
    },
  });
});

/**
 * POST /api/autonomous-control/configure
 * Configure autonomous system settings
 */
router.post('/configure', async (req: Request, res: Response) => {
  const {
    enableAutoListing = true,
    enableAutoExecution = false,
    budgetLimits = {
      dailyLimit: 1000,
      perOpportunityMax: 400,
      monthlyLimit: 10000,
    },
    qualityThresholds = {
      minScore: 75,
      minProfit: 20,
      minROI: 15,
    },
  } = req.body;

  // Store configuration (in production, save to database)
  const config = {
    enableAutoListing,
    enableAutoExecution,
    budgetLimits,
    qualityThresholds,
    updatedAt: new Date(),
  };

  // Start auto-listing if enabled
  if (enableAutoListing) {
    await autonomousListing.start({
      scanIntervalMinutes: 60,
      minScore: qualityThresholds.minScore,
      minProfit: qualityThresholds.minProfit,
      minROI: qualityThresholds.minROI,
      markupPercentage: 30,
      maxListingsPerRun: 10,
    });
  } else {
    autonomousListing.stop();
  }

  res.status(200).json({
    success: true,
    message: 'Autonomous system configured',
    config,
    status: {
      autoListing: autonomousListing.getStatus(),
      autoExecution: { running: false, reason: 'Requires supplier API integration' },
    },
  });
});

export default router;
