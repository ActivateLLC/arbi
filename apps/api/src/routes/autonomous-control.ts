/**
 * Autonomous System Control API
 *
 * Start/stop autonomous operations:
 * - Automatic opportunity scanning
 * - Automatic listing on marketplace
 * - Automatic execution (when configured)
 */

import { Router, Request, Response } from 'express';
import { autonomousListing } from '../jobs/autonomousListing';

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
    turboMode = false,
  } = req.body;

  try {
    // Use turbo mode preset if enabled
    if (turboMode) {
      await autonomousListing.start('turbo');
      
      res.status(200).json({
        success: true,
        message: '⚡ Autonomous listing started in TURBO MODE',
        mode: 'turbo',
        status: autonomousListing.getStatus(),
        description: 'Turbo mode enabled: 5-minute scans, lower thresholds, priority keywords active',
      });
    } else {
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
        mode: 'standard',
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
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
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

/**
 * POST /api/autonomous-control/turbo-mode
 * Enable turbo mode for maximum revenue generation
 * Optimized settings for hitting revenue targets quickly
 */
router.post('/turbo-mode', async (req: Request, res: Response) => {
  try {
    // Stop existing listing if running
    autonomousListing.stop();
    
    // Start in turbo mode
    await autonomousListing.start('turbo');
    
    res.status(200).json({
      success: true,
      message: '⚡ TURBO MODE ACTIVATED!',
      description: 'System is now optimized for maximum revenue generation',
      status: autonomousListing.getStatus(),
      optimizations: [
        '🚀 Scanning every 5 minutes (12x faster)',
        '📉 Lower score threshold (60 vs 75) - more opportunities',
        '💵 Lower profit minimum ($15 vs $20) - higher volume',
        '📦 50 listings per scan (5x more)',
        '🎯 Priority keywords targeting high-margin items',
        '📊 Focus on Electronics, Gaming, Collectibles'
      ],
      expectedImpact: {
        opportunityIncrease: '3-5x more opportunities detected',
        listingVolume: '50+ listings per hour',
        revenueProjection: 'Optimized for $10K+ daily targets'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
