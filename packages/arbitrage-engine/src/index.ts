// Export types
export * from './types';

// Export scouts
export * from './scouts/ECommerceScout';
export * from './scouts/WebScraperScout';
export * from './scouts/RainforestScout';
export * from './scouts/FacebookMarketplaceScout';

// Export analyzer
export * from './analyzer/OpportunityAnalyzer';

// Export risk manager
export * from './risk-manager/RiskManager';

<<<<<<< HEAD
// Export autonomous components
export * from './calculators/profitCalculator';
export * from './scorers/opportunityScorer';
export * from './autonomous/autonomousEngine';

// Export utilities
export * from './utils/cache';
=======
// Export new engines
export * from './autonomous/autonomousEngine';
export * from './dropshipping/DropshippingEngine';
>>>>>>> ea2bb28f (feat: add initial configuration and tests for API and AI engine)

// Main Arbitrage Engine
import type { Opportunity, OpportunityScout, ScoutConfig, UserBudgetSettings, OpportunityAnalysis, RiskAssessment } from './types';
import { ECommerceScout } from './scouts/ECommerceScout';
import { OpportunityAnalyzer } from './analyzer/OpportunityAnalyzer';
import { RiskManager } from './risk-manager/RiskManager';
<<<<<<< HEAD
import { SimpleCache } from './utils/cache';
=======
import { FacebookMarketplaceScout } from './scouts/FacebookMarketplaceScout';
>>>>>>> ea2bb28f (feat: add initial configuration and tests for API and AI engine)

export class ArbitrageEngine {
  private scouts: Map<string, OpportunityScout> = new Map();
  private analyzer: OpportunityAnalyzer;
  private riskManager: RiskManager;
  private opportunityCache: SimpleCache<Opportunity[]>;

  constructor() {
    this.analyzer = new OpportunityAnalyzer();
    this.riskManager = new RiskManager();
    this.opportunityCache = new SimpleCache<Opportunity[]>(5 * 60 * 1000); // 5 minute cache

<<<<<<< HEAD
    // PRODUCTION MODE: No default scouts
    // Scouts must be explicitly registered with real data sources
    // (RainforestScout, EbayScout, WebScraperScout)
=======
    // Register default scouts
    this.registerScout(new ECommerceScout());
    this.registerScout(new FacebookMarketplaceScout());
>>>>>>> ea2bb28f (feat: add initial configuration and tests for API and AI engine)
  }

  registerScout(scout: OpportunityScout): void {
    this.scouts.set(scout.type, scout);
  }

  async findOpportunities(config: ScoutConfig): Promise<Opportunity[]> {
    // Create cache key from config
    const cacheKey = this.createCacheKey(config);
    
    // Check cache first
    const cached = this.opportunityCache.get(cacheKey);
    if (cached) {
      console.log('📦 Returning cached opportunities');
      return cached;
    }
    
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
    const sorted = allOpportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    
    // Cache results
    this.opportunityCache.set(cacheKey, sorted);
    
    return sorted;
  }
  
  /**
   * Clear the opportunity cache
   */
  clearCache(): void {
    this.opportunityCache.clear();
  }
  
  /**
   * Create a cache key from scout config
   */
  private createCacheKey(config: ScoutConfig): string {
    const { filters } = config;
    if (!filters) return 'default';
    
    return `${filters.minProfit || 0}-${filters.minROI || 0}-${filters.maxPrice || 'max'}-${(filters.categories || []).join(',')}`;
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
