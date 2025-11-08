import axios from 'axios';
import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * eBay Finding API Scout - Free, No Authentication Required
 *
 * Uses eBay's Finding API which doesn't require OAuth for basic searches
 * Get your free app ID at: https://developer.ebay.com/join/
 * (Just need to register, no sales requirements)
 */
export class EbayScout implements OpportunityScout {
  name = 'eBay Price Scout';
  type = 'ecommerce_arbitrage' as const;
  private appId: string;

  constructor(appId?: string) {
    // If no app ID provided, use in non-authenticated mode (limited results)
    this.appId = appId || 'YOUR_EBAY_APP_ID'; // Replace with actual app ID
  }

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      console.log('🔍 Scanning eBay for price discrepancies...');

      // Search for popular electronics categories
      const categories = ['Cell Phones', 'Headphones', 'Smart Watches', 'Gaming Consoles'];

      for (const category of categories) {
        const deals = await this.findUndervaluedListings(category);
        opportunities.push(...deals.filter(opp => this.meetsFilters(opp, config.filters)));

        // Rate limit: 5000 calls/day for free tier
        await this.sleep(500);
      }
    } catch (error) {
      console.error('eBay scout error:', error);
    }

    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }

  /**
   * Find listings priced below their sold price average
   */
  private async findUndervaluedListings(keywords: string): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      // Step 1: Get current active listings
      const activeListings = await this.searchActiveListings(keywords);

      // Step 2: Get average sold price for comparison
      const soldPrice = await this.getAverageSoldPrice(keywords);

      if (!soldPrice || soldPrice < 50) return []; // Skip low-value items

      // Step 3: Find listings significantly below average sold price
      for (const listing of activeListings) {
        const buyPrice = listing.price;
        const sellPrice = soldPrice;

        // Only if buy price is 20%+ below average sold price
        if (buyPrice < sellPrice * 0.8) {
          const sellingFees = sellPrice * 0.13;
          const shippingCost = listing.shippingCost || 8.00;
          const estimatedProfit = sellPrice - buyPrice - sellingFees - shippingCost;
          const roi = (estimatedProfit / buyPrice) * 100;

          if (estimatedProfit > 10 && roi > 10) {
            opportunities.push({
              id: `ebay-${listing.itemId}`,
              type: 'ecommerce_arbitrage',
              title: listing.title,
              description: `Buy from eBay listing, relist at market price`,
              buyPrice,
              sellPrice,
              estimatedProfit,
              roi,
              confidence: 70,
              riskLevel: roi > 30 ? 'low' : roi > 15 ? 'medium' : 'high',
              volatility: 35,
              discoveredAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              estimatedTimeToProfit: 5,
              buySource: 'eBay (underpriced listing)',
              sellSource: 'eBay (market price)',
              category: keywords,
              metadata: {
                buyUrl: listing.url,
                itemId: listing.itemId,
                averageSoldPrice: soldPrice,
                scanTime: new Date().toISOString()
              }
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error finding undervalued ${keywords}:`, error);
    }

    return opportunities;
  }

  /**
   * Search active eBay listings
   */
  private async searchActiveListings(keywords: string): Promise<Array<{
    itemId: string;
    title: string;
    price: number;
    shippingCost: number;
    url: string;
  }>> {
    try {
      // eBay Finding API endpoint
      const url = 'https://svcs.ebay.com/services/search/FindingService/v1';

      const params = {
        'OPERATION-NAME': 'findItemsAdvanced',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'keywords': keywords,
        'itemFilter(0).name': 'Condition',
        'itemFilter(0).value': 'New',
        'itemFilter(1).name': 'ListingType',
        'itemFilter(1).value': 'FixedPrice',
        'sortOrder': 'PricePlusShippingLowest',
        'paginationInput.entriesPerPage': '10'
      };

      const response = await axios.get(url, { params });

      const items = response.data?.findItemsAdvancedResponse?.[0]?.searchResult?.[0]?.item || [];

      return items.map((item: any) => ({
        itemId: item.itemId?.[0] || '',
        title: item.title?.[0] || '',
        price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        shippingCost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || '8'),
        url: item.viewItemURL?.[0] || ''
      }));
    } catch (error) {
      console.error('Error searching eBay listings:', error);
      return [];
    }
  }

  /**
   * Get average sold price from completed listings
   */
  private async getAverageSoldPrice(keywords: string): Promise<number | null> {
    try {
      const url = 'https://svcs.ebay.com/services/search/FindingService/v1';

      const params = {
        'OPERATION-NAME': 'findCompletedItems',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'keywords': keywords,
        'itemFilter(0).name': 'Condition',
        'itemFilter(0).value': 'New',
        'itemFilter(1).name': 'SoldItemsOnly',
        'itemFilter(1).value': 'true',
        'paginationInput.entriesPerPage': '20'
      };

      const response = await axios.get(url, { params });

      const items = response.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

      if (items.length === 0) return null;

      const soldPrices = items
        .map((item: any) => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'))
        .filter((price: number) => price > 0);

      if (soldPrices.length === 0) return null;

      // Return median instead of average (more robust against outliers)
      soldPrices.sort((a: number, b: number) => a - b);
      const mid = Math.floor(soldPrices.length / 2);
      return soldPrices.length % 2 === 0
        ? (soldPrices[mid - 1] + soldPrices[mid]) / 2
        : soldPrices[mid];
    } catch (error) {
      console.error('Error getting sold prices:', error);
      return null;
    }
  }

  private meetsFilters(opportunity: Opportunity, filters?: ScoutConfig['filters']): boolean {
    if (!filters) return true;
    if (filters.minProfit && opportunity.estimatedProfit < filters.minProfit) return false;
    if (filters.minROI && opportunity.roi < filters.minROI) return false;
    if (filters.maxPrice && opportunity.buyPrice > filters.maxPrice) return false;
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
