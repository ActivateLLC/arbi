import type { Opportunity, OpportunityAnalysis, MarketConditions } from '../types';

export class OpportunityAnalyzer {
  private marketConditions?: MarketConditions;

  /**
   * Set current market conditions for volatility-aware analysis
   */
  setMarketConditions(conditions: MarketConditions): void {
    this.marketConditions = conditions;
  }

  analyzeOpportunity(opportunity: Opportunity): OpportunityAnalysis {
    const score = this.calculateScore(opportunity);
    const reasons = this.getReasons(opportunity, score);
    const warnings = this.getWarnings(opportunity);
    const estimatedOutcome = this.calculateOutcomes(opportunity);

    return {
      opportunity,
      score,
      shouldExecute: score >= 50 && warnings.length === 0,
      reasons,
      warnings,
      estimatedOutcome
    };
  }

  private calculateScore(opp: Opportunity): number {
    let score = 0;

    // Check if this is a volatility strategy
    const isVolatilityStrategy = this.isVolatilityStrategy(opp.type);

    // Profit potential (0-30 points)
    const profitScore = Math.min((opp.roi / 100) * 30, 30);
    score += profitScore;

    // Confidence (0-25 points)
    const confidenceScore = (opp.confidence / 100) * 25;
    score += confidenceScore;

    // Speed to profit (0-20 points)
    const speedScore = Math.max(0, 20 - opp.estimatedTimeToProfit);
    score += speedScore;

    // Risk level (0-15 points)
    const riskScore = opp.riskLevel === 'low' ? 15 : opp.riskLevel === 'medium' ? 10 : 5;
    score += riskScore;

    // Volatility (0-10 points)
    // For volatility strategies, HIGH volatility is GOOD - for others, low is better
    let volatilityScore;
    if (isVolatilityStrategy) {
      // Reward high volatility for bearish/volatility strategies
      volatilityScore = (opp.volatility / 10);
    } else {
      // Penalize high volatility for standard strategies
      volatilityScore = Math.max(0, 10 - (opp.volatility / 10));
    }
    score += volatilityScore;

    // Market conditions bonus for volatility strategies (0-10 bonus points)
    if (isVolatilityStrategy && this.marketConditions) {
      if (this.marketConditions.volatilityState === 'extreme') {
        score += 10; // High volatility = great for volatility strategies
      } else if (this.marketConditions.volatilityState === 'high') {
        score += 5;
      }
    }

    return Math.round(score);
  }

  private isVolatilityStrategy(type: string): boolean {
    const volatilityStrategies = [
      'short_condor',
      'short_strangle', 
      'short_straddle',
      'bearish_spread',
      'volatility_arbitrage'
    ];
    return volatilityStrategies.includes(type);
  }

  private getReasons(opp: Opportunity, score: number): string[] {
    const reasons: string[] = [];
    const isVolatilityStrategy = this.isVolatilityStrategy(opp.type);

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

    // Volatility strategy specific reasons
    if (isVolatilityStrategy) {
      if (opp.volatility > 70) {
        reasons.push('High volatility environment - ideal for volatility strategies');
      }
      if (this.marketConditions && this.marketConditions.vixLevel > 30) {
        reasons.push(`Elevated VIX (${this.marketConditions.vixLevel.toFixed(1)}) - favorable for bearish/volatility plays`);
      }
      if (this.marketConditions && this.marketConditions.trend === 'bearish') {
        reasons.push('Bearish market trend supports strategy');
      }
    }

    if (score >= 80) {
      reasons.push('Exceptional opportunity - highly recommended');
    }

    return reasons;
  }

  private getWarnings(opp: Opportunity): string[] {
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
