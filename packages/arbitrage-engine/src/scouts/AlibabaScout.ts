import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * AlibabaScout (Stub)
 * Finds arbitrage opportunities from Alibaba (China) for global import/export and dropshipping.
 * In production, would use Alibaba Open Platform API or web scraping.
 */
export class AlibabaScout implements OpportunityScout {
  name = 'Alibaba Arbitrage Scout';
  type = 'ecommerce_arbitrage' as const;

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    // DEMO MODE DISABLED - Real Alibaba API integration required
    // TODO: Integrate Alibaba Open Platform API or web scraping
    // Configure ALIBABA_API_KEY in environment variables to enable
    console.log('⚠️  Alibaba scout disabled - no API key configured');
    return [];
  }
}
