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
      console.log('🔍 Scanning Amazon Bestsellers - HIGH TICKET ITEMS ONLY...');

      // Use Rainforest API's BESTSELLERS endpoint - discovers what's actually selling
      // Filter by Amazon category IDs that contain high-value items
      const highTicketCategories = [
        // Electronics & Computers (high-ticket)
        { url: 'zgbs/electronics', name: 'Electronics' },
        { url: 'zgbs/pc', name: 'Computers' },
        { url: 'zgbs/photo', name: 'Camera & Photo' },
        
        // Home & Appliances (high-ticket)
        { url: 'zgbs/kitchen', name: 'Kitchen' },
        { url: 'zgbs/home-garden', name: 'Home & Garden' },
        { url: 'zgbs/furniture', name: 'Furniture' },
        
        // Sports & Outdoors (high-ticket)
        { url: 'zgbs/sporting-goods', name: 'Sports' },
        { url: 'zgbs/outdoor-recreation', name: 'Outdoor' },
        
        // Luxury & High-Value
        { url: 'zgbs/watches', name: 'Watches' },
        { url: 'zgbs/jewelry', name: 'Jewelry' },
        { url: 'zgbs/musical-instruments', name: 'Musical Instruments' },
        
        // Business & Industrial
        { url: 'zgbs/industrial', name: 'Industrial & Scientific' },
        { url: 'zgbs/office-products', name: 'Office' },
      ];

      // Minimum price thresholds - we only want HIGH TICKET items
      const MIN_PRICE = 100; // Ignore anything under $100
      const PREFERRED_MIN = 500; // Prefer items $500+

      for (const category of highTicketCategories) {
        try {
          console.log(`   📊 Bestsellers: ${category.name}...`);
          
          const products = await this.getBestsellers(category.url);
          
          // Filter for HIGH TICKET ONLY
          const highTicketProducts = products.filter(p => p.price >= MIN_PRICE);
          
          for (const product of highTicketProducts.slice(0, 3)) {
            // Higher markup for higher ticket items
            const markupMultiplier = product.price >= 1000 ? 1.3 : 1.4; // 30-40% markup
            const sellPrice = product.price * markupMultiplier;
            const opportunity = this.createOpportunity(product, sellPrice);
            
            if (opportunity.estimatedProfit > 20) { // Min $20 profit
              if (this.meetsFilters(opportunity, config.filters)) {
                opportunities.push(opportunity);
                console.log(`   ✅ $${product.price.toFixed(0)} ${category.name} → $${opportunity.estimatedProfit.toFixed(0)} profit`);
              }
            }
          }
        } catch (error) {
          console.log(`   ⚠️  ${category.name} failed, continuing...`);
        }
        
        await this.sleep(300);
      }

      // Sort by profit - highest first
      console.log(`   💰 Found ${opportunities.length} high-ticket opportunities`);
      
    } catch (error) {
      console.error('Rainforest API scout error:', error);
    }

    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }

  /**
   * Get Amazon Bestsellers for a category - LIVE DATA
   */
  private async getBestsellers(categoryUrl: string): Promise<Array<{
    asin: string;
    title: string;
    price: number;
    category: string;
    imageUrl: string;
    rank: number;
  }>> {
    try {
      const response = await axios.get('https://api.rainforestapi.com/request', {
        params: {
          api_key: this.apiKey,
          type: 'bestsellers',
          url: `https://www.amazon.com/${categoryUrl}`,
          amazon_domain: 'amazon.com'
        }
      });

      const results = response.data.bestsellers || [];
      
      return results
        .filter((item: any) => item.price?.value && item.price.value > 0)
        .slice(0, 20) // Top 20 bestsellers
        .map((item: any, index: number) => ({
          asin: item.asin || '',
          title: item.title || '',
          price: parseFloat(item.price?.value || '0'),
          category: categoryUrl.replace('zgbs/', ''),
          imageUrl: item.image || '',
          rank: index + 1
        }));
    } catch (error: any) {
      console.error(`Bestsellers error for "${categoryUrl}":`, error.message);
      return [];
    }
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
   * Removed eBay comparison - now using retail markup model instead
   * Real arbitrage: Buy from Amazon → Sell on your own marketplace at markup
   */

  private createOpportunity(
    amazonData: { asin: string; title: string; price: number; category: string; imageUrl: string },
    marketplacePrice: number
  ): Opportunity {
    const buyPrice = amazonData.price;
    const sellPrice = marketplacePrice;
    const paymentProcessingFees = sellPrice * 0.029 + 0.30; // Stripe fees
    const shippingCost = 0; // Dropship direct from Amazon
    const estimatedProfit = sellPrice - buyPrice - paymentProcessingFees - shippingCost;
    const roi = (estimatedProfit / buyPrice) * 100;

    return {
      id: `rainforest-${amazonData.asin}-${Date.now()}`,
      type: 'ecommerce_arbitrage',
      title: amazonData.title,
      description: `Dropship from Amazon ($${buyPrice.toFixed(2)}) → Your marketplace ($${sellPrice.toFixed(2)}) = $${estimatedProfit.toFixed(2)} profit`,
      buyPrice,
      sellPrice,
      estimatedProfit,
      roi,
      confidence: 80,
      riskLevel: roi > 30 ? 'low' : roi > 15 ? 'medium' : 'high',
      volatility: 20,
      discoveredAt: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours (prices change fast)
      estimatedTimeToProfit: 3,
      buySource: 'Amazon',
      sellSource: 'Your Marketplace',
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
