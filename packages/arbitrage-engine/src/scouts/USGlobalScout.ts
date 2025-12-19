import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * USGlobalScout (Stub)
 * Finds arbitrage opportunities from US sources for global import/export and dropshipping.
 * In production, would use APIs or scraping for US marketplaces (e.g., Walmart, Best Buy, Amazon.com, etc.)
 */
export class USGlobalScout implements OpportunityScout {
  name = 'US Arbitrage Scout';
  type = 'ecommerce_arbitrage' as const;

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    // DEMO MODE DISABLED - Real US marketplace API integration required
    // TODO: Integrate US marketplace APIs or scraping logic
    // Configure US_MARKETPLACE_API_KEYS in environment variables to enable
    console.log('⚠️  US scout disabled - no API keys configured');
    return [];
  }
}
