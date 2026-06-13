import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * TaobaoScout (Stub)
 * Finds arbitrage opportunities from Taobao (China) for global import/export and dropshipping.
 * In production, would use Taobao API or web scraping.
 */
export class TaobaoScout implements OpportunityScout {
  name = 'Taobao Arbitrage Scout';
  type = 'ecommerce_arbitrage' as const;

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    // DEMO MODE DISABLED - Real Taobao API integration required
    // TODO: Integrate Taobao API or web scraping
    // Configure TAOBAO_API_KEY in environment variables to enable
    console.log('⚠️  Taobao scout disabled - no API key configured');
    return [];
  }
}
