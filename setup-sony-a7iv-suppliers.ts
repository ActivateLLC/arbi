/**
 * Setup Suppliers for Sony Alpha A7 IV Camera
 * Adds multiple suppliers with fallback priority
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'https://api.arbi.creai.dev';
const LISTING_ID = 'listing_1766360580855_24nluy3za';

async function setupSuppliers() {
  console.log('🔧 Setting up multi-supplier fallback for Sony Alpha A7 IV\n');

  const suppliers = [
    {
      vendor: 'amazon',
      productUrl: 'https://www.amazon.com/dp/B0C1SLD8VK',
      price: 2498.00,
      priority: 0, // PRIMARY
    },
    {
      vendor: 'bhphoto',
      productUrl: 'https://www.bhphotovideo.com/c/product/1748194-REG/sony_ilce_7m4_b_alpha_a7_iv_mirrorless.html',
      price: 2498.00,
      priority: 1, // FIRST FALLBACK
    },
    {
      vendor: 'adorama',
      productUrl: 'https://www.adorama.com/isoa7m4.html',
      price: 2498.00,
      priority: 2, // SECOND FALLBACK
    },
    {
      vendor: 'amazon',
      productUrl: 'https://www.amazon.com/dp/B09JZFKTWX', // Used/renewed option
      price: 2199.99,
      priority: 3, // THIRD FALLBACK (higher profit but used)
    },
  ];

  try {
    console.log(`📍 Listing ID: ${LISTING_ID}`);
    console.log(`📦 Product: Sony Alpha A7 IV Camera`);
    console.log(`🔗 Landing Page: ${API_BASE}/product/${LISTING_ID}\n`);

    // Add suppliers in bulk
    console.log(`📤 Adding ${suppliers.length} suppliers...\n`);

    const response = await axios.post(`${API_BASE}/api/suppliers/bulk`, {
      listingId: LISTING_ID,
      suppliers: suppliers,
    });

    if (response.data.success) {
      console.log('✅ Suppliers added successfully!\n');
      console.log('📋 Supplier Configuration:\n');

      suppliers.forEach((s, i) => {
        const priorityLabel = s.priority === 0 ? 'PRIMARY' :
                             `FALLBACK ${s.priority}`;
        console.log(`   ${i + 1}. ${s.vendor.toUpperCase()} (${priorityLabel})`);
        console.log(`      Price: $${s.price.toFixed(2)}`);
        console.log(`      URL: ${s.productUrl.substring(0, 60)}...`);
        console.log(``);
      });

      // Test the fallback system
      console.log('\n🧪 Testing fallback logic...\n');

      const marketplacePrice = 3247.40; // Current selling price

      const testResponse = await axios.get(`${API_BASE}/api/suppliers/${LISTING_ID}/best`, {
        params: {
          marketplacePrice,
          minProfit: 20,
        },
      });

      if (testResponse.data.success && testResponse.data.supplier) {
        const best = testResponse.data;
        console.log('✅ Best supplier found:');
        console.log(`   Vendor: ${best.supplier.vendor.toUpperCase()}`);
        console.log(`   Price: $${best.supplier.price}`);
        console.log(`   Profit: $${best.profit.toFixed(2)}`);
        console.log(`   Is Fallback: ${best.isFallback ? 'Yes' : 'No (Primary)'}`);

        if (best.profitLoss) {
          console.log(`   Profit Loss vs Primary: $${best.profitLoss.toFixed(2)}`);
        }
      }

      // Get supplier stats
      console.log('\n📊 Supplier Statistics:\n');

      const statsResponse = await axios.get(`${API_BASE}/api/suppliers/${LISTING_ID}`);

      if (statsResponse.data.success) {
        const stats = statsResponse.data.stats;
        console.log(`   Total Suppliers: ${stats.total}`);
        console.log(`   Active: ${stats.active}`);
        console.log(`   In Stock: ${stats.inStock}`);
        console.log(`   Out of Stock: ${stats.outOfStock}`);

        if (stats.cheapest) {
          console.log(`   Cheapest: ${stats.cheapest.vendor} ($${stats.cheapest.price})`);
        }
        if (stats.mostExpensive) {
          console.log(`   Most Expensive: ${stats.mostExpensive.vendor} ($${stats.mostExpensive.price})`);
        }
      }

      console.log('\n✅ Fallback system setup complete!\n');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 NEXT STEPS:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('1. Configure email notifications (optional):');
      console.log('   - Set NOTIFICATION_EMAIL');
      console.log('   - Set NOTIFICATION_PASSWORD');
      console.log('   - Set OWNER_EMAIL');
      console.log('');
      console.log('2. Start stock monitoring:');
      console.log('   POST /api/suppliers/monitor/start');
      console.log('');
      console.log('3. Test a purchase:');
      console.log('   - Go to your product page');
      console.log('   - Complete checkout');
      console.log('   - System will try primary, then fallbacks');
      console.log('');
      console.log('4. Simulate primary out of stock:');
      console.log('   PUT /api/suppliers/{supplierId}/stock');
      console.log('   { "inStock": false }');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════\n');

    } else {
      console.error('❌ Failed to add suppliers:', response.data.error);
    }

  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run setup
setupSuppliers().catch(console.error);
