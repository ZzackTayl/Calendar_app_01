'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, LogIn, RefreshCw, Home } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isTokenExpired: boolean;
  isSessionInvalid: boolean;
}

export interface AuthErrorBoundaryProps {
  children: ReactNode;
  onAuthError?: (error: Error) => void;
  redirectToLogin?: boolean;
  user?: any; // User object from auth context
}

class AuthErrorBoundaryClass extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isTokenExpired: false,
      isSessionInvalid: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    const isAuthError = AuthErrorBoundaryClass.isAuthError(error);
    const isTokenExpired = AuthErrorBoundaryClass.isTokenExpired(error);
    const isSessionInvalid = AuthErrorBoundaryClass.isSessionInvalid(error);

    return {
      hasError: true,
      error,
      isTokenExpired,
      isSessionInvalid,
    };
  }

  static isAuthError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    return (
      message.includes('auth') ||
      message.includes('token') ||
      message.includes('session') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('401') ||
      message.includes('403') ||
      stack.includes('auth') ||
      stack.includes('token') ||
      stack.includes('session')
    );
  }

  static isTokenExpired(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return (
      message.includes('token expired') ||
      message.includes('expired token') ||
      message.includes('invalid token') ||
      message.includes('token invalid') ||
      message.includes('jwt expired') ||
      message.includes('expired jwt')
    );
  }

  static isSessionInvalid(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    return (
      message.includes('session invalid') ||
      message.includes('invalid session') ||
      message.includes('session expired') ||
      message.includes('no session') ||
      message.includes('session not found')
    );
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log auth-specific errors
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);

    // Call parent error handler if provided
    if (this.props.onAuthError) {
      this.props.onAuthError(error);
    }

    // Auto-redirect to login if configured
    if (this.props.redirectToLogin && this.isAuthError(error)) {
      setTimeout(() => {
        window.location.href = '/auth/signin';
      }, 2000);
    }
  }

  private isAuthError(error: Error): boolean {
    return AuthErrorBoundaryClass.isAuthError(error);
  }

  private handleSignIn = () => {
    window.location.href = '/auth/signin';
  };

  private handleRefreshToken = async () => {
    try {
      // Attempt to refresh the token
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        // Token refreshed successfully, retry the operation
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isTokenExpired: false,
          isSessionInvalid: false,
        });
      } else {
        // Token refresh failed, redirect to login
        this.handleSignIn();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.handleSignIn();
    }
  };

  private handleGoHome = () => {
    // For unauthenticated users, go to landing page
    // For authenticated users, go to dashboard
    if (this.props.user) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/';
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isTokenExpired: false,
      isSessionInvalid: false,
    });
  };

  private getErrorMessage(): string {
    const { isTokenExpired, isSessionInvalid } = this.state;

    if (isTokenExpired) {
      return 'Your session has expired. Please sign in again to continue.';
    }

    if (isSessionInvalid) {
      return 'Your session is invalid. Please sign in again.';
    }

    return 'Authentication error occurred. Please sign in again.';
  }

  private getErrorIcon() {
    const { isTokenExpired, isSessionInvalid } = this.state;

    if (isTokenExpired || isSessionInvalid) {
      return <Shield className="h-8 w-8 text-red-500" />;
    }

    return <Shield className="h-8 w-8 text-orange-500" />;
  }

  private getErrorActions() {
    const { isTokenExpired, isSessionInvalid } = this.state;

    return (
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {isTokenExpired && (
          <Button onClick={this.handleRefreshToken} variant="default" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Token
          </Button>
        )}
        
        <Button onClick={this.handleSignIn} variant="default" className="flex-1">
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </Button>
        
        <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
          <Home className="h-4 w-4 mr-2" />
          Go Home
        </Button>
        
        {!isTokenExpired && !isSessionInvalid && (
          <Button onClick={this.handleRetry} variant="outline" className="flex-1">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-200 bg-red-50/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {this.getErrorIcon()}
              </div>
              <CardTitle className="text-xl font-semibold">
                Authentication Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                {this.getErrorMessage()}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mt-4 p-3 bg-muted rounded-md">
                  <summary className="cursor-pointer font-medium mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs overflow-auto">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              {this.getErrorActions()}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to access auth context
export function AuthErrorBoundary(props: AuthErrorBoundaryProps) {
  const { user } = useAuth();
  
  return (
    <AuthErrorBoundaryClass 
      {...props} 
      user={user}
    />
  );
}
