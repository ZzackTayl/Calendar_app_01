'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: any[];
  errorType?: 'page' | 'component' | 'realtime' | 'auth';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const keysChanged = this.props.resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      if (keysChanged) {
        this.resetError();
      }
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    try {
      // Send error to your error reporting service
      // Example: Sentry, LogRocket, etc.
      const errorData = {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // You can replace this with your actual error reporting service
      fetch('/api/error-reporting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    } catch (reportingError) {
      // Silently fail if error reporting fails
      console.warn('Failed to report error:', reportingError);
    }
  }

  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleRetry = () => {
    this.resetError();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorType(): string {
    const { error } = this.state;
    if (!error) return 'unknown';

    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('auth') || message.includes('token') || message.includes('session')) {
      return 'auth';
    }
    if (message.includes('realtime') || message.includes('subscription') || message.includes('websocket')) {
      return 'realtime';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('api')) {
      return 'network';
    }
    if (message.includes('component') || message.includes('render')) {
      return 'component';
    }

    return 'unknown';
  }

  private getErrorMessage(): string {
    const errorType = this.getErrorType();
    
    switch (errorType) {
      case 'auth':
        return 'Authentication error occurred. Please sign in again.';
      case 'realtime':
        return 'Real-time connection error. Your data may not be current.';
      case 'network':
        return 'Network error occurred. Please check your connection.';
      case 'component':
        return 'Component error occurred. Please try refreshing the page.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private getErrorIcon() {
    const errorType = this.getErrorType();
    
    switch (errorType) {
      case 'auth':
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      case 'realtime':
        return <RefreshCw className="h-8 w-8 text-orange-500" />;
      case 'network':
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case 'component':
        return <Bug className="h-8 w-8 text-blue-500" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
    }
  }

  private getErrorActions() {
    const errorType = this.getErrorType();
    
    return (
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button onClick={this.handleRetry} variant="default" className="flex-1">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        
        {errorType === 'auth' && (
          <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        )}
        
        <Button onClick={this.handleReload} variant="outline" className="flex-1">
          Reload Page
        </Button>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {this.getErrorIcon()}
              </div>
              <CardTitle className="text-xl font-semibold">
                Something went wrong
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
              
              {this.state.errorId && (
                <p className="text-xs text-muted-foreground mt-4">
                  Error ID: {this.state.errorId}
                </p>
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
