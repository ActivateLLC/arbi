/**
 * Launch Google Ads campaigns for existing marketplace listings
 * Focuses on highest-profit products first
 */

import 'dotenv/config';
import { adCampaignManager } from './apps/api/src/services/adCampaigns.js';

// Top 4 highest-profit products
const topProducts = [
  {
    listingId: 'listing_1766360580855_24nluy3za',
    productTitle: 'Sony Alpha A7 IV Mirrorless Full-Frame Camera Body',
    productDescription: 'Professional 33MP full-frame mirrorless camera with 4K60p video and advanced autofocus.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360580/arbi-marketplace/rainforest-B0C1SLD8VK-1766360579352.webp'],
    marketplacePrice: 3247.40,
    estimatedProfit: 749.40
  },
  {
    listingId: 'listing_1766360719390_8sddg1b06',
    productTitle: 'Roland TD-17KV V-Drums Electronic Drum Kit',
    productDescription: 'Professional electronic drum kit with mesh heads and Bluetooth connectivity.',
    productImages: ['https://placehold.co/600x600/667eea/white?text=Roland%20TD-17KV'],
    marketplacePrice: 2208.70,
    estimatedProfit: 509.70
  },
  {
    listingId: 'listing_1766360506926_eqhem4m2z',
    productTitle: 'Apple MacBook Air 13-inch M2 Chip 8GB RAM 256GB SSD',
    productDescription: '2022 MacBook Air with M2 chip, stunning 13.6-inch Liquid Retina display, 1080p FaceTime HD camera, up to 18 hours battery life.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360506/arbi-marketplace/rainforest-B09V3TGD7H-1766360505501.jpg'],
    marketplacePrice: 1618.65,
    estimatedProfit: 419.65
  },
  {
    listingId: 'listing_1766360665259_xisbrmzaw',
    productTitle: 'Garmin Fenix 7X Sapphire Solar GPS Smartwatch',
    productDescription: 'Premium multisport GPS watch with solar charging and advanced training features.',
    productImages: ['https://res.cloudinary.com/dyfumzftc/image/upload/v1766360664/arbi-marketplace/rainforest-B0B1VR6HRY-1766360664090.webp'],
    marketplacePrice: 1168.70,
    estimatedProfit: 269.70
  }
];

async function launchCampaigns() {
  console.log('🚀 Launching Google Ads campaigns for top 4 products...\n');
  console.log(`📊 Total potential profit: $${topProducts.reduce((sum, p) => sum + p.estimatedProfit, 0).toFixed(2)}\n`);

  for (const product of topProducts) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📢 Creating campaign: ${product.productTitle}`);
    console.log(`   💰 Price: $${product.marketplacePrice} (Profit: $${product.estimatedProfit})`);
    console.log(`   🔗 URL: https://api.arbi.creai.dev/product/${product.listingId}`);

    try {
      const campaigns = await adCampaignManager.createCampaignsForListing(product);

      console.log(`   ✅ Created ${campaigns.length} campaign(s):`);
      for (const campaign of campaigns) {
        console.log(`      - Campaign ID: ${campaign.campaignId}`);
        console.log(`        Platform: ${campaign.platform}`);
        console.log(`        Status: ${campaign.status}`);
        console.log(`        Ad Spend: $${campaign.adSpend}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Campaign creation failed: ${error.message}`);
      if (error.message.includes('Customer ID')) {
        console.error('      → Check GOOGLE_ADS_CUSTOMER_ID in Railway');
      } else if (error.message.includes('refresh token')) {
        console.error('      → Check GOOGLE_ADS_REFRESH_TOKEN in Railway');
      } else if (error.message.includes('developer token')) {
        console.error('      → Check GOOGLE_ADS_DEVELOPER_TOKEN in Railway');
      }
    }

    // Wait 2 seconds between campaigns to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Campaign launch complete!');
  console.log('\n📊 Next steps:');
  console.log('   1. Check Google Ads dashboard to verify campaigns are running');
  console.log('   2. Monitor for clicks and conversions');
  console.log('   3. Adjust budgets based on performance');
  console.log('   4. Track sales via Stripe dashboard');
}

launchCampaigns()
  .then(() => {
    console.log('\n🎉 All campaigns launched successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Campaign launch failed:', error);
    process.exit(1);
  });
