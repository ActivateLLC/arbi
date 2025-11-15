export interface ProfitCalculation {
  sourcePrice: number;
  targetPrice: number;
  sourceFees: FeesBreakdown;
  targetFees: FeesBreakdown;
  shippingCosts: ShippingCosts;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number; // Percentage
  roi: number; // Return on Investment percentage
}

export interface FeesBreakdown {
  platform: string;
  listingFee: number;
  finalValueFee: number;
  paymentProcessingFee: number;
  totalFees: number;
}

export interface ShippingCosts {
  inbound: number; // Supplier to you
  outbound: number; // You to customer
  packaging: number;
  total: number;
}

export class ProfitCalculator {
  /**
   * Calculate profit for eBay → Amazon arbitrage
   */
  calculateEbayToAmazon(
    ebayPrice: number,
    amazonPrice: number,
    options: {
      ebayShipping?: number;
      itemWeight?: number; // pounds
      itemSize?: 'small' | 'medium' | 'large';
      category?: string;
    } = {}
  ): ProfitCalculation {
    const { ebayShipping = 0, itemWeight = 1, itemSize = 'small' } = options;

    // eBay costs (buying side)
    const sourceFees: FeesBreakdown = {
      platform: 'eBay',
      listingFee: 0, // Usually free to buy
      finalValueFee: 0, // No fees when buying
      paymentProcessingFee: ebayPrice * 0.029 + 0.3, // PayPal/Credit card fees
      totalFees: ebayPrice * 0.029 + 0.3,
    };

    // Amazon fees (selling side)
    const amazonReferralRate = this.getAmazonReferralRate(options.category);
    const fbaFulfillmentFee = this.getAmazonFBAFee(itemWeight, itemSize);

    const targetFees: FeesBreakdown = {
      platform: 'Amazon FBA',
      listingFee: 0.99, // Individual seller plan per item
      finalValueFee: amazonPrice * amazonReferralRate,
      paymentProcessingFee: 0, // Included in referral fee
      totalFees: 0.99 + amazonPrice * amazonReferralRate + fbaFulfillmentFee,
    };

    // Shipping costs
    const shippingCosts: ShippingCosts = {
      inbound: ebayShipping,
      outbound: 0, // FBA handles this
      packaging: 0.5, // Estimate for poly mailer/box
      total: ebayShipping + 0.5,
    };

    // Total calculations
    const totalCost = ebayPrice + sourceFees.totalFees + shippingCosts.total;
    const totalRevenue = amazonPrice - targetFees.totalFees;
    const netProfit = totalRevenue - totalCost;
    const profitMargin = (netProfit / amazonPrice) * 100;
    const roi = (netProfit / totalCost) * 100;

    return {
      sourcePrice: ebayPrice,
      targetPrice: amazonPrice,
      sourceFees,
      targetFees,
      shippingCosts,
      totalCost,
      totalRevenue,
      netProfit,
      profitMargin,
      roi,
    };
  }

  /**
   * Calculate profit for Amazon → eBay arbitrage
   */
  calculateAmazonToEbay(
    amazonPrice: number,
    ebayPrice: number,
    options: {
      amazonShipping?: number;
      itemWeight?: number;
      itemSize?: 'small' | 'medium' | 'large';
      category?: string;
    } = {}
  ): ProfitCalculation {
    const { amazonShipping = 0, itemWeight = 1, itemSize = 'small' } = options;

    // Amazon costs (buying side)
    const sourceFees: FeesBreakdown = {
      platform: 'Amazon',
      listingFee: 0,
      finalValueFee: 0,
      paymentProcessingFee: 0, // Built into Amazon pricing
      totalFees: 0,
    };

    // eBay fees (selling side)
    const targetFees: FeesBreakdown = {
      platform: 'eBay',
      listingFee: 0, // Free for most listings
      finalValueFee: ebayPrice * 0.1325, // ~13.25% final value fee
      paymentProcessingFee: ebayPrice * 0.029 + 0.3, // Managed payments
      totalFees: ebayPrice * 0.1625 + 0.3,
    };

    // Shipping costs
    const shippingEstimate = this.estimateShippingCost(itemWeight, itemSize);

    const shippingCosts: ShippingCosts = {
      inbound: amazonShipping,
      outbound: shippingEstimate,
      packaging: 0.5,
      total: amazonShipping + shippingEstimate + 0.5,
    };

    // Total calculations
    const totalCost = amazonPrice + sourceFees.totalFees + shippingCosts.total;
    const totalRevenue = ebayPrice - targetFees.totalFees;
    const netProfit = totalRevenue - totalCost;
    const profitMargin = (netProfit / ebayPrice) * 100;
    const roi = (netProfit / totalCost) * 100;

    return {
      sourcePrice: amazonPrice,
      targetPrice: ebayPrice,
      sourceFees,
      targetFees,
      shippingCosts,
      totalCost,
      totalRevenue,
      netProfit,
      profitMargin,
      roi,
    };
  }

  /**
   * Get Amazon referral fee rate by category
   */
  private getAmazonReferralRate(category?: string): number {
    const rates: { [key: string]: number } = {
      Electronics: 0.08, // 8%
      'Home & Garden': 0.15, // 15%
      'Toys & Games': 0.15,
      'Sports & Outdoors': 0.15,
      Books: 0.15,
      'Video Games': 0.15,
      Default: 0.15,
    };

    return rates[category || 'Default'] || 0.15;
  }

  /**
   * Get Amazon FBA fulfillment fee estimate
   */
  private getAmazonFBAFee(weight: number, size: string): number {
    if (size === 'small') {
      return 3.22; // Small standard-size
    } else if (size === 'medium') {
      if (weight <= 1) return 3.86;
      if (weight <= 2) return 4.66;
      return 5.16;
    } else {
      // Large
      if (weight <= 1) return 5.42;
      if (weight <= 2) return 6.04;
      return 7.17;
    }
  }

  /**
   * Estimate shipping cost based on weight and size
   */
  private estimateShippingCost(weight: number, size: string): number {
    if (size === 'small' && weight <= 1) {
      return 4.99; // USPS First Class
    } else if (weight <= 3) {
      return 8.99; // USPS Priority Mail Small Flat Rate
    } else if (weight <= 5) {
      return 12.99; // USPS Priority Mail Medium Flat Rate
    } else {
      return 19.99; // USPS Priority Mail Large Flat Rate
    }
  }

  /**
   * Determine if opportunity meets minimum thresholds
   */
  isViableOpportunity(profit: ProfitCalculation, thresholds = {
    minROI: 20, // 20% minimum ROI
    minProfit: 5, // $5 minimum profit
    minMargin: 10, // 10% profit margin
  }): boolean {
    return (
      profit.roi >= thresholds.minROI &&
      profit.netProfit >= thresholds.minProfit &&
      profit.profitMargin >= thresholds.minMargin
    );
  }
}
