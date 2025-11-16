#!/usr/bin/env node

/**
 * Test Cloudinary API integration
 * Tests image upload from URL
 */

const axios = require('axios');
const FormData = require('form-data');

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyfumzftc';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '287368911858986';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

async function testCloudinaryAPI() {
  console.log('🧪 Testing Cloudinary API...\n');

  // Check credentials
  console.log('📋 Configuration:');
  console.log(`  Cloud Name: ${CLOUDINARY_CLOUD_NAME}`);
  console.log(`  API Key: ${CLOUDINARY_API_KEY}`);
  console.log(`  API Secret: ${CLOUDINARY_API_SECRET ? '***' + CLOUDINARY_API_SECRET.slice(-4) : '❌ NOT SET'}\n`);

  if (!CLOUDINARY_API_SECRET) {
    console.error('❌ CLOUDINARY_API_SECRET is not set!');
    console.log('\n💡 Set it in your environment:');
    console.log('   export CLOUDINARY_API_SECRET=your_secret_here\n');
    process.exit(1);
  }

  // Test image URL (eBay product example)
  const testImageUrl = 'https://i.ebayimg.com/images/g/dT0AAOSwmfhh8qZo/s-l1600.jpg';

  try {
    console.log('📤 Testing image upload from URL...');
    console.log(`  Source: ${testImageUrl.substring(0, 60)}...`);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    // Create form data
    const formData = new FormData();
    formData.append('file', testImageUrl);
    formData.append('upload_preset', 'ml_default'); // Use unsigned preset for testing
    formData.append('folder', 'arbi/test');
    formData.append('tags', 'test,ebay');

    // Try unsigned upload first
    console.log('  Attempting unsigned upload...');
    try {
      const response = await axios.post(uploadUrl, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });

      console.log('\n✅ Upload successful!');
      console.log(`  Public ID: ${response.data.public_id}`);
      console.log(`  URL: ${response.data.secure_url}`);
      console.log(`  Format: ${response.data.format}`);
      console.log(`  Size: ${(response.data.bytes / 1024).toFixed(2)} KB`);
      console.log(`  Dimensions: ${response.data.width}x${response.data.height}`);
      return;
    } catch (unsignedError) {
      console.log('  ⚠️  Unsigned upload failed, trying signed upload...');

      // Try signed upload
      const timestamp = Math.round(Date.now() / 1000);
      const crypto = require('crypto');

      // Create signature
      const signatureString = `folder=arbi/test&tags=test,ebay&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = crypto
        .createHash('sha1')
        .update(signatureString)
        .digest('hex');

      const signedFormData = new FormData();
      signedFormData.append('file', testImageUrl);
      signedFormData.append('api_key', CLOUDINARY_API_KEY);
      signedFormData.append('timestamp', timestamp);
      signedFormData.append('signature', signature);
      signedFormData.append('folder', 'arbi/test');
      signedFormData.append('tags', 'test,ebay');

      const signedResponse = await axios.post(uploadUrl, signedFormData, {
        headers: signedFormData.getHeaders(),
        timeout: 30000,
      });

      console.log('\n✅ Signed upload successful!');
      console.log(`  Public ID: ${signedResponse.data.public_id}`);
      console.log(`  URL: ${signedResponse.data.secure_url}`);
      console.log(`  Format: ${signedResponse.data.format}`);
      console.log(`  Size: ${(signedResponse.data.bytes / 1024).toFixed(2)} KB`);
      console.log(`  Dimensions: ${signedResponse.data.width}x${signedResponse.data.height}`);
    }

  } catch (error) {
    console.error('\n❌ Upload failed!');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`  Error: ${error.message}`);
    }
    process.exit(1);
  }

  console.log('\n✅ Cloudinary API test passed!');
  console.log('\n🎯 Next steps:');
  console.log('  1. Add these env vars to Railway:');
  console.log(`     CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}`);
  console.log(`     CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}`);
  console.log(`     CLOUDINARY_API_SECRET=<your_secret>`);
  console.log('  2. Enable unsigned uploads in Cloudinary dashboard (Settings > Upload)');
  console.log('  3. Test photo extraction: node scripts/test-photo-extraction.js');
}

testCloudinaryAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
