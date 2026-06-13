/**
 * Product Suppliers Model
 * Stores multiple suppliers for each product with fallback priority
 */

export interface ProductSupplier {
  supplierId: string;
  listingId: string;
  vendor: 'amazon' | 'walmart' | 'ebay' | 'bhphoto' | 'adorama' | 'newegg' | 'bestbuy';
  productUrl: string;
  price: number;
  priority: number; // 0 = primary, 1 = first fallback, 2 = second fallback, etc.
  isActive: boolean;
  lastChecked?: Date;
  inStock?: boolean;
  lastPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const productSuppliersSchema = {
  name: 'ProductSupplier',
  columns: {
    supplierId: {
      type: 'varchar',
      length: 255,
      primaryKey: true,
      notNull: true,
    },
    listingId: {
      type: 'varchar',
      length: 255,
      notNull: true,
    },
    vendor: {
      type: 'varchar',
      length: 50,
      notNull: true,
    },
    productUrl: {
      type: 'text',
      notNull: true,
    },
    price: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      notNull: true,
    },
    priority: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    isActive: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    lastChecked: {
      type: 'timestamp',
      default: null,
    },
    inStock: {
      type: 'boolean',
      default: true,
    },
    lastPrice: {
      type: 'decimal',
      precision: 10,
      scale: 2,
      default: null,
    },
    createdAt: {
      type: 'timestamp',
      notNull: true,
      default: 'CURRENT_TIMESTAMP',
    },
    updatedAt: {
      type: 'timestamp',
      notNull: true,
      default: 'CURRENT_TIMESTAMP',
    },
  },
  indexes: [
    {
      name: 'idx_supplier_listing',
      columns: ['listingId'],
    },
    {
      name: 'idx_supplier_priority',
      columns: ['listingId', 'priority'],
    },
    {
      name: 'idx_supplier_active',
      columns: ['isActive'],
    },
  ],
};

export default productSuppliersSchema;
