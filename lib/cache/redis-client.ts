/**
 * Redis Cache Client
 *
 * Provides a robust Redis client implementation with connection pooling,
 * error handling, and performance monitoring for the PolyHarmony application.
 * Supports both development (in-memory fallback) and production environments.
 */

import Redis, { RedisOptions } from 'ioredis';

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  connectionTime: number;
  lastError?: string;
  isConnected: boolean;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Enable compression for large values
  namespace?: string; // Key namespace prefix
}

export class RedisClient {
  private redis: Redis | null = null;
  private fallbackCache: Map<string, { value: any; expires: number }> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    connectionTime: 0,
    isConnected: false
  };
  private readonly isProduction: boolean;
  private readonly useFallback: boolean;
  private readonly keyPrefix: string = 'polyharmony:cache:';

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.useFallback = process.env.REDIS_DISABLE === 'true' || process.env.TEST_TYPE === 'unit';

    if (!this.useFallback) {
      this.initializeRedis();
    }
  }

  /**
   * Initialize Redis connection with retry logic and error handling
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const options: RedisOptions = {
        // retryDelayOnFailover is a Cluster-only option and not part of RedisOptions
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Connection pool configuration
        family: 4,
        enableReadyCheck: true,
      };

      // Parse Redis URL if provided
      if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
        this.redis = new Redis(redisUrl, options);
      } else {
        // Parse host:port format
        const [host, port] = redisUrl.split(':');
        this.redis = new Redis({
          host: host || 'localhost',
          port: parseInt(port) || 6379,
          ...options
        });
      }

      // Set up event listeners
      this.redis.on('connect', () => {
        console.log('Redis client connected');
        this.metrics.isConnected = true;
      });

      this.redis.on('ready', () => {
        console.log('Redis client ready');
      });

      this.redis.on('error', (error) => {
        console.error('Redis client error:', error);
        this.metrics.errors++;
        this.metrics.lastError = error.message;
        this.metrics.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('Redis client connection closed');
        this.metrics.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('Redis client reconnecting...');
      });

      // Test connection
      const startTime = Date.now();
      await this.redis.connect();
      this.metrics.connectionTime = Date.now() - startTime;

    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.metrics.errors++;
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      // Don't throw - fall back to in-memory cache
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.keyPrefix + key;

    try {
      if (this.useFallback || !this.redis || !this.metrics.isConnected) {
        return this.getFallback<T>(fullKey);
      }

      const startTime = Date.now();
      const value = await this.redis.get(fullKey);

      if (value === null) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      const parsedValue = JSON.parse(value);

      // Log performance for cache hits
      const retrievalTime = Date.now() - startTime;
      if (retrievalTime > 100) {
        console.warn(`Slow cache retrieval for key ${key}: ${retrievalTime}ms`);
      }

      return parsedValue;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.metrics.errors++;
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      return this.getFallback<T>(fullKey);
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.keyPrefix + key;
    const ttl = options.ttl || 300; // Default 5 minutes

    try {
      if (this.useFallback || !this.redis || !this.metrics.isConnected) {
        return this.setFallback(fullKey, value, ttl);
      }

      const serialized = JSON.stringify(value);

      // Warn about large cache values
      if (serialized.length > 1024 * 1024) { // 1MB
        console.warn(`Large cache value for key ${key}: ${serialized.length} bytes`);
      }

      const result = await this.redis.setex(fullKey, ttl, serialized);
      return result === 'OK';
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.metrics.errors++;
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      return this.setFallback(fullKey, value, ttl);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<boolean> {
    const fullKey = this.keyPrefix + key;

    try {
      if (this.useFallback || !this.redis || !this.metrics.isConnected) {
        return this.delFallback(fullKey);
      }

      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      this.metrics.errors++;
      return this.delFallback(fullKey);
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.keyPrefix + key;

    try {
      if (this.useFallback || !this.redis || !this.metrics.isConnected) {
        return this.existsFallback(fullKey);
      }

      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      this.metrics.errors++;
      return this.existsFallback(fullKey);
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => this.keyPrefix + key);

    try {
      if (this.useFallback || !this.redis || !this.metrics.isConnected) {
        return fullKeys.map(key => this.getFallbackSync<T>(key));
      }

      const values = await this.redis.mget(...fullKeys);
      return values.map((value, index) => {
        if (value === null) {
          this.metrics.misses++;
          return null;
        }

        this.metrics.hits++;
        try {
          return JSON.parse(value);
        } catch (error) {
          console.error(`Failed to parse cached value for key ${keys[index]}:`, error);
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      this.metrics.errors++;
      return fullKeys.map(key => this.getFallbackSync<T>(key));
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      if (this.useFallback || !this.redis || !this.metrics.isConnected) {
        keyValuePairs.forEach(({ key, value, ttl = 300 }) => {
          this.setFallback(this.keyPrefix + key, value, ttl);
        });
        return true;
      }

      // Use pipeline for better performance
      const pipeline = this.redis.pipeline();

      keyValuePairs.forEach(({ key, value, ttl = 300 }) => {
        const fullKey = this.keyPrefix + key;
        const serialized = JSON.stringify(value);
        pipeline.setex(fullKey, ttl, serialized);
      });

      const results = await pipeline.exec();
      return results?.every(([error, result]) => error === null && result === 'OK') || false;
    } catch (error) {
      console.error('Cache mset error:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearByPattern(pattern: string): Promise<number> {
    const fullPattern = this.keyPrefix + pattern;

    try {
      if (this.useFallback || !this.redis || !this.metrics.isConnected) {
        return this.clearFallbackByPattern(fullPattern);
      }

      // Use SCAN for better performance with large datasets
      const keys: string[] = [];
      const stream = this.redis.scanStream({
        match: fullPattern,
        count: 100
      });

      for await (const chunk of stream) {
        keys.push(...chunk);
      }

      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        return result;
      }

      return 0;
    } catch (error) {
      console.error(`Cache clear by pattern error for pattern ${pattern}:`, error);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      connectionTime: this.metrics.connectionTime,
      isConnected: this.metrics.isConnected
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.metrics.isConnected = false;
    }
  }

  /**
   * Health check for monitoring
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; metrics: CacheMetrics }> {
    const metrics = this.getMetrics();

    if (this.useFallback) {
      return { status: 'degraded', metrics };
    }

    if (!this.redis || !metrics.isConnected) {
      return { status: 'unhealthy', metrics };
    }

    try {
      const startTime = Date.now();
      await this.redis.ping();
      const pingTime = Date.now() - startTime;

      if (pingTime > 1000) {
        return { status: 'degraded', metrics };
      }

      return { status: 'healthy', metrics };
    } catch (error) {
      return { status: 'unhealthy', metrics };
    }
  }

  // Fallback cache methods (in-memory)
  private getFallback<T>(key: string): T | null {
    const cached = this.fallbackCache.get(key);
    if (!cached) {
      this.metrics.misses++;
      return null;
    }

    if (Date.now() > cached.expires) {
      this.fallbackCache.delete(key);
      this.metrics.misses++;
      return null;
    }

    this.metrics.hits++;
    return cached.value;
  }

  private getFallbackSync<T>(key: string): T | null {
    const cached = this.fallbackCache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.fallbackCache.delete(key);
      return null;
    }

    return cached.value;
  }

  private setFallback(key: string, value: any, ttl: number): boolean {
    const expires = Date.now() + (ttl * 1000);
    this.fallbackCache.set(key, { value, expires });

    // Clean up expired entries periodically
    if (this.fallbackCache.size > 1000) {
      this.cleanupFallbackCache();
    }

    return true;
  }

  private delFallback(key: string): boolean {
    return this.fallbackCache.delete(key);
  }

  private existsFallback(key: string): boolean {
    const cached = this.fallbackCache.get(key);
    if (!cached) return false;

    if (Date.now() > cached.expires) {
      this.fallbackCache.delete(key);
      return false;
    }

    return true;
  }

  private clearFallbackByPattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;

    for (const key of this.fallbackCache.keys()) {
      if (regex.test(key)) {
        this.fallbackCache.delete(key);
        count++;
      }
    }

    return count;
  }

  private cleanupFallbackCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.fallbackCache.entries()) {
      if (now > cached.expires) {
        this.fallbackCache.delete(key);
      }
    }
  }
}

// Singleton instance
let redisClient: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!redisClient) {
    redisClient = new RedisClient();
  }
  return redisClient;
}

// For testing
export function resetRedisClient(): void {
  if (redisClient) {
    redisClient.close();
    redisClient = null;
  }
}