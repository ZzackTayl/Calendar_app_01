/**
 * Server-side Session Validation Service
 * This file can only be used in server contexts (middleware, API routes, server components)
 */

import { createRouteHandlerClient, createServerComponentClient } from '@/lib/supabase/server';
import { User, Session } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { logSessionValidation, logSessionTermination } from '@/lib/security/audit-logger';

export interface ServerSessionValidationResult {
  isValid: boolean;
  user: User | null;
  session: Session | null;
  error: string | null;
  securityAlerts: string[];
  action: 'allow' | 'refresh' | 'terminate';
  consistencyScore: number;
  validationMetadata: {
    timestamp: number;
    validationId: string;
    clientType: 'server' | 'api' | 'middleware';
    refreshAttempted: boolean;
    securityLevel: 'secure' | 'degraded' | 'compromised';
  };
}

export interface ServerSessionSecurityCheck {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
  route?: string;
  method?: string;
}

/**
 * Server-side session validation for middleware and API routes
 */
export async function validateServerSession(
  request?: NextRequest,
  options: {
    requireEmailVerification?: boolean;
    allowRefresh?: boolean;
    securityContext?: ServerSessionSecurityCheck;
  } = {}
): Promise<ServerSessionValidationResult> {
  const validationId = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  const clientType: 'server' | 'api' | 'middleware' = request ? 'middleware' : 'api';
  const securityAlerts: string[] = [];
  let consistencyScore = 100;
  let refreshAttempted = false;
  
  // Create appropriate Supabase client for server context
  const supabase = request ? createServerComponentClient() : createRouteHandlerClient();
  
  console.log(`[${validationId}] Starting server-side session validation (${clientType})`);
  
  try {
    // Step 1: Get current session with enhanced error handling
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error(`[${validationId}] Server session retrieval error:`, sessionError.message);
      consistencyScore = 0;
      
      // Log audit event for session retrieval failure
      logSessionValidation({
        sessionId: validationId,
        outcome: 'failure',
        validationType: clientType === 'middleware' ? 'middleware' : 'server',
        failureReason: sessionError.message,
        route: options.securityContext?.route
      });
      
      return createServerValidationResult({
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
      console.log(`[${validationId}] No active server session found`);
      
      // Log audit event for no session
      logSessionValidation({
        sessionId: validationId,
        outcome: 'success',
        validationType: clientType === 'middleware' ? 'middleware' : 'server',
        failureReason: 'No session present',
        route: options.securityContext?.route
      });
      
      return createServerValidationResult({
        isValid: false,
        error: 'No session found',
        securityAlerts: [],
        action: 'terminate',
        consistencyScore: 100,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }
    
    // Step 2: Validate session object integrity
    if (!session.user || !session.user.id || !session.user.email) {
      console.error(`[${validationId}] SECURITY: Invalid server session object detected`);
      consistencyScore = 0;
      securityAlerts.push('invalid_session_object');
      
      // Log critical audit event for invalid session object
      logSessionValidation({
        sessionId: validationId,
        outcome: 'failure',
        validationType: clientType === 'middleware' ? 'middleware' : 'server',
        failureReason: 'Invalid session object structure',
        route: options.securityContext?.route
      });
      
      return createServerValidationResult({
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
    
    // Step 3: Validate session freshness
    const now = Date.now();
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const timeUntilExpiry = expiresAt - now;
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes
    
    if (expiresAt > 0 && timeUntilExpiry <= 0) {
      securityAlerts.push('session_expired');
      console.warn(`[${validationId}] Server session expired`);
      consistencyScore -= 30;
      
      // Try refresh if allowed
      if (options.allowRefresh !== false) {
        const refreshResult = await refreshServerSession(supabase, userId, validationId);
        refreshAttempted = true;
        
        if (refreshResult.isValid) {
          securityAlerts.push('session_refreshed');
          return createServerValidationResult({
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
          return createServerValidationResult({
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
        return createServerValidationResult({
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
    
    // Step 4: Verify user still exists
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error(`[${validationId}] Server user verification failed:`, userError?.message);
      securityAlerts.push('user_verification_failed');
      consistencyScore -= 40;
      
      return createServerValidationResult({
        isValid: false,
        error: 'User verification failed',
        securityAlerts,
        action: 'terminate',
        consistencyScore: 0,
        validationId,
        clientType,
        refreshAttempted,
        timestamp
      });
    }
    
    // Step 5: Validate user consistency
    if (user.id !== session.user.id) {
      securityAlerts.push('user_id_mismatch');
      console.error(`[${validationId}] SECURITY: Server user ID mismatch detected`, {
        sessionUserId: session.user.id,
        verifiedUserId: user.id
      });
      return createServerValidationResult({
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
    
    // Step 6: Check email verification if required
    if (options.requireEmailVerification && !user.email_confirmed_at) {
      securityAlerts.push('email_not_verified');
      consistencyScore -= 20;
    }
    
    // Step 7: Perform security context validation
    if (options.securityContext) {
      const contextAlerts = validateServerSessionSecurity(options.securityContext);
      securityAlerts.push(...contextAlerts);
      consistencyScore -= contextAlerts.length * 5;
    }
    
    const finalConsistencyScore = Math.max(0, Math.min(100, consistencyScore));
    
    // Step 8: Log successful validation
    console.log(`[${validationId}] Server session validation successful`, {
      userId: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      expiresIn: expiresAt > 0 ? Math.round((expiresAt - now) / 1000 / 60) : 'unknown',
      securityAlerts: securityAlerts.length,
      consistencyScore: finalConsistencyScore
    });
    
    // Log successful audit event
    logSessionValidation({
      userId: user.id,
      sessionId: validationId,
      outcome: 'success',
      validationType: clientType === 'middleware' ? 'middleware' : 'server',
      route: options.securityContext?.route
    });
    
    return createServerValidationResult({
      isValid: true,
      user,
      session,
      error: null,
      securityAlerts,
      action: securityAlerts.length > 0 ? 'refresh' : 'allow',
      consistencyScore: finalConsistencyScore,
      validationId,
      clientType,
      refreshAttempted,
      timestamp
    });
    
  } catch (error: any) {
    console.error(`[${validationId}] Unexpected error during server validation:`, error);
    
    // Log audit event for validation error
    logSessionValidation({
      sessionId: validationId,
      outcome: 'failure',
      validationType: clientType === 'middleware' ? 'middleware' : 'server',
      failureReason: error.message || 'Unexpected validation error',
      route: options.securityContext?.route
    });
    
    return createServerValidationResult({
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
 * Server-side session refresh
 */
export async function refreshServerSession(
  supabase: any,
  userId: string,
  validationId: string
): Promise<{ isValid: boolean; user: User | null; session: Session | null; error?: string }> {
  try {
    console.log(`[${validationId}] Attempting server session refresh for user ${userId}`);
    
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error(`[${validationId}] Server session refresh failed:`, error.message);
      return {
        isValid: false,
        user: null,
        session: null,
        error: error.message
      };
    }
    
    if (!session || !session.user) {
      console.error(`[${validationId}] Server session refresh returned no session`);
      return {
        isValid: false,
        user: null,
        session: null,
        error: 'Session refresh returned no session'
      };
    }
    
    // Validate the refreshed session
    if (session.user.id !== userId) {
      console.error(`[${validationId}] SECURITY: Server user ID mismatch after refresh`);
      return {
        isValid: false,
        user: null,
        session: null,
        error: 'User ID mismatch after refresh'
      };
    }
    
    console.log(`[${validationId}] Server session refresh successful`);
    
    return {
      isValid: true,
      user: session.user,
      session,
    };
    
  } catch (error: any) {
    console.error(`[${validationId}] Error during server session refresh:`, error);
    return {
      isValid: false,
      user: null,
      session: null,
      error: error.message || 'Session refresh error'
    };
  }
}

/**
 * Validate server session security context
 */
export function validateServerSessionSecurity(check: ServerSessionSecurityCheck): string[] {
  const alerts: string[] = [];
  
  // Check for suspicious patterns
  if (check.userAgent && check.userAgent.includes('bot')) {
    alerts.push('suspicious_user_agent');
  }
  
  // Add more security checks as needed
  return alerts;
}

/**
 * Create standardized server validation result
 */
function createServerValidationResult(params: {
  isValid: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string | null;
  securityAlerts: string[];
  action: 'allow' | 'refresh' | 'terminate';
  consistencyScore: number;
  validationId: string;
  clientType: 'server' | 'api' | 'middleware';
  refreshAttempted: boolean;
  timestamp: number;
}): ServerSessionValidationResult {
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