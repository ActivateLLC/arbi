/**
 * Supplier Manager Service
 * Manages multiple suppliers per product and handles fallback logic
 */

import { getDatabase } from '../config/database';
import { ProductSupplier } from '../models/productSuppliers';
import { emailNotifier } from './emailNotifier';

export class SupplierManagerService {
  private db: ReturnType<typeof getDatabase> | null = null;
  // In-memory cache for suppliers
  private suppliersCache: Map<string, ProductSupplier[]> = new Map();

  constructor() {
    try {
      this.db = getDatabase();
      console.log('✅ Supplier Manager initialized with database');
    } catch (error) {
      console.log('⚠️  Supplier Manager using in-memory storage only');
    }
  }

  /**
   * Add a supplier for a product
   */
  async addSupplier(supplier: Omit<ProductSupplier, 'supplierId' | 'createdAt' | 'updatedAt'>): Promise<ProductSupplier> {
    const newSupplier: ProductSupplier = {
      ...supplier,
      supplierId: `supplier_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    if (this.db) {
      try {
        await this.db.create('ProductSupplier', newSupplier);
        console.log(`✅ Added supplier: ${newSupplier.vendor} for ${newSupplier.listingId} (priority ${newSupplier.priority})`);
      } catch (error: any) {
        console.error('❌ Database save failed:', error.message);
      }
    }

    // Save to cache
    const listingSuppliers = this.suppliersCache.get(supplier.listingId) || [];
    listingSuppliers.push(newSupplier);
    // Sort by priority
    listingSuppliers.sort((a, b) => a.priority - b.priority);
    this.suppliersCache.set(supplier.listingId, listingSuppliers);

    return newSupplier;
  }

  /**
   * Get all suppliers for a listing, sorted by priority
   */
  async getSuppliers(listingId: string): Promise<ProductSupplier[]> {
    // Try database first
    if (this.db) {
      try {
        const suppliers = await this.db.find('ProductSupplier', {
          where: { listingId, isActive: true },
          order: [['priority', 'ASC']],
        }) as ProductSupplier[];

        // Update cache
        this.suppliersCache.set(listingId, suppliers);
        return suppliers;
      } catch (error: any) {
        console.error('❌ Database query failed:', error.message);
      }
    }

    // Fall back to cache
    return this.suppliersCache.get(listingId) || [];
  }

  /**
   * Get primary supplier (priority 0)
   */
  async getPrimarySupplier(listingId: string): Promise<ProductSupplier | null> {
    const suppliers = await this.getSuppliers(listingId);
    return suppliers.find(s => s.priority === 0) || suppliers[0] || null;
  }

  /**
   * Get fallback suppliers (priority > 0)
   */
  async getFallbackSuppliers(listingId: string): Promise<ProductSupplier[]> {
    const suppliers = await this.getSuppliers(listingId);
    return suppliers.filter(s => s.priority > 0);
  }

  /**
   * Update supplier stock status
   */
  async updateStockStatus(supplierId: string, inStock: boolean, price?: number): Promise<void> {
    const updates: Partial<ProductSupplier> = {
      inStock,
      lastChecked: new Date(),
      updatedAt: new Date(),
    };

    if (price !== undefined) {
      updates.lastPrice = price;
    }

    if (this.db) {
      try {
        await this.db.update('ProductSupplier', updates, { where: { supplierId } });
      } catch (error: any) {
        console.error('❌ Database update failed:', error.message);
      }
    }

    // Update cache
    for (const [listingId, suppliers] of this.suppliersCache.entries()) {
      const supplier = suppliers.find(s => s.supplierId === supplierId);
      if (supplier) {
        Object.assign(supplier, updates);
        break;
      }
    }
  }

  /**
   * Find best available supplier for a product
   * Returns primary if in stock, otherwise tries fallbacks in priority order
   */
  async findBestSupplier(
    listingId: string,
    marketplacePrice: number,
    minProfit: number = 20
  ): Promise<{
    supplier: ProductSupplier | null;
    isFallback: boolean;
    profit: number;
    profitLoss?: number;
  }> {
    const suppliers = await this.getSuppliers(listingId);

    if (suppliers.length === 0) {
      return { supplier: null, isFallback: false, profit: 0 };
    }

    // Try each supplier in priority order
    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i];

      // Skip if explicitly marked as out of stock
      if (supplier.inStock === false) {
        console.log(`   ⏭️  Skipping ${supplier.vendor} - marked as out of stock`);
        continue;
      }

      // Calculate profit
      const profit = marketplacePrice - supplier.price;

      // Check if profitable
      if (profit < minProfit) {
        console.log(`   ⏭️  Skipping ${supplier.vendor} - not profitable ($${profit.toFixed(2)} < $${minProfit})`);
        continue;
      }

      // Found a suitable supplier
      const isPrimary = supplier.priority === 0;
      const profitLoss = isPrimary ? 0 : (suppliers[0].price - supplier.price);

      console.log(`   ✅ Selected supplier: ${supplier.vendor} (priority ${supplier.priority})`);
      console.log(`      Price: $${supplier.price}`);
      console.log(`      Profit: $${profit.toFixed(2)}`);
      if (!isPrimary) {
        console.log(`      Profit loss vs primary: $${profitLoss.toFixed(2)}`);
      }

      return {
        supplier,
        isFallback: !isPrimary,
        profit,
        profitLoss: !isPrimary ? profitLoss : undefined,
      };
    }

    // No suitable supplier found
    console.log('   ❌ No profitable suppliers available');
    return { supplier: null, isFallback: false, profit: 0 };
  }

  /**
   * Bulk add suppliers for a listing
   * Useful for importing multiple suppliers at once
   */
  async bulkAddSuppliers(listingId: string, suppliers: Array<{
    vendor: ProductSupplier['vendor'];
    productUrl: string;
    price: number;
    priority: number;
  }>): Promise<ProductSupplier[]> {
    const created: ProductSupplier[] = [];

    for (const supplier of suppliers) {
      const newSupplier = await this.addSupplier({
        listingId,
        ...supplier,
        isActive: true,
      });
      created.push(newSupplier);
    }

    return created;
  }

  /**
   * Deactivate a supplier
   */
  async deactivateSupplier(supplierId: string): Promise<void> {
    if (this.db) {
      try {
        await this.db.update('ProductSupplier', {
          isActive: false,
          updatedAt: new Date(),
        }, { where: { supplierId } });
      } catch (error: any) {
        console.error('❌ Database update failed:', error.message);
      }
    }

    // Update cache
    for (const [listingId, suppliers] of this.suppliersCache.entries()) {
      const supplier = suppliers.find(s => s.supplierId === supplierId);
      if (supplier) {
        supplier.isActive = false;
        supplier.updatedAt = new Date();
        break;
      }
    }
  }

  /**
   * Get statistics for a listing
   */
  async getSupplierStats(listingId: string): Promise<{
    total: number;
    active: number;
    inStock: number;
    outOfStock: number;
    cheapest: ProductSupplier | null;
    mostExpensive: ProductSupplier | null;
  }> {
    const suppliers = await this.getSuppliers(listingId);
    const activeSuppliers = suppliers.filter(s => s.isActive);
    const inStockSuppliers = activeSuppliers.filter(s => s.inStock !== false);

    return {
      total: suppliers.length,
      active: activeSuppliers.length,
      inStock: inStockSuppliers.length,
      outOfStock: activeSuppliers.length - inStockSuppliers.length,
      cheapest: activeSuppliers.reduce((min, s) => !min || s.price < min.price ? s : min, null as ProductSupplier | null),
      mostExpensive: activeSuppliers.reduce((max, s) => !max || s.price > max.price ? s : max, null as ProductSupplier | null),
    };
  }
}

// Export singleton
export const supplierManager = new SupplierManagerService();
