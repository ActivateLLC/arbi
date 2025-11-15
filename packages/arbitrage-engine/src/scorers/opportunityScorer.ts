import { ProfitCalculation } from '../calculators/profitCalculator';
import { EbayProduct } from '../scouts/ebayScout';

export interface OpportunityScore {
  score: number; // 0-100
  confidence: number; // 0-1
  tier: 'low' | 'medium' | 'high' | 'excellent';
  reasoning: string[];
  redFlags: string[];
  greenFlags: string[];
}

export interface ScoringFactors {
  profitMargin: number;
  roi: number;
  netProfit: number;
  sellerRating: number;
  competition: number;
  demandScore: number;
  riskScore: number;
}

export class OpportunityScorer {
  /**
   * Score an arbitrage opportunity (0-100)
   * Higher score = better opportunity
   */
  scoreOpportunity(
    product: EbayProduct,
    profit: ProfitCalculation,
    additionalData: {
      amazonCompetitors?: number;
      amazonRank?: number;
      priceHistory?: number[]; // Historical prices
    } = {}
  ): OpportunityScore {
    const factors = this.calculateFactors(product, profit, additionalData);

    // Weighted score calculation
    const score = this.calculateWeightedScore(factors);

    // Determine tier
    let tier: OpportunityScore['tier'];
    if (score >= 90) tier = 'excellent';
    else if (score >= 75) tier = 'high';
    else if (score >= 60) tier = 'medium';
    else tier = 'low';

    // Calculate confidence (how sure we are about the score)
    const confidence = this.calculateConfidence(factors, additionalData);

    // Generate reasoning
    const reasoning: string[] = [];
    const redFlags: string[] = [];
    const greenFlags: string[] = [];

    this.generateInsights(factors, reasoning, redFlags, greenFlags);

    return {
      score: Math.round(score),
      confidence,
      tier,
      reasoning,
      redFlags,
      greenFlags,
    };
  }

  private calculateFactors(
    product: EbayProduct,
    profit: ProfitCalculation,
    additionalData: any
  ): ScoringFactors {
    // Profit margin score (0-30 points)
    const profitMargin = this.scoreProfitMargin(profit.profitMargin);

    // ROI score (0-25 points)
    const roi = this.scoreROI(profit.roi);

    // Absolute profit score (0-15 points)
    const netProfit = this.scoreNetProfit(profit.netProfit);

    // Seller rating score (0-10 points)
    const sellerRating = this.scoreSellerRating(product.seller);

    // Competition score (0-10 points)
    const competition = this.scoreCompetition(additionalData.amazonCompetitors || 0);

    // Demand score (0-10 points)
    const demandScore = this.scoreDemand(additionalData.amazonRank || 0);

    // Risk score (0-10 points, lower is better)
    const riskScore = this.scoreRisk(product, profit, additionalData);

    return {
      profitMargin,
      roi,
      netProfit,
      sellerRating,
      competition,
      demandScore,
      riskScore,
    };
  }

  private calculateWeightedScore(factors: ScoringFactors): number {
    const score =
      factors.profitMargin +
      factors.roi +
      factors.netProfit +
      factors.sellerRating +
      factors.competition +
      factors.demandScore -
      factors.riskScore; // Subtract risk

    return Math.max(0, Math.min(100, score));
  }

  private scoreProfitMargin(margin: number): number {
    if (margin >= 40) return 30;
    if (margin >= 30) return 25;
    if (margin >= 20) return 20;
    if (margin >= 15) return 15;
    if (margin >= 10) return 10;
    return 5;
  }

  private scoreROI(roi: number): number {
    if (roi >= 100) return 25;
    if (roi >= 50) return 20;
    if (roi >= 30) return 15;
    if (roi >= 20) return 10;
    if (roi >= 10) return 5;
    return 0;
  }

  private scoreNetProfit(profit: number): number {
    if (profit >= 50) return 15;
    if (profit >= 30) return 12;
    if (profit >= 20) return 10;
    if (profit >= 10) return 7;
    if (profit >= 5) return 5;
    return 0;
  }

  private scoreSellerRating(seller: {
    feedbackScore: number;
    feedbackPercentage: number;
  }): number {
    let score = 0;

    // Feedback percentage
    if (seller.feedbackPercentage >= 99) score += 5;
    else if (seller.feedbackPercentage >= 97) score += 3;
    else if (seller.feedbackPercentage >= 95) score += 1;

    // Feedback score (volume)
    if (seller.feedbackScore >= 10000) score += 5;
    else if (seller.feedbackScore >= 1000) score += 3;
    else if (seller.feedbackScore >= 100) score += 1;

    return score;
  }

  private scoreCompetition(competitors: number): number {
    if (competitors === 0) return 10;
    if (competitors <= 3) return 8;
    if (competitors <= 5) return 6;
    if (competitors <= 10) return 4;
    if (competitors <= 20) return 2;
    return 0;
  }

  private scoreDemand(salesRank: number): number {
    if (salesRank === 0) return 5; // Unknown
    if (salesRank <= 1000) return 10; // Very high demand
    if (salesRank <= 10000) return 8;
    if (salesRank <= 50000) return 6;
    if (salesRank <= 100000) return 4;
    if (salesRank <= 500000) return 2;
    return 0;
  }

  private scoreRisk(product: EbayProduct, profit: ProfitCalculation, data: any): number {
    let risk = 0;

    // Low seller rating = risk
    if (product.seller.feedbackPercentage < 95) risk += 3;
    if (product.seller.feedbackScore < 50) risk += 2;

    // Very cheap items = higher fraud risk
    if (product.price < 10) risk += 2;

    // Used/refurbished = risk
    if (product.condition !== 'New') risk += 2;

    // Price seems too good to be true
    if (profit.profitMargin > 50) risk += 1; // Might be fake/scam

    return risk;
  }

  private calculateConfidence(factors: ScoringFactors, data: any): number {
    let confidence = 1.0;

    // Reduce confidence if missing data
    if (!data.amazonRank) confidence *= 0.9;
    if (!data.amazonCompetitors) confidence *= 0.9;
    if (!data.priceHistory) confidence *= 0.95;

    // Reduce confidence for new sellers
    if (factors.sellerRating < 5) confidence *= 0.8;

    return confidence;
  }

  private generateInsights(
    factors: ScoringFactors,
    reasoning: string[],
    redFlags: string[],
    greenFlags: string[]
  ): void {
    // Green flags (positive indicators)
    if (factors.profitMargin >= 25) {
      greenFlags.push(`Excellent ${factors.profitMargin.toFixed(1)}% profit margin`);
    }
    if (factors.roi >= 20) {
      greenFlags.push(`Strong ${factors.roi.toFixed(0)}% ROI`);
    }
    if (factors.sellerRating >= 8) {
      greenFlags.push('Highly rated seller');
    }
    if (factors.competition >= 8) {
      greenFlags.push('Low competition on Amazon');
    }
    if (factors.demandScore >= 8) {
      greenFlags.push('High demand product');
    }

    // Red flags (concerns)
    if (factors.profitMargin < 15) {
      redFlags.push('Low profit margin - risky');
    }
    if (factors.riskScore >= 5) {
      redFlags.push('High risk indicators detected');
    }
    if (factors.sellerRating < 5) {
      redFlags.push('Seller has low rating');
    }
    if (factors.competition <= 3) {
      redFlags.push('High competition on target platform');
    }

    // Generate reasoning
    if (greenFlags.length > redFlags.length) {
      reasoning.push('Strong opportunity with favorable indicators');
    }
    if (factors.profitMargin >= 20 && factors.roi >= 30) {
      reasoning.push('Excellent profit potential');
    }
    if (redFlags.length > 0) {
      reasoning.push('Some risks identified - review carefully');
    }
    if (factors.riskScore > 5) {
      reasoning.push('High risk - manual review recommended');
    }
  }
}
