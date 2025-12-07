import axios from 'axios';
import { SimpleCache } from '../utils/cache';

export interface VixData {
  value: number; // Current VIX value
  timestamp: Date;
  level: 'low' | 'normal' | 'high' | 'extreme';
  description: string;
}

export interface MarketCondition {
  vix: VixData;
  volatilityAdjustment: number; // Multiplier for risk scoring (0.8 - 2.0)
  confidenceAdjustment: number; // Multiplier for confidence scoring (0.7 - 1.0)
  recommendation: string;
}

/**
 * VIX (Volatility Index) Monitoring Service
 * 
 * Tracks market volatility to adjust risk scoring and confidence levels.
 * VIX levels:
 * - 0-15: Low volatility (calm market)
 * - 15-20: Normal volatility
 * - 20-30: High volatility (elevated risk)
 * - 30+: Extreme volatility (crisis conditions)
 */
export class VixMonitorService {
  private cache: SimpleCache<VixData>;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly CACHE_KEY = 'vix_data';
  
  // Alpha Vantage API (free tier available)
  // Alternative: Yahoo Finance, CBOE directly
  private readonly apiKey: string | undefined;
  private readonly apiUrl = 'https://www.alphavantage.co/query';
  
  constructor(apiKey?: string) {
    this.cache = new SimpleCache<VixData>(this.CACHE_DURATION);
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY;
  }

  /**
   * Get current VIX data
   */
  async getVixData(): Promise<VixData> {
    // Check cache first
    const cached = this.cache.get(this.CACHE_KEY);
    if (cached) {
      console.log('📊 Returning cached VIX data:', cached.value);
      return cached;
    }

    try {
      // Try to fetch real VIX data
      if (this.apiKey) {
        const realData = await this.fetchRealVixData();
        this.cache.set(this.CACHE_KEY, realData);
        return realData;
      }
    } catch (error) {
      console.warn('⚠️  Failed to fetch real VIX data:', error);
    }

    // Fallback to estimated data based on market conditions
    const fallbackData = this.getFallbackVixData();
    this.cache.set(this.CACHE_KEY, fallbackData);
    return fallbackData;
  }

  /**
   * Get market condition analysis based on VIX
   */
  async getMarketCondition(): Promise<MarketCondition> {
    const vix = await this.getVixData();
    
    let volatilityAdjustment: number;
    let confidenceAdjustment: number;
    let recommendation: string;

    if (vix.level === 'low') {
      // Low VIX: Markets are calm, normal risk assessment
      volatilityAdjustment = 0.8;
      confidenceAdjustment = 1.0;
      recommendation = 'Market conditions are stable. Standard risk assessment applies.';
    } else if (vix.level === 'normal') {
      // Normal VIX: Average market conditions
      volatilityAdjustment = 1.0;
      confidenceAdjustment = 0.95;
      recommendation = 'Market conditions are normal. Proceed with standard caution.';
    } else if (vix.level === 'high') {
      // High VIX: Elevated uncertainty, increase risk scores
      volatilityAdjustment = 1.4;
      confidenceAdjustment = 0.85;
      recommendation = 'Market volatility is elevated. Exercise increased caution with opportunities.';
    } else {
      // Extreme VIX: Crisis conditions, significantly increase risk
      volatilityAdjustment = 2.0;
      confidenceAdjustment = 0.7;
      recommendation = 'Market volatility is extreme. Consider reducing position sizes and being highly selective.';
    }

    return {
      vix,
      volatilityAdjustment,
      confidenceAdjustment,
      recommendation
    };
  }

  /**
   * Check if market conditions warrant a warning
   */
  async shouldWarnAboutMarketConditions(): Promise<boolean> {
    const vix = await this.getVixData();
    return vix.level === 'high' || vix.level === 'extreme';
  }

  /**
   * Fetch real VIX data from Alpha Vantage API
   * 
   * Note: Alpha Vantage's free tier may have limitations on VIX data.
   * The GLOBAL_QUOTE function works with most symbols but VIX availability
   * may vary. If this fails, the system gracefully falls back to estimated values.
   * 
   * Alternative APIs for VIX data:
   * - Yahoo Finance API
   * - CBOE Direct API
   * - Market data scraping from financial websites
   */
  private async fetchRealVixData(): Promise<VixData> {
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    try {
      // Try Alpha Vantage GLOBAL_QUOTE
      // Note: VIX availability through this endpoint may be limited
      const response = await axios.get(this.apiUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: 'VIX',
          apikey: this.apiKey
        },
        timeout: 5000
      });

      const quote = response.data['Global Quote'];
      if (!quote || !quote['05. price']) {
        console.warn('⚠️  VIX not available through GLOBAL_QUOTE, trying alternative...');
        
        // Try TIME_SERIES_DAILY as fallback
        const tsResponse = await axios.get(this.apiUrl, {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol: '^VIX',
            apikey: this.apiKey
          },
          timeout: 5000
        });
        
        const timeSeries = tsResponse.data['Time Series (Daily)'];
        if (timeSeries) {
          const latestDate = Object.keys(timeSeries)[0];
          const latestData = timeSeries[latestDate];
          const value = parseFloat(latestData['4. close']);
          return this.createVixData(value);
        }
        
        throw new Error('VIX data not available from Alpha Vantage');
      }

      const value = parseFloat(quote['05. price']);
      return this.createVixData(value);
    } catch (error) {
      // Log the error but don't throw - we have a fallback
      console.warn('⚠️  Failed to fetch VIX from Alpha Vantage:', error instanceof Error ? error.message : 'Unknown error');
      throw error; // Re-throw so caller can use fallback
    }
  }

  /**
   * Get fallback VIX data (estimated based on typical market conditions)
   * This provides a reasonable default when real data is unavailable
   */
  private getFallbackVixData(): VixData {
    // Default to normal/slightly elevated volatility
    // In production, you could also scrape this from financial websites
    const estimatedVix = 18.5;
    console.log('📊 Using estimated VIX value:', estimatedVix);
    return this.createVixData(estimatedVix);
  }

  /**
   * Create VixData object with level classification
   */
  private createVixData(value: number): VixData {
    let level: VixData['level'];
    let description: string;

    if (value < 15) {
      level = 'low';
      description = 'Low market volatility - calm conditions';
    } else if (value < 20) {
      level = 'normal';
      description = 'Normal market volatility';
    } else if (value < 30) {
      level = 'high';
      description = 'Elevated market volatility - increased uncertainty';
    } else {
      level = 'extreme';
      description = 'Extreme market volatility - crisis conditions';
    }

    return {
      value: Math.round(value * 100) / 100,
      timestamp: new Date(),
      level,
      description
    };
  }

  /**
   * Clear cached VIX data
   */
  clearCache(): void {
    this.cache.clear();
  }
}
