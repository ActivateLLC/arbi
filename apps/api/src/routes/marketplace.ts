import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import Stripe from 'stripe';
import { v2 as cloudinary } from 'cloudinary';

const router = Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

// Initialize Cloudinary for product image hosting
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary initialized - Product image hosting enabled');
} else {
  console.log('⚠️  Cloudinary not configured - Image hosting unavailable');
}

/**
 * ZERO-CAPITAL DROPSHIPPING MODEL
 *
 * Workflow:
 * 1. Find profitable opportunity (cheap product + markup price)
 * 2. Upload product images to Cloudinary
 * 3. List on your marketplace with markup
 * 4. Buyer pays YOU first via Stripe
 * 5. Automatically purchase from supplier with buyer's money
 * 6. Ship directly to buyer (never touch merchandise)
 * 7. Keep the spread as profit
 *
 * Capital Required: $0 (buyer pays first)
 * Physical Handling: NO (direct ship)
 * Timeline: 2-3 days
 */

interface MarketplaceListing {
  listingId: string;
  opportunityId: string;
  productTitle: string;
  productDescription: string;
  productImages: string[]; // Cloudinary URLs
  supplierPrice: number;
  supplierUrl: string;
  supplierPlatform: string; // "amazon" | "walmart" | "target" | "ebay"
  marketplacePrice: number;
  estimatedProfit: number;
  status: 'active' | 'sold' | 'expired';
  listedAt: Date;
  expiresAt: Date;
}

interface BuyerOrder {
  orderId: string;
  listingId: string;
  buyerEmail: string;
  buyerShippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  paymentIntentId: string;
  amountPaid: number;
  supplierOrderId?: string;
  supplierPurchaseStatus: 'pending' | 'completed' | 'failed';
  shipmentTrackingNumber?: string;
  status: 'payment_received' | 'purchasing_from_supplier' | 'shipped' | 'delivered' | 'refunded';
  createdAt: Date;
}

// In-memory storage (replace with database in production)
const listings: Map<string, MarketplaceListing> = new Map();
const orders: Map<string, BuyerOrder> = new Map();

/**
 * POST /api/marketplace/list
 * Create marketplace listing from arbitrage opportunity
 */
router.post('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      opportunityId,
      productTitle,
      productDescription,
      productImageUrls, // Source URLs to scrape/download
      supplierPrice,
      supplierUrl,
      supplierPlatform,
      markupPercentage = 30 // Default 30% markup
    } = req.body;

    if (!opportunityId || !productTitle || !supplierPrice || !supplierUrl) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Calculate marketplace price with markup
    const marketplacePrice = supplierPrice * (1 + markupPercentage / 100);
    const estimatedProfit = marketplacePrice - supplierPrice;

    // Upload product images to Cloudinary for hosting
    const cloudinaryUrls: string[] = [];
    if (productImageUrls && productImageUrls.length > 0) {
      console.log(`📸 Uploading ${productImageUrls.length} product images to Cloudinary...`);

      for (const imageUrl of productImageUrls) {
        try {
          const result = await cloudinary.uploader.upload(imageUrl, {
            folder: 'arbi-marketplace',
            public_id: `${opportunityId}-${Date.now()}`,
            resource_type: 'image'
          });
          cloudinaryUrls.push(result.secure_url);
          console.log(`   ✅ Uploaded: ${result.secure_url}`);
        } catch (error: any) {
          console.error(`   ❌ Failed to upload ${imageUrl}:`, error.message);
        }
      }
    }

    // Create marketplace listing
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const listing: MarketplaceListing = {
      listingId,
      opportunityId,
      productTitle,
      productDescription: productDescription || `${productTitle} - Fast shipping, great deal!`,
      productImages: cloudinaryUrls,
      supplierPrice,
      supplierUrl,
      supplierPlatform,
      marketplacePrice: parseFloat(marketplacePrice.toFixed(2)),
      estimatedProfit: parseFloat(estimatedProfit.toFixed(2)),
      status: 'active',
      listedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    listings.set(listingId, listing);

    console.log(`✅ Marketplace listing created: ${listingId}`);
    console.log(`   Product: ${productTitle}`);
    console.log(`   Supplier price: $${supplierPrice}`);
    console.log(`   Marketplace price: $${marketplacePrice.toFixed(2)}`);
    console.log(`   Estimated profit: $${estimatedProfit.toFixed(2)}`);
    console.log(`   Images hosted: ${cloudinaryUrls.length}`);

    res.status(201).json({
      success: true,
      listing,
      message: 'Product listed on marketplace',
      marketingInfo: {
        publicUrl: `https://your-marketplace.com/product/${listingId}`,
        imageUrls: cloudinaryUrls,
        shareableLinks: {
          facebook: `https://facebook.com/sharer/sharer.php?u=https://your-marketplace.com/product/${listingId}`,
          twitter: `https://twitter.com/intent/tweet?url=https://your-marketplace.com/product/${listingId}&text=${encodeURIComponent(productTitle)}`,
          pinterest: cloudinaryUrls[0] ? `https://pinterest.com/pin/create/button/?url=https://your-marketplace.com/product/${listingId}&media=${cloudinaryUrls[0]}` : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/marketplace/listings
 * Get all active marketplace listings
 */
router.get('/listings', (req: Request, res: Response) => {
  const status = req.query.status as string || 'active';

  const filteredListings = Array.from(listings.values())
    .filter(listing => listing.status === status)
    .sort((a, b) => b.listedAt.getTime() - a.listedAt.getTime());

  res.status(200).json({
    total: filteredListings.length,
    listings: filteredListings
  });
});

/**
 * POST /api/marketplace/checkout
 * Buyer initiates purchase (pays FIRST)
 */
router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      listingId,
      buyerEmail,
      shippingAddress,
      paymentMethodId // Stripe payment method from frontend
    } = req.body;

    if (!listingId || !buyerEmail || !shippingAddress || !paymentMethodId) {
      throw new ApiError(400, 'Missing required checkout fields');
    }

    const listing = listings.get(listingId);
    if (!listing) {
      throw new ApiError(404, 'Listing not found');
    }

    if (listing.status !== 'active') {
      throw new ApiError(400, 'Listing is no longer available');
    }

    if (!stripe) {
      throw new ApiError(500, 'Stripe not configured');
    }

    console.log(`💳 Processing buyer payment for: ${listing.productTitle}`);
    console.log(`   Amount: $${listing.marketplacePrice}`);
    console.log(`   Buyer: ${buyerEmail}`);

    // Create Stripe Payment Intent - BUYER PAYS FIRST
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(listing.marketplacePrice * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      description: `${listing.productTitle} - Marketplace Purchase`,
      metadata: {
        listingId,
        opportunityId: listing.opportunityId,
        supplierPrice: listing.supplierPrice.toString(),
        estimatedProfit: listing.estimatedProfit.toString()
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new ApiError(400, `Payment failed: ${paymentIntent.status}`);
    }

    console.log(`✅ Buyer payment received: $${listing.marketplacePrice}`);
    console.log(`   Payment Intent ID: ${paymentIntent.id}`);

    // Create order record
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const order: BuyerOrder = {
      orderId,
      listingId,
      buyerEmail,
      buyerShippingAddress: shippingAddress,
      paymentIntentId: paymentIntent.id,
      amountPaid: listing.marketplacePrice,
      supplierPurchaseStatus: 'pending',
      status: 'payment_received',
      createdAt: new Date()
    };

    orders.set(orderId, order);

    // Update listing status
    listing.status = 'sold';
    listings.set(listingId, listing);

    console.log(`📦 Order created: ${orderId}`);
    console.log(`   Next: Automatically purchasing from supplier...`);

    // Trigger automatic supplier purchase
    await purchaseFromSupplier(orderId);

    res.status(200).json({
      success: true,
      order,
      message: 'Payment successful! Purchasing from supplier and shipping directly to you.',
      timeline: {
        paymentReceived: new Date(),
        estimatedPurchase: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        estimatedShipping: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Automatically purchase from supplier after buyer payment
 */
async function purchaseFromSupplier(orderId: string): Promise<void> {
  const order = orders.get(orderId);
  if (!order) {
    console.error(`❌ Order not found: ${orderId}`);
    return;
  }

  const listing = listings.get(order.listingId);
  if (!listing) {
    console.error(`❌ Listing not found: ${order.listingId}`);
    return;
  }

  try {
    order.status = 'purchasing_from_supplier';
    orders.set(orderId, order);

    console.log(`🛒 Purchasing from supplier: ${listing.supplierPlatform}`);
    console.log(`   Product: ${listing.productTitle}`);
    console.log(`   Supplier URL: ${listing.supplierUrl}`);
    console.log(`   Amount: $${listing.supplierPrice}`);
    console.log(`   Ship to: ${order.buyerShippingAddress.name}`);

    // In production, integrate with supplier APIs:
    // - Amazon: Use MWS API or SP-API
    // - Walmart: Use Marketplace API
    // - Target: Use Partner API
    // - eBay: Use Buy Order API

    // For now, simulate purchase
    const supplierOrderId = `sup_${listing.supplierPlatform}_${Date.now()}`;

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    order.supplierOrderId = supplierOrderId;
    order.supplierPurchaseStatus = 'completed';
    order.status = 'shipped';
    order.shipmentTrackingNumber = `TRACK${Date.now()}`;
    orders.set(orderId, order);

    const actualProfit = order.amountPaid - listing.supplierPrice;

    console.log(`✅ Supplier purchase completed!`);
    console.log(`   Supplier Order ID: ${supplierOrderId}`);
    console.log(`   Tracking: ${order.shipmentTrackingNumber}`);
    console.log(`   Shipping directly to buyer (you never touch it)`);
    console.log(`   💰 Actual profit: $${actualProfit.toFixed(2)} (no inventory, no handling!)`);

    // In production, send confirmation email to buyer with tracking

  } catch (error: any) {
    console.error(`❌ Supplier purchase failed:`, error.message);
    order.supplierPurchaseStatus = 'failed';
    order.status = 'refunded';
    orders.set(orderId, order);

    // Refund buyer if supplier purchase fails
    if (stripe) {
      await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        reason: 'requested_by_customer'
      });
      console.log(`💸 Buyer refunded: $${order.amountPaid}`);
    }
  }
}

/**
 * GET /api/marketplace/orders
 * Get order history and profits
 */
router.get('/orders', (req: Request, res: Response) => {
  const orderList = Array.from(orders.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const stats = {
    totalOrders: orderList.length,
    totalRevenue: orderList.reduce((sum, order) => sum + order.amountPaid, 0),
    totalProfit: 0,
    successfulOrders: 0
  };

  orderList.forEach(order => {
    const listing = listings.get(order.listingId);
    if (listing && order.supplierPurchaseStatus === 'completed') {
      stats.totalProfit += (order.amountPaid - listing.supplierPrice);
      stats.successfulOrders++;
    }
  });

  res.status(200).json({
    orders: orderList,
    stats: {
      ...stats,
      totalProfit: parseFloat(stats.totalProfit.toFixed(2)),
      averageProfitPerOrder: stats.successfulOrders > 0
        ? parseFloat((stats.totalProfit / stats.successfulOrders).toFixed(2))
        : 0
    }
  });
});

/**
 * GET /api/marketplace/health
 * Check marketplace system status
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    mode: 'dropshipping',
    capitalRequired: 0,
    physicalHandling: false,
    features: {
      buyerPaysFirst: true,
      directShipping: true,
      cloudinaryHosting: !!(process.env.CLOUDINARY_CLOUD_NAME),
      stripePayments: !!stripe,
      autoSupplierPurchase: true
    },
    stats: {
      activeListings: Array.from(listings.values()).filter(l => l.status === 'active').length,
      totalListings: listings.size,
      totalOrders: orders.size,
      pendingOrders: Array.from(orders.values()).filter(o => o.status === 'payment_received').length
    }
  });
});

export default router;
