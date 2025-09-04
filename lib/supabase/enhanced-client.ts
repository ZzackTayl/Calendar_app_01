/**
 * Enhanced Supabase Client with Session Management Integration
 * 
 * This module provides a production-ready Supabase client with:
 * - Automatic session validation and recovery
 * - Connection pooling and retry logic
 * - Performance monitoring
 * - Session consistency guarantees
 * - Real-time connection management
 */

import { createBrowserClient, SupabaseClient } from '@supabase/ssr';
import { SupabaseClient as BaseSupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { getSessionManager, SessionState } from '../auth/session-manager';

export interface EnhancedClientOptions {
  enableSessionValidation?: boolean;
  enableRetryLogic?: boolean;
  enablePerformanceMonitoring?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  connectionTimeout?: number;
  validateBeforeRequest?: boolean;
}

export interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  operation: string;
  retryCount: number;
  error?: string;
}

/**
 * Enhanced Supabase Client wrapper with session management
 */
class EnhancedSupabaseClient {
  private client: SupabaseClient;
  private options: Required<EnhancedClientOptions>;
  private sessionManager = getSessionManager();
  private metrics: RequestMetrics[] = [];
  private connectionPool: Map<string, Promise<any>> = new Map();
  private isConnected = true;

  constructor(options: EnhancedClientOptions = {}) {
    this.options = {
      enableSessionValidation: true,
      enableRetryLogic: true,
      enablePerformanceMonitoring: true,
      maxRetries: 3,
      retryDelay: 1000,
      connectionTimeout: 30000,
      validateBeforeRequest: true,
      ...options
    };

    this.client = this.createClient();
    this.setupConnectionMonitoring();
    console.log('[ENHANCED_CLIENT] ✅ Enhanced Supabase client initialized');
  }

  private createClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Check for placeholder values
    if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
      throw new Error('Supabase environment variables contain placeholder values');
    }

    return createBrowserClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          // Add custom headers for enhanced client identification
          headers: {
            'X-Client-Info': 'polyharmony-enhanced-client',
            'X-Client-Version': '1.0.0'
          }
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-Client-Info': 'polyharmony-enhanced'
          }
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    );
  }

  private setupConnectionMonitoring(): void {
    // Monitor session state changes
    this.sessionManager.subscribe((state: SessionState) => {
      this.isConnected = state.user !== null && state.session !== null && !state.error;
      
      if (!this.isConnected) {
        console.warn('[ENHANCED_CLIENT] ⚠️ Connection health degraded:', {
          user: !!state.user,
          session: !!state.session,
          error: state.error,
          consistencyScore: state.consistencyScore
        });
      }
    });
  }

  /**
   * Execute request with session validation and retry logic
   */
  private async executeWithRetry<T>(
    operation: string,
    request: () => Promise<T>,
    requiresAuth: boolean = true
  ): Promise<T> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    // Pre-request validation if enabled
    if (this.options.validateBeforeRequest && requiresAuth) {
      const sessionState = this.sessionManager.getCurrentState();
      if (!sessionState.user || !sessionState.session) {
        throw new Error('Authentication required for this operation');
      }

      // Check consistency score
      if (sessionState.consistencyScore < 70) {
        console.warn('[ENHANCED_CLIENT] ⚠️ Low session consistency score, attempting recovery...');
        await this.sessionManager.forceRefresh();
      }
    }

    while (retryCount <= this.options.maxRetries) {
      try {
        const result = await Promise.race([
          request(),
          this.createTimeoutPromise(this.options.connectionTimeout)
        ]);

        // Record successful metrics
        if (this.options.enablePerformanceMonitoring) {
          this.recordMetrics({
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime,
            success: true,
            operation,
            retryCount
          });
        }

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retryCount++;

        console.warn(`[ENHANCED_CLIENT] Request failed (attempt ${retryCount}/${this.options.maxRetries + 1}):`, {
          operation,
          error: lastError.message,
          retryCount
        });

        // Check if this is a session-related error
        if (this.isSessionError(lastError)) {
          console.log('[ENHANCED_CLIENT] 🔄 Session error detected, attempting recovery...');
          await this.sessionManager.recoverSession({ forceRefresh: true });
          
          // Don't count session recovery as a retry
          if (retryCount <= this.options.maxRetries) {
            continue;
          }
        }

        // If we've exhausted retries, break
        if (retryCount > this.options.maxRetries) {
          break;
        }

        // Wait before retry with exponential backoff
        if (this.options.enableRetryLogic) {
          const delay = this.options.retryDelay * Math.pow(2, retryCount - 1);
          await this.delay(delay);
        }
      }
    }

    // Record failed metrics
    if (this.options.enablePerformanceMonitoring) {
      this.recordMetrics({
        startTime,
        endTime: Date.now(),
        duration: Date.now() - startTime,
        success: false,
        operation,
        retryCount: retryCount - 1,
        error: lastError?.message
      });
    }

    throw lastError || new Error(`Operation failed after ${this.options.maxRetries} retries`);
  }

  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  private isSessionError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('jwt') || 
           message.includes('token') || 
           message.includes('auth') || 
           message.includes('session') ||
           message.includes('unauthorized') ||
           message.includes('forbidden');
  }

  private recordMetrics(metrics: RequestMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics entries
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced API methods with session management

  /**
   * Enhanced authentication getter with validation
   */
  get auth() {
    const originalAuth = this.client.auth;
    
    return {
      ...originalAuth,
      
      // Override getUser with validation
      getUser: async () => {
        return this.executeWithRetry(
          'auth.getUser',
          () => originalAuth.getUser(),
          false // Don't require auth for getting current user
        );
      },

      // Override getSession with validation
      getSession: async () => {
        return this.executeWithRetry(
          'auth.getSession',
          () => originalAuth.getSession(),
          false // Don't require auth for getting current session
        );
      },

      // Override signInWithPassword with retry
      signInWithPassword: async (credentials: any) => {
        return this.executeWithRetry(
          'auth.signInWithPassword',
          () => originalAuth.signInWithPassword(credentials),
          false // Don't require auth for signing in
        );
      },

      // Override signUp with retry
      signUp: async (credentials: any) => {
        return this.executeWithRetry(
          'auth.signUp',
          () => originalAuth.signUp(credentials),
          false // Don't require auth for signing up
        );
      },

      // Override signOut with cleanup
      signOut: async () => {
        const result = await this.executeWithRetry(
          'auth.signOut',
          () => originalAuth.signOut(),
          false // Don't require auth for signing out
        );
        
        // Clear connection pool
        this.connectionPool.clear();
        
        return result;
      }
    };
  }

  /**
   * Enhanced database access with session management
   */
  from(table: string) {
    const originalTable = this.client.from(table);
    
    return {
      ...originalTable,
      
      // Override select with retry and validation
      select: (columns?: string, options?: any) => {
        const query = originalTable.select(columns, options);
        
        return {
          ...query,
          
          // Execute with session validation
          then: async (resolve: any, reject: any) => {
            try {
              const result = await this.executeWithRetry(
                `from(${table}).select`,
                () => query
              );
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        };
      },

      // Override insert with retry and validation
      insert: (values: any, options?: any) => {
        return this.executeWithRetry(
          `from(${table}).insert`,
          () => originalTable.insert(values, options)
        );
      },

      // Override update with retry and validation
      update: (values: any, options?: any) => {
        const query = originalTable.update(values, options);
        
        return {
          ...query,
          
          eq: (column: string, value: any) => {
            const eqQuery = query.eq(column, value);
            
            return this.executeWithRetry(
              `from(${table}).update.eq`,
              () => eqQuery
            );
          },
          
          // Execute with session validation
          then: async (resolve: any, reject: any) => {
            try {
              const result = await this.executeWithRetry(
                `from(${table}).update`,
                () => query
              );
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        };
      },

      // Override delete with retry and validation
      delete: (options?: any) => {
        const query = originalTable.delete(options);
        
        return {
          ...query,
          
          eq: (column: string, value: any) => {
            const eqQuery = query.eq(column, value);
            
            return this.executeWithRetry(
              `from(${table}).delete.eq`,
              () => eqQuery
            );
          },
          
          // Execute with session validation
          then: async (resolve: any, reject: any) => {
            try {
              const result = await this.executeWithRetry(
                `from(${table}).delete`,
                () => query
              );
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        };
      }
    };
  }

  /**
   * Enhanced real-time subscriptions with session management
   */
  channel(name: string) {
    const originalChannel = this.client.channel(name);
    
    return {
      ...originalChannel,
      
      // Override subscribe with session validation
      subscribe: async (callback?: (status: string) => void) => {
        // Validate session before subscribing
        const sessionState = this.sessionManager.getCurrentState();
        if (!sessionState.user || !sessionState.session) {
          throw new Error('Authentication required for real-time subscriptions');
        }
        
        return originalChannel.subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[ENHANCED_CLIENT] Real-time connection issue: ${status}`);
            // Attempt session recovery
            this.sessionManager.recoverSession({ forceRefresh: true });
          }
          
          if (callback) callback(status);
        });
      }
    };
  }

  // Enhanced utility methods

  /**
   * Get connection health information
   */
  getConnectionHealth(): {
    isConnected: boolean;
    sessionScore: number;
    lastMetrics: RequestMetrics[];
    averageResponseTime: number;
    successRate: number;
  } {
    const recentMetrics = this.metrics.slice(-50); // Last 50 requests
    const successfulRequests = recentMetrics.filter(m => m.success);
    const averageResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / recentMetrics.length 
      : 0;
    const successRate = recentMetrics.length > 0 
      ? (successfulRequests.length / recentMetrics.length) * 100 
      : 100;

    return {
      isConnected: this.isConnected,
      sessionScore: this.sessionManager.getCurrentState().consistencyScore,
      lastMetrics: recentMetrics.slice(-10), // Last 10 requests
      averageResponseTime,
      successRate
    };
  }

  /**
   * Force session validation and recovery
   */
  async validateAndRecover(): Promise<void> {
    await this.sessionManager.forceRefresh();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    slowestRequest: RequestMetrics | null;
    fastestRequest: RequestMetrics | null;
  } {
    const totalRequests = this.metrics.length;
    const successfulRequests = this.metrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = totalRequests > 0 
      ? this.metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalRequests 
      : 0;
    
    const requestsWithDuration = this.metrics.filter(m => m.duration);
    const slowestRequest = requestsWithDuration.length > 0 
      ? requestsWithDuration.reduce((slowest, current) => 
          (current.duration! > slowest.duration!) ? current : slowest
        ) 
      : null;
    
    const fastestRequest = requestsWithDuration.length > 0 
      ? requestsWithDuration.reduce((fastest, current) => 
          (current.duration! < fastest.duration!) ? current : fastest
        ) 
      : null;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      slowestRequest,
      fastestRequest
    };
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get original Supabase client for advanced usage
   */
  getOriginalClient(): SupabaseClient {
    return this.client;
  }
}

// Singleton instance
let enhancedClientInstance: EnhancedSupabaseClient | null = null;

/**
 * Get enhanced Supabase client singleton
 */
export function getEnhancedSupabaseClient(options?: EnhancedClientOptions): EnhancedSupabaseClient {
  if (!enhancedClientInstance) {
    enhancedClientInstance = new EnhancedSupabaseClient(options);
  }
  return enhancedClientInstance;
}

/**
 * Clear enhanced client instance (useful for testing)
 */
export function clearEnhancedClient(): void {
  enhancedClientInstance = null;
}

export { EnhancedSupabaseClient };
export default getEnhancedSupabaseClient;