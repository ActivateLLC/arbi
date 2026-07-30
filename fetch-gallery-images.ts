/**
 * Fetch Gallery Images for Top Products
 * Uses amazon-buddy to scrape and upload images to Cloudinary
 */

const AmazonScraper = require('amazon-buddy');
import axios from 'axios';

const API_BASE = 'https://api.arbi.creai.dev';
const CLOUDINARY_CLOUD_NAME = 'dyfumzftc';
const CLOUDINARY_UPLOAD_PRESET = 'arbi_products';

// Top products from the summary (highest profit first)
const TOP_PRODUCTS = [
  {
    listingId: 'listing_1766360580855_24nluy3za',
    asin: 'B0C1SLD8VK',
    name: 'Sony Alpha A7 IV Camera',
    profit: 749.40,
  },
  // Add more products as needed
];

async function scrapeAndUploadImages(product: any) {
  console.log(`\n🖼️  Processing: ${product.name}`);
  console.log(`   ASIN: ${product.asin}`);
  console.log(`   Profit: $${product.profit}`);

  try {
    // Scrape with amazon-buddy using ASIN method
    console.log(`   📥 Scraping Amazon...`);
    const products = await AmazonScraper.asin({
      asin: product.asin,
      bulk: false,
      cli: false,
    });

    if (!products || !products.result || products.result.length === 0) {
      console.log(`   ⚠️  No results from scraper`);
      return;
    }

    const scrapedProduct = products.result[0];
    const imageUrls: string[] = [];

    // Collect all images
    if (scrapedProduct.main_image) {
      imageUrls.push(scrapedProduct.main_image);
    }

    if (scrapedProduct.images && Array.isArray(scrapedProduct.images)) {
      scrapedProduct.images.forEach((img: string) => {
        if (!imageUrls.includes(img)) {
          imageUrls.push(img);
        }
      });
    }

    console.log(`   ✅ Found ${imageUrls.length} images`);

    if (imageUrls.length === 0) {
      console.log(`   ⚠️  No images found`);
      return;
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
            public_id: `${product.listingId}-${i}-${Date.now()}`,
          },
          {
            timeout: 20000,
          }
        );

        cloudinaryUrls.push(uploadResponse.data.secure_url);
        console.log(`   ✅ ${i + 1}/${imageUrls.length}`);

      } catch (error: any) {
        console.error(`   ⚠️  Failed to upload image ${i + 1}:`, error.message);
      }
    }

    if (cloudinaryUrls.length === 0) {
      console.log(`   ❌ Failed to upload any images`);
      return;
    }

    // Update listing via API
    console.log(`   💾 Updating listing...`);
    const updateResponse = await axios.put(
      `${API_BASE}/api/marketplace/${product.listingId}`,
      {
        productImages: cloudinaryUrls,
      }
    );

    console.log(`   ✅ SUCCESS! Uploaded ${cloudinaryUrls.length} images`);
    console.log(`   🌐 Product page: ${API_BASE}/product/${product.listingId}`);

    return {
      success: true,
      product: product.name,
      imagesUploaded: cloudinaryUrls.length,
      productUrl: `${API_BASE}/product/${product.listingId}`,
    };

  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
    return {
      success: false,
      product: product.name,
      error: error.message,
    };
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 FETCHING GALLERY IMAGES FOR TOP PRODUCTS');
  console.log('═══════════════════════════════════════════════════════════');

  const results = [];

  for (const product of TOP_PRODUCTS) {
    const result = await scrapeAndUploadImages(product);
    results.push(result);

    // Wait 2 seconds between products to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  results.forEach((result: any) => {
    if (result && result.success) {
      console.log(`✅ ${result.product}: ${result.imagesUploaded} images`);
      console.log(`   ${result.productUrl}`);
    } else if (result) {
      console.log(`❌ ${result.product}: ${result.error}`);
    }
  });

  console.log('\n✅ Done! Your products are ready for ads!\n');
}

main().catch(console.error);
