'use client';

import React from 'react';
import { ErrorBoundary, NetworkErrorBoundary } from './index';

interface ClientErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

export function ClientErrorBoundaryWrapper({ children }: ClientErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Root error boundary caught error:', error, errorInfo);
      }}
    >
      <NetworkErrorBoundary
        onNetworkError={(error) => {
          console.error('Network error boundary caught error:', error);
        }}
      >
        {children}
      </NetworkErrorBoundary>
    </ErrorBoundary>
  );
}
