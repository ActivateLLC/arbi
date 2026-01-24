/**
 * Manual Image Upload - Direct approach
 * Upload curated images directly to listing
 */

import axios from 'axios';

const LISTING_ID = 'listing_1766360580855_24nluy3za';
const API_BASE = 'https://api.arbi.creai.dev';

// Curated Sony A7 IV images from reliable sources
const IMAGE_URLS = [
  // Keep existing Cloudinary image
  'https://res.cloudinary.com/dyfumzftc/image/upload/v1766360580/arbi-marketplace/rainforest-B0C1SLD8VK-1766360579352.webp',

  // Additional high-quality product images (base64 or downloadable)
  'https://i.ibb.co/example1.jpg',  // Replace with actual working URLs
  'https://i.ibb.co/example2.jpg',
  'https://i.ibb.co/example3.jpg',
  'https://i.ibb.co/example4.jpg',
  'https://i.ibb.co/example5.jpg',
];

async function uploadImages() {
  console.log(`📸 Uploading ${IMAGE_URLS.length} images for ${LISTING_ID}\n`);

  // For now, just use the one we have
  const realImages = [IMAGE_URLS[0]];

  try {
    const response = await axios.put(`${API_BASE}/api/marketplace/${LISTING_ID}`, {
      productImages: realImages,
    });

    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

uploadImages();
