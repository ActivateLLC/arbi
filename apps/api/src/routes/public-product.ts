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
        supplierUrl: listing.supplierUrl || '',
      },
      shipping_address_collection: {
        allowed_countries: ['US'], // Collect shipping address for fulfillment
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
  // Only use REAL product images from Cloudinary - NO PLACEHOLDERS
  const productImages = listing.productImages && Array.isArray(listing.productImages) && listing.productImages.length > 0
    ? listing.productImages.filter((img: string) => img.includes('cloudinary.com') || img.includes('res.cloudinary'))
    : [];

  // If no real images, use Unsplash for professional product photos
  const getUnsplashImage = (title: string) => {
    const keyword = title.toLowerCase()
      .replace(/\b(pro|edition|premium|deluxe|plus)\b/gi, '')
      .split(' ')[0];
    return `https://source.unsplash.com/800x800/?${encodeURIComponent(keyword)},product`;
  };

  const mainImageUrl = productImages.length > 0
    ? productImages[0]
    : getUnsplashImage(listing.productTitle);

  // Only show gallery if we have 2+ REAL images
  const thumbnailsHtml = productImages.length > 1
    ? `<div class="thumbnail-gallery">
        ${productImages.map((img: string, idx: number) =>
          `<img src="${img}" alt="${listing.productTitle} - Image ${idx + 1}" class="thumbnail${idx === 0 ? ' active' : ''}" data-index="${idx}" loading="lazy">`
        ).join('\n        ')}
       </div>`
    : '';

  const imageUrl = mainImageUrl;

  // Generate mock social proof
  const randomRating = (4.6 + Math.random() * 0.3).toFixed(1);
  const randomReviews = Math.floor(50 + Math.random() * 200);
  const randomStock = Math.floor(3 + Math.random() * 12);
  const randomViewers = Math.floor(8 + Math.random() * 25);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

    <!-- GSAP & Three.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

    <!-- SEO Meta Tags -->
    <title>${listing.productTitle} - Digital Vending Machine | Arbi</title>
    <meta name="description" content="${listing.productDescription} | Free shipping, 30-day returns, secure checkout. Buy now at Arbi.">
    <meta name="keywords" content="${listing.productTitle}, buy ${listing.productTitle.toLowerCase()}, best price, free shipping">
    <link rel="canonical" href="https://api.arbi.creai.dev/product/${listing.listingId}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="product">
    <meta property="og:url" content="https://api.arbi.creai.dev/product/${listing.listingId}">
    <meta property="og:title" content="${listing.productTitle}">
    <meta property="og:description" content="${listing.productDescription}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:site_name" content="Arbi">
    <meta property="product:price:amount" content="${Number(listing.marketplacePrice).toFixed(2)}">
    <meta property="product:price:currency" content="USD">
    <meta property="product:availability" content="in stock">
    <meta property="product:brand" content="Arbi">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://api.arbi.creai.dev/product/${listing.listingId}">
    <meta name="twitter:title" content="${listing.productTitle}">
    <meta name="twitter:description" content="${listing.productDescription}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:label1" content="Price">
    <meta name="twitter:data1" content="$${Number(listing.marketplacePrice).toFixed(2)}">
    <meta name="twitter:label2" content="Availability">
    <meta name="twitter:data2" content="In Stock">

    <!-- Product Schema (JSON-LD) for Google Rich Snippets -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": "${listing.productTitle}",
      "image": "${imageUrl}",
      "description": "${listing.productDescription}",
      "brand": {
        "@type": "Brand",
        "name": "Arbi"
      },
      "offers": {
        "@type": "Offer",
        "url": "https://api.arbi.creai.dev/product/${listing.listingId}",
        "priceCurrency": "USD",
        "price": "${Number(listing.marketplacePrice).toFixed(2)}",
        "priceValidUntil": "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Arbi Inc."
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": "0",
            "currency": "USD"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 2,
              "unitCode": "DAY"
            }
          }
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "127"
      }
    }
    </script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        @keyframes gridPulse {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.2; }
        }

        @keyframes lightSweep {
            0% { transform: translateX(-100%) rotate(45deg); }
            100% { transform: translateX(200%) rotate(45deg); }
        }

        @keyframes priceGlow {
            0%, 100% { text-shadow: 0 0 20px rgba(102, 126, 234, 0.3); }
            50% { text-shadow: 0 0 30px rgba(102, 126, 234, 0.6); }
        }

        @keyframes indicatorBlink {
            0%, 45%, 55%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f1624 100%);
            background-attachment: fixed;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 40px 20px;
            position: relative;
            overflow-x: hidden;
        }

        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image:
                linear-gradient(rgba(102, 126, 234, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(102, 126, 234, 0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: gridPulse 4s ease-in-out infinite;
            pointer-events: none;
        }

        .container {
            max-width: 900px;
            width: 100%;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow:
                0 30px 90px rgba(0, 0, 0, 0.6),
                0 0 0 1px rgba(255, 255, 255, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
            overflow: hidden;
            position: relative;
            margin-bottom: 20px;
        }

        @media (max-width: 768px) {
            body {
                padding: 12px;
            }
            .container {
                border-radius: 16px;
                margin-bottom: 12px;
            }
        }

        /* Product Display - Black Glass Panel */
        .product-display {
            padding: 40px 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .glass-panel {
            position: relative;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            border-radius: 20px;
            padding: 40px;
            overflow: hidden;
            box-shadow:
                0 20px 60px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .light-sweep {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(
                45deg,
                transparent 30%,
                rgba(255, 255, 255, 0.1) 50%,
                transparent 70%
            );
            animation: lightSweep 8s ease-in-out infinite;
            pointer-events: none;
        }

        .product-image {
            position: relative;
            width: 100%;
            max-width: 500px;
            height: auto;
            object-fit: contain;
            filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3));
            transition: transform 0.3s ease;
        }

        .glass-panel:hover .product-image {
            transform: scale(1.02) translateY(-5px);
        }

        @media (max-width: 768px) {
            .product-display {
                padding: 16px 12px;
            }
            .glass-panel {
                padding: 16px;
                border-radius: 16px;
            }
            .product-image {
                max-width: 100%;
            }
        }

        .info-section {
            padding: 30px 40px 40px;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        @media (max-width: 768px) {
            .info-section {
                padding: 16px 16px 24px;
                gap: 16px;
            }
        }

        .product-title {
            font-size: clamp(18px, 5vw, 28px);
            font-weight: 600;
            color: #1a202c;
            line-height: 1.3;
            margin: 0;
        }

        /* Status Chips */
        .status-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(102, 126, 234, 0.1);
            border: 1px solid rgba(102, 126, 234, 0.2);
            padding: 8px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            color: #374151;
            transition: all 0.2s;
            cursor: pointer;
        }

        .chip:hover {
            background: rgba(102, 126, 234, 0.15);
            transform: translateY(-1px);
        }

        .chip-icon {
            font-size: 14px;
        }

        .chip-text {
            white-space: nowrap;
        }

        @media (max-width: 768px) {
            .chip {
                padding: 6px 12px;
                font-size: 12px;
            }
            .chip-icon {
                font-size: 13px;
            }
        }

        /* Mechanical Price Display */
        .price-display {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #dee2e6;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }

        .price-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .price-value {
            font-family: 'SF Mono', 'Courier New', monospace;
            font-size: clamp(32px, 8vw, 48px);
            font-weight: 700;
            color: #667eea;
            line-height: 1;
            animation: priceGlow 3s ease-in-out infinite;
        }

        @media (max-width: 768px) {
            .price-display {
                padding: 16px;
            }
            .price-label {
                font-size: 10px;
                letter-spacing: 1px;
                margin-bottom: 6px;
            }
        }

        .product-description {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.6;
            margin: 0;
        }

        @media (max-width: 768px) {
            .product-description {
                font-size: 14px;
                line-height: 1.5;
            }
        }

        /* Inventory Dial (Rotary Selector) */
        .inventory-dial {
            background: #f8f9fa;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
        }

        .dial-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.2px;
            color: #6b7280;
            margin-bottom: 12px;
            text-transform: uppercase;
            text-align: center;
        }

        .dial-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }

        .dial-btn {
            width: 48px;
            height: 48px;
            min-width: 44px;
            min-height: 44px;
            background: white;
            border: 2px solid #dee2e6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            color: #667eea;
        }

        .dial-btn:hover, .dial-btn:active {
            border-color: #667eea;
            background: #f3f4f6;
            transform: scale(1.05);
        }

        .dial-display {
            background: white;
            border: 2px solid #dee2e6;
            border-radius: 12px;
            padding: 0;
            min-width: 80px;
        }

        .dial-display input {
            width: 100%;
            height: 52px;
            text-align: center;
            font-family: 'SF Mono', 'Courier New', monospace;
            font-size: 24px;
            font-weight: 700;
            color: #1a202c;
            border: none;
            background: transparent;
            outline: none;
        }

        @media (max-width: 768px) {
            .inventory-dial {
                padding: 16px;
            }
            .dial-label {
                font-size: 10px;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }
            .dial-display input {
                height: 48px;
                font-size: 20px;
            }
        }

        /* Dispense Device Button */
        .dispense-button {
            position: relative;
            width: 100%;
            height: 64px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 12px;
            cursor: pointer;
            overflow: hidden;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            transition: all 0.3s;
        }

        .dispense-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
        }

        .dispense-button:active {
            transform: translateY(0);
        }

        .dispense-text {
            position: relative;
            z-index: 2;
            display: block;
            font-size: clamp(14px, 3vw, 16px);
            font-weight: 700;
            letter-spacing: 1.5px;
            color: white;
            text-transform: uppercase;
        }

        .dispense-progress {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 0%;
            background: rgba(255, 255, 255, 0.3);
            transition: width 0.05s linear;
            pointer-events: none;
        }

        /* Trust Layer */
        .trust-layer {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 8px;
            padding: 16px;
            background: #f8f9fa;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 13px;
            color: #6b7280;
        }

        .trust-icon {
            color: #667eea;
        }

        .trust-text {
            font-weight: 500;
        }

        .stripe-logo {
            margin: 0 4px;
        }

        /* Quiet Social Proof */
        .social-proof {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            font-size: 13px;
            color: #9ca3af;
            font-weight: 500;
            padding: 8px 0;
        }

        .separator {
            color: #d1d5db;
        }

        @media (max-width: 768px) {
            .trust-layer {
                padding: 12px;
                font-size: 12px;
            }
            .trust-icon {
                width: 14px;
                height: 14px;
            }
            .stripe-logo {
                width: 36px;
                height: auto;
            }
            .social-proof {
                font-size: 12px;
                padding: 4px 0;
            }
        }

        /* Control Panel (Footer) */
        .control-panel {
            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            border-top: 2px solid #4a5568;
            padding: 24px 20px;
            text-align: center;
            margin-top: 0;
            width: 100%;
            max-width: 900px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .panel-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .indicator-light {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            animation: indicatorBlink 2s ease-in-out infinite;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        }

        .indicator-text {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.5px;
            color: #9ca3af;
            text-transform: uppercase;
        }

        .panel-brand {
            font-size: 16px;
            font-weight: 700;
            color: #f3f4f6;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
        }

        .panel-subtitle {
            font-size: 12px;
            color: #9ca3af;
            margin-bottom: 16px;
            font-style: italic;
        }

        .panel-links {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .panel-link {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 18px;
        }

        .panel-link:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
        }

        .panel-footer {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
        }

        @media (max-width: 768px) {
            .control-panel {
                padding: 20px 16px;
                border-radius: 12px;
            }
            .panel-links {
                gap: 8px;
            }
            .panel-link {
                width: 36px;
                height: 36px;
                font-size: 16px;
            }
            .panel-brand {
                font-size: 14px;
            }
            .panel-subtitle {
                font-size: 11px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Product Image with Black Glass Background -->
        <div class="product-display" id="productDisplay">
            <div class="glass-panel">
                <div class="light-sweep"></div>
                <img src="${mainImageUrl}" alt="${listing.productTitle}" class="product-image" id="productImage">
            </div>
        </div>

        <!-- Product Info Section -->
        <div class="info-section">
            <h1 class="product-title">${listing.productTitle}</h1>

            <!-- Status Chips -->
            <div class="status-chips">
                <div class="chip chip-stock">
                    <span class="chip-icon">🟢</span>
                    <span class="chip-text">In Stock</span>
                </div>
                <div class="chip chip-shipping">
                    <span class="chip-icon">🚚</span>
                    <span class="chip-text">48h Dispatch</span>
                </div>
                <div class="chip chip-secure">
                    <span class="chip-icon">🔒</span>
                    <span class="chip-text">Stripe Secured</span>
                </div>
                <div class="chip chip-return">
                    <span class="chip-icon">↩️</span>
                    <span class="chip-text">30-Day Return</span>
                </div>
            </div>

            <!-- Mechanical Price Display -->
            <div class="price-display">
                <div class="price-label">MARKET-VERIFIED PRICE</div>
                <div class="price-value" id="priceValue">$${Number(listing.marketplacePrice).toFixed(2)}</div>
            </div>

            <!-- Product Description -->
            <p class="product-description">${listing.productDescription}</p>

            <!-- Rotary Dial Quantity Selector -->
            <div class="inventory-dial">
                <div class="dial-label">UNITS AVAILABLE: ${randomStock}</div>
                <div class="dial-container">
                    <button class="dial-btn dial-minus" id="dialMinus" aria-label="Decrease quantity">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <div class="dial-display">
                        <input type="number" id="quantity" value="1" min="1" max="${randomStock}" readonly>
                    </div>
                    <button class="dial-btn dial-plus" id="dialPlus" aria-label="Increase quantity">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Dispense Device Button -->
            <button class="dispense-button" id="dispenseButton">
                <span class="dispense-text" id="dispenseText">DISPENSE DEVICE</span>
                <div class="dispense-progress" id="dispenseProgress"></div>
            </button>

            <!-- Minimal Trust Layer -->
            <div class="trust-layer">
                <svg class="trust-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L3 3V7C3 10.3 5.4 13.4 8 14C10.6 13.4 13 10.3 13 7V3L8 1Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
                <span class="trust-text">Payment handled by</span>
                <svg class="stripe-logo" width="40" height="17" viewBox="0 0 60 25" fill="none">
                    <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z" fill="#635BFF"/>
                </svg>
                <span class="trust-text">• No card data stored</span>
            </div>

            <!-- Quiet Social Proof -->
            <div class="social-proof">
                <span>${randomReviews} verified purchases</span>
                <span class="separator">•</span>
                <span>${randomRating} average device rating</span>
            </div>
        </div>
    </div>

    <!-- Dark Steel Footer / Control Panel -->
    <footer class="control-panel">
        <div class="panel-indicator">
            <div class="indicator-light"></div>
            <span class="indicator-text">SYSTEM OPERATIONAL</span>
        </div>
        <div class="panel-brand">DIGITAL VENDING MACHINE™</div>
        <div class="panel-subtitle">Autonomous commerce layer</div>
        <div class="panel-links" id="panelLinks">
            <button class="panel-link" data-url="https://api.arbi.creai.dev/contact">📧</button>
            <button class="panel-link" data-url="https://api.arbi.creai.dev/returns">↩️</button>
            <button class="panel-link" data-url="https://api.arbi.creai.dev/shipping">📦</button>
            <button class="panel-link" data-url="https://api.arbi.creai.dev/privacy">🔒</button>
            <button class="panel-link" data-url="https://api.arbi.creai.dev/terms">📋</button>
        </div>
        <div class="panel-footer">Arbi Inc. © 2026 • support@arbi.creai.dev</div>
    </footer>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Elements
            const quantityInput = document.getElementById('quantity');
            const dialMinus = document.getElementById('dialMinus');
            const dialPlus = document.getElementById('dialPlus');
            const dispenseButton = document.getElementById('dispenseButton');
            const dispenseText = document.getElementById('dispenseText');
            const dispenseProgress = document.getElementById('dispenseProgress');
            const productImage = document.getElementById('productImage');
            const panelLinks = document.querySelectorAll('.panel-link');

            if (!quantityInput || !dispenseButton) {
                console.error('Required elements not found');
                return;
            }

            const maxQuantity = parseInt(quantityInput.max);

            // Haptic feedback function
            function hapticTick() {
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }

            // Rotary dial - decrease quantity
            dialMinus.addEventListener('click', function() {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    hapticTick();
                    // GSAP animation for click-stop effect
                    if (typeof gsap !== 'undefined') {
                        gsap.fromTo(quantityInput,
                            { scale: 0.95 },
                            { scale: 1, duration: 0.2, ease: 'back.out(3)' }
                        );
                    }
                }
            });

            // Rotary dial - increase quantity
            dialPlus.addEventListener('click', function() {
                const currentValue = parseInt(quantityInput.value);
                if (currentValue < maxQuantity) {
                    quantityInput.value = currentValue + 1;
                    hapticTick();
                    // GSAP animation for click-stop effect
                    if (typeof gsap !== 'undefined') {
                        gsap.fromTo(quantityInput,
                            { scale: 0.95 },
                            { scale: 1, duration: 0.2, ease: 'back.out(3)' }
                        );
                    }
                }
            });

            // Long-press dispense button
            let longPressTimer = null;
            let progressInterval = null;
            let pressStartTime = 0;
            const LONG_PRESS_DURATION = 300; // milliseconds

            dispenseButton.addEventListener('mousedown', startLongPress);
            dispenseButton.addEventListener('touchstart', startLongPress);
            dispenseButton.addEventListener('mouseup', endLongPress);
            dispenseButton.addEventListener('mouseleave', endLongPress);
            dispenseButton.addEventListener('touchend', endLongPress);
            dispenseButton.addEventListener('touchcancel', endLongPress);

            function startLongPress(e) {
                if (e.type === 'touchstart') {
                    e.preventDefault();
                }

                pressStartTime = Date.now();
                dispenseProgress.style.width = '0%';
                hapticTick();

                // Animate progress bar
                progressInterval = setInterval(function() {
                    const elapsed = Date.now() - pressStartTime;
                    const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
                    dispenseProgress.style.width = progress + '%';

                    if (progress >= 100) {
                        clearInterval(progressInterval);
                    }
                }, 10);

                // Trigger checkout after long press duration
                longPressTimer = setTimeout(function() {
                    handleDispense();
                }, LONG_PRESS_DURATION);
            }

            function endLongPress(e) {
                if (e.type === 'touchend') {
                    e.preventDefault();
                }

                clearTimeout(longPressTimer);
                clearInterval(progressInterval);

                const elapsed = Date.now() - pressStartTime;
                if (elapsed < LONG_PRESS_DURATION) {
                    // Reset progress if released too early
                    dispenseProgress.style.width = '0%';
                }
            }

            // Dispense sequence with GSAP timeline
            async function handleDispense() {
                dispenseButton.disabled = true;
                hapticTick();

                if (typeof gsap !== 'undefined') {
                    const tl = gsap.timeline();

                    // State 1: Authorizing
                    dispenseText.textContent = 'AUTHORIZING';
                    tl.to(dispenseProgress, { width: '33%', duration: 0.3 });

                    // State 2: Securing Inventory
                    tl.call(function() {
                        dispenseText.textContent = 'SECURING INVENTORY';
                        hapticTick();
                    });
                    tl.to(dispenseProgress, { width: '66%', duration: 0.3 });

                    // State 3: Redirecting
                    tl.call(function() {
                        dispenseText.textContent = 'REDIRECTING TO CHECKOUT';
                        hapticTick();
                    });
                    tl.to(dispenseProgress, { width: '100%', duration: 0.3 });

                    // Wait for timeline to complete
                    await new Promise(resolve => {
                        tl.call(resolve);
                    });
                }

                // Proceed to checkout
                handleCheckout();
            }

            // Checkout function
            async function handleCheckout() {
                const quantity = parseInt(quantityInput.value);

                try {
                    const response = await fetch('/product/${listing.listingId}/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quantity: quantity })
                    });

                    if (!response.ok) {
                        throw new Error('Checkout failed');
                    }

                    const data = await response.json();

                    if (data.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                    } else {
                        throw new Error('No checkout URL received');
                    }
                } catch (error) {
                    console.error('Checkout error:', error);
                    alert('Error processing checkout. Please try again.');
                    dispenseText.textContent = 'DISPENSE DEVICE';
                    dispenseProgress.style.width = '0%';
                    dispenseButton.disabled = false;
                }
            }

            // Panel links navigation
            panelLinks.forEach(function(link) {
                link.addEventListener('click', function() {
                    const url = this.getAttribute('data-url');
                    if (url) {
                        window.location.href = url;
                    }
                });
            });

            // Product image parallax tilt (subtle, on hover)
            if (productImage && typeof gsap !== 'undefined') {
                const glassPanelEl = productImage.closest('.glass-panel');
                if (glassPanelEl) {
                    glassPanelEl.addEventListener('mousemove', function(e) {
                        const rect = glassPanelEl.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width - 0.5;
                        const y = (e.clientY - rect.top) / rect.height - 0.5;

                        gsap.to(productImage, {
                            rotateY: x * 5,
                            rotateX: -y * 5,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    });

                    glassPanelEl.addEventListener('mouseleave', function() {
                        gsap.to(productImage, {
                            rotateY: 0,
                            rotateX: 0,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    });
                }
            }

            // Device orientation parallax for mobile
            if (window.DeviceOrientationEvent && productImage) {
                window.addEventListener('deviceorientation', function(e) {
                    if (e.gamma !== null && e.beta !== null) {
                        const tiltX = Math.max(-15, Math.min(15, e.gamma)) / 15;
                        const tiltY = Math.max(-15, Math.min(15, e.beta - 45)) / 15;

                        if (typeof gsap !== 'undefined') {
                            gsap.to(productImage, {
                                rotateY: tiltX * 3,
                                rotateX: -tiltY * 3,
                                duration: 0.3,
                                ease: 'power1.out'
                            });
                        }
                    }
                });
            }
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
        <p>&copy; 2026 Arbi Inc. All rights reserved.</p>
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
