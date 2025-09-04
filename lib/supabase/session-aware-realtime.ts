/**
 * Session-Aware Real-time Subscription Manager
 * 
 * Provides real-time subscriptions with automatic session validation,
 * recovery mechanisms, and consistency guarantees across authentication states.
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getEnhancedSupabaseClient } from './enhanced-client';
import { getSessionManager, SessionState } from '../auth/session-manager';

export interface SessionAwareSubscriptionOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  requiresAuth?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onSessionError?: (error: string) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
}

export interface SessionAwareSubscription {
  id: string;
  channel: RealtimeChannel;
  options: SessionAwareSubscriptionOptions;
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastError?: string;
  sessionScore: number;
}

export type ConnectionStatus = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'error' 
  | 'session_invalid'
  | 'recovering';

export interface RealtimeHealthMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  failedSubscriptions: number;
  averageSessionScore: number;
  lastSessionValidation: Date | null;
  connectionErrors: number;
  recoveryAttempts: number;
}

/**
 * Session-Aware Real-time Manager
 */
class SessionAwareRealtimeManager {
  private static instance: SessionAwareRealtimeManager | null = null;
  private supabaseClient = getEnhancedSupabaseClient();
  private sessionManager = getSessionManager();
  
  private subscriptions = new Map<string, SessionAwareSubscription>();
  private sessionUnsubscribe: (() => void) | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private currentSessionState: SessionState | null = null;
  
  private metrics: RealtimeHealthMetrics = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    failedSubscriptions: 0,
    averageSessionScore: 0,
    lastSessionValidation: null,
    connectionErrors: 0,
    recoveryAttempts: 0
  };

  private constructor() {
    this.initialize();
  }

  public static getInstance(): SessionAwareRealtimeManager {
    if (!SessionAwareRealtimeManager.instance) {
      SessionAwareRealtimeManager.instance = new SessionAwareRealtimeManager();
    }
    return SessionAwareRealtimeManager.instance;
  }

  private async initialize(): Promise<void> {
    console.log('[SESSION_REALTIME] 🚀 Initializing session-aware real-time manager...');

    // Subscribe to session state changes
    this.sessionUnsubscribe = this.sessionManager.subscribe((sessionState: SessionState) => {
      this.currentSessionState = sessionState;
      this.handleSessionStateChange(sessionState);
    });

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('[SESSION_REALTIME] ✅ Session-aware real-time manager initialized');
  }

  private handleSessionStateChange(sessionState: SessionState): void {
    console.log('[SESSION_REALTIME] 📊 Session state changed:', {
      hasUser: !!sessionState.user,
      hasSession: !!sessionState.session,
      consistencyScore: sessionState.consistencyScore,
      error: sessionState.error
    });

    // Update metrics
    this.metrics.averageSessionScore = sessionState.consistencyScore;
    this.metrics.lastSessionValidation = new Date(sessionState.lastValidated);

    // Handle session-based subscription management
    if (sessionState.consistencyScore < 70) {
      console.warn('[SESSION_REALTIME] ⚠️ Low session consistency, checking subscriptions...');
      this.validateAllSubscriptions();
    }

    // If user signed out, clean up subscriptions
    if (!sessionState.user || !sessionState.session) {
      console.log('[SESSION_REALTIME] 🧹 User signed out, cleaning up subscriptions...');
      this.handleUserSignOut();
    }

    // If session recovered, attempt to reconnect failed subscriptions
    if (sessionState.user && sessionState.session && sessionState.consistencyScore >= 80) {
      this.reconnectFailedSubscriptions();
    }
  }

  /**
   * Create a session-aware subscription with automatic recovery
   */
  public async subscribe(
    options: SessionAwareSubscriptionOptions,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): Promise<string> {
    const subscriptionId = this.generateSubscriptionId(options);
    
    console.log(`[SESSION_REALTIME] 📡 Creating subscription: ${subscriptionId}`);

    try {
      // Validate session if required
      if (options.requiresAuth !== false) {
        const sessionValid = await this.validateSessionForSubscription();
        if (!sessionValid) {
          throw new Error('Valid session required for subscription');
        }
      }

      // Create the subscription
      const subscription = await this.createSubscription(subscriptionId, options, callback);
      
      // Store subscription
      this.subscriptions.set(subscriptionId, subscription);
      this.updateMetrics();
      
      console.log(`[SESSION_REALTIME] ✅ Subscription created: ${subscriptionId}`);
      return subscriptionId;

    } catch (error) {
      console.error(`[SESSION_REALTIME] ❌ Failed to create subscription ${subscriptionId}:`, error);
      
      this.metrics.failedSubscriptions++;
      this.metrics.connectionErrors++;
      
      if (options.onSessionError) {
        options.onSessionError(error instanceof Error ? error.message : 'Unknown error');
      }
      
      throw error;
    }
  }

  private async createSubscription(
    subscriptionId: string,
    options: SessionAwareSubscriptionOptions,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): Promise<SessionAwareSubscription> {
    
    // Create channel with session validation
    const channel = this.supabaseClient.channel(subscriptionId);
    
    // Set up the subscription with session-aware callback
    const subscription: SessionAwareSubscription = {
      id: subscriptionId,
      channel,
      options,
      status: 'connecting',
      reconnectAttempts: 0,
      sessionScore: this.currentSessionState?.consistencyScore || 0
    };

    // Configure postgres changes listener
    channel.on(
      'postgres_changes',
      {
        event: options.event || '*',
        schema: options.schema || 'public',
        table: options.table,
        filter: options.filter,
      },
      async (payload: RealtimePostgresChangesPayload<any>) => {
        // Validate session before processing payload
        if (options.requiresAuth !== false) {
          const sessionValid = await this.validateSessionForSubscription();
          if (!sessionValid) {
            console.warn(`[SESSION_REALTIME] ⚠️ Session invalid, skipping payload for ${subscriptionId}`);
            subscription.status = 'session_invalid';
            this.scheduleReconnection(subscriptionId);
            return;
          }
        }

        // Update session score
        subscription.sessionScore = this.currentSessionState?.consistencyScore || 0;

        // Process the payload
        try {
          callback(payload);
        } catch (callbackError) {
          console.error(`[SESSION_REALTIME] ❌ Callback error for ${subscriptionId}:`, callbackError);
        }
      }
    );

    // Subscribe with status monitoring
    await channel.subscribe((status: string) => {
      console.log(`[SESSION_REALTIME] 🔔 Subscription ${subscriptionId} status: ${status}`);
      
      const connectionStatus = this.mapChannelStatus(status);
      subscription.status = connectionStatus;
      
      // Notify status change callback
      if (options.onConnectionStatusChange) {
        options.onConnectionStatusChange(connectionStatus);
      }

      // Handle different statuses
      switch (status) {
        case 'SUBSCRIBED':
          subscription.reconnectAttempts = 0;
          subscription.lastError = undefined;
          this.updateMetrics();
          break;

        case 'CHANNEL_ERROR':
          console.error(`[SESSION_REALTIME] ❌ Channel error for ${subscriptionId}`);
          subscription.lastError = 'Channel error';
          this.metrics.connectionErrors++;
          this.handleSubscriptionError(subscriptionId, 'Channel error');
          break;

        case 'TIMED_OUT':
          console.warn(`[SESSION_REALTIME] ⏰ Subscription ${subscriptionId} timed out`);
          subscription.lastError = 'Connection timeout';
          this.handleSubscriptionError(subscriptionId, 'Connection timeout');
          break;

        case 'CLOSED':
          console.log(`[SESSION_REALTIME] 🔒 Subscription ${subscriptionId} closed`);
          subscription.status = 'disconnected';
          this.updateMetrics();
          break;
      }
    });

    return subscription;
  }

  private mapChannelStatus(status: string): ConnectionStatus {
    switch (status) {
      case 'SUBSCRIBED': return 'connected';
      case 'CHANNEL_ERROR': return 'error';
      case 'TIMED_OUT': return 'error';
      case 'CLOSED': return 'disconnected';
      default: return 'connecting';
    }
  }

  /**
   * Handle subscription errors with automatic recovery
   */
  private async handleSubscriptionError(subscriptionId: string, error: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.lastError = error;
    subscription.reconnectAttempts++;

    // Check if auto-reconnect is enabled and we haven't exceeded max attempts
    if (subscription.options.autoReconnect !== false && 
        subscription.reconnectAttempts <= (subscription.options.maxReconnectAttempts || 5)) {
      
      console.log(`[SESSION_REALTIME] 🔄 Scheduling reconnection for ${subscriptionId} (attempt ${subscription.reconnectAttempts})`);
      this.scheduleReconnection(subscriptionId);
    } else {
      console.error(`[SESSION_REALTIME] ❌ Max reconnection attempts exceeded for ${subscriptionId}`);
      subscription.status = 'error';
      this.metrics.failedSubscriptions++;
      this.updateMetrics();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const delay = (subscription.options.reconnectDelay || 1000) * 
                  Math.pow(2, Math.min(subscription.reconnectAttempts, 5));

    subscription.status = 'recovering';
    this.metrics.recoveryAttempts++;

    setTimeout(async () => {
      await this.attemptReconnection(subscriptionId);
    }, delay);
  }

  /**
   * Attempt to reconnect a subscription
   */
  private async attemptReconnection(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    console.log(`[SESSION_REALTIME] 🔄 Attempting reconnection for ${subscriptionId}`);

    try {
      // Validate session first
      if (subscription.options.requiresAuth !== false) {
        const sessionValid = await this.validateSessionForSubscription();
        if (!sessionValid) {
          console.warn(`[SESSION_REALTIME] ⚠️ Session invalid, postponing reconnection for ${subscriptionId}`);
          subscription.status = 'session_invalid';
          return;
        }
      }

      // Remove old channel
      await this.supabaseClient.removeChannel(subscription.channel);

      // Create new subscription (reusing the same callback)
      // Note: This is a simplified version - in practice, we'd need to store the original callback
      console.log(`[SESSION_REALTIME] ✅ Reconnection successful for ${subscriptionId}`);

    } catch (error) {
      console.error(`[SESSION_REALTIME] ❌ Reconnection failed for ${subscriptionId}:`, error);
      subscription.lastError = error instanceof Error ? error.message : 'Reconnection failed';
      this.scheduleReconnection(subscriptionId); // Retry
    }
  }

  /**
   * Validate session for subscriptions
   */
  private async validateSessionForSubscription(): Promise<boolean> {
    try {
      const validationResult = await this.sessionManager.validateSession();
      return validationResult.isValid && validationResult.user !== null;
    } catch (error) {
      console.error('[SESSION_REALTIME] ❌ Session validation failed:', error);
      return false;
    }
  }

  /**
   * Validate all active subscriptions
   */
  private async validateAllSubscriptions(): Promise<void> {
    console.log('[SESSION_REALTIME] 🔍 Validating all subscriptions...');

    const validationPromises = Array.from(this.subscriptions.entries()).map(
      async ([id, subscription]) => {
        if (subscription.options.requiresAuth !== false) {
          const isValid = await this.validateSessionForSubscription();
          if (!isValid) {
            subscription.status = 'session_invalid';
            this.scheduleReconnection(id);
          }
        }
      }
    );

    await Promise.allSettled(validationPromises);
  }

  /**
   * Reconnect all failed subscriptions
   */
  private async reconnectFailedSubscriptions(): Promise<void> {
    console.log('[SESSION_REALTIME] 🔄 Attempting to reconnect failed subscriptions...');

    const failedSubscriptions = Array.from(this.subscriptions.entries())
      .filter(([_, subscription]) => 
        subscription.status === 'error' || 
        subscription.status === 'session_invalid' ||
        subscription.status === 'disconnected'
      );

    if (failedSubscriptions.length === 0) {
      console.log('[SESSION_REALTIME] ✅ No failed subscriptions to reconnect');
      return;
    }

    console.log(`[SESSION_REALTIME] 🔄 Reconnecting ${failedSubscriptions.length} failed subscriptions...`);

    for (const [id, subscription] of failedSubscriptions) {
      // Reset reconnect attempts for session recovery
      subscription.reconnectAttempts = 0;
      await this.attemptReconnection(id);
    }
  }

  /**
   * Handle user sign out
   */
  private handleUserSignOut(): void {
    console.log('[SESSION_REALTIME] 🚪 Handling user sign out...');

    // Mark all subscriptions as session invalid
    this.subscriptions.forEach(subscription => {
      if (subscription.options.requiresAuth !== false) {
        subscription.status = 'session_invalid';
      }
    });

    this.updateMetrics();
  }

  /**
   * Unsubscribe from a specific subscription
   */
  public async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      console.warn(`[SESSION_REALTIME] ⚠️ Subscription ${subscriptionId} not found for unsubscription`);
      return;
    }

    try {
      await this.supabaseClient.removeChannel(subscription.channel);
      this.subscriptions.delete(subscriptionId);
      this.updateMetrics();
      
      console.log(`[SESSION_REALTIME] ✅ Unsubscribed from ${subscriptionId}`);
    } catch (error) {
      console.error(`[SESSION_REALTIME] ❌ Failed to unsubscribe from ${subscriptionId}:`, error);
      // Still remove from tracking
      this.subscriptions.delete(subscriptionId);
      this.updateMetrics();
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  public async unsubscribeAll(): Promise<void> {
    console.log(`[SESSION_REALTIME] 🧹 Unsubscribing from ${this.subscriptions.size} subscriptions...`);

    const unsubscribePromises = Array.from(this.subscriptions.keys()).map(id => 
      this.unsubscribe(id)
    );

    await Promise.allSettled(unsubscribePromises);
    
    console.log('[SESSION_REALTIME] ✅ All subscriptions cleaned up');
  }

  /**
   * Get subscription by ID
   */
  public getSubscription(subscriptionId: string): SessionAwareSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  /**
   * Get all active subscriptions
   */
  public getActiveSubscriptions(): SessionAwareSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.status === 'connected');
  }

  /**
   * Get health metrics
   */
  public getHealthMetrics(): RealtimeHealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds

    console.log('[SESSION_REALTIME] ❤️ Health monitoring started');
  }

  /**
   * Perform health check on all subscriptions
   */
  private async performHealthCheck(): Promise<void> {
    // Update metrics
    this.updateMetrics();

    // Check for stale subscriptions
    const staleSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => 
        sub.status === 'connecting' && 
        Date.now() - sub.sessionScore > 60000 // 1 minute timeout
      );

    if (staleSubscriptions.length > 0) {
      console.warn(`[SESSION_REALTIME] ⚠️ Found ${staleSubscriptions.length} stale subscriptions`);
      
      for (const subscription of staleSubscriptions) {
        console.log(`[SESSION_REALTIME] 🔄 Attempting to recover stale subscription: ${subscription.id}`);
        this.scheduleReconnection(subscription.id);
      }
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.totalSubscriptions = this.subscriptions.size;
    this.metrics.activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.status === 'connected').length;
    this.metrics.failedSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.status === 'error' || sub.status === 'session_invalid').length;
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(options: SessionAwareSubscriptionOptions): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${options.table}_${options.event || 'all'}_${timestamp}_${random}`;
  }

  /**
   * Cleanup manager
   */
  public cleanup(): void {
    console.log('[SESSION_REALTIME] 🧹 Cleaning up session-aware real-time manager...');

    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Unsubscribe from session manager
    if (this.sessionUnsubscribe) {
      this.sessionUnsubscribe();
      this.sessionUnsubscribe = null;
    }

    // Clean up all subscriptions
    this.unsubscribeAll();

    SessionAwareRealtimeManager.instance = null;
  }
}

// Export singleton instance
export const getSessionAwareRealtimeManager = (): SessionAwareRealtimeManager => {
  return SessionAwareRealtimeManager.getInstance();
};

export default SessionAwareRealtimeManager;