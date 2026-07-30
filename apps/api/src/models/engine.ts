import { DatabaseManager } from '@arbi/data';
import type { ModelDefinition } from '@arbi/data';

/**
 * Autonomous-engine persistence models.
 *
 *  - `engine_state`  : durable DESIRED state per tenant (the operator's intent +
 *    automation flags + spend guardrails). The engine reads this — NOT env — so a
 *    redeploy/crash restores the last stated intent instead of resetting to env
 *    defaults. Stored as a JSON `settings` blob so adding flags never needs a
 *    column migration.
 *
 *  - `tenant_campaigns` : the exactly-once campaign mapping. One row per
 *    (tenantId, listingId, channel), with a UNIQUE index on that triple so a
 *    duplicate campaign is structurally impossible — the second writer's insert
 *    is rejected by the database. Reserve-before-create uses this as the slot.
 */
const EngineStateModel: ModelDefinition = {
  name: 'EngineState',
  attributes: {
    tenantId: { type: 'string', primaryKey: true, allowNull: false },
    // Full AutonomousSettings snapshot (intent + flags + guardrails) as JSON.
    settings: { type: 'json', allowNull: false },
    updatedAt: { type: 'date', allowNull: false, defaultValue: 'NOW()' },
    updatedBy: { type: 'string', allowNull: true },
  },
  options: {
    tableName: 'engine_state',
    timestamps: false,
  },
};

const TenantCampaignModel: ModelDefinition = {
  name: 'TenantCampaign',
  attributes: {
    id: { type: 'uuid', primaryKey: true, defaultValue: 'uuid_generate_v4()', allowNull: false },
    tenantId: { type: 'string', allowNull: false },
    listingId: { type: 'string', allowNull: false },
    channel: { type: 'string', allowNull: false },          // 'SEARCH' | 'VIDEO'
    googleCampaignId: { type: 'string', allowNull: true },  // null while only reserved
    campaignName: { type: 'text', allowNull: true },
    status: { type: 'string', allowNull: false, defaultValue: 'reserved' }, // reserved|created|failed|removed
    customerId: { type: 'string', allowNull: true },
    reservedAt: { type: 'date', allowNull: false, defaultValue: 'NOW()' },
    createdGoogleAt: { type: 'date', allowNull: true },
    lastError: { type: 'text', allowNull: true },
  },
  options: {
    tableName: 'tenant_campaigns',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['listingId'] },
      // The structural exactly-once guarantee (also created via raw SQL migration
      // for pre-existing DBs that sync won't retro-alter). Same name so it's one index.
      { unique: true, fields: ['tenantId', 'listingId', 'channel'], name: 'uq_tenant_campaigns_slot' } as any,
    ],
  },
};

/**
 * Per-campaign performance SNAPSHOT — one row per campaign per UTC day. The
 * memory the learning loops need: realized impressions/clicks/conversions/spend/
 * ROAS over time, joined to the listing + creative via tenant_campaigns. The
 * unique (tenantId, googleCampaignId, snapshotDate) grain makes a same-day
 * re-capture an idempotent upsert.
 */
const CampaignPerformanceSnapshotModel: ModelDefinition = {
  name: 'CampaignPerformanceSnapshot',
  attributes: {
    id: { type: 'uuid', primaryKey: true, defaultValue: 'gen_random_uuid()', allowNull: false },
    tenantId: { type: 'string', allowNull: false },
    googleCampaignId: { type: 'string', allowNull: false },
    listingId: { type: 'string', allowNull: true },
    channel: { type: 'string', allowNull: true },
    snapshotDate: { type: 'dateonly', allowNull: false },
    impressions: { type: 'number', allowNull: true },
    clicks: { type: 'number', allowNull: true },
    conversions: { type: 'number', allowNull: true },
    spend: { type: 'number', allowNull: true },
    conversionValue: { type: 'number', allowNull: true },
    roas: { type: 'number', allowNull: true },
    ctr: { type: 'number', allowNull: true },
    capturedAt: { type: 'date', allowNull: false, defaultValue: 'NOW()' },
  },
  options: {
    tableName: 'campaign_performance_snapshots',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['tenantId', 'googleCampaignId', 'snapshotDate'], name: 'uq_perf_snapshot_day' } as any,
      { fields: ['tenantId', 'listingId'] },
    ],
  },
};

export function initializeEngineModels(db: DatabaseManager): void {
  console.log('🗄️  Defining autonomous-engine models...');
  db.defineModel(EngineStateModel);
  db.defineModel(TenantCampaignModel);
  db.defineModel(CampaignPerformanceSnapshotModel);
  console.log('✅ Engine models defined (engine_state, tenant_campaigns, campaign_performance_snapshots)');
}

export { EngineStateModel, TenantCampaignModel, CampaignPerformanceSnapshotModel };
