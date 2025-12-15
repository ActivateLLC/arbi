import { OpportunityAnalyzer } from './OpportunityAnalyzer';
import type { Opportunity } from '../types';

describe('OpportunityAnalyzer', () => {
  let analyzer: OpportunityAnalyzer;

  beforeEach(() => {
    analyzer = new OpportunityAnalyzer();
  });

  it('should analyze a high quality opportunity correctly', () => {
    const opportunity: Opportunity = {
      id: 'test-1',
      type: 'arbitrage',
      title: 'Test Item',
      description: 'A test item',
      buyPrice: 100,
      sellPrice: 200,
      estimatedProfit: 80, // After fees
      roi: 80,
      confidence: 90,
      riskLevel: 'low',
      volatility: 10,
      discoveredAt: new Date(),
      estimatedTimeToProfit: 5,
      buySource: 'ebay',
      sellSource: 'amazon',
      category: 'electronics'
    };

    const analysis = analyzer.analyzeOpportunity(opportunity);

    expect(analysis.opportunity).toBe(opportunity);
    expect(analysis.score).toBeGreaterThan(50);
    expect(analysis.shouldExecute).toBe(true);
    expect(analysis.reasons.length).toBeGreaterThan(0);
    expect(analysis.warnings.length).toBe(0);
  });

  it('should reject a low quality opportunity', () => {
    const opportunity: Opportunity = {
      id: 'test-2',
      type: 'arbitrage',
      title: 'Bad Item',
      description: 'A bad item',
      buyPrice: 100,
      sellPrice: 110,
      estimatedProfit: 5,
      roi: 5,
      confidence: 20,
      riskLevel: 'high',
      volatility: 80,
      discoveredAt: new Date(),
      estimatedTimeToProfit: 30,
      buySource: 'ebay',
      sellSource: 'amazon',
      category: 'electronics'
    };

    const analysis = analyzer.analyzeOpportunity(opportunity);

    expect(analysis.score).toBeLessThan(50);
    expect(analysis.shouldExecute).toBe(false);
  });
});
