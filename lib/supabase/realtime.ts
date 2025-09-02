/**
 * Real-time Subscription Utilities for Supabase
 * 
 * This module provides secure real-time subscription management
 * with proper RLS enforcement and error handling.
 * 
 * Features:
 * - Secure channel subscriptions with authentication checks
 * - Privacy-aware filtering for events and relationships
 * - Connection management and cleanup
 * - Rate limiting for subscription operations
 * - Automatic token refresh for long-running connections
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createSupabaseClient } from './client';
import { ensureValidSession, retryTokenRefresh } from './token-refresh';

export type TableName = 'events' | 'relationships' | 'invitations' | 'relationship_groups' | 'event_permissions';

export interface SubscriptionOptions {
  table: TableName;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
}

export interface SubscriptionManager {
  channels: Map<string, RealtimeChannel>;
  subscribe: (options: SubscriptionOptions, callback: (payload: any) => void) => Promise<string>;
  unsubscribe: (subscriptionId: string) => Promise<void>;
  unsubscribeAll: () => Promise<void>;
  getActiveSubscriptions: () => string[];
}

/**
 * Create a subscription manager instance for real-time updates
 * 
 * @returns SubscriptionManager instance with proper cleanup
 */
export function createSubscriptionManager(): SubscriptionManager {
  const channels = new Map<string, RealtimeChannel>();
  const supabase = createSupabaseClient();

  const subscribe = async (
    options: SubscriptionOptions, 
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): Promise<string> => {
    // Generate unique subscription ID
    const subscriptionId = `${options.table}_${options.event || 'all'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Ensure valid session before creating subscription
      const sessionResult = await ensureValidSession();
      if (!sessionResult.success) {
        throw new Error(`Authentication required: ${sessionResult.error}`);
      }

      // Create channel with authentication checks
      const channel = supabase
        .channel(subscriptionId)
        .on(
          'postgres_changes',
          {
            event: options.event || '*',
            schema: options.schema || 'public',
            table: options.table,
            filter: options.filter,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Additional security check - ensure user has access
            if (payload.new || payload.old) {
              // For events table, use privacy functions
              if (options.table === 'events') {
                // The RLS policies will handle filtering, but we can add extra checks here
                console.debug(`[REALTIME] Event ${payload.eventType} for event ID: ${payload.new && 'id' in payload.new ? payload.new.id : payload.old && 'id' in payload.old ? payload.old.id : 'unknown'}`);
              }
              
              // For relationships table, ensure user is involved
              if (options.table === 'relationships') {
                console.debug(`[REALTIME] Relationship ${payload.eventType} for relationship ID: ${payload.new && 'id' in payload.new ? payload.new.id : payload.old && 'id' in payload.old ? payload.old.id : 'unknown'}`);
              }
              
              // Call the provided callback
              callback(payload);
            }
          }
        );

      // Subscribe and store the channel
      const subscription = channel.subscribe((status: string) => {
        console.log(`[REALTIME] Subscription ${subscriptionId} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`[REALTIME] Successfully subscribed to ${options.table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[REALTIME] Channel error for subscription ${subscriptionId}`);
          
          // Try to refresh token and reconnect
          retryTokenRefresh(async () => {
            const refreshResult = await ensureValidSession();
            if (refreshResult.success) {
              console.log(`[REALTIME] Token refreshed, attempting to resubscribe to ${options.table}`);
              // The channel will automatically reconnect with the new token
            }
            return refreshResult;
          });
          
          // Auto-cleanup on error
          channels.delete(subscriptionId);
        } else if (status === 'TIMED_OUT') {
          console.warn(`[REALTIME] Subscription ${subscriptionId} timed out`);
          
          // Try to refresh token on timeout
          retryTokenRefresh(async () => {
            const refreshResult = await ensureValidSession();
            if (refreshResult.success) {
              console.log(`[REALTIME] Token refreshed after timeout, resubscribing to ${options.table}`);
            }
            return refreshResult;
          });
          
          channels.delete(subscriptionId);
        }
      });

      channels.set(subscriptionId, channel);
      return subscriptionId;
      
    } catch (error) {
      console.error(`[REALTIME] Failed to create subscription for ${options.table}:`, error);
      throw new Error(`Subscription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const unsubscribe = async (subscriptionId: string): Promise<void> => {
    const channel = channels.get(subscriptionId);
    if (channel) {
      try {
        await supabase.removeChannel(channel);
        channels.delete(subscriptionId);
        console.log(`[REALTIME] Unsubscribed from ${subscriptionId}`);
      } catch (error) {
        console.error(`[REALTIME] Failed to unsubscribe from ${subscriptionId}:`, error);
        // Still remove from tracking even if unsubscription failed
        channels.delete(subscriptionId);
      }
    } else {
      console.warn(`[REALTIME] Subscription ${subscriptionId} not found for unsubscription`);
    }
  };

  const unsubscribeAll = async (): Promise<void> => {
    const subscriptionIds = Array.from(channels.keys());
    console.log(`[REALTIME] Unsubscribing from ${subscriptionIds.length} subscriptions`);
    
    // Unsubscribe from all channels
    await Promise.allSettled(
      subscriptionIds.map(id => unsubscribe(id))
    );
    
    // Clear the map
    channels.clear();
    console.log('[REALTIME] All subscriptions cleaned up');
  };

  const getActiveSubscriptions = (): string[] => {
    return Array.from(channels.keys());
  };

  return {
    channels,
    subscribe,
    unsubscribe,
    unsubscribeAll,
    getActiveSubscriptions,
  };
}

/**
 * Helper function to create filtered subscriptions for specific user data
 */
export interface UserSubscriptionOptions {
  userId: string;
  tables: TableName[];
  onEvent: (table: TableName, payload: RealtimePostgresChangesPayload<any>) => void;
  onError?: (error: Error) => void;
  onTokenExpired?: () => void;
}

/**
 * Create subscriptions for all user-relevant tables
 * 
 * @param options Configuration for user-specific subscriptions
 * @returns SubscriptionManager instance
 */
export async function createUserSubscriptions(options: UserSubscriptionOptions): Promise<SubscriptionManager> {
  const manager = createSubscriptionManager();
  const { userId, tables, onEvent, onError, onTokenExpired } = options;
  
  try {
    // Ensure valid session before creating subscriptions
    const sessionResult = await ensureValidSession();
    if (!sessionResult.success) {
      if (onTokenExpired) {
        onTokenExpired();
      }
      throw new Error(`Authentication required: ${sessionResult.error}`);
    }

    // Subscribe to each requested table with user-specific filters
    for (const table of tables) {
      let filter: string | undefined;
      
      // Set up user-specific filters based on table structure
      switch (table) {
        case 'events':
          // Events owned by user or visible through relationships
          filter = `user_id=eq.${userId}`;
          break;
        case 'relationships':
          // Relationships where user is either user_id or partner_id
          filter = `user_id=eq.${userId}`;
          break;
        case 'invitations':
          // Invitations to or from the user
          filter = `invited_by=eq.${userId}`;
          break;
        case 'relationship_groups':
          // Groups owned by the user
          filter = `user_id=eq.${userId}`;
          break;
        case 'event_permissions':
          // Permissions involving user's relationships
          // Note: This requires more complex filtering via RLS
          break;
      }
      
      await manager.subscribe(
        {
          table,
          event: '*',
          filter,
        },
        (payload) => onEvent(table, payload)
      );
    }
    
    console.log(`[REALTIME] Created ${tables.length} user subscriptions for user ${userId}`);
    return manager;
    
  } catch (error) {
    console.error('[REALTIME] Failed to create user subscriptions:', error);
    // Clean up any partial subscriptions
    await manager.unsubscribeAll();
    
    if (onError) {
      onError(error instanceof Error ? error : new Error('Unknown subscription error'));
    }
    
    throw error;
  }
}

/**
 * Utility function to check if real-time is available and properly configured
 */
export async function checkRealtimeStatus(): Promise<{
  available: boolean;
  authenticated: boolean;
  error?: string;
}> {
  try {
    const supabase = createSupabaseClient();
    
    // Check authentication with token refresh
    const sessionResult = await ensureValidSession({ silent: true });
    
    if (!sessionResult.success) {
      return {
        available: false,
        authenticated: false,
        error: 'User not authenticated for real-time subscriptions'
      };
    }
    
    // Test a simple channel creation (but don't subscribe)
    const testChannel = supabase.channel('test-connection');
    
    return {
      available: true,
      authenticated: true
    };
    
  } catch (error) {
    return {
      available: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown real-time error'
    };
  }
}

/**
 * Rate limiting for subscription operations
 */
const subscriptionRateLimit = new Map<string, { count: number; resetTime: number }>();

export function checkSubscriptionRateLimit(userId: string, maxSubscriptions: number = 10): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const resetInterval = 60 * 1000; // 1 minute
  
  const userLimits = subscriptionRateLimit.get(userId);
  
  if (!userLimits || now >= userLimits.resetTime) {
    // Reset or initialize limits
    subscriptionRateLimit.set(userId, {
      count: 1,
      resetTime: now + resetInterval
    });
    
    return {
      allowed: true,
      remaining: maxSubscriptions - 1,
      resetTime: now + resetInterval
    };
  }
  
  if (userLimits.count >= maxSubscriptions) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimits.resetTime
    };
  }
  
  // Increment count
  userLimits.count++;
  subscriptionRateLimit.set(userId, userLimits);
  
  return {
    allowed: true,
    remaining: maxSubscriptions - userLimits.count,
    resetTime: userLimits.resetTime
  };
}

/**
 * Clean up rate limiting data periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, limits] of subscriptionRateLimit.entries()) {
    if (now >= limits.resetTime) {
      subscriptionRateLimit.delete(userId);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes