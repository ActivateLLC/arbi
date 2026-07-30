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

    // Step 1: Navigate directly to Google Ads with customer ID in URL
    // This helps bypass account selection screens
    console.log('   📍 Opening Google Ads...');
    const googleAdsUrl = 'https://ads.google.com/aw/campaigns?ocid=7916628817';
    await stagehand.page.goto(googleAdsUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Screenshot 1
    await stagehand.page.screenshot({ path: '/tmp/ads-1-start.png' });
    console.log('   📸 Saved: /tmp/ads-1-start.png');

    // Step 2: Check if login needed (more flexible detection)
    const needsLogin = await stagehand.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const hasEmailInput = document.querySelector('input[type="email"]') !== null;
      const hasPasswordInput = document.querySelector('input[type="password"]') !== null;
      return text.includes('sign in') ||
             text.includes('email or phone') ||
             text.includes('enter your email') ||
             hasEmailInput ||
             hasPasswordInput;
    });

    console.log(`   🔍 Login detection: ${needsLogin ? 'Login required' : 'Already logged in or account selection'}`);

    if (needsLogin) {
      console.log('   🔐 Performing login...');
      await performLogin(stagehand, credentials);
    } else {
      console.log('   ✅ Skipping login (already authenticated or different screen)');
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
 * Perform Google login (with better error handling)
 */
async function performLogin(
  stagehand: Stagehand,
  credentials: { email: string; password: string }
) {
  try {
    // Wait for email field (with retry)
    console.log('   📧 Waiting for email field...');

    let emailField = await stagehand.page.$('input[type="email"]');

    if (!emailField) {
      // Try alternative selectors
      await new Promise(resolve => setTimeout(resolve, 2000));
      emailField = await stagehand.page.$('input[name="identifier"]');
    }

    if (!emailField) {
      throw new Error('Could not find email input field');
    }

    // Enter email
    await stagehand.page.fill('input[type="email"]', credentials.email);
    console.log('   ✅ Email entered');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Click Next
    const nextButtons = await stagehand.page.$$('button, div[role="button"]');
    let clicked = false;
    for (const button of nextButtons) {
      const text = await button.textContent();
      if (text?.includes('Next') || text?.includes('next')) {
        await button.click();
        clicked = true;
        console.log('   ✅ Clicked Next');
        break;
      }
    }

    if (!clicked) {
      // Try pressing Enter as fallback
      await stagehand.page.keyboard.press('Enter');
      console.log('   ⌨️  Pressed Enter');
    }

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Wait for password field
    console.log('   🔒 Waiting for password field...');

    let passwordField = await stagehand.page.$('input[type="password"]');

    if (!passwordField) {
      // Try waiting a bit more
      await new Promise(resolve => setTimeout(resolve, 2000));
      passwordField = await stagehand.page.$('input[type="password"]');
    }

    if (!passwordField) {
      throw new Error('Could not find password input field');
    }

    // Enter password
    await stagehand.page.fill('input[type="password"]', credentials.password);
    console.log('   ✅ Password entered');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Click Next/Sign in
    const signInButtons = await stagehand.page.$$('button, div[role="button"]');
    clicked = false;
    for (const button of signInButtons) {
      const text = await button.textContent();
      if (text?.includes('Next') || text?.includes('Sign in') || text?.includes('next')) {
        await button.click();
        clicked = true;
        console.log('   ✅ Clicked Sign In');
        break;
      }
    }

    if (!clicked) {
      // Try pressing Enter as fallback
      await stagehand.page.keyboard.press('Enter');
      console.log('   ⌨️  Pressed Enter');
    }

    await new Promise(resolve => setTimeout(resolve, 6000));

    await stagehand.page.screenshot({ path: '/tmp/ads-logged-in.png' });
    console.log('   ✅ Login complete');

  } catch (error: any) {
    console.error(`   ❌ Login failed: ${error.message}`);
    await stagehand.page.screenshot({ path: '/tmp/ads-login-error.png' });
    throw error;
  }
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
