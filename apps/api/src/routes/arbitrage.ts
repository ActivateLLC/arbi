import { Router, Request, Response, NextFunction } from 'express';
import { ArbitrageEngine, type UserBudgetSettings, type ScoutConfig } from '@arbi/arbitrage-engine';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize arbitrage engine
const arbitrageEngine = new ArbitrageEngine();

// Default user settings (in production, this would come from database)
const defaultUserSettings: UserBudgetSettings = {
  dailyLimit: 500,
  perOpportunityMax: 200,
  monthlyLimit: 5000,
  reserveFund: 1000,
  riskTolerance: 'moderate',
  enabledStrategies: ['ecommerce_arbitrage']
};

// GET /api/arbitrage/health
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Arbitrage Engine is operational',
    activeScouts: 1
  });
});

// GET /api/arbitrage/opportunities
router.get('/opportunities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string || 'demo-user';

    const config: ScoutConfig = {
      enabled: true,
      scanInterval: 60,
      sources: ['amazon', 'ebay'],
      filters: {
        minProfit: 20,
        minROI: 20,
        maxPrice: 500
      }
    };

    // Find opportunities
    const opportunities = await arbitrageEngine.findOpportunities(config);

    // Analyze each opportunity
    const analyzed = await Promise.all(
      opportunities.map(async (opp) => {
        const evaluation = await arbitrageEngine.evaluateOpportunity(
          opp,
          userId,
          defaultUserSettings
        );
        return {
          opportunity: opp,
          ...evaluation
        };
      })
    );

    // Filter to only recommended opportunities
    const recommended = analyzed.filter(a => a.recommended);

    res.status(200).json({
      totalFound: opportunities.length,
      recommended: recommended.length,
      opportunities: recommended,
      settings: defaultUserSettings
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/arbitrage/evaluate
router.post('/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId, userId } = req.body;

    if (!opportunityId) {
      throw new ApiError('Opportunity ID is required', 400);
    }

    // In production, fetch opportunity from database
    // For now, return mock evaluation
    res.status(200).json({
      message: 'Opportunity evaluation complete',
      evaluation: {
        score: 85,
        recommended: true,
        estimatedProfit: 125.50,
        risk: 'low'
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/arbitrage/execute
router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId, userId } = req.body;

    if (!opportunityId) {
      throw new ApiError('Opportunity ID is required', 400);
    }

    // In production:
    // 1. Verify user has funds
    // 2. Execute purchase using payment processor
    // 3. Create listing on sell platform
    // 4. Track execution status

    res.status(200).json({
      message: 'Opportunity execution initiated',
      executionId: `exec-${Date.now()}`,
      status: 'pending',
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/arbitrage/settings
router.get('/settings', (req: Request, res: Response) => {
  const userId = req.query.userId as string || 'demo-user';

  res.status(200).json({
    userId,
    settings: defaultUserSettings,
    spending: {
      daily: 120,
      monthly: 850,
      dailyRemaining: 380,
      monthlyRemaining: 4150
    }
  });
});

// PUT /api/arbitrage/settings
router.put('/settings', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, settings } = req.body;

    if (!settings) {
      throw new ApiError('Settings are required', 400);
    }

    // In production, save to database
    res.status(200).json({
      message: 'Settings updated successfully',
      userId,
      settings
    });
  } catch (error) {
    next(error);
  }
});

export default router;
