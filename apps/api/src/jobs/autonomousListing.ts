/**
 * Autonomous Listing Job
 *
 * Automatically scans for opportunities and lists them on the marketplace
 * Runs continuously to ensure profitable products are always available
 * 
 * Features:
 * - Standard mode: Conservative scanning every 60 minutes
 * - Turbo mode: Aggressive scanning every 5 minutes for maximum revenue
 */

import { ArbitrageEngine } from '@arbi/arbitrage-engine';

interface AutoListingConfig {
  scanIntervalMinutes: number;
  minScore: number;
  minProfit: number;
  minROI: number;
  markupPercentage: number;
  maxListingsPerRun: number;
  turboMode?: boolean;
  priorityCategories?: string[];
  targetKeywords?: string[];
}

// Turbo mode preset configuration for maximum revenue generation
const TURBO_MODE_PRESET: Partial<AutoListingConfig> = {
  scanIntervalMinutes: 5, // 12x faster scanning
  minScore: 60, // Lower threshold to capture more opportunities
  minProfit: 15, // Lower minimum for higher volume
  minROI: 12,
  maxListingsPerRun: 50, // 5x more listings per run
  priorityCategories: [
    '293',    // Electronics > Computers/Tablets
    '15032',  // Cell Phones & Accessories
    '2984',   // Video Games & Consoles
    '220',    // Toys & Hobbies
    '58058',  // Cameras & Photo
    '11232',  // Home Theater
    '64482',  // Sporting Goods
    '619',    // Trading Cards
    '281',    // Watches
  ],
  targetKeywords: [
    'Apple AirPods',
    'Nintendo Switch',
    'PlayStation 5',
    'Xbox Series',
    'MacBook',
    'iPad Pro',
    'Dyson',
    'LEGO',
    'Pokemon',
    'Nike Jordan',
  ]
};

export class AutonomousListingJob {
  private engine: ArbitrageEngine;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private currentConfig?: AutoListingConfig;
  private listingsCreated: number = 0;
  private scansCompleted: number = 0;
  private startedAt?: Date;

  constructor() {
    this.engine = new ArbitrageEngine();
  }

  /**
   * Start autonomous listing job
   * @param config - Configuration or 'turbo' for turbo mode preset
   */
  async start(config: AutoListingConfig | 'turbo'): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Autonomous listing already running');
      return;
    }

    // Apply turbo mode preset if requested
    const finalConfig: AutoListingConfig = config === 'turbo' 
      ? { ...TURBO_MODE_PRESET, markupPercentage: 30 } as AutoListingConfig
      : { ...config, ...(config.turboMode ? TURBO_MODE_PRESET : {}) };

    this.currentConfig = finalConfig;
    this.startedAt = new Date();
    this.listingsCreated = 0;
    this.scansCompleted = 0;

    const mode = config === 'turbo' || finalConfig.turboMode ? '⚡ TURBO' : '📊 STANDARD';
    console.log(`🤖 Starting autonomous listing job in ${mode} MODE...`);
    console.log(`   Scan interval: ${finalConfig.scanIntervalMinutes} minutes`);
    console.log(`   Min score: ${finalConfig.minScore}`);
    console.log(`   Min profit: $${finalConfig.minProfit}`);
    console.log(`   Max listings/run: ${finalConfig.maxListingsPerRun}`);
    console.log(`   Markup: ${finalConfig.markupPercentage}%`);
    
    if (finalConfig.priorityCategories?.length) {
      console.log(`   Priority categories: ${finalConfig.priorityCategories.length} configured`);
    }
    if (finalConfig.targetKeywords?.length) {
      console.log(`   Target keywords: ${finalConfig.targetKeywords.join(', ')}`);
    }

    this.isRunning = true;

    // Run immediately
    await this.runListing(finalConfig);

    // Then run on interval
    this.intervalId = setInterval(async () => {
      await this.runListing(finalConfig);
    }, finalConfig.scanIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop autonomous listing job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('🛑 Autonomous listing stopped');
  }

  /**
   * Run a single listing cycle
   */
  private async runListing(config: AutoListingConfig): Promise<void> {
    try {
      this.scansCompleted++;
      console.log(`🔍 Scan #${this.scansCompleted} - Scanning for opportunities to list...`);

      // Find high-quality opportunities
      const opportunities = await this.engine.findOpportunities({
        filters: {
          minProfit: config.minProfit,
          minROI: config.minROI,
        },
      });

      if (opportunities.length === 0) {
        console.log('   No opportunities found this cycle');
        return;
      }

      console.log(`   Found ${opportunities.length} potential opportunities`);

      // Filter and score opportunities
      const scoredOpportunities = [];
      for (const opp of opportunities) {
        const analysis = this.engine.analyzeOpportunity(opp);

        if (analysis.score >= config.minScore) {
          // Apply priority boost for turbo mode keywords
          let priorityBoost = 0;
          if (config.targetKeywords?.length) {
            const titleLower = opp.title.toLowerCase();
            for (const keyword of config.targetKeywords) {
              if (titleLower.includes(keyword.toLowerCase())) {
                priorityBoost = 10; // Boost score by 10 for priority keywords
                break;
              }
            }
          }

          scoredOpportunities.push({
            opportunity: opp,
            analysis,
            boostedScore: analysis.score + priorityBoost,
          });
        }
      }

      console.log(`   ${scoredOpportunities.length} opportunities meet score threshold`);

      if (scoredOpportunities.length === 0) {
        return;
      }

      // Sort by boosted score (highest first)
      scoredOpportunities.sort((a, b) => b.boostedScore - a.boostedScore);

      // Limit number of listings per run
      const toList = scoredOpportunities.slice(0, config.maxListingsPerRun);

      console.log(`   Auto-listing top ${toList.length} opportunities...`);

      // List each opportunity on marketplace
      let listed = 0;
      for (const { opportunity } of toList) {
        const success = await this.listOnMarketplace(opportunity, config.markupPercentage);
        if (success) {
          listed++;
          this.listingsCreated++;
        }
      }

      console.log(`✅ Autonomous listing cycle complete: ${listed}/${toList.length} products listed`);
      console.log(`   Total listings created: ${this.listingsCreated}`);
    } catch (error) {
      console.error('❌ Error in autonomous listing:', error);
    }
  }

  /**
   * List a single opportunity on marketplace
   * @returns true if listing was successful
   */
  private async listOnMarketplace(
    opportunity: any,
    markupPercentage: number
  ): Promise<boolean> {
    try {
      // Call marketplace listing API
      const response = await fetch('http://localhost:3000/api/marketplace/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          productTitle: opportunity.title,
          productDescription: this.generateDescription(opportunity),
          productImageUrls: opportunity.images || [],
          supplierPrice: opportunity.buyPrice,
          supplierUrl: opportunity.buyUrl,
          supplierPlatform: opportunity.buyPlatform?.toLowerCase() || 'unknown',
          markupPercentage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Listed: ${opportunity.title.substring(0, 50)}...`);
        console.log(`      Price: $${data.listing.marketplacePrice} | Profit: $${data.listing.estimatedProfit}`);
        return true;
      } else {
        console.error(`   ❌ Failed to list: ${opportunity.title.substring(0, 50)}...`);
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Error listing ${opportunity.title}:`, error);
      return false;
    }
  }

  /**
   * Generate product description
   */
  private generateDescription(opportunity: any): string {
    return `
${opportunity.title}

🚀 Fast Shipping | 📦 Brand New | ✅ Authentic

${opportunity.description || 'High-quality product at a great price!'}

• Free shipping on orders over $50
• 30-day money-back guarantee
• Secure payment processing
• Ships within 1-2 business days

Order now and get your item delivered quickly!
    `.trim();
  }

  /**
   * Get job status with detailed metrics
   */
  getStatus() {
    const uptime = this.startedAt 
      ? Math.round((Date.now() - this.startedAt.getTime()) / 1000 / 60) 
      : 0;

    return {
      running: this.isRunning,
      hasInterval: !!this.intervalId,
      mode: this.currentConfig?.turboMode ? 'turbo' : 'standard',
      startedAt: this.startedAt,
      uptimeMinutes: uptime,
      metrics: {
        scansCompleted: this.scansCompleted,
        listingsCreated: this.listingsCreated,
        avgListingsPerScan: this.scansCompleted > 0 
          ? parseFloat((this.listingsCreated / this.scansCompleted).toFixed(2)) 
          : 0,
      },
      config: this.currentConfig ? {
        scanIntervalMinutes: this.currentConfig.scanIntervalMinutes,
        minScore: this.currentConfig.minScore,
        minProfit: this.currentConfig.minProfit,
        maxListingsPerRun: this.currentConfig.maxListingsPerRun,
      } : null,
    };
  }
}

// Export singleton instance
export const autonomousListing = new AutonomousListingJob();
