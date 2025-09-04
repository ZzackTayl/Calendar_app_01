/**
 * Enhanced Supabase Client with Authentication Integration
 * 
 * This module provides an enhanced Supabase client with built-in
 * authentication context awareness and session management.
 */

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient as BaseSupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { validateAuthSession, SessionValidationResult } from '../auth/session-manager';

export interface EnhancedSupabaseClient extends BaseSupabaseClient {
  // Enhanced methods with authentication context
  authenticatedQuery: <T = any>(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    data?: any,
    filters?: Record<string, any>
  ) => Promise<{ data: T[] | null; error: PostgrestError | null; authContext: SessionValidationResult }>;
  
  // Session management
  validateSession: () => Promise<SessionValidationResult>;
  refreshSessionIfNeeded: () => Promise<boolean>;
}

export interface QueryOptions {
  requireAuth?: boolean;
  validateSession?: boolean;
  autoRefresh?: boolean;
}

export class EnhancedSupabaseClientImpl {
  private client: any;
  private sessionCache: SessionValidationResult | null = null;
  private sessionCacheExpiry = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor() {
    this.client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Get the underlying Supabase client
   */
  public getClient(): BaseSupabaseClient {
    return this.client;
  }

  /**
   * Validate current session with caching
   */
  public async validateSession(): Promise<SessionValidationResult> {
    const now = Date.now();
    
    // Return cached result if still valid
    if (this.sessionCache && now < this.sessionCacheExpiry) {
      return this.sessionCache;
    }

    // Validate session
    const validation = await validateAuthSession();
    
    // Cache the result
    this.sessionCache = validation;
    this.sessionCacheExpiry = now + this.CACHE_DURATION;
    
    return validation;
  }

  /**
   * Refresh session if needed
   */
  public async refreshSessionIfNeeded(): Promise<boolean> {
    try {
      const validation = await this.validateSession();
      
      if (validation.contextIntegrity === 'degraded' || validation.contextIntegrity === 'failed') {
        console.log('EnhancedSupabaseClient: Refreshing session due to degraded context');
        
        const { data, error } = await this.client.auth.refreshSession();
        
        if (error || !data.session) {
          console.error('EnhancedSupabaseClient: Session refresh failed:', error);
          return false;
        }
        
        // Clear cache to force revalidation
        this.sessionCache = null;
        this.sessionCacheExpiry = 0;
        
        console.log('EnhancedSupabaseClient: Session refreshed successfully');
        return true;
      }
      
      return validation.valid;
    } catch (error) {
      console.error('EnhancedSupabaseClient: Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Perform authenticated query with session validation
   */
  public async authenticatedQuery<T = any>(
    table: string,
    operation: 'select' | 'insert' | 'update' | 'delete',
    data?: any,
    filters?: Record<string, any>
  ): Promise<{ data: T[] | null; error: PostgrestError | null; authContext: SessionValidationResult }> {
    
    // Validate session first
    const authContext = await this.validateSession();
    
    if (!authContext.valid) {
      return {
        data: null,
        error: {
          message: 'Authentication required',
          details: authContext.error || 'Invalid session',
          hint: 'Please sign in again',
          code: 'AUTH_REQUIRED'
        } as PostgrestError,
        authContext
      };
    }

    try {
      let query = this.client.from(table);
      
      // Apply user filter for security
      if (authContext.user) {
        query = query.eq('user_id', authContext.user.id);
      }

      // Apply additional filters
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          query = query.eq(key, value);
        }
      }

      let result;
      
      switch (operation) {
        case 'select':
          result = await query.select();
          break;
        case 'insert':
          if (!data) {
            throw new Error('Data required for insert operation');
          }
          // Ensure user_id is set for security
          const insertData = { ...data, user_id: authContext.user?.id };
          result = await query.insert(insertData).select();
          break;
        case 'update':
          if (!data) {
            throw new Error('Data required for update operation');
          }
          result = await query.update(data).select();
          break;
        case 'delete':
          result = await query.delete().select();
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      return {
        data: result.data as T[],
        error: result.error,
        authContext
      };

    } catch (error) {
      console.error('EnhancedSupabaseClient: Query error:', error);
      
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Query failed',
          details: 'An error occurred while executing the query',
          hint: 'Please try again or contact support',
          code: 'QUERY_ERROR'
        } as PostgrestError,
        authContext
      };
    }
  }

  /**
   * Perform a safe select query with authentication
   */
  public async safeSelect<T = any>(
    table: string,
    columns: string = '*',
    filters?: Record<string, any>
  ): Promise<{ data: T[] | null; error: PostgrestError | null; authContext: SessionValidationResult }> {
    
    const authContext = await this.validateSession();
    
    if (!authContext.valid) {
      return {
        data: null,
        error: {
          message: 'Authentication required',
          details: authContext.error || 'Invalid session',
          hint: 'Please sign in again',
          code: 'AUTH_REQUIRED'
        } as PostgrestError,
        authContext
      };
    }

    try {
      let query = this.client.from(table).select(columns);
      
      // Always filter by user_id for security
      if (authContext.user) {
        query = query.eq('user_id', authContext.user.id);
      }

      // Apply additional filters
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      const result = await query;

      return {
        data: result.data as T[],
        error: result.error,
        authContext
      };

    } catch (error) {
      console.error('EnhancedSupabaseClient: Safe select error:', error);
      
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Query failed',
          details: 'An error occurred while fetching data',
          hint: 'Please try again or contact support',
          code: 'SELECT_ERROR'
        } as PostgrestError,
        authContext
      };
    }
  }

  /**
   * Perform a safe insert with authentication and validation
   */
  public async safeInsert<T = any>(
    table: string,
    data: any
  ): Promise<{ data: T[] | null; error: PostgrestError | null; authContext: SessionValidationResult }> {
    
    const authContext = await this.validateSession();
    
    if (!authContext.valid) {
      return {
        data: null,
        error: {
          message: 'Authentication required',
          details: authContext.error || 'Invalid session',
          hint: 'Please sign in again',
          code: 'AUTH_REQUIRED'
        } as PostgrestError,
        authContext
      };
    }

    try {
      // Ensure user_id is set for security
      const insertData = { ...data, user_id: authContext.user?.id };
      
      const result = await this.client
        .from(table)
        .insert(insertData)
        .select();

      return {
        data: result.data as T[],
        error: result.error,
        authContext
      };

    } catch (error) {
      console.error('EnhancedSupabaseClient: Safe insert error:', error);
      
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Insert failed',
          details: 'An error occurred while creating the record',
          hint: 'Please check your data and try again',
          code: 'INSERT_ERROR'
        } as PostgrestError,
        authContext
      };
    }
  }

  /**
   * Clear session cache
   */
  public clearSessionCache(): void {
    this.sessionCache = null;
    this.sessionCacheExpiry = 0;
  }

  /**
   * Get session cache status
   */
  public getSessionCacheStatus(): { cached: boolean; expiresIn: number; contextIntegrity?: string } {
    const now = Date.now();
    const cached = this.sessionCache !== null && now < this.sessionCacheExpiry;
    
    return {
      cached,
      expiresIn: cached ? this.sessionCacheExpiry - now : 0,
      contextIntegrity: this.sessionCache?.contextIntegrity
    };
  }
}

// Singleton instance
let enhancedClient: EnhancedSupabaseClientImpl | null = null;

/**
 * Get the singleton enhanced Supabase client instance
 */
export function getEnhancedSupabaseClient(): EnhancedSupabaseClientImpl {
  if (!enhancedClient) {
    enhancedClient = new EnhancedSupabaseClientImpl();
  }
  return enhancedClient;
}

/**
 * Create a new enhanced Supabase client instance
 */
export function createEnhancedSupabaseClient(): EnhancedSupabaseClientImpl {
  return new EnhancedSupabaseClientImpl();
}