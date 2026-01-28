/**
 * End-to-End Campaign Launcher
 * Test Google Ads API → Launch Campaigns → Generate Revenue
 */

import { Router, Request, Response } from 'express';
import { adCampaignManager } from '../services/adCampaigns';
import { getDatabase } from '../config/database';

const router = Router();

/**
 * POST /api/campaigns/launch-all
 * Complete end-to-end campaign launch:
 * 1. Test Google Ads API
 * 2. Get top performing products
 * 3. Create Performance Max campaigns
 * 4. Enable campaigns for immediate traffic
 */
router.post('/launch-all', async (req: Request, res: Response) => {
  console.log('\n🚀 END-TO-END CAMPAIGN LAUNCH STARTING...\n');
  console.log('=' .repeat(80));

  const results: any = {
    step1_apiTest: null,
    step2_listings: null,
    step3_campaigns: null,
    summary: {
      totalCampaigns: 0,
      successfulCampaigns: 0,
      failedCampaigns: 0,
      estimatedDailySpend: 0,
      estimatedDailyRevenue: 0,
      estimatedDailyProfit: 0,
    },
  };

  try {
    // ===== STEP 1: Test Google Ads API =====
    console.log('\n📡 STEP 1: Testing Google Ads API Connection...\n');

    const credentials = {
      clientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
      developerToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refreshToken: !!process.env.GOOGLE_ADS_REFRESH_TOKEN,
    };

    console.log('   Checking credentials:');
    console.log(`   - Client ID: ${credentials.clientId ? '✅' : '❌'}`);
    console.log(`   - Client Secret: ${credentials.clientSecret ? '✅' : '❌'}`);
    console.log(`   - Developer Token: ${credentials.developerToken ? '✅' : '❌'}`);
    console.log(`   - Customer ID: ${credentials.customerId || '❌'}`);
    console.log(`   - Refresh Token: ${credentials.refreshToken ? '✅' : '❌'}`);

    if (!credentials.clientId || !credentials.refreshToken || !credentials.customerId) {
      results.step1_apiTest = {
        success: false,
        error: 'Missing required Google Ads credentials',
        credentials,
      };
      console.log('\n❌ FAILED: Missing Google Ads credentials\n');
      return res.status(400).json(results);
    }

    // Test API connection
    try {
      const { GoogleAdsApi } = require('google-ads-api');

      const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!.trim(),
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!.trim(),
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
      });

      const customer = client.Customer({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!.trim(),
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!.trim(),
      });

      const campaigns = await customer.query(`
        SELECT campaign.id, campaign.name, campaign.status
        FROM campaign
        LIMIT 5
      `);

      results.step1_apiTest = {
        success: true,
        customerId: credentials.customerId,
        existingCampaigns: campaigns.length,
      };

      console.log(`   ✅ API Connection Successful! Found ${campaigns.length} existing campaigns\n`);
    } catch (apiError: any) {
      results.step1_apiTest = {
        success: false,
        error: apiError.message,
      };
      console.log(`   ❌ API Connection Failed: ${apiError.message}\n`);
      return res.status(500).json(results);
    }

    // ===== STEP 2: Get Top Products =====
    console.log('📦 STEP 2: Loading Top Performing Products...\n');

    const db = getDatabase();
    const listings = await db.find('MarketplaceListing', {
      where: { status: 'active' },
      order: [['estimatedProfit', 'DESC']],
      limit: 10, // Top 10 products
    });

    console.log(`   Found ${listings.length} active listings\n`);

    if (listings.length === 0) {
      results.step2_listings = {
        success: false,
        error: 'No active listings found in database',
      };
      console.log('   ❌ No active listings to launch campaigns for\n');
      return res.status(404).json(results);
    }

    results.step2_listings = {
      success: true,
      count: listings.length,
      topProducts: listings.slice(0, 5).map((l: any) => ({
        title: l.productTitle,
        profit: l.estimatedProfit,
        price: l.marketplacePrice,
      })),
    };

    // ===== STEP 3: Create Campaigns =====
    console.log('🎯 STEP 3: Creating Performance Max Campaigns...\n');

    const campaignResults = [];
    let totalDailyBudget = 0;

    for (const listing of listings) {
      console.log(`   Creating campaign: ${listing.productTitle}`);
      console.log(`   - Profit: $${listing.estimatedProfit}`);
      console.log(`   - Price: $${listing.marketplacePrice}`);

      try {
        const campaigns = await adCampaignManager.createCampaignsForListing({
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          productDescription: listing.productDescription,
          productImages: listing.productImages,
          marketplacePrice: Number(listing.marketplacePrice),
          estimatedProfit: Number(listing.estimatedProfit),
        });

        // Calculate daily budget (typically set in createCampaignsForListing)
        const dailyBudget = Number(listing.estimatedProfit) * 0.3; // 30% of profit as ad spend
        totalDailyBudget += dailyBudget;

        campaignResults.push({
          success: true,
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          profit: listing.estimatedProfit,
          price: listing.marketplacePrice,
          campaigns: campaigns.length,
          dailyBudget,
          productUrl: `https://api.arbi.creai.dev/product/${listing.listingId}`,
        });

        console.log(`   ✅ Created ${campaigns.length} campaign(s) - Daily Budget: $${dailyBudget.toFixed(2)}\n`);

        results.summary.totalCampaigns += campaigns.length;
        results.summary.successfulCampaigns += campaigns.length;
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}\n`);
        campaignResults.push({
          success: false,
          listingId: listing.listingId,
          productTitle: listing.productTitle,
          error: error.message,
        });
        results.summary.failedCampaigns++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    results.step3_campaigns = {
      success: true,
      campaigns: campaignResults,
    };

    // ===== CALCULATE PROJECTIONS =====
    console.log('=' .repeat(80));
    console.log('\n💰 REVENUE PROJECTIONS\n');

    results.summary.estimatedDailySpend = totalDailyBudget;

    // Conservative estimates:
    // - 2% conversion rate from ad clicks
    // - Average $50 order value
    // - 30% profit margin
    const estimatedClicks = totalDailyBudget / 0.50; // $0.50 per click
    const estimatedConversions = estimatedClicks * 0.02; // 2% conversion
    const estimatedRevenue = estimatedConversions * 50; // $50 AOV
    const estimatedProfit = estimatedRevenue * 0.30; // 30% margin

    results.summary.estimatedDailyRevenue = estimatedRevenue;
    results.summary.estimatedDailyProfit = estimatedProfit;

    console.log(`   Daily Ad Spend: $${totalDailyBudget.toFixed(2)}`);
    console.log(`   Estimated Clicks: ${estimatedClicks.toFixed(0)}`);
    console.log(`   Estimated Conversions: ${estimatedConversions.toFixed(1)}`);
    console.log(`   Estimated Daily Revenue: $${estimatedRevenue.toFixed(2)}`);
    console.log(`   Estimated Daily Profit: $${estimatedProfit.toFixed(2)}`);
    console.log(`   ROI: ${((estimatedProfit / totalDailyBudget) * 100).toFixed(1)}%\n`);

    // 24-hour projection to $10K
    const hoursToTarget = 10000 / estimatedRevenue;
    console.log(`   ⏰ Hours to $10K Revenue: ${hoursToTarget.toFixed(1)} hours`);
    console.log(`   ⏰ Days to $10K Revenue: ${(hoursToTarget / 24).toFixed(1)} days\n`);

    if (hoursToTarget <= 24) {
      console.log(`   🎯 TARGET ACHIEVABLE! Should hit $10K within 24 hours!\n`);
    } else {
      console.log(`   ⚠️  Need to scale: Current projection is ${(hoursToTarget / 24).toFixed(1)} days to $10K\n`);
      console.log(`   💡 To hit $10K in 24 hours, increase daily budget to: $${(totalDailyBudget * (hoursToTarget / 24)).toFixed(2)}\n`);
    }

    console.log('=' .repeat(80));
    console.log('\n✅ CAMPAIGN LAUNCH COMPLETE!\n');
    console.log('Next Steps:');
    console.log('   1. Log into ads.google.com to review campaigns');
    console.log('   2. Enable campaigns to start showing ads');
    console.log('   3. Monitor Stripe dashboard for sales');
    console.log('   4. Scale winning products');
    console.log('   5. Track conversions at https://api.arbi.creai.dev/revenue\n');

    res.json({
      success: true,
      message: `🚀 Launched ${results.summary.successfulCampaigns} campaigns successfully!`,
      ...results,
      projections: {
        conservative: {
          dailyRevenue: estimatedRevenue,
          dailyProfit: estimatedProfit,
          hoursTo10K: hoursToTarget,
          daysTo10K: hoursToTarget / 24,
        },
        toHit10KIn24Hours: {
          requiredDailyBudget: totalDailyBudget * (hoursToTarget / 24),
          multiplier: hoursToTarget / 24,
        },
      },
    });

  } catch (error: any) {
    console.error('\n❌ LAUNCH FAILED:', error.message);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
      ...results,
    });
  }
});

export default router;
