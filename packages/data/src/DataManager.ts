import type {
  CacheConfig,
  CacheOptions,
  DatabaseConfig,
  DataAnalysisOptions,
  ModelDefinition,
  QueryOptions,
} from './types';
import { DatabaseManager } from './storage/DatabaseManager';
import { CacheManager } from './cache/CacheManager';
import { DataAnalyzer } from './analysis/DataAnalyzer';

export class DataManager {
  private db: DatabaseManager;
  private cache: CacheManager;
  private analyzer: DataAnalyzer;

  constructor(dbConfig: DatabaseConfig, cacheConfig: CacheConfig) {
    this.db = new DatabaseManager(dbConfig);
    this.cache = new CacheManager(cacheConfig);
    this.analyzer = new DataAnalyzer();
  }

  /**
   * Initialize data services
   */
  public async initialize(): Promise<void> {
    await this.db.connect();
  }

  /**
   * Shutdown data services
   */
  public async shutdown(): Promise<void> {
    await this.db.disconnect();
    await this.cache.disconnect();
  }

  /**
   * Get the database manager
   */
  public getDatabase(): DatabaseManager {
    return this.db;
  }

  /**
   * Get the cache manager
   */
  public getCache(): CacheManager {
    return this.cache;
  }

  /**
   * Get the data analyzer
   */
  public getAnalyzer(): DataAnalyzer {
    return this.analyzer;
  }

  /**
   * Define a model
   */
  public defineModel(modelDef: ModelDefinition): any {
    return this.db.defineModel(modelDef);
  }

  /**
   * Sync models to the database
   */
  public async syncModels(force = false): Promise<void> {
    await this.db.syncModels(force);
  }

  /**
   * Create a new record with caching
   */
  public async create(
    modelName: string,
    data: Record<string, any>,
    cacheKey?: string
  ): Promise<any> {
    const result = await this.db.create(modelName, data);
    
    // Invalidate cache if applicable
    if (cacheKey) {
      await this.cache.delete(cacheKey);
    }
    
    return result;
  }

  /**
   * Find records with caching
   */
  public async find(
    modelName: string,
    options: QueryOptions = {},
    cacheOptions?: CacheOptions & { key?: string }
  ): Promise<any[]> {
    // Skip cache if specified
    if (!cacheOptions || cacheOptions.skipCache || !cacheOptions.key) {
      return this.db.find(modelName, options);
    }
    
    // Use cache with getOrSet
    return this.cache.getOrSet(
      cacheOptions.key,
      () => this.db.find(modelName, options),
      { ttl: cacheOptions.ttl }
    );
  }

  /**
   * Find a single record with caching
   */
  public async findOne(
    modelName: string,
    options: QueryOptions = {},
    cacheOptions?: CacheOptions & { key?: string }
  ): Promise<any | null> {
    // Skip cache if specified
    if (!cacheOptions || cacheOptions.skipCache || !cacheOptions.key) {
      return this.db.findOne(modelName, options);
    }
    
    // Use cache with getOrSet
    return this.cache.getOrSet(
      cacheOptions.key,
      () => this.db.findOne(modelName, options),
      { ttl: cacheOptions.ttl }
    );
  }

  /**
   * Update records with cache invalidation
   */
  public async update(
    modelName: string,
    data: Record<string, any>,
    options: QueryOptions = {},
    cacheKeys?: string[]
  ): Promise<number> {
    const affectedCount = await this.db.update(modelName, data, options);
    
    // Invalidate cache keys if specified
    if (cacheKeys && cacheKeys.length > 0) {
      const pipeline = this.cache.getClient().pipeline();
      
      for (const key of cacheKeys) {
        pipeline.del(key);
      }
      
      await pipeline.exec();
    }
    
    return affectedCount;
  }

  /**
   * Delete records with cache invalidation
   */
  public async delete(
    modelName: string,
    options: QueryOptions = {},
    cacheKeys?: string[]
  ): Promise<number> {
    const affectedCount = await this.db.delete(modelName, options);
    
    // Invalidate cache keys if specified
    if (cacheKeys && cacheKeys.length > 0) {
      const pipeline = this.cache.getClient().pipeline();
      
      for (const key of cacheKeys) {
        pipeline.del(key);
      }
      
      await pipeline.exec();
    }
    
    return affectedCount;
  }

  /**
   * Run a transaction with the database
   */
  public async transaction<T>(
    callback: (transaction: any) => Promise<T>
  ): Promise<T> {
    return this.db.transaction(callback);
  }

  /**
   * Run a raw SQL query
   */
  public async query(
    sql: string,
    options: Record<string, any> = {}
  ): Promise<any> {
    return this.db.query(sql, options);
  }

  /**
   * Analyze data with options
   */
  public analyze(data: any[], options: DataAnalysisOptions = {}): any {
    return this.analyzer.analyze(data, options);
  }

  /**
   * Get descriptive statistics for a dataset
   */
  public describeData(data: any[], columns?: string[]): Record<string, any> {
    return this.analyzer.describeData(data, columns);
  }

  /**
   * Create a cache key for a model and query options
   */
  public createCacheKey(modelName: string, options: QueryOptions = {}): string {
    const optionsString = JSON.stringify(options);
    return `${modelName}:${optionsString}`;
  }

  /**
   * Clear cache for a model
   */
  public async clearModelCache(modelName: string): Promise<void> {
    const keys = await this.cache.getClient().keys(`${modelName}:*`);
    
    if (keys.length > 0) {
      await this.cache.getClient().del(keys);
    }
  }

  /**
   * Clear all cache
   */
  public async clearAllCache(): Promise<void> {
    await this.cache.clear();
  }
}
