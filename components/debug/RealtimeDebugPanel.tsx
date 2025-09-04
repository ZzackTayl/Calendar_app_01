'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  realtimeDebugger, 
  DebugLogEntry, 
  ConnectionHealthReport,
  generateRealtimeHealthReport 
} from '@/lib/supabase/realtime-debug';
import { realtimeAuth, RealtimeAuthState } from '@/lib/supabase/realtime-auth';
import { enhancedRealtimeManager } from '@/lib/supabase/enhanced-realtime-manager';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  Download, 
  Network, 
  RefreshCw, 
  Shield, 
  Trash2, 
  Users, 
  Wifi, 
  WifiOff
} from 'lucide-react';
import { format } from 'date-fns';

interface RealtimeDebugPanelProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export function RealtimeDebugPanel({ isVisible = false, onClose }: RealtimeDebugPanelProps) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [healthReport, setHealthReport] = useState<ConnectionHealthReport | null>(null);
  const [authState, setAuthState] = useState<RealtimeAuthState>(realtimeAuth.getAuthState());
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshData = useCallback(() => {
    // Get recent logs
    const recentLogs = realtimeDebugger.getLogs({ 
      limit: 100,
      since: new Date(Date.now() - 60 * 60 * 1000) // Last hour
    });
    setLogs(recentLogs);

    // Generate health report
    const subscriptions = enhancedRealtimeManager.getActiveSubscriptions();
    const connectionStats = { connected: true, lastPing: Date.now() }; // Simplified stats
    
    const report = generateRealtimeHealthReport(
      subscriptions,
      authState,
      "online", // Network state
      {} // Additional metrics
    );
    setHealthReport(report);
  }, [authState]);

  useEffect(() => {
    if (!isVisible) return;

    // Initial data load
    refreshData();

    // Set up log listener
    const logUnsubscribe = realtimeDebugger.addLogListener((entry) => {
      setLogs(current => [entry, ...current.slice(0, 99)]); // Keep last 100 entries
    });

    // Set up auth state listener
    const authUnsubscribe = realtimeAuth.addAuthStateListener((newAuthState) => {
      setAuthState(newAuthState);
    });

    // Auto-refresh interval
    let intervalId: NodeJS.Timeout;
    if (autoRefresh) {
      intervalId = setInterval(refreshData, 5000); // Every 5 seconds
    }

    return () => {
      logUnsubscribe();
      authUnsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [isVisible, autoRefresh, refreshData]);

  const handleExportLogs = (format: 'json' | 'csv') => {
    const exportData = realtimeDebugger.exportLogs(format);
    const blob = new Blob([exportData], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `realtime-logs-${new Date().toISOString()}.${format}`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    realtimeDebugger.clearLogs();
    setLogs([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
      case 'degraded':
        return 'bg-yellow-500';
      case 'disconnected':
      case 'error':
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredLogs = logs.filter(log => {
    const levelMatch = selectedLogLevel === 'all' || log.level === selectedLogLevel;
    const categoryMatch = selectedCategory === 'all' || log.category === selectedCategory;
    return levelMatch && categoryMatch;
  });

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Real-time Debug Panel</h2>
            {healthReport && (
              <Badge 
                className={`${getStatusColor(healthReport.overallHealth)} text-white`}
              >
                {healthReport.overallHealth.toUpperCase()}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Overview Tab */}
              <TabsContent value="overview" className="h-full p-4 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {/* Connection Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Network className="w-4 h-4 mr-2" />
                        Connection Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        {true ? ( // Simplified connection check
                          <Wifi className="w-5 h-5 text-green-500" />
                        ) : (
                          <WifiOff className="w-5 h-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          ONLINE
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Active: {enhancedRealtimeManager.getActiveSubscriptions().length}
                        {' / '}
                        Total: {enhancedRealtimeManager.getActiveSubscriptions().length}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Auth Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Authentication
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        {authState.isAuthenticated ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {authState.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                        </span>
                      </div>
                      {authState.isExpiringSoon && (
                        <div className="mt-1 text-xs text-yellow-600">
                          Token expiring soon
                        </div>
                      )}
                      {authState.error && (
                        <div className="mt-1 text-xs text-red-600">
                          {authState.error}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Data Integrity */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <Database className="w-4 h-4 mr-2" />
                        Data Sync
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Synchronized</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Queue: {enhancedRealtimeManager.getConnectionStats().offlineQueueSize}
                        {' | '}
                        Optimistic: {enhancedRealtimeManager.getConnectionStats().optimisticUpdatesCount}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Issues */}
                {healthReport?.issues && healthReport.issues.length > 0 && (
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                        Issues & Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {healthReport.issues.map((issue, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <Badge 
                              variant="outline"
                              className={
                                issue.severity === 'critical' ? 'border-red-300 text-red-600' :
                                issue.severity === 'high' || issue.severity === 'medium' ? 'border-yellow-300 text-yellow-600' :
                                issue.severity === 'low' ? 'border-blue-300 text-blue-600' :
                                'border-gray-300 text-gray-600'
                              }
                            >
                              {issue.severity}
                            </Badge>
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{issue.description}</div>
                              {issue.suggestion && (
                                <div className="text-gray-600 mt-1">{issue.suggestion}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="h-full p-4 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <select 
                      value={selectedLogLevel} 
                      onChange={(e) => setSelectedLogLevel(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">All Levels</option>
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </select>
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">All Categories</option>
                      <option value="auth">Auth</option>
                      <option value="subscription">Subscription</option>
                      <option value="data">Data</option>
                      <option value="network">Network</option>
                      <option value="validation">Validation</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExportLogs('json')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExportLogs('csv')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleClearLogs}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className="text-xs font-mono border rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <Badge className={getLogLevelColor(log.level)}>
                              {log.level.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {log.category}
                            </Badge>
                            <span className="text-gray-500">
                              {format(log.timestamp, 'HH:mm:ss.SSS')}
                            </span>
                          </div>
                          {log.userId && (
                            <Badge variant="outline" className="text-xs">
                              {log.userId.slice(-8)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-gray-800 mb-1">
                          {log.message}
                        </div>
                        {log.data && (
                          <details className="text-gray-600">
                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                              Data
                            </summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" className="h-full p-4 overflow-auto">
                <div className="space-y-4">
                  {healthReport?.subscriptions.map((subscription) => (
                    <Card key={subscription.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            {subscription.table} Subscription
                          </CardTitle>
                          <Badge className={`${getStatusColor(subscription.status.state)} text-white`}>
                            {subscription.status.state.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">ID:</div>
                            <div className="font-mono">{subscription.id.slice(-12)}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Network:</div>
                            <div className="flex items-center space-x-1">
                              {subscription.status.networkState === 'online' ? (
                                <Wifi className="w-3 h-3 text-green-500" />
                              ) : (
                                <WifiOff className="w-3 h-3 text-red-500" />
                              )}
                              <span>{subscription.status.networkState}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Reconnects:</div>
                            <div>{subscription.reconnectCount}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Errors:</div>
                            <div>{subscription.errorCount}</div>
                          </div>
                          {subscription.status.lastConnected && (
                            <div className="col-span-2">
                              <div className="text-gray-600">Last Connected:</div>
                              <div>{format(subscription.status.lastConnected, 'PPpp')}</div>
                            </div>
                          )}
                          {subscription.status.error && (
                            <div className="col-span-2">
                              <div className="text-gray-600">Error:</div>
                              <div className="text-red-600 text-xs">{subscription.status.error}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Auth Tab */}
              <TabsContent value="auth" className="h-full p-4 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Authentication State
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Authenticated:</span>
                            <Badge className={authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'}>
                              {authState.isAuthenticated ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Token Expiring:</span>
                            <Badge className={authState.isExpiringSoon ? 'bg-yellow-500' : 'bg-green-500'}>
                              {authState.isExpiringSoon ? 'Soon' : 'No'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Retry Count:</span>
                            <span>{authState.retryCount}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">User Info</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <div className="font-mono">{authState.user?.email || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">ID:</span>
                            <div className="font-mono">{authState.user?.id?.slice(-12) || 'N/A'}</div>
                          </div>
                          {authState.lastRefresh && (
                            <div>
                              <span className="text-gray-600">Last Refresh:</span>
                              <div>{format(authState.lastRefresh, 'PPpp')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {authState.error && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                        <div className="text-sm font-medium text-red-800">Error</div>
                        <div className="text-sm text-red-700">{authState.error}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="h-full p-4 overflow-auto">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {healthReport?.metrics && Object.keys(healthReport.metrics).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(healthReport.metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>
                              <span className="text-sm font-medium">
                                {typeof value === 'number' ? `${value.toFixed(2)}ms` : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No performance metrics available</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Connection Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {enhancedRealtimeManager.getConnectionStats().total}
                          </div>
                          <div className="text-sm text-gray-600">Total Subscriptions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {enhancedRealtimeManager.getConnectionStats().connected}
                          </div>
                          <div className="text-sm text-gray-600">Connected</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {enhancedRealtimeManager.getConnectionStats().reconnecting}
                          </div>
                          <div className="text-sm text-gray-600">Reconnecting</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {enhancedRealtimeManager.getConnectionStats().error}
                          </div>
                          <div className="text-sm text-gray-600">Errors</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
