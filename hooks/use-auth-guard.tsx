import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

/**
 * Authentication guard hook that ensures users are authenticated before viewing protected pages
 * 
 * @param redirectTo - Path to redirect to if not authenticated (default: '/auth/signin')
 * @returns Object containing authentication state and loading status
 */
export function useAuthGuard(redirectTo: string = '/auth/signin') {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we've finished loading and there's no user
    if (!authLoading && !user) {
      router.push(redirectTo);
    }
  }, [authLoading, user, router, redirectTo]);

  // Return loading state while auth is being checked
  if (authLoading) {
    return {
      isAuthenticated: false,
      isLoading: true,
      user: null,
    };
  }

  // Return not authenticated if no user (this should trigger redirect)
  if (!user) {
    return {
      isAuthenticated: false,
      isLoading: false,
      user: null,
    };
  }

  // User is authenticated
  return {
    isAuthenticated: true,
    isLoading: false,
    user,
  };
}

/**
 * Component wrapper for authentication guard
 * Renders loading spinner while checking auth and prevents content flash
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthGuard();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Prevent rendering content if not authenticated
  // The redirect will happen via the hook's useEffect
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
