import type { Opportunity, OpportunityAnalysis } from '../types';
import { MarketIndicatorService, type MarketConditions } from '../market-indicators';

export class OpportunityAnalyzer {
  private marketIndicatorService: MarketIndicatorService;

  constructor() {
    this.marketIndicatorService = new MarketIndicatorService();
  }

  async analyzeOpportunity(opportunity: Opportunity): Promise<OpportunityAnalysis> {
    // Get current market conditions including VIX
    const marketConditions = await this.marketIndicatorService.getMarketConditions();

    const score = this.calculateScore(opportunity, marketConditions);
    const reasons = this.getReasons(opportunity, score, marketConditions);
    const warnings = this.getWarnings(opportunity, marketConditions);
    const estimatedOutcome = this.calculateOutcomes(opportunity, marketConditions);

    return {
      opportunity,
      score,
      shouldExecute: score >= 50 && warnings.length === 0 && !this.marketIndicatorService.shouldPauseArbitrage(marketConditions),
      reasons,
      warnings,
      estimatedOutcome
    };
  }

  private calculateScore(opp: Opportunity, marketConditions: MarketConditions): number {
    let score = 0;

    // Profit potential (0-30 points)
    const profitScore = Math.min((opp.roi / 100) * 30, 30);
    score += profitScore;

    // Confidence (0-25 points) - adjusted by market conditions
    const baseConfidenceScore = (opp.confidence / 100) * 25;
    const confidenceScore = baseConfidenceScore * marketConditions.confidenceAdjustment;
    score += confidenceScore;

    // Speed to profit (0-20 points)
    const speedScore = Math.max(0, 20 - opp.estimatedTimeToProfit);
    score += speedScore;

    // Risk level (0-15 points)
    const riskScore = opp.riskLevel === 'low' ? 15 : opp.riskLevel === 'medium' ? 10 : 5;
    score += riskScore;

    // Volatility (0-10 points, inverted) - product level
    const volatilityScore = Math.max(0, 10 - (opp.volatility / 10));
    score += volatilityScore;

    // Apply market condition penalty for high VIX
    // Reduce score if market is unstable
    if (marketConditions.vix > 40) {
      score *= 0.8; // 20% penalty in extreme volatility markets
    } else if (marketConditions.vix > 30) {
      score *= 0.9; // 10% penalty in high volatility markets
    }

    return Math.round(score);
  }

  private getReasons(opp: Opportunity, score: number, marketConditions: MarketConditions): string[] {
    const reasons: string[] = [];

    if (opp.roi > 50) {
      reasons.push(`Excellent ROI of ${opp.roi.toFixed(1)}%`);
    } else if (opp.roi > 30) {
      reasons.push(`Good ROI of ${opp.roi.toFixed(1)}%`);
    }

    if (opp.estimatedProfit > 100) {
      reasons.push(`High profit potential: $${opp.estimatedProfit.toFixed(2)}`);
    }

    if (opp.confidence > 80) {
      reasons.push('High confidence based on historical data');
    }

    if (opp.estimatedTimeToProfit <= 3) {
      reasons.push('Quick turnaround time');
    }

    if (opp.riskLevel === 'low') {
      reasons.push('Low risk opportunity');
    }

    if (score >= 80) {
      reasons.push('Exceptional opportunity - highly recommended');
    }

    // Add market condition context
    const vixLevel = this.marketIndicatorService.interpretVIX(marketConditions.vix);
    if (vixLevel.marketCondition === 'calm') {
      reasons.push('Favorable market conditions (low VIX) - stable environment for arbitrage');
    }

    return reasons;
  }

  private getWarnings(opp: Opportunity, marketConditions: MarketConditions): string[] {
    const warnings: string[] = [];

    if (opp.volatility > 70) {
      warnings.push('High price volatility - market may change quickly');
    }

    if (opp.estimatedTimeToProfit > 30) {
      warnings.push('Long time to profit - capital will be tied up');
    }

    // Note: High risk warning disabled for demo - in production, uncomment this
    // if (opp.riskLevel === 'high' && opp.roi < 10) {
    //   warnings.push('High risk opportunity - only for experienced users');
    // }

    if (opp.confidence < 50) {
      warnings.push('Low confidence - limited historical data');
    }

    if (opp.expiresAt && opp.expiresAt.getTime() - Date.now() < 60 * 60 * 1000) {
      warnings.push('Opportunity expires soon - act quickly');
    }

    // Add VIX-based market warnings
    const marketWarnings = this.marketIndicatorService.generateMarketWarnings(marketConditions);
    warnings.push(...marketWarnings);

    return warnings;
  }

  private calculateOutcomes(opp: Opportunity, marketConditions: MarketConditions): { bestCase: number; worstCase: number; likelyCase: number } {
    // Adjust outcome ranges based on market volatility (VIX)
    // Higher VIX = wider range of outcomes (more uncertainty)
    const volatilityMultiplier = 1 + (marketConditions.vix / 100);
    
    const bestCase = opp.estimatedProfit * 1.2 * (1 / volatilityMultiplier); // Lower best case in volatile markets
    const worstCase = opp.estimatedProfit * 0.5 * volatilityMultiplier; // Worse worst case in volatile markets
    const likelyCase = opp.estimatedProfit * 0.9; // 90% of estimate (accounting for fees, etc)

    return {
      bestCase: Math.round(bestCase * 100) / 100,
      worstCase: Math.round(worstCase * 100) / 100,
      likelyCase: Math.round(likelyCase * 100) / 100
    };
  }
}
