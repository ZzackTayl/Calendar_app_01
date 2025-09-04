/**
 * Client-side Authentication Context Recovery Hook
 * 
 * This hook provides automatic authentication context recovery
 * and session consistency validation on the client side.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';

export interface AuthRecoveryState {
  isRecovering: boolean;
  lastRecoveryAttempt: number | null;
  recoveryAttempts: number;
  contextHealth: 'healthy' | 'degraded' | 'failed';
  lastError: string | null;
}

export interface AuthRecoveryOptions {
  enableAutoRecovery?: boolean;
  recoveryInterval?: number; // milliseconds
  maxRecoveryAttempts?: number;
  onRecoverySuccess?: () => void;
  onRecoveryFailure?: (error: string) => void;
  onContextDegraded?: () => void;
}

export function useAuthRecovery(options: AuthRecoveryOptions = {}) {
  const {
    enableAutoRecovery = true,
    recoveryInterval = 30000, // 30 seconds
    maxRecoveryAttempts = 5,
    onRecoverySuccess,
    onRecoveryFailure,
    onContextDegraded
  } = options;

  const { user, loading, error, retryAuthentication, sessionHealth } = useAuth();
  const supabase = createSupabaseClient();
  
  const [recoveryState, setRecoveryState] = useState<AuthRecoveryState>({
    isRecovering: false,
    lastRecoveryAttempt: null,
    recoveryAttempts: 0,
    contextHealth: 'healthy',
    lastError: null
  });

  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastHealthCheckRef = useRef<number>(0);

  /**
   * Perform authentication context validation
   */
  const validateAuthContext = useCallback(async (): Promise<boolean> => {
    try {
      if (!user) {
        return true; // No user is a valid state
      }

      // Check if we can still get user data
      const { data: { user: freshUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.warn('Auth context validation failed:', userError.message);
        return false;
      }

      // Validate user consistency
      if (freshUser?.id !== user.id) {
        console.error('Auth context validation: User ID mismatch', {
          originalId: user.id,
          freshId: freshUser?.id
        });
        return false;
      }

      // Check session validity
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session validation failed:', sessionError.message);
        return false;
      }

      if (session && session.user.id !== user.id) {
        console.error('Session validation: User ID mismatch', {
          originalId: user.id,
          sessionId: session.user.id
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auth context validation error:', error);
      return false;
    }
  }, [user, supabase.auth]);

  /**
   * Attempt to recover authentication context
   */
  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    if (recoveryState.isRecovering) {
      return false; // Already recovering
    }

    if (recoveryState.recoveryAttempts >= maxRecoveryAttempts) {
      console.error('Max recovery attempts reached');
      setRecoveryState(prev => ({
        ...prev,
        contextHealth: 'failed',
        lastError: 'Max recovery attempts reached'
      }));
      onRecoveryFailure?.('Max recovery attempts reached');
      return false;
    }

    setRecoveryState(prev => ({
      ...prev,
      isRecovering: true,
      lastRecoveryAttempt: Date.now(),
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      console.log('Attempting authentication context recovery...');
      
      // Use the auth context's retry mechanism
      await retryAuthentication();
      
      // Validate the recovery was successful
      const isValid = await validateAuthContext();
      
      if (isValid) {
        console.log('Authentication context recovery successful');
        setRecoveryState(prev => ({
          ...prev,
          isRecovering: false,
          contextHealth: 'healthy',
          recoveryAttempts: 0,
          lastError: null
        }));
        onRecoverySuccess?.();
        return true;
      } else {
        throw new Error('Context validation failed after recovery attempt');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Authentication context recovery failed:', errorMessage);
      
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: false,
        contextHealth: 'failed',
        lastError: errorMessage
      }));
      
      onRecoveryFailure?.(errorMessage);
      return false;
    }
  }, [recoveryState.isRecovering, recoveryState.recoveryAttempts, maxRecoveryAttempts, retryAuthentication, validateAuthContext, onRecoverySuccess, onRecoveryFailure]);

  /**
   * Perform periodic health check
   */
  const performHealthCheck = useCallback(async () => {
    const now = Date.now();
    
    // Don't check too frequently
    if (now - lastHealthCheckRef.current < 10000) { // 10 seconds minimum
      return;
    }
    
    lastHealthCheckRef.current = now;
    
    if (!user || loading) {
      return; // Skip if no user or still loading
    }

    const isValid = await validateAuthContext();
    
    if (!isValid) {
      console.warn('Auth context health check failed');
      setRecoveryState(prev => ({
        ...prev,
        contextHealth: 'degraded'
      }));
      onContextDegraded?.();
      
      if (enableAutoRecovery) {
        await attemptRecovery();
      }
    } else {
      setRecoveryState(prev => ({
        ...prev,
        contextHealth: 'healthy',
        lastError: null
      }));
    }
  }, [user, loading, validateAuthContext, enableAutoRecovery, attemptRecovery, onContextDegraded]);

  /**
   * Schedule periodic health checks
   */
  useEffect(() => {
    if (!enableAutoRecovery || !user) {
      return;
    }

    // Clear existing timer
    if (recoveryTimerRef.current) {
      clearInterval(recoveryTimerRef.current);
    }

    // Set up periodic health checks
    recoveryTimerRef.current = setInterval(performHealthCheck, recoveryInterval);

    return () => {
      if (recoveryTimerRef.current) {
        clearInterval(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
    };
  }, [enableAutoRecovery, user, recoveryInterval, performHealthCheck]);

  /**
   * Monitor auth context health from useAuth
   */
  useEffect(() => {
    if (sessionHealth) {
      setRecoveryState(prev => ({
        ...prev,
        contextHealth: sessionHealth
      }));

      if (sessionHealth === 'failed' && enableAutoRecovery) {
        attemptRecovery();
      } else if (sessionHealth === 'degraded') {
        onContextDegraded?.();
      }
    }
  }, [sessionHealth, enableAutoRecovery, attemptRecovery, onContextDegraded]);

  /**
   * Handle authentication errors
   */
  useEffect(() => {
    if (error && enableAutoRecovery) {
      console.log('Auth error detected, attempting recovery:', error);
      attemptRecovery();
    }
  }, [error, enableAutoRecovery, attemptRecovery]);

  /**
   * Manual recovery trigger
   */
  const triggerRecovery = useCallback(async (): Promise<boolean> => {
    return await attemptRecovery();
  }, [attemptRecovery]);

  /**
   * Reset recovery state
   */
  const resetRecoveryState = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      lastRecoveryAttempt: null,
      recoveryAttempts: 0,
      contextHealth: 'healthy',
      lastError: null
    });
  }, []);

  /**
   * Check if recovery is needed
   */
  const isRecoveryNeeded = recoveryState.contextHealth === 'failed' || 
                          recoveryState.contextHealth === 'degraded';

  return {
    // State
    recoveryState,
    isRecoveryNeeded,
    
    // Actions
    triggerRecovery,
    resetRecoveryState,
    performHealthCheck,
    
    // Computed values
    canAttemptRecovery: !recoveryState.isRecovering && 
                       recoveryState.recoveryAttempts < maxRecoveryAttempts,
    
    // Health indicators
    isHealthy: recoveryState.contextHealth === 'healthy',
    isDegraded: recoveryState.contextHealth === 'degraded',
    isFailed: recoveryState.contextHealth === 'failed'
  };
}