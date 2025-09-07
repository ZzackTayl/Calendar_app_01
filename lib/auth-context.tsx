'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createSupabaseClient } from './supabase/client';
import { User, AuthChangeEvent, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
// Offline functionality removed for production
import { 
  SignInSchema, 
  SignUpSchema, 
  PasswordResetSchema
} from './validation/schemas';
import { ValidationError, AuthError } from './validation/errors';
import { 
  performSecurityCheck, 
  storeSessionFingerprint, 
  clearSessionFingerprint,
  auditSessionSecurity,
  generateSessionFingerprint
} from './auth/session-security';
import { 
  validateSession, 
  refreshSession, 
  terminateSession,
  type SessionValidationResult 
} from './auth/session-validation';
import { 
  logAuthBypassAttempt,
  logSessionValidationFailure,
  securityLogger
} from './security/event-logger';
import { 
  logAuthenticationAttempt,
  logSessionCreation,
  logSessionTermination,
  logUserAccountChange
} from './security/audit-logger';

/**
 * AuthErrorResponse type
 */
interface AuthErrorResponse {
  error: SupabaseAuthError | Error | null;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Auth Context Type - Production Version (Offline functionality removed)
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  // Offline functionality removed for production
  offlineAvailable: boolean;
  
  // Core auth actions
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthErrorResponse>;
  signUp: (email: string, password: string, fullName: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  resetPassword: (email: string, redirectTo?: string) => Promise<AuthErrorResponse>;
  updatePassword: (newPassword: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  resendConfirmationEmail: (email?: string) => Promise<AuthErrorResponse>;
  
  // Offline functionality removed for production
  syncOfflineData: () => Promise<void>;
  offlineStatus: {
    isOnline: boolean;
    lastSynced: Date | null;
    pendingChanges: number;
  };
  
  // Error handling and recovery
  clearError: () => void;
  retryAuthentication: () => Promise<void>;
  
  // Helper properties
  isEmailVerified: boolean;
  sessionHealth: 'healthy' | 'degraded' | 'failed';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineAvailable, setOfflineAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionHealth, setSessionHealth] = useState<'healthy' | 'degraded' | 'failed'>('healthy');
  const [storedUser, setStoredUser] = useState<User | null>(null); // For security comparison
  const [mounted, setMounted] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState({
    isOnline: true, // Default to true, will be updated in useEffect
    lastSynced: null as Date | null,
    pendingChanges: 0
  });
  
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    setMounted(true);
    // Update online status after mounting to avoid SSR issues
    if (typeof navigator !== 'undefined') {
      setOfflineStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine
      }));
    }
  }, []);

  /**
   * Initialize offline functionality for authenticated user
   * Offline functionality removed for production
   */
  const initializeOfflineMode = useCallback(async (userId: string) => {
    // Offline functionality removed for production
    setOfflineAvailable(false);
    
    setOfflineStatus({
      isOnline: true, // Will be updated by network detection
      lastSynced: null,
      pendingChanges: 0
    });

    console.log('Offline functionality disabled for production build');
  }, []);

  /**
   * Cleanup offline functionality
   * Offline functionality removed for production
   */
  const cleanupOfflineMode = useCallback(async () => {
    // Offline functionality removed for production
    setOfflineAvailable(false);
    setOfflineStatus({
      isOnline: true, // Will be updated by network detection
      lastSynced: null,
      pendingChanges: 0
    });
    console.log('Offline functionality cleanup - disabled for production build');
  }, []);

  /**
   * Clear any auth errors and reset session health
   */
  const clearError = useCallback(() => {
    setError(null);
    setSessionHealth('healthy');
  }, []);

  /**
   * SECURITY: Mandatory server-side session validation
   */
  const validateSessionConsistency = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) return true; // No user to validate
    
    try {
      console.log('AuthContext: SECURITY: Starting mandatory server-side session validation');
      
      const validationResult: SessionValidationResult = await validateSession();
      
      switch (validationResult.action) {
        case 'terminate':
          console.error('AuthContext: SECURITY: Session validation failed - terminating session', {
            error: validationResult.error,
            securityAlerts: validationResult.securityAlerts
          });
          
          logSessionValidationFailure({
            userId: currentUser.id,
            error: validationResult.error || 'Session validation failed',
            validationType: 'mandatory_server_validation',
            securityAlerts: validationResult.securityAlerts
          });
          
          setSessionHealth('failed');
          await terminateSession();
          return false;
          
        case 'refresh':
          console.warn('AuthContext: SECURITY: Session requires refresh', {
            securityAlerts: validationResult.securityAlerts
          });
          setSessionHealth('degraded');
          
          if (validationResult.isValid && validationResult.user) {
            console.log('AuthContext: Session validation successful after refresh');
            return true;
          } else {
            console.error('AuthContext: Session refresh failed during validation');
            await terminateSession();
            return false;
          }
          
        case 'allow':
          if (validationResult.user && validationResult.user.id !== currentUser.id) {
            console.error('AuthContext: SECURITY: User ID mismatch detected in validation', {
              originalId: currentUser.id,
              validatedId: validationResult.user.id,
              timestamp: new Date().toISOString()
            });
            
            securityLogger.logEvent('security_alert', {
              userId: currentUser.id,
              validatedUserId: validationResult.user.id,
              alertType: 'user_id_mismatch',
              context: 'session_validation'
            }, 'user_id_mismatch', 'critical');
            
            setSessionHealth('failed');
            await terminateSession();
            return false;
          }
          
          if (validationResult.securityAlerts.length > 0) {
            console.warn('AuthContext: SECURITY: Session validation completed with alerts', {
              alerts: validationResult.securityAlerts
            });
            setSessionHealth('degraded');
          } else {
            setSessionHealth('healthy');
          }
          
          return true;
          
        default:
          console.error('AuthContext: SECURITY: Unknown validation action', validationResult.action);
          setSessionHealth('failed');
          await terminateSession();
          return false;
      }
    } catch (error) {
      console.error('AuthContext: SECURITY: Fatal error during session validation:', error);
      setSessionHealth('failed');
      
      try {
        await terminateSession();
      } catch (terminateError) {
        console.error('AuthContext: Error during forced termination:', terminateError);
      }
      
      return false;
    }
  }, []);

  /**
   * SECURITY: Validate and set user with mandatory server-side validation
   */
  const setUserSecurely = useCallback(async (newUser: User | null, context: string = 'unknown') => {
    if (!newUser) {
      // Cleanup when user is null
      if (storedUser) {
        auditSessionSecurity(storedUser.id, 'logout', { context });
        clearSessionFingerprint(storedUser.id);
        await cleanupOfflineMode();
      }
      setUser(null);
      setStoredUser(null);
      return;
    }

    // SECURITY: Mandatory server-side session validation
    console.log('AuthContext: SECURITY: Performing mandatory validation before setting user');
    const isValidSession = await validateSessionConsistency(newUser);
    
    if (!isValidSession) {
      console.error('AuthContext: SECURITY: Mandatory validation failed - rejecting user', {
        userId: newUser.id,
        context
      });
      
      try {
        await terminateSession();
        await cleanupOfflineMode();
      } catch (error) {
        console.error('AuthContext: Error during forced termination:', error);
      }
      
      setError('Session validation failed. Please sign in again.');
      setSessionHealth('failed');
      setUser(null);
      setStoredUser(null);
      return;
    }

    // Perform additional security checks
    const securityResult = performSecurityCheck(newUser.id, newUser, storedUser);
    
    if (securityResult.action === 'terminate') {
      console.error('AuthContext: SECURITY: Session terminated due to security alerts', securityResult.alerts);
      auditSessionSecurity(newUser.id, 'security_alert', { 
        alerts: securityResult.alerts, 
        action: 'terminated',
        context 
      });
      
      await terminateSession();
      await cleanupOfflineMode();
      setError('Session terminated for security reasons. Please sign in again.');
      setSessionHealth('failed');
      setUser(null);
      setStoredUser(null);
      return;
    }

    if (securityResult.action === 'warn') {
      console.warn('AuthContext: SECURITY: Security warnings detected', securityResult.alerts);
      auditSessionSecurity(newUser.id, 'security_alert', { 
        alerts: securityResult.alerts, 
        action: 'warning',
        context 
      });
      setSessionHealth('degraded');
    }

    // Store fingerprint for new sessions
    if (!storedUser || storedUser.id !== newUser.id) {
      const fingerprint = generateSessionFingerprint();
      storeSessionFingerprint(newUser.id, fingerprint);
      auditSessionSecurity(newUser.id, 'login', { context, fingerprint });
      
      // Initialize offline functionality for new user
      await initializeOfflineMode(newUser.id);
    }

    // Update user states only after all validations pass
    setUser(newUser);
    setStoredUser(newUser);
    
    console.log('AuthContext: SECURITY: User set securely with mandatory validation', {
      userId: newUser.id,
      email: newUser.email,
      context,
      securityAlerts: securityResult.alerts.length,
      sessionHealth: securityResult.action === 'warn' ? 'degraded' : 'healthy'
    });
  }, [storedUser, validateSessionConsistency, initializeOfflineMode, cleanupOfflineMode]);

  /**
   * Sync offline data manually
   * Offline functionality removed for production
   */
  const syncOfflineData = useCallback(async () => {
    // Offline functionality removed for production
    throw new Error('Offline functionality not available in production build');
  }, []);

  /**
   * Retry authentication with mandatory validation
   */
  const retryAuthentication = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext: SECURITY: Retrying authentication with mandatory validation...');
      
      const validationResult = await validateSession();
      
      if (!validationResult.isValid) {
        console.warn('AuthContext: SECURITY: Authentication retry failed validation:', {
          error: validationResult.error,
          securityAlerts: validationResult.securityAlerts
        });
        
        await terminateSession();
        await cleanupOfflineMode();
        setSessionHealth('failed');
        setUser(null);
        setError(validationResult.error || 'Authentication validation failed');
        setLoading(false);
        return;
      }
      
      switch (validationResult.action) {
        case 'allow':
          await setUserSecurely(validationResult.user, 'retry_success');
          setSessionHealth('healthy');
          console.log('AuthContext: SECURITY: Authentication retry successful with validation');
          break;
          
        case 'refresh':
          await setUserSecurely(validationResult.user, 'retry_refreshed');
          setSessionHealth('degraded');
          console.log('AuthContext: SECURITY: Authentication retry successful after refresh');
          break;
          
        case 'terminate':
          await terminateSession();
          await cleanupOfflineMode();
          setSessionHealth('failed');
          setUser(null);
          setError('Session security validation failed');
          console.error('AuthContext: SECURITY: Authentication retry terminated due to security concerns');
          break;
      }
    } catch (error: any) {
      console.error('AuthContext: SECURITY: Authentication retry error:', error);
      
      try {
        await terminateSession();
        await cleanupOfflineMode();
      } catch (terminateError) {
        console.error('AuthContext: Error during forced termination in retry:', terminateError);
      }
      
      setSessionHealth('failed');
      setError(error.message || 'Authentication retry failed');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUserSecurely, cleanupOfflineMode]);

  /**
   * Sign Out
   */
  const signOut = useCallback(async () => {
    clearError();
    setLoading(true);
    
    const currentUserId = user?.id;
    
    try {
      if (currentUserId) {
        logSessionTermination({
          userId: currentUserId,
          sessionId: 'manual_signout',
          reason: 'logout'
        });
      }
      
      await supabase.auth.signOut();
      await cleanupOfflineMode();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, clearError, user?.id, cleanupOfflineMode]);

  /**
   * Sign In with email/password
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
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
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      logAuthenticationAttempt({
        email: email.trim().toLowerCase(),
        method: 'password',
        outcome: authError ? 'failure' : 'success',
        failureReason: authError?.message,
        userId: data.user?.id
      });
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        
        if (authError.message.includes('Email not confirmed')) {
          return { 
            error: new AuthError('Please check your email and click the confirmation link to verify your account before signing in. Check your spam folder if you don\'t see the email.'),
            message: 'Please check your email and click the confirmation link to verify your account before signing in. Check your spam folder if you don\'t see the email.'
          };
        }
        
        return { error: authError };
      }
      
      if (data.session && data.user) {
        logSessionCreation({
          userId: data.user.id,
          sessionId: data.session.access_token.substring(0, 16),
          expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
          method: 'password'
        });
      }
      
      if (data.user && !data.user.email_confirmed_at) {
        console.warn('Security: User signed in but email not verified:', data.user.email);
        setError(null);
        setLoading(false);
        return { 
          error: null,
          message: 'Please check your email and click the confirmation link to verify your account.'
        };
      }
      
      setLoading(false);
      return { error: null };
    } catch (error: any) {
      console.error('AuthContext: Unexpected error during sign in:', error);
      const errorMessage = error.message || 'An error occurred during sign in';
      setError(errorMessage);
      setLoading(false);
      return { 
        error: new AuthError(errorMessage),
        message: errorMessage
      };
    }
  }, [supabase.auth, clearError]);

  /**
   * Sign Up new user
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
      
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { 
          data: { full_name: fullName.trim() } 
        },
      });
      
      logAuthenticationAttempt({
        email: email.trim().toLowerCase(),
        method: 'password',
        outcome: authError ? 'failure' : 'success',
        failureReason: authError?.message,
        userId: data.user?.id
      });
      
      if (data.user && !authError) {
        logUserAccountChange({
          userId: data.user.id,
          action: 'created',
          changes: {
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            email_verified: false
          }
        });
      }
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return { error: authError };
      }
      
      setLoading(false);
      return { error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred during sign up';
      setError(errorMessage);
      setLoading(false);
      return { 
        error: new AuthError(errorMessage),
        message: errorMessage
      };
    }
  }, [supabase.auth, clearError]);

  /**
   * Request password reset
   */
  const resetPassword = useCallback(async (email: string, redirectTo?: string): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        const fieldErrors = { email: 'Please enter a valid email address' };
        setError('Please enter a valid email address');
        setLoading(false);
        return { 
          error: new ValidationError('Invalid email', fieldErrors),
          fieldErrors
        };
      }
      
      const defaultRedirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/update-password` 
        : undefined;
      
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
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
  }, [supabase.auth, clearError]);

  /**
   * Update user password
   */
  const updatePassword = useCallback(async (
    newPassword: string, 
    confirmPassword: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
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
      
      const { error: authError } = await supabase.auth.updateUser({ 
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
  }, [supabase.auth, clearError]);

  /**
   * Resend confirmation email
   */
  const resendConfirmationEmail = useCallback(async (email?: string): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
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
   * Setup offline status monitoring
   * Offline functionality removed for production
   */
  useEffect(() => {
    // Offline functionality removed for production - monitoring disabled
    console.log('Offline status monitoring disabled for production build');
  }, [user, offlineAvailable]);

  /**
   * Initialize auth state with enhanced session validation
   */
  useEffect(() => {
    if (!mounted) return;
    
    const init = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('AuthContext: Error getting user:', error);
          if (error.message.includes('Auth session missing')) {
            setUser(null);
          } else {
            console.error('AuthContext: Unexpected error getting user:', error);
          }
        } else if (user) {
          const isValid = await validateSessionConsistency(user);
          if (isValid) {
            await setUserSecurely(user, 'initialization');
          } else {
            console.warn('AuthContext: Session validation failed, signing out');
            await supabase.auth.signOut();
            await setUserSecurely(null, 'validation_failed');
          }
        } else {
          await setUserSecurely(null, 'no_user');
        }
      } catch (error) {
        console.error('AuthContext: Fatal auth error:', error);
        await setUserSecurely(null, 'fatal_error');
      } finally {
        setLoading(false);
      }
    };
    
    init();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          console.log('AuthContext: Auth state change:', event, {
            hasSession: !!session,
            hasUser: !!session?.user,
            userEmail: session?.user?.email,
            emailVerified: !!session?.user?.email_confirmed_at,
            timestamp: new Date().toISOString()
          });

          if (event === 'SIGNED_OUT' || !session?.user) {
            await setUserSecurely(null, 'auth_state_change_signout');
            setError(null);
            setLoading(false);
            return;
          }

          if (session?.user) {
            const isValid = await validateSessionConsistency(session.user);
            if (!isValid) {
              console.warn('AuthContext: Invalid session detected in auth state change, signing out');
              await supabase.auth.signOut();
              await setUserSecurely(null, 'auth_state_change_invalid');
              setError(null);
              setLoading(false);
              return;
            }
          }

          if (session?.user && !session.user.email_confirmed_at) {
            console.warn('AuthContext: Unverified user detected in auth state change:', session.user.email);
            await setUserSecurely(session.user, 'auth_state_change_unverified');
            setError(null);
            setLoading(false);
            return;
          }
          
          setError(null);
          await setUserSecurely(session?.user ?? null, 'auth_state_change_verified');
          setLoading(false);
        }
      );
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('AuthContext: Error setting up auth subscription:', error);
      setLoading(false);
    }
  }, [mounted, supabase.auth, validateSessionConsistency, setUserSecurely]);

  /**
   * Create memoized context value
   */
  const contextValue = useMemo(() => ({
    user,
    loading,
    error,
    offlineAvailable,
    sessionHealth,
    signOut,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    syncOfflineData,
    offlineStatus,
    clearError,
    retryAuthentication,
    isEmailVerified: user ? !!user.email_confirmed_at : false,
  }), [
    user, 
    loading, 
    error,
    offlineAvailable,
    sessionHealth,
    signOut, 
    signIn, 
    signUp, 
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    syncOfflineData,
    offlineStatus,
    clearError,
    retryAuthentication
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
