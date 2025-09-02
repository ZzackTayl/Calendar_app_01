'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface RealtimeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  lastRetryTime: number | null;
}

export interface RealtimeErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

export class RealtimeErrorBoundary extends Component<RealtimeErrorBoundaryProps, RealtimeErrorBoundaryState> {
  private maxRetries: number;
  private retryDelay: number;

  constructor(props: RealtimeErrorBoundaryProps) {
    super(props);
    this.maxRetries = props.maxRetries || 3;
    this.retryDelay = props.retryDelay || 5000;
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastRetryTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RealtimeErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log real-time specific errors
    console.error('RealtimeErrorBoundary caught an error:', error, errorInfo);

    // Check if it's a real-time related error
    const isRealtimeError = this.isRealtimeError(error);
    if (isRealtimeError) {
      console.warn('Real-time connection error detected');
    }
  }

  private isRealtimeError(error: Error): boolean {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    return (
      message.includes('realtime') ||
      message.includes('subscription') ||
      message.includes('websocket') ||
      message.includes('connection') ||
      message.includes('channel') ||
      stack.includes('realtime') ||
      stack.includes('subscription') ||
      stack.includes('websocket')
    );
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      // Reset retry count after max retries
      this.setState({ retryCount: 0 });
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1,
      lastRetryTime: Date.now(),
    }));

    // Call parent retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleManualRefresh = () => {
    window.location.reload();
  };

  private handleCheckConnection = () => {
    // Test network connectivity
    fetch('/api/health', { method: 'GET' })
      .then(response => {
        if (response.ok) {
          console.log('Network connection is working');
          this.handleRetry();
        } else {
          console.error('Network connection issue detected');
        }
      })
      .catch(error => {
        console.error('Network connectivity test failed:', error);
      });
  };

  private getRetryMessage(): string {
    const { retryCount, lastRetryTime } = this.state;
    
    if (retryCount === 0) {
      return 'Real-time connection lost.';
    }
    
    if (retryCount >= this.maxRetries) {
      return `Connection failed after ${this.maxRetries} attempts.`;
    }
    
    if (lastRetryTime) {
      const timeSinceLastRetry = Date.now() - lastRetryTime;
      const secondsAgo = Math.floor(timeSinceLastRetry / 1000);
      return `Retry ${retryCount}/${this.maxRetries} (${secondsAgo}s ago)`;
    }
    
    return `Retry ${retryCount}/${this.maxRetries}`;
  };

  private getConnectionStatus(): 'connected' | 'disconnected' | 'retrying' {
    if (!this.state.hasError) return 'connected';
    if (this.state.retryCount > 0 && this.state.retryCount < this.maxRetries) return 'retrying';
    return 'disconnected';
  };

  render() {
    if (this.state.hasError) {
      const connectionStatus = this.getConnectionStatus();
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              {connectionStatus === 'connected' ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : connectionStatus === 'retrying' ? (
                <RefreshCw className="h-5 w-5 text-orange-500 animate-spin" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <CardTitle className="text-lg">
                Real-time Connection Issue
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {this.getRetryMessage()}
            </p>
            
            {this.state.error && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Error Details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-2">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry} 
                  variant="default" 
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
              )}
              
              <Button 
                onClick={this.handleCheckConnection} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Check Connection
              </Button>
              
              <Button 
                onClick={this.handleManualRefresh} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                Refresh Page
              </Button>
            </div>
            
            {connectionStatus === 'retrying' && (
              <div className="text-xs text-muted-foreground text-center">
                Attempting to reconnect...
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
