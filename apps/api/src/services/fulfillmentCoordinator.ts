/**
 * Fulfillment Coordinator
 * Orchestrates order fulfillment with multi-supplier fallback logic
 */

import { supplierManager } from './supplierManager';
import { supplierFulfillment } from './supplierFulfillment';
import { emailNotifier } from './emailNotifier';
import { getListing } from '../routes/marketplace';

interface FulfillmentOrder {
  orderId: string;
  listingId: string;
  quantity: number;
  customerEmail: string;
  amountPaid: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface FulfillmentResult {
  success: boolean;
  vendor?: string;
  orderId?: string;
  trackingNumber?: string;
  actualCost?: number;
  profit?: number;
  usedFallback?: boolean;
  fallbackDetails?: {
    attemptedVendors: string[];
    primaryVendor: string;
    fallbackVendor: string;
    primaryPrice: number;
    fallbackPrice: number;
    profitDifference: number;
  };
  error?: string;
}

export class FulfillmentCoordinatorService {
  /**
   * Fulfill an order with automatic fallback to alternative suppliers
   */
  async fulfillOrder(order: FulfillmentOrder): Promise<FulfillmentResult> {
    console.log(`\n🎯 FULFILLMENT COORDINATOR: Order ${order.orderId}`);
    console.log(`   Listing: ${order.listingId}`);
    console.log(`   Amount Paid: $${order.amountPaid}`);

    try {
      // Get listing details
      const listing = await getListing(order.listingId);
      if (!listing) {
        throw new Error(`Listing not found: ${order.listingId}`);
      }

      // Find best available supplier
      const bestSupplier = await supplierManager.findBestSupplier(
        order.listingId,
        order.amountPaid,
        20 // Minimum profit threshold
      );

      if (!bestSupplier.supplier) {
        console.error('   ❌ No available suppliers found');

        // Notify owner
        await emailNotifier.notifyOutOfStock({
          listingId: order.listingId,
          productTitle: listing.productTitle,
          vendor: 'all',
        });

        return {
          success: false,
          error: 'No available suppliers - all out of stock or unprofitable',
        };
      }

      const supplier = bestSupplier.supplier;

      console.log(`\n🛒 Attempting purchase from ${supplier.vendor.toUpperCase()}`);
      console.log(`   Priority: ${supplier.priority} (${bestSupplier.isFallback ? 'FALLBACK' : 'PRIMARY'})`);
      console.log(`   Price: $${supplier.price}`);
      console.log(`   Expected Profit: $${bestSupplier.profit.toFixed(2)}`);

      // Attempt fulfillment
      const result = await supplierFulfillment.fulfillOrder({
        orderId: order.orderId,
        productUrl: supplier.productUrl,
        quantity: order.quantity,
        shippingAddress: order.shippingAddress,
        customerEmail: order.customerEmail,
        amountPaid: order.amountPaid,
      });

      if (result.success) {
        console.log(`   ✅ Purchase successful from ${supplier.vendor}`);

        // Update supplier stock status
        await supplierManager.updateStockStatus(supplier.supplierId, true, supplier.price);

        // Notify if fallback was used
        if (bestSupplier.isFallback) {
          const primarySupplier = await supplierManager.getPrimarySupplier(order.listingId);

          if (primarySupplier) {
            await emailNotifier.notifyOutOfStock({
              listingId: order.listingId,
              productTitle: listing.productTitle,
              vendor: primarySupplier.vendor,
              fallbackUsed: {
                vendor: supplier.vendor,
                oldPrice: primarySupplier.price,
                newPrice: supplier.price,
                oldProfit: order.amountPaid - primarySupplier.price,
                newProfit: bestSupplier.profit,
              },
            });
          }
        }

        // Send sale notification
        await emailNotifier.notifySale({
          orderId: order.orderId,
          productTitle: listing.productTitle,
          salePrice: order.amountPaid,
          supplierCost: supplier.price,
          profit: bestSupplier.profit,
          customerEmail: order.customerEmail,
          trackingNumber: result.trackingNumber,
          vendor: supplier.vendor,
        });

        return {
          success: true,
          vendor: supplier.vendor,
          orderId: result.orderId,
          trackingNumber: result.trackingNumber,
          actualCost: supplier.price,
          profit: bestSupplier.profit,
          usedFallback: bestSupplier.isFallback,
        };
      } else {
        console.error(`   ❌ Purchase failed from ${supplier.vendor}: ${result.error}`);

        // Mark supplier as out of stock
        await supplierManager.updateStockStatus(supplier.supplierId, false);

        // Try next fallback
        if (bestSupplier.isFallback) {
          console.log('   🔄 Trying next fallback supplier...');
          // Recursive call will try the next available supplier
          return await this.fulfillOrder(order);
        } else {
          // Primary failed, try fallbacks
          const fallbackSuppliers = await supplierManager.getFallbackSuppliers(order.listingId);

          if (fallbackSuppliers.length > 0) {
            console.log(`   🔄 Primary failed, trying ${fallbackSuppliers.length} fallback supplier(s)...`);
            return await this.fulfillOrder(order);
          } else {
            console.error('   ❌ No fallback suppliers available');

            // Notify owner
            await emailNotifier.notifyOutOfStock({
              listingId: order.listingId,
              productTitle: listing.productTitle,
              vendor: supplier.vendor,
            });

            return {
              success: false,
              error: 'Primary supplier failed and no fallbacks available',
            };
          }
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Fulfillment error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test fulfillment for a listing without actually purchasing
   */
  async testFulfillment(listingId: string): Promise<{
    hasSuppliers: boolean;
    suppliers: Array<{
      vendor: string;
      price: number;
      priority: number;
      inStock: boolean;
    }>;
    bestSupplier: {
      vendor: string;
      price: number;
      profit: number;
      isFallback: boolean;
    } | null;
  }> {
    const listing = await getListing(listingId);
    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    const suppliers = await supplierManager.getSuppliers(listingId);
    const bestSupplier = await supplierManager.findBestSupplier(
      listingId,
      parseFloat(listing.marketplacePrice),
      20
    );

    return {
      hasSuppliers: suppliers.length > 0,
      suppliers: suppliers.map(s => ({
        vendor: s.vendor,
        price: s.price,
        priority: s.priority,
        inStock: s.inStock !== false,
      })),
      bestSupplier: bestSupplier.supplier ? {
        vendor: bestSupplier.supplier.vendor,
        price: bestSupplier.supplier.price,
        profit: bestSupplier.profit,
        isFallback: bestSupplier.isFallback,
      } : null,
    };
  }
}

// Export singleton
export const fulfillmentCoordinator = new FulfillmentCoordinatorService();
