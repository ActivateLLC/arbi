/**
 * AUTONOMOUS MARKETPLACE
 *
 * Press "Start" → Make Money
 *
 * Full end-to-end autonomous cycle:
 * 1. Find profitable products (Rainforest API)
 * 2. Upload product images (Cloudinary)
 * 3. Create marketplace listings (Database)
 * 4. Launch Google Ads campaigns (Google Ads API)
 * 5. Wait for sales (Stripe webhook)
 * 6. Auto-purchase from supplier (Puppeteer)
 * 7. Repeat & scale
 */

import { Router, Request, Response } from 'express';
import { rainforestProductFinder } from '../services/rainforestProductFinder';
import { imageScraper } from '../services/imageScraper';
import { adCampaignManager } from '../services/adCampaigns';
import { getDatabase } from '../config/database';

const router = Router();

// Track autonomous sessions
const activeSessions = new Map();

/**
 * POST /api/autonomous-marketplace/start
 * Start the fully autonomous money-making machine
 */
router.post('/start', async (req: Request, res: Response) => {
  const {
    productsToFind = 10,
    minProfit = 100,
    maxPrice = 5000,
    dailyBudgetPerProduct = 50,
    autoScale = true
  } = req.body;

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log('🚀 AUTONOMOUS MARKETPLACE STARTING...');
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Target: Find ${productsToFind} products`);
  console.log(`   Min Profit: $${minProfit}`);
  console.log(`   Max Price: $${maxPrice}`);

  // Return immediately with session ID
  res.json({
    success: true,
    message: 'Autonomous marketplace started!',
    sessionId,
    status: 'running',
    estimatedTime: `${productsToFind * 30} seconds`,
    nextSteps: [
      'Finding profitable products...',
      'Creating marketplace listings...',
      'Launching Google Ads campaigns...',
      'Waiting for sales...'
    ],
    statusUrl: `/api/autonomous-marketplace/status/${sessionId}`
  });

  // Run autonomous cycle in background
  runAutonomousCycle(sessionId, {
    productsToFind,
    minProfit,
    maxPrice,
    dailyBudgetPerProduct,
    autoScale
  }).catch(error => {
    console.error(`❌ Autonomous cycle failed:`, error);
    updateSessionStatus(sessionId, 'failed', { error: error.message });
  });
});

/**
 * GET /api/autonomous-marketplace/status/:sessionId
 * Check status of autonomous session
 */
router.get('/status/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json(session);
});

/**
 * POST /api/autonomous-marketplace/stop
 * Stop autonomous operation
 */
router.post('/stop/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  session.status = 'stopped';
  session.stoppedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Autonomous marketplace stopped',
    session
  });
});

/**
 * Background autonomous cycle
 */
async function runAutonomousCycle(sessionId: string, config: any) {
  const session = {
    sessionId,
    status: 'running',
    startedAt: new Date().toISOString(),
    config,
    progress: {
      phase: 'Finding products',
      productsFound: 0,
      listingsCreated: 0,
      campaignsLaunched: 0,
      totalProfit: 0
    },
    products: [],
    listings: [],
    campaigns: []
  };

  activeSessions.set(sessionId, session);

  try {
    // PHASE 1: Find Profitable Products
    console.log(`\n🔍 PHASE 1: Finding profitable products...`);
    updateSessionStatus(sessionId, 'running', { phase: 'Finding products' });

    const opportunities = await rainforestProductFinder.findOpportunities({
      minProfit: config.minProfit,
      maxPrice: config.maxPrice,
      limit: config.productsToFind,
      categories: ['Electronics', 'Home', 'Sports', 'Toys']
    });

    session.progress.productsFound = opportunities.length;
    console.log(`   ✅ Found ${opportunities.length} profitable products`);

    // PHASE 2: Create Marketplace Listings
    console.log(`\n📦 PHASE 2: Creating marketplace listings...`);
    updateSessionStatus(sessionId, 'running', { phase: 'Creating listings' });

    const db = getDatabase();
    const listings = [];

    for (const opp of opportunities) {
      try {
        // Upload images to Cloudinary
        let cloudinaryUrls = [];
        if (opp.productImages && opp.productImages.length > 0) {
          for (const imageUrl of opp.productImages.slice(0, 3)) {
            try {
              const uploaded = await imageScraper.uploadToCloudinary(imageUrl, opp.opportunityId);
              cloudinaryUrls.push(uploaded.secure_url);
            } catch (error) {
              console.log(`      ⚠️ Image upload failed, using placeholder`);
            }
          }
        }

        // Use Cloudinary URLs or placeholder
        const finalImages = cloudinaryUrls.length > 0
          ? cloudinaryUrls
          : [`https://placehold.co/600x600/667eea/white?text=${encodeURIComponent(opp.productTitle.substring(0, 30))}`];

        // Create listing
        const listingId = `listing_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const listing = {
          listingId,
          opportunityId: opp.opportunityId,
          productTitle: opp.productTitle,
          productDescription: opp.productDescription,
          productImages: finalImages,
          supplierPrice: opp.supplierPrice,
          supplierUrl: opp.supplierUrl,
          supplierPlatform: opp.supplierPlatform,
          marketplacePrice: opp.marketplacePrice,
          estimatedProfit: opp.estimatedProfit,
          status: 'active',
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };

        await db.create('MarketplaceListing', listing);
        listings.push(listing);
        session.progress.listingsCreated++;
        session.progress.totalProfit += Number(opp.estimatedProfit);

        console.log(`   ✅ Listed: ${opp.productTitle} (Profit: $${opp.estimatedProfit})`);
      } catch (error: any) {
        console.error(`   ❌ Failed to list product: ${error.message}`);
      }
    }

    session.listings = listings;

    // PHASE 3: Launch Google Ads Campaigns
    console.log(`\n📢 PHASE 3: Launching Google Ads campaigns...`);
    updateSessionStatus(sessionId, 'running', { phase: 'Launching ads' });

    const campaigns = [];

    for (const listing of listings.slice(0, 4)) { // Top 4 by profit
      try {
        const campaignList = await adCampaignManager.createCampaignsForListing({
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          productDescription: listing.productDescription,
          productImages: listing.productImages,
          marketplacePrice: Number(listing.marketplacePrice),
          estimatedProfit: Number(listing.estimatedProfit),
        });

        campaigns.push(...campaignList);
        session.progress.campaignsLaunched++;

        console.log(`   ✅ Campaign launched: ${listing.productTitle}`);

        // Wait 2 seconds between campaigns
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`   ❌ Campaign failed: ${error.message}`);
      }
    }

    session.campaigns = campaigns;

    // PHASE 4: COMPLETE
    console.log(`\n✅ AUTONOMOUS SETUP COMPLETE!`);
    console.log(`   Products Found: ${session.progress.productsFound}`);
    console.log(`   Listings Created: ${session.progress.listingsCreated}`);
    console.log(`   Campaigns Launched: ${session.progress.campaignsLaunched}`);
    console.log(`   Total Profit Potential: $${session.progress.totalProfit.toFixed(2)}`);
    console.log(`\n💰 Now waiting for sales via Stripe webhooks...`);

    updateSessionStatus(sessionId, 'completed', {
      phase: 'Active - Waiting for sales',
      completedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error(`❌ Autonomous cycle failed:`, error);
    updateSessionStatus(sessionId, 'failed', {
      error: error.message,
      failedAt: new Date().toISOString()
    });
  }
}

function updateSessionStatus(sessionId: string, status: string, updates: any) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.status = status;
    Object.assign(session, updates);
    activeSessions.set(sessionId, session);
  }
}

export default router;
