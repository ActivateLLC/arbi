/**
 * Stripe Webhook Handler
 * Listens for payment events and triggers automated order fulfillment
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getDatabase } from '../config/database';
import { recordTrade } from './revenue';
// NOTE: supplierFulfillment is imported lazily inside the auto-fulfillment
// branch below — it pulls in the optional @browserbasehq/stagehand dependency,
// so we must not load it at module init (it would crash boot if not installed).

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events.
 * Mounted at '/api/webhooks/stripe' in index.ts with a raw body parser, so the
 * route path here is the mount root ('/').
 */
router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!sig || !stripe || !webhookSecret) {
    console.error('❌ Missing Stripe webhook configuration');
    return res.status(400).send('Webhook configuration missing');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`\n🔔 Stripe Webhook Event: ${event.type}`);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;

    case 'payment_intent.succeeded':
      console.log('   ✅ Payment succeeded');
      break;

    case 'payment_intent.payment_failed':
      console.log('   ❌ Payment failed');
      break;

    default:
      console.log(`   ℹ️  Unhandled event type: ${event.type}`);
  }

  // Return 200 to acknowledge receipt
  res.json({ received: true });
});

/**
 * Handle successful checkout completion
 * This is where the magic happens - auto-fulfill the order!
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('\n💰 CHECKOUT COMPLETED!');
  console.log('   Session ID:', session.id);
  console.log('   Customer Email:', session.customer_details?.email);
  console.log('   Amount Paid:', `$${(session.amount_total! / 100).toFixed(2)}`);

  try {
    // Extract order details from metadata
    const metadata = session.metadata;
    if (!metadata) {
      throw new Error('No metadata in session');
    }

    const listingId = metadata.listingId;
    const quantity = parseInt(metadata.quantity || '1');
    const supplierPrice = parseFloat(metadata.supplierPrice);
    const estimatedProfit = parseFloat(metadata.estimatedProfit);
    const supplierUrl = metadata.supplierUrl;

    console.log('   📦 Order Details:');
    console.log('      Listing ID:', listingId);
    console.log('      Quantity:', quantity);
    console.log('      Supplier Price:', `$${supplierPrice}`);
    console.log('      Your Profit:', `$${estimatedProfit}`);

    // Get customer shipping address from Stripe
    const shippingAddress = session.shipping_details?.address;
    if (!shippingAddress) {
      throw new Error('No shipping address provided');
    }

    console.log('   📫 Shipping To:');
    console.log('      Name:', session.shipping_details?.name);
    console.log('      Address:', shippingAddress.line1);
    console.log('      City:', shippingAddress.city);
    console.log('      State:', shippingAddress.state);
    console.log('      ZIP:', shippingAddress.postal_code);

    // Save order to database
    const db = getDatabase();
    const order = {
      orderId: `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      listingId,
      buyerEmail: session.customer_details?.email || 'unknown@email.com',
      buyerShippingAddress: {
        name: session.shipping_details?.name || '',
        line1: shippingAddress.line1,
        line2: shippingAddress.line2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postal_code,
        country: shippingAddress.country,
      },
      paymentIntentId: session.payment_intent?.toString() || session.id,
      amountPaid: session.amount_total! / 100,
      supplierOrderId: null,
      supplierPurchaseStatus: 'pending',
      shipmentTrackingNumber: null,
      shipmentCarrier: null,
      status: 'payment_received',
      actualProfit: estimatedProfit,
      refundId: null,
      refundedAt: null,
      createdAt: new Date(),
      deliveredAt: null,
    };

    await db.create('BuyerOrder', order);
    console.log('   ✅ Order saved to database:', order.orderId);

    // Record the sale into the live revenue tracker so the dashboard's revenue
    // metric reflects real income (decoupled before this).
    try {
      recordTrade({
        tradeId: order.orderId,
        productTitle: listingId,
        grossProfit: isNaN(estimatedProfit) ? 0 : estimatedProfit,
      });
    } catch (e: any) {
      console.error('   ⚠️  Failed to record revenue for order:', e.message);
    }

    // 🤖 AUTO-PURCHASE FROM ANY SUPPLIER (Amazon, Walmart, Target, eBay, etc.)
    if (process.env.ENABLE_AUTO_FULFILLMENT === 'true' && supplierUrl) {
      console.log('\n🤖 INITIATING AUTOMATED MULTI-VENDOR FULFILLMENT...');

      try {
        // Lazy-load: only pulls in @browserbasehq/stagehand when auto-fulfillment
        // is actually enabled. If the package isn't installed this throws and is
        // caught below, leaving the order saved for manual fulfillment.
        const { supplierFulfillment } = await import('../services/supplierFulfillment');
        const fulfillmentResult = await supplierFulfillment.fulfillOrder({
          orderId: order.orderId,
          productUrl: supplierUrl,
          quantity,
          shippingAddress: {
            name: session.shipping_details?.name || '',
            line1: shippingAddress.line1,
            line2: shippingAddress.line2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            postalCode: shippingAddress.postal_code,
            country: shippingAddress.country,
          },
          customerEmail: session.customer_details?.email || '',
          amountPaid: session.amount_total! / 100,
        });

        if (fulfillmentResult.success) {
          console.log('   ✅ AUTO-FULFILLMENT SUCCESSFUL!');
          console.log(`   🏪 Vendor: ${fulfillmentResult.vendor?.toUpperCase()}`);
          console.log('   📦 Order Number:', fulfillmentResult.orderId);

          // Update order with tracking info
          await db.update('BuyerOrder', {
            supplierOrderId: fulfillmentResult.orderId,
            supplierPurchaseStatus: 'completed',
            shipmentTrackingNumber: fulfillmentResult.trackingNumber,
            status: 'purchasing_from_supplier',
          }, { where: { orderId: order.orderId } });

          console.log('   ✅ Order updated with tracking');
        } else {
          console.error('   ❌ Auto-fulfillment failed:', fulfillmentResult.error);
          console.log('   💡 Fallback: Manual purchase required');
        }
      } catch (error: any) {
        console.error('   ❌ Fulfillment error:', error.message);
        console.log('   💡 Order saved - manual fulfillment required');
      }
    } else {
      console.log('\n⚠️  Auto-fulfillment disabled');
      console.log('   Set ENABLE_AUTO_FULFILLMENT=true to enable');
      console.log('   📋 Manual fulfillment required:');
      console.log('   🛒 Purchase from:', supplierUrl);
      console.log('   📦 Quantity:', quantity);
      console.log('   💵 Using buyer\'s money: $', session.amount_total! / 100);
      console.log('   📬 Ship to:', session.shipping_details?.name);
      console.log('      ', `${shippingAddress.line1}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`);
    }

    // TODO: Send confirmation email to customer
    console.log('\n📧 TODO: Send order confirmation email');
    console.log('   To:', session.customer_details?.email);

    // TODO: Send notification to you
    console.log('\n💰 TODO: Send profit notification to you');
    console.log('   Subject: New Sale! Profit: $' + estimatedProfit);

  } catch (error: any) {
    console.error('\n❌ Error processing checkout:', error.message);
    console.error('   Stack:', error.stack);
  }
}

export default router;
