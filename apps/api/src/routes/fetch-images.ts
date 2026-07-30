/**
 * Fetch Product Images Endpoint
 * Fetches all product images from Amazon and updates listing
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'arbi_products';

/**
 * POST /api/fetch-images/:listingId
 * Fetch all images for a product and update listing
 */
router.post('/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  try {
    // Get listing to find ASIN
    const { getListings } = require('./marketplace');
    const listings = await getListings('active');
    const listing = listings.find((l: any) => l.listingId === listingId);

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    // Extract ASIN from supplier URL
    const asinMatch = listing.supplierUrl?.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    const asin = asinMatch ? (asinMatch[1] || asinMatch[2]) : null;

    if (!asin) {
      return res.status(400).json({ success: false, error: 'Could not extract ASIN from supplier URL' });
    }

    // Fetch product data from Rainforest API
    const rainforestApiKey = process.env.RAINFOREST_API_KEY;
    if (!rainforestApiKey) {
      return res.status(500).json({ success: false, error: 'Rainforest API not configured' });
    }

    console.log(`🖼️  Fetching images for ASIN: ${asin}`);

    const rainforestResponse = await axios.get('https://api.rainforestapi.com/request', {
      params: {
        api_key: rainforestApiKey,
        type: 'product',
        amazon_domain: 'amazon.com',
        asin: asin,
      },
      timeout: 30000,
    });

    const product = rainforestResponse.data.product;

    if (!product || !product.images || product.images.length === 0) {
      return res.status(404).json({ success: false, error: 'No images found for product' });
    }

    console.log(`   Found ${product.images.length} images`);

    // Upload images to Cloudinary
    const cloudinaryUrls: string[] = [];

    for (let i = 0; i < Math.min(product.images.length, 6); i++) {
      const imageUrl = product.images[i].link;

      try {
        const uploadResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            file: imageUrl,
            upload_preset: CLOUDINARY_UPLOAD_PRESET,
            folder: 'arbi-marketplace',
            public_id: `rainforest-${asin}-${i}-${Date.now()}`,
          },
          {
            timeout: 15000,
          }
        );

        cloudinaryUrls.push(uploadResponse.data.secure_url);
        console.log(`   ✅ Uploaded image ${i + 1}`);
      } catch (error: any) {
        console.error(`   ⚠️  Failed to upload image ${i + 1}:`, error.message);
      }
    }

    if (cloudinaryUrls.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to upload any images' });
    }

    // Update listing with new images
    const { updateListing } = require('./marketplace');
    await updateListing(listingId, {
      productImages: cloudinaryUrls,
    });

    console.log(`   ✅ Updated listing with ${cloudinaryUrls.length} images`);

    res.json({
      success: true,
      listingId,
      asin,
      imagesFound: product.images.length,
      imagesUploaded: cloudinaryUrls.length,
      images: cloudinaryUrls,
      productUrl: `${req.protocol}://${req.get('host')}/product/${listingId}`,
    });

  } catch (error: any) {
    console.error('❌ Error fetching images:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
