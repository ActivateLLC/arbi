// Demo script to show arbitrage opportunities
const { ArbitrageEngine } = require('./packages/arbitrage-engine/dist/index.js');

async function demo() {
  console.log('\n🤖 ARBI AUTONOMOUS ARBITRAGE ENGINE - LIVE DEMO\n');
  console.log('=' .repeat(70));

  const engine = new ArbitrageEngine();

  // User settings
  const userSettings = {
    dailyLimit: 500,
    perOpportunityMax: 200,
    monthlyLimit: 5000,
    reserveFund: 1000,
    riskTolerance: 'moderate',
    enabledStrategies: ['ecommerce_arbitrage']
  };

  // Scout configuration
  const config = {
    enabled: true,
    scanInterval: 60,
    sources: ['amazon', 'ebay', 'walmart', 'target'],
    filters: {
      minProfit: 10,
      minROI: 5,
      maxPrice: 500
    }
  };

  console.log('\n🔍 Scanning for arbitrage opportunities...\n');

  // Find opportunities
  const opportunities = await engine.findOpportunities(config);

  console.log(`✅ Found ${opportunities.length} opportunities!\n`);

  // Analyze top opportunities
  const userId = 'demo-user';

  for (let i = 0; i < Math.min(5, opportunities.length); i++) {
    const opp = opportunities[i];
    const evaluation = await engine.evaluateOpportunity(opp, userId, userSettings);

    console.log(`\n📦 OPPORTUNITY #${i + 1}`);
    console.log('─'.repeat(70));
    console.log(`Product: ${opp.title}`);
    console.log(`Category: ${opp.category}`);
    console.log(`\n💰 FINANCIALS:`);
    console.log(`   Buy Price: $${opp.buyPrice.toFixed(2)} (${opp.buySource})`);
    console.log(`   Sell Price: $${opp.sellPrice.toFixed(2)} (${opp.sellSource})`);
    console.log(`   Estimated Profit: $${opp.estimatedProfit.toFixed(2)}`);
    console.log(`   ROI: ${opp.roi.toFixed(1)}%`);

    console.log(`\n📊 ANALYSIS:`);
    console.log(`   AI Score: ${evaluation.analysis.score}/100`);
    console.log(`   Confidence: ${opp.confidence}%`);
    console.log(`   Risk Level: ${opp.riskLevel.toUpperCase()}`);
    console.log(`   Time to Profit: ${opp.estimatedTimeToProfit} days`);

    console.log(`\n💡 WHY THIS WORKS:`);
    evaluation.analysis.reasons.forEach(reason => {
      console.log(`   ✓ ${reason}`);
    });

    if (evaluation.analysis.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS:`);
      evaluation.analysis.warnings.forEach(warning => {
        console.log(`   ! ${warning}`);
      });
    }

    console.log(`\n🎯 RECOMMENDATION: ${evaluation.recommended ? '✅ EXECUTE' : '❌ SKIP'}`);

    if (evaluation.recommended) {
      console.log(`\n💵 PROFIT SCENARIOS:`);
      console.log(`   Best Case:  $${evaluation.analysis.estimatedOutcome.bestCase.toFixed(2)}`);
      console.log(`   Likely:     $${evaluation.analysis.estimatedOutcome.likelyCase.toFixed(2)}`);
      console.log(`   Worst Case: $${evaluation.analysis.estimatedOutcome.worstCase.toFixed(2)}`);

      // Show detailed fee breakdown
      if (opp.metadata && opp.metadata.profitBreakdown) {
        console.log(`\n📝 DETAILED BREAKDOWN:`);
        const pb = opp.metadata.profitBreakdown;
        console.log(`   Sell Price:     +$${pb.sellPrice.toFixed(2)}`);
        console.log(`   Buy Cost:       -$${pb.minus.buyPrice.toFixed(2)}`);
        console.log(`   Selling Fees:   -$${pb.minus.sellingFees.toFixed(2)} (13%)`);
        console.log(`   Shipping:       -$${pb.minus.shippingCost.toFixed(2)}`);
        console.log(`   ────────────────────────`);
        console.log(`   NET PROFIT:     $${pb.netProfit.toFixed(2)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 HOW TO EXECUTE:\n');
  console.log('1. Go to the buy source and purchase the item');
  console.log('2. List it on the sell platform');
  console.log('3. Wait for it to sell (average: 3-14 days)');
  console.log('4. Ship to buyer and collect profit!');
  console.log('\n🎯 Platform takes 25% of profit, you keep 75%');
  console.log('\n🚀 This is fully automatable with payment integration!\n');
}

demo().catch(console.error);
