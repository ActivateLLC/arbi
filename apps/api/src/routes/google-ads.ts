/**
 * Google Ads Campaign Automation API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { ApiError } from '../middleware/errorHandler';
import {
  createAutomatedCampaign,
  createBulkCampaigns,
  getCampaignMetrics,
  ProductAdData,
  CampaignConfig,
} from '../services/google-ads/campaignAutomation';
import { getListings } from './marketplace';

const router = Router();

/**
 * Fetch active marketplace listings (via getListings, which handles the DB +
 * in-memory fallback) and map them into the ProductAdData shape the campaign
 * automation expects. Optionally filter by a minimum profit margin (%).
 */
async function getActiveProductsForAds(limit: number, minProfitMargin = 0): Promise<ProductAdData[]> {
  const listings = await getListings('active');

  return (listings as any[])
    .map((l) => {
      const price = Number(l.marketplacePrice) || 0;
      const profit = Number(l.estimatedProfit) || 0;
      const profitMargin = price > 0 ? Math.round((profit / price) * 100) : 0;
      return {
        productId: l.listingId,
        productName: l.productTitle,
        productPrice: price,
        profitMargin,
        category: l.supplierPlatform || 'general',
        targetCountry: 'US',
        landingPageUrl: `https://www.arbi.creai.dev/product/${l.listingId}`,
        videoUrl: undefined,
      } as ProductAdData;
    })
    .filter((p) => p.profitMargin >= minProfitMargin)
    .sort((a, b) => b.profitMargin - a.profitMargin)
    .slice(0, limit);
}

/**
 * POST /api/google-ads/create-campaign
 * Create a single Google Ads campaign
 */
router.post('/create-campaign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product, config } = req.body;

    if (!product || !product.productName || !product.landingPageUrl) {
      throw new ApiError(400, 'Product data with productName and landingPageUrl is required');
    }

    if (!config || !config.dailyBudget) {
      throw new ApiError(400, 'Campaign config with dailyBudget is required');
    }

    const result = await createAutomatedCampaign(product, config);

    res.status(201).json({
      success: true,
      message: `Campaign created for ${product.productName}`,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Campaign creation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads/create-bulk-campaigns
 * Create campaigns for multiple products
 */
router.post('/create-bulk-campaigns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { products, config } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new ApiError(400, 'products array is required');
    }

    if (!config || !config.dailyBudget) {
      throw new ApiError(400, 'Campaign config with dailyBudget is required');
    }

    const result = await createBulkCampaigns(products, config);

    res.status(201).json({
      success: true,
      message: `Created ${result.success} campaigns, ${result.failed} failed`,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Bulk campaign creation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads/auto-campaign-from-marketplace
 * Automatically create campaigns for top Arbi marketplace products
 */
router.post('/auto-campaign-from-marketplace', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 10, minProfitMargin = 20, dailyBudgetPerProduct = 50 } = req.body;

    console.log(`🎯 Fetching top ${limit} products with ${minProfitMargin}% minimum profit margin...`);

    // Get top profitable active listings from the marketplace data store
    const productAdData = await getActiveProductsForAds(limit, minProfitMargin);

    if (productAdData.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No products found with minimum ${minProfitMargin}% profit margin`,
        campaigns: [],
      });
    }

    console.log(`✅ Found ${productAdData.length} products. Creating campaigns...`);

    // Create campaigns
    const config: CampaignConfig = {
      dailyBudget: dailyBudgetPerProduct,
      targetROAS: 3.0, // Target $3 revenue per $1 spent
      geoTargeting: ['US', 'CA', 'GB'],
      maxCPC: 2.0, // Max $2 per click
    };

    const result = await createBulkCampaigns(productAdData, config);

    res.status(201).json({
      success: true,
      message: `Created ${result.success} campaigns for top marketplace products`,
      totalProducts: productAdData.length,
      ...result,
      totalBudget: productAdData.length * dailyBudgetPerProduct,
      estimatedMonthlySpend: productAdData.length * dailyBudgetPerProduct * 30,
    });
  } catch (error: any) {
    console.error('❌ Auto-campaign creation failed:', error.message);
    next(error);
  }
});

/**
 * GET /api/google-ads/campaign/:campaignId/metrics
 * Get performance metrics for a campaign
 */
router.get('/campaign/:campaignId/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      throw new ApiError(400, 'campaignId is required');
    }

    const metrics = await getCampaignMetrics(campaignId);

    res.status(200).json({
      success: true,
      campaignId,
      metrics,
    });
  } catch (error: any) {
    console.error('❌ Failed to get metrics:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads/quick-start
 * One-click setup: Create campaigns for all high-profit products
 */
router.post('/quick-start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🚀 Google Ads Quick Start - Automated Campaign Creation');

    // Step 1: Get top 5 highest-margin active listings (30%+ margin)
    const products = await getActiveProductsForAds(5, 30);

    if (products.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No products with 30%+ profit margin found. Add products first.',
      });
    }

    console.log(`✅ Found ${products.length} high-margin products`);

    // Step 2: Create campaigns with conservative budget
    const config: CampaignConfig = {
      dailyBudget: 20, // Start conservative at $20/day per product
      targetROAS: 4.0, // Target $4 revenue per $1 spent (aggressive)
      geoTargeting: ['US'],
      maxCPC: 1.5,
    };

    const result = await createBulkCampaigns(products, config);

    res.status(201).json({
      success: true,
      message: `🎉 Quick Start Complete! Created ${result.success} campaigns`,
      campaigns: result.results,
      budget: {
        dailyBudget: products.length * 20,
        estimatedMonthlySpend: products.length * 20 * 30,
        projectedMonthlyRevenue: products.length * 20 * 30 * 4, // 4x ROAS target
      },
      nextSteps: [
        'Review campaigns in Google Ads dashboard',
        'Enable campaigns when ready to start spending',
        'Monitor performance and adjust budgets',
        'Extract winning ad videos to improve performance',
      ],
    });
  } catch (error: any) {
    console.error('❌ Quick start failed:', error.message);
    next(error);
  }
});

/**
 * GET /api/google-ads/quick-start-now?confirm=yes
 * Mobile-tappable trigger for quick-start (creates PAUSED campaigns).
 */
router.get('/quick-start-now', async (req: Request, res: Response, next: NextFunction) => {
  if (req.query.confirm !== 'yes') {
    return res.status(400).json({ success: false, error: 'Add ?confirm=yes to create campaigns (they are created PAUSED).' });
  }
  try {
    const products = await getActiveProductsForAds(5, 30);
    if (products.length === 0) {
      return res.status(200).json({ success: false, message: 'No products with 30%+ profit margin found.' });
    }
    const config: CampaignConfig = { dailyBudget: 20, targetROAS: 4.0, geoTargeting: ['US'], maxCPC: 1.5 };
    const result = await createBulkCampaigns(products, config);
    res.status(201).json({ success: true, message: `Created ${result.success} PAUSED campaign(s)`, ...result });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/google-ads/debug-auth
 * Diagnostic: shows the (masked) credentials the SERVICE actually sees, and
 * directly exchanges the refresh token with Google so we get the exact error.
 * Remove after debugging. Secrets are masked.
 */
router.get('/debug-auth', async (_req: Request, res: Response) => {
  const clientId = (process.env.GOOGLE_ADS_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GOOGLE_ADS_REFRESH_TOKEN || '').trim();

  const env = {
    clientId: clientId ? `${clientId.slice(0, 30)}… (len ${clientId.length})` : '(MISSING)',
    clientSecretPresent: !!clientSecret,
    clientSecretLen: clientSecret.length,
    refreshTokenMasked: refreshToken ? `${refreshToken.slice(0, 6)}…${refreshToken.slice(-6)} (len ${refreshToken.length})` : '(MISSING)',
    refreshTokenStartsWith1Slash: refreshToken.startsWith('1//'),
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '(MISSING)',
    developerTokenPresent: !!process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  };

  let googleTokenExchange: any;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();
    const r = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: () => true,
      timeout: 15000,
    });
    googleTokenExchange = r.status === 200
      ? { status: 200, ok: true, hasAccessToken: !!r.data.access_token }
      : { status: r.status, error: r.data?.error, error_description: r.data?.error_description };
  } catch (e: any) {
    googleTokenExchange = { error: e.message };
  }

  res.json({ env, googleTokenExchange });
});

export default router;
