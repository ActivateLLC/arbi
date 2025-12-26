/**
 * Stripe Webhook Handler
 *
 * Listens for Stripe checkout.session.completed events
 * Triggers automatic Amazon purchase when customer pays
 */

import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getAutoPurchaseService } from '../services/amazonAutoPurchase';
import { getListing, updateListing } from './marketplace';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/stripe/webhook
 * Stripe webhook endpoint (must be raw body, not JSON parsed)
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(500).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).send('No signature');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // For testing without webhook secret
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          console.log('💰 Payment succeeded:', event.data.object.id);
          break;

        default:
          console.log(`ℹ️  Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('❌ Webhook handler error:', error.message);
      res.status(500).send('Webhook handler failed');
    }
  }
);

/**
 * Handle successful checkout - trigger auto-purchase from Amazon
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Checkout completed!');
  console.log(`   Session ID: ${session.id}`);
  console.log(`   Amount: $${(session.amount_total! / 100).toFixed(2)}`);

  const { listingId, supplierPrice, supplierUrl } = session.metadata || {};

  if (!listingId || !supplierPrice || !supplierUrl) {
    console.error('❌ Missing metadata in session');
    return;
  }

  // Get listing details
  const listing = await getListing(listingId);

  if (!listing) {
    console.error(`❌ Listing not found: ${listingId}`);
    return;
  }

  // Get customer shipping details
  const customer = await stripe?.customers.retrieve(session.customer as string);
  const shipping = session.shipping || (customer as any)?.shipping;

  if (!shipping) {
    console.error('❌ No shipping address found');
    return;
  }

  // STEP 1: Instant payout to bank (get cash NOW!)
  const useInstantPayout = process.env.STRIPE_INSTANT_PAYOUT === 'true';

  if (useInstantPayout && stripe) {
    console.log('💸 Triggering instant payout to bank...');

    try {
      const payoutAmount = session.amount_total! - (session.amount_total! * 0.029 + 30); // Subtract Stripe fee

      const payout = await stripe.payouts.create({
        amount: Math.floor(payoutAmount),
        currency: 'usd',
        method: 'instant', // Instant payout (arrives in ~30 min)
        description: `Auto-payout for order ${listingId}`
      });

      console.log('✅ Instant payout initiated!');
      console.log(`   Amount: $${(payout.amount / 100).toFixed(2)}`);
      console.log(`   Fee: ~$${(payout.amount * 0.01 / 100).toFixed(2)} (1%)`);
      console.log(`   Arriving: ~30 minutes`);

      // Wait a moment for payout to process
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error: any) {
      console.error('⚠️  Instant payout failed:', error.message);
      console.log('   Continuing with standard payout (2-7 days)');
    }
  }

  // STEP 2: Trigger automatic Amazon purchase
  console.log('🤖 Triggering automatic Amazon purchase...');
  console.log(`   Product: ${listing.productTitle}`);
  console.log(`   Supplier: ${supplierUrl}`);
  console.log(`   Customer: ${shipping.name}`);

  // Trigger auto-purchase
  const autoPurchase = getAutoPurchaseService();

  const result = await autoPurchase.purchaseProduct({
    productUrl: supplierUrl,
    quantity: 1,
    shippingAddress: {
      name: shipping.name || 'Customer',
      line1: shipping.address?.line1 || '',
      line2: shipping.address?.line2,
      city: shipping.address?.city || '',
      state: shipping.address?.state || '',
      postal_code: shipping.address?.postal_code || '',
      country: shipping.address?.country || 'US'
    },
    buyerEmail: (session.customer_details?.email) || 'unknown@example.com',
    maxPrice: parseFloat(supplierPrice)
  });

  if (result.success) {
    console.log('✅ Auto-purchase successful!');
    console.log(`   Amazon Order ID: ${result.orderId}`);
    console.log(`   Actual Price: $${result.actualPrice}`);
    console.log(`   Tracking: ${result.trackingNumber || 'Pending'}`);

    // Update listing status
    await updateListing(listingId, {
      status: 'sold',
      soldAt: new Date()
    });

    // TODO: Save order details to database
    // TODO: Send confirmation email to customer with tracking

  } else {
    console.error('❌ Auto-purchase failed:', result.error);

    // TODO: Send alert to admin
    // TODO: Refund customer or manually process order
  }
}

export default router;
