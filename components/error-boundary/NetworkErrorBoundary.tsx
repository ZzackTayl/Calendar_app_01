'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

interface NetworkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOffline: boolean;
  retryCount: number;
  lastRetryTime: number | null;
}

export interface NetworkErrorBoundaryProps {
  children: ReactNode;
  onNetworkError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
}

export class NetworkErrorBoundary extends Component<NetworkErrorBoundaryProps, NetworkErrorBoundaryState> {
  private maxRetries: number;
  private retryDelay: number;
  private onlineListener: (() => void) | null = null;
  private offlineListener: (() => void) | null = null;

  constructor(props: NetworkErrorBoundaryProps) {
    super(props);
    this.maxRetries = props.maxRetries || 3;
    this.retryDelay = props.retryDelay || 3000;
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      retryCount: 0,
      lastRetryTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NetworkErrorBoundaryState> {
    const isNetworkError = NetworkErrorBoundary.isNetworkError(error);
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

    return {
      hasError: true,
      error,
      isOffline,
    };
  }

  static isNetworkError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('api') ||
      message.includes('http') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      stack.includes('fetch') ||
      stack.includes('api') ||
      stack.includes('network')
    );
  }

  componentDidMount() {
    // Listen for online/offline events
    this.onlineListener = () => {
      this.setState({ isOffline: false });
      if (this.state.hasError) {
        this.handleRetry();
      }
    };

    this.offlineListener = () => {
      this.setState({ isOffline: true });
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  componentWillUnmount() {
    // Clean up event listeners
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log network-specific errors
    console.error('NetworkErrorBoundary caught an error:', error, errorInfo);

    // Call parent error handler if provided
    if (this.props.onNetworkError) {
      this.props.onNetworkError(error);
    }

    // Auto-retry if it's a network error and we're online
    if (NetworkErrorBoundary.isNetworkError(error) && (typeof navigator !== 'undefined' && navigator.onLine)) {
      setTimeout(() => {
        this.handleRetry();
      }, this.retryDelay);
    }
  }

  private handleRetry = () => {
    const { retryCount, isOffline } = this.state;
    
    if (isOffline) {
      console.log('Cannot retry while offline');
      return;
    }
    
    if (retryCount >= this.maxRetries) {
      // Reset retry count after max retries
      this.setState({ retryCount: 0 });
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
      lastRetryTime: Date.now(),
    }));

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleCheckConnection = async () => {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        console.log('Network connection is working');
        this.handleRetry();
      } else {
        console.error('API health check failed');
      }
    } catch (error) {
      console.error('Network connectivity test failed:', error);
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private getErrorMessage(): string {
    const { isOffline, retryCount } = this.state;

    if (isOffline) {
      return 'You are currently offline. Please check your internet connection.';
    }

    if (retryCount > 0) {
      return `Network error occurred. Retry ${retryCount}/${this.maxRetries}.`;
    }

    return 'Network error occurred. Please check your connection and try again.';
  }

  private getErrorIcon() {
    const { isOffline } = this.state;

    if (isOffline) {
      return <WifiOff className="h-8 w-8 text-red-500" />;
    }

    return <Wifi className="h-8 w-8 text-orange-500" />;
  }

  private getErrorActions() {
    const { isOffline, retryCount } = this.state;
    const canRetry = retryCount < this.maxRetries && !isOffline;

    return (
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {canRetry && (
          <Button onClick={this.handleRetry} variant="default" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
        
        <Button onClick={this.handleCheckConnection} variant="outline" className="flex-1">
          <Wifi className="h-4 w-4 mr-2" />
          Check Connection
        </Button>
        
        <Button onClick={this.handleRefresh} variant="outline" className="flex-1">
          Refresh Page
        </Button>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-orange-200 bg-orange-50/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {this.getErrorIcon()}
              </div>
              <CardTitle className="text-xl font-semibold">
                Network Error
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                {this.getErrorMessage()}
              </p>
              
              {this.state.isOffline && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                  <div className="flex items-center">
                    <WifiOff className="h-4 w-4 mr-2" />
                    <span className="text-sm">You are currently offline</span>
                  </div>
                </div>
              )}
              
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
              
              {this.state.isOffline && (
                <p className="text-xs text-muted-foreground mt-4">
                  The page will automatically retry when you&apos;re back online.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
