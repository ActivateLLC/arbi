/**
 * Direct Image Scraper - No dependencies on amazon-buddy
 * Scrapes Amazon HTML directly and uploads to Cloudinary
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const API_BASE = 'https://api.arbi.creai.dev';
const CLOUDINARY_CLOUD_NAME = 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = 'arbi_products';

// Top products
const TOP_PRODUCTS = [
  {
    listingId: 'listing_1766360580855_24nluy3za',
    amazonUrl: 'https://www.amazon.com/dp/B0C1SLD8VK',
    name: 'Sony Alpha A7 IV Camera',
    profit: 749.40,
  },
];

async function scrapeImages(productUrl: string) {
  console.log(`   📥 Fetching Amazon page...`);

  const response = await axios.get(productUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  const imageUrls: string[] = [];

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

  // 4. Look for colorImages data
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

  return imageUrls;
}

async function uploadToCloudinary(imageUrl: string, listingId: string, index: number) {
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
      public_id: `${listingId}-${index}-${Date.now()}`,
    },
    {
      timeout: 20000,
    }
  );

  return uploadResponse.data.secure_url;
}

async function processProduct(product: any) {
  console.log(`\n🖼️  Processing: ${product.name}`);
  console.log(`   URL: ${product.amazonUrl}`);
  console.log(`   Profit: $${product.profit}`);

  try {
    // Scrape images
    const imageUrls = await scrapeImages(product.amazonUrl);
    console.log(`   ✅ Found ${imageUrls.length} image URLs`);

    if (imageUrls.length === 0) {
      console.log(`   ⚠️  No images found`);
      return { success: false, product: product.name, error: 'No images found' };
    }

    // Upload to Cloudinary
    const cloudinaryUrls: string[] = [];

    for (let i = 0; i < Math.min(imageUrls.length, 8); i++) {
      console.log(`   [${i + 1}/${imageUrls.length}] Uploading...`);

      try {
        const cloudinaryUrl = await uploadToCloudinary(imageUrls[i], product.listingId, i);
        cloudinaryUrls.push(cloudinaryUrl);
        console.log(`   ✅ ${i + 1}/${imageUrls.length}`);
      } catch (error: any) {
        console.error(`   ⚠️  Failed ${i + 1}:`, error.message);
      }
    }

    if (cloudinaryUrls.length === 0) {
      console.log(`   ❌ Failed to upload any images`);
      return { success: false, product: product.name, error: 'Upload failed' };
    }

    // Update listing
    console.log(`   💾 Updating listing with ${cloudinaryUrls.length} images...`);

    try {
      await axios.put(
        `${API_BASE}/api/marketplace/${product.listingId}`,
        { productImages: cloudinaryUrls }
      );
      console.log(`   ✅ SUCCESS!`);
    } catch (error: any) {
      console.log(`   ⚠️  API update failed, but images uploaded to Cloudinary`);
    }

    console.log(`   🌐 Product page: ${API_BASE}/product/${product.listingId}`);
    console.log(`\n   📸 Uploaded Images:`);
    cloudinaryUrls.forEach((url, i) => console.log(`      ${i + 1}. ${url}`));

    return {
      success: true,
      product: product.name,
      imagesUploaded: cloudinaryUrls.length,
      images: cloudinaryUrls,
      productUrl: `${API_BASE}/product/${product.listingId}`,
    };

  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
    return { success: false, product: product.name, error: error.message };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 FETCHING GALLERY IMAGES FOR TOP PRODUCTS');
  console.log('═══════════════════════════════════════════════════════════');

  const results = [];

  for (const product of TOP_PRODUCTS) {
    const result = await processProduct(product);
    results.push(result);

    // Wait between products
    if (TOP_PRODUCTS.indexOf(product) < TOP_PRODUCTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 FINAL SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  results.forEach((result: any) => {
    if (result.success) {
      console.log(`✅ ${result.product}`);
      console.log(`   Images: ${result.imagesUploaded}`);
      console.log(`   URL: ${result.productUrl}\n`);
    } else {
      console.log(`❌ ${result.product}: ${result.error}\n`);
    }
  });

  const successCount = results.filter((r: any) => r.success).length;
  console.log(`🎉 ${successCount}/${results.length} products ready for ads!`);
}

main().catch(console.error);
