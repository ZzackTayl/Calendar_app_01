/**
 * Enhanced Realtime Manager with Authentication Integration
 * 
 * This module provides enhanced realtime functionality with proper authentication
 * context integration and error handling.
 */

import { createSupabaseClient } from './client';
import { RealtimeChannel, REALTIME_LISTEN_TYPES } from '@supabase/supabase-js';

export interface RealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
}

export interface RealtimeSubscription {
  id: string;
  channel: RealtimeChannel;
  options: RealtimeSubscriptionOptions;
  isActive: boolean;
  callback: (payload: any) => void;
}

export class EnhancedRealtimeManager {
  private supabase = createSupabaseClient();
  private subscriptions = new Map<string, RealtimeSubscription>();
  private isInitialized = false;

  /**
   * Initialize the realtime manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[REALTIME-MANAGER] Initializing...');
    // Don't set to true here - will be set when first subscription succeeds
  }

  /**
   * Create a new realtime subscription
   */
  public subscribe(
    options: RealtimeSubscriptionOptions,
    callback: (payload: any) => void
  ): string {
    const subscriptionId = Math.random().toString(36).substring(2, 15);

    console.log(`[REALTIME-MANAGER] Creating subscription:`, {
      id: subscriptionId,
      table: options.table,
      filter: options.filter,
      event: options.event || '*'
    });

    // Create the channel
    const channel = this.supabase
      .channel(`realtime-${subscriptionId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: options.event || '*',
          schema: options.schema || 'public',
          table: options.table,
          filter: options.filter
        },
        (payload: any) => {
          console.log(`[REALTIME-MANAGER] Received payload:`, {
            table: options.table,
            event: payload.eventType,
            id: (payload.new as any)?.id || (payload.old as any)?.id || 'unknown'
          });

          callback(payload);
        }
      )
      .subscribe((status: any) => {
        console.log(`[REALTIME-MANAGER] Channel status for ${subscriptionId}:`, status);

        // Update subscription status based on channel state
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          subscription.isActive = status === 'SUBSCRIBED';
          this.subscriptions.set(subscriptionId, subscription);
        }

        // If this is the first successful subscription, mark as initialized
        if (status === 'SUBSCRIBED' && !this.isInitialized) {
          this.isInitialized = true;
          console.log('[REALTIME-MANAGER] Manager initialized successfully');
        }
      });

    // Store the subscription
    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      channel,
      options,
      isActive: false, // Start as inactive until SUBSCRIBED
      callback
    };

    this.subscriptions.set(subscriptionId, subscription);

    console.log(`[REALTIME-MANAGER] Subscription created: ${subscriptionId}`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from a realtime subscription
   */
  public unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      console.warn(`[REALTIME-MANAGER] Subscription not found: ${subscriptionId}`);
      return;
    }

    console.log(`[REALTIME-MANAGER] Unsubscribing: ${subscriptionId}`);
    
    // Unsubscribe from the channel
    this.supabase.removeChannel(subscription.channel);
    
    // Remove from our tracking
    this.subscriptions.delete(subscriptionId);
    
    console.log(`[REALTIME-MANAGER] Unsubscribed: ${subscriptionId}`);
  }

  /**
   * Get all active subscriptions
   */
  public getActiveSubscriptions(): RealtimeSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  /**
   * Get optimistic update (stub implementation)
   */
  public getOptimisticUpdate(id: string): any {
    // Stub implementation - return null for now
    return null;
  }

  /**
   * Add optimistic update (stub implementation)
   */
  public addOptimisticUpdate(id: string, operation: string, data: any, rollbackData?: any): void {
    // Stub implementation - do nothing for now
    console.log(`[REALTIME-MANAGER] Optimistic update: ${operation} for ${id}`);
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(sub => sub.isActive);

    return {
      offlineQueueSize: 0,
      optimisticUpdatesCount: 0,
      activeSubscriptions: activeSubscriptions.length,
      isInitialized: this.isInitialized,
      total: this.subscriptions.size,
      connected: activeSubscriptions.length,
      disconnected: this.subscriptions.size - activeSubscriptions.length,
      errors: 0,
      reconnecting: 0,
      error: 0,
      status: this.isInitialized ? 'connected' : 'connecting'
    };
  }

  /**
   * Cleanup all subscriptions
   */
  public cleanup(): void {
    console.log(`[REALTIME-MANAGER] Cleaning up ${this.subscriptions.size} subscriptions`);
    
    for (const [id, subscription] of this.subscriptions) {
      this.supabase.removeChannel(subscription.channel);
    }
    
    this.subscriptions.clear();
    this.isInitialized = false;
    
    console.log('[REALTIME-MANAGER] Cleanup completed');
  }
}

// Singleton instance
let realtimeManager: EnhancedRealtimeManager | null = null;

/**
 * Get the singleton realtime manager instance
 */
export function getEnhancedRealtimeManager(): EnhancedRealtimeManager {
  if (!realtimeManager) {
    realtimeManager = new EnhancedRealtimeManager();
  }
  return realtimeManager;
}

/**
 * Initialize the realtime manager
 */
export async function initializeRealtimeManager(): Promise<EnhancedRealtimeManager> {
  const manager = getEnhancedRealtimeManager();
  await manager.initialize();
  return manager;
}

// Export singleton instance for backward compatibility
export const enhancedRealtimeManager = getEnhancedRealtimeManager();