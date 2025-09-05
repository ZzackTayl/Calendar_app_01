/**
 * Authentication State Consistency Validation Service
 * Ensures client-server auth state synchronization and resolves conflicts
 */

import { User, Session } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase/client';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { validateSession, SessionValidationResult } from './session-validation';
import { NextRequest } from 'next/server';

export interface AuthStateSnapshot {
  timestamp: number;
  source: 'client' | 'server' | 'middleware';
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  contextId: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    route?: string;
    validationId: string;
  };
}

export interface AuthStateConsistencyResult {
  isConsistent: boolean;
  conflicts: AuthStateConflict[];
  resolution: AuthStateResolution;
  recommendedAction: 'maintain' | 'sync_client' | 'sync_server' | 'force_reauth' | 'terminate';
  confidence: number; // 0-100, higher means more confident in the resolution
  metadata: {
    validationId: string;
    timestamp: number;
    clientSnapshot?: AuthStateSnapshot;
    serverSnapshot?: AuthStateSnapshot;
    conflictCount: number;
  };
}

export interface AuthStateConflict {
  type: 'user_mismatch' | 'session_mismatch' | 'verification_mismatch' | 'timestamp_drift' | 'context_corruption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  clientValue: any;
  serverValue: any;
  detectedAt: number;
}

export interface AuthStateResolution {
  action: 'use_client' | 'use_server' | 'merge' | 'force_refresh' | 'clear_all';
  reason: string;
  targetState: Partial<AuthStateSnapshot>;
  requiresUserAction: boolean;
  securityImplications: string[];
}

// State consistency tracking
const stateConsistencyCache = new Map<string, AuthStateSnapshot[]>();
const CONSISTENCY_HISTORY_LIMIT = 10;
const MAX_TIMESTAMP_DRIFT = 5 * 60 * 1000; // 5 minutes
const CONSISTENCY_CHECK_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Validate authentication state consistency between client and server
 */
export async function validateAuthStateConsistency(
  clientState: Partial<AuthStateSnapshot>,
  request?: NextRequest,
  options: {
    strictMode?: boolean;
    allowTimestampDrift?: boolean;
    forceServerValidation?: boolean;
  } = {}
): Promise<AuthStateConsistencyResult> {
  const validationId = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  
  console.log(`[${validationId}] Starting auth state consistency validation`);
  
  try {
    // Get server-side auth state
    const serverValidation = await validateSession(request, {
      allowRefresh: true,
      securityContext: request ? {
        userId: clientState.user?.id || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
        timestamp: new Date().toISOString(),
        route: request.nextUrl?.pathname,
        method: request.method
      } : undefined
    });
    
    // Create server state snapshot
    const serverSnapshot: AuthStateSnapshot = {
      timestamp,
      source: 'server',
      user: serverValidation.user,
      session: serverValidation.session,
      isAuthenticated: serverValidation.isValid && !!serverValidation.user,
      isEmailVerified: !!(serverValidation.user?.email_confirmed_at),
      contextId: validationId,
      metadata: {
        userAgent: request?.headers.get('user-agent') || undefined,
        ipAddress: request?.ip || request?.headers.get('x-forwarded-for') || undefined,
        route: request?.nextUrl?.pathname,
        validationId
      }
    };
    
    // Create client state snapshot (normalize the provided client state)
    const clientSnapshot: AuthStateSnapshot = {
      timestamp: clientState.timestamp || timestamp,
      source: 'client',
      user: clientState.user || null,
      session: clientState.session || null,
      isAuthenticated: clientState.isAuthenticated || false,
      isEmailVerified: clientState.isEmailVerified || false,
      contextId: clientState.contextId || validationId,
      metadata: {
        validationId,
        ...clientState.metadata
      }
    };
    
    // Detect conflicts between client and server state
    const conflicts = detectAuthStateConflicts(clientSnapshot, serverSnapshot, options);
    
    // Determine resolution strategy
    const resolution = resolveAuthStateConflicts(conflicts, clientSnapshot, serverSnapshot, serverValidation);
    
    // Calculate confidence in the resolution
    const confidence = calculateResolutionConfidence(conflicts, resolution, serverValidation);
    
    // Store state history for tracking
    storeStateHistory(clientSnapshot.user?.id || 'anonymous', clientSnapshot, serverSnapshot);
    
    const result: AuthStateConsistencyResult = {
      isConsistent: conflicts.length === 0,
      conflicts,
      resolution,
      recommendedAction: determineRecommendedAction(conflicts, resolution, confidence),
      confidence,
      metadata: {
        validationId,
        timestamp,
        clientSnapshot,
        serverSnapshot,
        conflictCount: conflicts.length
      }
    };
    
    console.log(`[${validationId}] Auth state consistency check complete`, {
      isConsistent: result.isConsistent,
      conflictCount: conflicts.length,
      recommendedAction: result.recommendedAction,
      confidence
    });
    
    return result;
    
  } catch (error: any) {
    console.error(`[${validationId}] Error during auth state consistency validation:`, error);
    
    // Return a safe fallback result
    return {
      isConsistent: false,
      conflicts: [{
        type: 'context_corruption',
        severity: 'critical',
        description: `Consistency validation failed: ${error.message}`,
        clientValue: clientState,
        serverValue: null,
        detectedAt: timestamp
      }],
      resolution: {
        action: 'clear_all',
        reason: 'Validation error - clearing all state for safety',
        targetState: {},
        requiresUserAction: true,
        securityImplications: ['potential_security_breach', 'data_integrity_compromised']
      },
      recommendedAction: 'terminate',
      confidence: 0,
      metadata: {
        validationId,
        timestamp,
        conflictCount: 1
      }
    };
  }
}

/**
 * Detect conflicts between client and server auth states
 */
function detectAuthStateConflicts(
  clientState: AuthStateSnapshot,
  serverState: AuthStateSnapshot,
  options: { strictMode?: boolean; allowTimestampDrift?: boolean } = {}
): AuthStateConflict[] {
  const conflicts: AuthStateConflict[] = [];
  const now = Date.now();
  
  // Check user ID consistency
  if (clientState.user?.id !== serverState.user?.id) {
    conflicts.push({
      type: 'user_mismatch',
      severity: clientState.user && serverState.user ? 'critical' : 'high',
      description: 'User ID mismatch between client and server',
      clientValue: clientState.user?.id,
      serverValue: serverState.user?.id,
      detectedAt: now
    });
  }
  
  // Check authentication state consistency
  if (clientState.isAuthenticated !== serverState.isAuthenticated) {
    conflicts.push({
      type: 'session_mismatch',
      severity: 'high',
      description: 'Authentication state mismatch between client and server',
      clientValue: clientState.isAuthenticated,
      serverValue: serverState.isAuthenticated,
      detectedAt: now
    });
  }
  
  // Check email verification consistency
  if (clientState.isEmailVerified !== serverState.isEmailVerified) {
    conflicts.push({
      type: 'verification_mismatch',
      severity: 'medium',
      description: 'Email verification state mismatch between client and server',
      clientValue: clientState.isEmailVerified,
      serverValue: serverState.isEmailVerified,
      detectedAt: now
    });
  }
  
  // Check timestamp drift (if not explicitly allowed)
  if (!options.allowTimestampDrift) {
    const timeDrift = Math.abs(clientState.timestamp - serverState.timestamp);
    if (timeDrift > MAX_TIMESTAMP_DRIFT) {
      conflicts.push({
        type: 'timestamp_drift',
        severity: 'low',
        description: `Significant timestamp drift detected: ${timeDrift}ms`,
        clientValue: clientState.timestamp,
        serverValue: serverState.timestamp,
        detectedAt: now
      });
    }
  }
  
  // Check session token consistency (if both have sessions)
  if (clientState.session && serverState.session) {
    if (clientState.session.access_token !== serverState.session.access_token) {
      conflicts.push({
        type: 'session_mismatch',
        severity: 'critical',
        description: 'Session token mismatch between client and server',
        clientValue: 'token_present',
        serverValue: 'different_token',
        detectedAt: now
      });
    }
  }
  
  // In strict mode, check additional consistency requirements
  if (options.strictMode) {
    // Check user metadata consistency
    if (clientState.user && serverState.user) {
      const clientEmail = clientState.user.email;
      const serverEmail = serverState.user.email;
      
      if (clientEmail !== serverEmail) {
        conflicts.push({
          type: 'user_mismatch',
          severity: 'high',
          description: 'User email mismatch between client and server',
          clientValue: clientEmail,
          serverValue: serverEmail,
          detectedAt: now
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Resolve auth state conflicts and determine target state
 */
function resolveAuthStateConflicts(
  conflicts: AuthStateConflict[],
  clientState: AuthStateSnapshot,
  serverState: AuthStateSnapshot,
  serverValidation: SessionValidationResult
): AuthStateResolution {
  // If no conflicts, maintain current state
  if (conflicts.length === 0) {
    return {
      action: 'use_server',
      reason: 'No conflicts detected - server state is authoritative',
      targetState: serverState,
      requiresUserAction: false,
      securityImplications: []
    };
  }
  
  // Check for critical security conflicts
  const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
  if (criticalConflicts.length > 0) {
    return {
      action: 'clear_all',
      reason: 'Critical security conflicts detected - clearing all state',
      targetState: {},
      requiresUserAction: true,
      securityImplications: ['potential_session_hijacking', 'authentication_bypass_attempt']
    };
  }
  
  // If server validation failed, prefer client state but with caution
  if (!serverValidation.isValid) {
    return {
      action: 'force_refresh',
      reason: 'Server validation failed - forcing session refresh',
      targetState: {},
      requiresUserAction: true,
      securityImplications: ['session_validation_failure']
    };
  }
  
  // For high severity conflicts, prefer server state
  const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
  if (highSeverityConflicts.length > 0) {
    return {
      action: 'use_server',
      reason: 'High severity conflicts - server state is more reliable',
      targetState: serverState,
      requiresUserAction: false,
      securityImplications: ['client_state_corruption_possible']
    };
  }
  
  // For medium/low severity conflicts, try to merge intelligently
  return {
    action: 'merge',
    reason: 'Minor conflicts - merging states with server preference',
    targetState: {
      ...clientState,
      user: serverState.user, // Always prefer server user data
      session: serverState.session, // Always prefer server session
      isAuthenticated: serverState.isAuthenticated,
      isEmailVerified: serverState.isEmailVerified,
      timestamp: Math.max(clientState.timestamp, serverState.timestamp)
    },
    requiresUserAction: false,
    securityImplications: []
  };
}

/**
 * Calculate confidence in the resolution strategy
 */
function calculateResolutionConfidence(
  conflicts: AuthStateConflict[],
  resolution: AuthStateResolution,
  serverValidation: SessionValidationResult
): number {
  let confidence = 100;
  
  // Reduce confidence based on conflict severity
  for (const conflict of conflicts) {
    switch (conflict.severity) {
      case 'critical':
        confidence -= 40;
        break;
      case 'high':
        confidence -= 25;
        break;
      case 'medium':
        confidence -= 15;
        break;
      case 'low':
        confidence -= 5;
        break;
    }
  }
  
  // Adjust confidence based on server validation quality
  if (serverValidation.consistencyScore) {
    const serverConfidenceAdjustment = (serverValidation.consistencyScore - 50) / 2;
    confidence += serverConfidenceAdjustment;
  }
  
  // Reduce confidence for actions that require user intervention
  if (resolution.requiresUserAction) {
    confidence -= 20;
  }
  
  // Reduce confidence for security implications
  confidence -= resolution.securityImplications.length * 10;
  
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Determine recommended action based on conflicts and resolution
 */
function determineRecommendedAction(
  conflicts: AuthStateConflict[],
  resolution: AuthStateResolution,
  confidence: number
): 'maintain' | 'sync_client' | 'sync_server' | 'force_reauth' | 'terminate' {
  // If confidence is very low, terminate for safety
  if (confidence < 30) {
    return 'terminate';
  }
  
  // If there are critical conflicts, force reauth
  if (conflicts.some(c => c.severity === 'critical')) {
    return 'force_reauth';
  }
  
  // If resolution requires clearing state, terminate
  if (resolution.action === 'clear_all') {
    return 'terminate';
  }
  
  // If resolution requires refresh, force reauth
  if (resolution.action === 'force_refresh') {
    return 'force_reauth';
  }
  
  // If using server state, sync client
  if (resolution.action === 'use_server') {
    return 'sync_client';
  }
  
  // If using client state, sync server (rare)
  if (resolution.action === 'use_client') {
    return 'sync_server';
  }
  
  // If merging or no conflicts, maintain current state
  return 'maintain';
}

/**
 * Store state history for tracking patterns
 */
function storeStateHistory(
  userId: string,
  clientState: AuthStateSnapshot,
  serverState: AuthStateSnapshot
): void {
  const key = userId || 'anonymous';
  let history = stateConsistencyCache.get(key) || [];
  
  // Add both states to history
  history.push(clientState, serverState);
  
  // Keep only recent history
  if (history.length > CONSISTENCY_HISTORY_LIMIT) {
    history = history.slice(-CONSISTENCY_HISTORY_LIMIT);
  }
  
  stateConsistencyCache.set(key, history);
}

/**
 * Get state consistency history for a user
 */
export function getStateConsistencyHistory(userId: string): AuthStateSnapshot[] {
  return stateConsistencyCache.get(userId) || [];
}

/**
 * Analyze consistency patterns for a user
 */
export function analyzeConsistencyPatterns(userId: string): {
  totalChecks: number;
  conflictRate: number;
  commonConflictTypes: string[];
  averageResolutionConfidence: number;
  recommendedActions: string[];
} {
  const history = getStateConsistencyHistory(userId);
  
  if (history.length === 0) {
    return {
      totalChecks: 0,
      conflictRate: 0,
      commonConflictTypes: [],
      averageResolutionConfidence: 0,
      recommendedActions: []
    };
  }
  
  // This is a simplified analysis - in a real implementation,
  // you'd store more detailed consistency check results
  return {
    totalChecks: history.length / 2, // Assuming pairs of client/server states
    conflictRate: 0, // Would calculate from stored conflict data
    commonConflictTypes: [],
    averageResolutionConfidence: 85, // Placeholder
    recommendedActions: []
  };
}

/**
 * Clear consistency history for a user
 */
export function clearConsistencyHistory(userId: string): void {
  stateConsistencyCache.delete(userId);
}

/**
 * Get consistency metrics for monitoring
 */
export function getConsistencyMetrics(): {
  totalUsers: number;
  usersWithHistory: number;
  averageHistoryLength: number;
  cacheSize: number;
} {
  const totalUsers = stateConsistencyCache.size;
  let totalHistoryLength = 0;
  
  for (const history of stateConsistencyCache.values()) {
    totalHistoryLength += history.length;
  }
  
  return {
    totalUsers,
    usersWithHistory: totalUsers,
    averageHistoryLength: totalUsers > 0 ? totalHistoryLength / totalUsers : 0,
    cacheSize: totalHistoryLength
  };
}

/**
 * Cleanup old consistency history
 */
export function cleanupConsistencyHistory(): number {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  let cleaned = 0;
  
  for (const [userId, history] of stateConsistencyCache.entries()) {
    const filteredHistory = history.filter(state => 
      now - state.timestamp < maxAge
    );
    
    if (filteredHistory.length === 0) {
      stateConsistencyCache.delete(userId);
      cleaned++;
    } else if (filteredHistory.length < history.length) {
      stateConsistencyCache.set(userId, filteredHistory);
    }
  }
  
  return cleaned;
}

// Periodic cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupConsistencyHistory, 60 * 60 * 1000);
}