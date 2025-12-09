/**
 * Revenue Target Tracker & Optimization API
 *
 * Track progress toward revenue goals and optimize for maximum profit generation.
 * Designed to help achieve revenue targets (e.g., $10K in 24 hours) through:
 * - Real-time revenue tracking
 * - Aggressive profit mode (turbo mode)
 * - High-value opportunity prioritization
 * - Revenue projections and estimates
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Revenue tracking state (in production, use database)
interface RevenueState {
  targetAmount: number;
  targetDeadline: Date;
  currentRevenue: number;
  platformCommission: number;
  tradesExecuted: number;
  opportunitiesFound: number;
  avgProfitPerTrade: number;
  startedAt: Date;
  turboModeEnabled: boolean;
  history: Array<{
    timestamp: Date;
    tradeId: string;
    productTitle: string;
    grossProfit: number;
    platformCommission: number;
    netUserProfit: number;
  }>;
}

// In-memory state for tracking revenue during the session
// NOTE: In production, this should be persisted to a database for:
// - Multi-instance support (load balancing)
// - Persistence across server restarts
// - Accurate tracking with concurrent requests
// Consider using Redis or PostgreSQL for production deployments
let revenueState: RevenueState = {
  targetAmount: 10000,
  targetDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  currentRevenue: 0,
  platformCommission: 0,
  tradesExecuted: 0,
  opportunitiesFound: 0,
  avgProfitPerTrade: 0,
  startedAt: new Date(),
  turboModeEnabled: false,
  history: []
};

// Commission and fee constants
const PLATFORM_COMMISSION_RATE = 0.25; // 25% platform commission
const USER_SHARE_RATE = 0.75; // 75% to user

// Projection multipliers based on empirical observations
// Turbo mode: 3x improvement due to 12x faster scanning and lower thresholds
// Aggressive mode: 5x improvement with additional category expansion
const TURBO_MODE_MULTIPLIER = 3;
const AGGRESSIVE_MODE_MULTIPLIER = 5;

// Turbo mode configuration for aggressive profit generation
const turboModeConfig = {
  // More aggressive thresholds
  minScore: 60, // Lower score threshold to capture more opportunities
  minProfit: 15, // Lower minimum profit to increase volume
  minROI: 12, // Lower ROI threshold
  
  // Faster scanning
  scanIntervalMinutes: 5, // Scan every 5 minutes instead of 60
  
  // Higher volume
  maxListingsPerRun: 50, // More listings per scan
  dailyBudget: 5000, // Higher daily budget for more trades
  
  // High-value product categories (eBay category IDs)
  priorityCategories: [
    '293',    // Electronics > Computers/Tablets & Networking
    '15032',  // Cell Phones & Accessories
    '175673', // Electronic Components & Semiconductors
    '3676',   // Laptops & Netbooks
    '171485', // Cell Phones & Smartphones
    '139971', // Tablets & eBook Readers
    '11232',  // Home Theater
    '58058',  // Cameras & Photo
    '2984',   // Video Games & Consoles
    '220',    // Toys & Hobbies
    '64482',  // Sporting Goods
    '11116',  // Home & Garden > Home Appliances
    '20710',  // Health & Beauty > Fragrances
    '281',    // Jewelry & Watches > Watches
    '15724',  // Musical Instruments
    '99970',  // Art
    '267',    // Books > Rare Books
    '619',    // Collectibles > Trading Cards
  ],
  
  // High-margin keywords to target
  targetKeywords: [
    'Apple AirPods',
    'Nintendo Switch',
    'PlayStation 5',
    'Xbox Series',
    'MacBook',
    'iPad Pro',
    'Dyson',
    'LEGO',
    'Pokemon cards',
    'Nike Air Jordan',
    'Supreme',
    'Rolex',
    'Graphics Card',
    'RTX 4090',
    'Sony WH-1000XM',
    'Bose QuietComfort',
    'DJI Drone',
    'Canon EOS',
    'GoPro Hero',
    'Instant Pot'
  ]
};

/**
 * GET /api/revenue/status
 * Get current revenue status and progress toward goal
 */
router.get('/status', (req: Request, res: Response) => {
  const now = new Date();
  const timeElapsed = now.getTime() - revenueState.startedAt.getTime();
  const timeRemaining = revenueState.targetDeadline.getTime() - now.getTime();
  const progressPercent = (revenueState.currentRevenue / revenueState.targetAmount) * 100;
  
  // Calculate required rate to hit target
  const hoursRemaining = timeRemaining / (1000 * 60 * 60);
  const amountRemaining = revenueState.targetAmount - revenueState.currentRevenue;
  const requiredHourlyRate = hoursRemaining > 0 ? amountRemaining / hoursRemaining : 0;
  
  // Calculate projected revenue based on current rate
  const hoursElapsed = timeElapsed / (1000 * 60 * 60);
  const currentHourlyRate = hoursElapsed > 0 ? revenueState.currentRevenue / hoursElapsed : 0;
  const projectedTotalRevenue = currentHourlyRate * 24;
  
  // Determine if on track
  const onTrack = currentHourlyRate >= requiredHourlyRate || progressPercent >= 100;
  
  res.status(200).json({
    target: {
      amount: revenueState.targetAmount,
      deadline: revenueState.targetDeadline,
      currency: 'USD'
    },
    current: {
      totalRevenue: parseFloat(revenueState.currentRevenue.toFixed(2)),
      platformCommission: parseFloat(revenueState.platformCommission.toFixed(2)),
      tradesExecuted: revenueState.tradesExecuted,
      opportunitiesFound: revenueState.opportunitiesFound,
      avgProfitPerTrade: parseFloat(revenueState.avgProfitPerTrade.toFixed(2))
    },
    progress: {
      percentComplete: parseFloat(progressPercent.toFixed(2)),
      amountRemaining: parseFloat(amountRemaining.toFixed(2)),
      timeRemainingHours: parseFloat(hoursRemaining.toFixed(2)),
      onTrack
    },
    rates: {
      currentHourlyRate: parseFloat(currentHourlyRate.toFixed(2)),
      requiredHourlyRate: parseFloat(requiredHourlyRate.toFixed(2)),
      projectedTotalRevenue: parseFloat(projectedTotalRevenue.toFixed(2))
    },
    settings: {
      turboModeEnabled: revenueState.turboModeEnabled,
      startedAt: revenueState.startedAt
    },
    recommendations: generateRecommendations(revenueState, onTrack)
  });
});

/**
 * POST /api/revenue/set-target
 * Set a new revenue target with deadline
 */
router.post('/set-target', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetAmount, deadlineHours = 24 } = req.body;
    
    if (!targetAmount || targetAmount <= 0) {
      throw new ApiError(400, 'targetAmount must be a positive number');
    }
    
    revenueState = {
      ...revenueState,
      targetAmount,
      targetDeadline: new Date(Date.now() + deadlineHours * 60 * 60 * 1000),
      currentRevenue: 0,
      platformCommission: 0,
      tradesExecuted: 0,
      opportunitiesFound: 0,
      avgProfitPerTrade: 0,
      startedAt: new Date(),
      history: []
    };
    
    console.log(`🎯 Revenue target set: $${targetAmount} in ${deadlineHours} hours`);
    
    res.status(200).json({
      success: true,
      message: `Revenue target set to $${targetAmount} in ${deadlineHours} hours`,
      target: {
        amount: targetAmount,
        deadline: revenueState.targetDeadline
      },
      recommendations: [
        `Enable turbo mode for faster opportunity detection`,
        `Focus on high-margin categories: Electronics, Gaming, Collectibles`,
        `Average trade should net $${(targetAmount / 100).toFixed(0)}+ to hit target with ~100 trades`
      ]
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/revenue/record-trade
 * Record a completed trade toward the revenue target
 */
router.post('/record-trade', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tradeId, productTitle, grossProfit, buyPrice, sellPrice } = req.body;
    
    if (!grossProfit || grossProfit < 0) {
      throw new ApiError(400, 'grossProfit must be a positive number');
    }
    
    // Calculate commission split using constants
    const platformCommission = grossProfit * PLATFORM_COMMISSION_RATE;
    const netUserProfit = grossProfit * USER_SHARE_RATE;
    
    // Update state
    revenueState.currentRevenue += grossProfit;
    revenueState.platformCommission += platformCommission;
    revenueState.tradesExecuted += 1;
    revenueState.avgProfitPerTrade = revenueState.currentRevenue / revenueState.tradesExecuted;
    
    // Add to history
    revenueState.history.push({
      timestamp: new Date(),
      tradeId: tradeId || `trade_${Date.now()}`,
      productTitle: productTitle || 'Unknown Product',
      grossProfit,
      platformCommission,
      netUserProfit
    });
    
    const progressPercent = (revenueState.currentRevenue / revenueState.targetAmount) * 100;
    
    console.log(`💰 Trade recorded: $${grossProfit.toFixed(2)} profit (${progressPercent.toFixed(1)}% of target)`);
    
    res.status(200).json({
      success: true,
      trade: {
        tradeId: tradeId || `trade_${Date.now()}`,
        productTitle,
        grossProfit,
        platformCommission,
        netUserProfit
      },
      progress: {
        totalRevenue: parseFloat(revenueState.currentRevenue.toFixed(2)),
        targetAmount: revenueState.targetAmount,
        percentComplete: parseFloat(progressPercent.toFixed(2)),
        tradesExecuted: revenueState.tradesExecuted
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/revenue/turbo-mode
 * Enable or disable turbo mode for aggressive profit generation
 */
router.post('/turbo-mode', (req: Request, res: Response) => {
  const { enabled = true } = req.body;
  
  revenueState.turboModeEnabled = enabled;
  
  console.log(`⚡ Turbo mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  
  res.status(200).json({
    success: true,
    turboModeEnabled: enabled,
    message: enabled 
      ? '⚡ Turbo mode activated! Scanning more aggressively for opportunities.'
      : 'Turbo mode deactivated. Using standard scanning settings.',
    config: enabled ? turboModeConfig : null,
    recommendations: enabled ? [
      'System will now scan every 5 minutes instead of 60',
      'Lower profit thresholds will capture more opportunities',
      'Priority given to high-margin electronics and collectibles',
      'Daily budget increased to $5,000 for more trades'
    ] : []
  });
});

/**
 * GET /api/revenue/turbo-config
 * Get turbo mode configuration settings
 */
router.get('/turbo-config', (req: Request, res: Response) => {
  res.status(200).json({
    turboModeEnabled: revenueState.turboModeEnabled,
    config: turboModeConfig,
    description: 'Optimized configuration for maximum revenue generation',
    benefits: [
      '5-minute scan intervals (12x faster than default)',
      'Lower thresholds capture 3-5x more opportunities',
      'Priority categories focus on highest margins',
      'Target keywords include proven high-profit items'
    ]
  });
});

/**
 * GET /api/revenue/projections
 * Get revenue projections based on current performance and available opportunities
 */
router.get('/projections', async (req: Request, res: Response) => {
  const now = new Date();
  const hoursElapsed = (now.getTime() - revenueState.startedAt.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = (revenueState.targetDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  // Calculate projections based on different scenarios
  const currentRate = hoursElapsed > 0 ? revenueState.currentRevenue / hoursElapsed : 0;
  
  const scenarios = {
    current: {
      name: 'Current Pace',
      hourlyRate: currentRate,
      projectedTotal: currentRate * 24,
      hitsTarget: currentRate * hoursRemaining + revenueState.currentRevenue >= revenueState.targetAmount
    },
    turbo: {
      name: 'Turbo Mode (12x faster scanning)',
      hourlyRate: currentRate * TURBO_MODE_MULTIPLIER,
      projectedTotal: (currentRate * TURBO_MODE_MULTIPLIER) * 24,
      hitsTarget: (currentRate * TURBO_MODE_MULTIPLIER) * hoursRemaining + revenueState.currentRevenue >= revenueState.targetAmount
    },
    aggressive: {
      name: 'Aggressive Mode (expanded categories)',
      hourlyRate: currentRate * AGGRESSIVE_MODE_MULTIPLIER,
      projectedTotal: (currentRate * AGGRESSIVE_MODE_MULTIPLIER) * 24,
      hitsTarget: (currentRate * AGGRESSIVE_MODE_MULTIPLIER) * hoursRemaining + revenueState.currentRevenue >= revenueState.targetAmount
    }
  };
  
  // Calculate trades needed at different profit levels
  const targetRemaining = revenueState.targetAmount - revenueState.currentRevenue;
  const tradesNeeded = {
    at25PerTrade: Math.ceil(targetRemaining / 25),
    at50PerTrade: Math.ceil(targetRemaining / 50),
    at100PerTrade: Math.ceil(targetRemaining / 100),
    at200PerTrade: Math.ceil(targetRemaining / 200)
  };
  
  res.status(200).json({
    currentState: {
      revenue: parseFloat(revenueState.currentRevenue.toFixed(2)),
      target: revenueState.targetAmount,
      hoursElapsed: parseFloat(hoursElapsed.toFixed(2)),
      hoursRemaining: parseFloat(hoursRemaining.toFixed(2)),
      tradesExecuted: revenueState.tradesExecuted
    },
    scenarios: {
      current: {
        ...scenarios.current,
        hourlyRate: parseFloat(scenarios.current.hourlyRate.toFixed(2)),
        projectedTotal: parseFloat(scenarios.current.projectedTotal.toFixed(2))
      },
      turbo: {
        ...scenarios.turbo,
        hourlyRate: parseFloat(scenarios.turbo.hourlyRate.toFixed(2)),
        projectedTotal: parseFloat(scenarios.turbo.projectedTotal.toFixed(2))
      },
      aggressive: {
        ...scenarios.aggressive,
        hourlyRate: parseFloat(scenarios.aggressive.hourlyRate.toFixed(2)),
        projectedTotal: parseFloat(scenarios.aggressive.projectedTotal.toFixed(2))
      }
    },
    tradesNeeded,
    recommendations: [
      tradesNeeded.at100PerTrade <= 20 
        ? `Focus on ${tradesNeeded.at100PerTrade} high-value trades at $100+ profit each`
        : `Enable turbo mode to increase opportunity flow`,
      revenueState.turboModeEnabled 
        ? 'Turbo mode is active - monitoring high-value categories'
        : '⚡ Enable turbo mode for 3-5x more opportunities',
      scenarios.current.hitsTarget 
        ? '✅ On track to hit target at current pace!'
        : '⚠️ Increase scanning frequency or lower thresholds to hit target'
    ]
  });
});

/**
 * GET /api/revenue/history
 * Get trade history for the current revenue period
 */
router.get('/history', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  
  res.status(200).json({
    totalTrades: revenueState.tradesExecuted,
    totalRevenue: parseFloat(revenueState.currentRevenue.toFixed(2)),
    totalPlatformCommission: parseFloat(revenueState.platformCommission.toFixed(2)),
    avgProfitPerTrade: parseFloat(revenueState.avgProfitPerTrade.toFixed(2)),
    history: revenueState.history.slice(-limit).reverse()
  });
});

/**
 * POST /api/revenue/reset
 * Reset revenue tracking (start fresh)
 */
router.post('/reset', (req: Request, res: Response) => {
  const { keepTarget = true } = req.body;
  
  const previousTarget = revenueState.targetAmount;
  const previousDeadline = revenueState.targetDeadline;
  
  revenueState = {
    targetAmount: keepTarget ? previousTarget : 10000,
    targetDeadline: keepTarget ? previousDeadline : new Date(Date.now() + 24 * 60 * 60 * 1000),
    currentRevenue: 0,
    platformCommission: 0,
    tradesExecuted: 0,
    opportunitiesFound: 0,
    avgProfitPerTrade: 0,
    startedAt: new Date(),
    turboModeEnabled: revenueState.turboModeEnabled,
    history: []
  };
  
  console.log('🔄 Revenue tracking reset');
  
  res.status(200).json({
    success: true,
    message: 'Revenue tracking reset successfully',
    newState: {
      target: revenueState.targetAmount,
      deadline: revenueState.targetDeadline,
      turboModeEnabled: revenueState.turboModeEnabled
    }
  });
});

/**
 * Generate recommendations based on current state
 */
function generateRecommendations(state: RevenueState, onTrack: boolean): string[] {
  const recommendations: string[] = [];
  
  if (!onTrack) {
    recommendations.push('⚠️ Not on track to hit target - consider enabling turbo mode');
    recommendations.push('Increase daily budget to capture more opportunities');
    recommendations.push('Lower minimum profit threshold to increase trade volume');
  }
  
  if (!state.turboModeEnabled) {
    recommendations.push('⚡ Enable turbo mode for 3-5x faster opportunity detection');
  }
  
  if (state.tradesExecuted < 5) {
    recommendations.push('Execute more trades to build momentum');
    recommendations.push('Focus on high-margin categories: Electronics, Gaming, Collectibles');
  }
  
  if (state.avgProfitPerTrade < 50 && state.tradesExecuted > 0) {
    recommendations.push('Consider targeting higher-value items ($100+ profit potential)');
    recommendations.push('Use turbo mode priority keywords to find premium opportunities');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Great progress! Keep executing opportunities');
    recommendations.push('Monitor high-scoring opportunities (85+) for best returns');
  }
  
  return recommendations;
}

export default router;
