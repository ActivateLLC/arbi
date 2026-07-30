/**
 * Manual Image Upload Script
 * Upload images directly to Cloudinary and update product listings
 */

import axios from 'axios';

const API_BASE = 'https://api.arbi.creai.dev';
const CLOUDINARY_CLOUD_NAME = 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = 'arbi_products';

// Add your image URLs here
const MANUAL_UPLOADS = [
  {
    listingId: 'listing_1766360580855_24nluy3za',
    name: 'Sony Alpha A7 IV Camera',
    // Add direct image URLs here (from Amazon, manufacturer site, or any public source)
    imageUrls: [
      // Example:
      // 'https://m.media-amazon.com/images/I/71abc123._AC_SX1500_.jpg',
      // 'https://m.media-amazon.com/images/I/71def456._AC_SX1500_.jpg',
      // Add more URLs here...
    ],
  },
];

async function uploadImage(imageUrl: string, listingId: string, index: number) {
  try {
    console.log(`   [${index + 1}] Downloading: ${imageUrl.substring(0, 80)}...`);

    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 15000,
    });

    // Convert to base64
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = response.headers['content-type'] || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    // Upload to Cloudinary
    console.log(`   [${index + 1}] Uploading to Cloudinary...`);
    const uploadResponse = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        file: dataUri,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
        folder: 'arbi-marketplace',
        public_id: `${listingId}-manual-${index}-${Date.now()}`,
      },
      {
        timeout: 20000,
      }
    );

    const cloudinaryUrl = uploadResponse.data.secure_url;
    console.log(`   ✅ Uploaded: ${cloudinaryUrl}`);

    return cloudinaryUrl;

  } catch (error: any) {
    console.error(`   ❌ Failed to upload image ${index + 1}:`, error.message);
    return null;
  }
}

async function processProduct(config: any) {
  console.log(`\n🖼️  Processing: ${config.name}`);
  console.log(`   Listing: ${config.listingId}`);
  console.log(`   Images to upload: ${config.imageUrls.length}`);

  if (config.imageUrls.length === 0) {
    console.log(`   ⚠️  No image URLs provided - skipping`);
    return;
  }

  const cloudinaryUrls: string[] = [];

  for (let i = 0; i < config.imageUrls.length; i++) {
    const cloudinaryUrl = await uploadImage(config.imageUrls[i], config.listingId, i);
    if (cloudinaryUrl) {
      cloudinaryUrls.push(cloudinaryUrl);
    }

    // Wait between uploads to avoid rate limiting
    if (i < config.imageUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (cloudinaryUrls.length === 0) {
    console.log(`   ❌ No images uploaded successfully`);
    return;
  }

  // Fetch existing images
  console.log(`   📥 Fetching existing images...`);
  try {
    const listingResponse = await axios.get(`${API_BASE}/product/${config.listingId}`);
    const html = listingResponse.data;

    // Extract existing Cloudinary URLs from HTML
    const existingUrls: string[] = [];
    const cloudinaryRegex = /https:\/\/res\.cloudinary\.com\/[^"'\s]+/g;
    const matches = html.match(cloudinaryRegex);

    if (matches) {
      matches.forEach((url: string) => {
        if (!existingUrls.includes(url)) {
          existingUrls.push(url);
        }
      });
    }

    console.log(`   📌 Found ${existingUrls.length} existing images`);

    // Combine existing + new images
    const allImages = [...existingUrls, ...cloudinaryUrls];
    const uniqueImages = Array.from(new Set(allImages));

    console.log(`   💾 Updating listing with ${uniqueImages.length} total images...`);

    // Update listing
    await axios.put(
      `${API_BASE}/api/marketplace/${config.listingId}`,
      { productImages: uniqueImages }
    );

    console.log(`   ✅ SUCCESS! Product now has ${uniqueImages.length} images`);
    console.log(`   🌐 View: ${API_BASE}/product/${config.listingId}`);

    console.log(`\n   📸 All Images:`);
    uniqueImages.forEach((url, i) => {
      const isNew = cloudinaryUrls.includes(url);
      console.log(`      ${i + 1}. ${url} ${isNew ? '(NEW)' : ''}`);
    });

  } catch (error: any) {
    console.error(`   ⚠️  Failed to update listing:`, error.message);
    console.log(`   🌐 Images uploaded to Cloudinary, but DB update failed`);
    console.log(`\n   📸 Uploaded Images:`);
    cloudinaryUrls.forEach((url, i) => console.log(`      ${i + 1}. ${url}`));
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📤 MANUAL IMAGE UPLOAD');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nInstructions:');
  console.log('1. Add image URLs to the MANUAL_UPLOADS array above');
  console.log('2. Run: npx tsx manual-upload-images.ts');
  console.log('3. Images will be uploaded to Cloudinary and added to the listing\n');

  for (const config of MANUAL_UPLOADS) {
    await processProduct(config);

    if (MANUAL_UPLOADS.indexOf(config) < MANUAL_UPLOADS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ UPLOAD COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
