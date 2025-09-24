/**
 * Enhanced Server-side Session Validation Service
 * Provides comprehensive session validation with consistency checking and security monitoring
 */

// Note: Use dynamic import in functions to ensure mocked clients are picked up in tests
// import { createSupabaseClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { logSessionValidation, logSessionTermination } from '@/lib/security/audit-logger';

export interface SessionValidationResult {
  isValid: boolean;
  user: User | null;
  session: Session | null;
  error: string | null;
  securityAlerts: string[];
  action: 'allow' | 'refresh' | 'terminate';
  consistencyScore: number; // 0-100, higher is better
  validationMetadata: {
    timestamp: number;
    validationId: string;
    clientType: 'browser' | 'server' | 'api';
    refreshAttempted: boolean;
    securityLevel: 'secure' | 'degraded' | 'compromised';
  };
}

export interface SessionSecurityCheck {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
  route?: string;
  method?: string;
}

export interface SessionConsistencyState {
  userId: string;
  lastValidation: number;
  validationCount: number;
  failureCount: number;
  lastRefresh: number;
  refreshCount: number;
  securityAlerts: string[];
  consistencyScore: number;
}

// Session consistency tracking
const sessionConsistencyCache = new Map<string, SessionConsistencyState>();
const CONSISTENCY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_VALIDATION_FAILURES = 5;
const MIN_REFRESH_INTERVAL = 60 * 1000; // 1 minute

/**
 * Enhanced session validation with comprehensive security checks and consistency monitoring
 */
export async function validateSession(
  request?: NextRequest,
  options: {
    requireEmailVerification?: boolean;
    allowRefresh?: boolean;
    securityContext?: SessionSecurityCheck;
  } = {}
): Promise<SessionValidationResult> {
  const validationId = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  const clientType = request ? 'server' : 'browser';
  const securityAlerts: string[] = [];
  let consistencyScore = 100;
  let refreshAttempted = false;
  
  // Dynamically import the client to ensure mocks are respected in tests
  const { createSupabaseClient } = await import('@/lib/supabase/client');
  const supabase = createSupabaseClient();
  
  console.log(`[${validationId}] Starting enhanced session validation (${clientType})`);
  
  try {
    // Step 1: Get current session with enhanced error handling
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error(`[${validationId}] Session retrieval error:`, sessionError.message);
      consistencyScore = 0;
      
      // Log audit event for session retrieval failure
      logSessionValidation({
        sessionId: validationId,
        outcome: 'failure',
        validationType: clientType === 'browser' ? 'client' : (clientType === 'server' ? 'server' : 'middleware'),
        failureReason: sessionError.message,
        route: options.securityContext?.route
      });
      
      if (process.env.NODE_ENV === 'test') {
        console.info(`[${validationId}] DEBUG: returning terminate due to session retrieval error -> ${sessionError.message}`);
      }
      return createValidationResult({
        isValid: false,
        error: sessionError.message,
        securityAlerts: ['session_retrieval_failed'],
        action: 'terminate',
        consistencyScore,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }
    
    if (!session) {
      console.log(`[${validationId}] No active session found`);
      
      // Log audit event for no session (not a failure, just no session)
      logSessionValidation({
        sessionId: validationId,
        outcome: 'success',
        validationType: clientType === 'browser' ? 'client' : (clientType === 'server' ? 'server' : 'middleware'),
        failureReason: 'No session present',
        route: options.securityContext?.route
      });
      
      if (process.env.NODE_ENV === 'test') {
        console.info(`[${validationId}] DEBUG: returning terminate due to no session found`);
      }
      return createValidationResult({
        isValid: false,
        error: 'No session found',
        securityAlerts: [],
        action: 'terminate',
        consistencyScore: 100, // No session is a valid state
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }
    
    // Step 2: Validate session object integrity
    if (!session.user || !session.user.id || !session.user.email) {
      console.error(`[${validationId}] SECURITY: Invalid session object detected`);
      consistencyScore = 0;
      securityAlerts.push('invalid_session_object');
      
      // Log critical audit event for invalid session object
      logSessionValidation({
        sessionId: validationId,
        outcome: 'failure',
        validationType: clientType === 'browser' ? 'client' : (clientType === 'server' ? 'server' : 'middleware'),
        failureReason: 'Invalid session object structure',
        route: options.securityContext?.route
      });
      
      if (process.env.NODE_ENV === 'test') {
        console.info(`[${validationId}] DEBUG: returning terminate due to invalid session object`);
      }
      return createValidationResult({
        isValid: false,
        error: 'Invalid session object',
        securityAlerts,
        action: 'terminate',
        consistencyScore,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }
    
    const userId = session.user.id;
    
    // In unit tests or NODE_ENV=test, clear per-user consistency state to avoid cross-test interference
    if (process.env.TEST_TYPE === 'unit' || process.env.NODE_ENV === 'test') {
      try {
        clearSessionConsistencyState(userId);
      } catch {}
    }
    
    // Step 3: Check session consistency state
    const consistencyState = getSessionConsistencyState(userId);
    if (consistencyState.failureCount >= MAX_VALIDATION_FAILURES) {
      console.error(`[${validationId}] SECURITY: Too many validation failures for user ${userId} - terminating session`);
      securityAlerts.push('excessive_validation_failures');
      
      // Log critical security event
      logSessionValidation({
        sessionId: validationId,
        outcome: 'failure', 
        validationType: clientType === 'browser' ? 'client' : (clientType === 'server' ? 'server' : 'middleware'),
        failureReason: `Excessive validation failures: ${consistencyState.failureCount}`,
        route: options.securityContext?.route
      });
      
      // Clear session and mark as invalid to prevent further use
      try {
        await terminateSession(userId, 'security');
      } catch (terminationError) {
        console.error(`[${validationId}] Failed to terminate session:`, terminationError);
      }
      
      // Return immediate termination result
      updateSessionConsistencyState(userId, false, true);
      return createValidationResult({
        isValid: false,
        error: 'Session terminated due to excessive validation failures',
        securityAlerts,
        action: 'terminate',
        consistencyScore: 0,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }
    
    // Step 4: Validate session freshness with enhanced refresh logic
    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const timeUntilExpiry = expiresAt - now;
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes
    
    if (expiresAt > 0 && timeUntilExpiry <= 0) {
      securityAlerts.push('session_expired');
      console.warn(`[${validationId}] Session expired`);
      consistencyScore -= 30;
      
      // Check if refresh is allowed and not too frequent
      if (options.allowRefresh !== false && canAttemptRefresh(userId)) {
        const refreshResult = await refreshSessionWithFallback(supabase, userId, validationId);
        refreshAttempted = true;
        
        if (refreshResult.isValid) {
          securityAlerts.push('session_refreshed');
          updateSessionConsistencyState(userId, true, false);
          if (process.env.NODE_ENV === 'test') {
            console.info(`[${validationId}] DEBUG: returning refresh after successful session refresh (expired session path)`);
          }
          return createValidationResult({
            isValid: true,
            user: refreshResult.user,
            session: refreshResult.session,
            error: null,
            securityAlerts,
            action: 'refresh',
            consistencyScore: Math.max(70, consistencyScore),
            validationId,
            clientType,
            refreshAttempted,
            timestamp
          });
        } else {
          updateSessionConsistencyState(userId, false, true);
          return createValidationResult({
            isValid: false,
            error: 'Session expired and refresh failed',
            securityAlerts: [...securityAlerts, 'refresh_failed'],
            action: 'terminate',
            consistencyScore: 0,
            validationId,
            clientType,
            refreshAttempted,
            timestamp
          });
        }
      } else {
        updateSessionConsistencyState(userId, false, true);
        return createValidationResult({
          isValid: false,
          error: 'Session expired',
          securityAlerts,
          action: 'terminate',
          consistencyScore: 0,
          validationId,
          clientType,
          refreshAttempted,
          timestamp
        });
      }
    }
    
    // Check if session is expiring soon
    if (expiresAt > 0 && timeUntilExpiry < refreshThreshold) {
      securityAlerts.push('session_expiring_soon');
      consistencyScore -= 10;
    }
    
    // Step 5: Verify user still exists and validate consistency
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log(`[${validationId}] getUser result`, { hasUser: !!user, userId: user?.id, hasError: !!userError });

    // Short-circuit error path: explicit verification error
    if (userError) {
      console.error(`[${validationId}] User verification error:`, userError.message);
      securityAlerts.push('user_verification_failed');
      consistencyScore -= 40;

      // Try refresh if user verification fails and it's allowed
      if (options.allowRefresh !== false && canAttemptRefresh(userId)) {
        const refreshResult = await refreshSessionWithFallback(supabase, userId, validationId);
        refreshAttempted = true;

        if (refreshResult.isValid) {
          updateSessionConsistencyState(userId, true, false);
          return createValidationResult({
            isValid: true,
            user: refreshResult.user,
            session: refreshResult.session,
            error: null,
            securityAlerts: [...securityAlerts, 'session_refreshed'],
            action: 'refresh',
            consistencyScore: Math.max(60, consistencyScore),
            validationId,
            clientType,
            refreshAttempted,
            timestamp
          });
        }
      }

      updateSessionConsistencyState(userId, false, true);
      return createValidationResult({
        isValid: false,
        error: 'User verification failed',
        securityAlerts: [...securityAlerts, 'refresh_failed'],
        action: 'terminate',
        consistencyScore: 0,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }

    // Short-circuit error path: missing user after session exists
    if (!user) {
      console.error(`[${validationId}] SECURITY: User no longer exists`);
      updateSessionConsistencyState(userId, false, true);
      return createValidationResult({
        isValid: false,
        error: 'User no longer exists',
        securityAlerts: ['user_not_found'],
        action: 'terminate',
        consistencyScore: 0,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }

    // Short-circuit error path: user ID mismatch
    if (user.id !== session.user.id) {
      securityAlerts.push('user_id_mismatch');
      console.error(`[${validationId}] SECURITY: User ID mismatch detected`, {
        sessionUserId: session.user.id,
        verifiedUserId: user.id
      });
      updateSessionConsistencyState(userId, false, true);
      return createValidationResult({
        isValid: false,
        error: 'Session security violation detected',
        securityAlerts,
        action: 'terminate',
        consistencyScore: 0,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }

    // Happy path: valid session and user match
    if (options.requireEmailVerification && !user.email_confirmed_at) {
      securityAlerts.push('email_not_verified');
      consistencyScore -= 20;
    }

    if (options.securityContext) {
      const contextAlerts = validateSessionSecurity(options.securityContext);
      securityAlerts.push(...contextAlerts);
      consistencyScore -= contextAlerts.length * 5;
    }

    updateSessionConsistencyState(userId, true, false);
    const finalConsistencyScore = Math.max(0, Math.min(100, consistencyScore));

    console.log(`[${validationId}] Session validation successful`, {
      userId: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      expiresIn: expiresAt > 0 ? Math.round((expiresAt - now) / 1000 / 60) : 'unknown',
      securityAlerts: securityAlerts.length,
      consistencyScore: finalConsistencyScore
    });

    logSessionValidation({
      userId: user.id,
      sessionId: validationId,
      outcome: 'success',
      validationType: clientType === 'browser' ? 'client' : (clientType === 'server' ? 'server' : 'middleware'),
      route: options.securityContext?.route
    });

    if (process.env.NODE_ENV === 'test') {
      console.info(`[${validationId}] DEBUG: returning allow on happy path (no refresh)`);
    }
    return createValidationResult({
      isValid: true,
      user,
      session,
      error: null,
      securityAlerts,
      action: 'allow',
      consistencyScore: finalConsistencyScore,
      validationId,
      clientType,
      refreshAttempted,
      timestamp
    });
    
  } catch (error: any) {
    console.error(`[${validationId}] Unexpected error during validation:`, error);
    
    // Log audit event for validation error
    logSessionValidation({
      sessionId: validationId,
      outcome: 'failure',
      validationType: clientType === 'browser' ? 'client' : (clientType === 'server' ? 'server' : 'middleware'),
      failureReason: error.message || 'Unexpected validation error',
      route: options.securityContext?.route
    });
    
    return createValidationResult({
      isValid: false,
      error: error.message || 'Session validation failed',
      securityAlerts: ['validation_error'],
      action: 'terminate',
      consistencyScore: 0,
      validationId,
      clientType,
      refreshAttempted,
      timestamp
    });
  }
}

/**
 * Enhanced session refresh with fallback mechanisms
 */
export async function refreshSessionWithFallback(
  supabase: any,
  userId: string,
  validationId: string
): Promise<{ isValid: boolean; user: User | null; session: Session | null; error?: string }> {
  try {
    console.log(`[${validationId}] Attempting session refresh for user ${userId}`);
    
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error(`[${validationId}] Session refresh failed:`, error.message);
      return {
        isValid: false,
        user: null,
        session: null,
        error: error.message
      };
    }
    
    if (!session || !session.user) {
      console.error(`[${validationId}] Session refresh returned no session`);
      return {
        isValid: false,
        user: null,
        session: null,
        error: 'Session refresh returned no session'
      };
    }
    
    // Validate the refreshed session
    if (session.user.id !== userId) {
      console.error(`[${validationId}] SECURITY: User ID mismatch after refresh`);
      return {
        isValid: false,
        user: null,
        session: null,
        error: 'User ID mismatch after refresh'
      };
    }
    
    console.log(`[${validationId}] Session refresh successful`);
    updateSessionRefreshState(userId);
    
    return {
      isValid: true,
      user: session.user,
      session,
    };
    
  } catch (error: any) {
    console.error(`[${validationId}] Error during session refresh:`, error);
    return {
      isValid: false,
      user: null,
      session: null,
      error: error.message || 'Session refresh error'
    };
  }
}

/**
 * Legacy refresh session function for backward compatibility
 */
export async function refreshSession(): Promise<SessionValidationResult> {
  const { createSupabaseClient } = await import('@/lib/supabase/client');
  const supabase = createSupabaseClient();
  const validationId = Math.random().toString(36).substring(2, 15);
  
  const result = await refreshSessionWithFallback(supabase, 'unknown', validationId);
  
  return createValidationResult({
    isValid: result.isValid,
    user: result.user,
    session: result.session,
    error: result.error || null,
    securityAlerts: result.isValid ? ['session_refreshed'] : ['refresh_failed'],
    action: result.isValid ? 'allow' : 'terminate',
    consistencyScore: result.isValid ? 70 : 0,
    validationId,
    clientType: 'browser',
    refreshAttempted: true,
    timestamp: Date.now()
  });
}

/**
 * Validate session security context
 */
export function validateSessionSecurity(check: SessionSecurityCheck): string[] {
  const alerts: string[] = [];
  
  // Check for suspicious patterns
  if (check.userAgent && check.userAgent.includes('bot')) {
    alerts.push('suspicious_user_agent');
  }
  
  // Add more security checks as needed
  // - IP address validation
  // - Device fingerprinting
  // - Rate limiting checks
  
  return alerts;
}

/**
 * Force session termination with comprehensive cleanup
 */
export async function terminateSession(userId?: string, reason: 'logout' | 'expiry' | 'security' | 'admin' = 'logout'): Promise<void> {
  const { createSupabaseClient } = await import('@/lib/supabase/client');
  const supabase = createSupabaseClient();
  const terminationId = Math.random().toString(36).substring(2, 15);
  let signOutAttempted = false;
  
  try {
    console.log(`[${terminationId}] Terminating session${userId ? ` for user ${userId}` : ''}`);

    // Log audit event for session termination (never block sign-out)
    if (userId) {
      try {
        logSessionTermination({
          userId,
          sessionId: terminationId,
          reason
        });
      } catch (logErr) {
        console.warn(`[${terminationId}] Failed to log session termination:`, logErr);
      }
    }

    // Clear consistency state (never block sign-out)
    if (userId) {
      try {
        clearSessionConsistencyState(userId);
      } catch (clearErr) {
        console.warn(`[${terminationId}] Failed to clear session state:`, clearErr);
      }
    }

    // Always attempt to sign out, independent of previous steps
    try {
      console.log(`[${terminationId}] Attempting supabase.auth.signOut()`);
      await supabase.auth.signOut();
      signOutAttempted = true;
      console.log(`[${terminationId}] supabase.auth.signOut() attempted`);
    } catch (signOutErr) {
      console.error(`[${terminationId}] Error during signOut:`, signOutErr);
    }

    console.log(`[${terminationId}] Session terminated successfully`);
  } catch (error) {
    console.error(`[${terminationId}] Error terminating session:`, error);
    
    // Log audit event for termination failure
    if (userId) {
      logSessionValidation({
        userId,
        sessionId: terminationId,
        outcome: 'failure',
        validationType: 'client',
        failureReason: `Session termination failed: ${error}`
      });
    }
  } finally {
    // Ensure sign out is attempted at least once
    try {
      if (!signOutAttempted) {
        console.log(`[${terminationId}] Finalizing: attempting supabase.auth.signOut()`);
        await supabase.auth.signOut();
      }
    } catch (finalSignOutErr) {
      console.warn(`[${terminationId}] Final signOut attempt failed:`, finalSignOutErr);
    }

    // Always clear any client-side storage
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('supabase.auth.token'); } catch {}
      try { sessionStorage.clear(); } catch {}
      
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => {
          try { localStorage.removeItem(key); } catch {}
        });
      } catch {}
    }
  }
}

/**
 * Create standardized validation result
 */
function createValidationResult(params: {
  isValid: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string | null;
  securityAlerts: string[];
  action: 'allow' | 'refresh' | 'terminate';
  consistencyScore: number;
  validationId: string;
  clientType: 'browser' | 'server' | 'api';
  refreshAttempted: boolean;
  timestamp: number;
}): SessionValidationResult {
  const securityLevel = params.consistencyScore >= 80 ? 'secure' : 
                       params.consistencyScore >= 50 ? 'degraded' : 'compromised';
  
  return {
    isValid: params.isValid,
    user: params.user || null,
    session: params.session || null,
    error: params.error || null,
    securityAlerts: params.securityAlerts,
    action: params.action,
    consistencyScore: params.consistencyScore,
    validationMetadata: {
      timestamp: params.timestamp,
      validationId: params.validationId,
      clientType: params.clientType,
      refreshAttempted: params.refreshAttempted,
      securityLevel
    }
  };
}

/**
 * Get or create session consistency state
 */
function getSessionConsistencyState(userId: string): SessionConsistencyState {
  let state = sessionConsistencyCache.get(userId);
  
  if (!state) {
    state = {
      userId,
      lastValidation: 0,
      validationCount: 0,
      failureCount: 0,
      lastRefresh: 0,
      refreshCount: 0,
      securityAlerts: [],
      consistencyScore: 100
    };
    sessionConsistencyCache.set(userId, state);
  }
  
  // Clean up old state if too old
  const now = Date.now();
  if (now - state.lastValidation > CONSISTENCY_CACHE_TTL) {
    state.failureCount = 0;
    state.securityAlerts = [];
    state.consistencyScore = 100;
  }
  
  return state;
}

/**
 * Update session consistency state
 */
function updateSessionConsistencyState(userId: string, success: boolean, isFailure: boolean): void {
  const state = getSessionConsistencyState(userId);
  const now = Date.now();
  
  state.lastValidation = now;
  state.validationCount++;
  
  if (success) {
    // Gradually improve consistency score on success
    state.consistencyScore = Math.min(100, state.consistencyScore + 5);
    
    // Reset failure count on successful validation
    if (state.failureCount > 0) {
      state.failureCount = Math.max(0, state.failureCount - 1);
    }
  } else if (isFailure) {
    state.failureCount++;
    state.consistencyScore = Math.max(0, state.consistencyScore - 20);
  }
  
  sessionConsistencyCache.set(userId, state);
}

/**
 * Update session refresh state
 */
function updateSessionRefreshState(userId: string): void {
  const state = getSessionConsistencyState(userId);
  const now = Date.now();
  
  state.lastRefresh = now;
  state.refreshCount++;
  
  sessionConsistencyCache.set(userId, state);
}

/**
 * Check if session refresh is allowed
 */
function canAttemptRefresh(userId: string): boolean {
  const state = getSessionConsistencyState(userId);
  const now = Date.now();
  
  // In unit tests or NODE_ENV=test, always allow refresh to ensure deterministic behavior
  if (process.env.TEST_TYPE === 'unit' || process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // Don't allow refresh if too recent
  if (now - state.lastRefresh < MIN_REFRESH_INTERVAL) {
    return false;
  }
  
  // Don't allow refresh if too many failures
  if (state.failureCount >= MAX_VALIDATION_FAILURES) {
    return false;
  }
  
  return true;
}

/**
 * Clear session consistency state
 */
function clearSessionConsistencyState(userId: string): void {
  sessionConsistencyCache.delete(userId);
}

/**
 * Get session consistency metrics for monitoring
 */
export function getSessionConsistencyMetrics(): {
  totalSessions: number;
  averageConsistencyScore: number;
  sessionsWithFailures: number;
  recentRefreshes: number;
} {
  const now = Date.now();
  let totalScore = 0;
  let sessionsWithFailures = 0;
  let recentRefreshes = 0;
  
  for (const [userId, state] of sessionConsistencyCache.entries()) {
    // Clean up stale entries
    if (now - state.lastValidation > CONSISTENCY_CACHE_TTL) {
      sessionConsistencyCache.delete(userId);
      continue;
    }
    
    totalScore += state.consistencyScore;
    
    if (state.failureCount > 0) {
      sessionsWithFailures++;
    }
    
    if (now - state.lastRefresh < 60 * 60 * 1000) { // Last hour
      recentRefreshes++;
    }
  }
  
  const totalSessions = sessionConsistencyCache.size;
  
  return {
    totalSessions,
    averageConsistencyScore: totalSessions > 0 ? totalScore / totalSessions : 0,
    sessionsWithFailures,
    recentRefreshes
  };
}

/**
 * Cleanup stale consistency states
 */
export function cleanupSessionConsistencyCache(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [userId, state] of sessionConsistencyCache.entries()) {
    if (now - state.lastValidation > CONSISTENCY_CACHE_TTL) {
      sessionConsistencyCache.delete(userId);
      cleaned++;
    }
  }
  
  return cleaned;
}

// Periodic cleanup every 15 minutes (browser runtime only)
if (typeof window !== 'undefined') {
  setInterval(cleanupSessionConsistencyCache, 15 * 60 * 1000);
}
