'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { createSupabaseClient } from './supabase/client';
import { User, AuthChangeEvent, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { DemoStore } from './demo-store';
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

/**
 * AuthErrorResponse type
 */
interface AuthErrorResponse {
  error: SupabaseAuthError | Error | null;
  message?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Enhanced Auth Context Type
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  
  // Core auth actions
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthErrorResponse>;
  signUp: (email: string, password: string, fullName: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  resetPassword: (email: string, redirectTo?: string) => Promise<AuthErrorResponse>;
  updatePassword: (newPassword: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  resendConfirmationEmail: (email?: string) => Promise<AuthErrorResponse>;
  
  // Demo mode helpers
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  demo: {
    seed: () => void;
    reset: () => void;
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
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionHealth, setSessionHealth] = useState<'healthy' | 'degraded' | 'failed'>('healthy');
  const [storedUser, setStoredUser] = useState<User | null>(null); // For security comparison
  const [mounted, setMounted] = useState(false);
  
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Clear any auth errors and reset session health
   */
  const clearError = useCallback(() => {
    setError(null);
    setSessionHealth('healthy');
  }, []);

  /**
   * SECURITY: Session consistency validation
   * Validates auth state integrity and handles session refresh
   */
  const validateSessionConsistency = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) return true; // No user to validate
    
    try {
      // Validate user object integrity
      if (!currentUser.id || !currentUser.email) {
        console.error('AuthContext: SECURITY: Invalid user object detected', {
          hasId: !!currentUser.id,
          hasEmail: !!currentUser.email,
          timestamp: new Date().toISOString()
        });
        setSessionHealth('failed');
        return false;
      }

      // Validate session freshness by checking if we can still get user
      const { data: { user: freshUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.warn('AuthContext: Session validation failed, attempting refresh', error.message);
        
        // Try to refresh session
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !session) {
          console.error('AuthContext: Session refresh failed', refreshError?.message);
          setSessionHealth('failed');
          return false;
        }
        
        console.log('AuthContext: Session successfully refreshed');
        setSessionHealth('degraded'); // Refreshed but not optimal
        return true;
      }
      
      // Validate user consistency
      if (freshUser && freshUser.id !== currentUser.id) {
        console.error('AuthContext: SECURITY: User ID mismatch detected', {
          originalId: currentUser.id,
          freshId: freshUser.id,
          timestamp: new Date().toISOString()
        });
        setSessionHealth('failed');
        return false;
      }

      // Log successful validation for audit
      console.log('AuthContext: Session validation successful', {
        userId: currentUser.id,
        email: currentUser.email,
        emailVerified: !!currentUser.email_confirmed_at,
        timestamp: new Date().toISOString()
      });
      
      setSessionHealth('healthy');
      return true;
    } catch (error) {
      console.error('AuthContext: Session validation error:', error);
      setSessionHealth('failed');
      return false;
    }
  }, [supabase.auth]);

  /**
   * Retry authentication with error recovery
   */
  const retryAuthentication = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext: Retrying authentication...');
      
      // First try to get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('AuthContext: Session retrieval failed during retry:', sessionError.message);
        setSessionHealth('failed');
        setUser(null);
        setLoading(false);
        return;
      }
      
      if (!session?.user) {
        console.log('AuthContext: No session found during retry');
        setSessionHealth('healthy');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Validate the session
      const isValid = await validateSessionConsistency(session.user);
      if (isValid) {
        setUser(session.user);
        setSessionHealth('healthy');
        console.log('AuthContext: Authentication retry successful');
      } else {
        setSessionHealth('failed');
        setUser(null);
        console.warn('AuthContext: Authentication retry failed - invalid session');
      }
    } catch (error: any) {
      console.error('AuthContext: Authentication retry error:', error);
      setSessionHealth('failed');
      setError(error.message || 'Authentication retry failed');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, validateSessionConsistency]);

  /**
   * SECURITY: Validate and set user with comprehensive security checks
   */
  const setUserSecurely = useCallback(async (newUser: User | null, context: string = 'unknown') => {
    if (!newUser) {
      // Clear security data when user is null
      if (storedUser) {
        auditSessionSecurity(storedUser.id, 'logout', { context });
        clearSessionFingerprint(storedUser.id);
      }
      setUser(null);
      setStoredUser(null);
      return;
    }

    // Perform comprehensive security check
    const securityResult = performSecurityCheck(newUser.id, newUser, storedUser);
    
    // Handle security alerts
    if (securityResult.action === 'terminate') {
      console.error('AuthContext: SECURITY: Session terminated due to security alerts', securityResult.alerts);
      auditSessionSecurity(newUser.id, 'security_alert', { 
        alerts: securityResult.alerts, 
        action: 'terminated',
        context 
      });
      
      // Force sign out due to security concerns
      await supabase.auth.signOut();
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
    }

    // Update user states
    setUser(newUser);
    setStoredUser(newUser);
    
    console.log('AuthContext: User set securely', {
      userId: newUser.id,
      email: newUser.email,
      context,
      securityAlerts: securityResult.alerts.length,
      sessionHealth: securityResult.action === 'warn' ? 'degraded' : 'healthy'
    });
  }, [storedUser, supabase.auth]);

  /**
   * Demo helpers
   */
  const demoSeed = useCallback(() => {
    const demoUserId = 'demo-user';
    DemoStore.seedSampleData(demoUserId);
  }, []);

  const demoReset = useCallback(() => {
    DemoStore.reset();
  }, []);

  /**
   * Sign Out
   */
  const signOut = useCallback(async () => {
    clearError();
    setLoading(true);
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Non-critical error, don't surface to user
    } finally {
      setLoading(false);
      setDemoMode(false);
    }
  }, [supabase.auth, clearError]);

  /**
   * Sign In with email/password
   * With validation and error handling
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate inputs using Zod schema
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
      
      // Attempt authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        
        // Provide helpful message for unconfirmed email
        if (authError.message.includes('Email not confirmed')) {
          return { 
            error: new AuthError('Please check your email and click the confirmation link to verify your account before signing in. Check your spam folder if you don\'t see the email.'),
            message: 'Please check your email and click the confirmation link to verify your account before signing in. Check your spam folder if you don\'t see the email.'
          };
        }
        
        return { error: authError };
      }
      
      // SECURITY CHECK: Allow unverified users to stay logged in but don't set error
      // Let middleware handle redirects to avoid conflicting states
      if (data.user && !data.user.email_confirmed_at) {
        console.warn('Security: User signed in but email not verified:', data.user.email);
        
        // Clear any existing errors and let middleware handle the redirect
        setError(null);
        setLoading(false);
        
        // Return success - middleware will handle the verification flow
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
   * With validation and password confirmation
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
      // Validate inputs using Zod schema
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
      
      // Attempt sign up
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { 
          data: { full_name: fullName.trim() } 
        },
      });
      
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
   * With validation and confirmation
   */
  const updatePassword = useCallback(async (
    newPassword: string, 
    confirmPassword: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate passwords using Zod schema
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
      // Use provided email or current user's email
      const targetEmail = email || user?.email;
      
      // Validate email
      if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
        const fieldErrors = { email: 'Please enter a valid email address' };
        setError('Please enter a valid email address');
        setLoading(false);
        return { 
          error: new ValidationError('Invalid email', fieldErrors),
          fieldErrors
        };
      }

      // Call our API route to resend confirmation email
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
   * Enable Demo Mode
   */
  const enableDemoMode = useCallback(async () => {
    // SECURITY: Only allow demo mode in development or when explicitly configured
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasExplicitDemoConfig = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
    
    if (!isDevelopment && !hasExplicitDemoConfig) {
      console.error('AuthContext: Demo mode not allowed in production without explicit configuration');
      return;
    }
    
    clearError();
    setDemoMode(true);
    
    const demoUser = {
      id: 'demo-user',
      email: 'demo@example.com',
      user_metadata: { full_name: 'Demo User' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User;

    // Skip security checks for demo mode
    setUser(demoUser);
    setStoredUser(demoUser);

    // Persist demo flag - only on client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('ph_demo_enabled', '1');
      
      // Seed if empty
      const existing = localStorage.getItem('ph_demo_version');
      if (!existing) {
        DemoStore.seedSampleData('demo-user');
      }
    }

    console.log('AuthContext: Demo mode enabled');
  }, [clearError]);

  /**
   * Disable Demo Mode
   */
  const disableDemoMode = useCallback(async () => {
    clearError();
    setDemoMode(false);
    await setUserSecurely(null, 'demo_disabled');
    
    // Clear demo data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ph_demo_enabled');
      localStorage.removeItem('ph_demo_version');
      localStorage.removeItem('ph_demo_events');
      localStorage.removeItem('ph_demo_relationships');
      localStorage.removeItem('ph_demo_contacts');
      localStorage.removeItem('ph_demo_groups');
    }
    
    // Reset demo store
    DemoStore.reset();
    console.log('AuthContext: Demo mode disabled');
  }, [clearError, setUserSecurely]);

  /**
   * Initialize auth state with enhanced session validation
   */
  useEffect(() => {
    if (!mounted) return;
    
    const init = async () => {
      try {
        // SECURITY: Only enable demo mode in development or when explicitly configured
        const isDevelopment = process.env.NODE_ENV === 'development';
        const hasDemoFlag = typeof window !== 'undefined' && localStorage.getItem('ph_demo_enabled') === '1';
        const hasExplicitDemoConfig = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
        
        // Only enable demo mode if we're in development OR explicitly configured for production
        if (isDevelopment && hasDemoFlag) {
          console.log('AuthContext: Enabling demo mode (development environment)');
          enableDemoMode();
          setLoading(false);
          return;
        }
        
        // For production, only enable demo mode if explicitly configured
        if (!isDevelopment && hasExplicitDemoConfig && hasDemoFlag) {
          console.log('AuthContext: Enabling demo mode (production with explicit config)');
          enableDemoMode();
          setLoading(false);
          return;
        }
        
        // Clear any lingering demo flags in production unless explicitly configured
        if (!isDevelopment && !hasExplicitDemoConfig && hasDemoFlag) {
          console.warn('AuthContext: Clearing demo mode flag in production');
          localStorage.removeItem('ph_demo_enabled');
          localStorage.removeItem('ph_demo_version');
          localStorage.removeItem('ph_demo_events');
          localStorage.removeItem('ph_demo_relationships');
          localStorage.removeItem('ph_demo_contacts');
          localStorage.removeItem('ph_demo_groups');
        }

        // SECURITY: Force clear all existing sessions to require fresh authentication
        if (!isDevelopment) {
          console.log('AuthContext: Clearing all existing sessions to force re-authentication');
          await supabase.auth.signOut();
          await setUserSecurely(null, 'forced_signout');
          setLoading(false);
          return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('AuthContext: Error getting user:', error);
          // Don't throw error for missing session, just set user to null
          if (error.message.includes('Auth session missing')) {
            setUser(null);
          } else {
            console.error('AuthContext: Unexpected error getting user:', error);
          }
        } else if (user) {
          // SECURITY: Validate session consistency before setting user
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
        // Set user to null on any error to prevent crashes
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

          // Handle sign out
          if (event === 'SIGNED_OUT' || !session?.user) {
            await setUserSecurely(null, 'auth_state_change_signout');
            setError(null);
            setLoading(false);
            return;
          }

          // SECURITY: Validate session consistency for all auth changes
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

          // SECURITY CHECK: Handle unverified users gracefully
          if (session?.user && !session.user.email_confirmed_at) {
            console.warn('AuthContext: Unverified user detected in auth state change:', session.user.email);
            
            // Keep user logged in but don't set error - let middleware handle redirects
            await setUserSecurely(session.user, 'auth_state_change_unverified');
            setError(null); // Clear errors to prevent conflicts with middleware
            setLoading(false);
            return;
          }
          
          // Clear any error messages for verified users and set user securely
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
  }, [mounted, supabase.auth, enableDemoMode, validateSessionConsistency, setUserSecurely]);

  /**
   * Create memoized context value
   */
  const contextValue = useMemo(() => ({
    user,
    loading,
    error,
    demoMode,
    sessionHealth,
    signOut,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    enableDemoMode,
    disableDemoMode,
    clearError,
    retryAuthentication,
    demo: { seed: demoSeed, reset: demoReset },
    isEmailVerified: user ? !!user.email_confirmed_at : false,
  }), [
    user, 
    loading, 
    error,
    demoMode,
    sessionHealth,
    signOut, 
    signIn, 
    signUp, 
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    enableDemoMode,
    disableDemoMode,
    clearError,
    retryAuthentication,
    demoSeed, 
    demoReset
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
}