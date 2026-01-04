/**
 * Amazon Product Scraper using amazon-buddy (open source)
 * Scrapes product images, prices, reviews from Amazon
 */

import { Router, Request, Response } from 'express';
import AmazonScraper from 'amazon-buddy';
import axios from 'axios';
import { getListing, updateListing } from './marketplace';

const router = Router();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'arbi_products';

/**
 * POST /api/scrape-amazon-buddy/:listingId
 * Scrape product using amazon-buddy open source library
 */
router.post('/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;

  try {
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

    console.log(`🖼️  Scraping Amazon product: ${asin}`);

    // Use amazon-buddy to scrape
    const products = await AmazonScraper({
      asin: [asin],
      bulk: false,
      sponsored: false,
      category: 'aps',
      cli: false,
    });

    if (!products || !products.result || products.result.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found by scraper' });
    }

    const product = products.result[0];
    const imageUrls: string[] = [];

    // Get main image
    if (product.main_image) {
      imageUrls.push(product.main_image);
    }

    // Get additional images
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: string) => {
        if (!imageUrls.includes(img)) {
          imageUrls.push(img);
        }
      });
    }

    console.log(`   ✅ Found ${imageUrls.length} images from amazon-buddy`);

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
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
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
        price: product.price,
        rating: product.reviews?.rating,
      },
    });

  } catch (error: any) {
    console.error('❌ Error with amazon-buddy scraper:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
