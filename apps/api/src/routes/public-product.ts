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
import { getListings } from './marketplace';

const router = Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

/**
 * DEBUG: Test endpoint to see what's in the database
 */
router.get('/product-debug/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;
  try {
    const listings = await getListings('active');
    const listing = listings.find((l: any) => l.listingId === listingId);

    res.json({
      requested: listingId,
      totalListings: listings.length,
      found: !!listing,
      allListingIds: listings.map((l: any) => l.listingId),
      listing: listing || null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * GET /product/:listingId
 * Public product landing page (HTML)
 */
router.get('/product/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;
  console.log(`\n🌐 Product page requested: ${listingId}`);

  try {
    console.log(`   Step 1: Calling getListings('active')...`);
    // Get listing directly from database (no HTTP fetch needed!)
    const listings = await getListings('active');
    console.log(`   Step 2: Retrieved ${listings.length} active listings`);

    if (listings.length > 0) {
      console.log(`   First listing ID: ${listings[0].listingId}`);
    }

    console.log(`   Step 3: Searching for listingId: ${listingId}`);
    const listing = listings.find((l: any) => l.listingId === listingId);
    console.log(`   Step 4: Found listing: ${listing ? 'YES' : 'NO'}`);

    if (listing) {
      console.log(`   Listing details: ${JSON.stringify({ listingId: listing.listingId, title: listing.productTitle, status: listing.status })}`);
    }

    if (!listing || listing.status !== 'active') {
      console.log(`   ❌ Listing not found or inactive - returning 404`);
      return res.status(404).send(generate404Page());
    }

    console.log(`   Step 5: Generating page for: ${listing.productTitle}`);
    // Generate beautiful landing page HTML
    const html = generateProductLandingPage(listing);
    console.log(`   Step 6: HTML generated successfully (${html.length} chars)`);

    res.setHeader('Content-Type', 'text/html');
    console.log(`   Step 7: Sending response...`);
    res.send(html);
    console.log(`   ✅ Page sent successfully`);
  } catch (error: any) {
    console.error('❌ Error loading product page:', error);
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);

    // If debug query param is present, return error details
    if (req.query.debug === 'true') {
      return res.status(500).json({
        error: error.message,
        stack: error.stack,
        listingId: req.params.listingId
      });
    }

    res.status(500).send(generate404Page());
  }
});

/**
 * POST /product/:listingId/checkout
 * Create Stripe checkout session for direct payment
 */
router.post('/product/:listingId/checkout', async (req: Request, res: Response) => {
  const { listingId } = req.params;
  const { quantity } = req.body;

  try {
    // Validate quantity
    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 99) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 99' });
    }

    // Get listing directly from database (no HTTP fetch needed!)
    const listings = await getListings('active');
    const listing = listings.find((l: any) => l.listingId === listingId);

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Payment processing not configured' });
    }

    // Calculate total profit for this order
    const totalProfit = Number(listing.estimatedProfit) * qty;

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
              images: listing.productImages.length > 0 ? listing.productImages : undefined,
            },
            unit_amount: Math.round(Number(listing.marketplacePrice) * 100), // Convert to cents
          },
          quantity: qty,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/product/${listingId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/product/${listingId}`,
      metadata: {
        listingId,
        opportunityId: listing.opportunityId,
        quantity: qty.toString(),
        supplierPrice: listing.supplierPrice.toString(),
        estimatedProfit: totalProfit.toString(),
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
  // Use Cloudinary images if available, otherwise use professional placeholder
  // Amazon images get blocked by browsers, so we avoid them
  let imageUrl = `https://placehold.co/600x600/667eea/white?text=${encodeURIComponent(listing.productTitle.substring(0, 30))}`;

  if (listing.productImages && listing.productImages[0]) {
    const img = listing.productImages[0];
    // Only use Cloudinary images - they work reliably
    if (img.includes('cloudinary.com') || img.includes('placehold.co')) {
      imageUrl = img;
    }
    // Skip Amazon images - they get blocked by tracking prevention
  }

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

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-FC0RSRE67D"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-FC0RSRE67D');
    </script>

    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>

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
            margin-bottom: 20px;
        }

        .quantity-selector {
            margin-bottom: 30px;
        }

        .quantity-selector label {
            display: block;
            font-size: 15px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
        }

        .quantity-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .qty-btn {
            width: 40px;
            height: 40px;
            border: 2px solid #e2e8f0;
            background: white;
            border-radius: 8px;
            font-size: 20px;
            font-weight: 600;
            color: #667eea;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .qty-btn:hover {
            border-color: #667eea;
            background: #f7fafc;
        }

        .qty-btn:active {
            transform: scale(0.95);
        }

        #quantity {
            width: 80px;
            height: 40px;
            text-align: center;
            font-size: 18px;
            font-weight: 600;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            color: #2d3748;
        }

        .features {
            list-style: none;
            margin-bottom: 30px;
        }

        .features li {
            padding: 8px 0;
            color: #2d3748;
            font-size: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .features li svg {
            width: 18px;
            height: 18px;
            color: #48bb78;
            flex-shrink: 0;
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
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .buy-button svg {
            width: 20px;
            height: 20px;
        }

        .buy-button [data-lucide="loader-2"] {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
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
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .guarantee-item {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .guarantee-item svg {
            width: 16px;
            height: 16px;
            color: #667eea;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #48bb78;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
        }

        .badge svg {
            width: 14px;
            height: 14px;
        }

        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 16px 20px;
            text-align: center;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .footer-links {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 10px;
        }

        .footer-links a {
            color: #667eea;
            font-size: 13px;
            text-decoration: none;
            font-weight: 500;
        }

        .footer-links a:hover {
            text-decoration: underline;
        }

        .footer p {
            margin: 4px 0;
            font-size: 13px;
            color: #4a5568;
        }

        .footer-company {
            font-weight: 600;
            color: #667eea;
            font-size: 14px;
        }

        @media (max-width: 768px) {
            .footer-links {
                gap: 10px;
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="image-section">
            <img src="${imageUrl}" alt="${listing.productTitle}">
        </div>

        <div class="info-section">
            <span class="badge"><i data-lucide="zap"></i> Limited Offer</span>
            <h1>${listing.productTitle}</h1>
            <div class="price">$${Number(listing.marketplacePrice).toFixed(2)}</div>

            <p class="description">${listing.productDescription}</p>

            <div class="quantity-selector">
                <label for="quantity">Quantity:</label>
                <div class="quantity-controls">
                    <button class="qty-btn" id="qty-minus">−</button>
                    <input type="number" id="quantity" name="quantity" value="1" min="1" max="99" readonly>
                    <button class="qty-btn" id="qty-plus">+</button>
                </div>
            </div>

            <ul class="features">
                <li><i data-lucide="truck"></i>Free Fast Shipping</li>
                <li><i data-lucide="shield-check"></i>30-Day Money-Back Guarantee</li>
                <li><i data-lucide="lock"></i>Secure Payment Processing</li>
                <li><i data-lucide="package"></i>Ships Within 1-2 Business Days</li>
            </ul>

            <button class="buy-button" id="checkout-button">
                <i data-lucide="shopping-cart"></i> Buy Now - Secure Checkout
            </button>

            <div class="guarantee">
                <div class="guarantee-item">
                    <i data-lucide="credit-card"></i> Secure payment powered by Stripe
                </div>
                <div class="guarantee-item">
                    <i data-lucide="badge-check"></i> 100% satisfaction guaranteed
                </div>
            </div>
        </div>
    </div>

    <footer class="footer">
        <div class="footer-links">
            <a href="https://api.arbi.creai.dev/contact">Contact</a>
            <a href="https://api.arbi.creai.dev/returns">Returns & Refunds</a>
            <a href="https://api.arbi.creai.dev/shipping">Shipping</a>
            <a href="https://api.arbi.creai.dev/privacy">Privacy Policy</a>
            <a href="https://api.arbi.creai.dev/terms">Terms of Service</a>
        </div>
        <p class="footer-company">Arbi Inc. - support@arbi.creai.dev</p>
        <p>&copy; 2025 Arbi Inc. All rights reserved.</p>
    </footer>

    <script>
        // Use addEventListener instead of inline onclick for CSP compatibility
        document.addEventListener('DOMContentLoaded', function() {
            // Wait for Lucide to load, then initialize icons
            function initIcons() {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                } else {
                    setTimeout(initIcons, 100);
                }
            }
            initIcons();

            const button = document.getElementById('checkout-button');
            const quantityInput = document.getElementById('quantity');
            const minusBtn = document.getElementById('qty-minus');
            const plusBtn = document.getElementById('qty-plus');

            if (!button || !quantityInput) {
                console.error('Required elements not found');
                return;
            }

            // Quantity controls
            minusBtn.addEventListener('click', function() {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                }
            });

            plusBtn.addEventListener('click', function() {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue < 99) {
                    quantityInput.value = currentValue + 1;
                }
            });

            // Checkout with quantity
            button.addEventListener('click', async function() {
                console.log('🛒 Checkout button clicked');
                const quantity = parseInt(quantityInput.value);
                console.log('📦 Quantity:', quantity);

                const originalHTML = button.innerHTML;
                button.innerHTML = '<i data-lucide="loader-2"></i> Processing...';
                lucide.createIcons(); // Re-init icons
                button.disabled = true;

                try {
                    console.log('📡 Sending checkout request...');
                    const response = await fetch('/product/${listing.listingId}/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quantity: quantity })
                    });

                    console.log('✅ Response received:', response.status);

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('❌ Checkout failed:', errorData);
                        throw new Error(errorData.error || 'Checkout failed');
                    }

                    const data = await response.json();
                    console.log('💳 Checkout data:', data);

                    if (data.checkoutUrl) {
                        console.log('🔗 Redirecting to:', data.checkoutUrl);
                        window.location.href = data.checkoutUrl;
                    } else {
                        console.error('❌ No checkout URL in response');
                        throw new Error('No checkout URL received');
                    }
                } catch (error) {
                    console.error('❌ Checkout error:', error);
                    alert('Error processing checkout: ' + error.message + '\n\nPlease try again or contact support.');
                    button.innerHTML = originalHTML;
                    lucide.createIcons(); // Re-init icons
                    button.disabled = false;
                }
            });
        });
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

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-FC0RSRE67D"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-FC0RSRE67D');

      // Track purchase conversion
      gtag('event', 'purchase', {
        transaction_id: '${session.id}',
        value: ${(session.amount_total! / 100).toFixed(2)},
        currency: 'USD',
        items: [{
          item_id: '${session.metadata?.listingId}',
          item_name: 'Product',
          price: ${(session.amount_total! / 100).toFixed(2)}
        }]
      });
    </script>

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

        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 16px 20px;
            text-align: center;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .footer-links {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 10px;
        }

        .footer-links a {
            color: #48bb78;
            font-size: 13px;
            text-decoration: none;
            font-weight: 500;
        }

        .footer-links a:hover {
            text-decoration: underline;
        }

        .footer p {
            margin: 4px 0;
            font-size: 13px;
            color: #4a5568;
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

    <footer class="footer">
        <div class="footer-links">
            <a href="https://api.arbi.creai.dev/contact">Contact</a>
            <a href="https://api.arbi.creai.dev/returns">Returns & Refunds</a>
            <a href="https://api.arbi.creai.dev/shipping">Shipping</a>
            <a href="https://api.arbi.creai.dev/privacy">Privacy Policy</a>
            <a href="https://api.arbi.creai.dev/terms">Terms of Service</a>
        </div>
        <p>&copy; 2025 Arbi Inc. All rights reserved.</p>
    </footer>
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
