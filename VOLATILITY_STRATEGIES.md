# Volatility Strategies Guide

## Overview

The Arbi arbitrage engine now supports **bearish and volatility-based strategies** that capitalize on extreme market volatility. These strategies are particularly valuable during periods of high market uncertainty, as indicated by elevated VIX levels.

## Supported Volatility Strategies

### 1. Short Condor (`short_condor`)
A neutral options strategy that profits from high volatility. The strategy involves selling options at middle strikes and buying options at outer strikes. Maximum profit occurs when the underlying asset moves significantly in either direction.

**Best Used When:**
- VIX > 25
- Expecting large price movements but uncertain of direction
- High implied volatility environment

### 2. Short Strangle (`short_strangle`)
An options strategy that profits when the underlying asset experiences large price movements. Involves selling both a call and a put option at different strike prices.

**Best Used When:**
- VIX > 30
- High volatility expected
- Significant price movement anticipated

### 3. Short Straddle (`short_straddle`)
A neutral strategy that profits from low volatility. Involves selling both a call and a put at the same strike price.

**Best Used When:**
- Expecting volatility to decrease
- Range-bound market anticipated
- High implied volatility currently

### 4. Bearish Spread (`bearish_spread`)
Options spread strategies that profit from downward price movements, including bear put spreads and bear call spreads.

**Best Used When:**
- Market trend is bearish
- VIX rising
- Expecting moderate to significant downward movement

### 5. Volatility Arbitrage (`volatility_arbitrage`)
Exploits differences between implied volatility (option prices) and realized volatility (actual price movements).

**Best Used When:**
- Mispricing detected between implied and realized volatility
- High VIX with opportunities for mean reversion
- Cross-market volatility differences

## Market Conditions and VIX Integration

### VIX (Volatility Index) Levels

The system tracks VIX levels to determine market volatility state:

- **Low Volatility** (VIX < 15): Calm markets, normal conditions
- **Moderate Volatility** (VIX 15-25): Normal market volatility
- **High Volatility** (VIX 25-40): Elevated fear/uncertainty - **VOLATILITY STRATEGIES ENABLED**
- **Extreme Volatility** (VIX > 40): Market panic/crisis - **MAXIMUM OPPORTUNITY**

### Market Trend Detection

The system analyzes VIX movement to determine market sentiment:

- **Bearish**: Rising VIX indicates increasing fear and downward pressure
- **Bullish**: Falling VIX indicates confidence and upward movement
- **Neutral**: Stable VIX suggests consolidation

## Configuration

### Enabling Volatility Strategies

Add volatility configuration to your user budget settings:

```typescript
const settings: UserBudgetSettings = {
  dailyLimit: 1000,
  perOpportunityMax: 400,
  monthlyLimit: 10000,
  reserveFund: 1000,
  riskTolerance: 'moderate',
  enabledStrategies: [
    'ecommerce_arbitrage',
    'short_condor',          // Enable during high volatility
    'short_strangle',        // Enable during high volatility
    'bearish_spread',        // Enable during bearish trends
    'volatility_arbitrage'   // Enable for volatility mispricing
  ],
  volatilityConfig: {
    enabledDuringHighVix: true,    // Enable volatility strategies when VIX elevated
    vixThreshold: 25,              // Minimum VIX level to enable (default: 25)
    maxVolatilityExposure: 0.3     // Max 30% of budget for volatility strategies
  }
};
```

### Using the ArbitrageEngine with Market Conditions

```typescript
import { ArbitrageEngine } from '@arbi/arbitrage-engine';

const engine = new ArbitrageEngine();

// Update market conditions (should be done periodically)
const vixLevel = 32.5; // Current VIX level
const conditions = engine.updateMarketConditions(vixLevel);

console.log('Market Conditions:', {
  vixLevel: conditions.vixLevel,
  volatilityState: conditions.volatilityState, // 'high'
  trend: conditions.trend                       // 'bearish'
});

// Get VIX statistics
const vixStats = engine.getVixStats();
console.log('VIX Stats:', {
  current: vixStats.current,
  average: vixStats.average,
  percentile: vixStats.percentile  // 85th percentile = high volatility
});

// Analyze opportunities with market-aware scoring
const opportunity = {
  type: 'short_condor',
  volatility: 75,  // High volatility
  // ... other opportunity properties
};

const analysis = engine.analyzeOpportunity(opportunity);
// Analysis will include market condition bonuses for volatility strategies
```

## How It Works

### 1. Market Monitoring

The `MarketIndicatorService` continuously tracks:
- Current VIX level
- VIX history (last 100 readings)
- Volatility state (low/moderate/high/extreme)
- Market trend (bullish/bearish/neutral)

### 2. Strategy Enablement

Volatility strategies are **automatically enabled** when:
- `volatilityConfig.enabledDuringHighVix` is `true`
- Current VIX level >= `vixThreshold` (default: 25)
- Strategy is in `enabledStrategies` list

### 3. Enhanced Scoring

For volatility strategies, the scoring algorithm:
- **Rewards high volatility** (opposite of standard strategies)
- **Adds bonus points** during extreme volatility (up to +10 points)
- **Considers market trend** (bearish trends boost bearish strategies)
- **Evaluates VIX percentile** (higher percentile = better opportunity)

### 4. Risk Management

The `RiskManager` enforces:
- Volatility strategies only execute when VIX is elevated
- Maximum exposure limits for high-risk strategies
- Budget controls remain in place
- Risk scores adjusted for current market conditions

## Example Scenarios

### Scenario 1: Market Crash (VIX 45)

```typescript
// VIX spikes to 45 during market panic
engine.updateMarketConditions(45);

const conditions = engine.getMarketConditions();
// volatilityState: 'extreme'
// trend: 'bearish'

// Short condor opportunity identified
const opportunity = {
  type: 'short_condor',
  volatility: 85,
  estimatedProfit: 150,
  roi: 35
};

const analysis = engine.analyzeOpportunity(opportunity);
// Score: 88 (+10 bonus for extreme volatility)
// Reasons: [
//   'High volatility environment - ideal for volatility strategies',
//   'Elevated VIX (45.0) - favorable for bearish/volatility plays',
//   'Exceptional opportunity - highly recommended'
// ]
```

### Scenario 2: Calm Markets (VIX 12)

```typescript
// VIX at 12 during calm markets
engine.updateMarketConditions(12);

const opportunity = {
  type: 'short_condor',
  volatility: 20,
  estimatedProfit: 50,
  roi: 15
};

const riskAssessment = engine.assessRisk(opportunity, userId, settings);
// approved: false
// reasons: [
//   'VIX level 12.0 is below threshold 25 for volatility strategies'
// ]
```

### Scenario 3: Rising Volatility (VIX 28)

```typescript
// VIX climbing to 28
engine.updateMarketConditions(28);

const conditions = engine.getMarketConditions();
// volatilityState: 'high'
// trend: 'bearish'

const opportunity = {
  type: 'bearish_spread',
  volatility: 65,
  estimatedProfit: 120,
  roi: 28
};

const analysis = engine.analyzeOpportunity(opportunity);
// Score: 76 (+5 bonus for high volatility)
// Reasons: [
//   'High volatility environment - ideal for volatility strategies',
//   'Elevated VIX (28.0) - favorable for bearish/volatility plays',
//   'Bearish market trend supports strategy'
// ]
```

## Integration with Data Sources

To use volatility strategies effectively, integrate real-time VIX data:

### Option 1: Free VIX Data
```typescript
// Use Yahoo Finance API (free)
const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/^VIX');
const data = await response.json();
const vixLevel = data.chart.result[0].meta.regularMarketPrice;

engine.updateMarketConditions(vixLevel);
```

### Option 2: Premium Data Providers
- **Alpha Vantage**: VIX and options data
- **IEX Cloud**: Real-time market indicators
- **Polygon.io**: Options and volatility data

### Option 3: Simulate for Testing
```typescript
import { MarketIndicatorService } from '@arbi/arbitrage-engine';

const marketIndicators = new MarketIndicatorService();
const simulatedVix = marketIndicators.simulateVixLevel();
engine.updateMarketConditions(simulatedVix);
```

## Best Practices

### 1. Regular Market Updates
Update market conditions at least every 5-15 minutes during market hours:

```typescript
setInterval(() => {
  const vixLevel = fetchCurrentVix();
  engine.updateMarketConditions(vixLevel);
}, 5 * 60 * 1000); // Every 5 minutes
```

### 2. Conservative Exposure Limits
Start with conservative exposure to volatility strategies:

```typescript
volatilityConfig: {
  enabledDuringHighVix: true,
  vixThreshold: 30,              // Higher threshold = more conservative
  maxVolatilityExposure: 0.2     // Max 20% of budget
}
```

### 3. Risk Tolerance Alignment
Match volatility strategies to your risk tolerance:

```typescript
// Conservative: Only enable during extreme volatility
riskTolerance: 'conservative',
volatilityConfig: {
  vixThreshold: 35,
  maxVolatilityExposure: 0.15
}

// Aggressive: Enable during elevated volatility
riskTolerance: 'aggressive',
volatilityConfig: {
  vixThreshold: 25,
  maxVolatilityExposure: 0.4
}
```

### 4. Monitor VIX Percentiles
Use VIX statistics to gauge opportunity quality:

```typescript
const stats = engine.getVixStats();
if (stats.percentile > 75) {
  console.log('VIX in top 25% - excellent time for volatility strategies');
}
```

## Risk Warning

⚠️ **Important**: Volatility strategies involve higher risk than standard arbitrage strategies:

- Options can expire worthless
- Losses can exceed initial investment for some strategies
- Require deeper understanding of options markets
- Best used by experienced traders
- Always maintain proper risk management

## Summary

Volatility strategies enable the Arbi engine to capitalize on extreme market conditions:

✅ **Automatic enablement** during high VIX periods  
✅ **Market-aware scoring** that rewards volatility  
✅ **Risk controls** to limit exposure  
✅ **Flexible configuration** for different risk tolerances  
✅ **Real-time market tracking** via VIX integration  

By enabling these strategies, users can turn market volatility from a risk into an opportunity.
