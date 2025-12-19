import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Opportunity, OpportunityScout, ScoutConfig } from '../types';

/**
 * SlickdealsScout - Scrapes real deals from Slickdeals.net
 * 
 * NO API KEY REQUIRED - Public web scraping
 * Slickdeals is a deal aggregator with verified deals from:
 * - Amazon, Walmart, Target, Best Buy, Costco, etc.
 * 
 * Strategy: Buy deals, resell at normal retail price for profit
 */
export class SlickdealsScout implements OpportunityScout {
  name = 'Slickdeals Scout';
  type = 'ecommerce_arbitrage' as const;

  async scan(config: ScoutConfig): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    try {
      console.log('🔥 Scanning Slickdeals for hot deals...');

      // Scrape the frontpage deals
      const frontpageDeals = await this.scrapeFrontpage();
      
      for (const deal of frontpageDeals.slice(0, 20)) {
        const opportunity = this.createOpportunity(deal);
        
        if (this.meetsFilters(opportunity, config.filters)) {
          opportunities.push(opportunity);
          console.log(`   ✅ ${deal.store}: $${opportunity.estimatedProfit.toFixed(0)} profit - ${deal.title.substring(0, 50)}...`);
        }
      }

      console.log(`   💰 Found ${opportunities.length} Slickdeals opportunities`);

    } catch (error: any) {
      console.error('Slickdeals scout error:', error.message);
    }

    return opportunities.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }

  private async scrapeFrontpage(): Promise<Array<{
    title: string;
    price: number;
    originalPrice: number;
    store: string;
    url: string;
    thumbsUp: number;
  }>> {
    const deals: Array<{
      title: string;
      price: number;
      originalPrice: number;
      store: string;
      url: string;
      thumbsUp: number;
    }> = [];

    try {
      const response = await axios.get('https://slickdeals.net/deals/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);

      // Parse deal cards from Slickdeals
      $('.dealCard, .fpGridBox, [data-testid="deal-card"]').each((i, el) => {
        try {
          const $el = $(el);
          
          const title = $el.find('.dealTitle, .itemTitle, [data-testid="deal-title"]').text().trim() ||
                       $el.find('a').first().text().trim();
          
          const priceText = $el.find('.price, .dealPrice, [data-testid="deal-price"]').text().trim();
          const price = this.parsePrice(priceText);
          
          const originalPriceText = $el.find('.originalPrice, .listPrice, .strikePrice').text().trim();
          const originalPrice = this.parsePrice(originalPriceText) || price * 1.5; // Estimate if not found
          
          const store = $el.find('.storeName, .merchant, [data-testid="store-name"]').text().trim() || 'Various';
          
          const url = $el.find('a').first().attr('href') || '';
          const fullUrl = url.startsWith('http') ? url : `https://slickdeals.net${url}`;
          
          const thumbsUpText = $el.find('.score, .dealScore, .thumbsUp').text().trim();
          const thumbsUp = parseInt(thumbsUpText.replace(/[^0-9]/g, '')) || 0;

          if (title && price > 0) {
            deals.push({
              title,
              price,
              originalPrice,
              store,
              url: fullUrl,
              thumbsUp
            });
          }
        } catch (e) {
          // Skip malformed deal entries
        }
      });

      // If the main selectors didn't work, try a more generic approach
      if (deals.length === 0) {
        console.log('   📝 Using fallback selectors...');
        
        // Try to find any deal-like elements
        $('article, .deal, [class*="deal"]').each((i, el) => {
          try {
            const $el = $(el);
            const text = $el.text();
            
            // Look for price patterns like $XX.XX
            const priceMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1]);
              const title = $el.find('a').first().text().trim().substring(0, 200) || 'Deal Item';
              
              if (price > 20 && title.length > 5) {
                deals.push({
                  title,
                  price,
                  originalPrice: price * 1.4,
                  store: 'Various',
                  url: 'https://slickdeals.net/deals/',
                  thumbsUp: 50
                });
              }
            }
          } catch (e) {
            // Skip
          }
        });
      }

    } catch (error: any) {
      console.error('Error scraping Slickdeals:', error.message);
    }

    return deals;
  }

  private parsePrice(priceText: string): number {
    if (!priceText) return 0;
    const match = priceText.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return 0;
  }

  private createOpportunity(deal: {
    title: string;
    price: number;
    originalPrice: number;
    store: string;
    url: string;
    thumbsUp: number;
  }): Opportunity {
    const buyPrice = deal.price;
    // Sell at the original retail price (or estimate 40-60% markup based on deal quality)
    const markupFactor = deal.thumbsUp > 100 ? 1.6 : deal.thumbsUp > 50 ? 1.5 : 1.4;
    const sellPrice = Math.max(deal.originalPrice, buyPrice * markupFactor);
    
    // Calculate fees
    const platformFees = sellPrice * 0.13; // eBay/marketplace fees
    const paymentFees = sellPrice * 0.029 + 0.30; // Stripe fees
    const shippingCost = buyPrice > 100 ? 15 : 8; // Estimated shipping
    
    const estimatedProfit = sellPrice - buyPrice - platformFees - paymentFees - shippingCost;
    const roi = (estimatedProfit / buyPrice) * 100;

    // High thumbs up = community validated = higher confidence
    const confidence = Math.min(95, 60 + (deal.thumbsUp / 10));

    return {
      id: `slickdeals-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'ecommerce_arbitrage',
      title: deal.title,
      description: `Slickdeals verified deal from ${deal.store}. Buy at $${buyPrice.toFixed(2)}, resell at $${sellPrice.toFixed(2)}. Community score: ${deal.thumbsUp}+`,
      
      buyPrice,
      sellPrice,
      estimatedProfit,
      roi,
      
      confidence,
      riskLevel: roi > 30 ? 'low' : roi > 15 ? 'medium' : 'high',
      volatility: 25,
      
      discoveredAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours (deals go fast)
      estimatedTimeToProfit: 7, // Days to buy, list, sell, ship
      
      buySource: deal.store,
      sellSource: 'Your Marketplace / eBay',
      
      category: this.categorize(deal.title),
      
      productInfo: {
        asin: '',
        title: deal.title,
        category: this.categorize(deal.title),
        imageUrl: '',
        condition: 'new',
        rank: 100 - Math.min(99, deal.thumbsUp),
        reviews: { count: deal.thumbsUp, rating: 4.5 }
      },
      
      metadata: {
        buyUrl: deal.url,
        sellUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(deal.title)}`,
        scanTime: new Date().toISOString(),
        thumbsUp: deal.thumbsUp,
        originalStore: deal.store
      }
    };
  }

  private categorize(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('laptop') || lower.includes('computer') || lower.includes('pc')) return 'Computers';
    if (lower.includes('phone') || lower.includes('iphone') || lower.includes('samsung')) return 'Phones';
    if (lower.includes('tv') || lower.includes('monitor')) return 'TVs';
    if (lower.includes('headphone') || lower.includes('airpod') || lower.includes('earbuds')) return 'Audio';
    if (lower.includes('game') || lower.includes('playstation') || lower.includes('xbox') || lower.includes('switch')) return 'Gaming';
    if (lower.includes('camera') || lower.includes('gopro')) return 'Cameras';
    if (lower.includes('vacuum') || lower.includes('dyson') || lower.includes('roomba')) return 'Home';
    if (lower.includes('tool') || lower.includes('dewalt') || lower.includes('milwaukee')) return 'Tools';
    return 'General';
  }

  private meetsFilters(opportunity: Opportunity, filters?: any): boolean {
    if (!filters) return true;
    
    if (filters.minProfit && opportunity.estimatedProfit < filters.minProfit) return false;
    if (filters.minROI && opportunity.roi < filters.minROI) return false;
    if (filters.maxPrice && opportunity.buyPrice > filters.maxPrice) return false;
    
    return true;
  }
}
