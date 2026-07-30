/**
 * Stock Monitor Cron Job
 * Periodically checks supplier stock status and prices
 * Sends alerts when products go out of stock or prices change
 */

import cron from 'node-cron';
import { supplierManager } from '../services/supplierManager';
import { productValidator } from '../services/productValidator';
import { emailNotifier } from '../services/emailNotifier';
import { getListings } from '../routes/marketplace';

export class StockMonitorJob {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the stock monitor
   * Default: runs every 6 hours
   */
  start(schedule: string = '0 */6 * * *') {
    if (this.cronJob) {
      console.log('⚠️  Stock monitor already running');
      return;
    }

    console.log(`🕐 Starting stock monitor (schedule: ${schedule})`);

    this.cronJob = cron.schedule(schedule, async () => {
      await this.runCheck();
    });

    console.log('✅ Stock monitor started');

    // Run immediate check
    setTimeout(() => this.runCheck(), 5000);
  }

  /**
   * Stop the stock monitor
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🛑 Stock monitor stopped');
    }
  }

  /**
   * Run a stock check manually
   */
  async runCheck(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Stock check already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('\n🔍 STOCK MONITOR: Starting check...');
      console.log(`   Time: ${new Date().toISOString()}`);

      // Get all active listings
      const listings = await getListings('active');
      console.log(`   Active listings: ${listings.length}`);

      let checkedSuppliers = 0;
      let outOfStockCount = 0;
      let priceChangesCount = 0;

      // Check each listing
      for (const listing of listings) {
        try {
          await this.checkListing(listing);
          checkedSuppliers++;

          // Small delay to avoid rate limiting
          await this.delay(1000);
        } catch (error: any) {
          console.error(`   ❌ Error checking ${listing.listingId}: ${error.message}`);
        }
      }

      console.log('\n✅ STOCK MONITOR: Check complete');
      console.log(`   Suppliers checked: ${checkedSuppliers}`);
      console.log(`   Out of stock: ${outOfStockCount}`);
      console.log(`   Price changes: ${priceChangesCount}`);

    } catch (error: any) {
      console.error('❌ Stock monitor error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check a single listing and all its suppliers
   */
  private async checkListing(listing: any): Promise<void> {
    console.log(`\n📦 Checking: ${listing.productTitle}`);

    // Get all suppliers for this listing
    const suppliers = await supplierManager.getSuppliers(listing.listingId);

    if (suppliers.length === 0) {
      console.log('   ⚠️  No suppliers configured');
      return;
    }

    console.log(`   Suppliers: ${suppliers.length}`);

    // Check each supplier
    for (const supplier of suppliers) {
      try {
        await this.checkSupplier(supplier, listing);
      } catch (error: any) {
        console.error(`   ❌ Error checking ${supplier.vendor}: ${error.message}`);
      }
    }
  }

  /**
   * Check a single supplier
   */
  private async checkSupplier(supplier: any, listing: any): Promise<void> {
    console.log(`   🔍 Checking ${supplier.vendor}...`);

    // Use product validator to check current status
    const validation = await productValidator.validateProduct({
      ...listing,
      supplierUrl: supplier.productUrl,
      supplierPrice: supplier.price.toString(),
    });

    const wasInStock = supplier.inStock !== false;
    const isNowInStock = validation.inStock;
    const oldPrice = supplier.price;
    const newPrice = validation.currentPrice || oldPrice;

    // Check stock status change
    if (wasInStock && !isNowInStock) {
      console.log(`   ⚠️  OUT OF STOCK: ${supplier.vendor}`);

      // Update supplier
      await supplierManager.updateStockStatus(supplier.supplierId, false, newPrice);

      // Check if this is the primary supplier
      const isPrimary = supplier.priority === 0;

      if (isPrimary) {
        // Check if there are fallback suppliers in stock
        const fallbackSuppliers = await supplierManager.getFallbackSuppliers(listing.listingId);
        const inStockFallbacks = fallbackSuppliers.filter(f => f.inStock !== false);

        if (inStockFallbacks.length > 0) {
          const cheapestFallback = inStockFallbacks.reduce((min, s) =>
            s.price < min.price ? s : min
          );

          const oldProfit = parseFloat(listing.marketplacePrice) - oldPrice;
          const newProfit = parseFloat(listing.marketplacePrice) - cheapestFallback.price;

          // Notify about fallback
          await emailNotifier.notifyOutOfStock({
            listingId: listing.listingId,
            productTitle: listing.productTitle,
            vendor: supplier.vendor,
            fallbackUsed: {
              vendor: cheapestFallback.vendor,
              oldPrice: oldPrice,
              newPrice: cheapestFallback.price,
              oldProfit: oldProfit,
              newProfit: newProfit,
            },
          });
        } else {
          // No fallbacks available - critical alert
          await emailNotifier.notifyOutOfStock({
            listingId: listing.listingId,
            productTitle: listing.productTitle,
            vendor: supplier.vendor,
          });
        }
      }
    } else if (!wasInStock && isNowInStock) {
      console.log(`   ✅ BACK IN STOCK: ${supplier.vendor}`);
      await supplierManager.updateStockStatus(supplier.supplierId, true, newPrice);
    }

    // Check price changes (only if in stock)
    if (isNowInStock && newPrice !== oldPrice) {
      const percentChange = ((newPrice - oldPrice) / oldPrice) * 100;

      // Only alert if change is significant (> 5%)
      if (Math.abs(percentChange) > 5) {
        console.log(`   💰 PRICE CHANGE: ${supplier.vendor} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`);
        console.log(`      Old: $${oldPrice} → New: $${newPrice}`);

        // Update supplier price
        await supplierManager.updateStockStatus(supplier.supplierId, true, newPrice);

        // Calculate new profit
        const oldProfit = parseFloat(listing.marketplacePrice) - oldPrice;
        const newProfit = parseFloat(listing.marketplacePrice) - newPrice;
        const isProfitable = newProfit >= 20; // Minimum profit threshold

        // Send alert if significant change
        if (Math.abs(percentChange) > 10 || !isProfitable) {
          await emailNotifier.notifyPriceChange({
            listingId: listing.listingId,
            productTitle: listing.productTitle,
            vendor: supplier.vendor,
            oldPrice: oldPrice,
            newPrice: newPrice,
            oldProfit: oldProfit,
            newProfit: newProfit,
            percentChange: percentChange,
            isProfitable: isProfitable,
          });
        }
      }
    }

    if (isNowInStock) {
      console.log(`   ✅ In stock at $${newPrice}`);
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus(): {
    running: boolean;
    isChecking: boolean;
    schedule: string;
  } {
    return {
      running: !!this.cronJob,
      isChecking: this.isRunning,
      schedule: this.cronJob ? 'every 6 hours' : 'stopped',
    };
  }
}

// Export singleton
export const stockMonitor = new StockMonitorJob();

// Auto-start if in production
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_STOCK_MONITOR === 'true') {
  stockMonitor.start();
  console.log('🚀 Stock monitor auto-started in production mode');
}
