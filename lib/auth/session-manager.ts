/**
 * Enhanced Session Manager for Authentication Context Consistency
 * 
 * This module provides centralized session management to prevent
 * authentication context dissociation between frontend and backend.
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export interface SessionValidationResult {
  valid: boolean;
  user: User | null;
  session: Session | null;
  error?: string;
  refreshed?: boolean;
  contextIntegrity: 'healthy' | 'degraded' | 'failed';
}

export interface AuthContextState {
  user: User | null;
  session: Session | null;
  lastValidated: number;
  refreshAttempts: number;
  contextHealth: 'healthy' | 'degraded' | 'failed';
}

// In-memory session cache for server-side validation
const sessionCache = new Map<string, AuthContextState>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_REFRESH_ATTEMPTS = 3;

/**
 * Validate and refresh authentication session with comprehensive error handling
 */
export async function validateAuthSession(request?: NextRequest): Promise<SessionValidationResult> {
  const requestId = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  
  try {
    // Use client for both contexts to avoid server-only imports in client code
    // For server-specific operations, use server-session-validation.ts instead
    const supabase = createSupabaseClient();
    
    // First, try to get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn(`[${requestId}] Session retrieval error:`, sessionError.message);
      return {
        valid: false,
        user: null,
        session: null,
        error: `Session error: ${sessionError.message}`,
        contextIntegrity: 'failed'
      };
    }
    
    if (!session) {
      console.log(`[${requestId}] No active session found`);
      return {
        valid: false,
        user: null,
        session: null,
        error: 'No active session',
        contextIntegrity: 'healthy' // No session is a valid state
      };
    }
    
    // Validate session integrity
    if (!session.user || !session.user.id) {
      console.error(`[${requestId}] SECURITY: Invalid session object detected`);
      return {
        valid: false,
        user: null,
        session: null,
        error: 'Invalid session object',
        contextIntegrity: 'failed'
      };
    }
    
    // Check if session is expired or about to expire (within 5 minutes)
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (expiresAt > 0 && expiresAt < now + fiveMinutes) {
      console.log(`[${requestId}] Session expiring soon, attempting refresh`);
      
      // Attempt to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        console.error(`[${requestId}] Session refresh failed:`, refreshError?.message);
        return {
          valid: false,
          user: null,
          session: null,
          error: `Session refresh failed: ${refreshError?.message}`,
          contextIntegrity: 'failed'
        };
      }
      
      console.log(`[${requestId}] Session successfully refreshed`);
      return {
        valid: true,
        user: refreshedSession.user,
        session: refreshedSession,
        refreshed: true,
        contextIntegrity: 'degraded' // Refreshed but not optimal
      };
    }
    
    // Validate user context by attempting to get fresh user data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.warn(`[${requestId}] User validation error:`, userError.message);
      
      // Try one session refresh if user validation fails
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        return {
          valid: false,
          user: null,
          session: null,
          error: `User validation and refresh failed: ${userError.message}`,
          contextIntegrity: 'failed'
        };
      }
      
      return {
        valid: true,
        user: refreshedSession.user,
        session: refreshedSession,
        refreshed: true,
        contextIntegrity: 'degraded'
      };
    }
    
    // Validate user consistency
    if (user.id !== session.user.id) {
      console.error(`[${requestId}] SECURITY: User ID mismatch detected`, {
        sessionUserId: session.user.id,
        userUserId: user.id
      });
      return {
        valid: false,
        user: null,
        session: null,
        error: 'User ID mismatch - potential security issue',
        contextIntegrity: 'failed'
      };
    }
    
    // Update session cache for server-side tracking
    if (user.id) {
      sessionCache.set(user.id, {
        user,
        session,
        lastValidated: timestamp,
        refreshAttempts: 0,
        contextHealth: 'healthy'
      });
    }
    
    console.log(`[${requestId}] Session validation successful`, {
      userId: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at
    });
    
    return {
      valid: true,
      user,
      session,
      contextIntegrity: 'healthy'
    };
    
  } catch (error) {
    console.error(`[${requestId}] Session validation error:`, error);
    return {
      valid: false,
      user: null,
      session: null,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      contextIntegrity: 'failed'
    };
  }
}

/**
 * Enhanced authentication check for API routes with automatic session recovery
 */
export async function requireAuthentication(request: NextRequest): Promise<SessionValidationResult> {
  const requestId = Math.random().toString(36).substring(2, 15);
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  console.log(`[${requestId}] Authentication required for ${request.method} ${request.nextUrl.pathname} from IP: ${clientIP}`);
  
  const validation = await validateAuthSession(request);
  
  if (!validation.valid) {
    console.warn(`[${requestId}] Authentication failed:`, validation.error);
    
    // Log authentication failure for audit
    console.warn(`[${requestId}] AUTH AUDIT: Authentication failure`, {
      route: request.nextUrl.pathname,
      method: request.method,
      clientIP,
      error: validation.error,
      contextIntegrity: validation.contextIntegrity,
      timestamp: new Date().toISOString()
    });
  } else {
    // Log successful authentication for audit
    console.log(`[${requestId}] AUTH AUDIT: Authentication success`, {
      userId: validation.user?.id,
      email: validation.user?.email,
      route: request.nextUrl.pathname,
      method: request.method,
      clientIP,
      refreshed: validation.refreshed,
      contextIntegrity: validation.contextIntegrity,
      timestamp: new Date().toISOString()
    });
  }
  
  return validation;
}

/**
 * Check session consistency across multiple requests
 */
export function checkSessionConsistency(userId: string): AuthContextState | null {
  const cached = sessionCache.get(userId);
  
  if (!cached) {
    return null;
  }
  
  const now = Date.now();
  const age = now - cached.lastValidated;
  
  // If cache is too old, consider it stale
  if (age > CACHE_TTL) {
    sessionCache.delete(userId);
    return null;
  }
  
  return cached;
}

/**
 * Update session health status
 */
export function updateSessionHealth(userId: string, health: 'healthy' | 'degraded' | 'failed') {
  const cached = sessionCache.get(userId);
  
  if (cached) {
    cached.contextHealth = health;
    cached.lastValidated = Date.now();
    
    if (health === 'failed') {
      cached.refreshAttempts += 1;
      
      // If too many refresh attempts, remove from cache
      if (cached.refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        sessionCache.delete(userId);
      }
    } else {
      cached.refreshAttempts = 0;
    }
  }
}

/**
 * Clear session cache for user (useful for logout)
 */
export function clearSessionCache(userId: string) {
  sessionCache.delete(userId);
}

/**
 * Get session health metrics for monitoring
 */
export function getSessionHealthMetrics() {
  const now = Date.now();
  const metrics = {
    totalSessions: sessionCache.size,
    healthySessions: 0,
    degradedSessions: 0,
    failedSessions: 0,
    staleSessions: 0
  };
  
  for (const [userId, state] of sessionCache.entries()) {
    const age = now - state.lastValidated;
    
    if (age > CACHE_TTL) {
      metrics.staleSessions++;
      sessionCache.delete(userId); // Clean up stale sessions
    } else {
      switch (state.contextHealth) {
        case 'healthy':
          metrics.healthySessions++;
          break;
        case 'degraded':
          metrics.degradedSessions++;
          break;
        case 'failed':
          metrics.failedSessions++;
          break;
      }
    }
  }
  
  return metrics;
}

/**
 * Cleanup stale sessions periodically
 */
export function cleanupStaleSessions() {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [userId, state] of sessionCache.entries()) {
    const age = now - state.lastValidated;
    
    if (age > CACHE_TTL) {
      sessionCache.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`Session cleanup: removed ${cleaned} stale sessions`);
  }
  
  return cleaned;
}

// Periodic cleanup every 10 minutes (browser runtime only)
if (typeof window !== 'undefined') {
  setInterval(cleanupStaleSessions, 10 * 60 * 1000);
}
