/**
 * Google Ads Web Automation - ROBUST VERSION v2
 * Creates campaigns using Stagehand AI-powered browser automation
 */

import { Stagehand } from '@browserbasehq/stagehand';

export interface CampaignData {
  productName: string;
  productUrl: string;
  dailyBudget: number;
  targetCountry: string;
  videoUrl?: string;
  adCopy: {
    headline: string;
    description: string;
  };
}

/**
 * Create Google Ads campaign via AI-powered web automation
 */
export async function createCampaignViaWeb(
  campaignData: CampaignData,
  credentials: { email: string; password: string }
): Promise<{ success: boolean; campaignName: string; screenshot?: string }> {
  console.log(`🎯 Creating campaign: ${campaignData.productName}`);

  const stagehand = new Stagehand({
    env: 'LOCAL',
    enableCaching: false,
    headless: true, // Keep headless for server
    domSettleTimeoutMs: 5000,
  });

  try {
    await stagehand.init();
    await stagehand.page.setViewportSize({ width: 1920, height: 1080 });

    // Step 1: Navigate to Google Ads
    console.log('   📍 Opening Google Ads...');
    await stagehand.page.goto('https://ads.google.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Screenshot 1
    await stagehand.page.screenshot({ path: '/tmp/ads-1-start.png' });
    console.log('   📸 Saved: /tmp/ads-1-start.png');

    // Step 2: Check if login needed
    const needsLogin = await stagehand.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('sign in') || text.includes('email or phone');
    });

    if (needsLogin) {
      console.log('   🔐 Logging in...');
      await performLogin(stagehand, credentials);
    }

    // Step 3: Use AI to navigate and create campaign
    console.log('   🤖 Using AI to create campaign...');

    // Navigate to campaigns overview
    await stagehand.page.goto('https://ads.google.com/aw/campaigns', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await stagehand.page.screenshot({ path: '/tmp/ads-2-campaigns.png' });

    // Use AI to click "New campaign"
    await stagehand.act({
      action: 'click the button to create a new campaign'
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await stagehand.page.screenshot({ path: '/tmp/ads-3-new-campaign.png' });

    // Select goal using AI
    await stagehand.act({
      action: 'select the "Sales" or "Website conversions" campaign goal'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Select campaign type
    await stagehand.act({
      action: 'select "Video" as the campaign type'
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click Continue
    await stagehand.act({
      action: 'click the Continue button'
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    await stagehand.page.screenshot({ path: '/tmp/ads-4-setup.png' });

    // Fill campaign name
    const campaignName = `Arbi - ${campaignData.productName}`;
    await stagehand.act({
      action: `type "${campaignName}" in the campaign name field`
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set budget
    await stagehand.act({
      action: `set the daily budget to ${campaignData.dailyBudget} dollars`
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set location
    await stagehand.act({
      action: `set the location targeting to ${campaignData.targetCountry}`
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await stagehand.page.screenshot({ path: '/tmp/ads-5-details.png' });

    // Create ad
    console.log('   🎨 Creating ad...');

    // Set final URL
    await stagehand.act({
      action: `enter ${campaignData.productUrl} as the final URL or website address`
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set headline
    await stagehand.act({
      action: `enter "${campaignData.adCopy.headline}" as the ad headline`
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set description
    await stagehand.act({
      action: `enter "${campaignData.adCopy.description}" as the ad description`
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await stagehand.page.screenshot({ path: '/tmp/ads-6-ad-filled.png' });

    // Submit campaign
    console.log('   ✅ Publishing campaign...');

    await stagehand.act({
      action: 'click the button to publish or create the campaign'
    });
    await new Promise(resolve => setTimeout(resolve, 5000));

    await stagehand.page.screenshot({ path: '/tmp/ads-7-submitted.png' });

    // Verify creation
    const verified = await stagehand.page.evaluate((name) => {
      const text = document.body.innerText;
      return text.includes(name) ||
             text.includes('Campaign created') ||
             text.includes('successfully') ||
             text.includes('published');
    }, campaignName);

    await stagehand.close();

    if (verified) {
      console.log(`   🎉 SUCCESS: ${campaignName}`);
      return { success: true, campaignName, screenshot: '/tmp/ads-7-submitted.png' };
    } else {
      console.log(`   ⚠️  Could not verify: ${campaignName}`);
      return { success: false, campaignName, screenshot: '/tmp/ads-7-submitted.png' };
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);

    try {
      await stagehand.page.screenshot({ path: '/tmp/ads-error.png' });
      console.log('   📸 Error screenshot: /tmp/ads-error.png');
    } catch (e) {}

    await stagehand.close();
    throw error;
  }
}

/**
 * Perform Google login
 */
async function performLogin(
  stagehand: Stagehand,
  credentials: { email: string; password: string }
) {
  // Wait for email field
  await stagehand.page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Enter email
  await stagehand.page.fill('input[type="email"]', credentials.email);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Click Next
  const nextButtons = await stagehand.page.$$('button');
  for (const button of nextButtons) {
    const text = await button.textContent();
    if (text?.includes('Next')) {
      await button.click();
      break;
    }
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Wait for password field
  await stagehand.page.waitForSelector('input[type="password"]', { timeout: 10000 });

  // Enter password
  await stagehand.page.fill('input[type="password"]', credentials.password);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Click Next/Sign in
  const signInButtons = await stagehand.page.$$('button');
  for (const button of signInButtons) {
    const text = await button.textContent();
    if (text?.includes('Next') || text?.includes('Sign in')) {
      await button.click();
      break;
    }
  }

  await new Promise(resolve => setTimeout(resolve, 5000));

  await stagehand.page.screenshot({ path: '/tmp/ads-logged-in.png' });
  console.log('   ✅ Logged in');
}

/**
 * Bulk create campaigns
 */
export async function createBulkCampaignsViaWeb(
  campaigns: CampaignData[],
  credentials: { email: string; password: string }
): Promise<{ success: number; failed: number; results: any[] }> {
  console.log(`🚀 Creating ${campaigns.length} campaigns...`);

  const results: any[] = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];

    try {
      console.log(`\n📦 [${i + 1}/${campaigns.length}] ${campaign.productName}`);

      const result = await createCampaignViaWeb(campaign, credentials);

      results.push({
        success: result.success,
        campaignName: result.campaignName,
        product: campaign.productName,
      });

      if (result.success) {
        success++;
      } else {
        failed++;
      }

      // Wait between campaigns
      if (i < campaigns.length - 1) {
        console.log('   ⏳ Waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`);
      results.push({
        success: false,
        product: campaign.productName,
        error: error.message,
      });
      failed++;
    }
  }

  console.log(`\n✅ Complete: ${success} succeeded, ${failed} failed`);

  return { success, failed, results };
}
