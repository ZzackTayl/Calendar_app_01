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
  const { signIn, resetPassword, error: authError, clearError } = useAuth();
  const router = useRouter();
  
  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Initialize the form with Zod validation
  const { 
    control,
    handleSubmit, 
    formState: { errors, isSubmitting },
    getValues,
    setError: setFormError,
    clearErrors
  } = useZodForm({
    schema: SignInSchema,
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onBlur',
  });

  /**
   * Handle form submission with validation
   */
  const onSubmit = async (data: { email: string; password: string }) => {
    
    // Clear any previous errors
    clearErrors();
    setGeneralError(null);
    if (authError) clearError();
    
    try {
      const { error, fieldErrors } = await signIn(data.email, data.password);
      
      if (error) {
        // Handle validation errors
        if (error instanceof ValidationError && fieldErrors) {
          // Set field-specific errors
          Object.entries(fieldErrors).forEach(([field, message]) => {
            setFormError(field as any, { message });
          });
          return;
        }
        
        // Handle general auth errors
        setGeneralError(error.message || 'Authentication failed');
      } else {
        // Success - redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      setGeneralError('An unexpected error occurred');
    }
  };

  /**
   * Handle password reset request
   */
  const handleReset = async () => {
    const email = getValues('email');
    
    if (!email) {
      setFormError('email', { 
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

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-background text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link 
          href="/"
          className="inline-flex items-center text-sm text-primary mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>
        
        <Card className="border-border shadow-xl bg-card/80 backdrop-blur text-foreground">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Sign in to your PolyHarmony account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...{ control, handleSubmit, formState: { errors, isSubmitting }, getValues, setError: setFormError, clearErrors }}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Display general form errors */}
                {(generalError || authError) && (
                  <ErrorAlert 
                    message={generalError || authError || 'Authentication failed'} 
                    severity="error" 
                  />
                )}
                
                <div className="space-y-4">
                  <FormField
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter your email"
                              className="pl-10"
                            />
                          </div>
                        </FormControl>
                        {errors.email?.message && (
                          <FormMessage>{errors.email.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter your password"
                              className="pl-10"
                            />
                          </div>
                        </FormControl>
                        {errors.password?.message && (
                          <FormMessage>{errors.password.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormSubmitButton 
                  isSubmitting={isSubmitting}
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