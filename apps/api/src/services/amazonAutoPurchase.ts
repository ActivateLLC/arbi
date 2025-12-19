/**
 * Amazon Auto-Purchase Service
 *
 * Uses Playwright to automate Amazon purchases when customer buys from us
 * Flow: Stripe payment received → Login to Amazon → Add to cart → Checkout
 */

import { chromium, Browser, Page } from 'playwright';

export interface AutoPurchaseRequest {
  productUrl: string;
  quantity: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  buyerEmail: string;
  maxPrice: number; // Don't buy if price increased
}

export interface AutoPurchaseResult {
  success: boolean;
  orderId?: string;
  trackingNumber?: string;
  actualPrice?: number;
  error?: string;
}

export class AmazonAutoPurchaseService {
  private browser: Browser | null = null;

  constructor(
    private amazonEmail: string = process.env.AMAZON_EMAIL || '',
    private amazonPassword: string = process.env.AMAZON_PASSWORD || ''
  ) {
    if (!amazonEmail || !amazonPassword) {
      console.warn('⚠️  Amazon credentials not configured - auto-purchase disabled');
    }
  }

  async initialize(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: true, // Run in background
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('✅ Browser initialized for Amazon auto-purchase');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Main auto-purchase function
   */
  async purchaseProduct(request: AutoPurchaseRequest): Promise<AutoPurchaseResult> {
    if (!this.amazonEmail || !this.amazonPassword) {
      return {
        success: false,
        error: 'Amazon credentials not configured'
      };
    }

    let page: Page | null = null;

    try {
      await this.initialize();

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      page = await context.newPage();

      console.log('🛒 Starting Amazon auto-purchase...');
      console.log(`   Product: ${request.productUrl}`);
      console.log(`   Max Price: $${request.maxPrice}`);

      // Step 1: Login to Amazon
      await this.loginToAmazon(page);

      // Step 2: Navigate to product and verify price
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      const actualPrice = await this.getProductPrice(page);
      console.log(`   Current Price: $${actualPrice}`);

      if (actualPrice > request.maxPrice) {
        throw new Error(`Price increased to $${actualPrice} (max: $${request.maxPrice})`);
      }

      // Step 3: Add to cart
      await this.addToCart(page);

      // Step 4: Go to checkout
      await page.goto('https://www.amazon.com/gp/cart/view.html');
      await page.waitForSelector('[name="proceedToRetailCheckout"]', { timeout: 10000 });
      await page.click('[name="proceedToRetailCheckout"]');
      await page.waitForLoadState('networkidle');

      // Step 5: Select/add shipping address
      await this.setShippingAddress(page, request.shippingAddress);

      // Step 6: Select fastest shipping
      await this.selectShipping(page);

      // Step 7: Review and place order
      const result = await this.placeOrder(page, actualPrice);

      console.log('✅ Amazon order placed successfully!');
      console.log(`   Order ID: ${result.orderId}`);

      await context.close();

      return {
        success: true,
        orderId: result.orderId,
        trackingNumber: result.trackingNumber,
        actualPrice
      };

    } catch (error: any) {
      console.error('❌ Amazon auto-purchase failed:', error.message);

      // Take screenshot for debugging
      if (page) {
        try {
          await page.screenshot({ path: `/tmp/amazon-error-${Date.now()}.png` });
          console.log('📸 Screenshot saved for debugging');
        } catch (e) {
          // Ignore screenshot errors
        }
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Login to Amazon
   */
  private async loginToAmazon(page: Page): Promise<void> {
    console.log('🔐 Logging into Amazon...');

    await page.goto('https://www.amazon.com/ap/signin');
    await page.waitForSelector('#ap_email', { timeout: 10000 });

    // Enter email
    await page.fill('#ap_email', this.amazonEmail);
    await page.click('#continue');
    await page.waitForTimeout(1000);

    // Enter password
    await page.waitForSelector('#ap_password', { timeout: 10000 });
    await page.fill('#ap_password', this.amazonPassword);
    await page.click('#signInSubmit');

    // Wait for login to complete
    await page.waitForLoadState('networkidle');

    // Check if 2FA is required
    const is2FA = await page.$('#auth-mfa-otpcode');
    if (is2FA) {
      throw new Error('2FA required - please disable 2FA on Amazon account for automation');
    }

    console.log('✅ Logged into Amazon');
  }

  /**
   * Get current product price
   */
  private async getProductPrice(page: Page): Promise<number> {
    const priceSelectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price-whole'
    ];

    for (const selector of priceSelectors) {
      const priceElement = await page.$(selector);
      if (priceElement) {
        const priceText = await priceElement.textContent();
        if (priceText) {
          const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
          if (!isNaN(price) && price > 0) {
            return price;
          }
        }
      }
    }

    throw new Error('Could not find product price');
  }

  /**
   * Add product to cart
   */
  private async addToCart(page: Page): Promise<void> {
    console.log('🛒 Adding to cart...');

    const addToCartSelectors = [
      '#add-to-cart-button',
      '#buy-now-button',
      'input[name="submit.add-to-cart"]'
    ];

    for (const selector of addToCartSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForTimeout(2000);
        console.log('✅ Added to cart');
        return;
      }
    }

    throw new Error('Could not find add to cart button');
  }

  /**
   * Set shipping address
   */
  private async setShippingAddress(page: Page, address: any): Promise<void> {
    console.log('📦 Setting shipping address...');

    // Check if we need to add a new address
    const addAddressButton = await page.$('#add-new-address-popover-link');

    if (addAddressButton) {
      await addAddressButton.click();
      await page.waitForTimeout(1000);

      // Fill address form
      await page.fill('#address-ui-widgets-enterAddressFullName', address.name);
      await page.fill('#address-ui-widgets-enterAddressLine1', address.line1);

      if (address.line2) {
        await page.fill('#address-ui-widgets-enterAddressLine2', address.line2);
      }

      await page.fill('#address-ui-widgets-enterAddressCity', address.city);
      await page.selectOption('#address-ui-widgets-enterAddressStateOrRegion', address.state);
      await page.fill('#address-ui-widgets-enterAddressPostalCode', address.postal_code);

      // Save address
      await page.click('#address-ui-widgets-form-submit-button');
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ Shipping address set');
  }

  /**
   * Select shipping method (fastest available)
   */
  private async selectShipping(page: Page): Promise<void> {
    console.log('🚚 Selecting shipping...');

    // Try to select fastest/prime shipping
    const shippingOptions = await page.$$('input[name="shipmethod"]');

    if (shippingOptions.length > 0) {
      await shippingOptions[0].click(); // Select first (usually fastest)
      await page.waitForTimeout(1000);
    }

    // Continue to payment
    const continueButton = await page.$('input[name="continue"]');
    if (continueButton) {
      await continueButton.click();
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ Shipping selected');
  }

  /**
   * Place the order
   */
  private async placeOrder(page: Page, expectedPrice: number): Promise<{ orderId: string; trackingNumber?: string }> {
    console.log('💳 Placing order...');

    // Find and click "Place your order" button
    const placeOrderSelectors = [
      'input[name="placeYourOrder1"]',
      '#submitOrderButtonId',
      'input[value="Place your order"]'
    ];

    for (const selector of placeOrderSelectors) {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForLoadState('networkidle');
        break;
      }
    }

    // Wait for confirmation page
    await page.waitForTimeout(3000);

    // Extract order ID
    const orderIdElement = await page.$('.order-date-invoice-item');
    let orderId = 'UNKNOWN';

    if (orderIdElement) {
      const text = await orderIdElement.textContent();
      const match = text?.match(/Order #(\d+-\d+-\d+)/);
      if (match) {
        orderId = match[1];
      }
    }

    console.log('✅ Order placed!');

    return { orderId };
  }
}

// Singleton instance
let autoPurchaseService: AmazonAutoPurchaseService | null = null;

export function getAutoPurchaseService(): AmazonAutoPurchaseService {
  if (!autoPurchaseService) {
    autoPurchaseService = new AmazonAutoPurchaseService();
  }
  return autoPurchaseService;
}
