import { DatabaseManager } from '@arbi/data';
import { initializeMarketplaceModels } from '../models/marketplace';
import { initializeTenantModels } from '../models/tenant';
import { initializeEngineModels } from '../models/engine';

// Singleton database instance
let dbInstance: DatabaseManager | null = null;

/**
 * Get or create database instance
 */
export function getDatabase(): DatabaseManager {
  if (dbInstance) {
    return dbInstance;
  }

  console.log('🗄️  Initializing database connection...');

  // Check for Railway's DATABASE_URL first
  if (process.env.DATABASE_URL) {
    console.log('   Using DATABASE_URL (Railway PostgreSQL)');
    console.log('   SSL: enabled');

    dbInstance = new DatabaseManager({
      url: process.env.DATABASE_URL,
      dialect: 'postgres' as const,
      logging: process.env.NODE_ENV === 'development',
      ssl: true
    } as any);
  } else {
    // Fall back to individual config parameters
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'arbi',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      dialect: 'postgres' as const,
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DB_SSL === 'true'
    };

    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);

    dbInstance = new DatabaseManager(dbConfig);
  }

  // Initialize marketplace models
  initializeMarketplaceModels(dbInstance);
  // Initialize tenant (advertiser) model — multi-tenant ad accounts
  initializeTenantModels(dbInstance);
  // Autonomous-engine state (durable intent) + exactly-once campaign mapping.
  initializeEngineModels(dbInstance);

  return dbInstance;
}

/**
 * Idempotent additive column migrations for columns added to models after their
 * tables already existed. Each is ADD COLUMN IF NOT EXISTS (no-op if present,
 * never destructive). Failures are logged but non-fatal.
 */
async function runColumnMigrations(db: DatabaseManager): Promise<void> {
  const migrations: Array<{ label: string; sql: string }> = [
    {
      label: 'marketplace_listings.demandScore',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "demandScore" DECIMAL DEFAULT 0;',
    },
    // cjVariantId/cjProductId were in the type but never in the model, so they
    // were being dropped on save — breaking CJ fulfillment. Add them.
    {
      label: 'marketplace_listings.cjVariantId',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "cjVariantId" VARCHAR(255);',
    },
    {
      label: 'marketplace_listings.cjProductId',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "cjProductId" VARCHAR(255);',
    },
    {
      label: 'marketplace_listings.variants',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "variants" JSONB;',
    },
    {
      label: 'marketplace_listings.videoUrl',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "videoUrl" VARCHAR(500);',
    },
    {
      label: 'marketplace_listings.videoAssets',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "videoAssets" JSONB;',
    },
    // Buyer-chosen size/color + quantity, so we fulfill the exact item ordered.
    {
      label: 'buyer_orders.quantity',
      sql: 'ALTER TABLE "buyer_orders" ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1;',
    },
    {
      label: 'buyer_orders.variantId',
      sql: 'ALTER TABLE "buyer_orders" ADD COLUMN IF NOT EXISTS "variantId" VARCHAR(255);',
    },
    {
      label: 'buyer_orders.variantLabel',
      sql: 'ALTER TABLE "buyer_orders" ADD COLUMN IF NOT EXISTS "variantLabel" VARCHAR(255);',
    },
    // Autonomous-engine tables. syncModels creates them from the model defs on a
    // fresh DB; these CREATE ... IF NOT EXISTS are the idempotent backstop for
    // pre-existing DBs (sync never alters existing tables). The UNIQUE INDEX is
    // the load-bearing line: it makes a duplicate campaign structurally impossible.
    {
      label: 'engine_state table',
      sql: `CREATE TABLE IF NOT EXISTS "engine_state" (
        "tenantId" VARCHAR(255) PRIMARY KEY,
        "settings" JSONB NOT NULL,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedBy" VARCHAR(255)
      );`,
    },
    {
      label: 'tenant_campaigns table',
      sql: `CREATE TABLE IF NOT EXISTS "tenant_campaigns" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" VARCHAR(255) NOT NULL,
        "listingId" VARCHAR(255) NOT NULL,
        "channel" VARCHAR(16) NOT NULL,
        "googleCampaignId" VARCHAR(64),
        "campaignName" TEXT,
        "status" VARCHAR(24) NOT NULL DEFAULT 'reserved',
        "customerId" VARCHAR(32),
        "reservedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "createdGoogleAt" TIMESTAMPTZ,
        "lastError" TEXT
      );`,
    },
    {
      label: 'tenant_campaigns unique slot index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_campaigns_slot"
        ON "tenant_campaigns" ("tenantId", "listingId", "channel");`,
    },
    {
      // Sequelize's model defaultValue is ORM-layer only — ensure the column has
      // a real DB default so raw INSERTs (the registry) always get an id.
      label: 'tenant_campaigns.id default',
      sql: `ALTER TABLE "tenant_campaigns" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();`,
    },
    // Same ORM-only-default issue for the timestamp columns: give them real DB
    // defaults so raw INSERTs don't violate NOT NULL. createdAt/updatedAt exist
    // because the model uses Sequelize timestamps; if a column is absent the
    // ALTER is a harmless no-op (caught + logged, non-fatal).
    {
      label: 'tenant_campaigns.reservedAt default',
      sql: `ALTER TABLE "tenant_campaigns" ALTER COLUMN "reservedAt" SET DEFAULT NOW();`,
    },
    {
      label: 'tenant_campaigns.createdAt default',
      sql: `ALTER TABLE "tenant_campaigns" ALTER COLUMN "createdAt" SET DEFAULT NOW();`,
    },
    {
      label: 'tenant_campaigns.updatedAt default',
      sql: `ALTER TABLE "tenant_campaigns" ALTER COLUMN "updatedAt" SET DEFAULT NOW();`,
    },
    // Performance snapshots — the memory the learning loops + reinvestment
    // freshness check read. One row per campaign per UTC day (idempotent upsert).
    {
      label: 'campaign_performance_snapshots table',
      sql: `CREATE TABLE IF NOT EXISTS "campaign_performance_snapshots" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" VARCHAR(255) NOT NULL,
        "googleCampaignId" VARCHAR(64) NOT NULL,
        "listingId" VARCHAR(255),
        "channel" VARCHAR(16),
        "snapshotDate" DATE NOT NULL,
        "impressions" BIGINT DEFAULT 0,
        "clicks" BIGINT DEFAULT 0,
        "conversions" DECIMAL DEFAULT 0,
        "spend" DECIMAL DEFAULT 0,
        "conversionValue" DECIMAL DEFAULT 0,
        "roas" DECIMAL DEFAULT 0,
        "ctr" DECIMAL DEFAULT 0,
        "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
    },
    {
      label: 'campaign_performance_snapshots unique day index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "uq_perf_snapshot_day"
        ON "campaign_performance_snapshots" ("tenantId","googleCampaignId","snapshotDate");`,
    },
    {
      label: 'campaign_performance_snapshots listing index',
      sql: `CREATE INDEX IF NOT EXISTS "ix_perf_snapshot_listing"
        ON "campaign_performance_snapshots" ("tenantId","listingId");`,
    },
    // Realized-performance feedback persisted on the listing (nullable so absence
    // is distinguishable from a genuine zero — ranking ignores null confidence).
    {
      label: 'marketplace_listings.realizedScore',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "realizedScore" DECIMAL DEFAULT NULL;',
    },
    {
      label: 'marketplace_listings.realizedConfidence',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "realizedConfidence" DECIMAL DEFAULT NULL;',
    },
    // Organic-first: free YouTube traction is the real demand signal that must be
    // PROVEN before any paid spend is amplified onto a product.
    {
      label: 'marketplace_listings.organicViews',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "organicViews" BIGINT DEFAULT 0;',
    },
    {
      label: 'marketplace_listings.organicLikes',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "organicLikes" BIGINT DEFAULT 0;',
    },
    {
      label: 'marketplace_listings.organicCheckedAt',
      sql: 'ALTER TABLE "marketplace_listings" ADD COLUMN IF NOT EXISTS "organicCheckedAt" TIMESTAMPTZ;',
    },
  ];
  for (const m of migrations) {
    try {
      await (db as any).query(m.sql);
      console.log(`✅ Migration ok: ${m.label}`);
    } catch (e: any) {
      console.error(`⚠️  Migration failed (${m.label}):`, e?.message || e);
    }
  }
}

/**
 * Initialize database connection and sync models
 */
export async function initializeDatabase(): Promise<DatabaseManager> {
  const db = getDatabase();

  try {
    await db.connect();
    console.log('✅ Database connected successfully');

    // Sync models (create tables if they don't exist)
    await db.syncModels(false); // false = don't drop existing tables
    console.log('✅ Database models synchronized');

    // Lightweight idempotent migrations. syncModels(false) creates missing
    // tables but does NOT add new columns to existing ones, so a model field
    // added after a table already exists (e.g. demandScore) would make every
    // SELECT fail ("column does not exist"). ADD COLUMN IF NOT EXISTS is safe
    // on both fresh and pre-existing tables and never drops data.
    await runColumnMigrations(db);

    return db;
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);

    // Gracefully handle database errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      console.log('⚠️  Database not available - using in-memory storage');
      console.log('   Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD to enable persistence');
    }

    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.disconnect();
    dbInstance = null;
    console.log('✅ Database connection closed');
  }
}
