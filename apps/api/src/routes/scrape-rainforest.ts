/**
 * Rainforest API Image Scraper
 * Professional Amazon scraping service that bypasses bot detection
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getListing, updateListing } from './marketplace';

const router = Router();

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY || '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'arbi_products';

/**
 * POST /api/scrape-rainforest/:listingId
 * Scrape product images using Rainforest API
 */
router.post('/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  try {
    if (!RAINFOREST_API_KEY) {
      return res.status(500).json({ success: false, error: 'Rainforest API key not configured' });
    }

    const listing = await getListing(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    const productUrl = listing.supplierUrl;
    if (!productUrl) {
      return res.status(400).json({ success: false, error: 'No supplier URL found' });
    }

    // Extract ASIN
    const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    const asin = asinMatch ? (asinMatch[1] || asinMatch[2]) : null;

    if (!asin) {
      return res.status(400).json({ success: false, error: 'Could not extract ASIN from URL' });
    }

    console.log(`🖼️  Scraping Amazon product via Rainforest: ${asin}`);

    // Call Rainforest API
    const rainforestResponse = await axios.get('https://api.rainforestapi.com/request', {
      params: {
        api_key: RAINFOREST_API_KEY,
        type: 'product',
        asin: asin,
        amazon_domain: 'amazon.com',
      },
      timeout: 30000,
    });

    const product = rainforestResponse.data.product;
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found by Rainforest API' });
    }

    const imageUrls: string[] = [];

    // Get main image
    if (product.main_image?.link) {
      imageUrls.push(product.main_image.link);
    }

    // Get additional images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: any) => {
        if (img.link && !imageUrls.includes(img.link)) {
          imageUrls.push(img.link);
        }
      });
    }

    // Get image variants (high resolution)
    if (product.images_flat && Array.isArray(product.images_flat)) {
      product.images_flat.forEach((url: string) => {
        if (!imageUrls.includes(url)) {
          imageUrls.push(url);
        }
      });
    }

    console.log(`   ✅ Found ${imageUrls.length} images from Rainforest`);

    if (imageUrls.length === 0) {
      return res.status(404).json({ success: false, error: 'No images found' });
    }

    // Upload to Cloudinary
    const cloudinaryUrls: string[] = [];

    for (let i = 0; i < Math.min(imageUrls.length, 8); i++) {
      const imageUrl = imageUrls[i];
      console.log(`   [${i + 1}/${imageUrls.length}] Uploading...`);

      try {
        // Download image
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });

        // Convert to base64
        const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
        const dataUri = `data:image/jpeg;base64,${base64Image}`;

        // Upload to Cloudinary
        const uploadResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            file: dataUri,
            upload_preset: CLOUDINARY_UPLOAD_PRESET,
            folder: 'arbi-marketplace',
            public_id: `${listingId}-${i}-${Date.now()}`,
          },
          {
            timeout: 20000,
          }
        );

        cloudinaryUrls.push(uploadResponse.data.secure_url);
        console.log(`   ✅ Uploaded ${i + 1}/${imageUrls.length}`);

      } catch (error: any) {
        console.error(`   ⚠️  Failed to upload image ${i + 1}:`, error.message);
      }
    }

    if (cloudinaryUrls.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to upload any images' });
    }

    // Update listing
    await updateListing(listingId, {
      productImages: cloudinaryUrls,
    });

    console.log(`   ✅ Updated listing with ${cloudinaryUrls.length} images`);

    res.json({
      success: true,
      listingId,
      asin,
      productUrl,
      imagesFound: imageUrls.length,
      imagesUploaded: cloudinaryUrls.length,
      images: cloudinaryUrls,
      productData: {
        title: product.title,
        price: product.pricing?.price?.raw || product.buybox_winner?.price?.raw,
        rating: product.rating,
      },
    });

  } catch (error: any) {
    console.error('❌ Error with Rainforest scraper:', error.message);

    // Include Rainforest API error details if available
    const errorDetails = error.response?.data || error.message;

    res.status(500).json({
      success: false,
      error: error.message,
      details: errorDetails,
    });
  }
});

export default router;
