import { EbayScout, EbayProduct } from '../scouts/ebayScout';
import { ProfitCalculator, ProfitCalculation } from '../calculators/profitCalculator';
import { OpportunityScorer, OpportunityScore } from '../scorers/opportunityScorer';

export interface ArbitrageOpportunity {
  id: string;
  product: EbayProduct;
  profit: ProfitCalculation;
  score: OpportunityScore;
  foundAt: Date;
  expiresAt: Date;
  status: 'pending' | 'alerted' | 'purchased' | 'expired';
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
}

export class AutonomousEngine {
  private ebayScout: EbayScout;
  private profitCalculator: ProfitCalculator;
  private scorer: OpportunityScorer;
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private dailySpent: number = 0;
  private lastScanTime: Date = new Date(0);

  constructor() {
    this.ebayScout = new EbayScout();
    this.profitCalculator = new ProfitCalculator();
    this.scorer = new OpportunityScorer();
  }

  /**
   * Run autonomous scan for opportunities
   * This should be called by a cron job / background worker
   */
  async runScan(config: AutonomousConfig): Promise<ArbitrageOpportunity[]> {
    console.log('🤖 Starting autonomous arbitrage scan...');

    const startTime = Date.now();
    const foundOpportunities: ArbitrageOpportunity[] = [];

    try {
      // 1. Scan eBay for products
      const products = await this.scanEbayForDeals(config);
      console.log(`📦 Found ${products.length} potential products on eBay`);

      // 2. Analyze each product
      for (const product of products) {
        const opportunity = await this.analyzeProduct(product, config);

        if (opportunity && opportunity.score.score >= config.minScore) {
          foundOpportunities.push(opportunity);
          this.opportunities.set(opportunity.id, opportunity);

          console.log(
            `✅ Found opportunity: ${product.title.substring(0, 50)}... Score: ${opportunity.score.score}`
          );

          // 3. Take autonomous action based on score
          await this.handleOpportunity(opportunity, config);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `🎯 Scan complete! Found ${foundOpportunities.length} opportunities in ${duration}s`
      );

      this.lastScanTime = new Date();

      return foundOpportunities;
    } catch (error) {
      console.error('❌ Error during autonomous scan:', error);
      return foundOpportunities;
    }
  }

  /**
   * Scan eBay for potential deals
   */
  private async scanEbayForDeals(config: AutonomousConfig): Promise<EbayProduct[]> {
    const allProducts: EbayProduct[] = [];

    // Scan trending deals
    const trendingDeals = await this.ebayScout.getTrendingDeals();
    allProducts.push(...trendingDeals);

    // Scan specific categories if configured
    if (config.categories && config.categories.length > 0) {
      for (const categoryId of config.categories) {
        const categoryProducts = await this.ebayScout.searchProducts({
          categoryId,
          maxPrice: config.maxPrice,
          limit: 50,
        });
        allProducts.push(...categoryProducts);
      }
    }

    // Filter by price range
    return allProducts.filter((p) => p.price > 5 && p.price <= config.maxPrice);
  }

  /**
   * Analyze a product for arbitrage potential
   */
  private async analyzeProduct(
    product: EbayProduct,
    config: AutonomousConfig
  ): Promise<ArbitrageOpportunity | null> {
    try {
      // For now, estimate Amazon price (in real version, we'd scrape/API)
      // Mock: Assume Amazon price is 1.5x eBay price (conservative estimate)
      const estimatedAmazonPrice = product.price * 1.5;

      // Calculate profit
      const profit = this.profitCalculator.calculateEbayToAmazon(
        product.price,
        estimatedAmazonPrice,
        {
          ebayShipping: product.shippingCost || 0,
          itemWeight: 1, // Estimate
          itemSize: 'small',
        }
      );

      // Check if meets minimum thresholds
      if (profit.roi < config.minROI || profit.netProfit < config.minProfit) {
        return null;
      }

      // Score the opportunity
      const score = this.scorer.scoreOpportunity(product, profit, {
        amazonCompetitors: 5, // Estimate
        amazonRank: 50000, // Estimate
      });

      // Create opportunity record
      const opportunity: ArbitrageOpportunity = {
        id: `opp_${Date.now()}_${product.id}`,
        product,
        profit,
        score,
        foundAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'pending',
      };

      return opportunity;
    } catch (error) {
      console.error('Error analyzing product:', error);
      return null;
    }
  }

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
