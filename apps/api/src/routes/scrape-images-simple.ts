/**
 * Simple Image Scraper (HTTP-based, no browser needed)
 * Scrapes Amazon product images using HTTP + cheerio parsing
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Router, Request, Response } from 'express';
import { getListing, updateListing } from './marketplace';

const router = Router();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'arbi_products';

/**
 * POST /api/scrape-images-simple/:listingId
 * Scrape product images using simple HTTP request + HTML parsing
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

    console.log(`🖼️  Scraping images from: ${productUrl}`);

    // Fetch Amazon page
    const response = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const imageUrls: string[] = [];

    // Extract images from various Amazon selectors
    // 1. Main image
    const mainImage = $('#landingImage').attr('src') || $('#landingImage').attr('data-old-hires');
    if (mainImage && mainImage.includes('media-amazon')) {
      imageUrls.push(mainImage.split('._')[0] + '._AC_SX1500_.jpg');
    }

    // 2. Image block data
    const imageBlockData = $('script:contains("ImageBlockATF")').html();
    if (imageBlockData) {
      const matches = imageBlockData.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.jpg/g);
      if (matches) {
        matches.forEach(url => {
          const highRes = url.split('._')[0] + '._AC_SX1500_.jpg';
          if (!imageUrls.includes(highRes)) {
            imageUrls.push(highRes);
          }
        });
      }
    }

    // 3. Thumbnail images
    $('#altImages img').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src && src.includes('media-amazon')) {
        const highRes = src.split('._')[0] + '._AC_SX1500_.jpg';
        if (!imageUrls.includes(highRes)) {
          imageUrls.push(highRes);
        }
      }
    });

    // 4. Look for colorImages data structure
    const colorImagesMatch = response.data.match(/"colorImages":\s*\{[^}]+\}/);
    if (colorImagesMatch) {
      const matches = colorImagesMatch[0].match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_-]+\.jpg/g);
      if (matches) {
        matches.forEach((url: string) => {
          const highRes = url.split('._')[0] + '._AC_SX1500_.jpg';
          if (!imageUrls.includes(highRes)) {
            imageUrls.push(highRes);
          }
        });
      }
    }

    console.log(`   ✅ Found ${imageUrls.length} unique image URLs`);

    if (imageUrls.length === 0) {
      return res.status(404).json({ success: false, error: 'No images found on product page' });
    }

    // Upload to Cloudinary
    const cloudinaryUrls: string[] = [];

    for (let i = 0; i < Math.min(imageUrls.length, 8); i++) {
      const imageUrl = imageUrls[i];
      console.log(`   [${i + 1}/${imageUrls.length}] Uploading: ${imageUrl.substring(0, 80)}...`);

      try {
        // Download image
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://www.amazon.com/',
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
        console.log(`   ✅ Uploaded: ${uploadResponse.data.secure_url}`);

      } catch (error: any) {
        console.error(`   ⚠️  Failed to process image ${i + 1}:`, error.message);
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
      productUrl,
      imagesFound: imageUrls.length,
      imagesUploaded: cloudinaryUrls.length,
      images: cloudinaryUrls,
    });

  } catch (error: any) {
    console.error('❌ Error scraping images:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
