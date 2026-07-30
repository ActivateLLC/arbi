/**
 * Fetch and Update Product Images from Amazon
 * Gets all product images via Rainforest API and updates listing
 */

import axios from 'axios';
import FormData from 'form-data';

const API_BASE = process.env.API_URL || 'https://api.arbi.creai.dev';
const RAINFOREST_KEY = process.env.RAINFOREST_API_KEY;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'arbi_products';

const LISTING_ID = 'listing_1766360580855_24nluy3za';
const ASIN = 'B0C1SLD8VK';

async function fetchProductImages() {
  console.log('🖼️  Fetching all product images from Amazon...\n');

  try {
    // Step 1: Fetch product data from Rainforest API
    console.log(`📍 ASIN: ${ASIN}`);
    console.log(`🔗 Amazon URL: https://www.amazon.com/dp/${ASIN}\n`);

    const rainforestResponse = await axios.get('https://api.rainforestapi.com/request', {
      params: {
        api_key: RAINFOREST_KEY,
        type: 'product',
        amazon_domain: 'amazon.com',
        asin: ASIN,
      },
      timeout: 15000,
    });

    const product = rainforestResponse.data.product;

    if (!product) {
      console.error('❌ Product not found');
      return;
    }

    console.log(`✅ Product found: ${product.title}\n`);

    // Step 2: Extract all images
    const images = product.images || [];
    console.log(`📸 Found ${images.length} product images\n`);

    if (images.length === 0) {
      console.log('⚠️  No images found for this product');
      return;
    }

    // Display all image URLs
    images.forEach((img: any, idx: number) => {
      console.log(`   ${idx + 1}. ${img.link}`);
    });
    console.log('');

    // Step 3: Upload images to Cloudinary
    console.log('☁️  Uploading images to Cloudinary...\n');
    const cloudinaryUrls: string[] = [];

    for (let i = 0; i < Math.min(images.length, 6); i++) {
      const imageUrl = images[i].link;

      try {
        const uploadResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            file: imageUrl,
            upload_preset: CLOUDINARY_UPLOAD_PRESET,
            folder: 'arbi-marketplace',
            public_id: `rainforest-${ASIN}-${i}`,
          }
        );

        const cloudinaryUrl = uploadResponse.data.secure_url;
        cloudinaryUrls.push(cloudinaryUrl);
        console.log(`   ✅ Image ${i + 1} uploaded: ${cloudinaryUrl}`);
      } catch (error: any) {
        console.log(`   ⚠️  Image ${i + 1} upload failed: ${error.message}`);
      }
    }

    console.log(`\n✅ Uploaded ${cloudinaryUrls.length} images to Cloudinary\n`);

    // Step 4: Update listing with new images
    console.log('💾 Updating product listing...\n');

    const updateResponse = await axios.put(`${API_BASE}/api/marketplace/${LISTING_ID}`, {
      productImages: cloudinaryUrls,
    });

    if (updateResponse.data.success) {
      console.log('✅ Product images updated successfully!\n');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 UPDATED IMAGES:');
      console.log('═══════════════════════════════════════════════════════════');
      cloudinaryUrls.forEach((url, idx) => {
        console.log(`   ${idx + 1}. ${url}`);
      });
      console.log('');
      console.log('🌐 View updated product page:');
      console.log(`   ${API_BASE}/product/${LISTING_ID}`);
      console.log('═══════════════════════════════════════════════════════════\n');
    } else {
      console.error('❌ Failed to update listing:', updateResponse.data.error);
    }

  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run script
fetchProductImages().catch(console.error);
