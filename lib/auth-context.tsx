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
  
  // Demo mode helpers
  enableDemoMode: () => void;
  demo: {
    seed: () => void;
    reset: () => void;
  };
  
  // Error handling
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Clear any auth errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
      
      // CRITICAL SECURITY CHECK: Verify email confirmation status
      if (data.user && !data.user.email_confirmed_at) {
        console.warn('Security: Blocking sign-in for unverified user:', data.user.email);
        
        // Sign out the user immediately to clear any session
        await supabase.auth.signOut();
        
        const errorMessage = 'Please check your email and click the confirmation link to verify your account before signing in. Check your spam folder if you don\'t see the email.';
        setError(errorMessage);
        setLoading(false);
        
        return { 
          error: new AuthError(errorMessage),
          message: errorMessage
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
   * Enable Demo Mode
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

    // Persist demo flag - only on client side
    if (typeof window !== 'undefined') {
      localStorage.setItem('ph_demo_enabled', '1');
      
      // Seed if empty
      const existing = localStorage.getItem('ph_demo_version');
      if (!existing) {
        DemoStore.seedSampleData('demo-user');
      }
    }
  }, [clearError]);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    if (!mounted) return;
    
    const init = async () => {
      try {
        // Check for demo mode first - client-side only
        if (typeof window !== 'undefined' && localStorage.getItem('ph_demo_enabled') === '1') {
          enableDemoMode();
          setLoading(false);
          return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error getting user:', error);
          // Don't throw error for missing session, just set user to null
          if (error.message.includes('Auth session missing')) {
            setUser(null);
          } else {
            console.error('AuthContext: Unexpected error getting user:', error);
          }
        } else {
          setUser(user);
        }
      } catch (error) {
        console.error('Fatal auth error:', error);
        // Set user to null on any error to prevent crashes
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, session: Session | null) => {
          // CRITICAL SECURITY CHECK: Verify email confirmation on auth state change
          if (session?.user && !session.user.email_confirmed_at) {
            console.warn('Security: Unverified user detected in auth state change, signing out:', session.user.email);
            
            // Clear the session immediately
            await supabase.auth.signOut();
            setUser(null);
            setError('Please check your email and click the confirmation link to verify your account before signing in.');
            setLoading(false);
            return;
          }
          
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );
      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Error setting up auth subscription:', error);
      setLoading(false);
    }
  }, [mounted, supabase.auth, enableDemoMode]);

  /**
   * Create memoized context value
   */
  const contextValue = useMemo(() => ({
    user,
    loading,
    error,
    demoMode,
    signOut,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    enableDemoMode,
    clearError,
    demo: { seed: demoSeed, reset: demoReset },
  }), [
    user, 
    loading, 
    error,
    demoMode, 
    signOut, 
    signIn, 
    signUp, 
    resetPassword,
    updatePassword,
    enableDemoMode,
    clearError,
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