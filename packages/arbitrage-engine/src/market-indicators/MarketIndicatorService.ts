import type { MarketConditions } from '../types';

/**
 * MarketIndicatorService tracks market conditions like VIX and volatility
 * to inform trading decisions, especially for volatility-based strategies
 */
export class MarketIndicatorService {
  private currentConditions: MarketConditions | null = null;
  private vixHistory: Array<{ value: number; timestamp: Date }> = [];
  private readonly VIX_HISTORY_LIMIT = 100;

  /**
   * Update market conditions with current VIX level
   * In production, this would fetch from a real-time data source
   */
  updateMarketConditions(vixLevel: number): MarketConditions {
    // Store VIX history
    this.vixHistory.push({ value: vixLevel, timestamp: new Date() });
    if (this.vixHistory.length > this.VIX_HISTORY_LIMIT) {
      this.vixHistory.shift();
    }

    // Determine volatility state based on VIX level
    const volatilityState = this.getVolatilityState(vixLevel);

    // Determine market trend based on VIX movement
    const trend = this.calculateTrend();

    this.currentConditions = {
      vixLevel,
      trend,
      volatilityState,
      timestamp: new Date()
    };

    return this.currentConditions;
  }

  /**
   * Get current market conditions
   */
  getCurrentConditions(): MarketConditions | null {
    return this.currentConditions;
  }

  /**
   * Determine volatility state based on VIX level
   * VIX levels:
   * - Low: < 15 (calm markets)
   * - Moderate: 15-25 (normal)
   * - High: 25-40 (elevated fear/uncertainty)
   * - Extreme: > 40 (market panic/crisis)
   */
  private getVolatilityState(vixLevel: number): MarketConditions['volatilityState'] {
    if (vixLevel < 15) return 'low';
    if (vixLevel < 25) return 'moderate';
    if (vixLevel < 40) return 'high';
    return 'extreme';
  }

  /**
   * Calculate market trend based on recent VIX movement
   */
  private calculateTrend(): MarketConditions['trend'] {
    if (this.vixHistory.length < 2) {
      return 'neutral';
    }

    // Compare current VIX to average of last 20 readings
    const recentHistory = this.vixHistory.slice(-20);
    const avgVix = recentHistory.reduce((sum, h) => sum + h.value, 0) / recentHistory.length;
    const currentVix = this.vixHistory[this.vixHistory.length - 1].value;

    // Rising VIX typically indicates bearish sentiment (fear increasing)
    if (currentVix > avgVix * 1.1) {
      return 'bearish';
    } else if (currentVix < avgVix * 0.9) {
      return 'bullish';
    }

    return 'neutral';
  }

  /**
   * Check if volatility strategies should be enabled
   * Returns true when VIX is elevated (>= 25)
   */
  shouldEnableVolatilityStrategies(threshold: number = 25): boolean {
    if (!this.currentConditions) {
      return false;
    }
    return this.currentConditions.vixLevel >= threshold;
  }

  /**
   * Get VIX statistics
   */
  getVixStats(): {
    current: number;
    average: number;
    min: number;
    max: number;
    percentile: number;
  } | null {
    if (this.vixHistory.length === 0) {
      return null;
    }

    const values = this.vixHistory.map(h => h.value);
    const current = values[values.length - 1];
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate percentile of current VIX
    const sortedValues = [...values].sort((a, b) => a - b);
    const rank = sortedValues.filter(v => v <= current).length;
    const percentile = (rank / sortedValues.length) * 100;

    return {
      current,
      average: Math.round(average * 100) / 100,
      min,
      max,
      percentile: Math.round(percentile)
    };
  }

  /**
   * Simulate VIX level (for testing/demo purposes)
   * 
   * ⚠️ WARNING: This method generates simulated VIX data and should ONLY be used for:
   * - Testing and development
   * - Demo/example applications
   * - Initial prototyping
   * 
   * In production, replace this with real VIX data from:
   * - Yahoo Finance API (free)
   * - Alpha Vantage
   * - IEX Cloud
   * - Polygon.io
   * - Bloomberg Terminal
   * 
   * Using simulated data in production can lead to incorrect trading decisions.
   * 
   * @returns A simulated VIX value between 10-50
   */
  simulateVixLevel(): number {
    // Generate realistic VIX values
    // Normal distribution around 20 with occasional spikes
    const baseVix = 20;
    const randomVariation = (Math.random() - 0.5) * 10;
    
    // Occasionally simulate market stress (10% chance)
    if (Math.random() < 0.1) {
      return Math.max(25, baseVix + randomVariation + Math.random() * 20);
    }

    return Math.max(10, Math.min(50, baseVix + randomVariation));
  }

  /**
   * Clear history (useful for testing)
   */
  clearHistory(): void {
    this.vixHistory = [];
    this.currentConditions = null;
  }
}
