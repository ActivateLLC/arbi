/**
 * Google Ads Web Automation API Routes
 * Create campaigns without API access - just login credentials!
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import {
  createCampaignViaWeb,
  createBulkCampaignsViaWeb,
  CampaignData,
} from '../services/google-ads/webAutomation';

const router = Router();

// Mock product data for testing (TODO: Replace with actual database)
const MOCK_PRODUCTS = [
  {
    id: '1',
    title: 'Premium Wireless Headphones',
    price: 79.99,
    profitMargin: 45,
    category: 'Electronics',
    url: 'https://arbi.creai.dev/product/1',
  },
  {
    id: '2',
    title: 'Smart Fitness Tracker Watch',
    price: 49.99,
    profitMargin: 40,
    category: 'Wearables',
    url: 'https://arbi.creai.dev/product/2',
  },
  {
    id: '3',
    title: 'Portable Phone Charger 20000mAh',
    price: 34.99,
    profitMargin: 38,
    category: 'Accessories',
    url: 'https://arbi.creai.dev/product/3',
  },
];

/**
 * POST /api/google-ads-web/create-campaign
 * Create a single campaign via web automation (no API needed!)
 */
router.post('/create-campaign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaign, email, password } = req.body;

    if (!campaign || !campaign.productName || !campaign.productUrl) {
      throw new ApiError(400, 'Campaign data with productName and productUrl is required');
    }

    if (!email || !password) {
      throw new ApiError(400, 'Google Ads email and password are required');
    }

    const result = await createCampaignViaWeb(campaign, { email, password });

    res.status(201).json({
      success: true,
      message: `Campaign created via web automation: ${campaign.productName}`,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ Web automation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads-web/quick-start
 * One-click: Create campaigns for top products using web automation
 */
router.post('/quick-start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, limit = 3, minProfitMargin = 30 } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Google Ads email and password are required');
    }

    console.log('🚀 Quick Start - Web Automation Mode');

    // Get top profitable products (using mock data for now)
    const products = MOCK_PRODUCTS
      .filter(p => p.profitMargin >= minProfitMargin)
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, limit);

    if (products.length === 0) {
      return res.status(200).json({
        success: false,
        message: `No products found with minimum ${minProfitMargin}% profit margin`,
      });
    }

    console.log(`✅ Found ${products.length} high-margin products`);

    // Transform to campaign format
    const campaigns: CampaignData[] = products.map(p => ({
      productName: p.title,
      productUrl: `https://arbi.creai.dev/product/${p.id}`,
      dailyBudget: 20, // Conservative start
      targetCountry: 'United States',
      adCopy: {
        headline: `${p.title} - Best Price Online`,
        description: `Premium ${p.category} at $${p.price}. Fast shipping. Money-back guarantee.`,
      },
    }));

    // Create campaigns
    const result = await createBulkCampaignsViaWeb(campaigns, { email, password });

    res.status(201).json({
      success: true,
      message: `Created ${result.success} campaigns via web automation`,
      ...result,
      budget: {
        dailyBudget: products.length * 20,
        estimatedMonthlySpend: products.length * 20 * 30,
      },
      nextSteps: [
        'Log in to ads.google.com to review campaigns',
        'Enable campaigns when ready to start spending',
        'Monitor performance and adjust budgets',
      ],
    });
  } catch (error: any) {
    console.error('❌ Quick start failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads-web/create-from-marketplace
 * Create campaigns for marketplace products via web automation
 */
router.post('/create-from-marketplace', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      password,
      limit = 5,
      minProfitMargin = 25,
      dailyBudgetPerProduct = 30,
    } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Google Ads email and password are required');
    }

    console.log(`🎯 Creating campaigns for top ${limit} marketplace products...`);

    // Get products (using mock data for now)
    const products = MOCK_PRODUCTS
      .filter(p => p.profitMargin >= minProfitMargin)
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, limit);

    if (products.length === 0) {
      return res.status(200).json({
        success: false,
        message: `No products with ${minProfitMargin}%+ margin`,
      });
    }

    // Transform to campaigns
    const campaigns: CampaignData[] = products.map(p => ({
      productName: p.title,
      productUrl: `https://arbi.creai.dev/product/${p.id}`,
      dailyBudget: dailyBudgetPerProduct,
      targetCountry: 'United States',
      adCopy: {
        headline: `${p.title} - Shop Now`,
        description: `Get ${p.title} at the best price. ${p.profitMargin}% savings. Order today!`,
      },
    }));

    // Create via web automation
    const result = await createBulkCampaignsViaWeb(campaigns, { email, password });

    res.status(201).json({
      success: true,
      message: `Web automation complete: ${result.success} campaigns created`,
      ...result,
      totalBudget: products.length * dailyBudgetPerProduct,
    });
  } catch (error: any) {
    console.error('❌ Marketplace automation failed:', error.message);
    next(error);
  }
});

/**
 * POST /api/google-ads-web/test-login
 * Test Google Ads login credentials
 */
router.post('/test-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    console.log('🔐 Testing Google Ads login...');

    const Stagehand = (await import('@browserbasehq/stagehand')).Stagehand;
    const stagehand = new Stagehand({
      env: 'LOCAL',
      enableCaching: false,
      headless: true,
      domSettleTimeoutMs: 5000,
    });

    await stagehand.init();
    await stagehand.page.goto('https://ads.google.com');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try login
    await stagehand.page.evaluate((e) => {
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      if (emailInput) emailInput.value = e;
    }, email);

    await new Promise(resolve => setTimeout(resolve, 1000));

    await stagehand.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextButton = buttons.find(b => b.textContent?.includes('Next'));
      if (nextButton) (nextButton as HTMLButtonElement).click();
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const loginSuccess = await stagehand.page.evaluate(() => {
      return !document.body.innerText.includes('Couldn\'t find your Google Account');
    });

    await stagehand.close();

    if (loginSuccess) {
      res.status(200).json({
        success: true,
        message: 'Login credentials validated successfully',
      });
    } else {
      throw new ApiError(401, 'Invalid email or account not found');
    }
  } catch (error: any) {
    console.error('❌ Login test failed:', error.message);
    next(error);
  }
});

export default router;
