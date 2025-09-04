/**
 * Comprehensive Session Consistency Manager
 * 
 * Provides bulletproof session management across the entire application
 * with automatic recovery, consistency validation, and state synchronization.
 */

import { User, Session, AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseClient } from '../supabase/client';
import { createServerComponentClient } from '../supabase/server';

export interface SessionState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  lastValidated: number;
  consistencyScore: number; // 0-100 score of session consistency
}

export interface SessionValidationResult {
  isValid: boolean;
  user: User | null;
  session: Session | null;
  issues: string[];
  recommendedAction: 'none' | 'refresh' | 'signin' | 'cleanup';
}

export interface SessionRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  forceRefresh?: boolean;
  clearCache?: boolean;
  validateWithServer?: boolean;
}

export interface SessionConsistencyOptions {
  enableHeartbeat?: boolean;
  heartbeatInterval?: number;
  enableCrossTabSync?: boolean;
  enableServerValidation?: boolean;
  serverValidationInterval?: number;
}

/**
 * Session Manager Class - Singleton pattern for consistency
 */
class SessionManager {
  private static instance: SessionManager | null = null;
  private supabaseClient: SupabaseClient;
  private currentState: SessionState;
  private listeners: Set<(state: SessionState) => void> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private serverValidationInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;
  private isInitialized = false;
  private options: SessionConsistencyOptions;

  private constructor(options: SessionConsistencyOptions = {}) {
    this.options = {
      enableHeartbeat: true,
      heartbeatInterval: 30000, // 30 seconds
      enableCrossTabSync: true,
      enableServerValidation: true,
      serverValidationInterval: 300000, // 5 minutes
      ...options
    };

    this.supabaseClient = createSupabaseClient();
    this.currentState = {
      user: null,
      session: null,
      loading: true,
      error: null,
      lastValidated: 0,
      consistencyScore: 0
    };

    this.initialize();
  }

  public static getInstance(options?: SessionConsistencyOptions): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(options);
    }
    return SessionManager.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[SESSION_MANAGER] Initializing session management system...');

      // Set up auth state change listener
      const { data: { subscription } } = this.supabaseClient.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          this.handleAuthStateChange(event, session);
        }
      );

      // Perform initial session validation
      await this.validateAndUpdateSession();

      // Setup heartbeat monitoring
      if (this.options.enableHeartbeat) {
        this.setupHeartbeat();
      }

      // Setup server validation
      if (this.options.enableServerValidation) {
        this.setupServerValidation();
      }

      // Setup cross-tab synchronization
      if (this.options.enableCrossTabSync && typeof window !== 'undefined') {
        this.setupCrossTabSync();
      }

      this.isInitialized = true;
      console.log('[SESSION_MANAGER] ✅ Session management system initialized');

    } catch (error) {
      console.error('[SESSION_MANAGER] ❌ Failed to initialize session manager:', error);
      this.updateState({
        loading: false,
        error: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        consistencyScore: 0
      });
    }
  }

  /**
   * Comprehensive session validation with multiple consistency checks
   */
  public async validateSession(
    options: SessionRecoveryOptions = {}
  ): Promise<SessionValidationResult> {
    const { validateWithServer = true } = options;
    const issues: string[] = [];
    let isValid = false;
    let user: User | null = null;
    let session: Session | null = null;
    let recommendedAction: SessionValidationResult['recommendedAction'] = 'none';

    try {
      console.log('[SESSION_MANAGER] 🔍 Starting comprehensive session validation...');

      // Step 1: Check current client session
      const { data: clientData, error: clientError } = await this.supabaseClient.auth.getSession();
      
      if (clientError) {
        issues.push(`Client session error: ${clientError.message}`);
        recommendedAction = 'signin';
      } else {
        session = clientData.session;
        user = session?.user || null;
      }

      // Step 2: Validate user object if session exists
      if (session && session.user) {
        const { data: userData, error: userError } = await this.supabaseClient.auth.getUser();
        
        if (userError) {
          issues.push(`User validation failed: ${userError.message}`);
          if (userError.message.includes('JWT expired')) {
            recommendedAction = 'refresh';
          } else if (userError.message.includes('Auth session missing')) {
            recommendedAction = 'signin';
          }
        } else if (!userData.user) {
          issues.push('Session exists but user object is null');
          recommendedAction = 'cleanup';
        } else {
          user = userData.user;
        }
      }

      // Step 3: Check token expiration
      if (session && session.access_token) {
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          const expirationTime = payload.exp * 1000;
          const currentTime = Date.now();
          const timeUntilExpiration = expirationTime - currentTime;
          
          if (timeUntilExpiration <= 0) {
            issues.push('Access token has expired');
            recommendedAction = 'refresh';
          } else if (timeUntilExpiration < 300000) { // 5 minutes
            issues.push('Access token expires soon');
            if (recommendedAction === 'none') recommendedAction = 'refresh';
          }
        } catch (error) {
          issues.push('Unable to decode access token');
          recommendedAction = 'refresh';
        }
      }

      // Step 4: Server-side validation (if enabled)
      if (validateWithServer && session) {
        try {
          const serverClient = createServerComponentClient();
          const { data: serverData, error: serverError } = await serverClient.auth.getUser();
          
          if (serverError) {
            issues.push(`Server validation failed: ${serverError.message}`);
          } else if (serverData.user?.id !== user?.id) {
            issues.push('Client-server user ID mismatch detected');
            recommendedAction = 'refresh';
          }
        } catch (error) {
          issues.push(`Server validation error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }

      // Step 5: Email verification check
      if (user && !user.email_confirmed_at) {
        issues.push('User email is not verified');
        // Don't change recommendedAction as this is handled by middleware
      }

      // Step 6: Demo mode interference check
      if (typeof window !== 'undefined') {
        const demoEnabled = localStorage.getItem('ph_demo_enabled') === '1';
        if (demoEnabled && user && user.id !== 'demo-user') {
          issues.push('Demo mode enabled but real user detected - potential conflict');
          recommendedAction = 'cleanup';
        } else if (!demoEnabled && user?.id === 'demo-user') {
          issues.push('Demo user detected but demo mode disabled');
          recommendedAction = 'cleanup';
        }
      }

      // Determine overall validity
      isValid = issues.length === 0 || 
                (issues.length === 1 && issues[0].includes('email is not verified'));

      console.log(`[SESSION_MANAGER] Session validation complete. Valid: ${isValid}, Issues: ${issues.length}`);
      
      if (issues.length > 0) {
        console.warn('[SESSION_MANAGER] ⚠️ Session validation issues:', issues);
      }

      return {
        isValid,
        user,
        session,
        issues,
        recommendedAction
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      issues.push(`Validation failed: ${errorMessage}`);
      
      return {
        isValid: false,
        user: null,
        session: null,
        issues,
        recommendedAction: 'signin'
      };
    }
  }

  /**
   * Automatic session recovery with exponential backoff
   */
  public async recoverSession(
    options: SessionRecoveryOptions = {}
  ): Promise<SessionValidationResult> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      forceRefresh = false,
      clearCache = false,
      validateWithServer = true
    } = options;

    console.log('[SESSION_MANAGER] 🔄 Starting session recovery process...');

    // Clear cache if requested
    if (clearCache) {
      await this.clearSessionCache();
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SESSION_MANAGER] Recovery attempt ${attempt}/${maxRetries}`);

        // Force refresh if requested or if this is a retry
        if (forceRefresh || attempt > 1) {
          const { data: refreshData, error: refreshError } = await this.supabaseClient.auth.refreshSession();
          
          if (refreshError) {
            console.warn(`[SESSION_MANAGER] Refresh failed on attempt ${attempt}:`, refreshError.message);
            if (attempt === maxRetries) {
              return {
                isValid: false,
                user: null,
                session: null,
                issues: [`Session refresh failed after ${maxRetries} attempts: ${refreshError.message}`],
                recommendedAction: 'signin'
              };
            }
          } else if (refreshData.session) {
            console.log(`[SESSION_MANAGER] ✅ Session refreshed successfully on attempt ${attempt}`);
          }
        }

        // Validate the current session
        const validationResult = await this.validateSession({ validateWithServer });
        
        if (validationResult.isValid) {
          console.log(`[SESSION_MANAGER] ✅ Session recovery successful on attempt ${attempt}`);
          await this.updateState({
            user: validationResult.user,
            session: validationResult.session,
            loading: false,
            error: null,
            lastValidated: Date.now(),
            consistencyScore: this.calculateConsistencyScore(validationResult)
          });
          return validationResult;
        }

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          console.log(`[SESSION_MANAGER] ⏳ Recovery attempt ${attempt} failed, retrying in ${delay}ms...`);
          await this.delay(delay);
        }

      } catch (error) {
        console.error(`[SESSION_MANAGER] Recovery attempt ${attempt} error:`, error);
        if (attempt === maxRetries) {
          return {
            isValid: false,
            user: null,
            session: null,
            issues: [`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
            recommendedAction: 'signin'
          };
        }
      }
    }

    console.error(`[SESSION_MANAGER] ❌ Session recovery failed after ${maxRetries} attempts`);
    return {
      isValid: false,
      user: null,
      session: null,
      issues: [`Session recovery failed after ${maxRetries} attempts`],
      recommendedAction: 'signin'
    };
  }

  /**
   * Handle auth state changes from Supabase
   */
  private async handleAuthStateChange(event: AuthChangeEvent, session: Session | null): Promise<void> {
    console.log(`[SESSION_MANAGER] Auth state change: ${event}`);

    switch (event) {
      case 'SIGNED_IN':
        console.log('[SESSION_MANAGER] ✅ User signed in');
        await this.updateState({
          user: session?.user || null,
          session,
          loading: false,
          error: null,
          lastValidated: Date.now(),
          consistencyScore: session ? 100 : 0
        });
        break;

      case 'SIGNED_OUT':
        console.log('[SESSION_MANAGER] 🚪 User signed out');
        await this.updateState({
          user: null,
          session: null,
          loading: false,
          error: null,
          lastValidated: Date.now(),
          consistencyScore: 0
        });
        await this.clearSessionCache();
        break;

      case 'TOKEN_REFRESHED':
        console.log('[SESSION_MANAGER] 🔄 Token refreshed');
        await this.updateState({
          user: session?.user || null,
          session,
          loading: false,
          error: null,
          lastValidated: Date.now(),
          consistencyScore: session ? 100 : 50
        });
        break;

      case 'USER_UPDATED':
        console.log('[SESSION_MANAGER] 👤 User updated');
        await this.updateState({
          user: session?.user || null,
          session,
          lastValidated: Date.now()
        });
        break;

      case 'PASSWORD_RECOVERY':
        console.log('[SESSION_MANAGER] 🔐 Password recovery initiated');
        break;

      default:
        console.log(`[SESSION_MANAGER] Unhandled auth event: ${event}`);
        // Perform validation for unknown events
        await this.validateAndUpdateSession();
    }
  }

  /**
   * Setup heartbeat monitoring
   */
  private setupHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      this.lastHeartbeat = now;

      // Quick session check without full validation
      try {
        const { data: { session }, error } = await this.supabaseClient.auth.getSession();
        
        if (error) {
          console.warn('[SESSION_MANAGER] ⚠️ Heartbeat detected session issue:', error.message);
          await this.recoverSession({ maxRetries: 1, forceRefresh: true });
        } else {
          // Update consistency score based on session health
          const consistencyScore = this.calculateSessionHealthScore(session);
          if (consistencyScore !== this.currentState.consistencyScore) {
            await this.updateState({ consistencyScore });
          }
        }
      } catch (error) {
        console.error('[SESSION_MANAGER] ❌ Heartbeat error:', error);
      }
    }, this.options.heartbeatInterval);

    console.log(`[SESSION_MANAGER] ❤️ Heartbeat monitoring started (${this.options.heartbeatInterval}ms interval)`);
  }

  /**
   * Setup server validation
   */
  private setupServerValidation(): void {
    if (this.serverValidationInterval) {
      clearInterval(this.serverValidationInterval);
    }

    this.serverValidationInterval = setInterval(async () => {
      console.log('[SESSION_MANAGER] 🔍 Performing periodic server validation...');
      
      const validationResult = await this.validateSession({ validateWithServer: true });
      
      if (!validationResult.isValid && validationResult.recommendedAction === 'refresh') {
        console.log('[SESSION_MANAGER] 🔄 Server validation failed, attempting recovery...');
        await this.recoverSession({ forceRefresh: true, validateWithServer: true });
      }
    }, this.options.serverValidationInterval);

    console.log(`[SESSION_MANAGER] 🔍 Server validation started (${this.options.serverValidationInterval}ms interval)`);
  }

  /**
   * Setup cross-tab synchronization
   */
  private setupCrossTabSync(): void {
    if (typeof window === 'undefined') return;

    // Listen for storage events to sync across tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'supabase.auth.token') {
        console.log('[SESSION_MANAGER] 🔄 Cross-tab session change detected, revalidating...');
        this.validateAndUpdateSession();
      }
    });

    // Broadcast session updates to other tabs
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      originalSetItem.apply(this, [key, value]);
      
      if (key.includes('supabase.auth')) {
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: value,
          url: window.location.href
        }));
      }
    };

    console.log('[SESSION_MANAGER] 🔄 Cross-tab synchronization enabled');
  }

  /**
   * Validate and update current session state
   */
  private async validateAndUpdateSession(): Promise<void> {
    this.updateState({ loading: true });

    const validationResult = await this.validateSession();
    
    await this.updateState({
      user: validationResult.user,
      session: validationResult.session,
      loading: false,
      error: validationResult.issues.length > 0 ? validationResult.issues.join(', ') : null,
      lastValidated: Date.now(),
      consistencyScore: this.calculateConsistencyScore(validationResult)
    });

    // Attempt recovery if needed
    if (!validationResult.isValid && validationResult.recommendedAction === 'refresh') {
      await this.recoverSession({ forceRefresh: true });
    }
  }

  /**
   * Update session state and notify listeners
   */
  private async updateState(partialState: Partial<SessionState>): Promise<void> {
    this.currentState = { ...this.currentState, ...partialState };
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('[SESSION_MANAGER] Listener error:', error);
      }
    });
  }

  /**
   * Calculate consistency score based on validation result
   */
  private calculateConsistencyScore(result: SessionValidationResult): number {
    if (!result.user || !result.session) return 0;
    
    const maxScore = 100;
    const issueWeight = Math.floor(maxScore / Math.max(result.issues.length, 1));
    
    let score = maxScore;
    result.issues.forEach(issue => {
      if (issue.includes('expired')) score -= 30;
      else if (issue.includes('expires soon')) score -= 10;
      else if (issue.includes('email is not verified')) score -= 5;
      else score -= issueWeight;
    });
    
    return Math.max(0, score);
  }

  /**
   * Calculate session health score for heartbeat
   */
  private calculateSessionHealthScore(session: Session | null): number {
    if (!session) return 0;
    
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;
      
      if (timeUntilExpiration <= 0) return 0;
      if (timeUntilExpiration < 300000) return 70; // 5 minutes
      if (timeUntilExpiration < 900000) return 85; // 15 minutes
      return 100;
    } catch {
      return 50;
    }
  }

  /**
   * Clear session cache and storage
   */
  private async clearSessionCache(): Promise<void> {
    console.log('[SESSION_MANAGER] 🧹 Clearing session cache...');
    
    if (typeof window !== 'undefined') {
      // Clear demo mode flags
      localStorage.removeItem('ph_demo_enabled');
      localStorage.removeItem('ph_demo_version');
      
      // Clear any other session-related data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('ph_demo')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods

  public getCurrentState(): SessionState {
    return { ...this.currentState };
  }

  public subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    listener(this.currentState);
    
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  public async signOut(): Promise<void> {
    console.log('[SESSION_MANAGER] 🚪 Initiating sign out...');
    
    this.updateState({ loading: true });
    
    try {
      await this.supabaseClient.auth.signOut();
      await this.clearSessionCache();
      
      this.updateState({
        user: null,
        session: null,
        loading: false,
        error: null,
        lastValidated: Date.now(),
        consistencyScore: 0
      });
    } catch (error) {
      console.error('[SESSION_MANAGER] Sign out error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      });
    }
  }

  public async forceRefresh(): Promise<SessionValidationResult> {
    console.log('[SESSION_MANAGER] 🔄 Force refresh requested...');
    return await this.recoverSession({ forceRefresh: true, clearCache: true });
  }

  public getConsistencyReport(): {
    score: number;
    lastValidated: Date;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    if (this.currentState.consistencyScore < 70) {
      recommendations.push('Consider refreshing the session');
    }
    
    if (Date.now() - this.currentState.lastValidated > 600000) { // 10 minutes
      recommendations.push('Session validation is overdue');
    }
    
    if (this.currentState.error) {
      recommendations.push('Address current session errors');
    }

    return {
      score: this.currentState.consistencyScore,
      lastValidated: new Date(this.currentState.lastValidated),
      recommendations
    };
  }

  public cleanup(): void {
    console.log('[SESSION_MANAGER] 🧹 Cleaning up session manager...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.serverValidationInterval) {
      clearInterval(this.serverValidationInterval);
      this.serverValidationInterval = null;
    }
    
    this.listeners.clear();
    SessionManager.instance = null;
  }
}

// Export singleton instance getter and types
export const getSessionManager = (options?: SessionConsistencyOptions): SessionManager => {
  return SessionManager.getInstance(options);
};

export { SessionManager };
export default SessionManager;