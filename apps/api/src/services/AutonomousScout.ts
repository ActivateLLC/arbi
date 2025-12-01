import cron from 'node-cron';
import { AutonomousEngine, AutonomousConfig, ArbitrageOpportunity } from '@arbi/arbitrage-engine';
import axios from 'axios';

console.log('🤖 Initializing Autonomous Scout Service...');

// --- Configuration ---
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const SCOUTING_SCHEDULE = process.env.SCOUT_SCHEDULE || '*/5 * * * *'; // Every 5 minutes

const config: AutonomousConfig = {
  minScore: 75,
  minROI: 15,
  minProfit: 20, // Focus on higher profit items
  maxPrice: 500, // Look for more expensive items
  categories: [], // Let engine decide for now
  scanInterval: 5,
  autoBuyEnabled: false,
  autoBuyScore: 95,
  dailyBudget: 1000,
};

// --- Engine ---
const engine = new AutonomousEngine();


/**
 * The main scouting task. This function will be executed by the cron job.
 */
async function runScoutingMission() {
  console.log(`\n🚀 [${new Date().toISOString()}] Kicking off new autonomous scouting mission...`);
  
  try {
    const opportunities = await engine.runScan(config);
    
    if (!opportunities || opportunities.length === 0) {
      console.log('...No new profitable opportunities found in this run.');
      return;
    }
    console.log(`Found ${opportunities.length} new opportunities. Listing the best ones...`);

    for (const opportunity of opportunities) {
        // The autonomous engine already logs the opportunity, so we just need to list it.
        await listOpportunityOnMarketplace(opportunity);
    }
    console.log('🏁 Scouting mission complete.');

  } catch (error: any) {
    console.error('❌ CRITICAL ERROR in scouting mission:', error.message);
  }
}

/**
 * Calls the internal API to list the product, which then triggers ad creation.
 */
async function listOpportunityOnMarketplace(opportunity: ArbitrageOpportunity) {
  try {
    console.log(`   - Listing "${opportunity.product.title}" on marketplace via API...`);
    const response = await axios.post(`${API_BASE_URL}/api/marketplace/list`, {
      opportunityId: opportunity.id,
      productTitle: opportunity.product.title,
      productDescription: `An amazing deal on ${opportunity.product.title}. Limited stock!`, // Generate better description later
      productImageUrls: opportunity.product.imageUrl ? [opportunity.product.imageUrl] : [],
      supplierPrice: opportunity.product.price,
      supplierUrl: opportunity.product.itemWebUrl,
      supplierPlatform: 'eBay',
      markupPercentage: 35, // This should be based on profit calculation
      estimatedProfit: opportunity.profit.netProfit,
      roi: opportunity.profit.roi,
    });

    if (response.status === 201) {
      console.log(`   - ✅ Successfully listed. Ad campaign should be starting.`);
      console.log(`   - Public URL will be: ${response.data.marketingInfo.publicUrl}`);
    }
  } catch (error: any) {
    console.error(`   - ❌ FAILED to list opportunity via API:`, error.response?.data || error.message);
  }
}


/**
 * Schedules the scouting mission to run autonomously.
 */
export function startAutonomousScout() {
  console.log(`🕒 Autonomous scout scheduled to run based on cron schedule: "${SCOUTING_SCHEDULE}"`);
  
  // Run once immediately on startup after a short delay
  setTimeout(runScoutingMission, 5000);
  
  // Then schedule it to run periodically
  cron.schedule(SCOUTING_SCHEDULE, runScoutingMission);
}
