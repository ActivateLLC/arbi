import { AutonomousEngine, AutonomousConfig } from '@arbi/arbitrage-engine';
import { AdCampaignManager } from '../services/adCampaigns';
import { saveListing, MarketplaceListing } from '../routes/marketplace';

class AutonomousListingJob {
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;
  private engine: AutonomousEngine;
  private adManager: AdCampaignManager;

  constructor() {
    this.engine = new AutonomousEngine();
    this.adManager = new AdCampaignManager();
  }

  async start(config: any) {
    if (this.running) {
      return { started: false, message: 'Job already running' };
    }

    this.running = true;
    console.log('🚀 Starting Autonomous Listing Job...');
    console.log('   Config:', config);

    // Run immediately
    this.runCycle(config);

    // Schedule periodic runs
    const intervalMinutes = config.scanIntervalMinutes || 60;
    this.intervalId = setInterval(() => {
      this.runCycle(config);
    }, intervalMinutes * 60 * 1000);

    return { started: true, config };
  }

  async stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 Autonomous Listing Job stopped');
    return { stopped: true };
  }

  getStatus() {
    return { running: this.running };
  }

  private async runCycle(config: any) {
    try {
      console.log('🔄 Running autonomous listing cycle...');
      
      // 1. Scan for opportunities
      const scanConfig: AutonomousConfig = {
        minScore: config.minScore || 75,
        minROI: config.minROI || 15,
        minProfit: config.minProfit || 20,
        maxPrice: 1000,
        categories: [],
        scanInterval: 15,
        autoBuyEnabled: false,
        autoBuyScore: 95,
        dailyBudget: 1000,
        enabledPlatforms: [],
        remoteOnly: true
      };

      const opportunities = await this.engine.runScan(scanConfig);
      console.log(`   Found ${opportunities.length} opportunities`);

      // 2. Process each opportunity
      for (const opp of opportunities) {
        // TODO: Check if already listed

        // 3. Create Listing and save to marketplace storage
        const listingId = `auto-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const listing: MarketplaceListing = {
          listingId,
          opportunityId: opp.id,
          productTitle: opp.product.title,
          productDescription: opp.product.description || opp.product.title,
          productImages: opp.product.images || [],
          supplierPrice: opp.product.price,
          supplierUrl: opp.metadata?.buyUrl || '',
          supplierPlatform: opp.metadata?.dataSource || 'unknown',
          marketplacePrice: opp.profit.targetPrice,
          estimatedProfit: opp.profit.netProfit,
          status: 'active',
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        };

        console.log(`   📝 Creating listing for: ${listing.productTitle}`);
        console.log(`      Supplier: ${listing.supplierPlatform} - $${listing.supplierPrice}`);
        console.log(`      Marketplace: $${listing.marketplacePrice} (profit: $${listing.estimatedProfit})`);

        // Save to shared marketplace storage
        await saveListing(listing);
        console.log(`      ✅ Saved to marketplace storage`);

        // 4. Create Ad Campaigns
        await this.adManager.createCampaignsForListing(listing);
      }

    } catch (error) {
      console.error('❌ Error in autonomous listing cycle:', error);
    }
  }
}

export const autonomousListing = new AutonomousListingJob();
