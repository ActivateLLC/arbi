#!/usr/bin/env node
/**
 * REAL Multi-Platform Arbitrage Scanner
 * Platforms: Amazon, Walmart, Target, Best Buy
 * NO EBAY - Uses web scraping and public APIs
 */

const axios = require('axios');
const cheerio = require('cheerio');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const formatCurrency = (num) => `$${num.toFixed(2)}`;

/**
 * Scrape Walmart search results
 */
async function scrapeWalmartPrices(query) {
  try {
    console.log(`   ├─ Searching Walmart for "${query}"...`);

    // Walmart search URL
    const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000
    });

    // Walmart returns data in a script tag
    const html = response.data;

    // Try to extract product data from __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);

    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const searchResults = data?.props?.pageProps?.initialData?.searchResult?.itemStacks?.[0]?.items || [];

        const prices = searchResults
          .filter(item => item.price && item.__typename === 'Product')
          .slice(0, 5)
          .map(item => ({
            title: item.name,
            price: parseFloat(item.priceInfo?.currentPrice?.price || 0),
            url: `https://www.walmart.com${item.canonicalUrl}`,
            available: item.availabilityStatus === 'IN_STOCK'
          }))
          .filter(p => p.price > 0 && p.available);

        if (prices.length > 0) {
          const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
          console.log(`   ├─ Found ${prices.length} Walmart results`);
          console.log(`   ├─ Average price: ${formatCurrency(avgPrice)}`);
          return { source: 'Walmart', prices, avgPrice };
        }
      } catch (parseError) {
        console.log(`   └─ Could not parse Walmart data structure`);
      }
    }

    return null;
  } catch (error) {
    console.log(`   └─ Walmart error: ${error.message}`);
    return null;
  }
}

/**
 * Scrape Amazon search results
 */
async function scrapeAmazonPrices(query) {
  try {
    console.log(`   ├─ Searching Amazon for "${query}"...`);

    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const prices = [];

    // Amazon's price selectors
    $('[data-component-type="s-search-result"]').each((i, elem) => {
      if (i >= 5) return; // Limit to first 5 results

      const title = $(elem).find('h2 a span').first().text().trim();
      const priceWhole = $(elem).find('.a-price-whole').first().text().replace(',', '');
      const priceFraction = $(elem).find('.a-price-fraction').first().text();

      if (priceWhole && title) {
        const price = parseFloat(`${priceWhole}.${priceFraction || '00'}`);
        if (price > 0 && price < 10000) {
          prices.push({ title, price });
        }
      }
    });

    if (prices.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
      console.log(`   ├─ Found ${prices.length} Amazon results`);
      console.log(`   ├─ Average price: ${formatCurrency(avgPrice)}`);
      return { source: 'Amazon', prices, avgPrice };
    }

    return null;
  } catch (error) {
    console.log(`   └─ Amazon error: ${error.message}`);
    return null;
  }
}

/**
 * Scrape Target search results
 */
async function scrapeTargetPrices(query) {
  try {
    console.log(`   ├─ Searching Target for "${query}"...`);

    // Target API endpoint (public, no auth needed)
    const searchUrl = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&pricing_store_id=3991&search_term=${encodeURIComponent(query)}&visitor_id=guest`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 15000
    });

    const products = response.data?.data?.search?.products || [];

    const prices = products
      .slice(0, 5)
      .map(item => {
        const price = item.price?.current_retail || item.price?.reg_retail || 0;
        return {
          title: item.item?.product_description?.title,
          price: parseFloat(price),
          available: item.fulfillment?.is_out_of_stock_in_all_store_locations === false
        };
      })
      .filter(p => p.price > 0 && p.title && p.available);

    if (prices.length > 0) {
      const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
      console.log(`   ├─ Found ${prices.length} Target results`);
      console.log(`   ├─ Average price: ${formatCurrency(avgPrice)}`);
      return { source: 'Target', prices, avgPrice };
    }

    return null;
  } catch (error) {
    console.log(`   └─ Target error: ${error.message}`);
    return null;
  }
}

/**
 * Calculate arbitrage profit
 */
function calculateProfit(buyPrice, sellPrice, buyPlatform, sellPlatform) {
  // Platform fees
  const fees = {
    'Amazon': 0.15,    // 15% Amazon FBA
    'Walmart': 0.15,   // 15% Walmart Marketplace
    'Target': 0.12,    // 12% if selling on Target+
    'BestBuy': 0.15,   // Estimated marketplace fee
  };

  const sellingFee = sellPrice * (fees[sellPlatform] || 0.15);
  const shippingCost = 8.00; // Average shipping
  const netProfit = sellPrice - buyPrice - sellingFee - shippingCost;
  const roi = (netProfit / buyPrice) * 100;

  return {
    buyPrice,
    sellPrice,
    buyPlatform,
    sellPlatform,
    sellingFee,
    shippingCost,
    netProfit,
    roi,
    totalCost: buyPrice + shippingCost,
    margin: ((sellPrice - buyPrice - sellingFee - shippingCost) / sellPrice) * 100
  };
}

/**
 * Main arbitrage scanner
 */
async function findArbitrageOpportunities() {
  console.log('\n🚀 REAL ARBITRAGE SCANNER - Multi-Platform Analysis\n');
  console.log('━'.repeat(70));
  console.log('Platforms: Amazon, Walmart, Target');
  console.log('Method: Web scraping + Public APIs (NO API KEYS REQUIRED)');
  console.log('━'.repeat(70));

  // Popular products to check
  const products = [
    'Apple AirPods Pro',
    'Nintendo Switch OLED',
    'PlayStation 5',
    'Dyson V11 Vacuum',
    'KitchenAid Stand Mixer',
    'Instant Pot Duo',
    'Sony WH-1000XM5',
    'iPad 10th Generation',
  ];

  const opportunities = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    console.log(`\n[${i + 1}/${products.length}] 📦 Analyzing: ${product}`);
    console.log('─'.repeat(70));

    // Scrape all platforms
    const amazonData = await scrapeAmazonPrices(product);
    await sleep(2000); // Rate limiting

    const walmartData = await scrapeWalmartPrices(product);
    await sleep(2000);

    const targetData = await scrapeTargetPrices(product);
    await sleep(2000);

    // Compile results
    const results = [amazonData, walmartData, targetData].filter(Boolean);

    if (results.length < 2) {
      console.log(`\n   ⚠️  Insufficient data (need at least 2 platforms)`);
      continue;
    }

    // Find arbitrage opportunities
    console.log(`\n   📊 Price Comparison:`);
    results.forEach(r => {
      console.log(`   ├─ ${r.source}: ${formatCurrency(r.avgPrice)}`);
    });

    // Find buy low, sell high combinations
    for (const buyFrom of results) {
      for (const sellTo of results) {
        if (buyFrom.source === sellTo.source) continue;

        const profit = calculateProfit(
          buyFrom.avgPrice,
          sellTo.avgPrice,
          buyFrom.source,
          sellTo.source
        );

        // Criteria: Min $15 profit, Min 15% ROI
        if (profit.netProfit >= 15 && profit.roi >= 15) {
          opportunities.push({
            product,
            ...profit
          });

          console.log(`\n   ✅ PROFIT OPPORTUNITY FOUND!`);
          console.log(`   ├─ Buy from: ${profit.buyPlatform} @ ${formatCurrency(profit.buyPrice)}`);
          console.log(`   ├─ Sell on: ${profit.sellPlatform} @ ${formatCurrency(profit.sellPrice)}`);
          console.log(`   ├─ Fees: ${formatCurrency(profit.sellingFee + profit.shippingCost)}`);
          console.log(`   ├─ NET PROFIT: ${formatCurrency(profit.netProfit)} 💰`);
          console.log(`   ├─ ROI: ${profit.roi.toFixed(1)}% 📈`);
          console.log(`   └─ Margin: ${profit.margin.toFixed(1)}%`);
        }
      }
    }
  }

  // Print summary
  console.log('\n' + '━'.repeat(70));
  console.log('\n📈 ARBITRAGE OPPORTUNITIES SUMMARY:\n');

  if (opportunities.length === 0) {
    console.log('❌ No profitable opportunities found with current criteria.');
    console.log('   Requirements: Min $15 profit, Min 15% ROI\n');
    console.log('💡 Try again later or adjust criteria for more results.\n');
    return;
  }

  // Sort by profit
  opportunities.sort((a, b) => b.netProfit - a.netProfit);

  let totalProfit = 0;
  let totalInvestment = 0;

  opportunities.forEach((opp, index) => {
    console.log(`\n${index + 1}. ${opp.product}`);
    console.log(`   ├─ Buy: ${opp.buyPlatform} @ ${formatCurrency(opp.buyPrice)}`);
    console.log(`   ├─ Sell: ${opp.sellPlatform} @ ${formatCurrency(opp.sellPrice)}`);
    console.log(`   ├─ Fees: ${formatCurrency(opp.sellingFee + opp.shippingCost)}`);
    console.log(`   ├─ NET PROFIT: ${formatCurrency(opp.netProfit)} 💰`);
    console.log(`   ├─ ROI: ${opp.roi.toFixed(1)}% 📈`);
    console.log(`   └─ Margin: ${opp.margin.toFixed(1)}%`);

    totalProfit += opp.netProfit;
    totalInvestment += opp.totalCost;
  });

  console.log('\n' + '─'.repeat(70));
  console.log(`\n💰 TOTAL POTENTIAL PROFIT: ${formatCurrency(totalProfit)}`);
  console.log(`💵 TOTAL INVESTMENT NEEDED: ${formatCurrency(totalInvestment)}`);
  console.log(`📊 AVERAGE ROI: ${((totalProfit / totalInvestment) * 100).toFixed(1)}%`);
  console.log(`🎯 OPPORTUNITIES FOUND: ${opportunities.length}`);
  console.log(`\n✅ Scan complete!\n`);
  console.log('━'.repeat(70) + '\n');
}

// Run the scanner
console.log('\n⏳ Starting scan... This will take a few minutes.\n');
findArbitrageOpportunities().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error(error.stack);
  process.exit(1);
});
