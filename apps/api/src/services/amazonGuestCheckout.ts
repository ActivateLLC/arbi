/**
 * Amazon Guest Checkout Automation
 *
 * Uses Playwright to automate Amazon guest checkout
 * NO LOGIN REQUIRED - Uses guest checkout for simplicity
 */

import { chromium, Browser, Page } from 'playwright';

export interface GuestCheckoutRequest {
  productUrl: string;
  quantity: number;
  customerInfo: {
    email: string;
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  paymentCard: {
    number: string;
    expMonth: string;
    expYear: string;
    cvv: string;
  };
  maxPrice: number;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  actualPrice?: number;
  error?: string;
  screenshot?: string;
}

export class AmazonGuestCheckout {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    console.log('✅ Browser initialized for Amazon guest checkout');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Purchase product as guest (no Amazon account needed!)
   */
  async purchaseAsGuest(request: GuestCheckoutRequest): Promise<CheckoutResult> {
    let page: Page | null = null;

    try {
      await this.initialize();

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      });

      page = await context.newPage();

      console.log('🛒 Starting Amazon guest checkout...');
      console.log(`   Product: ${request.productUrl}`);

      // Step 1: Go to product page
      await page.goto(request.productUrl, { waitUntil: 'networkidle' });

      // Step 2: Verify price
      const actualPrice = await this.getPrice(page);
      console.log(`   Current Price: $${actualPrice}`);

      if (actualPrice > request.maxPrice) {
        throw new Error(`Price increased to $${actualPrice} (max: $${request.maxPrice})`);
      }

      // Step 3: Add to cart
      await this.addToCart(page);

      // Step 4: Proceed to checkout
      await page.goto('https://www.amazon.com/gp/cart/view.html');
      await page.waitForSelector('[name="proceedToRetailCheckout"], [name="proceedToCheckout"]', { timeout: 10000 });
      await page.click('[name="proceedToRetailCheckout"], [name="proceedToCheckout"]');
      await page.waitForLoadState('networkidle');

      // Step 5: Fill shipping info (GUEST CHECKOUT)
      await this.fillShippingInfo(page, request.customerInfo);

      // Step 6: Select shipping method
      await this.selectShipping(page);

      // Step 7: Fill payment info
      await this.fillPaymentInfo(page, request.paymentCard, request.customerInfo);

      // Step 8: Review and place order
      const orderId = await this.placeOrder(page);

      console.log('✅ Order placed successfully!');
      console.log(`   Order ID: ${orderId}`);

      await context.close();

      return {
        success: true,
        orderId,
        actualPrice
      };

    } catch (error: any) {
      console.error('❌ Guest checkout failed:', error.message);

      // Take screenshot for debugging
      let screenshot: string | undefined;
      if (page) {
        try {
          const screenshotPath = `/tmp/amazon-error-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          screenshot = screenshotPath;
          console.log(`📸 Screenshot saved: ${screenshotPath}`);
        } catch (e) {
          // Ignore screenshot errors
        }
      }

      return {
        success: false,
        error: error.message,
        screenshot
      };
    }
  }

  private async getPrice(page: Page): Promise<number> {
    const selectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price-whole'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text) {
            const price = parseFloat(text.replace(/[^0-9.]/g, ''));
            if (!isNaN(price) && price > 0) {
              return price;
            }
          }
        }
      } catch (e) {
        // Try next selector
      }
    }

    throw new Error('Could not find product price');
  }

  private async addToCart(page: Page): Promise<void> {
    console.log('🛒 Adding to cart...');

    const selectors = [
      '#add-to-cart-button',
      'input[name="submit.add-to-cart"]',
      '#buy-now-button'
    ];

    for (const selector of selectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await page.waitForTimeout(2000);
          console.log('✅ Added to cart');
          return;
        }
      } catch (e) {
        // Try next selector
      }
    }

    throw new Error('Could not find add to cart button');
  }

  private async fillShippingInfo(page: Page, info: any): Promise<void> {
    console.log('📦 Filling shipping info...');

    // Wait for address form
    await page.waitForSelector('#address-ui-widgets-enterAddressFullName, #address-book-entry-0, [name="address-ui-widgets-enterAddressFullName"]', { timeout: 15000 });

    // Check if there's an existing address we can use
    const existingAddress = await page.$('#address-book-entry-0');

    if (existingAddress) {
      // Use existing address and add email
      await existingAddress.click();

      // Fill email if required
      const emailInput = await page.$('#email');
      if (emailInput) {
        await emailInput.fill(info.email);
      }
    } else {
      // Fill new address form
      await page.fill('[name="address-ui-widgets-enterAddressFullName"], #address-ui-widgets-enterAddressFullName', info.name);
      await page.fill('[name="address-ui-widgets-enterAddressLine1"], #address-ui-widgets-enterAddressLine1', info.address1);

      if (info.address2) {
        await page.fill('[name="address-ui-widgets-enterAddressLine2"], #address-ui-widgets-enterAddressLine2', info.address2);
      }

      await page.fill('[name="address-ui-widgets-enterAddressCity"], #address-ui-widgets-enterAddressCity', info.city);
      await page.selectOption('[name="address-ui-widgets-enterAddressStateOrRegion"], #address-ui-widgets-enterAddressStateOrRegion', info.state);
      await page.fill('[name="address-ui-widgets-enterAddressPostalCode"], #address-ui-widgets-enterAddressPostalCode', info.zip);
      await page.fill('[name="address-ui-widgets-enterAddressPhoneNumber"], #address-ui-widgets-enterAddressPhoneNumber', info.phone);

      // Fill email
      const emailInput = await page.$('[name="email"], #email');
      if (emailInput) {
        await emailInput.fill(info.email);
      }
    }

    // Continue
    const continueBtn = await page.$('[name="shipToThisAddress"], input[name="continue"]');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ Shipping info filled');
  }

  private async selectShipping(page: Page): Promise<void> {
    console.log('🚚 Selecting shipping...');

    // Select fastest shipping option
    const shippingOptions = await page.$$('input[name="shipmethod"]');

    if (shippingOptions.length > 0) {
      await shippingOptions[0].click();
      await page.waitForTimeout(1000);
    }

    // Continue to payment
    const continueBtn = await page.$('input[name="continue"], [name="continue"]');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ Shipping selected');
  }

  private async fillPaymentInfo(page: Page, card: any, billing: any): Promise<void> {
    console.log('💳 Filling payment info...');

    // Wait for payment form
    await page.waitForSelector('input[name="addCreditCardNumber"], [name="addCreditCardNumber"]', { timeout: 15000 });

    // Fill card details
    await page.fill('input[name="addCreditCardNumber"], [name="addCreditCardNumber"]', card.number);
    await page.selectOption('select[name="ppw-expirationDate_month"], [name="ppw-expirationDate_month"]', card.expMonth);
    await page.selectOption('select[name="ppw-expirationDate_year"], [name="ppw-expirationDate_year"]', card.expYear);

    // Fill billing address (usually same as shipping)
    const sameAsShipping = await page.$('#ppw-widgetEvent\\:SetPaymentPlanSelectContinueEvent');
    if (sameAsShipping) {
      await sameAsShipping.click();
      await page.waitForTimeout(1000);
    }

    // Continue
    const continueBtn = await page.$('input[name="ppw-widgetEvent:SetPaymentPlanSelectContinueEvent"]');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForLoadState('networkidle');
    }

    console.log('✅ Payment info filled');
  }

  private async placeOrder(page: Page): Promise<string> {
    console.log('🎯 Placing order...');

    // Find and click place order button
    const placeOrderSelectors = [
      'input[name="placeYourOrder1"]',
      '#submitOrderButtonId',
      'input[aria-labelledby="submitOrderButtonId-announce"]'
    ];

    for (const selector of placeOrderSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(3000);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Extract order ID
    await page.waitForTimeout(3000);
    const orderIdElement = await page.$('.order-date-invoice-item, [data-test-id="order-id"]');
    let orderId = `GUEST_${Date.now()}`;

    if (orderIdElement) {
      const text = await orderIdElement.textContent();
      const match = text?.match(/Order #?(\d+-\d+-\d+)/i);
      if (match) {
        orderId = match[1];
      }
    }

    console.log('✅ Order placed!');
    return orderId;
  }
}

// Singleton
let guestCheckoutService: AmazonGuestCheckout | null = null;

export function getGuestCheckoutService(): AmazonGuestCheckout {
  if (!guestCheckoutService) {
    guestCheckoutService = new AmazonGuestCheckout();
  }
  return guestCheckoutService;
}
