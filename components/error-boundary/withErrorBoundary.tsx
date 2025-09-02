'use client';

import React, { ComponentType } from 'react';
import { ErrorBoundary, RealtimeErrorBoundary, AuthErrorBoundary, NetworkErrorBoundary } from './index';

interface WithErrorBoundaryOptions {
  errorType?: 'general' | 'realtime' | 'auth' | 'network';
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: any[];
  maxRetries?: number;
  retryDelay?: number;
  redirectToLogin?: boolean;
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const {
    errorType = 'general',
    fallback,
    onError,
    resetKeys,
    maxRetries = 3,
    retryDelay = 3000,
    redirectToLogin = false,
  } = options;

  const WrappedComponent = (props: P) => {
    const errorBoundaryProps = {
      fallback,
      onError,
      resetKeys,
    };

    switch (errorType) {
      case 'realtime':
        return (
          <RealtimeErrorBoundary
            {...errorBoundaryProps}
            maxRetries={maxRetries}
            retryDelay={retryDelay}
          >
            <Component {...props} />
          </RealtimeErrorBoundary>
        );

      case 'auth':
        return (
          <AuthErrorBoundary
            {...errorBoundaryProps}
            redirectToLogin={redirectToLogin}
          >
            <Component {...props} />
          </AuthErrorBoundary>
        );

      case 'network':
        return (
          <NetworkErrorBoundary
            {...errorBoundaryProps}
            maxRetries={maxRetries}
            retryDelay={retryDelay}
          >
            <Component {...props} />
          </NetworkErrorBoundary>
        );

      default:
        return (
          <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
          </ErrorBoundary>
        );
    }
  };

  // Set display name for debugging
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Convenience functions for specific error types
export const withRealtimeErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: Omit<WithErrorBoundaryOptions, 'errorType'> = {}
) => withErrorBoundary(Component, { ...options, errorType: 'realtime' });

export const withAuthErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: Omit<WithErrorBoundaryOptions, 'errorType'> = {}
) => withErrorBoundary(Component, { ...options, errorType: 'auth' });

export const withNetworkErrorBoundary = <P extends object>(
  Component: ComponentType<P>,
  options: Omit<WithErrorBoundaryOptions, 'errorType'> = {}
) => withErrorBoundary(Component, { ...options, errorType: 'network' });
