import { FormHandler } from '../form/FormHandler';
import { Navigator } from '../navigation/Navigator';

import type { BrowserManager } from '../browser/BrowserManager';
import type {
  SignupCredentials,
  SignupConfig,
  SignupResult,
  ApiKeyExtractionConfig,
  ExtractedApiKey,
} from '../types';
import type { Page } from 'playwright';

/** Minimum length for a string to be considered a potential API key */
const MINIMUM_KEY_LENGTH = 10;

export class SignupAutomation {
  private browserManager: BrowserManager;
  private navigator: Navigator;
  private formHandler: FormHandler;

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager;
    this.navigator = new Navigator(browserManager);
    this.formHandler = new FormHandler(browserManager);
  }

  /**
   * Navigate to a signup page
   */
  public async navigateToSignup(
    sessionId: string,
    url: string
  ): Promise<void> {
    await this.navigator.navigateTo(sessionId, url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
  }

  /**
   * Fill and submit a signup form
   */
  public async performSignup(
    sessionId: string,
    credentials: SignupCredentials,
    config: SignupConfig
  ): Promise<SignupResult> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    try {
      // Navigate to signup page
      await this.navigateToSignup(sessionId, config.url);

      // Fill email field
      if (config.formSelectors.email) {
        await page.fill(config.formSelectors.email, credentials.email);
      }

      // Fill password field
      if (config.formSelectors.password) {
        await page.fill(config.formSelectors.password, credentials.password);
      }

      // Fill confirm password if exists
      if (config.formSelectors.confirmPassword) {
        await page.fill(config.formSelectors.confirmPassword, credentials.password);
      }

      // Fill username if provided
      if (config.formSelectors.username && credentials.username) {
        await page.fill(config.formSelectors.username, credentials.username);
      }

      // Fill first name if provided
      if (config.formSelectors.firstName && credentials.firstName) {
        await page.fill(config.formSelectors.firstName, credentials.firstName);
      }

      // Fill last name if provided
      if (config.formSelectors.lastName && credentials.lastName) {
        await page.fill(config.formSelectors.lastName, credentials.lastName);
      }

      // Fill custom fields if provided
      if (config.formSelectors.customFields && credentials.customFields) {
        for (const [key, selector] of Object.entries(config.formSelectors.customFields)) {
          const value = credentials.customFields[key];
          if (value) {
            await page.fill(selector, value);
          }
        }
      }

      // Submit the form
      if (config.formSelectors.submit) {
        await page.click(config.formSelectors.submit);
      } else {
        // Try common submit button selectors
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Sign up")',
          'button:has-text("Create account")',
          'button:has-text("Register")'
        ];

        for (const selector of submitSelectors) {
          try {
            const element = await page.waitForSelector(selector, { timeout: 2000 });
            if (element) {
              await element.click();
              break;
            }
          } catch {
            // Try next selector
          }
        }
      }

      // Wait for confirmation
      if (config.waitForConfirmation) {
        const timeout = config.waitForConfirmation.timeout ?? 30000;

        if (config.waitForConfirmation.selector) {
          await page.waitForSelector(config.waitForConfirmation.selector, { timeout });
        }

        if (config.waitForConfirmation.urlPattern) {
          await page.waitForURL(config.waitForConfirmation.urlPattern, { timeout });
        }
      } else {
        // Wait for navigation by default
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      }

      const redirectUrl = page.url();

      // Check for email verification requirement
      const requiresEmailVerification = await this.checkForEmailVerificationMessage(page);

      return {
        success: true,
        message: 'Signup completed successfully',
        redirectUrl,
        requiresEmailVerification
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Signup failed: ${errorMessage}`
      };
    }
  }

  /**
   * Check if the page indicates email verification is required
   */
  private async checkForEmailVerificationMessage(page: Page): Promise<boolean> {
    const verificationPatterns = [
      'verify your email',
      'verification email',
      'confirm your email',
      'check your email',
      'email verification',
      'verification link'
    ];

    const pageText = await page.textContent('body');
    if (!pageText) return false;

    const lowerText = pageText.toLowerCase();
    return verificationPatterns.some(pattern => lowerText.includes(pattern));
  }

  /**
   * Extract API keys from a page
   */
  public async extractApiKeys(
    sessionId: string,
    config: ApiKeyExtractionConfig
  ): Promise<ExtractedApiKey[]> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;
    const extractedKeys: ExtractedApiKey[] = [];

    try {
      // Navigate to the page if URL provided
      if (config.pageUrl) {
        await this.navigator.navigateTo(sessionId, config.pageUrl, {
          waitUntil: 'networkidle',
          timeout: 60000
        });
      }

      // Wait for specific selector if provided
      if (config.waitForSelector) {
        await page.waitForSelector(config.waitForSelector, { timeout: 30000 });
      }

      // Extract from specified selectors
      for (const selector of config.selectors) {
        try {
          const elements = page.locator(selector);
          const count = await elements.count();

          for (let i = 0; i < count; i++) {
            const text = await elements.nth(i).textContent();
            if (text) {
              const trimmedText = text.trim();
              
              // Apply patterns if provided
              if (config.patterns && config.patterns.length > 0) {
                for (const pattern of config.patterns) {
                  const match = trimmedText.match(pattern);
                  if (match) {
                    extractedKeys.push({
                      key: match[1] || match[0],
                      type: this.detectKeyType(trimmedText)
                    });
                  }
                }
              } else if (trimmedText.length > MINIMUM_KEY_LENGTH) {
                // If no patterns, add text as is if it looks like a key
                extractedKeys.push({
                  key: trimmedText,
                  type: this.detectKeyType(trimmedText)
                });
              }
            }
          }
        } catch {
          // Selector not found, continue
        }
      }

      // Also try to find keys in the page content using common patterns
      const pageContent = await page.content();
      const commonPatterns = [
        /api[_-]?key[:\s]*["']?([a-zA-Z0-9_-]{20,})/gi,
        /client[_-]?id[:\s]*["']?([a-zA-Z0-9_-]{10,})/gi,
        /client[_-]?secret[:\s]*["']?([a-zA-Z0-9_-]{20,})/gi,
        /access[_-]?token[:\s]*["']?([a-zA-Z0-9_\-.]{20,})/gi
      ];

      for (const pattern of commonPatterns) {
        let match;
        while ((match = pattern.exec(pageContent)) !== null) {
          const key = match[1];
          // Avoid duplicates
          if (!extractedKeys.some(ek => ek.key === key)) {
            extractedKeys.push({
              key,
              type: this.detectKeyType(match[0])
            });
          }
        }
      }

      return extractedKeys;
    } catch {
      return extractedKeys;
    }
  }

  /**
   * Detect the type of API key based on context
   */
  private detectKeyType(context: string): ExtractedApiKey['type'] {
    const lower = context.toLowerCase();
    if (lower.includes('secret')) return 'client_secret';
    if (lower.includes('client') && lower.includes('id')) return 'client_id';
    if (lower.includes('token')) return 'token';
    return 'api_key';
  }

  /**
   * Login to a service
   */
  public async performLogin(
    sessionId: string,
    url: string,
    credentials: { email: string; password: string },
    selectors: {
      email?: string;
      password?: string;
      submit?: string;
    } = {}
  ): Promise<SignupResult> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    try {
      // Navigate to login page
      await this.navigator.navigateTo(sessionId, url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Use provided selectors or defaults
      const emailSelector = selectors.email || 'input[type="email"], input[name="email"], input[name="username"], #email, #userid';
      const passwordSelector = selectors.password || 'input[type="password"], input[name="password"], #pass, #password';
      const submitSelector = selectors.submit || 'button[type="submit"], input[type="submit"]';

      // Fill email
      await page.fill(emailSelector, credentials.email);

      // Check for "Continue" button (some sites split login into steps)
      try {
        const continueButton = await page.waitForSelector('button:has-text("Continue")', { timeout: 2000 });
        if (continueButton) {
          await continueButton.click();
          await page.waitForTimeout(1000);
        }
      } catch {
        // No continue button, proceed normally
      }

      // Fill password
      await page.fill(passwordSelector, credentials.password);

      // Submit
      await page.click(submitSelector);

      // Wait for navigation
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      return {
        success: true,
        message: 'Login completed successfully',
        redirectUrl: page.url()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Login failed: ${errorMessage}`
      };
    }
  }

  /**
   * Wait for a redirect to occur
   */
  public async waitForRedirect(
    sessionId: string,
    urlPattern: string | RegExp,
    timeout: number = 30000
  ): Promise<string> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    await page.waitForURL(urlPattern, { timeout });
    return page.url();
  }

  /**
   * Take a screenshot for debugging
   */
  public async takeScreenshot(
    sessionId: string,
    path?: string
  ): Promise<Buffer> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    return page.screenshot({
      path,
      fullPage: true
    });
  }
}
