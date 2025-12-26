#!/usr/bin/env node
/**
 * Automatically create Google Ads campaigns for top profit products
 * This script uses the adCampaignManager to create real Google Ads campaigns
 */

import 'dotenv/config';
import { GoogleAdsApi, enums } from 'google-ads-api';

const API_BASE = process.env.API_URL || 'https://api.arbi.creai.dev';

// Top 4 products to advertise
const products = [
  {
    id: 'listing_1766360580855_24nluy3za',
    title: 'Sony Alpha A7 IV Mirrorless Full-Frame Camera Body',
    description: 'Professional 33MP full-frame mirrorless camera with 4K60p video',
    price: 3247.40,
    profit: 749.40,
    keywords: ['sony a7 iv', 'professional camera', 'full frame mirrorless camera', 'sony camera']
  },
  {
    id: 'listing_1766360719390_8sddg1b06',
    title: 'Roland TD-17KV V-Drums Electronic Drum Kit',
    description: 'Professional electronic drum kit with mesh heads',
    price: 2208.70,
    profit: 509.70,
    keywords: ['electronic drum kit', 'roland drums', 'v-drums', 'electronic drums']
  },
  {
    id: 'listing_1766360506926_eqhem4m2z',
    title: 'Apple MacBook Air 13-inch M2 Chip 8GB RAM 256GB SSD',
    description: '2022 MacBook Air with M2 chip and Liquid Retina display',
    price: 1618.65,
    profit: 419.65,
    keywords: ['macbook air m2', 'apple laptop', 'macbook air', 'apple m2 laptop']
  },
  {
    id: 'listing_1766360665259_xisbrmzaw',
    title: 'Garmin Fenix 7X Sapphire Solar GPS Smartwatch',
    description: 'Premium multisport GPS watch with solar charging',
    price: 1168.70,
    profit: 269.70,
    keywords: ['garmin fenix 7x', 'gps smartwatch', 'multisport watch', 'garmin watch']
  }
];

// Google Ads configuration
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
});

console.log('🚀 AUTO-LAUNCHING GOOGLE ADS CAMPAIGNS\n');
console.log(`📊 Total Profit Potential: $${products.reduce((sum, p) => sum + p.profit, 0).toFixed(2)}\n`);
console.log('='.repeat(80));

let successCount = 0;
let failCount = 0;

for (const product of products) {
  console.log(`\n📢 Creating campaign: ${product.title}`);
  console.log(`   💰 Price: $${product.price} (Profit: $${product.profit})`);
  console.log(`   🔗 URL: ${API_BASE}/product/${product.id}`);

  try {
    // Create campaign budget
    const budgetResults = await customer.campaignBudgets.create([{
      name: `Budget - ${product.title.substring(0, 50)}`,
      amount_micros: 50 * 1000000, // $50/day
      delivery_method: enums.BudgetDeliveryMethod.STANDARD,
    }]);
    const budget = budgetResults[0];
    console.log(`   ✅ Budget created: $50/day`);

    // Create campaign
    const campaignResults = await customer.campaigns.create([{
      name: product.title.substring(0, 100),
      status: enums.CampaignStatus.PAUSED, // Start paused for review
      advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
      campaign_budget: budget.resource_name,
      bidding_strategy_type: enums.BiddingStrategyType.TARGET_CPA,
      target_cpa: {
        target_cpa_micros: 20 * 1000000, // $20 target CPA
      },
      network_settings: {
        target_google_search: true,
        target_search_network: true,
        target_content_network: false,
      },
    }]);
    const campaign = campaignResults[0];
    console.log(`   ✅ Campaign created: ${campaign.campaign.id}`);

    // Create ad group
    const adGroupResults = await customer.adGroups.create([{
      name: `${product.title.substring(0, 80)} - Ad Group`,
      campaign: campaign.resource_name,
      status: enums.AdGroupStatus.ENABLED,
      type: enums.AdGroupType.SEARCH_STANDARD,
    }]);
    const adGroup = adGroupResults[0];
    console.log(`   ✅ Ad Group created`);

    // Create keywords
    const keywordOperations = product.keywords.slice(0, 4).map(keyword => ({
      ad_group: adGroup.resource_name,
      status: enums.KeywordMatchType.BROAD,
      keyword: {
        text: keyword,
        match_type: enums.KeywordMatchType.BROAD,
      },
    }));

    await customer.adGroupCriteria.create(keywordOperations);
    console.log(`   ✅ ${product.keywords.length} keywords added`);

    // Create responsive search ad
    const adResults = await customer.adGroupAds.create([{
      ad_group: adGroup.resource_name,
      status: enums.AdGroupAdStatus.ENABLED,
      ad: {
        final_urls: [`${API_BASE}/product/${product.id}`],
        responsive_search_ad: {
          headlines: [
            { text: product.title.substring(0, 30) },
            { text: `Buy ${product.title.split(' ')[0]} - Free Shipping` },
            { text: `${product.title.split(' ').slice(0, 3).join(' ')} Sale` },
          ],
          descriptions: [
            { text: product.description.substring(0, 90) },
            { text: 'Free Shipping. Buy Now Pay Later. 30-Day Returns.' },
          ],
        },
      },
    }]);
    console.log(`   ✅ Responsive Search Ad created`);

    console.log(`   🎯 Campaign Status: PAUSED (ready to enable)`);
    console.log(`   📊 Campaign ID: ${campaign.campaign.id}`);
    successCount++;

  } catch (error) {
    console.error(`   ❌ FAILED: ${error.message}`);

    if (error.message.includes('CUSTOMER_NOT_FOUND')) {
      console.error(`      → Check GOOGLE_ADS_CUSTOMER_ID (current: ${process.env.GOOGLE_ADS_CUSTOMER_ID})`);
    } else if (error.message.includes('UNAUTHENTICATED')) {
      console.error(`      → Check GOOGLE_ADS_REFRESH_TOKEN`);
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.error(`      → Developer token may need approval from Google`);
    } else if (error.message.includes('DEVELOPER_TOKEN_NOT_ON_ALLOWLIST')) {
      console.error(`      → Developer token not approved yet - apply for approval at ads.google.com`);
    }

    failCount++;
  }

  // Wait between campaigns to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Campaign Launch Complete!`);
console.log(`   Success: ${successCount} campaigns`);
console.log(`   Failed: ${failCount} campaigns\n`);

if (successCount > 0) {
  console.log('🎯 Next Steps:');
  console.log('   1. Go to ads.google.com');
  console.log('   2. Review your new campaigns');
  console.log('   3. Enable campaigns to start showing ads');
  console.log('   4. Monitor performance in Google Ads dashboard');
  console.log('   5. Check Stripe for incoming payments!\n');

  console.log('💰 Profit Calculation:');
  console.log(`   If each campaign gets 2 sales/week:`);
  console.log(`   Week 1: ${successCount * 2} sales × $${(products.reduce((sum, p) => sum + p.profit, 0) / products.length).toFixed(0)} avg profit = $${(successCount * 2 * (products.reduce((sum, p) => sum + p.profit, 0) / products.length)).toFixed(0)}`);
  console.log(`   Week 2: Scale to $10K+ 🚀\n`);
}

if (failCount > 0) {
  console.log('⚠️  Some campaigns failed to create.');
  console.log('   Check the error messages above for details.');
  console.log('   Common issues:');
  console.log('   - Developer token not approved (apply at ads.google.com)');
  console.log('   - Wrong customer ID format (should be 10 digits)');
  console.log('   - Refresh token expired (regenerate via OAuth Playground)\n');
}

console.log('🚀 LET\'S MAKE $10K! 💰\n');
