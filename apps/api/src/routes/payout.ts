import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * Automated Profit Payout System
 *
 * Workflow:
 * 1. Opportunity is executed (product bought and sold)
 * 2. Profit is calculated
 * 3. Platform takes 25% commission
 * 4. User gets 75% transferred to their bank via Stripe
 */

interface ExecutedTrade {
  opportunityId: string;
  productTitle: string;
  buyPrice: number;
  sellPrice: number;
  actualProfit: number;
  executedAt: Date;
}

interface PayoutResult {
  tradeId: string;
  grossProfit: number;
  platformCommission: number;
  userPayout: number;
  stripeFee: number;
  netUserPayout: number;
  transferId?: string;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}

// In production, this would come from database
const mockExecutedTrades: ExecutedTrade[] = [];

/**
 * POST /api/payout/execute
 * Execute a trade and automatically payout profits
 */
router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId, buyPrice, sellPrice, productTitle } = req.body;

    if (!opportunityId || !buyPrice || !sellPrice) {
      throw new ApiError(400, 'Missing required fields: opportunityId, buyPrice, sellPrice');
    }

    // Calculate actual profit (in production, this would be real transaction data)
    const actualProfit = sellPrice - buyPrice;

    // Record the executed trade
    const trade: ExecutedTrade = {
      opportunityId,
      productTitle: productTitle || 'Unknown Product',
      buyPrice,
      sellPrice,
      actualProfit,
      executedAt: new Date()
    };

    mockExecutedTrades.push(trade);

    // Calculate payout
    const payoutResult = await processProfitPayout(trade);

    res.status(200).json({
      success: true,
      trade,
      payout: payoutResult,
      message: `Trade executed! $${payoutResult.netUserPayout.toFixed(2)} transferred to your bank account.`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payout/history
 * Get payout history
 */
router.get('/history', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;

  // In production, fetch from database
  const history = mockExecutedTrades
    .slice(-limit)
    .reverse()
    .map(trade => ({
      ...trade,
      payout: calculatePayout(trade.actualProfit)
    }));

  const totalStats = {
    totalTrades: mockExecutedTrades.length,
    totalGrossProfit: mockExecutedTrades.reduce((sum, t) => sum + t.actualProfit, 0),
    totalUserPayouts: mockExecutedTrades.reduce((sum, t) => {
      const payout = calculatePayout(t.actualProfit);
      return sum + payout.netUserPayout;
    }, 0),
    totalPlatformCommission: mockExecutedTrades.reduce((sum, t) => {
      const payout = calculatePayout(t.actualProfit);
      return sum + payout.platformCommission;
    }, 0)
  };

  res.status(200).json({
    history,
    stats: totalStats
  });
});

/**
 * POST /api/payout/auto-enable
 * Enable automatic profit payouts
 */
router.post('/auto-enable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      bankAccountId,
      minProfitThreshold = 10,
      payoutSchedule = 'immediate' // immediate, daily, weekly
    } = req.body;

    if (!bankAccountId) {
      throw new ApiError(400, 'Bank account ID required');
    }

    // In production, save to database
    const config = {
      userId: 'demo-user', // Would come from auth
      bankAccountId,
      minProfitThreshold,
      payoutSchedule,
      enabled: true,
      createdAt: new Date()
    };

    res.status(200).json({
      success: true,
      message: 'Automatic payouts enabled',
      config,
      info: {
        commission: '25% platform fee',
        userShare: '75% of profits',
        stripeFee: '2.9% + $0.30 per transfer',
        schedule: payoutSchedule
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate payout breakdown
 */
function calculatePayout(grossProfit: number): Omit<PayoutResult, 'tradeId' | 'transferId' | 'status'> {
  const platformCommission = grossProfit * 0.25; // 25% to platform
  const userPayout = grossProfit * 0.75;         // 75% to user

  // Stripe transfer fees: 2.9% + $0.30
  const stripeFee = (userPayout * 0.029) + 0.30;
  const netUserPayout = userPayout - stripeFee;

  return {
    grossProfit,
    platformCommission,
    userPayout,
    stripeFee,
    netUserPayout
  };
}

/**
 * Process profit payout via Stripe
 */
async function processProfitPayout(trade: ExecutedTrade): Promise<PayoutResult> {
  const payout = calculatePayout(trade.actualProfit);

  try {
    // In production, this would use actual Stripe API via MCP
    // For now, simulating the transfer
    const mockTransferId = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`💰 Payout Processing:`);
    console.log(`   Trade: ${trade.productTitle}`);
    console.log(`   Gross Profit: $${payout.grossProfit.toFixed(2)}`);
    console.log(`   Platform Commission (25%): $${payout.platformCommission.toFixed(2)}`);
    console.log(`   User Share (75%): $${payout.userPayout.toFixed(2)}`);
    console.log(`   Stripe Fee: $${payout.stripeFee.toFixed(2)}`);
    console.log(`   NET to User's Bank: $${payout.netUserPayout.toFixed(2)}`);
    console.log(`   Transfer ID: ${mockTransferId}`);

    // Simulated Stripe transfer
    // In production with MCP Stripe:
    // const transfer = await stripe.transfers.create({
    //   amount: Math.round(payout.netUserPayout * 100), // cents
    //   currency: 'usd',
    //   destination: bankAccountId,
    //   description: `Arbitrage profit: ${trade.productTitle}`
    // });

    return {
      tradeId: trade.opportunityId,
      ...payout,
      transferId: mockTransferId,
      status: 'completed'
    };
  } catch (error: any) {
    console.error('Payout failed:', error.message);
    return {
      tradeId: trade.opportunityId,
      ...payout,
      status: 'failed',
      error: error.message
    };
  }
}

export default router;
