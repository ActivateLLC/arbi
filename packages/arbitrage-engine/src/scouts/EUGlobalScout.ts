import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * EUGlobalScout (Stub)
 * Finds arbitrage opportunities from EU/UK sources for global import/export and dropshipping.
 * In production, would use APIs or scraping for EU/UK marketplaces (e.g., Amazon.de, Cdiscount, Allegro, etc.)
 */
export class EUGlobalScout implements OpportunityScout {
  name = 'EU/UK Arbitrage Scout';
  type = 'ecommerce_arbitrage' as const;

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    // DEMO MODE DISABLED - Real EU/UK marketplace API integration required
    // TODO: Integrate EU/UK marketplace APIs or scraping logic
    // Configure EU_MARKETPLACE_API_KEYS in environment variables to enable
    console.log('⚠️  EU/UK scout disabled - no API keys configured');
    return [];
  }
}
