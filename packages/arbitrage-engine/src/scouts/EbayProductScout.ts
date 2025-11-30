import axios from 'axios';

export interface EbayProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string;
  itemWebUrl: string;
  condition: string;
  seller: {
    username: string;
    feedbackScore: number;
    feedbackPercentage: number;
  };
  shippingCost?: number;
  location: string;
  categoryId: string;
  upc?: string;
  isbn?: string;
  mpn?: string; // Manufacturer Part Number
}

export interface EbaySearchParams {
  keywords?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'NEW' | 'USED' | 'REFURBISHED';
  limit?: number;
}

export class EbayProductScout {
  private readonly appId: string;
  private readonly apiUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';

  constructor(appId?: string) {
    this.appId = appId || process.env.EBAY_APP_ID || '';
  }

  /**
   * Search eBay for products using Finding API (or Browse API if available)
   * For now, demonstrates the structure. Real implementation needs eBay App ID.
   */
  async searchProducts(params: EbaySearchParams): Promise<EbayProduct[]> {
    if (!this.appId) {
      console.warn('⚠️  eBay App ID not configured. Using mock data.');
      return this.getMockProducts(params);
    }

    try {
      // Using eBay Finding API
      const response = await axios.get(this.apiUrl, {
        params: {
          'OPERATION-NAME': 'findItemsAdvanced',
          'SERVICE-VERSION': '1.0.0',
          'SECURITY-APPNAME': this.appId,
          'RESPONSE-DATA-FORMAT': 'JSON',
          'REST-PAYLOAD': true,
          'keywords': params.keywords || '',
          'paginationInput.entriesPerPage': params.limit || 100,
          'itemFilter(0).name': 'ListingType',
          'itemFilter(0).value': 'FixedPrice', // Buy It Now only
          'itemFilter(1).name': 'MinPrice',
          'itemFilter(1).value': params.minPrice || 0,
          'itemFilter(2).name': 'MaxPrice',
          'itemFilter(2).value': params.maxPrice || 1000,
        },
      });

      return this.parseEbayResponse(response.data);
    } catch (error) {
      console.error('❌ eBay API Error:', error);
      return this.getMockProducts(params);
    }
  }

  /**
   * Search for specific product by UPC/ISBN
   */
  async searchByIdentifier(identifier: string, type: 'UPC' | 'ISBN'): Promise<EbayProduct[]> {
    if (!this.appId) {
      return this.getMockProducts({ keywords: identifier });
    }

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          'OPERATION-NAME': 'findItemsByProduct',
          'SERVICE-VERSION': '1.0.0',
          'SECURITY-APPNAME': this.appId,
          'RESPONSE-DATA-FORMAT': 'JSON',
          'REST-PAYLOAD': true,
          'productId.@type': type,
          'productId': identifier,
          'paginationInput.entriesPerPage': 50,
        },
      });

      return this.parseEbayResponse(response.data);
    } catch (error) {
      console.error('❌ eBay Product ID search error:', error);
      return [];
    }
  }

  /**
   * Get trending/hot deals on eBay
   */
  async getTrendingDeals(): Promise<EbayProduct[]> {
    const categories = [
      '293', // Electronics > Computers/Tablets
      '15032', // Electronics > Cell Phones
      '11116', // Home & Garden
      '2984', // Video Games
      '220', // Toys & Hobbies
    ];

    const allDeals: EbayProduct[] = [];

    for (const categoryId of categories) {
      const products = await this.searchProducts({
        categoryId,
        maxPrice: 100, // Focus on lower-priced items for faster turnover
        limit: 20,
      });
      allDeals.push(...products);
    }

    return allDeals;
  }

  private parseEbayResponse(data: any): EbayProduct[] {
    try {
      const searchResult = data.findItemsAdvancedResponse?.[0].searchResult?.[0];
      const items = searchResult?.item || [];

      if (!items.length) {
        return [];
      }

      return items.map((item: any) => ({
        id: item.itemId?.[0] || '',
        title: item.title?.[0] || '',
        price: parseFloat(item.sellingStatus?.[0].currentPrice?.[0].__value__ || '0'),
        currency: item.sellingStatus?.[0].currentPrice?.[0]['@currencyId'] || 'USD',
        imageUrl: item.galleryURL?.[0],
        itemWebUrl: item.viewItemURL?.[0] || '',
        condition: item.condition?.[0].conditionDisplayName?.[0] || 'Unknown',
        seller: {
          username: item.sellerInfo?.[0].sellerUserName?.[0] || '',
          feedbackScore: parseInt(item.sellerInfo?.[0].feedbackScore?.[0] || '0'),
          feedbackPercentage: parseFloat(
            item.sellerInfo?.[0].positiveFeedbackPercent?.[0] || '0'
          ),
        },
        shippingCost: parseFloat(
          item.shippingInfo?.[0].shippingServiceCost?.[0].__value__ || '0'
        ),
        location: item.location?.[0] || '',
        categoryId: item.primaryCategory?.[0].categoryId?.[0] || '',
      }));
    } catch (error) {
      console.error('Error parsing eBay response:', error);
      return [];
    }
  }

  /**
   * Mock products for development/testing
   */
  private getMockProducts(params: EbaySearchParams): EbayProduct[] {
    return [
      {
        id: 'mock_123',
        title: 'Apple AirPods Pro (2nd Generation) - White',
        price: 179.99,
        currency: 'USD',
        imageUrl: 'https://i.ebayimg.com/images/g/airpods.jpg',
        itemWebUrl: 'https://www.ebay.com/itm/mock_123',
        condition: 'New',
        seller: {
          username: 'tech_deals_pro',
          feedbackScore: 15234,
          feedbackPercentage: 99.8,
        },
        shippingCost: 0,
        location: 'California, US',
        categoryId: '15032',
        upc: '194253398455',
      },
      {
        id: 'mock_456',
        title: 'Nintendo Switch OLED Model - Neon Red & Blue',
        price: 289.99,
        currency: 'USD',
        imageUrl: 'https://i.ebayimg.com/images/g/switch.jpg',
        itemWebUrl: 'https://www.ebay.com/itm/mock_456',
        condition: 'New',
        seller: {
          username: 'gaming_outlet',
          feedbackScore: 8765,
          feedbackPercentage: 99.2,
        },
        shippingCost: 5.99,
        location: 'Texas, US',
        categoryId: '2984',
        upc: '045496883638',
      },
      {
        id: 'mock_789',
        title: 'Instant Pot Duo 7-in-1 Electric Pressure Cooker, 6 Quart',
        price: 59.99,
        currency: 'USD',
        imageUrl: 'https://i.ebayimg.com/images/g/instant.jpg',
        itemWebUrl: 'https://www.ebay.com/itm/mock_789',
        condition: 'New',
        seller: {
          username: 'home_essentials',
          feedbackScore: 23456,
          feedbackPercentage: 100.0,
        },
        shippingCost: 0,
        location: 'New York, US',
        categoryId: '11116',
        upc: '817904020234',
      },
    ];
  }
}
