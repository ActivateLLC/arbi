import Redis from 'ioredis';

import type { CacheConfig, CacheOptions } from '../types';

export class CacheManager {
  private client: Redis;
  private defaultTTL: number;

  constructor(config: CacheConfig) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'arbi:',
      connectTimeout: config.connectTimeout || 10000,
      tls: config.tls ? {} : undefined,
      retryStrategy: (times) => {
        const retryAttempts = config.retryAttempts || 3;
        const retryDelay = config.retryDelay || 1000;
        
        if (times <= retryAttempts) {
          // Exponential backoff
          return Math.min(times * retryDelay, 30000);
        }
        return null; // Stop retrying
      },
    });

    this.defaultTTL = 3600; // 1 hour in seconds

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis server');
    });
  }

  /**
   * Get the Redis client instance
   */
  public getClient(): Redis {
    return this.client;
  }

  /**
   * Close the Redis connection
   */
  public async disconnect(): Promise<void> {
    await this.client.quit();
    console.log('Redis connection closed');
  }

  /**
   * Set a value in cache
   */
  public async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const serializedValue = typeof value === 'string' 
      ? value 
      : JSON.stringify(value);
    
    const ttl = options.ttl !== undefined ? options.ttl : this.defaultTTL;
    
    if (ttl > 0) {
      await this.client.set(key, serializedValue, 'EX', ttl);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  /**
   * Get a value from cache
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    
    if (!value) {
      return null;
    }
    
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      // If not valid JSON, return as string
      return value as unknown as T;
    }
  }

  /**
   * Delete a value from cache
   */
  public async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  /**
   * Check if a key exists in cache
   */
  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set TTL (time to live) for a key
   */
  public async setTTL(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.expire(key, ttl);
    return result === 1;
  }

  /**
   * Get TTL (time to live) for a key
   */
  public async getTTL(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * Clear all cache
   */
  public async clear(): Promise<void> {
    await this.client.flushdb();
  }

  /**
   * Get multiple values from cache
   */
  public async mget<T = any>(keys: string[]): Promise<Array<T | null>> {
    if (keys.length === 0) {
      return [];
    }
    
    const values = await this.client.mget(keys);
    
    return values.map(value => {
      if (!value) {
        return null;
      }
      
      try {
        return JSON.parse(value) as T;
      } catch (e) {
        // If not valid JSON, return as string
        return value as unknown as T;
      }
    });
  }

  /**
   * Set multiple values in cache
   */
  public async mset(
    keyValues: Record<string, any>,
    options: CacheOptions = {}
  ): Promise<void> {
    if (Object.keys(keyValues).length === 0) {
      return;
    }
    
    const serializedKeyValues: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(keyValues)) {
      serializedKeyValues[key] = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
    }
    
    await this.client.mset(serializedKeyValues);
    
    // Set TTL for each key if specified
    const ttl = options.ttl !== undefined ? options.ttl : this.defaultTTL;
    
    if (ttl > 0) {
      const pipeline = this.client.pipeline();
      
      for (const key of Object.keys(keyValues)) {
        pipeline.expire(key, ttl);
      }
      
      await pipeline.exec();
    }
  }

  /**
   * Increment a value in cache
   */
  public async increment(key: string, amount = 1): Promise<number> {
    return this.client.incrby(key, amount);
  }

  /**
   * Decrement a value in cache
   */
  public async decrement(key: string, amount = 1): Promise<number> {
    return this.client.decrby(key, amount);
  }

  /**
   * Get a cached value or compute it if not exists
   */
  public async getOrSet<T = any>(
    key: string,
    callback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Skip cache if specified
    if (options.skipCache) {
      return callback();
    }
    
    // Try to get from cache first
    const cachedValue = await this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // Compute value if not in cache
    const value = await callback();
    
    // Cache the computed value
    await this.set(key, value, options);
    
    return value;
  }
}
