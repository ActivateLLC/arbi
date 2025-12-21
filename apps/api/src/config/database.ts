import { DatabaseManager } from '@arbi/data';
import { initializeMarketplaceModels } from '../models/marketplace';

// Singleton database instance
let dbInstance: DatabaseManager | null = null;

/**
 * Get or create database instance
 */
export function getDatabase(): DatabaseManager {
  if (dbInstance) {
    return dbInstance;
  }

  // Check if database configuration is available
  // IMPORTANT: Use private network (postgres.railway.internal) to avoid egress fees!
  // Falls back to public endpoint for local development

  // Support Railway's DATABASE_URL or individual connection params
  let dbConfig: any;

  if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if available (Railway provides this)
    dbConfig = {
      url: process.env.DATABASE_URL,
      dialect: 'postgres' as const,
      logging: process.env.NODE_ENV === 'development',
      dialectOptions: {
        ssl: process.env.DATABASE_URL.includes('railway.app') ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    };
  } else {
    // Fall back to individual environment variables
    dbConfig = {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
      database: process.env.PGDATABASE || process.env.DB_NAME || 'arbi',
      username: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',
      dialect: 'postgres' as const,
      logging: process.env.NODE_ENV === 'development',
      ssl: false // Private network doesn't need SSL
    };
  }

  console.log('🗄️  Initializing database connection...');
  if (dbConfig.url) {
    const isRailway = dbConfig.url.includes('railway.app') || dbConfig.url.includes('railway.internal');
    console.log(`   Using: DATABASE_URL (${isRailway ? 'Railway' : 'External'})`);
    console.log(`   Network: ${dbConfig.url.includes('railway.internal') ? 'PRIVATE (free)' : 'PUBLIC'}`);
    console.log(`   SSL: ${dbConfig.dialectOptions?.ssl ? 'enabled' : 'disabled'}`);
  } else {
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Network: ${dbConfig.host.includes('railway.internal') ? 'PRIVATE (free)' : 'PUBLIC (egress fees)'}`);
    console.log(`   SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);
  }

  dbInstance = new DatabaseManager(dbConfig);

  // Initialize marketplace models
  initializeMarketplaceModels(dbInstance);

  return dbInstance;
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
