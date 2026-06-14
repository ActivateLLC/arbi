import { DatabaseManager } from '@arbi/data';
import type { ModelDefinition } from '@arbi/data';

/**
 * Tenant (Advertiser) Model
 *
 * Each subscribed customer is a tenant with their OWN Google Ads child account
 * provisioned under the Arbi manager (MCC). `googleAdsCustomerId` is the
 * bare-digit child account id; it's passed as the `customerId` override to the
 * campaign automation so every tenant's campaigns land in their own account
 * while sharing the single manager credential set.
 */
const TenantModel: ModelDefinition = {
  name: 'Tenant',
  attributes: {
    id: {
      type: 'uuid',
      primaryKey: true,
      defaultValue: 'uuid_generate_v4()',
      allowNull: false
    },
    tenantId: {
      type: 'string',
      unique: true,
      allowNull: false
    },
    name: {
      type: 'string',
      allowNull: false
    },
    email: {
      type: 'string',
      allowNull: false
    },
    // Bare-digit Google Ads child account id (null until provisioned).
    googleAdsCustomerId: {
      type: 'string',
      allowNull: true
    },
    // Full resource name returned by createCustomerClient ("customers/{id}").
    adAccountResourceName: {
      type: 'text',
      allowNull: true
    },
    plan: {
      type: 'string',
      allowNull: true
    },
    status: {
      type: 'string',
      allowNull: false,
      defaultValue: 'active'
    },
    createdAt: {
      type: 'date',
      allowNull: false,
      defaultValue: 'NOW()'
    }
  },
  options: {
    tableName: 'tenants',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['email'] },
      { fields: ['status'] },
      { fields: ['googleAdsCustomerId'] }
    ]
  }
};

/**
 * Define the tenant model on the shared DatabaseManager.
 */
export function initializeTenantModels(db: DatabaseManager): void {
  console.log('🗄️  Defining tenant model...');
  db.defineModel(TenantModel);
  console.log('✅ Tenant model defined');
}

export { TenantModel };
