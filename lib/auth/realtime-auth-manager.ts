/**
 * Enhanced Real-time Subscription Manager with Authentication Context Handling
 * 
 * This module manages real-time subscriptions and handles authentication
 * state changes gracefully to prevent context dissociation.
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { User, RealtimeChannel, REALTIME_LISTEN_TYPES } from '@supabase/supabase-js';

export interface SubscriptionConfig {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
  errorCallback?: (error: any) => void;
}

export interface AuthAwareSubscription {
  id: string;
  config: SubscriptionConfig;
  channel: RealtimeChannel | null;
  userId: string;
  isActive: boolean;
  lastError?: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

class RealtimeAuthManager {
  private subscriptions = new Map<string, AuthAwareSubscription>();
  private currentUser: User | null = null;
  private supabase = createSupabaseClient();
  private authStateListener: any = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the manager and set up auth state monitoring
   */
  private async initialize() {
    if (this.isInitialized) return;
    
    console.log('RealtimeAuthManager: Initializing...');
    
    try {
      // Get current user
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.warn('RealtimeAuthManager: Error getting initial user:', error.message);
      } else {
        this.currentUser = user;
        console.log('RealtimeAuthManager: Initial user set:', user?.id);
      }
      
      // Set up auth state change listener
      this.authStateListener = this.supabase.auth.onAuthStateChange(
        async (event: any, session: any) => {
          console.log('RealtimeAuthManager: Auth state change:', event, {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id
          });
          
          await this.handleAuthStateChange(event, session?.user || null);
        }
      );
      
      this.isInitialized = true;
      console.log('RealtimeAuthManager: Initialized successfully');
      
    } catch (error) {
      console.error('RealtimeAuthManager: Initialization error:', error);
    }
  }

  /**
   * Handle authentication state changes
   */
  private async handleAuthStateChange(event: string, user: User | null) {
    const previousUserId = this.currentUser?.id;
    const newUserId = user?.id;
    
    console.log('RealtimeAuthManager: Handling auth state change', {
      event,
      previousUserId,
      newUserId,
      activeSubscriptions: this.subscriptions.size
    });
    
    // Update current user
    this.currentUser = user;
    
    // Handle different auth events
    switch (event) {
      case 'SIGNED_OUT':
        await this.handleSignOut();
        break;
        
      case 'SIGNED_IN':
        await this.handleSignIn(user);
        break;
        
      case 'TOKEN_REFRESHED':
        await this.handleTokenRefresh(user);
        break;
        
      case 'USER_UPDATED':
        await this.handleUserUpdate(user);
        break;
        
      default:
        console.log('RealtimeAuthManager: Unhandled auth event:', event);
    }
    
    // If user changed, reconnect all subscriptions
    if (previousUserId !== newUserId) {
      await this.reconnectAllSubscriptions();
    }
  }

  /**
   * Handle user sign out
   */
  private async handleSignOut() {
    console.log('RealtimeAuthManager: Handling sign out');
    
    // Disconnect all subscriptions
    for (const [id, subscription] of this.subscriptions) {
      await this.disconnectSubscription(id);
    }
    
    // Clear subscriptions
    this.subscriptions.clear();
    
    console.log('RealtimeAuthManager: All subscriptions cleared on sign out');
  }

  /**
   * Handle user sign in
   */
  private async handleSignIn(user: User | null) {
    if (!user) return;
    
    console.log('RealtimeAuthManager: Handling sign in for user:', user.id);
    
    // Reconnect any existing subscriptions for this user
    await this.reconnectAllSubscriptions();
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(user: User | null) {
    if (!user) return;
    
    console.log('RealtimeAuthManager: Handling token refresh for user:', user.id);
    
    // Check if any subscriptions are disconnected and reconnect them
    const disconnectedSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => !sub.isActive);
    
    if (disconnectedSubscriptions.length > 0) {
      console.log(`RealtimeAuthManager: Reconnecting ${disconnectedSubscriptions.length} disconnected subscriptions`);
      
      for (const subscription of disconnectedSubscriptions) {
        await this.reconnectSubscription(subscription.id);
      }
    }
  }

  /**
   * Handle user update
   */
  private async handleUserUpdate(user: User | null) {
    if (!user) return;
    
    console.log('RealtimeAuthManager: Handling user update for user:', user.id);
    
    // Validate all subscriptions are still working
    await this.validateAllSubscriptions();
  }

  /**
   * Create a new authenticated subscription
   */
  public async subscribe(config: SubscriptionConfig): Promise<string> {
    if (!this.currentUser) {
      throw new Error('Cannot create subscription: User not authenticated');
    }
    
    const subscriptionId = Math.random().toString(36).substring(2, 15);
    
    console.log('RealtimeAuthManager: Creating subscription:', {
      id: subscriptionId,
      table: config.table,
      filter: config.filter,
      userId: this.currentUser.id
    });
    
    const subscription: AuthAwareSubscription = {
      id: subscriptionId,
      config,
      channel: null,
      userId: this.currentUser.id,
      isActive: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // Establish the connection
    await this.connectSubscription(subscriptionId);
    
    return subscriptionId;
  }

  /**
   * Connect a subscription
   */
  private async connectSubscription(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      console.error('RealtimeAuthManager: Subscription not found:', subscriptionId);
      return false;
    }
    
    if (!this.currentUser) {
      console.warn('RealtimeAuthManager: Cannot connect subscription - no authenticated user');
      return false;
    }
    
    try {
      console.log('RealtimeAuthManager: Connecting subscription:', subscriptionId);
      
      // Create channel with user-specific filter
      const channelName = `${subscription.config.table}_${this.currentUser.id}`;
      const channel = this.supabase.channel(channelName);
      
      // Set up the subscription with authentication context
      const listenConfig: any = {
        event: subscription.config.event || '*',
        schema: 'public',
        table: subscription.config.table
      };
      
      // Add filter if provided
      if (subscription.config.filter) {
        listenConfig.filter = subscription.config.filter;
      } else {
        // Default filter to user's own data
        listenConfig.filter = `user_id=eq.${this.currentUser.id}`;
      }
      
      channel.on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        listenConfig,
        (payload: any) => {
          console.log('RealtimeAuthManager: Received payload for subscription:', subscriptionId, payload);
          
          // Validate the payload belongs to the current user
          if (this.validatePayloadAuth(payload, this.currentUser?.id)) {
            subscription.config.callback(payload);
          } else {
            console.warn('RealtimeAuthManager: Payload validation failed for subscription:', subscriptionId);
          }
        }
      );
      
      // Handle subscription errors
      channel.on('error', (error: any) => {
        console.error('RealtimeAuthManager: Subscription error:', subscriptionId, error);
        subscription.lastError = error.message;
        subscription.isActive = false;
        
        if (subscription.config.errorCallback) {
          subscription.config.errorCallback(error);
        }
        
        // Attempt reconnection
        this.scheduleReconnection(subscriptionId);
      });
      
      // Subscribe to the channel
      const status = await channel.subscribe((status: any) => {
        console.log('RealtimeAuthManager: Subscription status:', subscriptionId, status);
        
        if (status === 'SUBSCRIBED') {
          subscription.isActive = true;
          subscription.reconnectAttempts = 0;
          console.log('RealtimeAuthManager: Subscription active:', subscriptionId);
        } else if (status === 'CHANNEL_ERROR') {
          subscription.isActive = false;
          this.scheduleReconnection(subscriptionId);
        }
      });
      
      subscription.channel = channel;
      
      return true;
      
    } catch (error) {
      console.error('RealtimeAuthManager: Error connecting subscription:', subscriptionId, error);
      subscription.lastError = error instanceof Error ? error.message : 'Unknown error';
      subscription.isActive = false;
      
      return false;
    }
  }

  /**
   * Validate payload authentication
   */
  private validatePayloadAuth(payload: any, userId?: string): boolean {
    if (!userId) return false;
    
    // Check if payload contains user_id and matches current user
    const payloadUserId = payload.new?.user_id || payload.old?.user_id;
    
    if (payloadUserId && payloadUserId !== userId) {
      console.warn('RealtimeAuthManager: Payload user_id mismatch:', {
        payloadUserId,
        currentUserId: userId
      });
      return false;
    }
    
    return true;
  }

  /**
   * Disconnect a subscription
   */
  private async disconnectSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) return;
    
    console.log('RealtimeAuthManager: Disconnecting subscription:', subscriptionId);
    
    if (subscription.channel) {
      await subscription.channel.unsubscribe();
      subscription.channel = null;
    }
    
    subscription.isActive = false;
  }

  /**
   * Reconnect a subscription
   */
  private async reconnectSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) return;
    
    if (subscription.reconnectAttempts >= subscription.maxReconnectAttempts) {
      console.error('RealtimeAuthManager: Max reconnection attempts reached for subscription:', subscriptionId);
      return;
    }
    
    subscription.reconnectAttempts++;
    
    console.log('RealtimeAuthManager: Reconnecting subscription:', subscriptionId, 
      `(attempt ${subscription.reconnectAttempts}/${subscription.maxReconnectAttempts})`);
    
    // Disconnect first
    await this.disconnectSubscription(subscriptionId);
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000 * subscription.reconnectAttempts));
    
    // Reconnect
    await this.connectSubscription(subscriptionId);
  }

  /**
   * Schedule reconnection for a subscription
   */
  private scheduleReconnection(subscriptionId: string): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectSubscription(subscriptionId);
    }, 5000); // Wait 5 seconds before reconnecting
  }

  /**
   * Reconnect all subscriptions
   */
  private async reconnectAllSubscriptions(): Promise<void> {
    console.log('RealtimeAuthManager: Reconnecting all subscriptions');
    
    const reconnectPromises = Array.from(this.subscriptions.keys()).map(id => 
      this.reconnectSubscription(id)
    );
    
    await Promise.all(reconnectPromises);
  }

  /**
   * Validate all subscriptions are working
   */
  private async validateAllSubscriptions(): Promise<void> {
    console.log('RealtimeAuthManager: Validating all subscriptions');
    
    for (const [id, subscription] of this.subscriptions) {
      if (!subscription.isActive) {
        console.log('RealtimeAuthManager: Found inactive subscription, reconnecting:', id);
        await this.reconnectSubscription(id);
      }
    }
  }

  /**
   * Unsubscribe from a subscription
   */
  public async unsubscribe(subscriptionId: string): Promise<void> {
    console.log('RealtimeAuthManager: Unsubscribing:', subscriptionId);
    
    await this.disconnectSubscription(subscriptionId);
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get subscription status
   */
  public getSubscriptionStatus(subscriptionId: string): AuthAwareSubscription | null {
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Get all subscription statuses
   */
  public getAllSubscriptionStatuses(): AuthAwareSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Cleanup all subscriptions and listeners
   */
  public async cleanup(): Promise<void> {
    console.log('RealtimeAuthManager: Cleaning up...');
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Disconnect all subscriptions
    for (const id of this.subscriptions.keys()) {
      await this.disconnectSubscription(id);
    }
    
    // Clear subscriptions
    this.subscriptions.clear();
    
    // Remove auth state listener
    if (this.authStateListener) {
      this.authStateListener.data.subscription.unsubscribe();
      this.authStateListener = null;
    }
    
    this.isInitialized = false;
    console.log('RealtimeAuthManager: Cleanup completed');
  }
}

// Export singleton instance
export const realtimeAuthManager = new RealtimeAuthManager();

// Types and interfaces are exported above