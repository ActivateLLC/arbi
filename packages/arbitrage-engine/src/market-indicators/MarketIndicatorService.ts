/**
 * Market Indicator Service
 * 
 * Monitors broader market conditions to enhance arbitrage opportunity analysis.
 * Includes VIX (Volatility Index) monitoring for better prediction of market direction.
 */

export interface MarketConditions {
  vix: number; // VIX index value (typically 10-80)
  vixTrend: 'increasing' | 'decreasing' | 'stable';
  marketSentiment: 'fearful' | 'neutral' | 'greedy';
  riskAdjustment: number; // Multiplier for risk scores (0.5 - 2.0)
  confidenceAdjustment: number; // Multiplier for confidence scores (0.7 - 1.3)
  timestamp: Date;
}

export interface VIXLevel {
  value: number;
  interpretation: string;
  marketCondition: 'calm' | 'moderate' | 'elevated' | 'high' | 'extreme';
}

export class MarketIndicatorService {
  private cachedConditions: MarketConditions | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Get current market conditions including VIX
   * Note: In production, this would call a real-time market data API
   */
  async getMarketConditions(): Promise<MarketConditions> {
    // Return cached data if still valid
    if (this.cachedConditions && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cachedConditions;
    }

    // In production, fetch from market data API (e.g., Alpha Vantage, Yahoo Finance)
    // For now, return simulated data based on reasonable defaults
    const vix = await this.fetchVIX();
    const vixLevel = this.interpretVIX(vix);
    const vixTrend = await this.calculateVIXTrend(vix);
    
    const conditions: MarketConditions = {
      vix,
      vixTrend,
      marketSentiment: this.getMarketSentiment(vix),
      riskAdjustment: this.calculateRiskAdjustment(vix, vixTrend),
      confidenceAdjustment: this.calculateConfidenceAdjustment(vix, vixLevel),
      timestamp: new Date()
    };

    // Cache the results
    this.cachedConditions = conditions;
    this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

    return conditions;
  }

  /**
   * Interpret VIX value into market condition categories
   */
  interpretVIX(vix: number): VIXLevel {
    if (vix < 12) {
      return {
        value: vix,
        interpretation: 'Market is extremely calm with low volatility. Consider higher arbitrage volumes.',
        marketCondition: 'calm'
      };
    } else if (vix < 20) {
      return {
        value: vix,
        interpretation: 'Normal market volatility. Standard arbitrage strategies apply.',
        marketCondition: 'moderate'
      };
    } else if (vix < 30) {
      return {
        value: vix,
        interpretation: 'Elevated volatility. Exercise caution with arbitrage positions.',
        marketCondition: 'elevated'
      };
    } else if (vix < 40) {
      return {
        value: vix,
        interpretation: 'High market stress. Reduce position sizes and increase margins.',
        marketCondition: 'high'
      };
    } else {
      return {
        value: vix,
        interpretation: 'Extreme volatility. Consider pausing new positions until markets stabilize.',
        marketCondition: 'extreme'
      };
    }
  }

  /**
   * Determine market sentiment based on VIX level
   */
  private getMarketSentiment(vix: number): 'fearful' | 'neutral' | 'greedy' {
    if (vix > 30) return 'fearful';
    if (vix < 15) return 'greedy';
    return 'neutral';
  }

  /**
   * Calculate risk adjustment multiplier based on VIX and trend
   * Higher VIX = higher risk multiplier
   */
  private calculateRiskAdjustment(vix: number, trend: string): number {
    let adjustment = 1.0;

    // Base adjustment from VIX level
    if (vix < 15) {
      adjustment = 0.8; // Lower risk in calm markets
    } else if (vix < 20) {
      adjustment = 1.0; // Normal risk
    } else if (vix < 30) {
      adjustment = 1.3; // Elevated risk
    } else if (vix < 40) {
      adjustment = 1.6; // High risk
    } else {
      adjustment = 2.0; // Extreme risk
    }

    // Adjust based on trend
    if (trend === 'increasing') {
      adjustment *= 1.1; // Increase risk if volatility rising
    } else if (trend === 'decreasing') {
      adjustment *= 0.95; // Slightly lower risk if volatility falling
    }

    return Math.round(adjustment * 100) / 100;
  }

  /**
   * Calculate confidence adjustment based on VIX level
   * Higher VIX = lower confidence in predictions
   */
  private calculateConfidenceAdjustment(vix: number, vixLevel: VIXLevel): number {
    if (vixLevel.marketCondition === 'calm') {
      return 1.2; // Higher confidence in stable markets
    } else if (vixLevel.marketCondition === 'moderate') {
      return 1.0; // Normal confidence
    } else if (vixLevel.marketCondition === 'elevated') {
      return 0.85; // Reduced confidence
    } else if (vixLevel.marketCondition === 'high') {
      return 0.75; // Low confidence
    } else {
      return 0.7; // Very low confidence in extreme volatility
    }
  }

  /**
   * Fetch current VIX value
   * In production, integrate with real-time market data API:
   * - Alpha Vantage API (free tier available)
   * - Yahoo Finance API
   * - IEX Cloud
   * - CBOE directly
   */
  private async fetchVIX(): Promise<number> {
    // TODO: Integrate with real market data API
    // Example endpoints:
    // - Alpha Vantage: https://www.alphavantage.co/query?function=VIX&apikey=YOUR_API_KEY
    // - Yahoo Finance: https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX
    
    // For now, return a reasonable default (normal market conditions)
    // In production, this would be an actual API call
    return 17.5; // Typical VIX value in normal markets
  }

  /**
   * Calculate VIX trend by comparing recent values
   */
  private async calculateVIXTrend(currentVix: number): Promise<'increasing' | 'decreasing' | 'stable'> {
    // TODO: In production, fetch historical VIX data and calculate trend
    // For now, use simple threshold logic based on current value
    
    // This would compare current VIX to moving average or recent history
    // Example: if currentVix > 5-day MA, trend is 'increasing'
    
    return 'stable'; // Default to stable for now
  }

  /**
   * Generate market condition warning messages
   */
  generateMarketWarnings(conditions: MarketConditions): string[] {
    const warnings: string[] = [];

    const vixLevel = this.interpretVIX(conditions.vix);

    if (vixLevel.marketCondition === 'elevated' || vixLevel.marketCondition === 'high') {
      warnings.push(`Market volatility elevated (VIX: ${conditions.vix.toFixed(1)}) - prices may change rapidly`);
    }

    if (vixLevel.marketCondition === 'extreme') {
      warnings.push(`EXTREME market volatility (VIX: ${conditions.vix.toFixed(1)}) - consider pausing new positions`);
    }

    if (conditions.vixTrend === 'increasing') {
      warnings.push('Market volatility is increasing - monitor positions closely');
    }

    if (conditions.marketSentiment === 'fearful') {
      warnings.push('Market sentiment is fearful - consumer spending may decline');
    }

    return warnings;
  }

  /**
   * Check if arbitrage opportunities should be paused due to market conditions
   */
  shouldPauseArbitrage(conditions: MarketConditions): boolean {
    // Pause if VIX is extremely high
    if (conditions.vix > 40) {
      return true;
    }

    // Pause if VIX is high and rising rapidly
    if (conditions.vix > 35 && conditions.vixTrend === 'increasing') {
      return true;
    }

    return false;
  }
}
