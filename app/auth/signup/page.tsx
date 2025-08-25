'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Lock, User, Users } from 'lucide-react';
import Link from 'next/link';
import { ValidationError } from '@/lib/validation/errors';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { ErrorAlert } from '@/components/ui/form/error-alert';
import { FormSubmitButton } from '@/components/ui/form/form-submit-button';
import { useZodForm } from '@/hooks/use-zod-form';
import { SignUpSchema } from '@/lib/validation/schemas';

function SignUpForm() {
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [invitationContext, setInvitationContext] = useState<{
    token?: string;
    email?: string;
    type?: 'individual' | 'group';
  }>({});
  const { signUp, error: authError, clearError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Ensure we're on the client side and check for invitation context
  useEffect(() => {
    setIsClient(true);
    
    // Check for invitation parameters
    const invitationToken = searchParams.get('invitation_token');
    const email = searchParams.get('email');
    const invitationType = searchParams.get('type') as 'individual' | 'group' | null;
    
    if (invitationToken) {
      setInvitationContext({
        token: invitationToken,
        email: email || undefined,
        type: invitationType || undefined
      });
    }
  }, [searchParams]);
  
  // Initialize the form with Zod validation
  const { 
    control,
    handleSubmit, 
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
    setValue
  } = useZodForm({
    schema: SignUpSchema,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
    },
    mode: 'onBlur',
  });

  // Pre-fill email from invitation context
  useEffect(() => {
    if (invitationContext.email && isClient) {
      setValue('email', invitationContext.email);
    }
  }, [invitationContext.email, isClient, setValue]);

  /**
   * Handle form submission with validation
   */
  const onSubmit = async (data: { 
    email: string; 
    password: string; 
    confirmPassword: string;
    full_name?: string;
  }) => {
    // Clear any previous errors
    clearErrors();
    setGeneralError(null);
    if (authError) clearError();
    
    try {
      const { error, fieldErrors } = await signUp(
        data.email, 
        data.password,
        data.full_name || '',
        data.confirmPassword
      );
      
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
        setGeneralError(error.message || 'Account creation failed');
      } else {
        // Success
        setSuccess(true);
        // If there's an invitation token, we'll handle it after email confirmation
        if (invitationContext.token) {
          // Store invitation context for later use
          localStorage.setItem('pendingInvitation', JSON.stringify(invitationContext));
        }
        // Don't redirect - user needs to confirm email first
      }
    } catch (err) {
      setGeneralError('An unexpected error occurred');
    }
  };

  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-background text-foreground">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-border shadow-xl bg-card/80 backdrop-blur">
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

  // Success state with loading animation
  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-background text-foreground">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-border shadow-xl bg-card/80 backdrop-blur">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h2>
                <p className="text-gray-600 mb-4">
                  We&apos;ve sent you a confirmation email. Please click the link in the email to verify your account before signing in.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Next steps:</strong>
                  </p>
                  <ol className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>1. Check your email inbox (and spam folder)</li>
                    <li>2. Click the confirmation link in the email</li>
                    <li>3. Return here to sign in</li>
                  </ol>
                </div>
                <Link 
                  href="/auth/signin"
                  className="inline-flex items-center text-sm text-primary hover:text-primary/80"
                >
                  ← Back to sign in
                </Link>
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
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>
        
        <Card className="border-border shadow-xl bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {invitationContext.token ? 'Join the invitation' : 'Create your account'}
            </CardTitle>
            <CardDescription className="text-base">
              {invitationContext.token 
                ? 'Create your account to accept the invitation'
                : 'Join PolyHarmony and take control of your scheduling'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Display invitation context */}
              {invitationContext.token && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    {invitationContext.type === 'group' ? (
                      <Users className="w-5 h-5 text-blue-600 mr-2" />
                    ) : (
                      <Mail className="w-5 h-5 text-blue-600 mr-2" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">
                        {invitationContext.type === 'group' ? 'Group invitation' : 'Friend invitation'}
                      </p>
                      <p className="text-blue-600">
                        Creating an account will automatically accept the invitation
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Display general form errors */}
              {(generalError || authError) && (
                <ErrorAlert 
                  message={generalError || authError || 'Account creation failed'} 
                  severity="error" 
                />
              )}
              
              <div className="space-y-4">
                <FormField
                  control={control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            {...field}
                            type="text"
                            placeholder="Enter your full name"
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      {errors.full_name?.message && (
                        <FormMessage>{errors.full_name.message}</FormMessage>
                      )}
                    </FormItem>
                  )}
                />
                
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
                            disabled={!!invitationContext.email}
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
                            placeholder="Create a password (min. 8 characters)"
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
                
                <FormField
                  control={control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="Confirm your password"
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      {errors.confirmPassword?.message && (
                        <FormMessage>{errors.confirmPassword.message}</FormMessage>
                      )}
                    </FormItem>
                  )}
                />
              </div>
              
              <FormSubmitButton 
                isSubmitting={isSubmitting}
                loadingText={invitationContext.token ? "Creating account & accepting invitation..." : "Creating account..."}
                className="w-full"
                size="lg"
              >
                {invitationContext.token ? "Create account & accept invitation" : "Create account"}
              </FormSubmitButton>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  href={invitationContext.token 
                    ? `/auth/signin?invitation_token=${invitationContext.token}`
                    : "/auth/signin"
                  } 
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-background text-foreground">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-border shadow-xl bg-card/80 backdrop-blur">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}