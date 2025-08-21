'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { ValidationError } from '@/lib/validation/errors';
import { 
  FormControl, 
  ErrorAlert, 
  FormSubmitButton 
} from '@/components/ui/form';
import { useZodForm } from '@/hooks/use-zod-form';
import { SignUpSchema } from '@/lib/validation/schemas';

export default function SignUp() {
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { signUp, error: authError, clearError } = useAuth();
  const router = useRouter();
  
  // Initialize the form with Zod validation
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors
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

  /**
   * Handle form submission with validation
   */
  const onSubmit = async (data: { 
    email: string; 
    password: string; 
    confirmPassword: string;
    full_name: string;
  }) => {
    // Clear any previous errors
    clearErrors();
    setGeneralError(null);
    if (authError) clearError();
    
    try {
      const { error, fieldErrors } = await signUp(
        data.email, 
        data.password,
        data.full_name,
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
        // Redirect to onboarding after successful signup
        setTimeout(() => {
          router.push('/onboarding');
        }, 2000);
      }
    } catch (err) {
      setGeneralError('An unexpected error occurred');
    }
  };

  // Success state with loading animation
  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Account created!</h2>
                <p className="text-gray-600 mb-4">
                  Welcome to PolyHarmony. Let's set up your profile.
                </p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link 
          href="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>
        
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription className="text-base">
              Join PolyHarmony and take control of your scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Display general form errors */}
              {(generalError || authError) && (
                <ErrorAlert 
                  message={generalError || authError || 'Account creation failed'} 
                  severity="error" 
                />
              )}
              
              <div className="space-y-4">
                <FormControl
                  name="full_name"
                  label="Full name"
                  error={errors.full_name?.message}
                  required
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      {...register('full_name')}
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                
                <FormControl
                  name="email"
                  label="Email address"
                  error={errors.email?.message}
                  required
                >
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                
                <FormControl
                  name="password"
                  label="Password"
                  error={errors.password?.message}
                  required
                >
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      {...register('password')}
                      type="password"
                      placeholder="Create a password (min. 8 characters)"
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                
                <FormControl
                  name="confirmPassword"
                  label="Confirm password"
                  error={errors.confirmPassword?.message}
                  required
                >
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      {...register('confirmPassword')}
                      type="password"
                      placeholder="Confirm your password"
                      className="pl-10"
                    />
                  </div>
                </FormControl>
              </div>
              
              <FormSubmitButton 
                isSubmitting={isSubmitting}
                loadingText="Creating account..."
                className="w-full"
                size="lg"
              >
                Create account
              </FormSubmitButton>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="font-medium text-primary hover:text-primary/80 transition-colors">
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