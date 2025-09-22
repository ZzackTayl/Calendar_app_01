'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import Link from 'next/link';
import { ValidationError } from '@/lib/validation/errors';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form
} from '@/components/ui/form';
import { ErrorAlert } from '@/components/ui/form/error-alert';
import { FormSubmitButton } from '@/components/ui/form/form-submit-button';
import { useZodForm } from '@/hooks/use-zod-form';
import { SignInSchema } from '@/lib/validation/schemas';

export default function SignIn() {
  const [resetSent, setResetSent] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { signIn, resetPassword, error: authError, clearError, user } = useAuth();
  const router = useRouter();
  
  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // If user is already authenticated, redirect them appropriately
  useEffect(() => {
    console.log('[SIGNIN-DEBUG] User state changed', {
      hasUser: !!user,
      isEmailVerified: !!user?.email_confirmed_at,
      currentPath: window.location.pathname,
      searchParams: window.location.search,
      timestamp: new Date().toISOString()
    });

    if (user && user.email_confirmed_at) {
      const urlParams = new URLSearchParams(window.location.search);
      const next = urlParams.get('next');
      console.log('[SIGNIN-DEBUG] Redirecting authenticated user', {
        next,
        defaultPath: '/dashboard'
      });
      if (next && next.startsWith('/')) {
        router.push(next);
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);
  
  // Initialize the form with Zod validation
  const form = useZodForm({
    schema: SignInSchema,
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  /**
   * Handle resending confirmation email
   */
  const handleResendConfirmation = async (email: string) => {
    setIsResendingConfirmation(true);
    setResendMessage(null);
    
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage({
          type: 'success',
          text: 'Confirmation email sent! Please check your inbox and spam folder.'
        });
      } else {
        setResendMessage({
          type: 'error',
          text: data.message || 'Failed to resend confirmation email. Please try again.'
        });
      }
    } catch (error) {
      setResendMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  /**
   * Handle form submission with validation
   */
  const onSubmit = async (data: { email: string; password: string }) => {
    console.log('[SIGNIN-DEBUG] Starting form submission', {
      email: data.email,
      hasPassword: !!data.password,
      timestamp: new Date().toISOString()
    });

    // Clear any previous errors
    form.clearErrors();
    setGeneralError(null);
    if (authError) clearError();

    try {
      console.log('[SIGNIN-DEBUG] Calling signIn function');
      const { error, fieldErrors } = await signIn(data.email, data.password);

      console.log('[SIGNIN-DEBUG] SignIn result:', {
        hasError: !!error,
        errorMessage: error?.message,
        hasFieldErrors: !!fieldErrors,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.log('[SIGNIN-DEBUG] Handling error state', {
          errorType: error.constructor.name,
          isValidationError: error instanceof ValidationError,
          message: error.message
        });

        // Handle validation errors
        if (error instanceof ValidationError && fieldErrors) {
          console.log('[SIGNIN-DEBUG] Setting field errors:', fieldErrors);
          // Set field-specific errors
          Object.entries(fieldErrors).forEach(([field, message]) => {
            form.setError(field as any, { message });
          });
          return;
        }

        // Handle general auth errors with specific messaging for email verification
        if (error.message && (error.message.includes('confirmation') || error.message.includes('Email not confirmed'))) {
          console.log('[SIGNIN-DEBUG] Setting email confirmation error');
          setGeneralError(error.message);
          setShowResendConfirmation(true);
        } else {
          console.log('[SIGNIN-DEBUG] Setting general auth error');
          setGeneralError(error.message || 'Authentication failed');
          setShowResendConfirmation(false);
        }
      } else {
        console.log('[SIGNIN-DEBUG] Sign in successful, waiting for auth state change');
        // Success - wait for auth state (onAuthStateChange) to update
        // The effect watching `user` will perform the redirect.
      }
    } catch (err) {
      console.error('[SIGNIN-DEBUG] Unexpected error during sign in:', err);
      setGeneralError('An unexpected error occurred');
    }
  };

  /**
   * Handle password reset request
   */
  const handleReset = async () => {
    const email = form.getValues('email');
    
    if (!email) {
      form.setError('email', { 
        type: 'manual',
        message: 'Enter your email above, then tap "Forgot password?"' 
      });
      return;
    }
    
    setGeneralError(null);
    if (authError) clearError();
    
    const { error } = await resetPassword(email);
    
    if (error) {
      setGeneralError(error.message || 'Could not send reset email');
    } else {
      setResetSent(true);
    }
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Log form field attributes for autocomplete debugging
  console.log('[AUTOFILL-DEBUG] Signin form fields rendered:', {
    emailField: {
      id: 'email',
      type: 'email',
      hasAutocomplete: document.getElementById('email')?.hasAttribute('autocomplete'),
      autocompleteValue: document.getElementById('email')?.getAttribute('autocomplete')
    },
    passwordField: {
      id: 'password',
      type: 'password',
      hasAutocomplete: document.getElementById('password')?.hasAttribute('autocomplete'),
      autocompleteValue: document.getElementById('password')?.getAttribute('autocomplete')
    },
    timestamp: new Date().toISOString()
  });

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-background text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link 
          href="/"
          className="inline-flex items-center text-sm text-primary mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to homepage
        </Link>
        
        <Card className="border-border shadow-xl bg-card/80 backdrop-blur text-foreground">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Sign in to your PolyHarmony account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Show helpful message if user was redirected from a protected route */}
            {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('next') && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">
                  Please sign in to access that page.
                </p>
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Display general form errors */}
                {(generalError || authError) && (
                  <ErrorAlert 
                    message={generalError || authError || 'Authentication failed'} 
                    severity="error" 
                  />
                )}
                
                {/* Show resend confirmation option for unconfirmed users */}
                {showResendConfirmation && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 mb-3">
                          Your email hasn&apos;t been confirmed yet. Click the button below to send a new confirmation email.
                        </p>
                        
                        {resendMessage && (
                          <div className={`mb-3 p-2 rounded text-xs ${
                            resendMessage.type === 'success' 
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {resendMessage.text}
                          </div>
                        )}
                        
                        <Button
                          type="button"
                          onClick={() => handleResendConfirmation(form.getValues('email'))}
                          disabled={isResendingConfirmation || !form.getValues('email')}
                          size="sm"
                          variant="outline"
                          className="w-full bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                        >
                          {isResendingConfirmation ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-600 mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3 mr-2" />
                              Resend Confirmation Email
                            </>
                          )}
                        </Button>
                        
                        {!form.getValues('email') && (
                          <p className="text-xs text-amber-600 mt-1">
                            Please enter your email address above first
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="email">Email address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                               {...field}
                               id="email"
                               type="email"
                               placeholder="Enter your email"
                               className="pl-10"
                               autoComplete="email"
                             />
                          </div>
                        </FormControl>
                        {form.formState.errors.email?.message && (
                          <FormMessage>{form.formState.errors.email.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="password">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                               {...field}
                               id="password"
                               type="password"
                               placeholder="Enter your password"
                               className="pl-10"
                               autoComplete="current-password"
                             />
                          </div>
                        </FormControl>
                        {form.formState.errors.password?.message && (
                          <FormMessage>{form.formState.errors.password.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormSubmitButton 
                  isSubmitting={form.formState.isSubmitting}
                  loadingText="Signing in..."
                  className="w-full"
                  size="lg"
                >
                  Sign in
                </FormSubmitButton>

                <div className="text-center mt-3 text-sm">
                  <button 
                    type="button"
                    onClick={handleReset}
                    className="text-primary hover:text-primary/80"
                  >
                    Forgot password?
                  </button>
                  {resetSent && (
                    <p className="text-xs text-green-600 mt-2">
                      Reset link sent. Check your email.
                    </p>
                  )}
                </div>
              </form>
            </Form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}