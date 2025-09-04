/**
 * Unified Authentication Context
 * 
 * This module provides a unified authentication context that combines
 * session management, security monitoring, and state consistency.
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode
} from 'react';
import { User, AuthChangeEvent, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { validateAuthSession, SessionValidationResult } from './session-manager';
import { createSupabaseClient } from '../supabase/client';
import { ValidationError, AuthError } from '../validation/errors';
import { 
  SignInSchema, 
  SignUpSchema, 
  PasswordResetSchema 
} from '../validation/schemas';

export interface AuthErrorResponse {
  error: AuthError | ValidationError | SupabaseAuthError | null;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export interface UnifiedAuthContextType {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  sessionHealth: 'healthy' | 'degraded' | 'failed';
  
  // Actions
  signIn: (email: string, password: string) => Promise<AuthErrorResponse>;
  signUp: (email: string, password: string, fullName: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, redirectTo?: string) => Promise<AuthErrorResponse>;
  updatePassword: (newPassword: string, confirmPassword: string) => Promise<AuthErrorResponse>;
  resendConfirmationEmail: (email?: string) => Promise<AuthErrorResponse>;
  
  // Session management
  validateSession: () => Promise<SessionValidationResult>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const UnifiedAuthContext = createContext<UnifiedAuthContextType | undefined>(undefined);

export function useUnifiedAuth(): UnifiedAuthContextType {
  const context = useContext(UnifiedAuthContext);
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  return context;
}

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export function UnifiedAuthProvider({ children }: UnifiedAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionHealth, setSessionHealth] = useState<'healthy' | 'degraded' | 'failed'>('healthy');
  
  const supabase = createSupabaseClient();

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Validate current session
   */
  const validateSession = useCallback(async (): Promise<SessionValidationResult> => {
    const validation = await validateAuthSession();
    setSessionHealth(validation.contextIntegrity);
    return validation;
  }, []);

  /**
   * Refresh current session
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        setSessionHealth('failed');
        setError(error.message);
        return;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        setSessionHealth('healthy');
      }
    } catch (error: any) {
      console.error('Session refresh error:', error);
      setSessionHealth('failed');
      setError(error.message || 'Session refresh failed');
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate inputs
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
        return { error: authError };
      }
      
      setLoading(false);
      return { error: null };
    } catch (error: any) {
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
   * Sign up new user
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
      // Validate inputs
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
   * Sign out
   */
  const signOut = useCallback(async () => {
    clearError();
    setLoading(true);
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, clearError]);

  /**
   * Reset password
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
      
      // Request password reset
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(), 
        { redirectTo: redirectTo || `${window.location.origin}/auth/update-password` }
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
   * Update password
   */
  const updatePassword = useCallback(async (
    newPassword: string, 
    confirmPassword: string
  ): Promise<AuthErrorResponse> => {
    clearError();
    setLoading(true);
    
    try {
      // Validate passwords
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

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session) {
            const validation = await validateSession();
            if (validation.valid) {
              setSession(session);
              setUser(session.user);
              setSessionHealth(validation.contextIntegrity);
            } else {
              setSessionHealth('failed');
              setError('Session validation failed');
            }
          }
          setLoading(false);
        }
      } catch (error: any) {
        if (mounted) {
          console.error('Auth initialization error:', error);
          setError(error.message || 'Authentication initialization failed');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        console.log('Auth state change:', event, { hasSession: !!session });
        
        if (session) {
          const validation = await validateSession();
          if (validation.valid) {
            setSession(session);
            setUser(session.user);
            setSessionHealth(validation.contextIntegrity);
          } else {
            setSessionHealth('failed');
            setError('Session validation failed');
          }
        } else {
          setSession(null);
          setUser(null);
          setSessionHealth('healthy');
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth, validateSession]);

  const value: UnifiedAuthContextType = {
    user,
    session,
    loading,
    error,
    sessionHealth,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmationEmail,
    validateSession,
    refreshSession,
    clearError
  };

  return (
    <UnifiedAuthContext.Provider value={value}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}