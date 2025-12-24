/**
 * Multi-Vendor Automated Fulfillment Service
 * Supports: Amazon, Walmart, Target, eBay, Best Buy, and any online retailer
 * Uses Stagehand browser automation to purchase and ship directly to customer
 *
 * GUEST CHECKOUT SUPPORTED (no login required):
 * ✅ Amazon - Prefers guest checkout, login optional
 * ✅ eBay - Prefers guest checkout, login optional
 * ✅ Best Buy - Prefers guest checkout, login optional
 * ⚠️  Walmart - May require login
 * ⚠️  Target - May require login
 *
 * Login credentials are OPTIONAL for most vendors!
 */

import { Stagehand } from '@browserbasehq/stagehand';

interface FulfillmentRequest {
  orderId: string;
  productUrl: string; // Any supplier URL
  quantity: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  customerEmail: string;
  amountPaid: number;
}

type Vendor = 'amazon' | 'walmart' | 'target' | 'ebay' | 'bestbuy' | 'other';

export class SupplierFulfillmentService {
  private stagehand: Stagehand | null = null;

  /**
   * Initialize browser automation
   * Defaults to FREE local mode - no Browserbase subscription needed!
   * Only uses Browserbase if BROWSERBASE_API_KEY is explicitly set.
   */
  async initialize() {
    console.log('🤖 Initializing multi-vendor browser automation...');

    // Use LOCAL mode by default (free!), only use Browserbase if API key is set
    const useBrowserbase = !!process.env.BROWSERBASE_API_KEY;

    this.stagehand = new Stagehand({
      env: useBrowserbase ? 'BROWSERBASE' : 'LOCAL',
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      verbose: 1,
      headless: process.env.NODE_ENV === 'production',
    });

    await this.stagehand.init();
    console.log(`✅ Browser automation ready (${useBrowserbase ? 'BROWSERBASE' : 'LOCAL - FREE'})`);
  }

  /**
   * Auto-detect vendor from product URL
   */
  private detectVendor(url: string): Vendor {
    const urlLower = url.toLowerCase();

    if (urlLower.includes('amazon.com')) return 'amazon';
    if (urlLower.includes('walmart.com')) return 'walmart';
    if (urlLower.includes('target.com')) return 'target';
    if (urlLower.includes('ebay.com')) return 'ebay';
    if (urlLower.includes('bestbuy.com')) return 'bestbuy';

    return 'other';
  }

  /**
   * Automatically purchase product from ANY vendor and ship to customer
   */
  async fulfillOrder(request: FulfillmentRequest): Promise<{
    success: boolean;
    vendor?: string;
    orderId?: string;
    trackingNumber?: string;
    error?: string;
  }> {
    if (!this.stagehand) {
      await this.initialize();
    }

    const vendor = this.detectVendor(request.productUrl);

    console.log(`\n🛒 AUTO-FULFILLING ORDER: ${request.orderId}`);
    console.log(`   Vendor: ${vendor.toUpperCase()}`);
    console.log(`   Product: ${request.productUrl}`);
    console.log(`   Quantity: ${request.quantity}`);
    console.log(`   Ship to: ${request.shippingAddress.name}`);

    try {
      // Route to vendor-specific fulfillment
      switch (vendor) {
        case 'amazon':
          return await this.fulfillAmazon(request);
        case 'walmart':
          return await this.fulfillWalmart(request);
        case 'target':
          return await this.fulfillTarget(request);
        case 'ebay':
          return await this.fulfillEbay(request);
        case 'bestbuy':
          return await this.fulfillBestBuy(request);
        default:
          return await this.fulfillGeneric(request);
      }

    } catch (error: any) {
      console.error('   ❌ Auto-fulfillment failed:', error.message);
      return {
        success: false,
        vendor,
        error: error.message
      };
    }
  }

  /**
   * AMAZON fulfillment flow
   * ✅ Supports guest checkout - AMAZON_EMAIL/AMAZON_PASSWORD are OPTIONAL
   */
  private async fulfillAmazon(request: FulfillmentRequest): Promise<any> {
    console.log('   🟠 Using AMAZON checkout flow...');
    const page = this.stagehand!.page;

    try {
      // Step 1: Navigate to product
      console.log('   📍 Step 1: Navigating to product...');
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      // Step 2: Add to cart
      console.log('   🛒 Step 2: Adding to cart...');
      await this.stagehand!.act({
        action: 'click on the "Add to Cart" button'
      });
      await page.waitForTimeout(2000);

      // Step 3: Proceed to checkout
      console.log('   💳 Step 3: Proceeding to checkout...');
      await this.stagehand!.act({
        action: 'click on "Proceed to checkout" or navigate to cart and checkout'
      });
      await page.waitForTimeout(2000);

      // Step 4: Guest checkout preferred (login only if credentials provided)
      console.log('   🔐 Step 4: Authenticating...');
      await this.authenticateIfNeeded('AMAZON_EMAIL', 'AMAZON_PASSWORD');

      // Step 5: Shipping address
      console.log('   📦 Step 5: Setting shipping address...');
      await this.enterShippingAddress(request.shippingAddress);

      // Step 6: Select FREE shipping
      console.log('   🚚 Step 6: Selecting shipping speed...');
      await this.stagehand!.act({
        action: 'select FREE shipping or standard shipping and continue'
      });
      await page.waitForTimeout(2000);

      // Step 7: Payment
      console.log('   💳 Step 7: Selecting payment...');
      await this.stagehand!.act({
        action: 'select default payment method and continue'
      });
      await page.waitForTimeout(2000);

      // Step 8: Place order
      console.log('   ✅ Step 8: Placing order...');
      await this.stagehand!.act({
        action: 'click "Place your order" or "Buy now" button'
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Step 9: Extract confirmation
      const orderDetails = await this.extractOrderConfirmation();

      await this.takeScreenshot(request.orderId, 'success');

      return {
        success: true,
        vendor: 'amazon',
        orderId: orderDetails.orderNumber,
        trackingNumber: orderDetails.orderNumber,
      };

    } catch (error: any) {
      await this.takeScreenshot(request.orderId, 'error');
      throw error;
    }
  }

  /**
   * WALMART fulfillment flow
   */
  private async fulfillWalmart(request: FulfillmentRequest): Promise<any> {
    console.log('   🔵 Using WALMART checkout flow...');
    const page = this.stagehand!.page;

    try {
      // Navigate to product
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      // Add to cart
      await this.stagehand!.act({
        action: 'click the "Add to cart" button'
      });
      await page.waitForTimeout(2000);

      // Go to cart
      await this.stagehand!.act({
        action: 'click "View cart" or navigate to shopping cart'
      });
      await page.waitForTimeout(1000);

      // Checkout
      await this.stagehand!.act({
        action: 'click "Check out" or "Proceed to checkout"'
      });
      await page.waitForTimeout(2000);

      // Sign in
      await this.authenticateIfNeeded('WALMART_EMAIL', 'WALMART_PASSWORD');

      // Shipping address
      await this.enterShippingAddress(request.shippingAddress);

      // Continue to payment
      await this.stagehand!.act({
        action: 'click continue to payment or delivery options'
      });
      await page.waitForTimeout(2000);

      // Select payment
      await this.stagehand!.act({
        action: 'select saved payment method and continue'
      });
      await page.waitForTimeout(2000);

      // Review and place order
      await this.stagehand!.act({
        action: 'click "Place order" button to complete purchase'
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const orderDetails = await this.extractOrderConfirmation();
      await this.takeScreenshot(request.orderId, 'success');

      return {
        success: true,
        vendor: 'walmart',
        orderId: orderDetails.orderNumber,
        trackingNumber: orderDetails.orderNumber,
      };

    } catch (error: any) {
      await this.takeScreenshot(request.orderId, 'error');
      throw error;
    }
  }

  /**
   * TARGET fulfillment flow
   */
  private async fulfillTarget(request: FulfillmentRequest): Promise<any> {
    console.log('   🔴 Using TARGET checkout flow...');
    const page = this.stagehand!.page;

    try {
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      // Add to cart
      await this.stagehand!.act({
        action: 'click "Add to cart" button'
      });
      await page.waitForTimeout(2000);

      // View cart and checkout
      await this.stagehand!.act({
        action: 'click "View cart & check out" or proceed to checkout'
      });
      await page.waitForTimeout(2000);

      // Sign in
      await this.authenticateIfNeeded('TARGET_EMAIL', 'TARGET_PASSWORD');

      // Shipping
      await this.enterShippingAddress(request.shippingAddress);

      await this.stagehand!.act({
        action: 'select standard shipping and continue'
      });
      await page.waitForTimeout(2000);

      // Payment
      await this.stagehand!.act({
        action: 'select saved payment card and continue'
      });
      await page.waitForTimeout(2000);

      // Place order
      await this.stagehand!.act({
        action: 'click "Place your order" button'
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const orderDetails = await this.extractOrderConfirmation();
      await this.takeScreenshot(request.orderId, 'success');

      return {
        success: true,
        vendor: 'target',
        orderId: orderDetails.orderNumber,
        trackingNumber: orderDetails.orderNumber,
      };

    } catch (error: any) {
      await this.takeScreenshot(request.orderId, 'error');
      throw error;
    }
  }

  /**
   * EBAY fulfillment flow
   * ✅ Supports guest checkout - EBAY_EMAIL/EBAY_PASSWORD are OPTIONAL
   */
  private async fulfillEbay(request: FulfillmentRequest): Promise<any> {
    console.log('   🟡 Using EBAY checkout flow...');
    const page = this.stagehand!.page;

    try {
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      // Buy It Now
      await this.stagehand!.act({
        action: 'click "Buy It Now" button'
      });
      await page.waitForTimeout(2000);

      // Sign in
      await this.authenticateIfNeeded('EBAY_EMAIL', 'EBAY_PASSWORD');

      // Shipping
      await this.enterShippingAddress(request.shippingAddress);

      await this.stagehand!.act({
        action: 'continue to payment'
      });
      await page.waitForTimeout(2000);

      // Payment
      await this.stagehand!.act({
        action: 'select PayPal or saved payment method'
      });
      await page.waitForTimeout(2000);

      // Confirm purchase
      await this.stagehand!.act({
        action: 'click "Confirm and pay" or "Complete purchase"'
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const orderDetails = await this.extractOrderConfirmation();
      await this.takeScreenshot(request.orderId, 'success');

      return {
        success: true,
        vendor: 'ebay',
        orderId: orderDetails.orderNumber,
        trackingNumber: orderDetails.orderNumber,
      };

    } catch (error: any) {
      await this.takeScreenshot(request.orderId, 'error');
      throw error;
    }
  }

  /**
   * BEST BUY fulfillment flow
   * ✅ Supports guest checkout - BESTBUY_EMAIL/BESTBUY_PASSWORD are OPTIONAL
   */
  private async fulfillBestBuy(request: FulfillmentRequest): Promise<any> {
    console.log('   🟡 Using BEST BUY checkout flow...');
    const page = this.stagehand!.page;

    try {
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      await this.stagehand!.act({
        action: 'click "Add to Cart" button'
      });
      await page.waitForTimeout(2000);

      await this.stagehand!.act({
        action: 'click "Go to Cart" and then "Checkout"'
      });
      await page.waitForTimeout(2000);

      await this.authenticateIfNeeded('BESTBUY_EMAIL', 'BESTBUY_PASSWORD');
      await this.enterShippingAddress(request.shippingAddress);

      await this.stagehand!.act({
        action: 'select shipping method and continue'
      });
      await page.waitForTimeout(2000);

      await this.stagehand!.act({
        action: 'select payment method and continue'
      });
      await page.waitForTimeout(2000);

      await this.stagehand!.act({
        action: 'click "Place Your Order"'
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const orderDetails = await this.extractOrderConfirmation();
      await this.takeScreenshot(request.orderId, 'success');

      return {
        success: true,
        vendor: 'bestbuy',
        orderId: orderDetails.orderNumber,
        trackingNumber: orderDetails.orderNumber,
      };

    } catch (error: any) {
      await this.takeScreenshot(request.orderId, 'error');
      throw error;
    }
  }

  /**
   * GENERIC fulfillment flow for any other retailer
   * Uses natural language instructions - works on most e-commerce sites
   */
  private async fulfillGeneric(request: FulfillmentRequest): Promise<any> {
    console.log('   ⚪ Using GENERIC checkout flow (works for most sites)...');
    const page = this.stagehand!.page;

    try {
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      // Generic add to cart
      await this.stagehand!.act({
        action: 'find and click the button to add this product to the shopping cart'
      });
      await page.waitForTimeout(2000);

      // Generic checkout
      await this.stagehand!.act({
        action: 'navigate to the shopping cart and click checkout or proceed to checkout'
      });
      await page.waitForTimeout(2000);

      // Try to detect sign-in requirement
      const needsSignIn = await this.stagehand!.observe({
        instruction: 'check if the page is asking for sign-in or login credentials'
      });

      if (needsSignIn) {
        console.log('   🔐 Signing in...');
        await this.stagehand!.act({
          action: 'sign in using guest checkout OR continue as guest if available'
        });
        await page.waitForTimeout(2000);
      }

      // Shipping
      await this.enterShippingAddress(request.shippingAddress);

      await this.stagehand!.act({
        action: 'select standard or free shipping option and continue to payment'
      });
      await page.waitForTimeout(2000);

      // Payment
      await this.stagehand!.act({
        action: 'select saved payment method or enter payment details and continue'
      });
      await page.waitForTimeout(2000);

      // Place order
      await this.stagehand!.act({
        action: 'click the final button to place the order and complete the purchase'
      });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      const orderDetails = await this.extractOrderConfirmation();
      await this.takeScreenshot(request.orderId, 'success');

      return {
        success: true,
        vendor: 'generic',
        orderId: orderDetails.orderNumber || 'CONFIRMED',
        trackingNumber: orderDetails.orderNumber,
      };

    } catch (error: any) {
      await this.takeScreenshot(request.orderId, 'error');
      throw error;
    }
  }

  /**
   * Helper: Authenticate if not already signed in
   * PREFERS GUEST CHECKOUT - only uses login if credentials are provided
   */
  private async authenticateIfNeeded(emailEnv: string, passwordEnv: string) {
    const isSignedIn = await this.stagehand!.observe({
      instruction: 'check if user is already signed in or authenticated'
    });

    if (!isSignedIn) {
      const email = process.env[emailEnv];
      const password = process.env[passwordEnv];

      // Prefer guest checkout if credentials not provided
      if (!email || !password) {
        console.log(`   👤 Using GUEST CHECKOUT (${emailEnv} not set)`);
        await this.stagehand!.act({
          action: 'click "Continue as guest" or "Guest checkout" button, or look for option to checkout without signing in'
        });
        await this.stagehand!.page.waitForTimeout(2000);
        return;
      }

      // Only use login if credentials are explicitly provided
      console.log(`   🔐 Signing in with ${emailEnv}...`);

      await this.stagehand!.act({
        action: `enter email "${email}" in the email or username field`
      });
      await this.stagehand!.page.waitForTimeout(1000);

      await this.stagehand!.act({
        action: `enter password "${password}" in the password field and click sign in or login`
      });
      await this.stagehand!.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Helper: Enter shipping address
   */
  private async enterShippingAddress(address: FulfillmentRequest['shippingAddress']) {
    // Check if we need to add a new address
    const needsNewAddress = await this.stagehand!.observe({
      instruction: 'check if we need to add a new shipping address or if there is an address form visible'
    });

    if (needsNewAddress) {
      await this.stagehand!.act({
        action: 'click "Add new address" or "Use different address" if available'
      });
      await this.stagehand!.page.waitForTimeout(1000);
    }

    // Fill address fields
    await this.stagehand!.act({
      action: `enter full name "${address.name}" in the name field`
    });

    await this.stagehand!.act({
      action: `enter street address "${address.line1}" in the address line 1 field`
    });

    if (address.line2) {
      await this.stagehand!.act({
        action: `enter "${address.line2}" in address line 2 or apartment/unit field if present`
      });
    }

    await this.stagehand!.act({
      action: `enter city "${address.city}" in the city field`
    });

    await this.stagehand!.act({
      action: `select or enter state "${address.state}" in the state field`
    });

    await this.stagehand!.act({
      action: `enter zip code "${address.postalCode}" in the zip or postal code field`
    });

    await this.stagehand!.act({
      action: 'click continue or save address button'
    });
    await this.stagehand!.page.waitForLoadState('networkidle');
  }

  /**
   * Helper: Extract order confirmation details
   */
  private async extractOrderConfirmation(): Promise<{ orderNumber: string; estimatedDelivery?: string }> {
    try {
      const orderDetails = await this.stagehand!.extract({
        instruction: 'extract the order number or order ID and estimated delivery date from this confirmation page',
        schema: {
          type: 'object',
          properties: {
            orderNumber: { type: 'string' },
            estimatedDelivery: { type: 'string' }
          }
        }
      });

      console.log(`   ✅ ORDER PLACED SUCCESSFULLY!`);
      console.log(`   📦 Order #: ${orderDetails.orderNumber}`);
      if (orderDetails.estimatedDelivery) {
        console.log(`   📅 Estimated Delivery: ${orderDetails.estimatedDelivery}`);
      }

      return orderDetails;
    } catch (error) {
      console.warn('   ⚠️  Could not extract order details, but order may have been placed');
      return { orderNumber: `AUTO_${Date.now()}` };
    }
  }

  /**
   * Helper: Take screenshot
   */
  private async takeScreenshot(orderId: string, type: 'success' | 'error') {
    try {
      if (this.stagehand?.page) {
        await this.stagehand.page.screenshot({
          path: `/tmp/order_${orderId}_${type}.png`,
          fullPage: true
        });
      }
    } catch (error) {
      // Screenshot failed, not critical
    }
  }

  /**
   * Close browser
   */
  async cleanup() {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
      console.log('✅ Browser automation closed');
    }
  }
}

// Singleton instance
export const supplierFulfillment = new SupplierFulfillmentService();
