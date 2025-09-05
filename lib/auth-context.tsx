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
import { 
  validateSession, 
  refreshSession, 
  terminateSession,
  type SessionValidationResult 
} from './auth/session-validation';
import { 
  logAuthBypassAttempt,
  logSessionValidationFailure,
  logDemoModeEvent,
  securityLogger
} from './security/event-logger';
import { 
  logAuthenticationAttempt,
  logSessionCreation,
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
   * SECURITY: Mandatory server-side session validation
   * Uses comprehensive session validation service with security checks
   */
  const validateSessionConsistency = useCallback(async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) return true; // No user to validate
    
    try {
      console.log('AuthContext: SECURITY: Starting mandatory server-side session validation');
      
      // SECURITY: Use mandatory server-side validation service
      const validationResult: SessionValidationResult = await validateSession();
      
      // Handle validation result based on security action
      switch (validationResult.action) {
        case 'terminate':
          console.error('AuthContext: SECURITY: Session validation failed - terminating session', {
            error: validationResult.error,
            securityAlerts: validationResult.securityAlerts
          });
          
          // Log security event
          logSessionValidationFailure({
            userId: currentUser.id,
            error: validationResult.error || 'Session validation failed',
            validationType: 'mandatory_server_validation',
            securityAlerts: validationResult.securityAlerts
          });
          
          setSessionHealth('failed');
          
          // Force session termination
          await terminateSession();
          return false;
          
        case 'refresh':
          console.warn('AuthContext: SECURITY: Session requires refresh', {
            securityAlerts: validationResult.securityAlerts
          });
          setSessionHealth('degraded');
          
          // Session was refreshed by validation service
          if (validationResult.isValid && validationResult.user) {
            console.log('AuthContext: Session validation successful after refresh');
            return true;
          } else {
            console.error('AuthContext: Session refresh failed during validation');
            await terminateSession();
            return false;
          }
          
        case 'allow':
          // Validate user consistency with current user
          if (validationResult.user && validationResult.user.id !== currentUser.id) {
            console.error('AuthContext: SECURITY: User ID mismatch detected in validation', {
              originalId: currentUser.id,
              validatedId: validationResult.user.id,
              timestamp: new Date().toISOString()
            });
            
            // Log critical security event
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
          
          // Check for security alerts
          if (validationResult.securityAlerts.length > 0) {
            console.warn('AuthContext: SECURITY: Session validation completed with alerts', {
              alerts: validationResult.securityAlerts
            });
            setSessionHealth('degraded');
          } else {
            setSessionHealth('healthy');
          }
          
          console.log('AuthContext: SECURITY: Mandatory session validation successful', {
            userId: validationResult.user?.id,
            email: validationResult.user?.email,
            emailVerified: !!validationResult.user?.email_confirmed_at,
            securityAlerts: validationResult.securityAlerts.length
          });
          
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
      
      // Force termination on any validation error
      try {
        await terminateSession();
      } catch (terminateError) {
        console.error('AuthContext: Error during forced termination:', terminateError);
      }
      
      return false;
    }
  }, []);

  /**
   * Retry authentication with mandatory validation and error recovery
   */
  const retryAuthentication = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext: SECURITY: Retrying authentication with mandatory validation...');
      
      // SECURITY: Use mandatory server-side validation service
      const validationResult = await validateSession();
      
      if (!validationResult.isValid) {
        console.warn('AuthContext: SECURITY: Authentication retry failed validation:', {
          error: validationResult.error,
          securityAlerts: validationResult.securityAlerts
        });
        
        // Force cleanup on validation failure
        await terminateSession();
        setSessionHealth('failed');
        setUser(null);
        setError(validationResult.error || 'Authentication validation failed');
        setLoading(false);
        return;
      }
      
      // Handle validation result
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
          setSessionHealth('failed');
          setUser(null);
          setError('Session security validation failed');
          console.error('AuthContext: SECURITY: Authentication retry terminated due to security concerns');
          break;
      }
    } catch (error: any) {
      console.error('AuthContext: SECURITY: Authentication retry error:', error);
      
      // Force cleanup on any error
      try {
        await terminateSession();
      } catch (terminateError) {
        console.error('AuthContext: Error during forced termination in retry:', terminateError);
      }
      
      setSessionHealth('failed');
      setError(error.message || 'Authentication retry failed');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [validateSessionConsistency, setUserSecurely]);

  /**
   * SECURITY: Validate and set user with mandatory server-side validation and comprehensive security checks
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

    // SECURITY: Skip validation for demo mode but log the bypass
    if (context.includes('demo')) {
      console.warn('AuthContext: SECURITY: Bypassing validation for demo mode', { context });
      setUser(newUser);
      setStoredUser(newUser);
      return;
    }

    // SECURITY: Mandatory server-side session validation before setting user
    console.log('AuthContext: SECURITY: Performing mandatory validation before setting user');
    const isValidSession = await validateSessionConsistency(newUser);
    
    if (!isValidSession) {
      console.error('AuthContext: SECURITY: Mandatory validation failed - rejecting user', {
        userId: newUser.id,
        context
      });
      
      // Force sign out and clear state
      try {
        await terminateSession();
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
    
    // Handle security alerts
    if (securityResult.action === 'terminate') {
      console.error('AuthContext: SECURITY: Session terminated due to security alerts', securityResult.alerts);
      auditSessionSecurity(newUser.id, 'security_alert', { 
        alerts: securityResult.alerts, 
        action: 'terminated',
        context 
      });
      
      // Force sign out due to security concerns
      await terminateSession();
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
  }, [storedUser, validateSessionConsistency]);

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
    
    const currentUserId = user?.id;
    
    try {
      // Log session termination before signing out
      if (currentUserId) {
        logSessionTermination({
          userId: currentUserId,
          sessionId: 'manual_signout',
          reason: 'logout'
        });
      }
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Non-critical error, don't surface to user
    } finally {
      setLoading(false);
      setDemoMode(false);
    }
  }, [supabase.auth, clearError, user?.id]);

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
      
      // Log authentication attempt
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
        
        // Provide helpful message for unconfirmed email
        if (authError.message.includes('Email not confirmed')) {
          return { 
            error: new AuthError('Please check your email and click the confirmation link to verify your account before signing in. Check your spam folder if you don\'t see the email.'),
            message: 'Please check your email and click the confirmation link to verify your account before signing in. Check your spam folder if you don\'t see the email.'
          };
        }
        
        return { error: authError };
      }
      
      // Log session creation if successful
      if (data.session && data.user) {
        logSessionCreation({
          userId: data.user.id,
          sessionId: data.session.access_token.substring(0, 16), // Use part of token as session ID
          expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
          method: 'password'
        });
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
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { 
          data: { full_name: fullName.trim() } 
        },
      });
      
      // Log authentication attempt for sign up
      logAuthenticationAttempt({
        email: email.trim().toLowerCase(),
        method: 'password',
        outcome: authError ? 'failure' : 'success',
        failureReason: authError?.message,
        userId: data.user?.id
      });
      
      // Log user account creation if successful
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
   * SECURITY: Strict production controls - demo mode is DISABLED in production unless explicitly configured
   */
  const enableDemoMode = useCallback(async () => {
    // SECURITY: Strict production environment check
    const isDevelopment = process.env.NODE_ENV === 'development';
    const hasExplicitDemoConfig = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // SECURITY: Block demo mode completely in production unless explicitly configured
    if (isProduction && !hasExplicitDemoConfig) {
      console.error('AuthContext: SECURITY: Demo mode is DISABLED in production environment');
      console.error('AuthContext: SECURITY: To enable demo mode in production, set NEXT_PUBLIC_ENABLE_DEMO_MODE=true');
      
      // Log security event
      logDemoModeEvent({
        action: 'blocked',
        environment: 'production',
        hasExplicitConfig: false,
        reason: 'Demo mode blocked in production without explicit configuration'
      });
      
      setError('Demo mode is not available in production');
      return;
    }
    
    // SECURITY: Additional validation for development
    if (!isDevelopment && !hasExplicitDemoConfig) {
      console.error('AuthContext: SECURITY: Demo mode not allowed without explicit configuration');
      
      // Log security event
      logDemoModeEvent({
        action: 'blocked',
        environment: process.env.NODE_ENV || 'unknown',
        hasExplicitConfig: false,
        reason: 'Demo mode blocked without explicit configuration'
      });
      
      setError('Demo mode is not configured for this environment');
      return;
    }
    
    // SECURITY: Log demo mode activation for audit trail
    console.warn('AuthContext: SECURITY: Demo mode being activated', {
      environment: process.env.NODE_ENV,
      hasExplicitConfig: hasExplicitDemoConfig,
      timestamp: new Date().toISOString()
    });
    
    // Log security event
    logDemoModeEvent({
      action: 'activated',
      environment: process.env.NODE_ENV || 'unknown',
      hasExplicitConfig: hasExplicitDemoConfig
    });
    
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

    // Skip security checks for demo mode but log the bypass
    console.warn('AuthContext: SECURITY: Bypassing security checks for demo mode');
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

    console.log('AuthContext: Demo mode enabled with security controls');
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
        // SECURITY: Strict demo mode controls - DISABLED in production by default
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isProduction = process.env.NODE_ENV === 'production';
        const hasDemoFlag = typeof window !== 'undefined' && localStorage.getItem('ph_demo_enabled') === '1';
        const hasExplicitDemoConfig = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
        
        // SECURITY: Force clear demo mode in production unless explicitly configured
        if (isProduction && !hasExplicitDemoConfig) {
          if (hasDemoFlag) {
            console.error('AuthContext: SECURITY: Clearing unauthorized demo mode in production');
            localStorage.removeItem('ph_demo_enabled');
            localStorage.removeItem('ph_demo_version');
            localStorage.removeItem('ph_demo_events');
            localStorage.removeItem('ph_demo_relationships');
            localStorage.removeItem('ph_demo_contacts');
            localStorage.removeItem('ph_demo_groups');
          }
          // Continue with normal auth flow - no demo mode in production
        } else if (isDevelopment && hasDemoFlag) {
          console.log('AuthContext: Enabling demo mode (development environment)');
          enableDemoMode();
          setLoading(false);
          return;
        } else if (isProduction && hasExplicitDemoConfig && hasDemoFlag) {
          console.warn('AuthContext: SECURITY: Enabling demo mode in production (explicitly configured)');
          enableDemoMode();
          setLoading(false);
          return;
        }

        // SECURITY: Force clear all existing sessions in production to require fresh authentication
        if (isProduction) {
          console.log('AuthContext: SECURITY: Clearing all existing sessions in production to force re-authentication');
          await supabase.auth.signOut();
          await setUserSecurely(null, 'production_forced_signout');
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