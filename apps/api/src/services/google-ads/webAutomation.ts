/**
 * Google Ads Web Automation
 * Creates campaigns programmatically through Google Ads UI (no API needed!)
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
 * Create Google Ads campaign via web automation
 */
export async function createCampaignViaWeb(
  campaignData: CampaignData,
  credentials: { email: string; password: string }
): Promise<{ success: boolean; campaignName: string }> {
  console.log(`🎯 Creating Google Ads campaign via web automation: ${campaignData.productName}`);

  const stagehand = new Stagehand({
    env: 'LOCAL',
    enableCaching: false,
    headless: true,
    domSettleTimeoutMs: 5000,
  });

  try {
    await stagehand.init();
    await stagehand.page.setViewportSize({ width: 1920, height: 1080 });

    // Step 1: Navigate to Google Ads
    console.log('   📍 Opening Google Ads...');
    await stagehand.page.goto('https://ads.google.com', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Step 2: Login
    const needsLogin = await stagehand.page.evaluate(() => {
      return document.body.innerText.includes('Sign in') ||
             document.body.innerText.includes('Email or phone');
    });

    if (needsLogin) {
      console.log('   🔐 Logging in to Google Ads...');
      await loginToGoogleAds(stagehand, credentials);
    } else {
      console.log('   ✅ Already logged in');
    }

    // Step 3: Navigate to campaign creation
    console.log('   ➕ Starting campaign creation...');
    await navigateToCampaignCreation(stagehand);

    // Step 4: Select campaign type (Video)
    console.log('   🎬 Selecting video campaign...');
    await selectVideoCampaignType(stagehand);

    // Step 5: Fill campaign details
    console.log('   📝 Filling campaign details...');
    await fillCampaignDetails(stagehand, campaignData);

    // Step 6: Create ad
    console.log('   🎨 Creating ad...');
    await createVideoAd(stagehand, campaignData);

    // Step 7: Review and submit
    console.log('   ✅ Submitting campaign...');
    await submitCampaign(stagehand);

    await stagehand.close();

    const campaignName = `Arbi - ${campaignData.productName}`;
    console.log(`   🎉 Campaign created: ${campaignName}`);

    return {
      success: true,
      campaignName,
    };
  } catch (error: any) {
    console.error('❌ Web automation failed:', error.message);
    await stagehand.close();
    throw new Error(`Failed to create campaign: ${error.message}`);
  }
}

/**
 * Login to Google Ads
 */
async function loginToGoogleAds(
  stagehand: Stagehand,
  credentials: { email: string; password: string }
) {
  // Enter email
  await stagehand.page.evaluate((email) => {
    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
    if (emailInput) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, credentials.email);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Click Next
  await stagehand.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const nextButton = buttons.find(b => b.textContent?.includes('Next'));
    if (nextButton) {
      (nextButton as HTMLButtonElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Enter password
  await stagehand.page.evaluate((password) => {
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, credentials.password);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Click Next/Sign in
  await stagehand.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const signInButton = buttons.find(b =>
      b.textContent?.includes('Next') ||
      b.textContent?.includes('Sign in')
    );
    if (signInButton) {
      (signInButton as HTMLButtonElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 5000));
}

/**
 * Navigate to campaign creation page
 */
async function navigateToCampaignCreation(stagehand: Stagehand) {
  // Look for "New campaign" or "+" button
  await stagehand.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const newCampaignButton = buttons.find(b =>
      b.textContent?.toLowerCase().includes('new campaign') ||
      b.textContent?.includes('+')
    );
    if (newCampaignButton) {
      (newCampaignButton as HTMLElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 3000));
}

/**
 * Select video campaign type
 */
async function selectVideoCampaignType(stagehand: Stagehand) {
  // Click on Video campaign option
  await stagehand.page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('div, button'));
    const videoOption = options.find(o =>
      o.textContent?.toLowerCase().includes('video') ||
      o.textContent?.toLowerCase().includes('youtube')
    );
    if (videoOption) {
      (videoOption as HTMLElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Select "Drive conversions" goal
  await stagehand.page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('div, button'));
    const conversionOption = options.find(o =>
      o.textContent?.toLowerCase().includes('conversion') ||
      o.textContent?.toLowerCase().includes('sales')
    );
    if (conversionOption) {
      (conversionOption as HTMLElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Click Continue
  await stagehand.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const continueButton = buttons.find(b => b.textContent?.includes('Continue'));
    if (continueButton) {
      (continueButton as HTMLButtonElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 3000));
}

/**
 * Fill campaign details
 */
async function fillCampaignDetails(
  stagehand: Stagehand,
  campaignData: CampaignData
) {
  // Campaign name
  await stagehand.page.evaluate((name) => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
    const nameInput = inputs.find(i =>
      (i as HTMLInputElement).placeholder?.toLowerCase().includes('campaign name')
    ) as HTMLInputElement;
    if (nameInput) {
      nameInput.value = `Arbi - ${name}`;
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, campaignData.productName);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Daily budget
  await stagehand.page.evaluate((budget) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const budgetInput = inputs.find(i =>
      (i as HTMLInputElement).placeholder?.toLowerCase().includes('budget') ||
      (i as HTMLInputElement).type === 'number'
    ) as HTMLInputElement;
    if (budgetInput) {
      budgetInput.value = budget.toString();
      budgetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, campaignData.dailyBudget);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Location targeting
  await stagehand.page.evaluate((country) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const locationInput = inputs.find(i =>
      (i as HTMLInputElement).placeholder?.toLowerCase().includes('location') ||
      (i as HTMLInputElement).placeholder?.toLowerCase().includes('country')
    ) as HTMLInputElement;
    if (locationInput) {
      locationInput.value = country;
      locationInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, campaignData.targetCountry);

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Select first location suggestion
  await stagehand.page.evaluate(() => {
    const suggestions = Array.from(document.querySelectorAll('div[role="option"]'));
    if (suggestions.length > 0) {
      (suggestions[0] as HTMLElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Create video ad
 */
async function createVideoAd(
  stagehand: Stagehand,
  campaignData: CampaignData
) {
  // If video URL provided, enter it
  if (campaignData.videoUrl) {
    await stagehand.page.evaluate((url) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const videoInput = inputs.find(i =>
        (i as HTMLInputElement).placeholder?.toLowerCase().includes('video') ||
        (i as HTMLInputElement).placeholder?.toLowerCase().includes('youtube')
      ) as HTMLInputElement;
      if (videoInput) {
        videoInput.value = url;
        videoInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, campaignData.videoUrl);

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Ad headline
  await stagehand.page.evaluate((headline) => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    const headlineInput = inputs.find(i =>
      (i as HTMLInputElement).placeholder?.toLowerCase().includes('headline')
    ) as HTMLInputElement;
    if (headlineInput) {
      headlineInput.value = headline;
      headlineInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, campaignData.adCopy.headline);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Ad description
  await stagehand.page.evaluate((description) => {
    const inputs = Array.from(document.querySelectorAll('textarea'));
    const descInput = inputs.find(i =>
      (i as HTMLTextAreaElement).placeholder?.toLowerCase().includes('description')
    ) as HTMLTextAreaElement;
    if (descInput) {
      descInput.value = description;
      descInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, campaignData.adCopy.description);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Final URL (landing page)
  await stagehand.page.evaluate((url) => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const urlInput = inputs.find(i =>
      (i as HTMLInputElement).placeholder?.toLowerCase().includes('url') ||
      (i as HTMLInputElement).placeholder?.toLowerCase().includes('website')
    ) as HTMLInputElement;
    if (urlInput) {
      urlInput.value = url;
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, campaignData.productUrl);

  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Submit campaign
 */
async function submitCampaign(stagehand: Stagehand) {
  // Click "Create campaign" or "Publish" button
  await stagehand.page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitButton = buttons.find(b =>
      b.textContent?.includes('Create campaign') ||
      b.textContent?.includes('Publish') ||
      b.textContent?.includes('Done')
    );
    if (submitButton) {
      (submitButton as HTMLButtonElement).click();
    }
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Take success screenshot
  await stagehand.page.screenshot({
    path: '/tmp/google-ads-campaign-created.png',
  });
  console.log('   📸 Screenshot saved: /tmp/google-ads-campaign-created.png');
}

/**
 * Bulk create campaigns via web automation
 */
export async function createBulkCampaignsViaWeb(
  campaigns: CampaignData[],
  credentials: { email: string; password: string }
): Promise<{ success: number; failed: number; results: any[] }> {
  const results = [];
  let success = 0;
  let failed = 0;

  for (const campaign of campaigns) {
    try {
      const result = await createCampaignViaWeb(campaign, credentials);
      results.push({ ...result, product: campaign.productName });
      success++;

      // Wait between campaigns to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error: any) {
      console.error(`❌ Failed to create campaign for ${campaign.productName}:`, error.message);
      results.push({
        success: false,
        product: campaign.productName,
        error: error.message
      });
      failed++;
    }
  }

  return { success, failed, results };
}
