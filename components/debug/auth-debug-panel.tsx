'use client';

/**
 * Client-Side Authentication Debug Panel
 * 
 * Shows real-time authentication state and helps diagnose auth issues
 * Only renders in development mode for security
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  extractClientAuthInfo, 
  generateAuthDiagnosticReport,
  generateRequestId 
} from '@/lib/debug/auth-debug';

interface AuthDebugPanelProps {
  route: string;
  show?: boolean;
}

export function AuthDebugPanel({ route, show = true }: AuthDebugPanelProps) {
  const { user, loading, error } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const requestId = generateRequestId();
    const clientInfo = extractClientAuthInfo(user, loading, error, requestId);
    
    // Add route info
    const completeInfo = {
      ...clientInfo,
      timestamp: new Date().toISOString(),
      requestId,
      route,
    };
    
    setDebugInfo(completeInfo);
  }, [user, loading, error, route]);

  const handleForceRefresh = () => {
    window.location.reload();
  };

  const handleClearLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !show) {
    return null;
  }

  if (!debugInfo) {
    return null;
  }

  const userStatus = user ? 
    (user.email_confirmed_at ? 'verified' : 'unverified') : 
    'none';

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200">
            🔐 Auth Debug Panel
          </CardTitle>
          <div className="flex gap-2 items-center">
            <Badge variant={userStatus === 'verified' ? 'default' : 'destructive'}>
              {userStatus}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼' : '▶'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                Client State
              </h4>
              <div className="space-y-1">
                <div>Loading: {loading ? '🟡 Yes' : '🟢 No'}</div>
                <div>User: {user ? '🟢 Present' : '🔴 None'}</div>
                <div>Email: {user?.email || 'N/A'}</div>
                <div>Verified: {user?.email_confirmed_at ? '✅ Yes' : '❌ No'}</div>
                <div>Error: {error || 'None'}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                Request Info
              </h4>
              <div className="space-y-1">
                <div>Route: {route}</div>
                <div>Time: {new Date(debugInfo.timestamp).toLocaleTimeString()}</div>
                <div>ID: {debugInfo.requestId}</div>
              </div>
            </div>
          </div>

          <div className="border-t border-orange-200 dark:border-orange-800 pt-4">
            <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
              Debug Actions
            </h4>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleForceRefresh}
              >
                🔄 Force Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearLocalStorage}
              >
                🗑️ Clear Storage
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('🔍 CLIENT AUTH DEBUG INFO:', debugInfo);
                  console.log('🔍 RAW USER OBJECT:', user);
                  console.log('🔍 RAW ERROR:', error);
                }}
              >
                📋 Log to Console
              </Button>
            </div>
          </div>

          <div className="text-xs text-orange-600 dark:text-orange-400">
            ⚠️ This panel only shows in development mode
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Hook to get current authentication debug status
 */
export function useAuthDebugStatus() {
  const { user, loading, error } = useAuth();
  
  return {
    isAuthenticated: !!user,
    isVerified: !!user?.email_confirmed_at,
    isLoading: loading,
    hasError: !!error,
    userEmail: user?.email,
    error,
  };
}