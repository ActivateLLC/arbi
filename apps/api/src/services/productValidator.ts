/**
 * Product Validation Service
 * Validates that products are still available, profitable, and in demand
 */

import axios from 'axios';

interface ValidationResult {
  listingId: string;
  productTitle: string;
  isValid: boolean;
  inStock: boolean;
  priceValid: boolean;
  profitValid: boolean;
  currentPrice?: number;
  originalPrice?: number;
  currentProfit?: number;
  issues: string[];
  recommendation: 'KEEP' | 'UPDATE_PRICE' | 'REMOVE';
}

export class ProductValidatorService {
  private rainforestApiKey: string | null = null;

  constructor() {
    this.rainforestApiKey = process.env.RAINFOREST_API_KEY || null;
  }

  /**
   * Validate a single product
   */
  async validateProduct(listing: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      listingId: listing.listingId,
      productTitle: listing.productTitle,
      isValid: true,
      inStock: true,
      priceValid: true,
      profitValid: true,
      issues: [],
      recommendation: 'KEEP',
    };

    try {
      // Check if we have supplier info
      if (!listing.supplierUrl || !listing.supplierUrl.includes('amazon.com')) {
        result.issues.push('No Amazon supplier URL');
        result.isValid = false;
        result.recommendation = 'REMOVE';
        return result;
      }

      // Extract ASIN from supplier URL
      const asin = this.extractAsin(listing.supplierUrl);
      if (!asin) {
        result.issues.push('Could not extract ASIN');
        result.isValid = false;
        result.recommendation = 'REMOVE';
        return result;
      }

      // Check current Amazon price via Rainforest API
      if (this.rainforestApiKey) {
        const currentData = await this.fetchAmazonData(asin);

        if (!currentData) {
          result.issues.push('Product not found on Amazon');
          result.inStock = false;
          result.isValid = false;
          result.recommendation = 'REMOVE';
          return result;
        }

        // Check stock status
        if (currentData.availability !== 'in_stock') {
          result.issues.push(`Out of stock: ${currentData.availability}`);
          result.inStock = false;
          result.isValid = false;
          result.recommendation = 'REMOVE';
        }

        // Check price changes
        const currentSupplierPrice = currentData.price || 0;
        const originalSupplierPrice = parseFloat(listing.supplierPrice) || 0;

        result.currentPrice = currentSupplierPrice;
        result.originalPrice = originalSupplierPrice;

        // Price increased by more than 10%
        if (currentSupplierPrice > originalSupplierPrice * 1.1) {
          result.issues.push(`Price increased ${((currentSupplierPrice - originalSupplierPrice) / originalSupplierPrice * 100).toFixed(1)}%`);
          result.priceValid = false;

          // Recalculate profit
          const marketplacePrice = parseFloat(listing.marketplacePrice);
          const newProfit = marketplacePrice - currentSupplierPrice;
          result.currentProfit = newProfit;

          // If profit is still good (>$20), recommend updating
          if (newProfit >= 20) {
            result.recommendation = 'UPDATE_PRICE';
          } else {
            result.isValid = false;
            result.profitValid = false;
            result.recommendation = 'REMOVE';
            result.issues.push('Profit margin too low after price increase');
          }
        }

        // Price decreased (good!)
        if (currentSupplierPrice < originalSupplierPrice * 0.9) {
          const savings = originalSupplierPrice - currentSupplierPrice;
          result.issues.push(`Price dropped $${savings.toFixed(2)} - can increase margin!`);
          result.recommendation = 'UPDATE_PRICE';
        }
      } else {
        result.issues.push('Rainforest API not configured - skipping live validation');
      }

      // Check if listing is too old (>30 days)
      const listingDate = new Date(listing.createdAt);
      const daysSinceListing = (Date.now() - listingDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceListing > 30) {
        result.issues.push(`Listing is ${Math.floor(daysSinceListing)} days old - recommend refresh`);
        result.recommendation = 'UPDATE_PRICE';
      }

    } catch (error: any) {
      result.issues.push(`Validation error: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate all products
   */
  async validateAllProducts(listings: any[]): Promise<{
    totalProducts: number;
    validProducts: number;
    needsUpdate: number;
    shouldRemove: number;
    results: ValidationResult[];
  }> {
    console.log(`\n🔍 Validating ${listings.length} products...\n`);

    const results: ValidationResult[] = [];

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      console.log(`[${i + 1}/${listings.length}] Validating: ${listing.productTitle}`);

      const result = await this.validateProduct(listing);
      results.push(result);

      // Log status
      if (result.isValid) {
        console.log(`   ✅ Valid - ${result.recommendation}`);
      } else {
        console.log(`   ❌ Invalid - ${result.issues.join(', ')}`);
      }

      // Rate limit (1 request per second for Rainforest API)
      if (i < listings.length - 1 && this.rainforestApiKey) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const summary = {
      totalProducts: listings.length,
      validProducts: results.filter(r => r.recommendation === 'KEEP').length,
      needsUpdate: results.filter(r => r.recommendation === 'UPDATE_PRICE').length,
      shouldRemove: results.filter(r => r.recommendation === 'REMOVE').length,
      results,
    };

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Total: ${summary.totalProducts}`);
    console.log(`   ✅ Valid: ${summary.validProducts}`);
    console.log(`   🔄 Needs Update: ${summary.needsUpdate}`);
    console.log(`   ❌ Should Remove: ${summary.shouldRemove}`);

    return summary;
  }

  /**
   * Extract ASIN from Amazon URL
   */
  private extractAsin(url: string): string | null {
    const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    return match ? (match[1] || match[2]) : null;
  }

  /**
   * Fetch current Amazon data via Rainforest API
   */
  private async fetchAmazonData(asin: string): Promise<any> {
    if (!this.rainforestApiKey) return null;

    try {
      const response = await axios.get('https://api.rainforestapi.com/request', {
        params: {
          api_key: this.rainforestApiKey,
          type: 'product',
          amazon_domain: 'amazon.com',
          asin: asin,
        },
        timeout: 10000,
      });

      const product = response.data.product;

      return {
        title: product.title,
        price: product.buybox_winner?.price?.value || 0,
        availability: product.buybox_winner?.availability?.type || 'unknown',
        inStock: product.buybox_winner?.availability?.type === 'in_stock',
      };
    } catch (error: any) {
      console.error(`   ⚠️  Rainforest API error for ${asin}: ${error.message}`);
      return null;
    }
  }
}

// Export singleton
export const productValidator = new ProductValidatorService();
