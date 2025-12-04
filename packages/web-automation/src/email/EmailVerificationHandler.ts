import * as http from 'http';
import * as https from 'https';

import { Navigator } from '../navigation/Navigator';

import type { BrowserManager } from '../browser/BrowserManager';
import type {
  EmailConfig,
  EmailCheckOptions,
  VerificationLink,
  EmailVerificationResult
} from '../types';
import type { Page } from 'playwright';


/**
 * Handler for email verification flows in automation scripts.
 * Supports checking email via IMAP and navigating to verification links.
 */
export class EmailVerificationHandler {
  private browserManager: BrowserManager;
  private navigator: Navigator;
  private emailConfig?: EmailConfig;

  constructor(browserManager: BrowserManager, emailConfig?: EmailConfig) {
    this.browserManager = browserManager;
    this.navigator = new Navigator(browserManager);
    this.emailConfig = emailConfig;
  }

  /**
   * Set email configuration for IMAP/SMTP access
   */
  public setEmailConfig(config: EmailConfig): void {
    this.emailConfig = config;
  }

  /**
   * Wait for and extract a verification link from email.
   * This method polls for new emails matching the criteria.
   */
  public async waitForVerificationEmail(
    options: EmailCheckOptions = {}
  ): Promise<VerificationLink | null> {
    if (!this.emailConfig) {
      throw new Error('Email configuration not set. Call setEmailConfig first.');
    }

    const maxWaitTime = options.maxWaitTime ?? 120000; // 2 minutes default
    const pollInterval = options.pollInterval ?? 5000; // 5 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const link = await this.checkForVerificationEmail(options);
        if (link) {
          return link;
        }
      } catch {
        // Continue polling
      }

      await this.sleep(pollInterval);
    }

    return null;
  }

  /**
   * Check email for verification links (single check).
   * In a real implementation, this would use IMAP to fetch emails.
   * For now, this provides the interface and structure.
   */
  private async checkForVerificationEmail(
    options: EmailCheckOptions
  ): Promise<VerificationLink | null> {
    // This is a placeholder implementation.
    // In production, you would use an IMAP library like 'imap' or 'imapflow'
    // to connect to the email server and fetch messages.
    
    // The implementation would:
    // 1. Connect to IMAP server using this.emailConfig
    // 2. Search for messages from options.from or matching options.subject
    // 3. Parse the email body for verification links
    // 4. Return the first matching link
    
    // For testing purposes, we log what would be done
    console.log('Checking email for verification link...', {
      from: options.from,
      subject: options.subject
    });
    
    return null;
  }

  /**
   * Extract verification links from email body text
   */
  public extractVerificationLinks(emailBody: string): string[] {
    const links: string[] = [];
    
    // Common patterns for verification links
    const patterns = [
      /https?:\/\/[^\s"'<>]+verify[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]+confirm[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]+activate[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]+validation[^\s"'<>]*/gi,
      /https?:\/\/[^\s"'<>]+token=[^\s"'<>]*/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(emailBody)) !== null) {
        const url = match[0].replace(/[.,;!?]$/, ''); // Remove trailing punctuation
        if (!links.includes(url)) {
          links.push(url);
        }
      }
    }

    return links;
  }

  /**
   * Navigate to a verification link and wait for confirmation
   */
  public async clickVerificationLink(
    sessionId: string,
    verificationUrl: string,
    confirmationSelector?: string
  ): Promise<EmailVerificationResult> {
    try {
      await this.navigator.navigateTo(sessionId, verificationUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      const session = this.browserManager.getSession(sessionId);
      const page = session.page as Page;

      // Wait for confirmation element if provided
      if (confirmationSelector) {
        await page.waitForSelector(confirmationSelector, { timeout: 30000 });
      }

      // Check for common success indicators
      const pageText = await page.textContent('body');
      const successIndicators = [
        'verified',
        'confirmed',
        'success',
        'activated',
        'complete',
        'thank you'
      ];

      const isSuccess = pageText 
        ? successIndicators.some(indicator => 
            pageText.toLowerCase().includes(indicator)
          )
        : false;

      return {
        success: isSuccess,
        message: isSuccess 
          ? 'Email verified successfully' 
          : 'Verification page loaded, but success not confirmed',
        redirectUrl: page.url()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Verification failed: ${errorMessage}`
      };
    }
  }

  /**
   * Complete verification by clicking a link in the email body text
   */
  public async completeVerificationFromEmail(
    sessionId: string,
    emailBody: string,
    confirmationSelector?: string
  ): Promise<EmailVerificationResult> {
    const links = this.extractVerificationLinks(emailBody);

    if (links.length === 0) {
      return {
        success: false,
        message: 'No verification links found in email body'
      };
    }

    // Try the first link
    return this.clickVerificationLink(sessionId, links[0], confirmationSelector);
  }

  /**
   * Fetch verification link from a temporary email service
   * Supports services like temp-mail.org, guerrillamail, etc.
   */
  public async getVerificationFromTempEmail(
    sessionId: string,
    tempEmailService: 'temp-mail' | 'guerrillamail' | 'mailinator',
    fromFilter?: string,
    subjectFilter?: string
  ): Promise<EmailVerificationResult> {
    const session = this.browserManager.getSession(sessionId);
    const page = session.page as Page;

    try {
      let emailUrl: string;
      
      switch (tempEmailService) {
        case 'temp-mail':
          emailUrl = 'https://temp-mail.org/';
          break;
        case 'guerrillamail':
          emailUrl = 'https://www.guerrillamail.com/';
          break;
        case 'mailinator':
          emailUrl = 'https://www.mailinator.com/';
          break;
        default:
          throw new Error(`Unknown temp email service: ${tempEmailService}`);
      }

      await this.navigator.navigateTo(sessionId, emailUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Wait for email to arrive (polling)
      const maxAttempts = 12; // 1 minute with 5 second intervals
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await this.sleep(5000);
        await page.reload();

        // Try to find and click on the verification email
        const emailSelectors = [
          `text=${fromFilter || 'verify'}`,
          `text=${subjectFilter || 'confirmation'}`,
          '.email-list-item',
          '.inbox-data-content',
          '[class*="mail-item"]'
        ];

        for (const selector of emailSelectors) {
          try {
            const emailElement = await page.waitForSelector(selector, { timeout: 2000 });
            if (emailElement) {
              await emailElement.click();
              await this.sleep(2000);

              // Extract verification link from email body
              const emailBody = await page.textContent('body');
              if (emailBody) {
                const links = this.extractVerificationLinks(emailBody);
                if (links.length > 0) {
                  return {
                    success: true,
                    message: 'Verification link found',
                    verificationLink: links[0]
                  };
                }
              }
            }
          } catch {
            // Try next selector
          }
        }
      }

      return {
        success: false,
        message: 'Timeout waiting for verification email'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to get verification from temp email: ${errorMessage}`
      };
    }
  }

  /**
   * Verify email using a webhook/API approach
   * Some services provide API endpoints to check verification status
   */
  public async checkVerificationStatus(
    apiUrl: string,
    apiKey?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const url = new URL(apiUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        headers
      };

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.verified === true || json.status === 'verified');
          } catch {
            resolve(false);
          }
        });
      });

      req.on('error', () => {
        resolve(false);
      });

      req.end();
    });
  }

  /**
   * Helper function to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
