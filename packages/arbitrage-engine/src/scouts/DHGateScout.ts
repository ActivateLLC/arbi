import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * DHGateScout (Stub)
 * Finds arbitrage opportunities from DHGate (China) for global import/export and dropshipping.
 * In production, would use DHGate API or web scraping.
 */
export class DHGateScout implements OpportunityScout {
  name = 'DHGate Arbitrage Scout';
  type = 'ecommerce_arbitrage' as const;

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    // DEMO MODE DISABLED - Real DHGate API integration required
    // TODO: Integrate DHGate API or web scraping
    // Configure DHGATE_API_KEY in environment variables to enable
    console.log('⚠️  DHGate scout disabled - no API key configured');
    return [];
  }
}
