#!/usr/bin/env node

/**
 * Test real web scraping arbitrage
 * Scrapes eBay products and checks Amazon prices via Rainforest API
 */

const axios = require('axios');
const cheerio = require('cheerio');

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const RAILWAY_API_URL = 'https://arbi-production.up.railway.app';

async function scrapeEbayProduct(searchTerm) {
  console.log(`\n🔍 Scraping eBay for: "${searchTerm}"...`);

  try {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_sop=15&LH_BIN=1&rt=nc`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 5,
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const products = [];

    $('.s-item').slice(0, 10).each((i, elem) => {
      const title = $(elem).find('.s-item__title').text().trim();
      const priceText = $(elem).find('.s-item__price').text().trim();
      const link = $(elem).find('.s-item__link').attr('href');
      const image = $(elem).find('.s-item__image-img').attr('src');

      // Parse price
      const priceMatch = priceText.match(/\$?([\d,]+\.?\d*)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

      if (title && price > 0 && price < 100 && !title.includes('Shop on eBay')) {
        products.push({
          title,
          price,
          link: link?.split('?')[0],
          image,
          source: 'eBay (scraped)'
        });
      }
    });

    console.log(`✅ Found ${products.length} eBay products`);
    return products;

  } catch (error) {
    console.error('❌ eBay scraping failed:', error.message);
    return [];
  }
}

async function getAmazonPrice(productTitle) {
  if (!RAINFOREST_API_KEY) {
    console.log('⚠️  Rainforest API key not set, skipping Amazon lookup');
    return null;
  }

  try {
    // Extract key search terms (remove common words)
    const cleanTitle = productTitle
      .replace(/\b(New|Used|Brand|Free|Shipping|Fast|Sealed|OEM|Original)\b/gi, '')
      .substring(0, 100)
      .trim();

    const response = await axios.get('https://api.rainforestapi.com/request', {
      params: {
        api_key: RAINFOREST_API_KEY,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: cleanTitle,
        max_page: 1
      },
      timeout: 15000
    });

    if (response.data?.search_results?.length > 0) {
      const firstResult = response.data.search_results[0];
      return {
        title: firstResult.title,
        price: firstResult.price?.value || 0,
        rating: firstResult.rating,
        asin: firstResult.asin,
        link: firstResult.link
      };
    }

    return null;

  } catch (error) {
    console.error(`⚠️  Amazon lookup failed: ${error.message}`);
    return null;
  }
}

function calculateProfit(ebayPrice, amazonPrice) {
  const ebayFee = ebayPrice * 0.13; // 13% eBay fee
  const amazonFee = amazonPrice * 0.15; // 15% Amazon referral fee
  const shippingCost = 5; // Estimate

  const totalCost = ebayPrice + ebayFee + shippingCost;
  const revenue = amazonPrice - amazonFee;
  const profit = revenue - totalCost;
  const roi = (profit / totalCost) * 100;

  return {
    ebayPrice,
    amazonPrice,
    fees: ebayFee + amazonFee,
    shipping: shippingCost,
    totalCost,
    revenue,
    profit,
    roi
  };
}

async function findArbitrageOpportunities(searchTerm) {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 REAL WEB SCRAPING ARBITRAGE TEST');
  console.log('='.repeat(70));

  // Scrape eBay
  const ebayProducts = await scrapeEbayProduct(searchTerm);

  if (ebayProducts.length === 0) {
    console.log('\n❌ No eBay products found');
    return;
  }

  console.log(`\n💰 Analyzing arbitrage opportunities...\n`);

  const opportunities = [];

  for (const ebayProduct of ebayProducts.slice(0, 5)) {
    console.log(`\n📦 ${ebayProduct.title.substring(0, 60)}...`);
    console.log(`   eBay: $${ebayProduct.price.toFixed(2)}`);

    // Check Amazon price
    const amazonProduct = await getAmazonPrice(ebayProduct.title);

    if (amazonProduct && amazonProduct.price > 0) {
      console.log(`   Amazon: $${amazonProduct.price.toFixed(2)} ⭐ ${amazonProduct.rating || 'N/A'}`);

      const analysis = calculateProfit(ebayProduct.price, amazonProduct.price);

      if (analysis.profit > 5 && analysis.roi > 20) {
        console.log(`   💚 PROFIT: $${analysis.profit.toFixed(2)} (${analysis.roi.toFixed(1)}% ROI) ✨`);

        opportunities.push({
          ebay: ebayProduct,
          amazon: amazonProduct,
          analysis
        });
      } else if (analysis.profit > 0) {
        console.log(`   💛 Small profit: $${analysis.profit.toFixed(2)} (${analysis.roi.toFixed(1)}% ROI)`);
      } else {
        console.log(`   ❌ No profit: $${analysis.profit.toFixed(2)}`);
      }
    } else {
      console.log(`   ⚠️  Not found on Amazon`);
    }

    // Rate limit (1 second between requests)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Products Analyzed: ${ebayProducts.slice(0, 5).length}`);
  console.log(`Profitable Opportunities: ${opportunities.length}`);

  if (opportunities.length > 0) {
    console.log('\n🎯 TOP OPPORTUNITIES:');
    opportunities
      .sort((a, b) => b.analysis.profit - a.analysis.profit)
      .forEach((opp, i) => {
        console.log(`\n${i + 1}. ${opp.ebay.title.substring(0, 50)}...`);
        console.log(`   Buy on eBay: $${opp.analysis.ebayPrice.toFixed(2)}`);
        console.log(`   Sell on Amazon: $${opp.analysis.amazonPrice.toFixed(2)}`);
        console.log(`   💰 Profit: $${opp.analysis.profit.toFixed(2)} (${opp.analysis.roi.toFixed(1)}% ROI)`);
        console.log(`   eBay: ${opp.ebay.link}`);
        console.log(`   Amazon: ${opp.amazon.link}`);
      });
  } else {
    console.log('\n⚠️  No profitable opportunities found in this batch.');
    console.log('   Try different search terms or categories.');
  }

  console.log('\n' + '='.repeat(70));
}

// Test with popular product category
const searchTerms = [
  'Nintendo Switch games',
  'Apple AirPods',
  'Wireless earbuds',
  'iPhone charger',
  'Gaming headset'
];

async function main() {
  const searchTerm = process.argv[2] || searchTerms[Math.floor(Math.random() * searchTerms.length)];

  console.log('\n🚀 Starting real web scraping arbitrage test...');
  console.log(`   Search: "${searchTerm}"`);

  await findArbitrageOpportunities(searchTerm);
}

main().catch(console.error);
