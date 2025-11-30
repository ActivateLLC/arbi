import { DatabaseManager } from '@arbi/data';
import type { ModelDefinition } from '@arbi/data';

/**
 * Marketplace Listing Model
 * Stores products listed on the marketplace with supplier info and pricing
 */
const MarketplaceListingModel: ModelDefinition = {
  name: 'MarketplaceListing',
  attributes: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
      allowNull: false
    },
    listingId: {
      type: 'string',
      unique: true,
      allowNull: false
    },
    opportunityId: {
      type: 'string',
      allowNull: false
    },
    productTitle: {
      type: 'string',
      allowNull: false
    },
    productDescription: {
      type: 'text',
      allowNull: true
    },
    productImages: {
      type: 'json', // Array of Cloudinary URLs
      allowNull: true,
      defaultValue: []
    },
    supplierPrice: {
      type: 'decimal',
      allowNull: false
    },
    supplierUrl: {
      type: 'text',
      allowNull: false
    },
    supplierPlatform: {
      type: 'string',
      allowNull: false
    },
    marketplacePrice: {
      type: 'decimal',
      allowNull: false
    },
    estimatedProfit: {
      type: 'decimal',
      allowNull: false
    },
    status: {
      type: 'string',
      allowNull: false,
      defaultValue: 'active'
    },
    listedAt: {
      type: 'date',
      allowNull: false,
      defaultValue: 'NOW()'
    },
    expiresAt: {
      type: 'date',
      allowNull: true
    },
    soldAt: {
      type: 'date',
      allowNull: true
    }
  },
  options: {
    tableName: 'marketplace_listings',
    timestamps: true,
    indexes: [
      { fields: ['listingId'] },
      { fields: ['status'] },
      { fields: ['listedAt'] },
      { fields: ['opportunityId'] }
    ]
  }
};

/**
 * Buyer Order Model
 * Stores buyer purchases with payment and shipment tracking
 */
const BuyerOrderModel: ModelDefinition = {
  name: 'BuyerOrder',
  attributes: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
      allowNull: false
    },
    orderId: {
      type: 'string',
      unique: true,
      allowNull: false
    },
    listingId: {
      type: 'string',
      allowNull: false,
      references: {
        model: 'marketplace_listings',
        key: 'listingId'
      }
    },
    buyerEmail: {
      type: 'string',
      allowNull: false
    },
    buyerShippingAddress: {
      type: 'json',
      allowNull: false
    },
    paymentIntentId: {
      type: 'string',
      allowNull: false,
      unique: true
    },
    amountPaid: {
      type: 'decimal',
      allowNull: false
    },
    supplierOrderId: {
      type: 'string',
      allowNull: true
    },
    supplierPurchaseStatus: {
      type: 'string',
      allowNull: false,
      defaultValue: 'pending'
    },
    shipmentTrackingNumber: {
      type: 'string',
      allowNull: true
    },
    shipmentCarrier: {
      type: 'string',
      allowNull: true
    },
    status: {
      type: 'string',
      allowNull: false,
      defaultValue: 'payment_received'
    },
    actualProfit: {
      type: 'decimal',
      allowNull: true
    },
    refundId: {
      type: 'string',
      allowNull: true
    },
    refundedAt: {
      type: 'date',
      allowNull: true
    },
    createdAt: {
      type: 'date',
      allowNull: false,
      defaultValue: 'NOW()'
    },
    deliveredAt: {
      type: 'date',
      allowNull: true
    }
  },
  options: {
    tableName: 'buyer_orders',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['listingId'] },
      { fields: ['buyerEmail'] },
      { fields: ['paymentIntentId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ]
  }
};

/**
 * Initialize marketplace models
 */
export function initializeMarketplaceModels(db: DatabaseManager): void {
  console.log('🗄️  Defining marketplace models...');

  // Define models
  db.defineModel(MarketplaceListingModel);
  db.defineModel(BuyerOrderModel);

  console.log('✅ Marketplace models defined: MarketplaceListing, BuyerOrder');
}

/**
 * Sync marketplace models (create tables)
 */
export async function syncMarketplaceModels(db: DatabaseManager, force = false): Promise<void> {
  console.log('🔄 Syncing marketplace models to database...');

  await db.syncModels(force);

  console.log('✅ Marketplace tables created/updated');
}

export { MarketplaceListingModel, BuyerOrderModel };
