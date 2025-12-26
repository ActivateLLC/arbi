/**
 * Backfill Campaigns - Create AI video ads and Performance Max campaigns for existing listings
 *
 * This endpoint retroactively generates campaigns for listings that were created
 * before the AI video ad system was built.
 */

import express from 'express';
import { getListings, getListing, type MarketplaceListing } from './marketplace';
import { adCampaignManager } from '../services/adCampaigns';

const router = express.Router();

/**
 * POST /api/backfill/campaigns
 *
 * Generate AI video ads and Performance Max campaigns for all existing listings
 */
router.post('/campaigns', async (req, res) => {
  try {
    console.log('🔄 BACKFILL: Starting campaign generation for existing listings...\n');

    // Fetch all active marketplace listings
    const listings = await getListings('active');

    console.log(`📦 Found ${listings.length} active listings to process\n`);

    if (listings.length === 0) {
      return res.json({
        success: true,
        message: 'No active listings found',
        processed: 0,
        campaigns: [],
      });
    }

    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process each listing
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const num = i + 1;

      console.log(`\n[${ num }/${listings.length}] Processing: ${listing.productTitle}`);
      console.log(`   Price: $${listing.marketplacePrice}`);
      console.log(`   Images: ${listing.productImages.length}`);

      try {
        // Create campaigns (video ads + Performance Max + TikTok)
        const campaigns = await adCampaignManager.createCampaignsForListing({
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          productDescription: listing.productDescription,
          productImages: listing.productImages,
          marketplacePrice: listing.marketplacePrice,
          estimatedProfit: listing.estimatedProfit || 0,
        });

        successCount++;

        results.push({
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          success: true,
          campaigns: campaigns.map(c => ({
            platform: c.platform,
            campaignId: c.campaignId,
          })),
        });

        console.log(`   ✅ Success! Created ${campaigns.length} campaign(s)`);

      } catch (error: any) {
        failCount++;

        console.error(`   ❌ Failed: ${error.message}`);

        results.push({
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          success: false,
          error: error.message,
        });
      }

      // Rate limit: Wait 2 seconds between listings to avoid API throttling
      if (i < listings.length - 1) {
        console.log('   ⏳ Waiting 2 seconds before next listing...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n\n🎉 BACKFILL COMPLETE!\n');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Total: ${listings.length}`);

    res.json({
      success: true,
      message: `Backfill complete: ${successCount} successful, ${failCount} failed`,
      processed: listings.length,
      successCount,
      failCount,
      results,
    });

  } catch (error: any) {
    console.error('❌ Backfill error:', error);
    res.status(500).json({
      success: false,
      error: 'Backfill failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/backfill/campaigns/:listingId
 *
 * Generate campaigns for a SINGLE specific listing (useful for testing)
 */
router.post('/campaigns/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    console.log(`🔄 Creating campaigns for listing: ${listingId}\n`);

    // Fetch the listing
    const listing = await getListing(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
      });
    }

    console.log(`📦 Product: ${listing.productTitle}`);
    console.log(`   Price: $${listing.marketplacePrice}`);

    // Create campaigns
    const campaigns = await adCampaignManager.createCampaignsForListing({
      listingId: listing.listingId,
      productTitle: listing.productTitle,
      productDescription: listing.productDescription,
      productImages: listing.productImages,
      marketplacePrice: listing.marketplacePrice,
      estimatedProfit: listing.estimatedProfit || 0,
    });

    console.log(`\n✅ Created ${campaigns.length} campaign(s)`);

    res.json({
      success: true,
      listingId: listing.listingId,
      productTitle: listing.productTitle,
      campaigns: campaigns.map(c => ({
        platform: c.platform,
        campaignId: c.campaignId,
        status: c.status,
      })),
    });

  } catch (error: any) {
    console.error('❌ Campaign creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Campaign creation failed',
      message: error.message,
    });
  }
});

export default router;
