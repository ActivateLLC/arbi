#!/usr/bin/env tsx

/**
 * Automate eBay Developer API Key Creation
 *
 * This script automatically:
 * 1. Logs into eBay Developer Program
 * 2. Creates a new application
 * 3. Retrieves the App ID (API Key)
 * 4. Saves it to .env file
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const EBAY_EMAIL = 'usualprovider@gmail.com';
const EBAY_PASSWORD = 'Only1God!!';

async function getEbayApiKey() {
  let browser: Browser | null = null;

  try {
    console.log('🚀 Starting eBay API key automation...\n');

    // Launch browser (headless mode)
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: true, // Required for container environment
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Container compatibility
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Step 1: Navigate to eBay Developer Join page
    console.log('📍 Navigating to eBay Developer Program...');
    await page.goto('https://developer.ebay.com/join', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Step 2: Click "Sign In" or "Join" button
    console.log('🔐 Looking for sign-in button...');

    // Try different selectors for sign-in
    const signInSelectors = [
      'a[href*="signin"]',
      'button:has-text("Sign in")',
      'a:has-text("Sign in")',
      'a:has-text("Sign In")',
      '.sign-in',
      '#gh-ug a' // eBay user greeting area
    ];

    let signInFound = false;
    for (const selector of signInSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 3000 });
        if (element) {
          console.log(`✅ Found sign-in button: ${selector}`);
          await element.click();
          signInFound = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!signInFound) {
      console.log('⚠️  Direct sign-in not found, navigating to signin URL...');
      await page.goto('https://signin.ebay.com/ws/eBayISAPI.dll?SignIn', { waitUntil: 'domcontentloaded' });
    }

    await page.waitForTimeout(2000);

    // Step 3: Enter credentials
    console.log('📝 Entering credentials...');

    // Wait for email/username field
    const usernameSelectors = ['#userid', 'input[name="userid"]', 'input[type="text"]'];
    for (const selector of usernameSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.fill(selector, EBAY_EMAIL);
        console.log('✅ Entered email');
        break;
      } catch (e) {
        // Try next
      }
    }

    await page.waitForTimeout(1000);

    // Click Continue or enter password directly
    const continueButton = await page.$('button[type="submit"]');
    if (continueButton) {
      await continueButton.click();
      await page.waitForTimeout(2000);
    }

    // Enter password
    const passwordSelectors = ['#pass', 'input[name="pass"]', 'input[type="password"]'];
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.fill(selector, EBAY_PASSWORD);
        console.log('✅ Entered password');
        break;
      } catch (e) {
        // Try next
      }
    }

    await page.waitForTimeout(1000);

    // Click Sign In button
    console.log('🔓 Signing in...');
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for redirect
    await page.waitForTimeout(5000);

    // Step 4: Navigate to developer account / keys page
    console.log('🔑 Navigating to API keys section...');
    await page.goto('https://developer.ebay.com/my/keys', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 5: Check if we need to create a keyset or if one exists
    console.log('🔍 Checking for existing keysets...');

    // Look for existing App ID
    const existingAppId = await page.evaluate(() => {
      // Look for App ID in the page
      const appIdElements = document.querySelectorAll('code, pre, .app-id, [class*="appid"], [class*="app-id"]');
      for (const el of Array.from(appIdElements)) {
        const text = el.textContent || '';
        // App IDs look like: YourName-YourApp-PRD-abc123def456-xyz789
        const match = text.match(/([A-Za-z0-9]+-[A-Za-z0-9]+-PRD-[A-Za-z0-9]+-[A-Za-z0-9]+)/);
        if (match) {
          return match[1];
        }
      }
      return null;
    });

    if (existingAppId) {
      console.log('✅ Found existing App ID:', existingAppId);
      await saveToEnv(existingAppId);
      await browser.close();
      return;
    }

    // Step 6: Create new keyset if needed
    console.log('📦 Creating new keyset...');

    const createKeysetSelectors = [
      'button:has-text("Create a keyset")',
      'a:has-text("Create a keyset")',
      'button:has-text("Get Keys")',
      'a:has-text("Get Keys")',
      '.create-keyset'
    ];

    for (const selector of createKeysetSelectors) {
      try {
        const button = await page.waitForSelector(selector, { timeout: 3000 });
        if (button) {
          await button.click();
          console.log('✅ Clicked create keyset button');
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    await page.waitForTimeout(2000);

    // Fill in application details if form appears
    const appNameField = await page.$('input[name="appName"], input[name="app_name"], #app-name');
    if (appNameField) {
      await appNameField.fill('Arbi Arbitrage Bot');
      console.log('✅ Entered app name');
    }

    // Select Production environment
    const prodRadio = await page.$('input[value="PRODUCTION"], input[value="production"]');
    if (prodRadio) {
      await prodRadio.click();
      console.log('✅ Selected Production environment');
    }

    await page.waitForTimeout(1000);

    // Submit form
    const submitSelectors = [
      'button:has-text("Continue")',
      'button:has-text("Submit")',
      'button:has-text("Create")',
      'button[type="submit"]'
    ];

    for (const selector of submitSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log('✅ Submitted form');
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    await page.waitForTimeout(5000);

    // Step 7: Extract the App ID
    console.log('📋 Extracting App ID...');

    const appId = await page.evaluate(() => {
      // Multiple strategies to find the App ID

      // Strategy 1: Look in code/pre tags
      const codeElements = document.querySelectorAll('code, pre');
      for (const el of Array.from(codeElements)) {
        const text = el.textContent || '';
        const match = text.match(/([A-Za-z0-9]+-[A-Za-z0-9]+-PRD-[A-Za-z0-9]+-[A-Za-z0-9]+)/);
        if (match) return match[1];
      }

      // Strategy 2: Look for labels with "App ID" or "Client ID"
      const labels = document.querySelectorAll('label, dt, th');
      for (const label of Array.from(labels)) {
        const text = label.textContent || '';
        if (text.includes('App ID') || text.includes('Client ID') || text.includes('Application ID')) {
          const next = label.nextElementSibling;
          if (next) {
            const appIdText = next.textContent || '';
            const match = appIdText.match(/([A-Za-z0-9]+-[A-Za-z0-9]+-PRD-[A-Za-z0-9]+-[A-Za-z0-9]+)/);
            if (match) return match[1];
          }
        }
      }

      // Strategy 3: Look in any text containing the pattern
      const allText = document.body.innerText;
      const match = allText.match(/([A-Za-z0-9]+-[A-Za-z0-9]+-PRD-[A-Za-z0-9]+-[A-Za-z0-9]+)/);
      if (match) return match[1];

      return null;
    });

    if (!appId) {
      console.error('❌ Could not find App ID on page');
      console.log('📸 Taking screenshot for debugging...');
      await page.screenshot({ path: 'ebay-keys-page.png', fullPage: true });
      console.log('Screenshot saved to: ebay-keys-page.png');
      throw new Error('App ID not found - check screenshot');
    }

    console.log('✅ Successfully retrieved App ID:', appId);

    // Step 8: Save to .env file
    await saveToEnv(appId);

    // Close browser
    await browser.close();

    console.log('\n🎉 SUCCESS! eBay API key configured!');
    console.log('👉 Now restart your API server to use real eBay data');

  } catch (error) {
    console.error('❌ Error during automation:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

async function saveToEnv(appId: string) {
  const envPath = path.join(__dirname, '..', '.env');

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Check if EBAY_APP_ID already exists
  if (envContent.includes('EBAY_APP_ID=')) {
    // Replace existing
    envContent = envContent.replace(/EBAY_APP_ID=.*/g, `EBAY_APP_ID=${appId}`);
    console.log('✅ Updated existing EBAY_APP_ID in .env');
  } else {
    // Add new
    envContent += `\n# eBay Developer API Key\nEBAY_APP_ID=${appId}\n`;
    console.log('✅ Added EBAY_APP_ID to .env');
  }

  fs.writeFileSync(envPath, envContent);
  console.log('📝 Saved to:', envPath);
}

// Run the automation
getEbayApiKey().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
