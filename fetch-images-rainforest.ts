/**
 * Fetch Gallery Images using Rainforest API
 * Professional Amazon scraping service that bypasses bot detection
 */

import axios from 'axios';

const API_BASE = 'https://api.arbi.creai.dev';
const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY || '';
const CLOUDINARY_CLOUD_NAME = 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = 'arbi_products';

// Top products
const TOP_PRODUCTS = [
  {
    listingId: 'listing_1766360580855_24nluy3za',
    asin: 'B0C1SLD8VK',
    name: 'Sony Alpha A7 IV Camera',
    profit: 749.40,
  },
];

async function scrapeWithRainforest(asin: string) {
  console.log(`   📥 Fetching via Rainforest API...`);

  const response = await axios.get('https://api.rainforestapi.com/request', {
    params: {
      api_key: RAINFOREST_API_KEY,
      type: 'product',
      asin: asin,
      amazon_domain: 'amazon.com',
    },
    timeout: 30000,
  });

  const product = response.data.product;
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

  return imageUrls;
}

async function uploadToCloudinary(imageUrl: string, listingId: string, index: number) {
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
  console.log(`   ASIN: ${product.asin}`);
  console.log(`   Profit: $${product.profit}`);

  try {
    // Scrape images via Rainforest
    const imageUrls = await scrapeWithRainforest(product.asin);
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
  console.log('🚀 FETCHING GALLERY IMAGES WITH RAINFOREST API');
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
