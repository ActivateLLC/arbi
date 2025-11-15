import { Router, Request, Response } from 'express';
import {
  AutonomousEngine,
  AutonomousConfig,
} from '@arbi/arbitrage-engine';

const router = Router();

// Global instance (in production, use Redis/database for state management)
const engine = new AutonomousEngine();

// Default configuration
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

let currentConfig = { ...defaultConfig };
let isScanning = false;
let scanIntervalId: NodeJS.Timeout | null = null;

/**
 * GET /api/autonomous/status
 * Get current autonomous system status
 */
router.get('/status', (req: Request, res: Response) => {
  const stats = engine.getStats();

  res.json({
    status: isScanning ? 'running' : 'stopped',
    config: currentConfig,
    stats,
    uptime: process.uptime(),
  });
});

/**
 * POST /api/autonomous/start
 * Start autonomous scanning
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    if (isScanning) {
      return res.status(400).json({
        error: 'Autonomous system is already running',
      });
    }

    // Update config if provided
    if (req.body.config) {
      currentConfig = { ...defaultConfig, ...req.body.config };
    }

    // Run initial scan
    console.log('🤖 Starting autonomous arbitrage system...');
    const opportunities = await engine.runScan(currentConfig);

    // Set up periodic scanning
    scanIntervalId = setInterval(async () => {
      await engine.runScan(currentConfig);
      engine.cleanupExpired();
    }, currentConfig.scanInterval * 60 * 1000);

    isScanning = true;

    res.json({
      success: true,
      message: 'Autonomous system started',
      initialOpportunities: opportunities.length,
      config: currentConfig,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to start autonomous system',
      details: error.message,
    });
  }
});

/**
 * POST /api/autonomous/stop
 * Stop autonomous scanning
 */
router.post('/stop', (req: Request, res: Response) => {
  if (!isScanning) {
    return res.status(400).json({
      error: 'Autonomous system is not running',
    });
  }

  if (scanIntervalId) {
    clearInterval(scanIntervalId);
    scanIntervalId = null;
  }

  isScanning = false;

  const stats = engine.getStats();

  res.json({
    success: true,
    message: 'Autonomous system stopped',
    finalStats: stats,
  });
});

/**
 * GET /api/autonomous/opportunities
 * Get current opportunities
 */
router.get('/opportunities', (req: Request, res: Response) => {
  const { minScore, status, limit } = req.query;

  const opportunities = engine.getOpportunities({
    minScore: minScore ? parseInt(minScore as string) : undefined,
    status: status as string,
    limit: limit ? parseInt(limit as string) : 50,
  });

  res.json({
    total: opportunities.length,
    opportunities: opportunities.map((opp) => ({
      id: opp.id,
      product: {
        id: opp.product.id,
        title: opp.product.title,
        price: opp.product.price,
        imageUrl: opp.product.imageUrl,
        url: opp.product.itemWebUrl,
        condition: opp.product.condition,
        seller: opp.product.seller,
      },
      profit: {
        sourcePrice: opp.profit.sourcePrice,
        targetPrice: opp.profit.targetPrice,
        netProfit: opp.profit.netProfit,
        profitMargin: opp.profit.profitMargin,
        roi: opp.profit.roi,
        totalCost: opp.profit.totalCost,
        totalRevenue: opp.profit.totalRevenue,
      },
      score: {
        score: opp.score.score,
        tier: opp.score.tier,
        confidence: opp.score.confidence,
        reasoning: opp.score.reasoning,
        greenFlags: opp.score.greenFlags,
        redFlags: opp.score.redFlags,
      },
      foundAt: opp.foundAt,
      expiresAt: opp.expiresAt,
      status: opp.status,
    })),
  });
});

/**
 * PUT /api/autonomous/config
 * Update autonomous configuration
 */
router.put('/config', (req: Request, res: Response) => {
  try {
    const newConfig = { ...currentConfig, ...req.body };

    // Validate config
    if (newConfig.minScore < 0 || newConfig.minScore > 100) {
      return res.status(400).json({
        error: 'minScore must be between 0 and 100',
      });
    }

    if (newConfig.minROI < 0) {
      return res.status(400).json({
        error: 'minROI must be positive',
      });
    }

    currentConfig = newConfig;

    res.json({
      success: true,
      message: 'Configuration updated',
      config: currentConfig,
      note: isScanning
        ? 'Configuration will apply to next scan'
        : 'Start the system to apply configuration',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update configuration',
      details: error.message,
    });
  }
});

/**
 * GET /api/autonomous/stats
 * Get detailed statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  const stats = engine.getStats();
  const opportunities = engine.getOpportunities();

  // Calculate tier distribution
  const tierDistribution = {
    excellent: opportunities.filter((o) => o.score.tier === 'excellent').length,
    high: opportunities.filter((o) => o.score.tier === 'high').length,
    medium: opportunities.filter((o) => o.score.tier === 'medium').length,
    low: opportunities.filter((o) => o.score.tier === 'low').length,
  };

  // Calculate profit ranges
  const profitRanges = {
    under10: opportunities.filter((o) => o.profit.netProfit < 10).length,
    from10to20: opportunities.filter(
      (o) => o.profit.netProfit >= 10 && o.profit.netProfit < 20
    ).length,
    from20to50: opportunities.filter(
      (o) => o.profit.netProfit >= 20 && o.profit.netProfit < 50
    ).length,
    over50: opportunities.filter((o) => o.profit.netProfit >= 50).length,
  };

  res.json({
    ...stats,
    isRunning: isScanning,
    config: currentConfig,
    distribution: {
      byTier: tierDistribution,
      byProfit: profitRanges,
    },
  });
});

/**
 * POST /api/autonomous/scan-now
 * Trigger an immediate scan (regardless of schedule)
 */
router.post('/scan-now', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Running manual scan...');
    const opportunities = await engine.runScan(currentConfig);
    const stats = engine.getStats();

    res.json({
      success: true,
      message: 'Scan completed',
      opportunitiesFound: opportunities.length,
      stats,
      opportunities: opportunities.slice(0, 10), // Top 10
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Scan failed',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/autonomous/opportunities
 * Clear all opportunities
 */
router.delete('/opportunities', (req: Request, res: Response) => {
  engine.cleanupExpired();
  engine.resetDailyCounters();

  res.json({
    success: true,
    message: 'Opportunities cleared and counters reset',
  });
});

export default router;
