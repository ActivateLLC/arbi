/**
 * Arbi Marketplace API Service
 * Fetches real data from your marketplace backend
 */

import { ArbitrageOpportunity } from '../types';

export interface ArbiListing {
  listingId: string;
  productTitle: string;
  productDescription: string;
  productPrice: number;
  supplierCost: number;
  profitMargin: number;
  supplierUrl: string;
  productImages: string[];
  createdAt: string;
  isActive: boolean;
}

export interface MarketplaceStats {
  totalListings: number;
  activeListings: number;
  totalPotentialRevenue: number;
  totalPotentialProfit: number;
  averageMargin: number;
  topProducts: ArbiListing[];
}

/**
 * Fetch all marketplace listings
 */
export const getMarketplaceListings = async (): Promise<ArbiListing[]> => {
  try {
    // Use relative path - Vite proxy will route to https://api.arbi.creai.dev
    const response = await fetch('/api/marketplace');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.listings || [];
    
  } catch (error) {
    console.error('Failed to fetch marketplace listings:', error);
    return [];
  }
};

/**
 * Calculate marketplace statistics
 */
export const getMarketplaceStats = async (): Promise<MarketplaceStats> => {
  try {
    const listings = await getMarketplaceListings();
    
    // Filter active listings
    const activeListings = listings.filter(l => l.isActive !== false);
    
    // Calculate totals
    const totalPotentialRevenue = listings.reduce((sum, l) => sum + (l.productPrice || 0), 0);
    const totalPotentialProfit = listings.reduce((sum, l) => sum + (l.profitMargin || 0), 0);
    const averageMargin = listings.length > 0 
      ? listings.reduce((sum, l) => sum + (l.profitMargin || 0), 0) / listings.length 
      : 0;
    
    // Get top 5 products by profit margin
    const topProducts = [...listings]
      .sort((a, b) => (b.profitMargin || 0) - (a.profitMargin || 0))
      .slice(0, 5);
    
    return {
      totalListings: listings.length,
      activeListings: activeListings.length,
      totalPotentialRevenue,
      totalPotentialProfit,
      averageMargin,
      topProducts,
    };
    
  } catch (error) {
    console.error('Failed to calculate stats:', error);
    return {
      totalListings: 0,
      activeListings: 0,
      totalPotentialRevenue: 0,
      totalPotentialProfit: 0,
      averageMargin: 0,
      topProducts: [],
    };
  }
};

/**
 * Scrape images for a product
 */
export const scrapeProductImages = async (listingId: string): Promise<{ success: boolean; images?: string[] }> => {
  try {
    const response = await fetch(`/api/scrape-rainforest/${listingId}`, {
      method: 'POST',
    });

    const data = await response.json();
    return {
      success: data.success,
      images: data.images,
    };

  } catch (error) {
    console.error('Failed to scrape images:', error);
    return { success: false };
  }
};

/**
 * Fetch arbitrage opportunities
 */
export const getArbitrageOpportunities = async (): Promise<ArbitrageOpportunity[]> => {
  try {
    const response = await fetch('/api/arbitrage/opportunities');

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.opportunities || [];

  } catch (error) {
    console.error('Failed to fetch arbitrage opportunities:', error);
    return [];
  }
};

/**
 * Evaluate a specific opportunity
 */
export const evaluateOpportunity = async (productUrl: string, targetMargin?: number): Promise<any> => {
  try {
    const response = await fetch('/api/arbitrage/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUrl, targetMargin }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Failed to evaluate opportunity:', error);
    throw error;
  }
};

/**
 * Auto-list an opportunity (creates listing + scrapes images + launches campaign)
 */
export const autoListOpportunity = async (opportunity: ArbitrageOpportunity): Promise<{ success: boolean; listingId?: string }> => {
  try {
    // 1. Create marketplace listing
    const listingResponse = await fetch('/api/marketplace/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productTitle: opportunity.productTitle,
        productDescription: `High-quality ${opportunity.productTitle} available now!`,
        marketplacePrice: opportunity.marketPrice,
        supplierPrice: opportunity.supplierPrice,
        supplierUrl: opportunity.supplierUrl,
        supplierPlatform: opportunity.supplierPlatform,
      }),
    });

    if (!listingResponse.ok) {
      throw new Error('Failed to create listing');
    }

    const listingData = await listingResponse.json();
    const listingId = listingData.listing?.listingId || listingData.listingId;

    if (!listingId) {
      throw new Error('No listing ID returned');
    }

    // 2. Scrape images (fire and forget - don't wait)
    scrapeProductImages(listingId).catch(err =>
      console.warn('Image scraping failed:', err)
    );

    // 3. Launch campaign (fire and forget)
    fetch(`/api/campaigns/launch/${listingId}`, { method: 'POST' })
      .catch(err => console.warn('Campaign launch failed:', err));

    return { success: true, listingId };

  } catch (error) {
    console.error('Failed to auto-list opportunity:', error);
    return { success: false };
  }
};
