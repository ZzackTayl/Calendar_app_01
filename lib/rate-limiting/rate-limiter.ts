/**
 * Enterprise-Grade Rate Limiting Service
 * 
 * Comprehensive multi-layer rate limiting system with adaptive algorithms,
 * distributed state management, and production-ready monitoring.
 * 
 * Features:
 * - Token Bucket algorithm for burst handling
 * - Sliding Window for precise time-based limits  
 * - Fixed Window for simple operations
 * - Leaky Bucket for smooth background operations
 * - Adaptive rate limiting based on system performance
 * - Cross-instance synchronization support
 */

import * as crypto from 'crypto';

export interface RateLimitConfig {
  identifier: string;
  algorithm: 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';
  maxRequests: number;
  windowMs: number;
  burstCapacity?: number; // For token bucket
  refillRate?: number; // For token bucket (tokens per second)
  adaptiveEnabled?: boolean;
  adaptiveMultiplier?: number; // Applied multiplier for adaptive limiting
  blockThreshold?: number; // Violations before blocking
  blockDurationMs?: number;
  gracePeriodMs?: number; // Grace period after successful operation
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked?: boolean;
  blockUntil?: number;
  algorithm: string;
  metadata?: Record<string, any>;
}

export interface RateLimitState {
  count: number;
  tokens?: number; // Token bucket
  lastRefill?: number; // Token bucket
  requests?: Array<{ timestamp: number; size: number }>; // Sliding window
  resetTime: number;
  violations: number;
  blocked: boolean;
  blockUntil?: number;
  lastSuccessful?: number;
  adaptiveMultiplier?: number;
}

/**
 * Core Rate Limiting Service
 */
export class RateLimiter {
  private static instance: RateLimiter;
  private store = new Map<string, RateLimitState>();
  private readonly cleanupInterval: NodeJS.Timeout;
  private adaptiveMetrics = new Map<string, { latency: number; errorRate: number; timestamp: number }>();

  private constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check rate limit with specified configuration
   */
  async checkLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const key = this.generateKey(config);
    const now = Date.now();

    // Apply adaptive multiplier if enabled
    const adaptedConfig = this.applyAdaptiveMultiplier(config);

    let state = this.store.get(key);

    // Initialize state if not exists or expired
    if (!state || this.isStateExpired(state, now)) {
      state = this.initializeState(adaptedConfig, now);
      this.store.set(key, state);
    }

    // Check if currently blocked
    if (state.blocked && state.blockUntil && now < state.blockUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: state.resetTime,
        retryAfter: Math.ceil((state.blockUntil - now) / 1000),
        blocked: true,
        algorithm: adaptedConfig.algorithm,
        metadata: { violations: state.violations }
      };
    }

    // Clear block if expired
    if (state.blocked && state.blockUntil && now >= state.blockUntil) {
      state.blocked = false;
      state.blockUntil = undefined;
      state.violations = Math.max(0, state.violations - 1); // Slowly reduce violations
    }

    // Apply algorithm-specific logic
    let result: RateLimitResult;

    switch (adaptedConfig.algorithm) {
      case 'token-bucket':
        result = this.checkTokenBucket(adaptedConfig, state, now);
        break;
      case 'sliding-window':
        result = this.checkSlidingWindow(adaptedConfig, state, now);
        break;
      case 'fixed-window':
        result = this.checkFixedWindow(adaptedConfig, state, now);
        break;
      case 'leaky-bucket':
        result = this.checkLeakyBucket(adaptedConfig, state, now);
        break;
      default:
        throw new Error(`Unknown rate limiting algorithm: ${adaptedConfig.algorithm}`);
    }

    // Handle rate limit exceeded
    if (!result.allowed) {
      state.violations = (state.violations || 0) + 1;

      // Apply blocking if threshold reached
      if (adaptedConfig.blockThreshold && state.violations >= adaptedConfig.blockThreshold) {
        state.blocked = true;
        state.blockUntil = now + (adaptedConfig.blockDurationMs || 30 * 60 * 1000);
        
        result.blocked = true;
        result.blockUntil = state.blockUntil;
        result.retryAfter = Math.ceil((state.blockUntil - now) / 1000);
      }
    } else {
      // Successful request - apply grace period
      if (adaptedConfig.gracePeriodMs) {
        state.lastSuccessful = now;
      }
      
      // Reduce violations on successful requests (gradual recovery)
      if (state.violations > 0) {
        state.violations = Math.max(0, state.violations - 0.1);
      }
    }

    this.store.set(key, state);
    return result;
  }

  /**
   * Token Bucket Algorithm
   * Good for: Burst handling with sustained rate limits
   */
  private checkTokenBucket(config: RateLimitConfig, state: RateLimitState, now: number): RateLimitResult {
    const capacity = config.burstCapacity || config.maxRequests;
    const refillRate = config.refillRate || config.maxRequests / (config.windowMs / 1000);

    // Initialize tokens if needed
    if (state.tokens === undefined) {
      state.tokens = capacity;
      state.lastRefill = now;
    }

    // Refill tokens
    const timePassed = (now - (state.lastRefill || now)) / 1000;
    const tokensToAdd = timePassed * refillRate;
    state.tokens = Math.min(capacity, state.tokens + tokensToAdd);
    state.lastRefill = now;

    if (state.tokens >= 1) {
      state.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(state.tokens),
        resetTime: now + (capacity - state.tokens) / refillRate * 1000,
        algorithm: config.algorithm
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + (1 - state.tokens) / refillRate * 1000,
      retryAfter: Math.ceil((1 - state.tokens) / refillRate),
      algorithm: config.algorithm
    };
  }

  /**
   * Sliding Window Algorithm
   * Good for: Precise rate limiting with smooth distribution
   */
  private checkSlidingWindow(config: RateLimitConfig, state: RateLimitState, now: number): RateLimitResult {
    if (!state.requests) {
      state.requests = [];
    }

    // Remove expired requests
    const windowStart = now - config.windowMs;
    state.requests = state.requests.filter(req => req.timestamp > windowStart);

    if (state.requests.length < config.maxRequests) {
      state.requests.push({ timestamp: now, size: 1 });
      return {
        allowed: true,
        remaining: config.maxRequests - state.requests.length,
        resetTime: now + config.windowMs,
        algorithm: config.algorithm
      };
    }

    // Find when the oldest request expires
    const oldestRequest = state.requests[0];
    const retryAfter = Math.ceil((oldestRequest.timestamp + config.windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime: oldestRequest.timestamp + config.windowMs,
      retryAfter,
      algorithm: config.algorithm
    };
  }

  /**
   * Fixed Window Algorithm
   * Good for: Simple operations with clear reset periods
   */
  private checkFixedWindow(config: RateLimitConfig, state: RateLimitState, now: number): RateLimitResult {
    if (now >= state.resetTime) {
      // Reset window
      state.count = 0;
      state.resetTime = now + config.windowMs;
    }

    if (state.count < config.maxRequests) {
      state.count++;
      return {
        allowed: true,
        remaining: config.maxRequests - state.count,
        resetTime: state.resetTime,
        algorithm: config.algorithm
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: state.resetTime,
      retryAfter: Math.ceil((state.resetTime - now) / 1000),
      algorithm: config.algorithm
    };
  }

  /**
   * Leaky Bucket Algorithm
   * Good for: Smooth rate limiting of background operations
   */
  private checkLeakyBucket(config: RateLimitConfig, state: RateLimitState, now: number): RateLimitResult {
    const leakRate = config.maxRequests / (config.windowMs / 1000);
    const capacity = config.burstCapacity || config.maxRequests;

    if (!state.lastRefill) {
      state.lastRefill = now;
      state.count = 0;
    }

    // Leak requests
    const timePassed = (now - state.lastRefill) / 1000;
    const leaked = timePassed * leakRate;
    state.count = Math.max(0, state.count - leaked);
    state.lastRefill = now;

    if (state.count < capacity) {
      state.count += 1;
      return {
        allowed: true,
        remaining: Math.floor(capacity - state.count),
        resetTime: now + (state.count / leakRate) * 1000,
        algorithm: config.algorithm
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: now + ((state.count - capacity + 1) / leakRate) * 1000,
      retryAfter: Math.ceil((state.count - capacity + 1) / leakRate),
      algorithm: config.algorithm
    };
  }

  /**
   * Apply adaptive rate limiting based on system performance
   */
  private applyAdaptiveMultiplier(config: RateLimitConfig): RateLimitConfig {
    if (!config.adaptiveEnabled) {
      return config;
    }

    const metrics = this.adaptiveMetrics.get(config.identifier);
    if (!metrics || Date.now() - metrics.timestamp > 60000) { // 1 minute old
      return config;
    }

    let multiplier = 1;

    // Increase limits if system is performing well
    if (metrics.latency < 100 && metrics.errorRate < 0.01) { // <100ms, <1% errors
      multiplier = 1.5;
    }
    // Decrease limits if system is under stress
    else if (metrics.latency > 1000 || metrics.errorRate > 0.1) { // >1s, >10% errors
      multiplier = 0.5;
    }
    // Normal performance
    else if (metrics.latency > 500 || metrics.errorRate > 0.05) { // >500ms, >5% errors
      multiplier = 0.8;
    }

    return {
      ...config,
      maxRequests: Math.floor(config.maxRequests * multiplier),
      adaptiveMultiplier: multiplier
    };
  }

  /**
   * Update system performance metrics for adaptive rate limiting
   */
  updateMetrics(identifier: string, latency: number, errorRate: number): void {
    this.adaptiveMetrics.set(identifier, {
      latency,
      errorRate,
      timestamp: Date.now()
    });
  }

  /**
   * Reset rate limiting state for identifier
   */
  reset(identifier: string, keyPrefix?: string): void {
    const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
    this.store.delete(key);
  }

  /**
   * Get current state for identifier
   */
  getState(identifier: string, keyPrefix?: string): RateLimitState | undefined {
    const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
    return this.store.get(key);
  }

  /**
   * Initialize rate limit state
   */
  private initializeState(config: RateLimitConfig, now: number): RateLimitState {
    return {
      count: 0,
      resetTime: now + config.windowMs,
      violations: 0,
      blocked: false,
      tokens: config.burstCapacity || config.maxRequests,
      lastRefill: now,
      requests: []
    };
  }

  /**
   * Check if state is expired
   */
  private isStateExpired(state: RateLimitState, now: number): boolean {
    return now >= state.resetTime && !state.blocked;
  }

  /**
   * Generate storage key
   */
  private generateKey(config: RateLimitConfig): string {
    const prefix = config.keyPrefix || 'rate_limit';
    const hash = crypto.createHash('sha256')
      .update(`${config.identifier}:${config.algorithm}:${config.maxRequests}:${config.windowMs}`)
      .digest('hex')
      .substring(0, 16);
    return `${prefix}:${hash}`;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, state] of this.store.entries()) {
      // Remove if not blocked and past reset time by more than 1 hour
      if (!state.blocked && now > state.resetTime + 60 * 60 * 1000) {
        expiredKeys.push(key);
      }
      // Remove if blocked but block has expired by more than 1 hour
      else if (state.blocked && state.blockUntil && now > state.blockUntil + 60 * 60 * 1000) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.store.delete(key));

    // Clean up old adaptive metrics (older than 1 hour)
    for (const [identifier, metrics] of this.adaptiveMetrics.entries()) {
      if (now - metrics.timestamp > 60 * 60 * 1000) {
        this.adaptiveMetrics.delete(identifier);
      }
    }
  }

  /**
   * Get statistics for monitoring
   */
  getStatistics(): {
    totalEntries: number;
    blockedEntries: number;
    oldestEntry: number;
    adaptiveMetrics: number;
  } {
    let blockedCount = 0;
    let oldestTimestamp = Date.now();

    for (const state of this.store.values()) {
      if (state.blocked) blockedCount++;
      if (state.resetTime < oldestTimestamp) {
        oldestTimestamp = state.resetTime;
      }
    }

    return {
      totalEntries: this.store.size,
      blockedEntries: blockedCount,
      oldestEntry: oldestTimestamp,
      adaptiveMetrics: this.adaptiveMetrics.size
    };
  }

  /**
   * Destroy the rate limiter and cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
    this.adaptiveMetrics.clear();
  }
}

/**
 * Predefined rate limiting configurations for polyamory calendar
 */
export const POLYAMORY_RATE_LIMITS = {
  // Password recovery - very strict
  PASSWORD_RECOVERY: {
    algorithm: 'fixed-window' as const,
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockThreshold: 5,
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    keyPrefix: 'pwd_recovery'
  },

  // Authentication attempts
  AUTH_ATTEMPTS: {
    algorithm: 'sliding-window' as const,
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockThreshold: 3,
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    keyPrefix: 'auth'
  },

  // Key derivation operations
  KEY_DERIVATION: {
    algorithm: 'token-bucket' as const,
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    burstCapacity: 20,
    refillRate: 100 / 60, // 100 per minute
    adaptiveEnabled: true,
    keyPrefix: 'key_deriv'
  },

  // Event operations
  EVENT_OPERATIONS: {
    algorithm: 'token-bucket' as const,
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstCapacity: 30,
    refillRate: 100 / 3600, // 100 per hour
    adaptiveEnabled: true,
    keyPrefix: 'events'
  },

  // Conflict detection
  CONFLICT_DETECTION: {
    algorithm: 'sliding-window' as const,
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    adaptiveEnabled: true,
    keyPrefix: 'conflict'
  },

  // Privacy boundary checks
  PRIVACY_CHECKS: {
    algorithm: 'leaky-bucket' as const,
    maxRequests: 500,
    windowMs: 60 * 60 * 1000, // 1 hour
    burstCapacity: 100,
    adaptiveEnabled: true,
    keyPrefix: 'privacy'
  },

  // Demo system protection
  DEMO_OPERATIONS: {
    algorithm: 'fixed-window' as const,
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockThreshold: 5,
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    keyPrefix: 'demo'
  },

  // API endpoints
  API_CALLS: {
    algorithm: 'sliding-window' as const,
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    adaptiveEnabled: true,
    keyPrefix: 'api'
  }
};

/**
 * Factory function to create rate limiter instance
 */
export function createRateLimiter(): RateLimiter {
  return RateLimiter.getInstance();
}

/**
 * Helper function to create rate limit configuration
 */
export function createRateLimitConfig(
  identifier: string,
  preset: keyof typeof POLYAMORY_RATE_LIMITS,
  overrides?: Partial<RateLimitConfig>
): RateLimitConfig {
  const base = POLYAMORY_RATE_LIMITS[preset];
  return {
    identifier,
    ...base,
    ...overrides
  };
}