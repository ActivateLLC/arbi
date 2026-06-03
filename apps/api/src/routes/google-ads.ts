/**
 * Google Ads Campaign Automation API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import {
  createAutomatedCampaign,
  createBulkCampaigns,
  getCampaignMetrics,
  ProductAdData,
  CampaignConfig,
} from '../services/google-ads/campaignAutomation';
import { prisma } from '@arbi/data';

const router = Router();

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

    // Get top profitable products from marketplace
    const products = await prisma.listing.findMany({
      where: {
        status: 'active',
        profitMargin: {
          gte: minProfitMargin,
        },
      },
      orderBy: {
        profitMargin: 'desc',
      },
      take: limit,
      select: {
        id: true,
        title: true,
        price: true,
        profitMargin: true,
        category: true,
        imageUrl: true,
        url: true,
      },
    });

    if (products.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No products found with minimum ${minProfitMargin}% profit margin`,
        campaigns: [],
      });
    }

    console.log(`✅ Found ${products.length} products. Creating campaigns...`);

    // Transform to ProductAdData format
    const productAdData: ProductAdData[] = products.map(p => ({
      productId: p.id,
      productName: p.title,
      productPrice: p.price,
      profitMargin: p.profitMargin,
      category: p.category,
      targetCountry: 'US', // Default to US, can be made dynamic
      landingPageUrl: `https://arbi.creai.dev/product/${p.id}`,
      videoUrl: undefined, // Can be populated if we have extracted winning ads
    }));

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
      totalProducts: products.length,
      ...result,
      totalBudget: products.length * dailyBudgetPerProduct,
      estimatedMonthlySpend: products.length * dailyBudgetPerProduct * 30,
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

    // Step 1: Get top 5 highest profit margin products
    const topProducts = await prisma.listing.findMany({
      where: {
        status: 'active',
        profitMargin: {
          gte: 30, // Only products with 30%+ margin
        },
      },
      orderBy: {
        profitMargin: 'desc',
      },
      take: 5,
      select: {
        id: true,
        title: true,
        price: true,
        profitMargin: true,
        category: true,
        url: true,
      },
    });

    if (topProducts.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No products with 30%+ profit margin found. Add products first.',
      });
    }

    console.log(`✅ Found ${topProducts.length} high-margin products`);

    // Step 2: Transform to campaign format
    const products: ProductAdData[] = topProducts.map(p => ({
      productId: p.id,
      productName: p.title,
      productPrice: p.price,
      profitMargin: p.profitMargin,
      category: p.category,
      targetCountry: 'US',
      landingPageUrl: `https://arbi.creai.dev/product/${p.id}`,
    }));

    // Step 3: Create campaigns with conservative budget
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
        dailyBudget: topProducts.length * 20,
        estimatedMonthlySpend: topProducts.length * 20 * 30,
        projectedMonthlyRevenue: topProducts.length * 20 * 30 * 4, // 4x ROAS target
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

export default router;
