#!/usr/bin/env node

/**
 * Test Rainforest API integration
 * Tests Amazon product price lookup
 */

const axios = require('axios');

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

async function testRainforestAPI() {
  console.log('🧪 Testing Rainforest API...\n');

  // Check credentials
  console.log('📋 Configuration:');
  console.log(`  API Key: ${RAINFOREST_API_KEY ? '***' + RAINFOREST_API_KEY.slice(-8) : '❌ NOT SET'}\n`);

  if (!RAINFOREST_API_KEY) {
    console.error('❌ RAINFOREST_API_KEY is not set!');
    console.log('\n💡 Set it in your environment:');
    console.log('   export RAINFOREST_API_KEY=your_api_key_here\n');
    process.exit(1);
  }

  try {
    console.log('📤 Testing Amazon product lookup...');
    console.log('  Product: Apple AirPods Pro (2nd Generation)');

    // Search for a popular product on Amazon
    const response = await axios.get('https://api.rainforestapi.com/request', {
      params: {
        api_key: RAINFOREST_API_KEY,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: 'Apple AirPods Pro 2nd Generation',
        max_page: 1
      },
      timeout: 30000
    });

    if (response.data && response.data.search_results && response.data.search_results.length > 0) {
      const firstResult = response.data.search_results[0];

      console.log('\n✅ Rainforest API working!');
      console.log(`  Found: ${firstResult.title}`);
      console.log(`  Price: $${firstResult.price?.value || 'N/A'}`);
      console.log(`  Rating: ${firstResult.rating || 'N/A'} ⭐`);
      console.log(`  ASIN: ${firstResult.asin || 'N/A'}`);
      console.log(`  Link: ${firstResult.link || 'N/A'}`);

      // Show credit usage
      if (response.data.request_info) {
        console.log(`\n📊 API Usage:`);
        console.log(`  Credits used: ${response.data.request_info.credits_used || 1}`);
        console.log(`  Credits remaining: Check your Rainforest dashboard`);
      }

      console.log('\n✅ Rainforest API test passed!');
      console.log('\n🎯 This enables:');
      console.log('  ✓ Amazon price checking');
      console.log('  ✓ eBay → Amazon arbitrage opportunities');
      console.log('  ✓ Multi-platform profit calculations');

      return;
    } else {
      console.log('\n⚠️  No results found, but API is responding');
    }

  } catch (error) {
    console.error('\n❌ Rainforest API test failed!');
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Error: ${JSON.stringify(error.response.data, null, 2)}`);

      if (error.response.status === 401) {
        console.log('\n💡 API key is invalid or expired');
        console.log('   Check: https://www.rainforestapi.com/dashboard');
      } else if (error.response.status === 429) {
        console.log('\n💡 Rate limit exceeded or credits exhausted');
        console.log('   Check your remaining credits at: https://www.rainforestapi.com/dashboard');
      }
    } else {
      console.error(`  Error: ${error.message}`);
    }
    process.exit(1);
  }
}

testRainforestAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
