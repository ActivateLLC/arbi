/**
 * Simple in-memory cache with TTL support
 * Provides performance optimization for repeated API calls
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private readonly defaultTTL: number;

  /**
   * Create a new cache instance
   * @param defaultTTL Default time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a value from cache
   * @returns The cached value or undefined if not found/expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Optional TTL override in milliseconds
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get or set pattern - fetch value if not cached
   * @param key Cache key
   * @param fetcher Function to fetch value if not cached
   * @param ttl Optional TTL override
   */
  async getOrSet(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Export a singleton instance for shared caching
export const opportunityCache = new SimpleCache(5 * 60 * 1000); // 5 minutes
export const priceCache = new SimpleCache(10 * 60 * 1000); // 10 minutes
export const apiCache = new SimpleCache(60 * 1000); // 1 minute
