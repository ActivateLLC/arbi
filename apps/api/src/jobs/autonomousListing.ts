/**
 * Autonomous Listing Job
 *
 * Automatically scans for opportunities and lists them on the marketplace
 * Runs continuously to ensure profitable products are always available
 */

import { ArbitrageEngine } from '@arbi/arbitrage-engine';

import type { Opportunity } from '@arbi/arbitrage-engine';

interface AutoListingConfig {
  scanIntervalMinutes: number;
  minScore: number;
  minProfit: number;
  minROI: number;
  markupPercentage: number;
  maxListingsPerRun: number;
}

export class AutonomousListingJob {
  private engine: ArbitrageEngine;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.engine = new ArbitrageEngine();
  }

  /**
   * Start autonomous listing job
   */
  async start(config: AutoListingConfig): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Autonomous listing already running');
      return;
    }

    console.log('🤖 Starting autonomous listing job...');
    console.log(`   Scan interval: ${config.scanIntervalMinutes} minutes`);
    console.log(`   Min score: ${config.minScore}`);
    console.log(`   Min profit: $${config.minProfit}`);
    console.log(`   Markup: ${config.markupPercentage}%`);

    this.isRunning = true;

    // Run immediately
    await this.runListing(config);

    // Then run on interval
    this.intervalId = setInterval(async () => {
      await this.runListing(config);
    }, config.scanIntervalMinutes * 60 * 1000);
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
      console.log('🔍 Scanning for opportunities to list...');

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
          scoredOpportunities.push({
            opportunity: opp,
            analysis,
          });
        }
      }

      console.log(`   ${scoredOpportunities.length} opportunities meet score threshold`);

      if (scoredOpportunities.length === 0) {
        return;
      }

      // Sort by score (highest first)
      scoredOpportunities.sort((a, b) => b.analysis.score - a.analysis.score);

      // Limit number of listings per run
      const toList = scoredOpportunities.slice(0, config.maxListingsPerRun);

      console.log(`   Auto-listing top ${toList.length} opportunities...`);

      // List each opportunity on marketplace
      for (const { opportunity } of toList) {
        await this.listOnMarketplace(opportunity, config.markupPercentage);
      }

      console.log(`✅ Autonomous listing cycle complete: ${toList.length} products listed`);
    } catch (error) {
      console.error('❌ Error in autonomous listing:', error);
    }
  }

  /**
   * List a single opportunity on marketplace
   */
  private async listOnMarketplace(
    opportunity: Opportunity,
    markupPercentage: number
  ): Promise<void> {
    try {
      // Extract image URL from productInfo if available
      const imageUrls = opportunity.productInfo?.imageUrl ? [opportunity.productInfo.imageUrl] : [];
      
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
          productImageUrls: imageUrls,
          supplierPrice: opportunity.buyPrice,
          supplierUrl: opportunity.buySource,
          supplierPlatform: opportunity.buySource?.toLowerCase() || 'unknown',
          markupPercentage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Listed: ${opportunity.title.substring(0, 50)}...`);
        console.log(`      Price: $${data.listing.marketplacePrice} | Profit: $${data.listing.estimatedProfit}`);
      } else {
        console.error(`   ❌ Failed to list: ${opportunity.title.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`   ❌ Error listing ${opportunity.title}:`, error);
    }
  }

  /**
   * Generate product description
   */
  private generateDescription(opportunity: Opportunity): string {
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
   * Get job status
   */
  getStatus() {
    return {
      running: this.isRunning,
      hasInterval: !!this.intervalId,
    };
  }
}

// Export singleton instance
export const autonomousListing = new AutonomousListingJob();
