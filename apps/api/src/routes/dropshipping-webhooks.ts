import express from 'express';
import crypto from 'crypto';

/**
 * Dropshipping Webhook Endpoints
 *
 * Receives order notifications from destination platforms (eBay, Amazon)
 * and triggers automatic fulfillment from source platforms.
 *
 * ENDPOINTS:
 * - POST /webhooks/ebay/orders - eBay order notifications
 * - POST /webhooks/amazon/orders - Amazon order notifications
 * - POST /webhooks/availability - Manual availability checks
 */

const router = express.Router();

/**
 * eBay Order Webhook
 *
 * eBay sends notifications when:
 * - Order is placed
 * - Payment is received
 * - Buyer requests refund/return
 *
 * Docs: https://developer.ebay.com/api-docs/sell/account/resources/subscription/methods/createSubscription
 */
router.post('/webhooks/ebay/orders', async (req, res) => {
  try {
    // Verify eBay signature
    const signature = req.headers['x-ebay-signature'];
    const isValid = verifyEbaySignature(req.body, signature as string);

    if (!isValid) {
      console.warn('⚠️  Invalid eBay webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const notification = req.body;
    const { metadata, notificationEventName } = notification;

    console.log(`📬 eBay webhook: ${notificationEventName}`);

    // Handle different event types
    switch (notificationEventName) {
      case 'ORDER.PAYMENT_RECEIVED':
        await handleEbayOrderPlaced(notification);
        break;

      case 'ORDER.BUYER_CANCEL_REQUESTED':
        await handleEbayOrderCanceled(notification);
        break;

      case 'ORDER.RETURN_REQUESTED':
        await handleEbayReturnRequested(notification);
        break;

      default:
        console.log(`ℹ️  Unhandled eBay event: ${notificationEventName}`);
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ status: 'received' });
  } catch (error: any) {
    console.error('❌ eBay webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Amazon Order Webhook (via Amazon EventBridge)
 *
 * Amazon uses EventBridge for notifications:
 * - ORDER_CHANGE events when order status changes
 * - ORDER_STATUS_CHANGE for shipping, cancellation, etc.
 *
 * Note: Requires EventBridge setup in AWS console
 */
router.post('/webhooks/amazon/orders', async (req, res) => {
  try {
    const event = req.body;

    console.log(`📬 Amazon webhook: ${event.detailType}`);

    // Amazon EventBridge structure
    if (event.detailType === 'ORDER_CHANGE') {
      await handleAmazonOrderPlaced(event.detail);
    }

    res.status(200).json({ status: 'received' });
  } catch (error: any) {
    console.error('❌ Amazon webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generic webhook for testing
 */
router.post('/webhooks/test', async (req, res) => {
  console.log('📬 Test webhook received:', req.body);
  res.json({ status: 'received', timestamp: new Date() });
});

/**
 * Handle eBay order placed
 */
async function handleEbayOrderPlaced(notification: any) {
  const orderDetails = notification.payload;

  console.log('🛒 New eBay order received!');
  console.log(`   Order ID: ${orderDetails.orderId}`);
  console.log(`   Total: $${orderDetails.pricingSummary?.total?.value}`);

  // 1. Find matching dropshipping listing by SKU or listing ID
  // 2. Extract customer shipping address
  // 3. Trigger automatic purchase from source platform
  // 4. Update order status

  // This would be implemented in the OrderFulfillmentService
  // const fulfillmentService = new OrderFulfillmentService();
  // await fulfillmentService.fulfillOrder({
  //   destinationOrderId: orderDetails.orderId,
  //   destinationPlatform: 'ebay',
  //   ...
  // });
}

/**
 * Handle eBay order canceled
 */
async function handleEbayOrderCanceled(notification: any) {
  console.log('❌ eBay order canceled');
  // Cancel source order if not yet shipped
}

/**
 * Handle eBay return requested
 */
async function handleEbayReturnRequested(notification: any) {
  console.log('↩️  eBay return requested');
  // Process return, coordinate with source platform
}

/**
 * Handle Amazon order placed
 */
async function handleAmazonOrderPlaced(orderDetails: any) {
  console.log('🛒 New Amazon order received!');
  console.log(`   Order ID: ${orderDetails.AmazonOrderId}`);

  // Similar to eBay - trigger fulfillment
}

/**
 * Verify eBay webhook signature
 */
function verifyEbaySignature(payload: any, signature: string): boolean {
  if (!signature) return false;

  const verificationToken = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN || '';
  if (!verificationToken) {
    console.warn('⚠️  EBAY_WEBHOOK_VERIFICATION_TOKEN not set');
    return true; // Skip verification in development
  }

  const expectedSignature = crypto
    .createHmac('sha256', verificationToken)
    .update(JSON.stringify(payload))
    .digest('base64');

  return signature === expectedSignature;
}

/**
 * Webhook health check
 */
router.get('/webhooks/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoints: {
      ebay: '/webhooks/ebay/orders',
      amazon: '/webhooks/amazon/orders',
      test: '/webhooks/test'
    },
    timestamp: new Date()
  });
});

export default router;
