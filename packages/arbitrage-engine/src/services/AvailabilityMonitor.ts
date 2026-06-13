import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Availability Monitoring Service
 *
 * Monitors source platform listings to ensure they're still in stock
 * before accepting orders on destination platforms.
 *
 * This prevents the nightmare scenario of:
 * 1. Listing item on Amazon
 * 2. Customer orders
 * 3. Source item is sold out
 * 4. Can't fulfill order → refund → negative feedback
 */

export interface AvailabilityCheck {
  url: string;
  platform: 'ebay' | 'amazon' | 'walmart' | 'other';
  inStock: boolean;
  price?: number;
  priceChanged: boolean;
  lastChecked: Date;
  error?: string;
}

export interface MonitoringAlert {
  listingId: string;
  sourceUrl: string;
  alertType: 'out_of_stock' | 'price_increase' | 'price_decrease' | 'item_removed';
  oldPrice?: number;
  newPrice?: number;
  message: string;
  timestamp: Date;
}

export class AvailabilityMonitor {
  /**
   * Check if a product is still available
   */
  async checkAvailability(
    url: string,
    expectedPrice?: number
  ): Promise<AvailabilityCheck> {
    const platform = this.detectPlatform(url);

    try {
      switch (platform) {
        case 'ebay':
          return await this.checkEbayAvailability(url, expectedPrice);
        case 'amazon':
          return await this.checkAmazonAvailability(url, expectedPrice);
        case 'walmart':
          return await this.checkWalmartAvailability(url, expectedPrice);
        default:
          return await this.checkGenericAvailability(url, expectedPrice);
      }
    } catch (error: any) {
      console.error(`❌ Availability check failed for ${url}:`, error.message);
      return {
        url,
        platform,
        inStock: false,
        priceChanged: false,
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Check multiple URLs in parallel
   */
  async checkMultiple(
    listings: Array<{ url: string; expectedPrice?: number }>
  ): Promise<AvailabilityCheck[]> {
    console.log(`🔍 Checking availability for ${listings.length} listings...`);

    const checks = listings.map(listing =>
      this.checkAvailability(listing.url, listing.expectedPrice)
    );

    const results = await Promise.all(checks);

    const inStock = results.filter(r => r.inStock).length;
    const outOfStock = results.filter(r => !r.inStock).length;

    console.log(`✅ In stock: ${inStock}, ❌ Out of stock: ${outOfStock}`);

    return results;
  }

  /**
   * Check eBay listing availability
   */
  private async checkEbayAvailability(
    url: string,
    expectedPrice?: number
  ): Promise<AvailabilityCheck> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500 // Accept 404 as valid response
    });

    // If 404, item is removed
    if (response.status === 404) {
      return {
        url,
        platform: 'ebay',
        inStock: false,
        priceChanged: false,
        lastChecked: new Date(),
        error: 'Item removed from eBay'
      };
    }

    const $ = cheerio.load(response.data);

    // Check if item is available
    const soldOut = $('.msgTextAlign').text().toLowerCase().includes('no longer available') ||
                   $('.vi-acc-del-range').text().toLowerCase().includes('out of stock') ||
                   $('.msgTextAlign').text().toLowerCase().includes('ended');

    if (soldOut) {
      return {
        url,
        platform: 'ebay',
        inStock: false,
        priceChanged: false,
        lastChecked: new Date(),
        error: 'Item sold out or listing ended'
      };
    }

    // Extract current price
    const priceText = $('.x-price-primary span[itemprop="price"]').text() ||
                     $('.notranslate.vi-VR-cvipPrice').text() ||
                     $('#prcIsum').text();

    const currentPrice = this.parsePrice(priceText);

    const priceChanged = expectedPrice !== undefined &&
                        currentPrice !== undefined &&
                        Math.abs(currentPrice - expectedPrice) > 0.01;

    return {
      url,
      platform: 'ebay',
      inStock: true,
      price: currentPrice,
      priceChanged,
      lastChecked: new Date()
    };
  }

  /**
   * Check Amazon listing availability
   */
  private async checkAmazonAvailability(
    url: string,
    expectedPrice?: number
  ): Promise<AvailabilityCheck> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });

    if (response.status === 404) {
      return {
        url,
        platform: 'amazon',
        inStock: false,
        priceChanged: false,
        lastChecked: new Date(),
        error: 'Item not found on Amazon'
      };
    }

    const $ = cheerio.load(response.data);

    // Check availability
    const outOfStock = $('#availability').text().toLowerCase().includes('out of stock') ||
                      $('#availability').text().toLowerCase().includes('currently unavailable') ||
                      $('#outOfStock').length > 0;

    if (outOfStock) {
      return {
        url,
        platform: 'amazon',
        inStock: false,
        priceChanged: false,
        lastChecked: new Date(),
        error: 'Out of stock on Amazon'
      };
    }

    // Extract price
    const priceText = $('.a-price .a-offscreen').first().text() ||
                     $('#priceblock_ourprice').text() ||
                     $('#priceblock_dealprice').text();

    const currentPrice = this.parsePrice(priceText);

    const priceChanged = expectedPrice !== undefined &&
                        currentPrice !== undefined &&
                        Math.abs(currentPrice - expectedPrice) > 0.01;

    return {
      url,
      platform: 'amazon',
      inStock: true,
      price: currentPrice,
      priceChanged,
      lastChecked: new Date()
    };
  }

  /**
   * Check Walmart listing availability
   */
  private async checkWalmartAvailability(
    url: string,
    expectedPrice?: number
  ): Promise<AvailabilityCheck> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });

    if (response.status === 404) {
      return {
        url,
        platform: 'walmart',
        inStock: false,
        priceChanged: false,
        lastChecked: new Date(),
        error: 'Item not found on Walmart'
      };
    }

    const $ = cheerio.load(response.data);

    // Walmart's availability is in JSON-LD usually
    let inStock = true;
    let currentPrice: number | undefined;

    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json.offers) {
          inStock = json.offers.availability !== 'OutOfStock';
          currentPrice = parseFloat(json.offers.price);
        }
      } catch (e) {
        // Ignore
      }
    });

    const priceChanged = expectedPrice !== undefined &&
                        currentPrice !== undefined &&
                        Math.abs(currentPrice - expectedPrice) > 0.01;

    return {
      url,
      platform: 'walmart',
      inStock,
      price: currentPrice,
      priceChanged,
      lastChecked: new Date()
    };
  }

  /**
   * Generic availability check
   */
  private async checkGenericAvailability(
    url: string,
    expectedPrice?: number
  ): Promise<AvailabilityCheck> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
      validateStatus: (status) => status < 500
    });

    if (response.status === 404) {
      return {
        url,
        platform: 'other',
        inStock: false,
        priceChanged: false,
        lastChecked: new Date(),
        error: 'Item not found (404)'
      };
    }

    const $ = cheerio.load(response.data);

    // Look for common out of stock indicators
    const bodyText = $('body').text().toLowerCase();
    const outOfStock = bodyText.includes('out of stock') ||
                      bodyText.includes('sold out') ||
                      bodyText.includes('unavailable');

    return {
      url,
      platform: 'other',
      inStock: !outOfStock,
      priceChanged: false,
      lastChecked: new Date()
    };
  }

  /**
   * Generate alert if availability changed
   */
  generateAlert(
    listingId: string,
    sourceUrl: string,
    check: AvailabilityCheck,
    previousPrice?: number
  ): MonitoringAlert | null {
    // Out of stock alert
    if (!check.inStock) {
      return {
        listingId,
        sourceUrl,
        alertType: check.error?.includes('removed') || check.error?.includes('404')
          ? 'item_removed'
          : 'out_of_stock',
        message: check.error || 'Item is no longer available',
        timestamp: new Date()
      };
    }

    // Price change alert
    if (check.priceChanged && previousPrice !== undefined && check.price !== undefined) {
      const alertType = check.price > previousPrice ? 'price_increase' : 'price_decrease';
      const diff = Math.abs(check.price - previousPrice);
      const percentChange = ((diff / previousPrice) * 100).toFixed(1);

      return {
        listingId,
        sourceUrl,
        alertType,
        oldPrice: previousPrice,
        newPrice: check.price,
        message: `Price ${alertType === 'price_increase' ? 'increased' : 'decreased'} by $${diff.toFixed(2)} (${percentChange}%)`,
        timestamp: new Date()
      };
    }

    return null; // No alert needed
  }

  /**
   * Parse price from text
   */
  private parsePrice(text: string): number | undefined {
    if (!text) return undefined;

    // Remove currency symbols and commas
    const cleaned = text.replace(/[$,]/g, '').trim();

    // Extract first number
    const match = cleaned.match(/[\d.]+/);
    if (match) {
      return parseFloat(match[0]);
    }

    return undefined;
  }

  /**
   * Detect platform from URL
   */
  private detectPlatform(url: string): 'ebay' | 'amazon' | 'walmart' | 'other' {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('ebay.')) return 'ebay';
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('walmart.')) return 'walmart';

    return 'other';
  }

  /**
   * Calculate next check time based on listing age and activity
   */
  calculateNextCheckTime(
    listedAt: Date,
    lastSold?: Date,
    customInterval?: number
  ): Date {
    const now = new Date();
    let intervalMinutes = customInterval || 15; // Default 15 minutes

    // New listings (< 24 hours): Check every 10 minutes
    const listingAgeHours = (now.getTime() - listedAt.getTime()) / (1000 * 60 * 60);
    if (listingAgeHours < 24) {
      intervalMinutes = 10;
    }

    // Recently sold (< 7 days): Check more frequently
    if (lastSold) {
      const daysSinceLastSale = (now.getTime() - lastSold.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSale < 7) {
        intervalMinutes = 10;
      }
    }

    // Older listings (> 30 days): Check less frequently
    if (listingAgeHours > 24 * 30) {
      intervalMinutes = 30;
    }

    const nextCheck = new Date(now.getTime() + intervalMinutes * 60 * 1000);
    return nextCheck;
  }
}

export default AvailabilityMonitor;
