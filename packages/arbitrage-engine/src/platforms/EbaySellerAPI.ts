// eBay Seller API removed for compliance with web-scraper-only policy

  constructor(accessToken?: string, production: boolean = false) {
    this.accessToken = accessToken || process.env.EBAY_SELLER_ACCESS_TOKEN || '';
    this.isProduction = production;

    // Sandbox vs Production
    this.apiUrl = production
      ? 'https://api.ebay.com'
      : 'https://api.sandbox.ebay.com';

    if (!this.accessToken) {
      console.warn('⚠️  eBay Seller API access token not configured');
      console.warn('   Set EBAY_SELLER_ACCESS_TOKEN environment variable');
      console.warn('   Get token from: https://developer.ebay.com/my/auth/?env=production&index=0');
    }
  }

  /**
   * Create a new eBay listing
   */
  async createListing(request: EbayListingRequest): Promise<EbayListingResponse> {
    if (!this.accessToken) {
      return {
        success: false,
        error: 'eBay Seller API not configured. Set EBAY_SELLER_ACCESS_TOKEN.'
      };
    }

    try {
      console.log(`📝 Creating eBay listing: ${request.productData.title}`);

      // Step 1: Create Inventory Item
      const sku = this.generateSKU();
      const inventoryItem = await this.createInventoryItem(sku, request);

      if (!inventoryItem.success) {
        return inventoryItem;
      }

      // Step 2: Create or Get Product
      // (Optional - needed for catalog items)

      // Step 3: Create Offer
      const offer = await this.createOffer(sku, request);

      if (!offer.success) {
        return offer;
      }

      // Step 4: Publish Offer
      const published = await this.publishOffer(offer.offerId!);

      if (!published.success) {
        return published;
      }

      console.log(`✅ eBay listing created: ${published.listingId}`);

      return {
        success: true,
        listingId: published.listingId,
        sku,
        listingUrl: `https://www.ebay.com/itm/${published.listingId}`
      };
    } catch (error: any) {
      console.error('❌ Failed to create eBay listing:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create inventory item (product details)
   */
  private async createInventoryItem(
    sku: string,
    request: EbayListingRequest
  ): Promise<{ success: boolean; error?: string }> {
    const { productData } = request;

    const inventoryItemData = {
      availability: {
        shipToLocationAvailability: {
          quantity: request.quantity || 1
        }
      },
      condition: this.mapCondition(productData.condition),
      product: {
        title: this.truncate(productData.title, 80),
        description: productData.description,
        imageUrls: productData.images.slice(0, 12).map(img => img.hostedUrl),
        aspects: this.extractAspects(productData)
      }
    };

    // Add UPC/EAN if available
    if (productData.upc) {
      inventoryItemData.product['upc'] = [productData.upc];
    }

    try {
      await axios.put(
        `${this.apiUrl}/sell/inventory/v1/inventory_item/${sku}`,
        inventoryItemData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Content-Language': 'en-US'
          }
        }
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: `Inventory item creation failed: ${error.response?.data?.errors?.[0]?.message || error.message}`
      };
    }
  }

  /**
   * Create offer (pricing and policies)
   */
  private async createOffer(
    sku: string,
    request: EbayListingRequest
  ): Promise<{ success: boolean; offerId?: string; error?: string }> {
    const offerData = {
      sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      listingDuration: request.listingDuration || 'GTC', // Good 'Til Cancelled
      availableQuantity: request.quantity || 1,
      categoryId: request.categoryId || this.guessCategory(request.productData),
      listingPolicies: {
        fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
        paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: process.env.EBAY_RETURN_POLICY_ID
      },
      pricingSummary: {
        price: {
          value: request.price.toFixed(2),
          currency: 'USD'
        }
      },
      merchantLocationKey: process.env.EBAY_LOCATION_KEY || 'default_location'
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/sell/inventory/v1/offer`,
        offerData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Content-Language': 'en-US'
          }
        }
      );

      return {
        success: true,
        offerId: response.data.offerId
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Offer creation failed: ${error.response?.data?.errors?.[0]?.message || error.message}`
      };
    }
  }

  /**
   * Publish offer (make listing live)
   */
  private async publishOffer(
    offerId: string
  ): Promise<{ success: boolean; listingId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/sell/inventory/v1/offer/${offerId}/publish`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        listingId: response.data.listingId
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Publishing failed: ${error.response?.data?.errors?.[0]?.message || error.message}`
      };
    }
  }

  /**
   * End listing (when source item goes out of stock)
   */
  async endListing(listingId: string, reason: string = 'OUT_OF_STOCK'): Promise<boolean> {
    try {
      await axios.post(
        `${this.apiUrl}/sell/inventory/v1/offer/${listingId}/withdraw`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ eBay listing ${listingId} ended: ${reason}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to end listing ${listingId}:`, error.message);
      return false;
    }
  }

  /**
   * Update listing price
   */
  async updatePrice(offerId: string, newPrice: number): Promise<boolean> {
    try {
      await axios.put(
        `${this.apiUrl}/sell/inventory/v1/offer/${offerId}`,
        {
          pricingSummary: {
            price: {
              value: newPrice.toFixed(2),
              currency: 'USD'
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Updated eBay listing price to $${newPrice}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to update price:`, error.message);
      return false;
    }
  }

  /**
   * Map condition to eBay condition enum
   */
  private mapCondition(condition: string): string {
    const conditionMap: Record<string, string> = {
      'new': 'NEW',
      'used': 'USED_EXCELLENT',
      'refurbished': 'SELLER_REFURBISHED',
      'open_box': 'LIKE_NEW'
    };

    return conditionMap[condition.toLowerCase()] || 'USED_EXCELLENT';
  }

  /**
   * Extract product aspects (eBay item specifics)
   */
  private extractAspects(productData: ExtractedProductData): Record<string, string[]> {
    const aspects: Record<string, string[]> = {};

    if (productData.brand) {
      aspects['Brand'] = [productData.brand];
    }

    if (productData.mpn) {
      aspects['MPN'] = [productData.mpn];
    }

    if (productData.condition) {
      aspects['Condition'] = [productData.condition];
    }

    // Add specs as aspects
    if (productData.specs) {
      Object.entries(productData.specs).forEach(([key, value]) => {
        // eBay has specific aspect names, map common ones
        if (typeof value === 'string') {
          aspects[key] = [value];
        }
      });
    }

    return aspects;
  }

  /**
   * Guess category based on product title/specs
   * In production, you'd use eBay's Category Suggestion API
   */
  private guessCategory(productData: ExtractedProductData): string {
    const title = productData.title.toLowerCase();

    // Electronics
    if (title.includes('phone') || title.includes('iphone') || title.includes('samsung')) {
      return '9355'; // Cell Phones & Smartphones
    }
    if (title.includes('laptop') || title.includes('macbook')) {
      return '177'; // PC Laptops & Netbooks
    }
    if (title.includes('tablet') || title.includes('ipad')) {
      return '171485'; // Tablets & eBook Readers
    }
    if (title.includes('watch') || title.includes('apple watch')) {
      return '178893'; // Smart Watches
    }

    // Default to generic category
    return '88433'; // Other Consumer Electronics
  }

  /**
   * Generate unique SKU
   */
  private generateSKU(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `ARBI-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.accessToken;
  }
}

export default EbaySellerAPI;
