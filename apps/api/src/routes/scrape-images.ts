/**
 * Stagehand Image Scraper
 * Scrapes product images from Amazon using browser automation
 */

import { Stagehand } from '@browserbasehq/stagehand';
import axios from 'axios';
import { Router, Request, Response } from 'express';
import { getListing, updateListing } from './marketplace';

const router = Router();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'arbi_products';

/**
 * POST /api/scrape-images/:listingId
 * Scrape product images using Stagehand browser automation
 */
router.post('/:listingId', async (req: Request, res: Response) => {
  const { listingId } = req.params;
  let stagehand: Stagehand | null = null;

  try {
    // Get listing
    const listing = await getListing(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    const productUrl = listing.supplierUrl;
    if (!productUrl) {
      return res.status(400).json({ success: false, error: 'No supplier URL found' });
    }

    console.log(`🖼️  Scraping images from: ${productUrl}`);

    // Initialize Stagehand with headless mode
    stagehand = new Stagehand({
      env: 'LOCAL',
      headless: true,
      verbose: 1,
      debugDom: false,
    });

    await stagehand.init();
    await stagehand.page.goto(productUrl, { waitUntil: 'networkidle' });

    console.log(`   ✅ Page loaded: ${productUrl}`);

    // Wait for images to load
    await stagehand.page.waitForSelector('img', { timeout: 10000 });

    // Extract all product images
    const imageUrls = await stagehand.page.evaluate(() => {
      const images: string[] = [];

      // Main product images (various selectors Amazon uses)
      const selectors = [
        'img[data-old-hires]',  // Main image
        'img.a-dynamic-image',   // Gallery images
        'li.imageThumbnail img', // Thumbnail images
        '#altImages img',        // Alternative images section
        '#imageBlock img',       // Image block
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((img: any) => {
          // Get high-res version
          const hiRes = img.getAttribute('data-old-hires') ||
                       img.getAttribute('data-a-dynamic-image') ||
                       img.src;

          if (hiRes && hiRes.includes('media-amazon') && !images.includes(hiRes)) {
            // Get highest quality version
            const highQualityUrl = hiRes
              .replace(/_AC_.*?_/g, '_AC_SX1500_')  // Request 1500px version
              .replace(/\._.*?_/g, '')              // Remove size modifiers
              .split('._')[0] + '._AC_SX1500_.jpg'; // Force high quality

            images.push(highQualityUrl);
          }
        });
      });

      return Array.from(new Set(images)).slice(0, 8); // Get up to 8 unique images
    });

    console.log(`   ✅ Found ${imageUrls.length} product images`);

    if (imageUrls.length === 0) {
      await stagehand.close();
      return res.status(404).json({ success: false, error: 'No images found on product page' });
    }

    // Download and upload images to Cloudinary
    const cloudinaryUrls: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`   [${i + 1}/${imageUrls.length}] Processing: ${imageUrl.substring(0, 80)}...`);

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
        console.log(`   ✅ Uploaded image ${i + 1}: ${uploadResponse.data.secure_url}`);

      } catch (error: any) {
        console.error(`   ⚠️  Failed to process image ${i + 1}:`, error.message);
      }
    }

    await stagehand.close();

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
      productUrl,
      imagesFound: imageUrls.length,
      imagesUploaded: cloudinaryUrls.length,
      images: cloudinaryUrls,
    });

  } catch (error: any) {
    console.error('❌ Error scraping images:', error);
    if (stagehand) {
      await stagehand.close().catch(console.error);
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
