/**
 * Edge Caching Middleware for Calendar API Routes
 *
 * Provides intelligent edge caching for API routes with geographic distribution,
 * cache warming strategies, and event-based invalidation for optimal performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from './redis-client';

interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: number; // SWR in seconds
  cacheKey?: string; // Custom cache key
  varyBy?: string[]; // Headers to vary cache by
  tags?: string[]; // Cache tags for invalidation
  skipCache?: boolean; // Skip caching entirely
}

interface EdgeCacheOptions {
  defaultTTL: number;
  maxStale: number;
  enableStaleWhileRevalidate: boolean;
  cacheHeaders: boolean;
  keyPrefix: string;
}

interface CacheMetadata {
  cached_at: string;
  expires_at: string;
  tags: string[];
  version: number;
  request_id?: string;
}

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  metadata: CacheMetadata;
}

class EdgeCacheMiddleware {
  private cache = getRedisClient();
  private options: EdgeCacheOptions;

  constructor(options: Partial<EdgeCacheOptions> = {}) {
    this.options = {
      defaultTTL: 300, // 5 minutes
      maxStale: 86400, // 24 hours
      enableStaleWhileRevalidate: true,
      cacheHeaders: true,
      keyPrefix: 'edge-cache:',
      ...options
    };
  }

  /**
   * Main middleware function for caching API responses
   */
  async middleware(
    request: NextRequest,
    config: CacheConfig,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Skip caching for non-GET requests or if explicitly disabled
    if (request.method !== 'GET' || config.skipCache) {
      return await handler(request);
    }

    const cacheKey = this.generateCacheKey(request, config);

    try {
      // Try to get cached response
      const cachedResponse = await this.getCachedResponse(cacheKey);

      if (cachedResponse) {
        const { response, isStale } = cachedResponse;

        // If response is fresh, return it immediately
        if (!isStale) {
          return this.createResponseFromCache(response, {
            hit: true,
            stale: false,
            requestId: this.generateRequestId()
          });
        }

        // If stale-while-revalidate is enabled and response is stale but within max-stale
        if (this.options.enableStaleWhileRevalidate && this.isWithinMaxStale(response)) {
          // Return stale response immediately
          const staleResponse = this.createResponseFromCache(response, {
            hit: true,
            stale: true,
            requestId: this.generateRequestId()
          });

          // Revalidate in background (fire and forget)
          this.revalidateInBackground(request, config, handler, cacheKey);

          return staleResponse;
        }
      }

      // No cache hit or expired beyond max-stale, fetch fresh response
      const freshResponse = await handler(request);

      // Cache the response if it's successful
      if (freshResponse.status >= 200 && freshResponse.status < 300) {
        await this.cacheResponse(cacheKey, freshResponse, config);
      }

      // Add cache headers
      if (this.options.cacheHeaders) {
        this.addCacheHeaders(freshResponse, {
          hit: false,
          stale: false,
          requestId: this.generateRequestId()
        });
      }

      return freshResponse;

    } catch (error) {
      console.error('Edge cache middleware error:', error);
      // On cache error, always serve fresh response
      return await handler(request);
    }
  }

  /**
   * Generate cache key based on request and configuration
   */
  private generateCacheKey(request: NextRequest, config: CacheConfig): string {
    if (config.cacheKey) {
      return `${this.options.keyPrefix}${config.cacheKey}`;
    }

    const url = new URL(request.url);
    let keyParts = [url.pathname, url.search];

    // Add headers specified in varyBy
    if (config.varyBy) {
      const headerParts = config.varyBy.map(header => {
        const value = request.headers.get(header) || 'null';
        return `${header}:${value}`;
      });
      keyParts.push(...headerParts);
    }

    // Add user context for personalized caching
    const userId = this.extractUserId(request);
    if (userId) {
      keyParts.push(`user:${userId}`);
    }

    const key = keyParts.join('|');
    return `${this.options.keyPrefix}${Buffer.from(key).toString('base64')}`;
  }

  /**
   * Get cached response and check if it's stale
   */
  private async getCachedResponse(cacheKey: string): Promise<{
    response: CachedResponse;
    isStale: boolean;
  } | null> {
    const cached = await this.cache.get<CachedResponse>(cacheKey);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const expiresAt = new Date(cached.metadata.expires_at).getTime();
    const isStale = now > expiresAt;

    return { response: cached, isStale };
  }

  /**
   * Cache the response with metadata
   */
  private async cacheResponse(
    cacheKey: string,
    response: NextResponse,
    config: CacheConfig
  ): Promise<void> {
    try {
      // Clone the response to read the body
      const clonedResponse = response.clone();
      const body = await clonedResponse.text();

      // Extract headers (only cacheable ones)
      const headers: Record<string, string> = {};
      const cacheableHeaders = [
        'content-type',
        'content-length',
        'etag',
        'last-modified',
        'cache-control'
      ];

      cacheableHeaders.forEach(header => {
        const value = response.headers.get(header);
        if (value) {
          headers[header] = value;
        }
      });

      const now = new Date();
      const ttl = config.ttl || this.options.defaultTTL;
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      const cachedResponse: CachedResponse = {
        statusCode: response.status,
        headers,
        body,
        metadata: {
          cached_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          tags: config.tags || [],
          version: 1,
          request_id: this.generateRequestId()
        }
      };

      await this.cache.set(cacheKey, cachedResponse, { ttl });

      // Set cache tags for invalidation
      if (config.tags) {
        await this.tagCache(config.tags, cacheKey);
      }

    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }

  /**
   * Create NextResponse from cached data
   */
  private createResponseFromCache(
    cachedResponse: CachedResponse,
    cacheInfo: { hit: boolean; stale: boolean; requestId: string }
  ): NextResponse {
    const response = new NextResponse(cachedResponse.body, {
      status: cachedResponse.statusCode,
      headers: cachedResponse.headers
    });

    if (this.options.cacheHeaders) {
      this.addCacheHeaders(response, cacheInfo);
    }

    return response;
  }

  /**
   * Add cache-related headers to response
   */
  private addCacheHeaders(
    response: NextResponse,
    info: { hit: boolean; stale: boolean; requestId: string }
  ): void {
    response.headers.set('x-cache', info.hit ? 'HIT' : 'MISS');
    response.headers.set('x-cache-status', info.stale ? 'STALE' : 'FRESH');
    response.headers.set('x-request-id', info.requestId);
    response.headers.set('x-edge-cache', 'polyharmony-edge');
  }

  /**
   * Check if cached response is within max-stale limit
   */
  private isWithinMaxStale(cachedResponse: CachedResponse): boolean {
    const now = Date.now();
    const expiresAt = new Date(cachedResponse.metadata.expires_at).getTime();
    const maxStaleTime = expiresAt + (this.options.maxStale * 1000);

    return now <= maxStaleTime;
  }

  /**
   * Revalidate cache in background
   */
  private async revalidateInBackground(
    request: NextRequest,
    config: CacheConfig,
    handler: (req: NextRequest) => Promise<NextResponse>,
    cacheKey: string
  ): Promise<void> {
    try {
      const freshResponse = await handler(request);

      if (freshResponse.status >= 200 && freshResponse.status < 300) {
        await this.cacheResponse(cacheKey, freshResponse, config);
      }
    } catch (error) {
      console.error('Background revalidation failed:', error);
    }
  }

  /**
   * Tag cache entries for group invalidation
   */
  private async tagCache(tags: string[], cacheKey: string): Promise<void> {
    const promises = tags.map(tag => {
      const tagKey = `${this.options.keyPrefix}tag:${tag}`;
      return this.cache.set(tagKey, [cacheKey], { ttl: this.options.maxStale });
    });

    await Promise.all(promises);
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0;

    for (const tag of tags) {
      const tagKey = `${this.options.keyPrefix}tag:${tag}`;
      const cacheKeys = await this.cache.get<string[]>(tagKey);

      if (cacheKeys) {
        for (const cacheKey of cacheKeys) {
          const deleted = await this.cache.del(cacheKey);
          if (deleted) invalidatedCount++;
        }

        // Clean up the tag itself
        await this.cache.del(tagKey);
      }
    }

    return invalidatedCount;
  }

  /**
   * Extract user ID from request for personalized caching
   */
  private extractUserId(request: NextRequest): string | null {
    try {
      // Try to get user ID from authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // For now, return a hash of the token for caching purposes
        // In production, you would validate the JWT and extract the user ID
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(token).digest('hex').substring(0, 16);
      }

      // Try to get user ID from session cookie
      const sessionCookie = request.cookies.get('supabase-auth-token')?.value;
      if (sessionCookie) {
        // Create a deterministic but anonymous cache key from session
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(sessionCookie).digest('hex').substring(0, 16);
      }

      // No authenticated user - use anonymous caching
      return 'anonymous';
    } catch (error) {
      console.warn('Error extracting user ID for cache:', error);
      return 'anonymous';
    }
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    cache: any;
  }> {
    const cacheHealth = await this.cache.healthCheck();

    return {
      status: cacheHealth.status,
      cache: cacheHealth.metrics
    };
  }
}

// Singleton instance
let edgeCacheMiddleware: EdgeCacheMiddleware | null = null;

export function getEdgeCacheMiddleware(options?: Partial<EdgeCacheOptions>): EdgeCacheMiddleware {
  if (!edgeCacheMiddleware) {
    edgeCacheMiddleware = new EdgeCacheMiddleware(options);
  }
  return edgeCacheMiddleware;
}

// Convenience function for API routes
export function withEdgeCache(config: CacheConfig) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      const middleware = getEdgeCacheMiddleware();
      return middleware.middleware(request, config, handler);
    };
  };
}

// Cache invalidation utilities
export async function invalidateCache(tags: string[]): Promise<number> {
  const middleware = getEdgeCacheMiddleware();
  return middleware.invalidateByTags(tags);
}

export type { CacheConfig, EdgeCacheOptions };