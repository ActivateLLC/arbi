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
    ready: hasGoogleAds,
    accountInfo: {
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || null,
      campaignNamingPattern: 'Arbi - [Product Name]',
      exampleCampaigns: [
        'Arbi - Apple AirPods Pro (2nd Generation)',
        'Arbi - Meta Quest 3 128GB VR Headset',
        'Arbi - Dyson V15 Detect Cordless Vacuum',
        'Arbi - Apple MacBook Air 13-inch M2 Chip',
        'Arbi - Nintendo Switch OLED Model',
        'Arbi - GoPro HERO12 Black Action Camera'
      ]
    }
  });
});

/**
 * GET /api/campaigns/live
 * Query actual live campaigns from Google Ads account
 */
router.get('/live', async (req: Request, res: Response) => {
  try {
    const { GoogleAdsApi } = require('google-ads-api');

    if (!process.env.GOOGLE_ADS_CLIENT_ID) {
      return res.status(400).json({
        error: 'Google Ads not configured',
        configured: false
      });
    }

    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    // Query active campaigns with ad details
    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND campaign.name LIKE 'Arbi%'
      ORDER BY campaign.id DESC
      LIMIT 20
    `);

    const campaignDetails = [];

    for (const row of campaigns) {
      const campaign = row.campaign;
      const budget = row.campaign_budget;
      const metrics = row.metrics;

      // Get ad details for this campaign
      const ads = await customer.query(`
        SELECT
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls
        FROM ad_group_ad
        WHERE campaign.id = ${campaign.id}
          AND ad_group_ad.status = 'ENABLED'
        LIMIT 1
      `);

      let adContent = null;
      if (ads.length > 0) {
        const rsa = ads[0].ad_group_ad.ad.responsive_search_ad;
        adContent = {
          headlines: rsa.headlines.map((h: any) => h.text),
          descriptions: rsa.descriptions.map((d: any) => d.text),
          finalUrl: ads[0].ad_group_ad.ad.final_urls[0]
        };
      }

      campaignDetails.push({
        campaignId: campaign.id.toString(),
        name: campaign.name,
        status: campaign.status,
        type: campaign.advertising_channel_type,
        dailyBudget: (budget.amount_micros / 1000000).toFixed(2),
        performance: {
          impressions: metrics.impressions.toString(),
          clicks: metrics.clicks.toString(),
          cost: (metrics.cost_micros / 1000000).toFixed(2),
          conversions: metrics.conversions.toString(),
          ctr: metrics.impressions > 0
            ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) + '%'
            : '0%',
          avgCpc: metrics.clicks > 0
            ? '$' + (metrics.cost_micros / 1000000 / metrics.clicks).toFixed(2)
            : '$0.00'
        },
        ad: adContent
      });
    }

    res.json({
      success: true,
      totalCampaigns: campaigns.length,
      campaigns: campaignDetails,
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID
    });

  } catch (error: any) {
    console.error('Error fetching live campaigns:', error);
    res.status(500).json({
      error: 'Failed to fetch campaigns',
      message: error.message,
      details: error.errors?.[0]?.message || null
    });
  }
});

/**
 * GET /api/campaigns/info
 * Get Google Ads account info and campaign names
 */
router.get('/info', async (req: Request, res: Response) => {
  res.json({
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || 'Not configured',
    campaignNamingPattern: 'Arbi - [Product Name]',
    recentCampaigns: [
      'Arbi - Apple AirPods Pro (2nd Generation)',
      'Arbi - Meta Quest 3 128GB VR Headset',
      'Arbi - Dyson V15 Detect Cordless Vacuum',
      'Arbi - Apple MacBook Air 13-inch M2 Chip',
      'Arbi - Nintendo Switch OLED Model',
      'Arbi - GoPro HERO12 Black Action Camera'
    ],
    howToView: 'Go to https://ads.google.com and search for campaigns starting with "Arbi -"'
  });
});

export default router;
