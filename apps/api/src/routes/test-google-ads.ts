/**
 * Google Ads Test Endpoint
 * Test credentials and list campaigns
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/test/google-ads
 * Test Google Ads API connection and list campaigns
 */
router.get('/google-ads', async (req: Request, res: Response) => {
  console.log('\n🔍 Testing Google Ads API Connection...\n');

  // Check credentials
  const credentials = {
    clientId: !!process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: !!process.env.GOOGLE_ADS_CLIENT_SECRET,
    developerToken: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
    refreshToken: !!process.env.GOOGLE_ADS_REFRESH_TOKEN,
  };

  console.log('📋 Checking credentials:');
  console.log('   GOOGLE_ADS_CLIENT_ID:', credentials.clientId ? '✅ Set' : '❌ Missing');
  console.log('   GOOGLE_ADS_CLIENT_SECRET:', credentials.clientSecret ? '✅ Set' : '❌ Missing');
  console.log('   GOOGLE_ADS_DEVELOPER_TOKEN:', credentials.developerToken ? '✅ Set' : '❌ Missing');
  console.log('   GOOGLE_ADS_CUSTOMER_ID:', credentials.customerId || '❌ Missing');
  console.log('   GOOGLE_ADS_REFRESH_TOKEN:', credentials.refreshToken ? '✅ Set' : '❌ Missing');

  if (!credentials.clientId || !credentials.refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing required Google Ads credentials',
      credentials,
    });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GoogleAdsApi } = require('google-ads-api');

    // Initialize client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    console.log('\n🔄 Fetching campaigns...\n');

    // Query campaigns (simplified - just basic info, no metrics)
    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.id DESC
      LIMIT 20
    `);

    console.log(`✅ Found ${campaigns.length} campaign(s)\n`);

    const campaignList = campaigns.map((row: any) => {
      const campaign = row.campaign;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        type: campaign.advertising_channel_type,
      };
    });

    // Look for Arbi campaigns
    const arbiCampaigns = campaignList.filter((c: any) =>
      c.name.toLowerCase().includes('arbi')
    );

    console.log('✅ Google Ads API connection is valid!');
    console.log(`🎯 Found ${arbiCampaigns.length} Arbi campaign(s)!`);

    return res.json({
      success: true,
      message: 'Google Ads API connection successful',
      credentials: {
        customerId: credentials.customerId,
        configured: true,
      },
      totalCampaigns: campaigns.length,
      arbiCampaigns: arbiCampaigns.length,
      campaigns: campaignList,
      arbiCampaignsDetail: arbiCampaigns,
    });

  } catch (error: any) {
    console.error('\n❌ Error testing Google Ads API:');
    console.error('   Message:', error.message);

    let errorDetails = error.message;
    if (error.errors) {
      errorDetails = error.errors.map((err: any) => ({
        code: err.error_code?.authentication_error || 'unknown',
        message: err.message,
      }));
    }

    return res.status(500).json({
      success: false,
      error: 'Google Ads API test failed',
      message: error.message,
      details: errorDetails,
      possibleCauses: [
        'Invalid refresh token (needs re-authentication)',
        'Wrong customer ID (check if sub-account ID is correct)',
        'API access not granted to the sub-account',
      ],
    });
  }
});

export default router;
