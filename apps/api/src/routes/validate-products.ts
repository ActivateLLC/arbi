/**
 * Product Validation Endpoint
 * Validates products before creating ad campaigns
 */

import { Router } from 'express';
import { productValidator } from '../services/productValidator';

const router = Router();

/**
 * POST /api/validate/products
 * Validate all products before ad campaign creation
 */
router.post('/products', async (req, res) => {
  try {
    console.log('🔍 Starting product validation...\n');

    // Get all active listings
    const { getListings } = require('./marketplace');
    const listings = await getListings('active');

    if (listings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No products available',
      });
    }

    // Validate all products
    const validation = await productValidator.validateAllProducts(listings);

    return res.json({
      success: true,
      message: 'Product validation complete',
      summary: {
        total: validation.totalProducts,
        valid: validation.validProducts,
        needsUpdate: validation.needsUpdate,
        shouldRemove: validation.shouldRemove,
      },
      recommendations: {
        readyForAds: validation.results
          .filter(r => r.recommendation === 'KEEP')
          .map(r => ({
            listingId: r.listingId,
            productTitle: r.productTitle,
          })),
        needsPriceUpdate: validation.results
          .filter(r => r.recommendation === 'UPDATE_PRICE')
          .map(r => ({
            listingId: r.listingId,
            productTitle: r.productTitle,
            issues: r.issues,
            currentPrice: r.currentPrice,
            originalPrice: r.originalPrice,
          })),
        shouldRemove: validation.results
          .filter(r => r.recommendation === 'REMOVE')
          .map(r => ({
            listingId: r.listingId,
            productTitle: r.productTitle,
            issues: r.issues,
          })),
      },
      fullResults: validation.results,
    });
  } catch (error: any) {
    console.error('❌ Product validation error:', error);

    return res.status(500).json({
      success: false,
      error: 'Product validation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/validate/single/:listingId
 * Validate a single product
 */
router.post('/single/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    console.log(`🔍 Validating product: ${listingId}\n`);

    // Get the listing
    const { getListing } = require('./marketplace');
    const listing = await getListing(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    // Validate
    const result = await productValidator.validateProduct(listing);

    return res.json({
      success: true,
      message: 'Product validation complete',
      result,
    });
  } catch (error: any) {
    console.error('❌ Product validation error:', error);

    return res.status(500).json({
      success: false,
      error: 'Product validation failed',
      message: error.message,
    });
  }
});

export default router;
