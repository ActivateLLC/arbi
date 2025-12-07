/**
 * Example: Using Volatility Strategies with Arbi
 * 
 * This example demonstrates how to:
 * 1. Enable volatility strategies in your configuration
 * 2. Update market conditions with VIX data
 * 3. Analyze volatility-based opportunities
 * 4. Use market-aware risk assessment
 */

import { 
  ArbitrageEngine, 
  type Opportunity,
  type UserBudgetSettings 
} from '@arbi/arbitrage-engine';

// Initialize the arbitrage engine
const engine = new ArbitrageEngine();

// Configure user settings with volatility strategies enabled
const userSettings: UserBudgetSettings = {
  dailyLimit: 1000,
  perOpportunityMax: 400,
  monthlyLimit: 10000,
  reserveFund: 1000,
  riskTolerance: 'moderate',
  enabledStrategies: [
    'ecommerce_arbitrage',
    'short_condor',        // Volatility strategy
    'short_strangle',      // Volatility strategy
    'bearish_spread',      // Bearish strategy
    'volatility_arbitrage' // Volatility arbitrage
  ],
  volatilityConfig: {
    enabledDuringHighVix: true,  // Enable volatility strategies during high VIX
    vixThreshold: 25,            // Minimum VIX level to enable (25 = elevated volatility)
    maxVolatilityExposure: 0.3   // Max 30% of budget for volatility strategies
  }
};

// Example 1: Update market conditions with current VIX
async function updateMarketData() {
  console.log('\n=== Example 1: Updating Market Conditions ===');
  
  // In production, fetch real VIX data from a data provider
  // For this example, we'll simulate different VIX levels
  
  // Scenario A: Low volatility (calm markets)
  console.log('\nScenario A: Low VIX (12) - Calm markets');
  let conditions = engine.updateMarketConditions(12);
  console.log('Market Conditions:', {
    vixLevel: conditions.vixLevel,
    volatilityState: conditions.volatilityState, // 'low'
    trend: conditions.trend
  });
  
  // Scenario B: Elevated volatility
  console.log('\nScenario B: Elevated VIX (28) - High volatility');
  conditions = engine.updateMarketConditions(28);
  console.log('Market Conditions:', {
    vixLevel: conditions.vixLevel,
    volatilityState: conditions.volatilityState, // 'high'
    trend: conditions.trend
  });
  
  // Scenario C: Extreme volatility (market panic)
  console.log('\nScenario C: Extreme VIX (45) - Market panic');
  conditions = engine.updateMarketConditions(45);
  console.log('Market Conditions:', {
    vixLevel: conditions.vixLevel,
    volatilityState: conditions.volatilityState, // 'extreme'
    trend: conditions.trend
  });
  
  // Get VIX statistics
  const vixStats = engine.getVixStats();
  console.log('\nVIX Statistics:', vixStats);
}

// Example 2: Analyze a volatility strategy opportunity
async function analyzeVolatilityOpportunity() {
  console.log('\n=== Example 2: Analyzing Volatility Opportunity ===');
  
  // Set high VIX environment
  engine.updateMarketConditions(32);
  
  // Mock short condor opportunity
  const shortCondorOpportunity: Opportunity = {
    id: 'opp_001',
    type: 'short_condor',
    title: 'SPY Short Iron Condor - High Volatility Play',
    description: 'Short iron condor on SPY with wide strikes during elevated VIX',
    
    // Financial details
    buyPrice: 250,           // Cost to enter position
    sellPrice: 400,          // Potential maximum profit
    estimatedProfit: 150,    // $150 profit potential
    roi: 60,                 // 60% ROI
    
    // Risk metrics
    confidence: 75,          // 75% confidence based on historical data
    riskLevel: 'medium',
    volatility: 80,          // High volatility = good for this strategy
    
    // Timing
    discoveredAt: new Date(),
    estimatedTimeToProfit: 14, // 2 weeks until expiration
    
    // Sources
    buySource: 'Options Market',
    sellSource: 'Options Market',
    
    // Metadata
    category: 'Options',
    metadata: {
      underlying: 'SPY',
      strikeWidth: 10,
      daysToExpiration: 14
    }
  };
  
  // Analyze the opportunity
  const analysis = engine.analyzeOpportunity(shortCondorOpportunity);
  
  console.log('\nOpportunity Analysis:');
  console.log('- Score:', analysis.score);
  console.log('- Should Execute:', analysis.shouldExecute);
  console.log('- Reasons:', analysis.reasons);
  console.log('- Warnings:', analysis.warnings);
  console.log('- Estimated Outcomes:', analysis.estimatedOutcome);
}

// Example 3: Risk assessment for volatility strategy
async function assessVolatilityRisk() {
  console.log('\n=== Example 3: Risk Assessment ===');
  
  const userId = 'user_123';
  
  // Test with different VIX levels
  console.log('\nTest 1: VIX below threshold (VIX = 20)');
  engine.updateMarketConditions(20);
  
  const opportunity: Opportunity = {
    id: 'opp_002',
    type: 'short_strangle',
    title: 'Short Strangle Strategy',
    description: 'Profit from high volatility movement',
    buyPrice: 300,
    sellPrice: 500,
    estimatedProfit: 200,
    roi: 66,
    confidence: 70,
    riskLevel: 'medium',
    volatility: 75,
    discoveredAt: new Date(),
    estimatedTimeToProfit: 7,
    buySource: 'Options Market',
    sellSource: 'Options Market',
    category: 'Options',
    metadata: {}
  };
  
  let riskAssessment = engine.assessRisk(opportunity, userId, userSettings);
  console.log('Risk Assessment:', {
    approved: riskAssessment.approved,
    riskScore: riskAssessment.riskScore,
    reasons: riskAssessment.reasons
  });
  
  // Test with VIX above threshold
  console.log('\nTest 2: VIX above threshold (VIX = 30)');
  engine.updateMarketConditions(30);
  
  riskAssessment = engine.assessRisk(opportunity, userId, userSettings);
  console.log('Risk Assessment:', {
    approved: riskAssessment.approved,
    riskScore: riskAssessment.riskScore,
    reasons: riskAssessment.reasons
  });
}

// Example 4: Complete workflow
async function completeWorkflow() {
  console.log('\n=== Example 4: Complete Workflow ===');
  
  const userId = 'user_123';
  
  // Step 1: Update market conditions
  console.log('\nStep 1: Update market conditions');
  const conditions = engine.updateMarketConditions(35); // High VIX
  console.log('Current VIX:', conditions.vixLevel);
  console.log('Volatility State:', conditions.volatilityState);
  console.log('Market Trend:', conditions.trend);
  
  // Step 2: Create a bearish spread opportunity
  console.log('\nStep 2: Evaluate bearish spread opportunity');
  const bearishSpread: Opportunity = {
    id: 'opp_003',
    type: 'bearish_spread',
    title: 'Bear Put Spread on QQQ',
    description: 'Profit from expected market decline',
    buyPrice: 200,
    sellPrice: 350,
    estimatedProfit: 150,
    roi: 75,
    confidence: 80,
    riskLevel: 'medium',
    volatility: 70,
    discoveredAt: new Date(),
    estimatedTimeToProfit: 10,
    buySource: 'Options Market',
    sellSource: 'Options Market',
    category: 'Options',
    metadata: {
      underlying: 'QQQ',
      strategy: 'bear_put_spread'
    }
  };
  
  // Step 3: Complete evaluation
  const evaluation = await engine.evaluateOpportunity(
    bearishSpread,
    userId,
    userSettings
  );
  
  console.log('\nEvaluation Results:');
  console.log('- Analysis Score:', evaluation.analysis.score);
  console.log('- Risk Approved:', evaluation.riskAssessment.approved);
  console.log('- Recommended:', evaluation.recommended);
  console.log('- Key Reasons:', evaluation.analysis.reasons.slice(0, 3));
  
  // Step 4: If approved and recommended, you would execute
  if (evaluation.recommended) {
    console.log('\n✅ Opportunity RECOMMENDED for execution');
    // In production: execute the trade
    // engine.recordExecution(userId, bearishSpread);
  } else {
    console.log('\n❌ Opportunity NOT recommended');
  }
}

// Example 5: Monitor VIX and enable strategies dynamically
async function monitorMarketConditions() {
  console.log('\n=== Example 5: Dynamic Market Monitoring ===');
  
  // Simulate VIX changes over time
  const vixLevels = [15, 18, 22, 28, 35, 42, 38, 30, 25, 20];
  
  console.log('\nSimulating market volatility changes:');
  for (const vixLevel of vixLevels) {
    const conditions = engine.updateMarketConditions(vixLevel);
    
    console.log(`\nVIX: ${vixLevel}`);
    console.log(`  State: ${conditions.volatilityState}`);
    console.log(`  Trend: ${conditions.trend}`);
    console.log(`  Volatility strategies enabled: ${vixLevel >= 25 ? '✅ YES' : '❌ NO'}`);
    
    // Simulate delay between updates
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Show final statistics
  const stats = engine.getVixStats();
  console.log('\nFinal VIX Statistics:');
  console.log('- Current:', stats?.current);
  console.log('- Average:', stats?.average);
  console.log('- Range:', `${stats?.min} - ${stats?.max}`);
  console.log('- Percentile:', `${stats?.percentile}th`);
}

// Run all examples
async function main() {
  console.log('🚀 Volatility Strategies Examples\n');
  console.log('This demonstrates how to use bearish and volatility strategies');
  console.log('with the Arbi arbitrage engine during high market volatility.\n');
  
  try {
    await updateMarketData();
    await analyzeVolatilityOpportunity();
    await assessVolatilityRisk();
    await completeWorkflow();
    await monitorMarketConditions();
    
    console.log('\n✅ All examples completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Integrate real VIX data from a provider (Yahoo Finance, Alpha Vantage, etc.)');
    console.log('2. Set up periodic VIX updates (every 5-15 minutes)');
    console.log('3. Configure your volatility strategy preferences');
    console.log('4. Start finding opportunities during high volatility periods');
    console.log('\nSee VOLATILITY_STRATEGIES.md for complete documentation.');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  updateMarketData,
  analyzeVolatilityOpportunity,
  assessVolatilityRisk,
  completeWorkflow,
  monitorMarketConditions
};
