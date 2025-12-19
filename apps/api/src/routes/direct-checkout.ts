/**
 * Direct Checkout Links
 *
 * Use these URLs in ads for instant checkout (no landing page needed)
 * Perfect for Google Ads, Facebook Ads where you want fewest clicks
 *
 * Flow: Customer clicks ad → Stripe checkout → Done!
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { getListings } from './marketplace';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

/**
 * GET /checkout/:listingId
 * Direct checkout - creates Stripe session and redirects immediately
 */
router.get('/checkout/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  try {
    // Get listing directly from database (no HTTP fetch needed!)
    const listings = await getListings('active');
    const listing = listings.find((l: any) => l.listingId === listingId);

    if (!listing || listing.status !== 'active') {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>😕 Product Not Available</h1>
            <p>This product is no longer available or has been sold.</p>
          </body>
        </html>
      `);
    }

    if (!stripe) {
      return res.status(500).send('Payment processing not configured');
    }

    // Get product image
    const imageUrl = listing.productImages && listing.productImages.length > 0
      ? listing.productImages[0]
      : undefined;

    // Create Stripe Checkout Session with multiple payment options
    // Including Klarna, Afterpay, Affirm for "Buy Now, Pay Later"
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        'card',              // Credit/debit cards
        'klarna',            // Klarna - Pay in 4 installments
        'afterpay_clearpay', // Afterpay - Pay in 4
        'affirm',            // Affirm - Monthly financing
        'cashapp',           // Cash App Pay
      ],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: listing.productTitle,
              description: listing.productDescription,
              images: imageUrl ? [imageUrl] : undefined, // Product photo in checkout!
            },
            unit_amount: Math.round(listing.marketplacePrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/product/${listingId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/product/${listingId}`,
      metadata: {
        listingId,
        opportunityId: listing.opportunityId,
        supplierPrice: listing.supplierPrice.toString(),
        estimatedProfit: listing.estimatedProfit.toString(),
      },
      // Optional: Pre-fill shipping (for faster checkout)
      shipping_address_collection: {
        allowed_countries: ['US'], // Adjust as needed
      },
    });

    // Redirect directly to Stripe Checkout
    res.redirect(303, session.url!);
  } catch (error: any) {
    console.error('Direct checkout error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>⚠️ Checkout Error</h1>
          <p>Unable to process checkout. Please try again later.</p>
        </body>
      </html>
    `);
  }
});

/**
 * GET /buy/:listingId
 * Even shorter URL for ads - same as /checkout
 */
router.get('/buy/:listingId', async (req: Request, res: Response) => {
  // Redirect to main checkout handler
  res.redirect(`/checkout/${req.params.listingId}`);
});

export default router;
