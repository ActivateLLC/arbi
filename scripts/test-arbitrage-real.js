#!/usr/bin/env node

/**
 * Test real arbitrage opportunities using Rainforest API
 * Uses sample eBay-like pricing and checks real Amazon prices
 */

const axios = require('axios');

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;

// Sample products with realistic eBay-like prices
const sampleProducts = [
  { title: 'Nintendo Switch OLED Model White', ebayPrice: 299.99 },
  { title: 'Apple AirPods Pro 2nd Generation', ebayPrice: 189.99 },
  { title: 'Sony WH-1000XM5 Wireless Headphones Black', ebayPrice: 329.99 },
  { title: 'Samsung Galaxy Buds2 Pro', ebayPrice: 149.99 },
  { title: 'Apple Watch Series 9 GPS 45mm', ebayPrice: 379.99 },
  { title: 'iPad 10th Generation 64GB WiFi', ebayPrice: 299.99 },
  { title: 'Bose QuietComfort 45 Headphones', ebayPrice: 279.99 },
  { title: 'GoPro HERO11 Black', ebayPrice: 349.99 },
  { title: 'Kindle Paperwhite 16GB', ebayPrice: 119.99 },
  { title: 'Ring Video Doorbell Pro 2', ebayPrice: 199.99 }
];

async function getAmazonPrice(productTitle) {
  if (!RAINFOREST_API_KEY) {
    console.log('\n❌ RAINFOREST_API_KEY not set!');
    console.log('Set it: export RAINFOREST_API_KEY=your_key_here');
    process.exit(1);
  }

  try {
    const response = await axios.get('https://api.rainforestapi.com/request', {
      params: {
        api_key: RAINFOREST_API_KEY,
        type: 'search',
        amazon_domain: 'amazon.com',
        search_term: productTitle,
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
        link: firstResult.link,
        thumbnail: firstResult.image
      };
    }

    return null;

  } catch (error) {
    if (error.response?.status === 429) {
      console.log('   ⚠️  Rate limit - waiting...');
      return null;
    }
    console.error(`   ⚠️  Amazon lookup failed: ${error.message}`);
    return null;
  }
}

function calculateProfit(ebayPrice, amazonPrice) {
  // eBay fees
  const ebayFinalValue = ebayPrice * 0.1295; // 12.95% final value fee
  const ebayTransaction = 0.30; // $0.30 transaction fee

  // Amazon fees (if selling there)
  const amazonReferral = amazonPrice * 0.15; // 15% referral fee

  // Costs
  const shippingCost = 0; // Free shipping absorbed in price
  const paypalFee = ebayPrice * 0.0349 + 0.49; // PayPal 3.49% + $0.49

  const totalFees = ebayFinalValue + ebayTransaction + paypalFee;
  const totalCost = ebayPrice + totalFees + shippingCost;
  const revenue = amazonPrice;
  const profit = revenue - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    ebayPrice,
    amazonPrice,
    totalFees: totalFees.toFixed(2),
    totalCost: totalCost.toFixed(2),
    revenue: revenue.toFixed(2),
    profit: profit.toFixed(2),
    roi: roi.toFixed(1)
  };
}

function scoreOpportunity(analysis, amazonProduct) {
  let score = 0;

  // Profit points (0-40)
  const profit = parseFloat(analysis.profit);
  if (profit > 50) score += 40;
  else if (profit > 30) score += 30;
  else if (profit > 20) score += 25;
  else if (profit > 10) score += 15;
  else if (profit > 5) score += 10;

  // ROI points (0-30)
  const roi = parseFloat(analysis.roi);
  if (roi > 40) score += 30;
  else if (roi > 30) score += 25;
  else if (roi > 20) score += 20;
  else if (roi > 15) score += 15;
  else if (roi > 10) score += 10;

  // Rating points (0-20)
  if (amazonProduct.rating >= 4.5) score += 20;
  else if (amazonProduct.rating >= 4.0) score += 15;
  else if (amazonProduct.rating >= 3.5) score += 10;
  else if (amazonProduct.rating >= 3.0) score += 5;

  // Price range points (0-10)
  const amazonPrice = parseFloat(analysis.amazonPrice);
  if (amazonPrice >= 100 && amazonPrice <= 400) score += 10; // Sweet spot
  else if (amazonPrice >= 50 && amazonPrice <= 500) score += 7;
  else score += 3;

  return Math.min(100, Math.round(score));
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 REAL ARBITRAGE OPPORTUNITY SCANNER');
  console.log('='.repeat(70));
  console.log('\n📊 Analyzing products with REAL Amazon prices via Rainforest API...\n');

  const opportunities = [];
  let analyzed = 0;
  let creditsUsed = 0;

  for (const product of sampleProducts) {
    console.log(`📦 ${product.title}`);
    console.log(`   eBay: $${product.ebayPrice.toFixed(2)}`);

    const amazonProduct = await getAmazonPrice(product.title);
    analyzed++;
    creditsUsed++;

    if (amazonProduct && amazonProduct.price > 0) {
      console.log(`   Amazon: $${amazonProduct.price.toFixed(2)} ⭐ ${amazonProduct.rating || 'N/A'}`);

      const analysis = calculateProfit(product.ebayPrice, amazonProduct.price);
      const score = scoreOpportunity(analysis, amazonProduct);

      const profit = parseFloat(analysis.profit);
      const roi = parseFloat(analysis.roi);

      if (profit > 5 && roi > 15) {
        console.log(`   💚 Score: ${score}/100 | Profit: $${analysis.profit} (${analysis.roi}% ROI) ✨\n`);

        opportunities.push({
          product,
          amazon: amazonProduct,
          analysis,
          score
        });
      } else if (profit > 0) {
        console.log(`   💛 Score: ${score}/100 | Small profit: $${analysis.profit} (${analysis.roi}% ROI)\n`);
      } else {
        console.log(`   ❌ Score: ${score}/100 | Loss: $${analysis.profit}\n`);
      }
    } else {
      console.log(`   ⚠️  Not found on Amazon or price unavailable\n`);
    }

    // Rate limit (1 second between requests to be nice to Rainforest API)
    if (analyzed < sampleProducts.length) {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }

  // Summary
  console.log('='.repeat(70));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`Products Analyzed: ${analyzed}`);
  console.log(`Profitable Opportunities: ${opportunities.length}`);
  console.log(`Rainforest API Credits Used: ${creditsUsed}\n`);

  if (opportunities.length > 0) {
    console.log('🎯 TOP ARBITRAGE OPPORTUNITIES:\n');

    opportunities
      .sort((a, b) => b.score - a.score)
      .forEach((opp, i) => {
        console.log(`${i + 1}. ${opp.product.title}`);
        console.log(`   Score: ${opp.score}/100 ⭐`);
        console.log(`   Buy: $${opp.analysis.ebayPrice} → Sell: $${opp.analysis.amazonPrice}`);
        console.log(`   💰 NET PROFIT: $${opp.analysis.profit} (${opp.analysis.roi}% ROI)`);
        console.log(`   Amazon Rating: ${opp.amazon.rating || 'N/A'} ⭐`);
        console.log(`   ASIN: ${opp.amazon.asin}`);
        console.log(`   Link: ${opp.amazon.link}`);
        console.log();
      });

    const totalProfit = opportunities.reduce((sum, opp) => sum + parseFloat(opp.analysis.profit), 0);
    const avgROI = opportunities.reduce((sum, opp) => sum + parseFloat(opp.analysis.roi), 0) / opportunities.length;

    console.log('💵 SUMMARY:');
    console.log(`   Total Potential Profit: $${totalProfit.toFixed(2)}`);
    console.log(`   Average ROI: ${avgROI.toFixed(1)}%`);
    console.log(`   Best Opportunity: ${opportunities[0].product.title} (Score: ${opportunities[0].score}/100)`);

  } else {
    console.log('⚠️  No profitable opportunities found.');
    console.log('   This could mean:');
    console.log('   - Prices are currently unfavorable');
    console.log('   - Need to check different product categories');
    console.log('   - Amazon prices have risen recently');
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Analysis complete!');
  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
