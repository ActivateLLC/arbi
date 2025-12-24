/**
 * Automated Amazon Fulfillment Service
 * Uses Stagehand browser automation to purchase from Amazon
 * and ship directly to the customer
 */

import { Stagehand } from '@browserbasehq/stagehand';

interface FulfillmentRequest {
  orderId: string;
  productUrl: string; // Amazon product URL
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

export class AmazonFulfillmentService {
  private stagehand: Stagehand | null = null;

  /**
   * Initialize browser automation
   * Defaults to FREE local mode - no Browserbase subscription needed!
   * Only uses Browserbase if BROWSERBASE_API_KEY is explicitly set.
   */
  async initialize() {
    console.log('🤖 Initializing browser automation...');

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
   * Automatically purchase product from Amazon and ship to customer
   */
  async fulfillOrder(request: FulfillmentRequest): Promise<{
    success: boolean;
    orderId?: string;
    trackingNumber?: string;
    error?: string;
  }> {
    if (!this.stagehand) {
      await this.initialize();
    }

    console.log(`\n🛒 AUTO-FULFILLING ORDER: ${request.orderId}`);
    console.log(`   Product: ${request.productUrl}`);
    console.log(`   Quantity: ${request.quantity}`);
    console.log(`   Ship to: ${request.shippingAddress.name}`);

    try {
      const page = this.stagehand!.page;

      // Step 1: Go to Amazon product page
      console.log('   📍 Step 1: Navigating to product...');
      await page.goto(request.productUrl);
      await page.waitForLoadState('networkidle');

      // Step 2: Add to cart
      console.log('   🛒 Step 2: Adding to cart...');
      await this.stagehand!.act({
        action: 'click on the "Add to Cart" button'
      });

      // Wait for cart confirmation
      await page.waitForTimeout(2000);

      // Step 3: Go to cart and proceed to checkout
      console.log('   💳 Step 3: Proceeding to checkout...');
      await this.stagehand!.act({
        action: 'click on the "Proceed to checkout" or "Go to Cart" button'
      });

      await page.waitForTimeout(2000);

      // Step 4: Sign in (use saved credentials)
      console.log('   🔐 Step 4: Signing in...');
      const isSignedIn = await this.stagehand!.observe({
        instruction: 'check if user is already signed in to Amazon'
      });

      if (!isSignedIn) {
        // Sign in with stored Amazon credentials
        await this.stagehand!.act({
          action: `enter email "${process.env.AMAZON_EMAIL}" in the email field and click continue`
        });

        await page.waitForTimeout(1000);

        await this.stagehand!.act({
          action: `enter password "${process.env.AMAZON_PASSWORD}" in the password field and click sign in`
        });

        await page.waitForLoadState('networkidle');
      }

      // Step 5: Enter customer's shipping address
      console.log('   📦 Step 5: Entering shipping address...');

      await this.stagehand!.act({
        action: 'click on "Add a new address" or "Use a different address"'
      });

      await page.waitForTimeout(1000);

      // Fill in customer's shipping address
      await this.stagehand!.act({
        action: `enter full name "${request.shippingAddress.name}" in the name field`
      });

      await this.stagehand!.act({
        action: `enter address "${request.shippingAddress.line1}" in the address line 1 field`
      });

      if (request.shippingAddress.line2) {
        await this.stagehand!.act({
          action: `enter address line 2 "${request.shippingAddress.line2}"`
        });
      }

      await this.stagehand!.act({
        action: `enter city "${request.shippingAddress.city}"`
      });

      await this.stagehand!.act({
        action: `select state "${request.shippingAddress.state}" from dropdown`
      });

      await this.stagehand!.act({
        action: `enter zip code "${request.shippingAddress.postalCode}"`
      });

      await this.stagehand!.act({
        action: 'click the continue or save address button'
      });

      await page.waitForLoadState('networkidle');

      // Step 6: Select shipping speed
      console.log('   🚚 Step 6: Selecting shipping...');
      await this.stagehand!.act({
        action: 'select FREE shipping or standard shipping option and continue'
      });

      await page.waitForTimeout(2000);

      // Step 7: Payment method (use stored payment)
      console.log('   💳 Step 7: Selecting payment method...');
      await this.stagehand!.act({
        action: 'select the default saved payment method or credit card and continue'
      });

      await page.waitForTimeout(2000);

      // Step 8: Review and place order
      console.log('   ✅ Step 8: Placing order...');

      // Get order total before placing
      const orderTotal = await this.stagehand!.extract({
        instruction: 'extract the order total price',
        schema: {
          type: 'object',
          properties: {
            total: { type: 'string' }
          }
        }
      });

      console.log(`   💰 Amazon order total: ${orderTotal.total}`);

      // PLACE THE ORDER
      await this.stagehand!.act({
        action: 'click the "Place your order" or "Buy now" button to complete purchase'
      });

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Step 9: Extract order confirmation details
      console.log('   📄 Step 9: Extracting order details...');

      const orderDetails = await this.stagehand!.extract({
        instruction: 'extract the Amazon order number and estimated delivery date from the confirmation page',
        schema: {
          type: 'object',
          properties: {
            orderNumber: { type: 'string' },
            estimatedDelivery: { type: 'string' }
          }
        }
      });

      console.log(`   ✅ ORDER PLACED SUCCESSFULLY!`);
      console.log(`   📦 Amazon Order #: ${orderDetails.orderNumber}`);
      console.log(`   📅 Estimated Delivery: ${orderDetails.estimatedDelivery}`);

      // Take screenshot for proof
      await page.screenshot({
        path: `/tmp/order_${request.orderId}_confirmation.png`,
        fullPage: true
      });

      return {
        success: true,
        orderId: orderDetails.orderNumber,
        trackingNumber: orderDetails.orderNumber, // Amazon order number acts as tracking
      };

    } catch (error: any) {
      console.error('   ❌ Auto-fulfillment failed:', error.message);
      console.error('   Stack:', error.stack);

      // Take screenshot of error state
      if (this.stagehand?.page) {
        await this.stagehand.page.screenshot({
          path: `/tmp/order_${request.orderId}_error.png`,
          fullPage: true
        });
      }

      return {
        success: false,
        error: error.message
      };
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
export const amazonFulfillment = new AmazonFulfillmentService();
