/**
 * Automated Campaign Launcher
 * Creates Google Ads campaigns for existing marketplace listings
 */

import { Router, Request, Response } from 'express';
import { adCampaignManager } from '../services/adCampaigns';
import { getDatabase } from '../config/database';

const router = Router();

/**
 * POST /api/campaigns/launch
 * Automatically create Google Ads campaigns for top products
 */
router.post('/launch', async (req: Request, res: Response) => {
  console.log('🚀 AUTO-LAUNCH: Starting automated campaign creation...');

  try {
    // Get database
    const db = getDatabase();

    // Get all active listings, sorted by profit
    const listings = await db.find('MarketplaceListing', {
      where: { status: 'active' },
      order: [['estimatedProfit', 'DESC']],
      limit: 4 // Top 4 highest profit
    });

    console.log(`   Found ${listings.length} high-profit listings`);

    const results = [];

    for (const listing of listings) {
      console.log(`\n📢 Creating campaign for: ${listing.productTitle}`);
      console.log(`   Profit: $${listing.estimatedProfit}`);

      try {
        const campaigns = await adCampaignManager.createCampaignsForListing({
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          productDescription: listing.productDescription,
          productImages: listing.productImages,
          marketplacePrice: Number(listing.marketplacePrice),
          estimatedProfit: Number(listing.estimatedProfit),
        });

        results.push({
          success: true,
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          profit: listing.estimatedProfit,
          campaigns: campaigns,
          url: `https://api.arbi.creai.dev/product/${listing.listingId}`
        });

        console.log(`   ✅ Created ${campaigns.length} campaign(s)`);
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        results.push({
          success: false,
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          error: error.message
        });
      }

      // Wait 2 seconds between campaigns
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n✅ Campaign launch complete: ${successCount} success, ${failCount} failed`);

    res.json({
      success: true,
      message: `Launched ${successCount} campaigns successfully`,
      total: results.length,
      successful: successCount,
      failed: failCount,
      results: results,
      nextSteps: successCount > 0 ? [
        'Log into ads.google.com to review campaigns',
        'Enable campaigns to start showing ads',
        'Monitor Stripe dashboard for sales',
        'Scale winning products'
      ] : [
        'Check Google Ads credentials in Railway',
        'Verify developer token is approved',
        'Check error messages in results'
      ]
    });

  } catch (error: any) {
    console.error('❌ Campaign launch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to launch campaigns'
    });
  }
});

/**
 * POST /api/campaigns/launch/:listingId
 * Create campaign for a specific listing
 */
router.post('/launch/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  console.log(`🚀 Creating campaign for listing: ${listingId}`);

  try {
    const db = getDatabase();
    const listing = await db.findOne('MarketplaceListing', {
      where: { listingId }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    const campaigns = await adCampaignManager.createCampaignsForListing({
      listingId: listing.listingId,
      productTitle: listing.productTitle,
      productDescription: listing.productDescription,
      productImages: listing.productImages,
      marketplacePrice: Number(listing.marketplacePrice),
      estimatedProfit: Number(listing.estimatedProfit),
    });

    res.json({
      success: true,
      listingId,
      productTitle: listing.productTitle,
      campaigns,
      url: `https://api.arbi.creai.dev/product/${listingId}`
    });

  } catch (error: any) {
    console.error(`❌ Campaign creation failed:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/status
 * Check campaign creation status and Google Ads configuration
 */
router.get('/status', async (req: Request, res: Response) => {
  const hasGoogleAds = !!(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN
  );

  res.json({
    googleAdsConfigured: hasGoogleAds,
    credentials: {
      clientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
      developerToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      customerId: !!process.env.GOOGLE_ADS_CUSTOMER_ID,
      refreshToken: !!process.env.GOOGLE_ADS_REFRESH_TOKEN,
    },
    ready: hasGoogleAds
  });
});

export default router;
