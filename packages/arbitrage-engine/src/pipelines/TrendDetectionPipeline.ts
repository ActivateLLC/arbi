import { KalodataScout } from '../scouts/KalodataScout';
import { VideoDownloader } from '../services/VideoDownloader';
import { ProductSourcingScout } from '../scouts/ProductSourcingScout';
import { Product } from '../types';
import { scoreExpectedValue } from '../scorers/expectedValue';

interface TrendOpportunity {
  product: Product;
  trendScore: number;
  /** Expected profit per month ($) — the price-agnostic lucrativeness metric. */
  expectedMonthlyProfit: number;
  /** Composite 0–100 expected-value rank (primary sort key). */
  lucrativeScore: number;
  videoUrls: string[];
  estimatedProfit: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  supplier?: {
    platform: string;
    price: number;
    shippingCost: number;
    totalCost: number;
    marginPercent: number;
    url: string;
  };
}

interface PipelineConfig {
  minMargin: number;
  minTrendScore: number;
  maxVideos: number;
  enableVideoDownload: boolean;
  autoList: boolean;
  enableSourcing: boolean; // Enable automatic supplier sourcing
}

/**
 * TrendDetectionPipeline - Automated pipeline for detecting and acting on trending products
 *
 * Workflow:
 * 1. Kalodata → Detect trending TikTok products
 * 2. Analyze arbitrage margin (Amazon vs eBay vs supplier)
 * 3. Download UGC videos for marketing
 * 4. Auto-create product listings (if enabled)
 * 5. Launch Google Ads campaigns (if enabled)
 *
 * This is your "money printer" - fully automated from trend detection to sale
 */
export class TrendDetectionPipeline {
  private kalodataScout: KalodataScout;
  private videoDownloader: VideoDownloader;
  private sourcingScout: ProductSourcingScout;
  private config: PipelineConfig;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.kalodataScout = new KalodataScout();
    this.videoDownloader = new VideoDownloader();
    this.sourcingScout = new ProductSourcingScout();

    this.config = {
      minMargin: 25, // 25% minimum margin
      minTrendScore: 70, // 0-100 trend score
      maxVideos: 5, // Max videos to download per product
      enableVideoDownload: true,
      autoList: false, // Safety: don't auto-list by default
      enableSourcing: true, // Auto-find best suppliers
      ...config,
    };

    console.log('🚀 [TrendDetectionPipeline] Initialized with config:', this.config);
  }

  /**
   * Main pipeline execution
   */
  async execute(): Promise<TrendOpportunity[]> {
    console.log('🔄 [TrendDetectionPipeline] Starting trend detection...');

    try {
      // Step 1: Get trending products from Kalodata
      const trendingProducts = await this.kalodataScout.detectTrendingOpportunities(
        this.config.minMargin
      );

      console.log(`📊 [TrendDetectionPipeline] Found ${trendingProducts.length} trending products`);

      if (trendingProducts.length === 0) {
        console.log('⚠️  [TrendDetectionPipeline] No trending products found');
        return [];
      }

      // Step 2: Analyze each product for arbitrage potential
      const opportunities: TrendOpportunity[] = [];

      for (const product of trendingProducts) {
        try {
          const opportunity = await this.analyzeProduct(product);

          if (opportunity && opportunity.trendScore >= this.config.minTrendScore) {
            opportunities.push(opportunity);
            console.log(`✅ [TrendDetectionPipeline] High-potential opportunity: ${product.title}`);
          }
        } catch (error: any) {
          console.error(`❌ [TrendDetectionPipeline] Failed to analyze product:`, error.message);
        }
      }

      // Rank by expected value (expected monthly profit) — demand × premium,
      // price-agnostic. trendScore still gates entry; lucrativeScore orders winners.
      opportunities.sort((a, b) => b.lucrativeScore - a.lucrativeScore);

      console.log(`🎯 [TrendDetectionPipeline] Found ${opportunities.length} high-potential opportunities`);

      // Step 3: Download videos for top opportunities (if enabled)
      if (this.config.enableVideoDownload) {
        await this.downloadVideosForOpportunities(opportunities);
      }

      // Step 4: Auto-list products (if enabled)
      if (this.config.autoList) {
        await this.autoListOpportunities(opportunities);
      }

      return opportunities;
    } catch (error: any) {
      console.error(`❌ [TrendDetectionPipeline] Pipeline failed:`, error.message);
      throw error;
    }
  }

  /**
   * Analyze a product for trend and arbitrage potential
   */
  private async analyzeProduct(product: Product): Promise<TrendOpportunity | null> {
    console.log(`🔍 [TrendDetectionPipeline] Analyzing: ${product.title}`);

    try {
      // Step 1: Find best supplier (if enabled)
      let supplierInfo;
      let actualMarginPercent = product.marginPercent;
      let actualProfit = product.margin || (product.price - product.buyPrice);

      if (this.config.enableSourcing) {
        try {
          console.log(`   🔎 [Sourcing] Finding suppliers for: ${product.title}`);

          const sourcingResult = await this.sourcingScout.findSuppliers(
            product.title,
            product.price
          );

          if (sourcingResult.suppliers.length > 0) {
            const bestSupplier = sourcingResult.bestMargin.supplier;
            const totalCost = bestSupplier.supplierPrice + bestSupplier.shippingCost;

            // Recalculate margins with real supplier cost
            actualProfit = product.price - totalCost;
            actualMarginPercent = (actualProfit / product.price) * 100;

            supplierInfo = {
              platform: bestSupplier.sourcePlatform,
              price: bestSupplier.supplierPrice,
              shippingCost: bestSupplier.shippingCost,
              totalCost,
              marginPercent: actualMarginPercent,
              url: bestSupplier.sourceUrl,
            };

            console.log(`   ✅ [Sourcing] Best supplier: ${bestSupplier.sourcePlatform} - $${totalCost.toFixed(2)} (${actualMarginPercent.toFixed(1)}% margin)`);
          } else {
            console.log(`   ⚠️  [Sourcing] No suppliers found, using original margin`);
          }
        } catch (error: any) {
          console.error(`   ❌ [Sourcing] Failed: ${error.message}`);
          // Continue with original margin if sourcing fails
        }
      }

      // Step 2: Calculate trend score (0-100)
      const trendScore = this.calculateTrendScore(product);

      // Expected-value ranking: rank by expected monthly profit (demand velocity
      // × premium), price-agnostic and confidence-adjusted. See scorers/expectedValue.
      const value = scoreExpectedValue({
        profitPerUnit: actualProfit,
        marginPercent: actualMarginPercent,
        monthlySalesProxy: product.metadata?.salesCount,
        rating: product.metadata?.rating,
        reviewCount: product.metadata?.reviewCount ?? product.metadata?.ratingCount,
        trending: product.metadata?.trending,
      });

      // Step 3: Get confidence level (use actual margin)
      const confidence = this.getConfidenceLevel(trendScore, actualMarginPercent);

      // Step 4: Generate reasons (use actual margin)
      const reasons = this.generateReasons(product, trendScore, actualMarginPercent);

      // Step 5: Get video URLs for this product
      const videoUrls = await this.getProductVideoUrls(product);

      return {
        product,
        trendScore,
        expectedMonthlyProfit: value.expectedMonthlyProfit,
        lucrativeScore: value.lucrativeScore,
        videoUrls,
        estimatedProfit: actualProfit,
        confidence,
        reasons,
        supplier: supplierInfo,
      };
    } catch (error: any) {
      console.error(`❌ [TrendDetectionPipeline] Analysis failed:`, error.message);
      return null;
    }
  }

  /**
   * Calculate trend score based on multiple factors
   */
  private calculateTrendScore(product: Product): number {
    let score = 0;

    // Factor 1: Sales volume (if available)
    const salesCount = product.metadata?.salesCount || 0;
    if (salesCount > 10000) score += 30;
    else if (salesCount > 5000) score += 20;
    else if (salesCount > 1000) score += 10;

    // Factor 2: Margin percentage
    if (product.marginPercent >= 40) score += 25;
    else if (product.marginPercent >= 30) score += 20;
    else if (product.marginPercent >= 20) score += 15;

    // Factor 3: Trending flag
    if (product.metadata?.trending) score += 20;

    // Factor 4: Rating (if available)
    const rating = product.metadata?.rating || 0;
    if (rating >= 4.5) score += 15;
    else if (rating >= 4.0) score += 10;
    else if (rating >= 3.5) score += 5;

    // Note: price is intentionally NOT a scoring factor. Selection is driven by
    // demand (trend, sales, rating, margin), not by absolute price — the model
    // connects customers to in-demand products for a premium at ANY price point.

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get confidence level
   */
  private getConfidenceLevel(trendScore: number, margin: number): 'high' | 'medium' | 'low' {
    if (trendScore >= 80 && margin >= 30) return 'high';
    if (trendScore >= 60 && margin >= 20) return 'medium';
    return 'low';
  }

  /**
   * Generate reasons for the opportunity
   */
  private generateReasons(product: Product, trendScore: number, actualMarginPercent?: number): string[] {
    const reasons: string[] = [];

    if (product.metadata?.trending) {
      reasons.push('Currently trending on TikTok Shop');
    }

    const marginToUse = actualMarginPercent ?? product.marginPercent;
    if (marginToUse >= 30) {
      reasons.push(`High profit margin: ${marginToUse.toFixed(1)}%`);
    }

    const salesCount = product.metadata?.salesCount;
    if (salesCount && salesCount > 5000) {
      reasons.push(`Strong sales: ${salesCount.toLocaleString()} units sold`);
    }

    const rating = product.metadata?.rating;
    if (rating && rating >= 4.5) {
      reasons.push(`Excellent rating: ${rating}/5.0`);
    }

    if (trendScore >= 80) {
      reasons.push('Very high trend score - act fast!');
    }

    return reasons;
  }

  /**
   * Get video URLs for a product
   */
  private async getProductVideoUrls(product: Product): Promise<string[]> {
    try {
      const videos = await this.kalodataScout.getProductVideos(product.url);
      return videos
        .slice(0, this.config.maxVideos)
        .map(v => v.url)
        .filter(Boolean);
    } catch (error: any) {
      console.error(`❌ [TrendDetectionPipeline] Failed to get videos:`, error.message);
      return [];
    }
  }

  /**
   * Download videos for top opportunities
   */
  private async downloadVideosForOpportunities(opportunities: TrendOpportunity[]): Promise<void> {
    console.log(`🎥 [TrendDetectionPipeline] Downloading videos for ${opportunities.length} opportunities`);

    for (const opp of opportunities) {
      if (opp.videoUrls.length === 0) continue;

      try {
        const videos = opp.videoUrls.map(url => ({
          url,
          metadata: {
            productId: opp.product.id,
            source: 'kalodata',
            tags: ['ugc', 'tiktok', opp.product.category],
          },
        }));

        const results = await this.videoDownloader.downloadMultipleVideos(videos, 2);

        console.log(`✅ [TrendDetectionPipeline] Downloaded ${results.length} videos for: ${opp.product.title}`);

        // Store video URLs in product metadata
        opp.product.metadata = {
          ...opp.product.metadata,
          videoUrls: results.map(r => typeof r === 'string' ? r : r.url),
        };
      } catch (error: any) {
        console.error(`❌ [TrendDetectionPipeline] Video download failed:`, error.message);
      }
    }
  }

  /**
   * Auto-list opportunities (if enabled)
   */
  private async autoListOpportunities(opportunities: TrendOpportunity[]): Promise<void> {
    console.log(`🤖 [TrendDetectionPipeline] Auto-listing ${opportunities.length} opportunities`);

    // TODO: Integrate with your existing listing creation system
    // For now, just log what would be listed
    for (const opp of opportunities) {
      console.log(`📝 [TrendDetectionPipeline] Would auto-list:`);
      console.log(`   - Product: ${opp.product.title}`);
      console.log(`   - Price: $${opp.product.price}`);
      console.log(`   - Margin: ${opp.product.marginPercent.toFixed(1)}%`);
      console.log(`   - Trend Score: ${opp.trendScore}/100`);
      console.log(`   - Videos: ${opp.videoUrls.length}`);
      console.log(`   - Confidence: ${opp.confidence}`);
    }

    // TODO: Call your marketplace listing API
    // await marketplaceAPI.createListing(opp.product);
  }

  /**
   * Generate report of opportunities
   */
  generateReport(opportunities: TrendOpportunity[]): string {
    let report = `\n${'='.repeat(80)}\n`;
    report += `🎯 TREND DETECTION REPORT - ${new Date().toLocaleString()}\n`;
    report += `${'='.repeat(80)}\n\n`;

    report += `📊 Summary:\n`;
    report += `   Total Opportunities: ${opportunities.length}\n`;
    report += `   High Confidence: ${opportunities.filter(o => o.confidence === 'high').length}\n`;
    report += `   Medium Confidence: ${opportunities.filter(o => o.confidence === 'medium').length}\n`;
    report += `   Low Confidence: ${opportunities.filter(o => o.confidence === 'low').length}\n\n`;

    const totalProfit = opportunities.reduce((sum, o) => sum + o.estimatedProfit, 0);
    report += `   Estimated Total Profit (per unit): $${totalProfit.toFixed(2)}\n\n`;

    report += `${'='.repeat(80)}\n\n`;

    opportunities.forEach((opp, index) => {
      report += `${index + 1}. ${opp.product.title}\n`;
      report += `   Trend Score: ${opp.trendScore}/100 | Confidence: ${opp.confidence.toUpperCase()}\n`;
      report += `   Price: $${opp.product.price} | Margin: ${opp.product.marginPercent.toFixed(1)}% | Profit: $${opp.estimatedProfit.toFixed(2)}\n`;
      report += `   Videos: ${opp.videoUrls.length} | Platform: ${opp.product.platform}\n`;
      report += `   Reasons:\n`;
      opp.reasons.forEach(reason => {
        report += `      - ${reason}\n`;
      });
      report += `\n`;
    });

    report += `${'='.repeat(80)}\n`;

    return report;
  }

  /**
   * Schedule automatic execution (run every X hours)
   */
  scheduleExecution(intervalHours: number = 6): NodeJS.Timeout {
    console.log(`⏰ [TrendDetectionPipeline] Scheduling execution every ${intervalHours} hours`);

    const intervalMs = intervalHours * 60 * 60 * 1000;

    return setInterval(async () => {
      console.log(`\n🔔 [TrendDetectionPipeline] Scheduled execution triggered`);

      try {
        const opportunities = await this.execute();
        const report = this.generateReport(opportunities);
        console.log(report);

        // TODO: Send email/Slack notification with report
      } catch (error: any) {
        console.error(`❌ [TrendDetectionPipeline] Scheduled execution failed:`, error.message);
      }
    }, intervalMs);
  }
}
