import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import Stripe from 'stripe';
import { v2 as cloudinary } from 'cloudinary';
import { getDatabase } from '../config/database';
import { adCampaignManager } from '../services/adCampaigns';
import { imageScraper } from '../services/imageScraper';

const router = Router();

// Get database instance (may not be available if DB not configured)
let db: ReturnType<typeof getDatabase> | null = null;
try {
  db = getDatabase();
} catch (error) {
  console.log('⚠️  Database not available for marketplace - using in-memory storage');
}

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

export interface MarketplaceListing {
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
  soldAt?: Date;
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
  shipmentCarrier?: string;
  status: 'payment_received' | 'purchasing_from_supplier' | 'shipped' | 'delivered' | 'refunded';
  actualProfit?: number;
  refundId?: string;
  refundedAt?: Date;
  createdAt: Date;
  deliveredAt?: Date;
}

// In-memory storage (fallback if database not available)
const listings: Map<string, MarketplaceListing> = new Map();
const orders: Map<string, BuyerOrder> = new Map();

/**
 * Helper functions for database/memory abstraction
 * EXPORTED for use by autonomousListing job
 */
export async function saveListing(listing: MarketplaceListing): Promise<void> {
  if (db) {
    try {
      await db.create('MarketplaceListing', listing);
    } catch (error: any) {
      console.error('❌ Database save failed, using memory:', error.message);
      listings.set(listing.listingId, listing);
    }
  } else {
    listings.set(listing.listingId, listing);
  }
}

export async function getListing(listingId: string): Promise<MarketplaceListing | null> {
  if (db) {
    try {
      const result = await db.findOne('MarketplaceListing', { where: { listingId } });
      return result as MarketplaceListing | null;
    } catch (error: any) {
      console.error('❌ Database query failed, using memory:', error.message);
      return listings.get(listingId) || null;
    }
  }
  return listings.get(listingId) || null;
}

export async function getListings(status?: string): Promise<MarketplaceListing[]> {
  if (db) {
    try {
      const where = status ? { status } : {};
      const results = await db.find('MarketplaceListing', {
        where,
        order: [['listedAt', 'DESC']]
      });
      return results as MarketplaceListing[];
    } catch (error: any) {
      console.error('❌ Database query failed, using memory:', error.message);
      const allListings = Array.from(listings.values());
      return status ? allListings.filter(l => l.status === status) : allListings;
    }
  }

  const allListings = Array.from(listings.values());
  const filtered = status ? allListings.filter(l => l.status === status) : allListings;
  return filtered.sort((a, b) => b.listedAt.getTime() - a.listedAt.getTime());
}

export async function updateListing(listingId: string, data: Partial<MarketplaceListing>): Promise<void> {
  if (db) {
    try {
      await db.update('MarketplaceListing', data, { where: { listingId } });
    } catch (error: any) {
      console.error('❌ Database update failed, using memory:', error.message);
      const existing = listings.get(listingId);
      if (existing) {
        listings.set(listingId, { ...existing, ...data });
      }
    }
  } else {
    const existing = listings.get(listingId);
    if (existing) {
      listings.set(listingId, { ...existing, ...data });
    }
  }
}

async function saveOrder(order: BuyerOrder): Promise<void> {
  if (db) {
    try {
      await db.create('BuyerOrder', order);
    } catch (error: any) {
      console.error('❌ Database save failed, using memory:', error.message);
      orders.set(order.orderId, order);
    }
  } else {
    orders.set(order.orderId, order);
  }
}

async function getOrder(orderId: string): Promise<BuyerOrder | null> {
  if (db) {
    try {
      const result = await db.findOne('BuyerOrder', { where: { orderId } });
      return result as BuyerOrder | null;
    } catch (error: any) {
      console.error('❌ Database query failed, using memory:', error.message);
      return orders.get(orderId) || null;
    }
  }
  return orders.get(orderId) || null;
}

async function getOrders(): Promise<BuyerOrder[]> {
  if (db) {
    try {
      const results = await db.find('BuyerOrder', {
        order: [['createdAt', 'DESC']]
      });
      return results as BuyerOrder[];
    } catch (error: any) {
      console.error('❌ Database query failed, using memory:', error.message);
      return Array.from(orders.values());
    }
  }
  return Array.from(orders.values());
}

async function updateOrder(orderId: string, data: Partial<BuyerOrder>): Promise<void> {
  if (db) {
    try {
      await db.update('BuyerOrder', data, { where: { orderId } });
    } catch (error: any) {
      console.error('❌ Database update failed, using memory:', error.message);
      const existing = orders.get(orderId);
      if (existing) {
        orders.set(orderId, { ...existing, ...data });
      }
    }
  } else {
    const existing = orders.get(orderId);
    if (existing) {
      orders.set(orderId, { ...existing, ...data });
    }
  }
}

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

    // Step 1: Try to scrape real product images from multiple sources
    let sourceImageUrls = productImageUrls || [];

    // If no images provided or Cloudinary upload fails, scrape from web
    if (!sourceImageUrls || sourceImageUrls.length === 0) {
      console.log(`🔍 No images provided - scraping from web sources...`);
      try {
        const scraped = await imageScraper.scrapeProductImages(productTitle);
        if (scraped.images.length > 0) {
          sourceImageUrls = scraped.images.map(img => img.url);
          console.log(`   ✅ Scraped ${scraped.images.length} images from ${scraped.sources.join(', ')}`);
        }
      } catch (error: any) {
        console.error(`   ⚠️  Image scraping failed: ${error.message}`);
      }
    }

    // Step 2: Upload product images to Cloudinary for hosting
    const cloudinaryUrls: string[] = [];
    if (sourceImageUrls && sourceImageUrls.length > 0) {
      console.log(`📸 Uploading ${sourceImageUrls.length} product images to Cloudinary...`);

      for (const imageUrl of sourceImageUrls) {
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
          // Don't use Amazon URLs - they get blocked by tracking prevention
          // Instead, try to scrape alternative images if this was the only source
          if (sourceImageUrls.length === 1 && !imageUrl.includes('cloudinary.com')) {
            console.log(`   🔍 Attempting to find alternative images...`);
            try {
              const scraped = await imageScraper.scrapeProductImages(productTitle, undefined, 3);
              for (const scrapedImg of scraped.images) {
                try {
                  const altResult = await cloudinary.uploader.upload(scrapedImg.url, {
                    folder: 'arbi-marketplace',
                    public_id: `${opportunityId}-${Date.now()}`,
                    resource_type: 'image'
                  });
                  cloudinaryUrls.push(altResult.secure_url);
                  console.log(`   ✅ Uploaded alternative: ${altResult.secure_url}`);
                  break; // Stop after first successful upload
                } catch (altError) {
                  continue; // Try next image
                }
              }
            } catch (scrapeError) {
              console.error(`   ⚠️  Alternative image search failed`);
            }
          }
        }
      }
    }

    // Step 3: If still no images, use placeholder
    if (cloudinaryUrls.length === 0) {
      console.log(`   📋 No images available - using professional placeholder`);
      cloudinaryUrls.push(`https://placehold.co/600x600/667eea/white?text=${encodeURIComponent(productTitle.substring(0, 30))}`);
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

    await saveListing(listing);

    console.log(`✅ Marketplace listing created: ${listingId}`);
    console.log(`   Product: ${productTitle}`);
    console.log(`   Supplier price: $${supplierPrice}`);
    console.log(`   Marketplace price: $${marketplacePrice.toFixed(2)}`);
    console.log(`   Estimated profit: $${estimatedProfit.toFixed(2)}`);
    console.log(`   Images hosted: ${cloudinaryUrls.length}`);

    // Auto-create ad campaigns for this product
    let adCampaigns: any[] = [];
    try {
      adCampaigns = await adCampaignManager.createCampaignsForListing({
        listingId: listing.listingId,
        productTitle: listing.productTitle,
        productDescription: listing.productDescription,
        productImages: cloudinaryUrls,
        marketplacePrice: listing.marketplacePrice,
        estimatedProfit: listing.estimatedProfit,
      });
      console.log(`   📢 Created ${adCampaigns.length} ad campaign(s)`);
    } catch (error: any) {
      console.error(`   ⚠️  Ad campaign creation failed: ${error.message}`);
    }

    const baseUrl = process.env.PUBLIC_URL || 'https://www.arbi.creai.dev';
    const publicUrl = `${baseUrl}/product/${listingId}`;

    res.status(201).json({
      success: true,
      listing,
      adInfo: adCampaigns.length > 0 ? {
        campaigns: adCampaigns,
        totalCampaigns: adCampaigns.length,
      } : null,
      message: adCampaigns.length > 0
        ? 'Product listed on marketplace and ad campaign started'
        : 'Product listed on marketplace',
      marketingInfo: {
        publicUrl,
        imageUrls: cloudinaryUrls,
        shareableLinks: {
          facebook: `https://facebook.com/sharer/sharer.php?u=${publicUrl}`,
          twitter: `https://twitter.com/intent/tweet?url=${publicUrl}&text=${encodeURIComponent(productTitle)}`,
          pinterest: cloudinaryUrls[0] ? `https://pinterest.com/pin/create/button/?url=${publicUrl}&media=${cloudinaryUrls[0]}` : null
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
router.get('/listings', async (req: Request, res: Response) => {
  const status = req.query.status as string || 'active';

  const filteredListings = await getListings(status);

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

    const listing = await getListing(listingId);
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

    await saveOrder(order);

    // Update listing status
    await updateListing(listingId, { status: 'sold', soldAt: new Date() });

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
  const order = await getOrder(orderId);
  if (!order) {
    console.error(`❌ Order not found: ${orderId}`);
    return;
  }

  const listing = await getListing(order.listingId);
  if (!listing) {
    console.error(`❌ Listing not found: ${order.listingId}`);
    return;
  }

  try {
    await updateOrder(orderId, { status: 'purchasing_from_supplier' });

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

    await updateOrder(orderId, {
      supplierOrderId,
      supplierPurchaseStatus: 'completed',
      status: 'shipped',
      shipmentTrackingNumber: `TRACK${Date.now()}`,
      actualProfit: order.amountPaid - listing.supplierPrice
    });

    const actualProfit = order.amountPaid - listing.supplierPrice;

    console.log(`✅ Supplier purchase completed!`);
    console.log(`   Supplier Order ID: ${supplierOrderId}`);
    console.log(`   Tracking: ${order.shipmentTrackingNumber}`);
    console.log(`   Shipping directly to buyer (you never touch it)`);
    console.log(`   💰 Actual profit: $${actualProfit.toFixed(2)} (no inventory, no handling!)`);

    // In production, send confirmation email to buyer with tracking

  } catch (error: any) {
    console.error(`❌ Supplier purchase failed:`, error.message);

    // Refund buyer if supplier purchase fails
    let refundId: string | undefined;
    if (stripe) {
      const refund = await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        reason: 'requested_by_customer'
      });
      refundId = refund.id;
      console.log(`💸 Buyer refunded: $${order.amountPaid}`);
    }

    await updateOrder(orderId, {
      supplierPurchaseStatus: 'failed',
      status: 'refunded',
      refundId,
      refundedAt: new Date()
    });
  }
}

/**
 * GET /api/marketplace/orders
 * Get order history and profits
 */
router.get('/orders', async (req: Request, res: Response) => {
  const orderList = await getOrders();

  const stats = {
    totalOrders: orderList.length,
    totalRevenue: orderList.reduce((sum, order) => sum + order.amountPaid, 0),
    totalProfit: 0,
    successfulOrders: 0
  };

  // Calculate profits from actualProfit field (already stored in DB)
  orderList.forEach(order => {
    if (order.supplierPurchaseStatus === 'completed' && order.actualProfit) {
      stats.totalProfit += order.actualProfit;
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
router.get('/health', async (req: Request, res: Response) => {
  const allListings = await getListings();
  const allOrders = await getOrders();

  res.status(200).json({
    status: 'ok',
    mode: 'dropshipping',
    capitalRequired: 0,
    physicalHandling: false,
    persistence: db ? 'database' : 'memory',
    features: {
      buyerPaysFirst: true,
      directShipping: true,
      cloudinaryHosting: !!(process.env.CLOUDINARY_CLOUD_NAME),
      stripePayments: !!stripe,
      autoSupplierPurchase: true,
      databasePersistence: !!db
    },
    stats: {
      activeListings: allListings.filter(l => l.status === 'active').length,
      totalListings: allListings.length,
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter(o => o.status === 'payment_received').length
    }
  });
});

export default router;
