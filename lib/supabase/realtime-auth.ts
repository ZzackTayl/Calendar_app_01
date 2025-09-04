/**
 * Enhanced Real-time Authentication and Session Management
 * 
 * This module provides bulletproof authentication handling for real-time subscriptions
 * with comprehensive error recovery, token refresh, and session validation.
 */

import { createSupabaseClient } from './client';
import { ensureValidSession, retryTokenRefresh, setupPeriodicTokenValidation } from './token-refresh';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface RealtimeAuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isExpiringSoon: boolean;
  lastRefresh: Date | null;
  retryCount: number;
  error: string | null;
}

export interface RealtimeAuthOptions {
  onAuthStateChange?: (state: RealtimeAuthState) => void;
  onTokenRefresh?: (session: Session | null) => void;
  onAuthError?: (error: string) => void;
  proactiveRefreshMinutes?: number;
  maxRetryAttempts?: number;
}

class RealtimeAuthManager {
  private static instance: RealtimeAuthManager;
  private authState: RealtimeAuthState;
  private supabase = createSupabaseClient();
  private refreshInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(state: RealtimeAuthState) => void> = new Set();
  private options: RealtimeAuthOptions;

  private constructor(options: RealtimeAuthOptions = {}) {
    this.options = {
      proactiveRefreshMinutes: 3,
      maxRetryAttempts: 5,
      ...options
    };
    
    this.authState = {
      user: null,
      session: null,
      isAuthenticated: false,
      isExpiringSoon: false,
      lastRefresh: null,
      retryCount: 0,
      error: null
    };

    this.initializeAuth();
  }

  static getInstance(options?: RealtimeAuthOptions): RealtimeAuthManager {
    if (!RealtimeAuthManager.instance) {
      RealtimeAuthManager.instance = new RealtimeAuthManager(options);
    }
    return RealtimeAuthManager.instance;
  }

  private async initializeAuth() {
    try {
      // Initial session check with validation
      const sessionResult = await ensureValidSession({ silent: true });
      
      if (sessionResult.success && sessionResult.session) {
        this.updateAuthState({
          user: sessionResult.session.user,
          session: sessionResult.session,
          isAuthenticated: true,
          lastRefresh: new Date(),
          retryCount: 0,
          error: null
        });
      } else {
        this.updateAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          error: sessionResult.error || 'No valid session'
        });
      }

      // Setup auth state listener
      this.supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[REALTIME-AUTH] Auth state change:', event);
        
        switch (event) {
          case 'SIGNED_IN':
            this.updateAuthState({
              user: session?.user || null,
              session: session,
              isAuthenticated: !!session,
              lastRefresh: new Date(),
              retryCount: 0,
              error: null
            });
            this.startProactiveRefresh();
            break;
            
          case 'TOKEN_REFRESHED':
            this.updateAuthState({
              user: session?.user || null,
              session: session,
              isAuthenticated: !!session,
              lastRefresh: new Date(),
              retryCount: 0,
              error: null
            });
            if (this.options.onTokenRefresh) {
              this.options.onTokenRefresh(session);
            }
            break;
            
          case 'SIGNED_OUT':
            this.updateAuthState({
              user: null,
              session: null,
              isAuthenticated: false,
              lastRefresh: null,
              retryCount: 0,
              error: null
            });
            this.stopProactiveRefresh();
            break;
            
          default:
            // Handle other events like PASSWORD_RECOVERY, etc.
            break;
        }
      });

      // Start proactive refresh if authenticated
      if (this.authState.isAuthenticated) {
        this.startProactiveRefresh();
      }
      
    } catch (error) {
      console.error('[REALTIME-AUTH] Initialization failed:', error);
      this.updateAuthState({
        error: error instanceof Error ? error.message : 'Auth initialization failed'
      });
    }
  }

  private updateAuthState(updates: Partial<RealtimeAuthState>) {
    const previousState = { ...this.authState };
    this.authState = { ...this.authState, ...updates };
    
    // Check if token is expiring soon
    if (this.authState.session) {
      this.authState.isExpiringSoon = this.isTokenExpiringSoon(this.authState.session);
    }
    
    // Notify listeners of state changes
    this.listeners.forEach(listener => {
      try {
        listener(this.authState);
      } catch (error) {
        console.error('[REALTIME-AUTH] Listener error:', error);
      }
    });
    
    // Notify options callback
    if (this.options.onAuthStateChange) {
      this.options.onAuthStateChange(this.authState);
    }
    
    // Log significant changes
    if (previousState.isAuthenticated !== this.authState.isAuthenticated) {
      console.log('[REALTIME-AUTH] Authentication state changed:', {
        from: previousState.isAuthenticated,
        to: this.authState.isAuthenticated,
        user: this.authState.user?.email
      });
    }
  }

  private isTokenExpiringSoon(session: Session, bufferMinutes: number = 5): boolean {
    if (!session?.access_token) return true;
    
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const bufferTime = bufferMinutes * 60 * 1000;
      
      return (expirationTime - currentTime) < bufferTime;
    } catch (error) {
      console.warn('[REALTIME-AUTH] Could not decode token:', error);
      return true;
    }
  }

  private startProactiveRefresh() {
    this.stopProactiveRefresh();
    
    const intervalMs = (this.options.proactiveRefreshMinutes || 3) * 60 * 1000;
    
    this.refreshInterval = setInterval(async () => {
      if (this.authState.isAuthenticated && this.authState.session) {
        const isExpiring = this.isTokenExpiringSoon(this.authState.session, 7); // Longer buffer for proactive refresh
        
        if (isExpiring) {
          console.log('[REALTIME-AUTH] Token expiring soon, refreshing proactively...');
          await this.refreshToken();
        }
      }
    }, intervalMs);
    
    console.log(`[REALTIME-AUTH] Started proactive token refresh (${this.options.proactiveRefreshMinutes}min intervals)`);
  }

  private stopProactiveRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('[REALTIME-AUTH] Stopped proactive token refresh');
    }
  }

  async refreshToken(): Promise<{ success: boolean; error?: string }> {
    if (this.authState.retryCount >= (this.options.maxRetryAttempts || 5)) {
      const error = 'Max retry attempts exceeded for token refresh';
      this.updateAuthState({ error });
      if (this.options.onAuthError) {
        this.options.onAuthError(error);
      }
      return { success: false, error };
    }

    try {
      this.updateAuthState({ retryCount: this.authState.retryCount + 1 });
      
      const result = await retryTokenRefresh(async () => {
        return await ensureValidSession({ silent: false });
      }, { maxRetries: 3, retryDelay: 1000 });
      
      if (result.success && result.session) {
        this.updateAuthState({
          user: result.session.user,
          session: result.session,
          isAuthenticated: true,
          lastRefresh: new Date(),
          retryCount: 0,
          error: null
        });
        
        console.log('[REALTIME-AUTH] Token refreshed successfully');
        return { success: true };
      } else {
        const error = result.error || 'Token refresh failed';
        this.updateAuthState({ error });
        if (this.options.onAuthError) {
          this.options.onAuthError(error);
        }
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown token refresh error';
      this.updateAuthState({ error: errorMsg });
      if (this.options.onAuthError) {
        this.options.onAuthError(errorMsg);
      }
      return { success: false, error: errorMsg };
    }
  }

  async validateSession(): Promise<{ valid: boolean; session: Session | null; error?: string }> {
    try {
      const result = await ensureValidSession({ silent: true });
      
      if (result.success && result.session) {
        // Update state if we got a new session
        if (result.session !== this.authState.session) {
          this.updateAuthState({
            user: result.session.user,
            session: result.session,
            isAuthenticated: true,
            lastRefresh: new Date(),
            error: null
          });
        }
        
        return { valid: true, session: result.session };
      } else {
        return { valid: false, session: null, error: result.error };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Session validation failed';
      return { valid: false, session: null, error: errorMsg };
    }
  }

  addAuthStateListener(listener: (state: RealtimeAuthState) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    try {
      listener(this.authState);
    } catch (error) {
      console.error('[REALTIME-AUTH] Listener error on add:', error);
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  getAuthState(): RealtimeAuthState {
    return { ...this.authState };
  }

  isReady(): boolean {
    return this.authState.isAuthenticated && !!this.authState.session && !this.authState.error;
  }

  getUserId(): string | null {
    return this.authState.user?.id || null;
  }

  getSession(): Session | null {
    return this.authState.session;
  }

  destroy() {
    this.stopProactiveRefresh();
    this.listeners.clear();
    RealtimeAuthManager.instance = null as any;
  }
}

// Export singleton instance
export const realtimeAuth = RealtimeAuthManager.getInstance();

// Utility functions for easy access
export async function ensureRealtimeAuth(): Promise<{ success: boolean; session: Session | null; error?: string }> {
  const result = await realtimeAuth.validateSession();
  return {
    success: result.valid,
    session: result.session,
    error: result.error
  };
}

export function isRealtimeAuthReady(): boolean {
  return realtimeAuth.isReady();
}

export function getRealtimeUserId(): string | null {
  return realtimeAuth.getUserId();
}

export function getRealtimeSession(): Session | null {
  return realtimeAuth.getSession();
}

export function onRealtimeAuthChange(callback: (state: RealtimeAuthState) => void): () => void {
  return realtimeAuth.addAuthStateListener(callback);
}
