import type { Opportunity, UserBudgetSettings, RiskAssessment } from '../types';
import { MarketIndicatorService } from '../market-indicators';

export class RiskManager {
  private userSpending: Map<string, { daily: number; monthly: number; lastReset: Date }> = new Map();
  private marketIndicatorService: MarketIndicatorService;

  constructor() {
    this.marketIndicatorService = new MarketIndicatorService();
  }

  async assessRisk(
    opportunity: Opportunity,
    userId: string,
    settings: UserBudgetSettings
  ): Promise<RiskAssessment> {
    // Get current market conditions including VIX
    const marketConditions = await this.marketIndicatorService.getMarketConditions();
    
    const budgetCheck = this.checkBudget(opportunity, userId, settings);
    const riskScore = this.calculateRiskScore(opportunity, settings, marketConditions);
    const reasons = this.getRiskReasons(opportunity, budgetCheck, riskScore, settings, marketConditions);

    // Don't approve if market conditions warrant pausing
    const marketPause = this.marketIndicatorService.shouldPauseArbitrage(marketConditions);
    const approved = budgetCheck.passed && this.isRiskAcceptable(riskScore, settings.riskTolerance) && !marketPause;

    return {
      approved,
      budgetCheck,
      riskScore,
      reasons
    };
  }

  private checkBudget(
    opportunity: Opportunity,
    userId: string,
    settings: UserBudgetSettings
  ): { passed: boolean; dailyRemaining: number; monthlyRemaining: number } {
    const spending = this.getUserSpending(userId);

    // Reset counters if needed
    const now = new Date();
    if (this.shouldResetDaily(spending.lastReset, now)) {
      spending.daily = 0;
    }
    if (this.shouldResetMonthly(spending.lastReset, now)) {
      spending.monthly = 0;
    }

    const dailyRemaining = settings.dailyLimit - spending.daily;
    const monthlyRemaining = settings.monthlyLimit - spending.monthly;

    const passed =
      opportunity.buyPrice <= settings.perOpportunityMax &&
      opportunity.buyPrice <= dailyRemaining &&
      opportunity.buyPrice <= monthlyRemaining;

    return { passed, dailyRemaining, monthlyRemaining };
  }

  private calculateRiskScore(opportunity: Opportunity, settings: UserBudgetSettings, marketConditions: import('../market-indicators').MarketConditions): number {
    let riskScore = 0;

    // Base risk from opportunity
    riskScore += opportunity.volatility * 0.3;

    // Add risk based on capital exposure
    const capitalRisk = (opportunity.buyPrice / settings.monthlyLimit) * 30;
    riskScore += capitalRisk;

    // Add risk for low confidence
    riskScore += (100 - opportunity.confidence) * 0.2;

    // Add risk for long time to profit
    riskScore += Math.min(opportunity.estimatedTimeToProfit * 2, 20);

    // Apply market condition risk adjustment based on VIX
    riskScore *= marketConditions.riskAdjustment;

    return Math.min(Math.round(riskScore), 100);
  }

  private isRiskAcceptable(riskScore: number, tolerance: UserBudgetSettings['riskTolerance']): boolean {
    switch (tolerance) {
      case 'conservative':
        return riskScore <= 30;
      case 'moderate':
        return riskScore <= 60;
      case 'aggressive':
        return riskScore <= 85;
      default:
        return false;
    }
  }

  private getRiskReasons(
    opportunity: Opportunity,
    budgetCheck: { passed: boolean; dailyRemaining: number; monthlyRemaining: number },
    riskScore: number,
    settings: UserBudgetSettings,
    marketConditions: import('../market-indicators').MarketConditions
  ): string[] {
    const reasons: string[] = [];

    if (!budgetCheck.passed) {
      if (opportunity.buyPrice > settings.perOpportunityMax) {
        reasons.push(`Exceeds per-opportunity limit of $${settings.perOpportunityMax}`);
      }
      if (opportunity.buyPrice > budgetCheck.dailyRemaining) {
        reasons.push(`Would exceed daily budget ($${budgetCheck.dailyRemaining} remaining)`);
      }
      if (opportunity.buyPrice > budgetCheck.monthlyRemaining) {
        reasons.push(`Would exceed monthly budget ($${budgetCheck.monthlyRemaining} remaining)`);
      }
    }

    if (!this.isRiskAcceptable(riskScore, settings.riskTolerance)) {
      reasons.push(`Risk score ${riskScore} exceeds ${settings.riskTolerance} tolerance`);
    }

    if (!settings.enabledStrategies.includes(opportunity.type)) {
      reasons.push(`Strategy ${opportunity.type} is not enabled in user settings`);
    }

    // Add market condition reasons
    if (this.marketIndicatorService.shouldPauseArbitrage(marketConditions)) {
      reasons.push(`Market conditions unfavorable (VIX: ${marketConditions.vix.toFixed(1)}) - arbitrage paused`);
    }

    return reasons;
  }

  recordSpending(userId: string, amount: number): void {
    const spending = this.getUserSpending(userId);
    spending.daily += amount;
    spending.monthly += amount;
    spending.lastReset = new Date();
  }

  private getUserSpending(userId: string): { daily: number; monthly: number; lastReset: Date } {
    if (!this.userSpending.has(userId)) {
      this.userSpending.set(userId, {
        daily: 0,
        monthly: 0,
        lastReset: new Date()
      });
    }
    return this.userSpending.get(userId)!;
  }

  private shouldResetDaily(lastReset: Date, now: Date): boolean {
    return lastReset.getDate() !== now.getDate();
  }

  private shouldResetMonthly(lastReset: Date, now: Date): boolean {
    return lastReset.getMonth() !== now.getMonth();
  }
}
