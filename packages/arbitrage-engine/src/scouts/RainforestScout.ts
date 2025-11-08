import axios from 'axios';
import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * Rainforest API Scout - Amazon Data Without Amazon API
 *
 * Pricing: $0.005-0.02 per request (much cheaper than manual scraping infrastructure)
 * Get API key at: https://www.rainforestapi.com/
 *
 * Benefits:
 * - No Amazon associate account needed
 * - No sales requirements
 * - Returns structured JSON data
 * - Handles proxies, CAPTCHAs, rate limits automatically
 * - 1000 free requests on signup
 */
export class RainforestScout implements OpportunityScout {
  name = 'Rainforest API Scout (Amazon Data)';
  type = 'ecommerce_arbitrage' as const;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RAINFOREST_API_KEY || 'YOUR_RAINFOREST_API_KEY';
  }

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      console.log('🔍 Scanning Amazon via Rainforest API...');

      // Popular ASINs to monitor (these are examples - you'd have a larger list)
      const asinsToCheck = [
        'B0CHWRXH8B', // AirPods Pro
        'B098RKWHHZ', // Nintendo Switch OLED
        'B098FKXT8L', // Bose QC45
        'B0B4D5L6KX', // Dyson V8
        'B075SDMMMV'  // LEGO Millennium Falcon
      ];

      for (const asin of asinsToCheck) {
        const amazonData = await this.getAmazonProductData(asin);

        if (amazonData) {
          // Compare with eBay sold prices
          const ebayPrice = await this.getEbayComparisonPrice(amazonData.title);

          if (ebayPrice && ebayPrice > amazonData.price * 1.15) {
            const opportunity = this.createOpportunity(amazonData, ebayPrice);

            if (this.meetsFilters(opportunity, config.filters)) {
              opportunities.push(opportunity);
              console.log(`✅ Found: ${opportunity.title} - $${opportunity.estimatedProfit.toFixed(2)} profit`);
            }
          }
        }

        // Rate limiting
        await this.sleep(1000);
      }
    } catch (error) {
      console.error('Rainforest API scout error:', error);
    }

    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }

  /**
   * Get Amazon product data via Rainforest API
   */
  private async getAmazonProductData(asin: string): Promise<{
    asin: string;
    title: string;
    price: number;
    rating: number;
    reviewCount: number;
    inStock: boolean;
    category: string;
    imageUrl: string;
  } | null> {
    try {
      const response = await axios.get('https://api.rainforestapi.com/request', {
        params: {
          api_key: this.apiKey,
          type: 'product',
          asin: asin,
          amazon_domain: 'amazon.com'
        }
      });

      const product = response.data.product;

      if (!product || !product.buybox_winner) {
        return null;
      }

      return {
        asin,
        title: product.title || '',
        price: parseFloat(product.buybox_winner.price?.value || '0'),
        rating: product.rating || 0,
        reviewCount: product.ratings_total || 0,
        inStock: product.buybox_winner.availability?.type === 'in_stock',
        category: product.categories?.[0]?.name || 'General',
        imageUrl: product.main_image?.link || ''
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('❌ Invalid Rainforest API key. Get one at https://www.rainforestapi.com/');
      } else {
        console.error(`Error fetching Amazon data for ${asin}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Get eBay comparison price (uses free eBay API)
   */
  private async getEbayComparisonPrice(productTitle: string): Promise<number | null> {
    try {
      // Use eBay Finding API (no auth required for basic searches)
      const url = 'https://svcs.ebay.com/services/search/FindingService/v1';

      const params = {
        'OPERATION-NAME': 'findCompletedItems',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': process.env.EBAY_APP_ID || 'DEMO-APP-ID', // Free to get
        'RESPONSE-DATA-FORMAT': 'JSON',
        'keywords': productTitle.substring(0, 50), // Limit search query length
        'itemFilter(0).name': 'SoldItemsOnly',
        'itemFilter(0).value': 'true',
        'paginationInput.entriesPerPage': '10'
      };

      const response = await axios.get(url, { params });

      const items = response.data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];

      if (items.length === 0) return null;

      const soldPrices = items
        .map((item: any) => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'))
        .filter((price: number) => price > 0);

      if (soldPrices.length === 0) return null;

      // Return median price
      soldPrices.sort((a: number, b: number) => a - b);
      const mid = Math.floor(soldPrices.length / 2);
      return soldPrices.length % 2 === 0
        ? (soldPrices[mid - 1] + soldPrices[mid]) / 2
        : soldPrices[mid];
    } catch (error) {
      console.error('Error getting eBay comparison:', error);
      return null;
    }
  }

  private createOpportunity(
    amazonData: { asin: string; title: string; price: number; category: string; imageUrl: string },
    ebayPrice: number
  ): Opportunity {
    const buyPrice = amazonData.price;
    const sellPrice = ebayPrice;
    const sellingFees = sellPrice * 0.13;
    const shippingCost = 8.00;
    const estimatedProfit = sellPrice - buyPrice - sellingFees - shippingCost;
    const roi = (estimatedProfit / buyPrice) * 100;

    return {
      id: `rainforest-${amazonData.asin}-${Date.now()}`,
      type: 'ecommerce_arbitrage',
      title: amazonData.title,
      description: `Buy from Amazon for $${buyPrice.toFixed(2)}, sell on eBay for $${sellPrice.toFixed(2)}`,
      buyPrice,
      sellPrice,
      estimatedProfit,
      roi,
      confidence: 85,
      riskLevel: roi > 30 ? 'low' : roi > 15 ? 'medium' : 'high',
      volatility: 25,
      discoveredAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      estimatedTimeToProfit: 5,
      buySource: 'Amazon',
      sellSource: 'eBay',
      category: amazonData.category,
      productInfo: {
        asin: amazonData.asin,
        title: amazonData.title,
        category: amazonData.category,
        imageUrl: amazonData.imageUrl,
        condition: 'new',
        rank: 100,
        reviews: { count: 1000, rating: 4.5 }
      },
      metadata: {
        buyUrl: `https://www.amazon.com/dp/${amazonData.asin}`,
        sellUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(amazonData.title)}`,
        scanTime: new Date().toISOString(),
        dataSource: 'rainforest-api'
      }
    };
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
