import type { Opportunity, OpportunityAnalysis } from '../types';
import { VixMonitorService, type MarketCondition } from '../services/VixMonitorService';

export class OpportunityAnalyzer {
  private vixService: VixMonitorService;

  constructor(vixService?: VixMonitorService) {
    this.vixService = vixService || new VixMonitorService();
  }

  async analyzeOpportunity(opportunity: Opportunity): Promise<OpportunityAnalysis> {
    // Get market condition from VIX
    const marketCondition = await this.vixService.getMarketCondition();
    
    const score = this.calculateScore(opportunity, marketCondition);
    const reasons = this.getReasons(opportunity, score);
    const warnings = await this.getWarnings(opportunity, marketCondition);
    const estimatedOutcome = this.calculateOutcomes(opportunity);

    return {
      opportunity,
      score,
      shouldExecute: score >= 50 && warnings.length === 0,
      reasons,
      warnings,
      estimatedOutcome,
      marketCondition: {
        vixLevel: marketCondition.vix.level,
        vixValue: marketCondition.vix.value,
        description: marketCondition.vix.description,
        recommendation: marketCondition.recommendation
      }
    };
  }

  private calculateScore(opp: Opportunity, marketCondition: MarketCondition): number {
    let score = 0;

    // Profit potential (0-30 points)
    const profitScore = Math.min((opp.roi / 100) * 30, 30);
    score += profitScore;

    // Confidence (0-25 points) - adjusted by market conditions
    const baseConfidenceScore = (opp.confidence / 100) * 25;
    const confidenceScore = baseConfidenceScore * marketCondition.confidenceAdjustment;
    score += confidenceScore;

    // Speed to profit (0-20 points)
    const speedScore = Math.max(0, 20 - opp.estimatedTimeToProfit);
    score += speedScore;

    // Risk level (0-15 points)
    const riskScore = opp.riskLevel === 'low' ? 15 : opp.riskLevel === 'medium' ? 10 : 5;
    score += riskScore;

    // Volatility (0-10 points, inverted) - adjusted by market VIX
    const baseVolatilityScore = Math.max(0, 10 - (opp.volatility / 10));
    // Apply market volatility adjustment (higher VIX = lower score)
    const volatilityScore = baseVolatilityScore / marketCondition.volatilityAdjustment;
    score += volatilityScore;

    return Math.round(score);
  }

  private getReasons(opp: Opportunity, score: number): string[] {
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

    return reasons;
  }

  private async getWarnings(opp: Opportunity, marketCondition: MarketCondition): Promise<string[]> {
    const warnings: string[] = [];

    // Market condition warnings based on VIX
    if (marketCondition.vix.level === 'extreme') {
      warnings.push(`⚠️ EXTREME market volatility (VIX: ${marketCondition.vix.value}) - High risk environment`);
    } else if (marketCondition.vix.level === 'high') {
      warnings.push(`⚠️ Elevated market volatility (VIX: ${marketCondition.vix.value}) - Exercise caution`);
    }

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

    return warnings;
  }

  private calculateOutcomes(opp: Opportunity): { bestCase: number; worstCase: number; likelyCase: number } {
    const bestCase = opp.estimatedProfit * 1.2; // 20% better than expected
    const worstCase = opp.estimatedProfit * 0.5; // Could be half if market changes
    const likelyCase = opp.estimatedProfit * 0.9; // 90% of estimate (accounting for fees, etc)

    return {
      bestCase: Math.round(bestCase * 100) / 100,
      worstCase: Math.round(worstCase * 100) / 100,
      likelyCase: Math.round(likelyCase * 100) / 100
    };
  }
}
