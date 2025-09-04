/**
 * Unified Authentication Context
 * 
 * A comprehensive authentication context that provides consistent session management
 * across web and mobile platforms with enhanced error handling, recovery mechanisms,
 * and real-time session consistency.
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useMemo, 
  useCallback,
  useRef
} from 'react';
import { User, AuthChangeEvent, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { getSessionManager, SessionState } from './session-manager';
import { getEnhancedSupabaseClient } from '../supabase/enhanced-client';
import { ValidationError, AuthError } from '../validation/errors';
import { 
  SignInSchema, 
  SignUpSchema, 
  PasswordResetSchema
} from '../validation/schemas';

/**
 * Enhanced Auth Context Type with comprehensive session management
 */
export interface UnifiedAuthContextType {
  // Core session state
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Session consistency metrics
  sessionHealth: {
    consistencyScore: number;
    lastValidated: Date | null;
    connectionStatus: 'connected' | 'disconnected' | 'recovering';
  };
  
  // Authentication actions with validation
  signIn: (email: string, password: string) => Promise<AuthErrorResponse>;
  signUp: (email: string, password: string, fullName: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, redirectTo?: string) => Promise<AuthErrorResponse>;
  updatePassword: (newPassword: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  resendConfirmationEmail: (email?: string) => Promise<AuthErrorResponse>;
  
  // Session management actions
  refreshSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
  clearSessionData: () => Promise<void>;
  
  // Demo mode support (for development/testing)
  demoMode: boolean;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  
  // Error handling
  clearError: () => void;
  
  // Helper properties
  isEmailVerified: boolean;
  isSessionValid: boolean;
  canAccessProtectedRoutes: boolean;
  
  // Performance metrics
  getPerformanceMetrics: () => any;
  getSessionReport: () => any;
}

interface AuthErrorResponse {
  error: SupabaseAuthError | Error | null;
  message?: string;
  fieldErrors?: Record<string, string>;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

/**
 * Unified Authentication Provider with comprehensive session management
 */
export function UnifiedAuthProvider({ children }: { children: React.ReactNode }) {
  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  
  // Session health state
  const [sessionHealth, setSessionHealth] = useState({
    consistencyScore: 0,
    lastValidated: null as Date | null,
    connectionStatus: 'disconnected' as 'connected' | 'disconnected' | 'recovering'
  });
  
  // References for cleanup
  const sessionManagerRef = useRef(getSessionManager());
  const supabaseClientRef = useRef(getEnhancedSupabaseClient());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  /**
   * Initialize authentication system
   */
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      try {
        console.log('[UNIFIED_AUTH] 🚀 Initializing unified authentication system...');
        
        // Subscribe to session manager state changes
        const unsubscribe = sessionManagerRef.current.subscribe((sessionState: SessionState) => {
          if (!mounted) return;
          
          console.log('[UNIFIED_AUTH] 📊 Session state updated:', {
            hasUser: !!sessionState.user,
            hasSession: !!sessionState.session,
            loading: sessionState.loading,
            error: sessionState.error,
            consistencyScore: sessionState.consistencyScore
          });
          
          // Update component state based on session manager state
          setUser(sessionState.user);
          setSession(sessionState.session);
          setLoading(sessionState.loading);
          setError(sessionState.error);
          
          // Update session health metrics
          setSessionHealth({
            consistencyScore: sessionState.consistencyScore,
            lastValidated: sessionState.lastValidated > 0 ? new Date(sessionState.lastValidated) : null,
            connectionStatus: getConnectionStatus(sessionState)
          });
        });
        
        unsubscribeRef.current = unsubscribe;
        
        // Check for demo mode on initialization
        if (typeof window !== 'undefined') {
          const demoEnabled = localStorage.getItem('ph_demo_enabled') === '1';
          if (demoEnabled) {
            console.log('[UNIFIED_AUTH] 🎭 Demo mode detected, enabling...');
            setDemoMode(true);
            setUser({
              id: 'demo-user',
              email: 'demo@example.com',
              user_metadata: { full_name: 'Demo User' },
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString()
            } as User);
            setLoading(false);
            setIsInitialized(true);
            return;
          }
        }
        
        // Validate current session
        const validationResult = await sessionManagerRef.current.validateSession();
        console.log('[UNIFIED_AUTH] ✅ Initial session validation complete:', {
          isValid: validationResult.isValid,
          hasUser: !!validationResult.user,
          issues: validationResult.issues.length
        });
        
        setIsInitialized(true);
        
      } catch (initError) {
        console.error('[UNIFIED_AUTH] ❌ Initialization failed:', initError);
        if (mounted) {
          setError(initError instanceof Error ? initError.message : 'Initialization failed');
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
  
  /**
   * Determine connection status from session state
   */
  const getConnectionStatus = (sessionState: SessionState): 'connected' | 'disconnected' | 'recovering' => {
    if (sessionState.loading) return 'recovering';
    if (!sessionState.user || !sessionState.session) return 'disconnected';
    if (sessionState.consistencyScore >= 80) return 'connected';
    return 'recovering';
  };
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * Sign in with comprehensive validation and error handling
   */
  const signIn = useCallback(async (
    email: string, 
    password: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate inputs using schema
      try {
        SignInSchema.parse({ email, password });
      } catch (validationError: any) {
        if (validationError.flatten) {
          const fieldErrors = validationError.flatten().fieldErrors;
          setError('Please correct the errors in the form');
          setLoading(false);
          return { 
            error: new ValidationError('Validation failed', fieldErrors),
            fieldErrors
          };
        }
        throw validationError;
      }
      
      // Attempt sign in through enhanced client
      const { data, error: authError } = await supabaseClientRef.current.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (authError) {
        console.warn('[UNIFIED_AUTH] ⚠️ Sign in failed:', authError.message);
        setError(authError.message);
        setLoading(false);
        
        // Provide helpful message for unconfirmed email
        if (authError.message.includes('Email not confirmed')) {
          return { 
            error: new AuthError('Please check your email and click the confirmation link to verify your account before signing in.'),
            message: 'Please check your email and click the confirmation link to verify your account before signing in.'
          };
        }
        
        return { error: authError };
      }
      
      // Handle unverified users gracefully
      if (data.user && !data.user.email_confirmed_at) {
        console.warn('[UNIFIED_AUTH] ⚠️ User signed in but email not verified:', data.user.email);
        
        setError(null); // Clear errors to prevent conflicts with middleware
        setLoading(false);
        
        return { 
          error: null,
          message: 'Please check your email and click the confirmation link to verify your account.'
        };
      }
      
      console.log('[UNIFIED_AUTH] ✅ Sign in successful');
      setLoading(false);
      return { error: null };
      
    } catch (error: any) {
      console.error('[UNIFIED_AUTH] ❌ Sign in error:', error);
      const errorMessage = error.message || 'An error occurred during sign in';
      setError(errorMessage);
      setLoading(false);
      return { 
        error: new AuthError(errorMessage),
        message: errorMessage
      };
    }
  }, [clearError]);
  
  /**
   * Sign up with validation and confirmation handling
   */
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string,
    confirmPassword: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate inputs using schema
      try {
        SignUpSchema.parse({ 
          email, 
          password, 
          confirmPassword,
          full_name: fullName
        });
      } catch (validationError: any) {
        if (validationError.flatten) {
          const fieldErrors = validationError.flatten().fieldErrors;
          setError('Please correct the errors in the form');
          setLoading(false);
          return { 
            error: new ValidationError('Validation failed', fieldErrors),
            fieldErrors
          };
        }
        throw validationError;
      }
      
      // Attempt sign up through enhanced client
      const { error: authError } = await supabaseClientRef.current.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { 
          data: { full_name: fullName.trim() } 
        },
      });
      
      if (authError) {
        console.warn('[UNIFIED_AUTH] ⚠️ Sign up failed:', authError.message);
        setError(authError.message);
        setLoading(false);
        return { error: authError };
      }
      
      console.log('[UNIFIED_AUTH] ✅ Sign up successful');
      setLoading(false);
      return { error: null };
      
    } catch (error: any) {
      console.error('[UNIFIED_AUTH] ❌ Sign up error:', error);
      const errorMessage = error.message || 'An error occurred during sign up';
      setError(errorMessage);
      setLoading(false);
      return { 
        error: new AuthError(errorMessage),
        message: errorMessage
      };
    }
  }, [clearError]);
  
  /**
   * Sign out with comprehensive cleanup
   */
  const signOut = useCallback(async () => {
    console.log('[UNIFIED_AUTH] 🚪 Initiating sign out...');
    clearError();
    setLoading(true);
    
    try {
      // Use session manager for coordinated sign out
      await sessionManagerRef.current.signOut();
      
      // Additional cleanup for demo mode
      if (demoMode) {
        disableDemoMode();
      }
      
      console.log('[UNIFIED_AUTH] ✅ Sign out successful');
      
    } catch (error) {
      console.error('[UNIFIED_AUTH] ❌ Sign out error:', error);
      setError(error instanceof Error ? error.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  }, [clearError, demoMode]);
  
  /**
   * Reset password with validation
   */
  const resetPassword = useCallback(async (
    email: string, 
    redirectTo?: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate email
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        const fieldErrors = { email: 'Please enter a valid email address' };
        setError('Please enter a valid email address');
        setLoading(false);
        return { 
          error: new ValidationError('Invalid email', fieldErrors),
          fieldErrors
        };
      }
      
      // Default redirect URL
      const defaultRedirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/update-password` 
        : undefined;
      
      // Request password reset
      const { error: authError } = await supabaseClientRef.current.auth.resetPasswordForEmail(
        email.trim().toLowerCase(), 
        { redirectTo: redirectTo || defaultRedirectUrl }
      );
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return { error: authError };
      }
      
      setLoading(false);
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during password reset';
      setError(errorMessage);
      setLoading(false);
      return { 
        error: new AuthError(errorMessage),
        message: errorMessage
      };
    }
  }, [clearError]);
  
  /**
   * Update password with validation
   */
  const updatePassword = useCallback(async (
    newPassword: string, 
    confirmPassword: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate passwords using schema
      try {
        PasswordResetSchema.parse({ 
          password: newPassword, 
          confirmPassword 
        });
      } catch (validationError: any) {
        if (validationError.flatten) {
          const fieldErrors = validationError.flatten().fieldErrors;
          setError('Please correct the errors in the form');
          setLoading(false);
          return { 
            error: new ValidationError('Validation failed', fieldErrors),
            fieldErrors
          };
        }
        throw validationError;
      }
      
      // Update password
      const { error: authError } = await supabaseClientRef.current.auth.updateUser({ 
        password: newPassword 
      });
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return { error: authError };
      }
      
      setLoading(false);
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during password update';
      setError(errorMessage);
      setLoading(false);
      return { 
        error: new AuthError(errorMessage),
        message: errorMessage
      };
    }
  }, [clearError]);
  
  /**
   * Resend confirmation email
   */
  const resendConfirmationEmail = useCallback(async (
    email?: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Use provided email or current user's email
      const targetEmail = email || user?.email;
      
      if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
        const fieldErrors = { email: 'Please enter a valid email address' };
        setError('Please enter a valid email address');
        setLoading(false);
        return { 
          error: new ValidationError('Invalid email', fieldErrors),
          fieldErrors
        };
      }

      // Call API route to resend confirmation email
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: targetEmail.trim().toLowerCase() }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to send confirmation email');
        setLoading(false);
        return { 
          error: new AuthError(result.error || 'Failed to send confirmation email'),
          message: result.error || 'Failed to send confirmation email'
        };
      }
      
      setLoading(false);
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while resending confirmation email';
      setError(errorMessage);
      setLoading(false);
      return { 
        error: new AuthError(errorMessage),
        message: errorMessage
      };
    }
  }, [user, clearError]);
  
  /**
   * Refresh session using session manager
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const result = await sessionManagerRef.current.forceRefresh();
      return result.isValid;
    } catch (error) {
      console.error('[UNIFIED_AUTH] ❌ Session refresh failed:', error);
      return false;
    }
  }, []);
  
  /**
   * Validate current session
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const result = await sessionManagerRef.current.validateSession();
      return result.isValid;
    } catch (error) {
      console.error('[UNIFIED_AUTH] ❌ Session validation failed:', error);
      return false;
    }
  }, []);
  
  /**
   * Clear all session data
   */
  const clearSessionData = useCallback(async (): Promise<void> => {
    try {
      await sessionManagerRef.current.signOut();
      
      // Clear demo mode
      if (demoMode) {
        disableDemoMode();
      }
      
      console.log('[UNIFIED_AUTH] ✅ Session data cleared');
    } catch (error) {
      console.error('[UNIFIED_AUTH] ❌ Failed to clear session data:', error);
    }
  }, [demoMode]);
  
  /**
   * Enable demo mode
   */
  const enableDemoMode = useCallback(() => {
    clearError();
    setDemoMode(true);
    setUser({
      id: 'demo-user',
      email: 'demo@example.com',
      user_metadata: { full_name: 'Demo User' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User);

    // Persist demo flag
    if (typeof window !== 'undefined') {
      localStorage.setItem('ph_demo_enabled', '1');
    }
    
    console.log('[UNIFIED_AUTH] 🎭 Demo mode enabled');
  }, [clearError]);
  
  /**
   * Disable demo mode
   */
  const disableDemoMode = useCallback(() => {
    clearError();
    setDemoMode(false);
    setUser(null);
    
    // Clear demo data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ph_demo_enabled');
      localStorage.removeItem('ph_demo_version');
      localStorage.removeItem('ph_demo_events');
      localStorage.removeItem('ph_demo_relationships');
      localStorage.removeItem('ph_demo_contacts');
      localStorage.removeItem('ph_demo_groups');
    }
    
    console.log('[UNIFIED_AUTH] 🎭 Demo mode disabled');
  }, [clearError]);
  
  /**
   * Get performance metrics from enhanced client
   */
  const getPerformanceMetrics = useCallback(() => {
    return supabaseClientRef.current.getMetrics();
  }, []);
  
  /**
   * Get session consistency report
   */
  const getSessionReport = useCallback(() => {
    return sessionManagerRef.current.getConsistencyReport();
  }, []);
  
  // Computed properties
  const isEmailVerified = useMemo(() => {
    return user ? !!user.email_confirmed_at : false;
  }, [user]);
  
  const isSessionValid = useMemo(() => {
    return !!(user && session && sessionHealth.consistencyScore >= 70);
  }, [user, session, sessionHealth.consistencyScore]);
  
  const canAccessProtectedRoutes = useMemo(() => {
    return isSessionValid && isEmailVerified;
  }, [isSessionValid, isEmailVerified]);
  
  /**
   * Create memoized context value
   */
  const contextValue = useMemo(() => ({
    // Core state
    user,
    session,
    loading,
    error,
    isInitialized,
    
    // Session health
    sessionHealth,
    
    // Authentication actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    
    // Session management
    refreshSession,
    validateSession,
    clearSessionData,
    
    // Demo mode
    demoMode,
    enableDemoMode,
    disableDemoMode,
    
    // Error handling
    clearError,
    
    // Helper properties
    isEmailVerified,
    isSessionValid,
    canAccessProtectedRoutes,
    
    // Metrics and reporting
    getPerformanceMetrics,
    getSessionReport,
  }), [
    user,
    session,
    loading,
    error,
    isInitialized,
    sessionHealth,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    refreshSession,
    validateSession,
    clearSessionData,
    demoMode,
    enableDemoMode,
    disableDemoMode,
    clearError,
    isEmailVerified,
    isSessionValid,
    canAccessProtectedRoutes,
    getPerformanceMetrics,
    getSessionReport,
  ]);
  
  return (
    <UnifiedAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}

/**
 * Hook to access unified authentication context
 */
export const useUnifiedAuth = (): UnifiedAuthContextType => {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
};

/**
 * Hook for session health monitoring
 */
export const useSessionHealth = () => {
  const { sessionHealth, refreshSession, validateSession } = useUnifiedAuth();
  
  const isHealthy = sessionHealth.consistencyScore >= 80;
  const needsAttention = sessionHealth.consistencyScore < 70;
  const isRecovering = sessionHealth.connectionStatus === 'recovering';
  
  return {
    ...sessionHealth,
    isHealthy,
    needsAttention,
    isRecovering,
    refreshSession,
    validateSession,
  };
};

export default UnifiedAuthProvider;