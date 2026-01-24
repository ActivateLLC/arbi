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

  console.log('🗄️  Initializing database connection...');
  console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);

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
