/**
 * Test Asset Upload Endpoint
 * Test uploading campaign assets to Google Ads
 */

import { Router } from 'express';
import { googleAdsAssets } from '../services/googleAdsAssets';

const router = Router();

/**
 * POST /api/test/upload-assets
 * Test uploading assets for a single product
 */
router.post('/upload-assets', async (req, res) => {
  try {
    console.log('\n🧪 Testing Google Ads asset upload...\n');

    // Get a sample product
    const { getListings } = require('./marketplace');
    const listings = await getListings('active');

    if (listings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No products available',
      });
    }

    // Use first product as test
    const product = listings[0];

    console.log(`📦 Test product: ${product.productTitle}`);
    console.log(`   Images: ${product.productImages.length}`);
    console.log(`   Landing page: https://arbi.market/p/${product.listingId}\n`);

    // Upload assets
    const results = await googleAdsAssets.uploadDemandGenAssets({
      productTitle: product.productTitle,
      productDescription: product.productDescription,
      productImages: product.productImages.slice(0, 5), // Test with 5 images
      landingPageUrl: `https://arbi.market/p/${product.listingId}`,
      businessName: 'Arbi Market',
    });

    return res.json({
      success: results.success,
      message: 'Asset upload test complete',
      product: {
        title: product.productTitle,
        listingId: product.listingId,
      },
      results: {
        images: {
          total: results.images.length,
          successful: results.images.filter(r => r.success).length,
          failed: results.images.filter(r => !r.success).length,
          assets: results.images,
        },
        videos: {
          total: results.videos.length,
          successful: results.videos.filter(r => r.success).length,
          failed: results.videos.filter(r => !r.success).length,
          assets: results.videos,
        },
        headlines: {
          total: results.headlines.length,
          successful: results.headlines.filter(r => r.success).length,
          failed: results.headlines.filter(r => !r.success).length,
          assets: results.headlines,
        },
        descriptions: {
          total: results.descriptions.length,
          successful: results.descriptions.filter(r => r.success).length,
          failed: results.descriptions.filter(r => !r.success).length,
          assets: results.descriptions,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Asset upload test error:', error);

    return res.status(500).json({
      success: false,
      error: 'Asset upload test failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/test/upload-all-assets
 * Upload assets for ALL products (prepare for campaign launch)
 */
router.post('/upload-all-assets', async (req, res) => {
  try {
    console.log('\n🚀 Uploading assets for ALL products...\n');

    // Get all products
    const { getListings } = require('./marketplace');
    const listings = await getListings('active');

    console.log(`📦 Found ${listings.length} products to process\n`);

    const allResults = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < listings.length; i++) {
      const product = listings[i];
      const num = i + 1;

      console.log(`\n[${num}/${listings.length}] ${product.productTitle}`);

      try {
        const results = await googleAdsAssets.uploadDemandGenAssets({
          productTitle: product.productTitle,
          productDescription: product.productDescription,
          productImages: product.productImages,
          landingPageUrl: `https://arbi.market/p/${product.listingId}`,
          businessName: 'Arbi Market',
        });

        if (results.success) {
          successCount++;
        } else {
          failCount++;
        }

        allResults.push({
          listingId: product.listingId,
          productTitle: product.productTitle,
          success: results.success,
          images: results.images.filter(r => r.success).length,
          headlines: results.headlines.filter(r => r.success).length,
          descriptions: results.descriptions.filter(r => r.success).length,
        });
      } catch (error: any) {
        failCount++;
        allResults.push({
          listingId: product.listingId,
          productTitle: product.productTitle,
          success: false,
          error: error.message,
        });
      }

      // Rate limit: 2 seconds between products
      if (i < listings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Asset upload complete: ${successCount} successful, ${failCount} failed`);

    return res.json({
      success: true,
      message: `Uploaded assets for ${successCount} products`,
      successCount,
      failCount,
      results: allResults,
    });
  } catch (error: any) {
    console.error('❌ Bulk asset upload error:', error);

    return res.status(500).json({
      success: false,
      error: 'Bulk asset upload failed',
      message: error.message,
    });
  }
});

export default router;
