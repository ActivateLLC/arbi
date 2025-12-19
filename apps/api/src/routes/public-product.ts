/**
 * Public Product Landing Pages
 *
 * Auto-generated landing pages for each product listing
 * Used as ad destinations for Google Ads, Facebook Ads, etc.
 *
 * Features:
 * - Beautiful product display
 * - Direct Stripe checkout (no registration needed)
 * - Mobile-optimized
 * - Fast loading
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

/**
 * GET /product/:listingId
 * Public product landing page (HTML)
 */
router.get('/product/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  try {
    // Fetch listing from marketplace API (use Railway internal URL or fallback to localhost for dev)
    const apiUrl = process.env.RAILWAY_ENVIRONMENT
      ? `http://localhost:${process.env.PORT || 3000}` // Same container in Railway
      : 'http://localhost:3000';

    const listingResponse = await fetch(`${apiUrl}/api/marketplace/listings`);
    const { listings } = await listingResponse.json();

    const listing = listings.find((l: any) => l.listingId === listingId);

    if (!listing || listing.status !== 'active') {
      return res.status(404).send(generate404Page());
    }

    // Generate beautiful landing page HTML
    const html = generateProductLandingPage(listing);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error loading product page:', error);
    res.status(500).send(generate404Page());
  }
});

/**
 * POST /product/:listingId/checkout
 * Create Stripe checkout session for direct payment
 */
router.post('/product/:listingId/checkout', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  try {
    // Fetch listing (use Railway internal URL or fallback to localhost for dev)
    const apiUrl = process.env.RAILWAY_ENVIRONMENT
      ? `http://localhost:${process.env.PORT || 3000}` // Same container in Railway
      : 'http://localhost:3000';

    const listingResponse = await fetch(`${apiUrl}/api/marketplace/listings`);
    const { listings } = await listingResponse.json();
    const listing = listings.find((l: any) => l.listingId === listingId);

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing not configured' });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: listing.productTitle,
              description: listing.productDescription,
              images: listing.productImages.length > 0 ? listing.productImages : undefined,
            },
            unit_amount: Math.round(listing.marketplacePrice * 100), // Convert to cents
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
    });

    res.json({ checkoutUrl: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * GET /product/:listingId/success
 * Order success page after payment
 */
router.get('/product/:listingId/success', async (req: Request, res: Response) => {
  const { listingId } = req.params;
  const { session_id } = req.query;

  try {
    if (!stripe || !session_id) {
      return res.status(400).send(generate404Page());
    }

    // Verify session
    const session = await stripe.checkout.sessions.retrieve(session_id as string);

    if (session.payment_status === 'paid') {
      // TODO: Trigger automatic supplier purchase here
      // This would call the marketplace checkout endpoint to fulfill the order

      const html = generateSuccessPage(session);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      res.status(400).send(generate404Page());
    }
  } catch (error) {
    console.error('Success page error:', error);
    res.status(500).send(generate404Page());
  }
});

/**
 * Generate beautiful product landing page HTML
 */
function generateProductLandingPage(listing: any): string {
  const imageUrl = listing.productImages[0] || 'https://via.placeholder.com/600x600?text=Product+Image';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${listing.productTitle}</title>
    <meta name="description" content="${listing.productDescription}">

    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${listing.productTitle}">
    <meta property="og:description" content="${listing.productDescription}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:type" content="product">

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            width: 100%;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }

        @media (max-width: 768px) {
            .container {
                grid-template-columns: 1fr;
            }
        }

        .image-section {
            background: #f8f9fa;
            padding: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .image-section img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
        }

        .info-section {
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        h1 {
            font-size: 28px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 16px;
            line-height: 1.3;
        }

        .price {
            font-size: 36px;
            font-weight: 800;
            color: #667eea;
            margin-bottom: 20px;
        }

        .description {
            font-size: 16px;
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 30px;
        }

        .features {
            list-style: none;
            margin-bottom: 30px;
        }

        .features li {
            padding: 8px 0;
            color: #2d3748;
            font-size: 15px;
        }

        .features li:before {
            content: "✓ ";
            color: #48bb78;
            font-weight: bold;
            margin-right: 8px;
        }

        .buy-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 18px 40px;
            font-size: 18px;
            font-weight: 600;
            border-radius: 10px;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            width: 100%;
        }

        .buy-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }

        .buy-button:active {
            transform: translateY(0);
        }

        .guarantee {
            margin-top: 20px;
            padding: 16px;
            background: #f7fafc;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            color: #4a5568;
        }

        .badge {
            display: inline-block;
            background: #48bb78;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="image-section">
            <img src="${imageUrl}" alt="${listing.productTitle}">
        </div>

        <div class="info-section">
            <span class="badge">⚡ Limited Offer</span>
            <h1>${listing.productTitle}</h1>
            <div class="price">$${listing.marketplacePrice.toFixed(2)}</div>

            <p class="description">${listing.productDescription}</p>

            <ul class="features">
                <li>Free Fast Shipping</li>
                <li>30-Day Money-Back Guarantee</li>
                <li>Secure Payment Processing</li>
                <li>Ships Within 1-2 Business Days</li>
            </ul>

            <button class="buy-button" onclick="checkout()">
                🛒 Buy Now - Secure Checkout
            </button>

            <div class="guarantee">
                🔒 Secure payment powered by Stripe<br>
                💯 100% satisfaction guaranteed
            </div>
        </div>
    </div>

    <script>
        async function checkout() {
            const button = document.querySelector('.buy-button');
            button.textContent = 'Processing...';
            button.disabled = true;

            try {
                const response = await fetch('/product/${listing.listingId}/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const { checkoutUrl } = await response.json();
                window.location.href = checkoutUrl;
            } catch (error) {
                alert('Error processing checkout. Please try again.');
                button.textContent = '🛒 Buy Now - Secure Checkout';
                button.disabled = false;
            }
        }
    </script>
</body>
</html>
  `;
}

/**
 * Generate success page after payment
 */
function generateSuccessPage(session: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmed!</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .success-container {
            max-width: 600px;
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .checkmark {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 32px;
            color: #1a202c;
            margin-bottom: 16px;
        }
        p {
            font-size: 18px;
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .order-id {
            background: #f7fafc;
            padding: 16px;
            border-radius: 8px;
            font-family: monospace;
            margin-bottom: 30px;
        }
        .info-box {
            background: #ebf8ff;
            border-left: 4px solid #4299e1;
            padding: 20px;
            text-align: left;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        .info-box strong {
            display: block;
            margin-bottom: 8px;
            color: #2c5282;
        }
    </style>
</head>
<body>
    <div class="success-container">
        <div class="checkmark">✅</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase. Your order has been confirmed and will be shipped soon.</p>

        <div class="order-id">
            Order ID: ${session.id}
        </div>

        <div class="info-box">
            <strong>📧 Confirmation Email</strong>
            A confirmation email has been sent to ${session.customer_details?.email || 'your email'}
        </div>

        <div class="info-box">
            <strong>🚚 Shipping</strong>
            Your order will be shipped within 1-2 business days. You'll receive tracking information via email.
        </div>

        <div class="info-box">
            <strong>💳 Payment</strong>
            Charged: $${(session.amount_total! / 100).toFixed(2)}
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * Generate 404 page
 */
function generate404Page(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f7fafc;
            text-align: center;
            padding: 20px;
        }
        h1 { font-size: 48px; color: #2d3748; margin-bottom: 16px; }
        p { font-size: 18px; color: #718096; }
    </style>
</head>
<body>
    <div>
        <h1>404</h1>
        <p>Product not found or no longer available</p>
    </div>
</body>
</html>
  `;
}

export default router;
