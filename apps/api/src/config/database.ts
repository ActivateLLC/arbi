import { DatabaseManager } from '@arbi/data';
import { initializeMarketplaceModels } from '../models/marketplace';
import { initializeTenantModels } from '../models/tenant';

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
