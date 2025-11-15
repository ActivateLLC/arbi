// Export types
export * from './types';

// Export scouts
export * from './scouts/ECommerceScout';
export * from './scouts/WebScraperScout';
export * from './scouts/EbayScout';
export * from './scouts/RainforestScout';
export * from './scouts/ebayScout'; // New real eBay integration

// Export analyzer
export * from './analyzer/OpportunityAnalyzer';

// Export risk manager
export * from './risk-manager/RiskManager';

// Export autonomous components (NEW!)
export * from './calculators/profitCalculator';
export * from './scorers/opportunityScorer';
export * from './autonomous/autonomousEngine';

// Main Arbitrage Engine
import type { Opportunity, OpportunityScout, ScoutConfig, UserBudgetSettings, OpportunityAnalysis, RiskAssessment } from './types';
import { ECommerceScout } from './scouts/ECommerceScout';
import { OpportunityAnalyzer } from './analyzer/OpportunityAnalyzer';
import { RiskManager } from './risk-manager/RiskManager';

export class ArbitrageEngine {
  private scouts: Map<string, OpportunityScout> = new Map();
  private analyzer: OpportunityAnalyzer;
  private riskManager: RiskManager;

  constructor() {
    this.analyzer = new OpportunityAnalyzer();
    this.riskManager = new RiskManager();

    // Register default scouts
    this.registerScout(new ECommerceScout());
  }

  registerScout(scout: OpportunityScout): void {
    this.scouts.set(scout.type, scout);
  }

  async findOpportunities(config: ScoutConfig): Promise<Opportunity[]> {
    const allOpportunities: Opportunity[] = [];

    for (const scout of this.scouts.values()) {
      try {
        const opportunities = await scout.scan(config);
        allOpportunities.push(...opportunities);
      } catch (error) {
        console.error(`Scout ${scout.name} failed:`, error);
      }
    }

    // Sort by estimated profit (highest first)
    return allOpportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }

  analyzeOpportunity(opportunity: Opportunity): OpportunityAnalysis {
    return this.analyzer.analyzeOpportunity(opportunity);
  }

  assessRisk(
    opportunity: Opportunity,
    userId: string,
    settings: UserBudgetSettings
  ): RiskAssessment {
    return this.riskManager.assessRisk(opportunity, userId, settings);
  }

  recordExecution(userId: string, opportunity: Opportunity): void {
    this.riskManager.recordSpending(userId, opportunity.buyPrice);
  }

  async evaluateOpportunity(
    opportunity: Opportunity,
    userId: string,
    settings: UserBudgetSettings
  ): Promise<{ analysis: OpportunityAnalysis; riskAssessment: RiskAssessment; recommended: boolean }> {
    const analysis = this.analyzeOpportunity(opportunity);
    const riskAssessment = this.assessRisk(opportunity, userId, settings);

    const recommended = analysis.shouldExecute && riskAssessment.approved;

    return {
      analysis,
      riskAssessment,
      recommended
    };
  }
}
