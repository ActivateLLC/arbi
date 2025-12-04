#!/usr/bin/env tsx

/**
 * Example: Automate Service Signup and API Key Extraction
 *
 * This script demonstrates how to use the web automation package to:
 * 1. Navigate to a signup page
 * 2. Fill out registration forms
 * 3. Submit the form
 * 4. Handle redirects
 * 5. Extract API keys from the resulting dashboard
 *
 * Usage:
 *   SERVICE_EMAIL=your@email.com SERVICE_PASSWORD=yourpassword npx tsx scripts/signup-automation-example.ts
 *
 * For services requiring email verification:
 *   - The script will detect if verification is required
 *   - You can use the EmailVerificationHandler to automate the verification process
 */

import {
  BrowserManager,
  SignupAutomation,
  EmailVerificationHandler,
} from '../packages/web-automation/src';
import type {
  SignupCredentials,
  SignupConfig,
  ApiKeyExtractionConfig
} from '../packages/web-automation/src/types';

// Load credentials from environment variables
const SERVICE_EMAIL = process.env.SERVICE_EMAIL || '';
const SERVICE_PASSWORD = process.env.SERVICE_PASSWORD || '';

// Validate credentials
if (!SERVICE_EMAIL || !SERVICE_PASSWORD) {
  console.error('❌ Error: SERVICE_EMAIL and SERVICE_PASSWORD environment variables are required');
  console.error('');
  console.error('Usage:');
  console.error('  SERVICE_EMAIL=your@email.com SERVICE_PASSWORD=yourpassword npx tsx scripts/signup-automation-example.ts');
  console.error('');
  process.exit(1);
}

/**
 * Example signup configuration for a generic API service
 * Modify these selectors based on the target service
 */
const EXAMPLE_SIGNUP_CONFIG: SignupConfig = {
  url: 'https://example-api-service.com/signup',
  formSelectors: {
    email: 'input[name="email"], input[type="email"], #email',
    password: 'input[name="password"], input[type="password"], #password',
    confirmPassword: 'input[name="confirmPassword"], input[name="password_confirmation"]',
    firstName: 'input[name="firstName"], input[name="first_name"]',
    lastName: 'input[name="lastName"], input[name="last_name"]',
    submit: 'button[type="submit"], input[type="submit"]'
  },
  waitForConfirmation: {
    urlPattern: '**/dashboard**',
    timeout: 30000
  }
};

/**
 * Example API key extraction configuration
 */
const EXAMPLE_API_KEY_CONFIG: ApiKeyExtractionConfig = {
  pageUrl: 'https://example-api-service.com/dashboard/api-keys',
  selectors: [
    'code',
    'pre',
    '.api-key',
    '[data-api-key]',
    '.key-value',
    'input[readonly]'
  ],
  patterns: [
    /api[_-]?key[:\s]*["']?([a-zA-Z0-9_\-]{20,})/i,
    /sk[_-][a-zA-Z0-9]{20,}/i,
    /pk[_-][a-zA-Z0-9]{20,}/i
  ],
  waitForSelector: '.api-keys-section'
};

async function runSignupAutomation(): Promise<void> {
  const browserManager = new BrowserManager();
  const signupAutomation = new SignupAutomation(browserManager);
  const emailVerification = new EmailVerificationHandler(browserManager);

  let sessionId: string | null = null;

  try {
    console.log('🚀 Starting Signup Automation...\n');

    // Step 1: Create a browser session
    console.log('🌐 Creating browser session...');
    sessionId = await browserManager.createSession({
      headless: true,
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    console.log('✅ Browser session created:', sessionId);

    // Step 2: Define credentials
    const credentials: SignupCredentials = {
      email: SERVICE_EMAIL,
      password: SERVICE_PASSWORD,
      firstName: 'Auto',
      lastName: 'User'
    };

    // Step 3: Perform signup
    console.log('\n📝 Performing signup...');
    console.log(`   URL: ${EXAMPLE_SIGNUP_CONFIG.url}`);
    console.log(`   Email: ${credentials.email}`);

    const signupResult = await signupAutomation.performSignup(
      sessionId,
      credentials,
      EXAMPLE_SIGNUP_CONFIG
    );

    console.log('\n📋 Signup Result:');
    console.log(`   Success: ${signupResult.success}`);
    console.log(`   Message: ${signupResult.message}`);
    if (signupResult.redirectUrl) {
      console.log(`   Redirect URL: ${signupResult.redirectUrl}`);
    }

    // Step 4: Handle email verification if required
    if (signupResult.requiresEmailVerification) {
      console.log('\n📧 Email verification required...');
      console.log('   Waiting for verification email...');

      // In a real implementation, you would:
      // 1. Configure email access (IMAP/SMTP)
      // 2. Poll for the verification email
      // 3. Extract and click the verification link

      // Example with manual verification link (for testing):
      // const verificationResult = await emailVerification.clickVerificationLink(
      //   sessionId,
      //   'https://example.com/verify?token=abc123',
      //   '.verification-success'
      // );

      console.log('   ⚠️ Please complete email verification manually');
      console.log('   Then run the API key extraction separately');
    }

    // Step 5: Extract API keys (if signup was successful)
    if (signupResult.success && !signupResult.requiresEmailVerification) {
      console.log('\n🔑 Extracting API keys...');
      console.log(`   URL: ${EXAMPLE_API_KEY_CONFIG.pageUrl}`);

      const apiKeys = await signupAutomation.extractApiKeys(
        sessionId,
        EXAMPLE_API_KEY_CONFIG
      );

      if (apiKeys.length > 0) {
        console.log('\n✅ Found API Keys:');
        for (const key of apiKeys) {
          console.log(`   - Type: ${key.type}`);
          console.log(`     Key: ${key.key.substring(0, 10)}...${key.key.substring(key.key.length - 4)}`);
        }

        // Save to .env or output
        console.log('\n💾 Keys extracted successfully!');
        console.log('   Add these to your .env file manually for security.');
      } else {
        console.log('\n⚠️ No API keys found on the page');
        console.log('   You may need to create them manually or check the selectors');

        // Take a screenshot for debugging
        const screenshot = await signupAutomation.takeScreenshot(sessionId, 'api-keys-page.png');
        console.log('   📸 Screenshot saved: api-keys-page.png');
      }
    }

    // Step 6: Cleanup
    console.log('\n🧹 Cleaning up...');
    if (sessionId) {
      await browserManager.closeSession(sessionId);
      console.log('✅ Browser session closed');
    }

    console.log('\n🎉 Automation completed!');

  } catch (error) {
    console.error('\n❌ Error during automation:', error);

    // Take screenshot on error
    if (sessionId) {
      try {
        await signupAutomation.takeScreenshot(sessionId, 'error-screenshot.png');
        console.log('📸 Error screenshot saved: error-screenshot.png');
      } catch {
        // Ignore screenshot errors
      }

      try {
        await browserManager.closeSession(sessionId);
      } catch {
        // Ignore cleanup errors
      }
    }

    process.exit(1);
  }
}

// Run the automation
runSignupAutomation().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
