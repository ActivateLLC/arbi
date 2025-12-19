import { RainforestScout } from '../scouts/RainforestScout';
import { ECommerceScout } from '../scouts/ECommerceScout';
import { WebScraperScout } from '../scouts/WebScraperScout';
import { AlibabaScout } from '../scouts/AlibabaScout';
import { TaobaoScout } from '../scouts/TaobaoScout';
import { DHGateScout } from '../scouts/DHGateScout';
import { EUGlobalScout } from '../scouts/EUGlobalScout';
import { USGlobalScout } from '../scouts/USGlobalScout';
import { LatAmGlobalScout } from '../scouts/LatAmGlobalScout';
import { ProfitCalculator, ProfitCalculation } from '../calculators/profitCalculator';
import { OpportunityScorer, OpportunityScore } from '../scorers/opportunityScorer';
import type { OpportunityScout, GenericProduct } from '../types';

export interface ArbitrageOpportunity {
  id: string;
  product: GenericProduct;
  profit: ProfitCalculation;
  score: OpportunityScore;
  foundAt: Date;
  expiresAt: Date;
  status: 'pending' | 'alerted' | 'purchased' | 'expired';
  source: string; // Track which platform found this
}

export interface AutonomousConfig {
  minScore: number; // Minimum score to alert (default: 70)
  minROI: number; // Minimum ROI percentage (default: 20)
  minProfit: number; // Minimum profit in dollars (default: 5)
  maxPrice: number; // Maximum purchase price (default: 100)
  categories: string[]; // eBay category IDs to monitor
  scanInterval: number; // Minutes between scans (default: 15)
  autoBuyEnabled: boolean; // Enable autonomous purchases (default: false)
  autoBuyScore: number; // Score threshold for auto-buy (default: 90)
  dailyBudget: number; // Maximum daily spending (default: 500)
  enabledPlatforms: string[]; // Which platforms to scan (default: all)
  remoteOnly: boolean; // Only scan platforms that ship (no local pickup) (default: true)
}

export class AutonomousEngine {
  private scouts: Map<string, OpportunityScout> = new Map();
  // eBay API/App ID logic removed. Use only web-scraper/automation for eBay if needed.
  private profitCalculator: ProfitCalculator;
  private scorer: OpportunityScorer;
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private dailySpent: number = 0;
  private lastScanTime: Date = new Date(0);

  constructor() {
    this.profitCalculator = new ProfitCalculator();
    this.scorer = new OpportunityScorer();

    // Register remote-only scouts (no physical pickup required)
    // eBay API/App ID logic removed. Only use web-scraper/automation for eBay if needed.
    this.registerScout('amazon', new RainforestScout());
    this.registerScout('retail', new ECommerceScout());
    // WebScraperScout DISABLED - too slow and resource intensive
    // this.registerScout('webscraper', new WebScraperScout());
    // Global import/export and dropshipping scouts
    this.registerScout('alibaba', new AlibabaScout());
    this.registerScout('taobao', new TaobaoScout());
    this.registerScout('dhgate', new DHGateScout());
    this.registerScout('eu', new EUGlobalScout());
    this.registerScout('us', new USGlobalScout());
    this.registerScout('latam', new LatAmGlobalScout());

    // Note: Facebook Marketplace NOT registered - requires local pickup/physical handling
    // If you want local arbitrage, you'd need to add FacebookMarketplaceScout here

    console.log('🤖 Autonomous Engine initialized with remote-only arbitrage');
    console.log(`   Platforms: ${Array.from(this.scouts.keys()).join(', ')}`);
    console.log(`   ⚠️  WebScraper DISABLED to conserve resources`);
  }

  /**
   * Register a new platform scout
   */
  registerScout(name: string, scout: OpportunityScout): void {
    this.scouts.set(name, scout);
    console.log(`✅ Registered scout: ${name}`);
  }

  /**
   * Get list of enabled platforms
   */
  getEnabledPlatforms(): string[] {
    return Array.from(this.scouts.keys());
  }

  /**
   * Run autonomous scan for opportunities across ALL platforms
   * This should be called by a cron job / background worker
    import { GoogleTrendsService } from '../services/GoogleTrendsService';
   */
  async runScan(config: AutonomousConfig): Promise<ArbitrageOpportunity[]> {
    console.log('🤖 Starting multi-platform autonomous arbitrage scan...');
    console.log(`   Platforms: ${this.getEnabledPlatforms().join(', ')}`);

    const startTime = Date.now();
    const foundOpportunities: ArbitrageOpportunity[] = [];

    const platformScans = Array.from(this.scouts.entries()).map(async ([platformName, scout]) => {
      try {
        const scoutConfig = {
          enabled: true,
          scanInterval: config.scanInterval,
          sources: [platformName],
          filters: {
            minProfit: config.minProfit,
            minROI: config.minROI,
            maxPrice: config.maxPrice,
            categories: config.categories
          }
        };

        const scoutOpportunities = await scout.scan(scoutConfig);
        console.log(`📦 ${platformName}: Found ${scoutOpportunities.length} opportunities`);

        // Convert scout opportunities to ArbitrageOpportunity format
        return scoutOpportunities.map(opp => this.convertToArbitrageOpportunity(opp, platformName));
      } catch (error) {
        console.error(`❌ ${platformName} scan failed:`, error);
        return [];
      }
    });

    // Wait for all platform scans to complete
    const allPlatformResults = await Promise.all(platformScans);

    // Flatten results from all platforms
    const allOpportunities = allPlatformResults.flat();

    // Process each opportunity
    for (const opportunity of allOpportunities) {
      foundOpportunities.push(opportunity);
      this.opportunities.set(opportunity.id, opportunity);

      console.log(
        `✅ [${opportunity.source.toUpperCase()}] ${opportunity.product.title?.substring(0, 40) ?? ''}... Score: ${opportunity.score.score} | Profit: $${opportunity.profit.netProfit.toFixed(2)}`
      );
      await this.handleOpportunity(opportunity, config);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 Multi-platform scan complete in ${duration}s`);
    console.log(`   Total opportunities found: ${foundOpportunities.length}`);

    // Show breakdown by platform
    const byPlatform = foundOpportunities.reduce((acc, opp) => {
      acc[opp.source] = (acc[opp.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byPlatform).forEach(([platform, count]) => {
      console.log(`   ${platform}: ${count} opportunities`);
    });
    console.log('='.repeat(60) + '\n');

    this.lastScanTime = new Date();
    return foundOpportunities;
  }

  /**
   * Scan eBay for potential deals
   */
  // Removed scanEbayForDeals

  /**
   * Analyze a product for arbitrage potential
   */
  // Removed analyzeProduct

  /**
   * Handle opportunity based on score and configuration
   */
  private async handleOpportunity(
    opportunity: ArbitrageOpportunity,
    config: AutonomousConfig
  ): Promise<void> {
    const { score, profit } = opportunity;

    // Tier 3: Excellent (90-100) - Auto-buy if enabled
    if (score.score >= config.autoBuyScore && config.autoBuyEnabled) {
      if (this.canAffordPurchase(profit.totalCost, config.dailyBudget)) {
        await this.autonomousPurchase(opportunity);
        this.dailySpent += profit.totalCost;
      } else {
        console.log('⚠️  Daily budget exceeded, skipping auto-buy');
        await this.sendAlert(opportunity, 'high');
      }
    }
    // Tier 2: High (80-89) - Priority alert
    else if (score.score >= 80) {
      await this.sendAlert(opportunity, 'high');
    }
    // Tier 1: Medium (70-79) - Standard alert
    else if (score.score >= 70) {
      await this.sendAlert(opportunity, 'medium');
    }
  }

  /**
   * Check if we can afford a purchase within budget
   */
  private canAffordPurchase(cost: number, dailyBudget: number): boolean {
    return this.dailySpent + cost <= dailyBudget;
  }

  /**
   * Autonomous purchase execution (placeholder)
   */
  private async autonomousPurchase(
    opportunity: ArbitrageOpportunity
  ): Promise<void> {
    console.log('🤖 AUTONOMOUS PURCHASE:', {
      product: opportunity.product.title,
      price: opportunity.profit.sourcePrice,
      expectedProfit: opportunity.profit.netProfit,
    });

    // In real implementation:
    // 1. Verify product still available
    // 2. Execute eBay purchase via API
    // 3. Log transaction
    // 4. Update inventory
    // 5. Schedule auto-listing on Amazon

    opportunity.status = 'purchased';
  }

  /**
   * Send alert about opportunity
   */
  private async sendAlert(
    opportunity: ArbitrageOpportunity,
    priority: 'low' | 'medium' | 'high'
  ): Promise<void> {
    const alert = {
      priority,
      timestamp: new Date(),
      product: {
        title: opportunity.product.title,
        ebayPrice: opportunity.profit.sourcePrice,
        amazonPrice: opportunity.profit.targetPrice,
        netProfit: opportunity.profit.netProfit,
        roi: opportunity.profit.roi,
      },
      score: opportunity.score.score,
      tier: opportunity.score.tier,
      url: opportunity.product.itemWebUrl,
      reasoning: opportunity.score.reasoning,
      greenFlags: opportunity.score.greenFlags,
      redFlags: opportunity.score.redFlags,
    };

    console.log(`🚨 [${priority.toUpperCase()}] ALERT:`, alert);

    // In real implementation:
    // - Send email
    // - Send SMS for high priority
    // - Send push notification
    // - Trigger webhook
    // - Log to database

    opportunity.status = 'alerted';
  }

  /**
   * Get all current opportunities
   */
  getOpportunities(filters?: {
    minScore?: number;
    status?: string;
    limit?: number;
  }): ArbitrageOpportunity[] {
    let opps = Array.from(this.opportunities.values());

    if (filters?.minScore) {
      opps = opps.filter((o) => o.score.score >= filters.minScore!);
    }

    if (filters?.status) {
      opps = opps.filter((o) => o.status === filters.status);
    }

    // Sort by score (highest first)
    opps.sort((a, b) => b.score.score - a.score.score);

    if (filters?.limit) {
      opps = opps.slice(0, filters.limit);
    }

    return opps;
  }

  /**
   * Get daily statistics
   */
  getStats() {
    const opps = Array.from(this.opportunities.values());

    return {
      totalOpportunities: opps.length,
      alertedCount: opps.filter((o) => o.status === 'alerted').length,
      purchasedCount: opps.filter((o) => o.status === 'purchased').length,
      averageScore: opps.reduce((sum, o) => sum + o.score.score, 0) / opps.length || 0,
      totalPotentialProfit: opps.reduce((sum, o) => sum + o.profit.netProfit, 0),
      dailySpent: this.dailySpent,
      lastScan: this.lastScanTime,
    };
  }

  /**
   * Reset daily counters (call at midnight)
   */
  resetDailyCounters(): void {
    this.dailySpent = 0;
    console.log('🔄 Daily counters reset');
  }

  /**
   * Clean up expired opportunities
   */
  cleanupExpired(): void {
    const now = Date.now();
    let removed = 0;

    for (const [id, opp] of this.opportunities.entries()) {
      if (opp.expiresAt.getTime() < now) {
        this.opportunities.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired opportunities`);
    }
  }
}
