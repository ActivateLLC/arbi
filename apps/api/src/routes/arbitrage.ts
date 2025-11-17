import { Router, Request, Response, NextFunction } from 'express';
import {
  ArbitrageEngine,
  WebScraperScout,
  EbayScout,
  RainforestScout,
  type UserBudgetSettings,
  type ScoutConfig
} from '@arbi/arbitrage-engine';

import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Initialize arbitrage engine
const arbitrageEngine = new ArbitrageEngine();

// Enable real data scouts based on available API keys
let scoutsEnabled = 0;

// Rainforest API Scout (Amazon data without Amazon API)
if (process.env.RAINFOREST_API_KEY) {
  const rainforestScout = new RainforestScout(process.env.RAINFOREST_API_KEY);
  arbitrageEngine.registerScout(rainforestScout);
  console.log('✅ Rainforest Scout enabled (Amazon data)');
  scoutsEnabled++;
}

// eBay Scout (if you get API access)
if (process.env.EBAY_APP_ID) {
  const ebayScout = new EbayScout(process.env.EBAY_APP_ID);
  arbitrageEngine.registerScout(ebayScout);
  console.log('✅ eBay Scout enabled');
  scoutsEnabled++;
}

// Web Scraper Scout (requires Playwright browsers installed)
if (process.env.ENABLE_WEB_SCRAPER === 'true') {
  const webScraperScout = new WebScraperScout();
  arbitrageEngine.registerScout(webScraperScout);
  console.log('✅ Web Scraper Scout enabled');
  scoutsEnabled++;
}

if (scoutsEnabled === 0) {
  console.log('🔧 Arbitrage engine initialized with mock data scout only');
  console.log('ℹ️  To enable real data, set one or more API keys:');
  console.log('   - RAINFOREST_API_KEY (Amazon data - https://www.rainforestapi.com/)');
  console.log('   - EBAY_APP_ID (eBay data - https://developer.ebay.com/join/)');
  console.log('   - ENABLE_WEB_SCRAPER=true (Web scraping)');
} else {
  console.log(`✅ ${scoutsEnabled} real data scout(s) enabled + 1 mock scout`);
}

// Default user settings (in production, this would come from database)
const defaultUserSettings: UserBudgetSettings = {
  dailyLimit: 1000,
  perOpportunityMax: 400,
  monthlyLimit: 10000,
  reserveFund: 1000,
  riskTolerance: 'moderate',
  enabledStrategies: ['ecommerce_arbitrage']
};

// GET /api/arbitrage/health
router.get('/health', (req: Request, res: Response) => {
  const enabledScouts = [];

  if (process.env.RAINFOREST_API_KEY) {
    enabledScouts.push('Rainforest Scout (Amazon)');
  }
  if (process.env.EBAY_APP_ID) {
    enabledScouts.push('eBay Scout');
  }
  if (process.env.ENABLE_WEB_SCRAPER === 'true') {
    enabledScouts.push('Web Scraper');
  }

  enabledScouts.push('E-Commerce Mock Scout');

  res.status(200).json({
    status: 'ok',
    message: 'Arbitrage Engine is operational',
    scoutsEnabled: enabledScouts.length,
    scouts: enabledScouts,
    apiKeysConfigured: {
      rainforest: !!process.env.RAINFOREST_API_KEY,
      ebay: !!process.env.EBAY_APP_ID,
      webScraper: process.env.ENABLE_WEB_SCRAPER === 'true'
    }
  });
});

// GET /api/arbitrage/opportunities
router.get('/opportunities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string || 'demo-user';

    // Get filters from query parameters
    const minProfit = req.query.minProfit ? parseFloat(req.query.minProfit as string) : 10;
    const minROI = req.query.minROI ? parseFloat(req.query.minROI as string) : 10;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : 500;

    const config: ScoutConfig = {
      enabled: true,
      scanInterval: 60,
      sources: ['amazon', 'ebay'],
      filters: {
        minProfit,
        minROI,
        maxPrice
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

    // Debug mode: return all opportunities
    const returnAll = req.query.all === 'true';

    res.status(200).json({
      totalFound: opportunities.length,
      recommended: recommended.length,
      opportunities: returnAll ? analyzed : recommended,
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
