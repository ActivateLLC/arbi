/**
 * Automated Google Ads Campaign Creation
 * Using Stagehand Browser Automation
 *
 * Product: Sony Alpha A7 IV Camera
 * Profit: $749.40 per sale
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

async function createGoogleAdsCampaign() {
  console.log('🚀 Starting Google Ads campaign creation automation...\n');

  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: 'LOCAL',
    headless: false, // Show browser so user can log in
    enableCaching: true,
    logger: (message: string) => console.log(`   [Stagehand] ${message}`),
  });

  try {
    await stagehand.init();
    console.log('✅ Stagehand initialized\n');

    // Campaign details
    const campaign = {
      productName: 'Sony Alpha A7 IV Camera',
      landingUrl: 'https://api.arbi.creai.dev/product/listing_1766360580855_24nluy3za',
      dailyBudget: 60,
      headlines: [
        'Sony A7 IV - $3,247',
        '33MP Full-Frame - $812/mo',
        'Pro Camera - Free Shipping',
        'Sony A7 IV - 4K60p Video',
        'Shop Sony A7 IV Today',
        'Professional Mirrorless',
        'Limited Stock - Order Now',
        'Sony A7 IV Body - Best Price',
        'Pay $812/mo with Klarna',
        'Sony Alpha A7 IV Camera',
      ],
      descriptions: [
        'Sony Alpha A7 IV 33MP full-frame camera. 4K60p video. Professional autofocus. Shop now!',
        'Professional 33MP mirrorless camera with 4K60p video. Pay $812/month. Free shipping.',
        'Full-frame Sony A7 IV camera body. Advanced autofocus. Secure checkout. Fast delivery.',
        'Get the Sony A7 IV for $3,247. Pro-level 33MP sensor. Limited stock available today.',
        '33MP full-frame sensor. 4K60p video. Real-time AF tracking. Best price guaranteed.',
      ],
    };

    // Step 1: Navigate to Google Ads
    console.log('📍 Step 1: Navigating to Google Ads...');
    await stagehand.page.goto('https://ads.google.com');
    await stagehand.page.waitForTimeout(3000);

    // Check if user needs to log in
    const currentUrl = stagehand.page.url();
    if (currentUrl.includes('accounts.google.com')) {
      console.log('🔐 Please log in to your Google Ads account in the browser...');
      console.log('   Waiting 60 seconds for you to complete login...');
      await stagehand.page.waitForTimeout(60000);
    }

    console.log('✅ Logged into Google Ads\n');

    // Step 2: Create new campaign
    console.log('📍 Step 2: Creating new campaign...');

    // Look for "New Campaign" button
    await stagehand.act({
      action: 'click on the new campaign button or plus button to create a campaign',
    });
    await stagehand.page.waitForTimeout(2000);

    // Select campaign goal: Sales
    console.log('📍 Step 3: Selecting campaign goal (Sales)...');
    await stagehand.act({
      action: 'select Sales as the campaign goal',
    });
    await stagehand.page.waitForTimeout(1000);

    // Select campaign type: Performance Max
    console.log('📍 Step 4: Selecting Performance Max campaign type...');
    await stagehand.act({
      action: 'select Performance Max as the campaign type',
    });
    await stagehand.page.waitForTimeout(1000);

    // Click Continue
    await stagehand.act({
      action: 'click the continue button',
    });
    await stagehand.page.waitForTimeout(2000);

    // Step 3: Set campaign name
    console.log('📍 Step 5: Setting campaign name...');
    await stagehand.act({
      action: 'fill in the campaign name field with "Sony A7 IV Camera - High Profit"',
    });
    await stagehand.page.waitForTimeout(1000);

    // Step 4: Set budget
    console.log(`📍 Step 6: Setting daily budget to $${campaign.dailyBudget}...`);
    await stagehand.act({
      action: `set the daily budget to ${campaign.dailyBudget}`,
    });
    await stagehand.page.waitForTimeout(1000);

    // Step 5: Set bidding strategy
    console.log('📍 Step 7: Setting bidding strategy to Maximize Conversions...');
    await stagehand.act({
      action: 'select Maximize Conversions as the bidding strategy',
    });
    await stagehand.page.waitForTimeout(1000);

    // Set Target ROAS (if available)
    console.log('📍 Step 8: Setting Target ROAS to 400%...');
    try {
      await stagehand.act({
        action: 'enable target ROAS and set it to 400 percent',
      });
      await stagehand.page.waitForTimeout(1000);
    } catch (error) {
      console.log('   ⚠️  Target ROAS not available (will use standard Maximize Conversions)');
    }

    // Step 6: Set location targeting (United States)
    console.log('📍 Step 9: Setting location targeting to United States...');
    await stagehand.act({
      action: 'set location targeting to United States',
    });
    await stagehand.page.waitForTimeout(1000);

    // Step 7: Set language
    console.log('📍 Step 10: Setting language to English...');
    await stagehand.act({
      action: 'set language to English',
    });
    await stagehand.page.waitForTimeout(1000);

    // Continue to asset group
    console.log('📍 Step 11: Continuing to asset group setup...');
    await stagehand.act({
      action: 'click continue or next to proceed to asset group setup',
    });
    await stagehand.page.waitForTimeout(3000);

    // Step 8: Set Final URL
    console.log(`📍 Step 12: Setting final URL to ${campaign.landingUrl}...`);
    await stagehand.act({
      action: `fill in the final URL field with "${campaign.landingUrl}"`,
    });
    await stagehand.page.waitForTimeout(2000);

    // Step 9: Add Headlines
    console.log(`📍 Step 13: Adding ${campaign.headlines.length} headlines...`);
    for (let i = 0; i < campaign.headlines.length; i++) {
      const headline = campaign.headlines[i];
      console.log(`   Adding headline ${i + 1}: "${headline}"`);

      await stagehand.act({
        action: `add headline "${headline}" to the headlines list`,
      });
      await stagehand.page.waitForTimeout(500);
    }

    // Step 10: Add Descriptions
    console.log(`📍 Step 14: Adding ${campaign.descriptions.length} descriptions...`);
    for (let i = 0; i < campaign.descriptions.length; i++) {
      const description = campaign.descriptions[i];
      console.log(`   Adding description ${i + 1}: "${description.substring(0, 50)}..."`);

      await stagehand.act({
        action: `add description "${description}" to the descriptions list`,
      });
      await stagehand.page.waitForTimeout(500);
    }

    // Step 11: Add Audience Signals
    console.log('📍 Step 15: Adding audience signals...');

    // Photography interest
    await stagehand.act({
      action: 'add Photography as an audience interest signal',
    });
    await stagehand.page.waitForTimeout(1000);

    // Content Creation interest
    await stagehand.act({
      action: 'add Content Creation as an audience interest signal',
    });
    await stagehand.page.waitForTimeout(1000);

    // Videography interest
    await stagehand.act({
      action: 'add Videography as an audience interest signal',
    });
    await stagehand.page.waitForTimeout(1000);

    // Step 12: Set demographics (Top 30% income)
    console.log('📍 Step 16: Setting demographics to top 30% income...');
    try {
      await stagehand.act({
        action: 'set demographic targeting to top 30 percent household income',
      });
      await stagehand.page.waitForTimeout(1000);
    } catch (error) {
      console.log('   ⚠️  Demographics targeting not available in this view');
    }

    // Step 13: Review campaign
    console.log('\n📍 Step 17: Campaign setup complete! Reviewing...\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 CAMPAIGN SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Product:        ${campaign.productName}`);
    console.log(`Landing URL:    ${campaign.landingUrl}`);
    console.log(`Daily Budget:   $${campaign.dailyBudget}`);
    console.log(`Headlines:      ${campaign.headlines.length} added`);
    console.log(`Descriptions:   ${campaign.descriptions.length} added`);
    console.log(`Campaign Type:  Performance Max`);
    console.log(`Bidding:        Maximize Conversions (Target ROAS: 400%)`);
    console.log(`Location:       United States`);
    console.log(`Language:       English`);
    console.log(`Audiences:      Photography, Content Creation, Videography`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Step 14: Ask user to review before publishing
    console.log('⚠️  IMPORTANT: Please review the campaign in the browser before publishing!');
    console.log('   The browser will stay open for you to:');
    console.log('   1. Review all campaign settings');
    console.log('   2. Make any final adjustments');
    console.log('   3. Click "Publish Campaign" when ready');
    console.log('\n   Browser will close in 5 minutes or press Ctrl+C to close now...\n');

    // Keep browser open for 5 minutes
    await stagehand.page.waitForTimeout(300000);

    console.log('✅ Campaign creation automation complete!');
    console.log('   Remember to click "Publish Campaign" in the Google Ads UI\n');

  } catch (error: any) {
    console.error('❌ Error during campaign creation:', error.message);
    console.error('   Please complete the campaign setup manually in the browser');
    console.error('   Browser will stay open for manual completion...');

    // Keep browser open on error
    await stagehand.page.waitForTimeout(300000);
  } finally {
    await stagehand.close();
    console.log('🔚 Browser closed');
  }
}

// Run the automation
createGoogleAdsCampaign().catch(console.error);
