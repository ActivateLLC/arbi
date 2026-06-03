/**
 * Reddit Automated Posting Endpoint
 * POST /api/reddit/post-deals
 */

import { Router } from 'express';
import { redditPoster } from '../services/redditPoster';

const router = Router();

/**
 * POST /api/reddit/post-deals
 * Automatically post top deals to Reddit
 */
router.post('/post-deals', async (req, res) => {
  try {
    console.log('🚀 Starting automated Reddit posting...\n');

    // Get Reddit credentials from env or request
    const redditUsername = process.env.REDDIT_USERNAME || req.body.username;
    const redditPassword = process.env.REDDIT_PASSWORD || req.body.password;

    if (!redditUsername || !redditPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reddit credentials required',
        message: 'Set REDDIT_USERNAME and REDDIT_PASSWORD env vars or pass in request body',
      });
    }

    // Fetch top products
    const { getListings } = require('./marketplace');
    const listings = await getListings('active');

    if (listings.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No products available',
      });
    }

    console.log(`📦 Found ${listings.length} products to promote`);

    // Sort by profit margin
    const sortedProducts = listings
      .filter((l: any) => l.estimatedProfit)
      .sort((a: any, b: any) => {
        const profitA = parseFloat(a.estimatedProfit) || 0;
        const profitB = parseFloat(b.estimatedProfit) || 0;
        return profitB - profitA;
      });

    // Get top 10 products
    const topProducts = sortedProducts.slice(0, 10).map((listing: any) => ({
      title: listing.productTitle,
      price: parseFloat(listing.marketplacePrice),
      profit: parseFloat(listing.estimatedProfit),
      link: `https://arbi.market/p/${listing.listingId}`,
    }));

    console.log(`\n🎯 Posting ${topProducts.length} products to Reddit...\n`);

    // Post to Reddit
    const results = await redditPoster.postProductDeals(
      topProducts,
      redditUsername,
      redditPassword
    );

    // Cleanup
    await redditPoster.close();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`\n✅ Reddit posting complete: ${successCount} successful, ${failCount} failed`);

    return res.json({
      success: true,
      message: `Posted to ${successCount} subreddits`,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('❌ Reddit posting error:', error);

    // Cleanup on error
    try {
      await redditPoster.close();
    } catch (_) {}

    return res.status(500).json({
      success: false,
      error: 'Reddit posting failed',
      message: error.message,
    });
  }
});

export default router;
