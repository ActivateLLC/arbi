import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * LatAmGlobalScout (Stub)
 * Finds arbitrage opportunities from Latin American sources for global import/export and dropshipping.
 * In production, would use APIs or scraping for LatAm marketplaces (e.g., Mercado Libre, OLX, etc.)
 */
export class LatAmGlobalScout implements OpportunityScout {
  name = 'LatAm Arbitrage Scout';
  type = 'ecommerce_arbitrage' as const;

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    // DEMO MODE DISABLED - Real LatAm marketplace API integration required
    // TODO: Integrate LatAm marketplace APIs or scraping logic
    // Configure LATAM_MARKETPLACE_API_KEYS in environment variables to enable
    console.log('⚠️  LatAm scout disabled - no API keys configured');
    return [];
  }
}
