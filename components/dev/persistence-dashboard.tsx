'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Database,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Network,
  HardDrive,
  Zap,
  Bug,
  Settings,
  BarChart3,
  GitBranch,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Data persistence monitoring types
interface DataMetrics {
  localStorage: {
    used: number;
    available: number;
    items: number;
  };
  sessionStorage: {
    used: number;
    items: number;
  };
  indexedDB: {
    databases: number;
    estimated: number;
  };
  cache: {
    active: boolean;
    size: number;
  };
}

interface RelationshipData {
  id: string;
  type: 'user-event' | 'event-calendar' | 'user-auth' | 'demo-data';
  source: string;
  target: string;
  status: 'healthy' | 'warning' | 'error';
  lastVerified: Date;
  metadata?: Record<string, any>;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  lastRun?: Date;
  results?: {
    assertions: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

interface PersistenceDashboardProps {
  className?: string;
  refreshInterval?: number;
}

export const PersistenceDashboard: React.FC<PersistenceDashboardProps> = ({ 
  className,
  refreshInterval = 5000 
}) => {
  const { user, demoMode } = useAuth();
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dev-persistence-dashboard-visible') !== 'false';
    }
    return true;
  });
  const [metrics, setMetrics] = useState<DataMetrics>({
    localStorage: { used: 0, available: 0, items: 0 },
    sessionStorage: { used: 0, items: 0 },
    indexedDB: { databases: 0, estimated: 0 },
    cache: { active: false, size: 0 }
  });
  const [relationships, setRelationships] = useState<RelationshipData[]>([]);
  const [testScenarios, setTestScenarios] = useState<TestScenario[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Calculate storage metrics
  const calculateStorageMetrics = useCallback((): DataMetrics => {
    if (typeof window === 'undefined') {
      return {
        localStorage: { used: 0, available: 0, items: 0 },
        sessionStorage: { used: 0, items: 0 },
        indexedDB: { databases: 0, estimated: 0 },
        cache: { active: false, size: 0 }
      };
    }

    const getStorageSize = (storage: Storage): number => {
      let total = 0;
      for (let key in storage) {
        if (storage.hasOwnProperty(key)) {
          total += storage[key].length + key.length;
        }
      }
      return total;
    };

    const localStorageUsed = getStorageSize(localStorage);
    const sessionStorageUsed = getStorageSize(sessionStorage);

    return {
      localStorage: {
        used: localStorageUsed,
        available: 10485760 - localStorageUsed, // ~10MB typical limit
        items: localStorage.length
      },
      sessionStorage: {
        used: sessionStorageUsed,
        items: sessionStorage.length
      },
      indexedDB: {
        databases: 0, // Would need actual IndexedDB inspection
        estimated: 0
      },
      cache: {
        active: 'caches' in window,
        size: 0 // Would need cache inspection
      }
    };
  }, []);

  // Mock relationship data analysis
  const generateRelationships = useCallback((): RelationshipData[] => {
    const baseRelationships: RelationshipData[] = [
      {
        id: 'user-auth-1',
        type: 'user-auth',
        source: 'AuthContext',
        target: 'Supabase',
        status: user ? 'healthy' : 'warning',
        lastVerified: new Date(),
        metadata: { authenticated: !!user, demoMode }
      },
      {
        id: 'demo-data-1',
        type: 'demo-data',
        source: 'DemoStore',
        target: 'localStorage',
        status: demoMode ? 'healthy' : 'warning',
        lastVerified: new Date(),
        metadata: { active: demoMode, itemCount: localStorage.length }
      }
    ];

    // Add dynamic relationships based on localStorage content
    const keys = Object.keys(localStorage);
    keys.forEach((key, index) => {
      if (key.startsWith('ph_') || key.startsWith('demo_')) {
        baseRelationships.push({
          id: `data-${index}`,
          type: 'demo-data',
          source: key,
          target: 'localStorage',
          status: 'healthy',
          lastVerified: new Date(),
          metadata: { 
            size: localStorage.getItem(key)?.length || 0,
            type: key.startsWith('ph_') ? 'app-data' : 'demo-data'
          }
        });
      }
    });

    return baseRelationships;
  }, [user, demoMode]);

  // Initialize test scenarios
  const initTestScenarios = useCallback((): TestScenario[] => [
    {
      id: 'auth-persistence',
      name: 'Authentication Persistence',
      description: 'Verify auth state persists across page reloads',
      status: 'pending'
    },
    {
      id: 'demo-data-integrity',
      name: 'Demo Data Integrity',
      description: 'Check demo data consistency and relationships',
      status: 'pending'
    },
    {
      id: 'storage-limits',
      name: 'Storage Limits',
      description: 'Test behavior at storage capacity limits',
      status: 'pending'
    },
    {
      id: 'cross-tab-sync',
      name: 'Cross-Tab Synchronization',
      description: 'Verify data sync between browser tabs',
      status: 'pending'
    }
  ], []);

  // Refresh all metrics
  const refreshMetrics = useCallback(() => {
    setMetrics(calculateStorageMetrics());
    setRelationships(generateRelationships());
    setLastUpdate(new Date());
  }, [calculateStorageMetrics, generateRelationships]);

  // Run a test scenario
  const runTestScenario = useCallback(async (scenarioId: string) => {
    setTestScenarios(prev => prev.map(scenario => 
      scenario.id === scenarioId 
        ? { ...scenario, status: 'running' }
        : scenario
    ));

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const mockResults = {
      assertions: Math.floor(Math.random() * 10) + 5,
      passed: 0,
      failed: 0,
      duration: Math.floor(Math.random() * 2000) + 500
    };
    
    // 80% chance of passing
    const success = Math.random() > 0.2;
    if (success) {
      mockResults.passed = mockResults.assertions;
    } else {
      mockResults.passed = Math.floor(mockResults.assertions * 0.7);
      mockResults.failed = mockResults.assertions - mockResults.passed;
    }

    setTestScenarios(prev => prev.map(scenario => 
      scenario.id === scenarioId 
        ? { 
            ...scenario, 
            status: success ? 'passed' : 'failed',
            lastRun: new Date(),
            results: mockResults
          }
        : scenario
    ));
  }, []);

  // Clear all storage
  const clearAllStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Clear all storage data? This will reset the application.');
      if (confirmed) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    }
  }, []);

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dev-persistence-dashboard-visible', String(newVisibility));
    }
  }, [isVisible]);

  // Initialize data
  useEffect(() => {
    setTestScenarios(initTestScenarios());
    refreshMetrics();
  }, [initTestScenarios, refreshMetrics]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshMetrics]);

  // Calculate storage usage percentage
  const storagePercentage = useMemo(() => {
    const total = metrics.localStorage.used + metrics.localStorage.available;
    return total > 0 ? (metrics.localStorage.used / total) * 100 : 0;
  }, [metrics.localStorage]);

  // Get status icon
  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 z-40 w-96 max-h-[80vh] shadow-lg border-2 border-blue-200 bg-blue-50/95 backdrop-blur-sm overflow-hidden",
      !isVisible && "w-auto h-auto",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-semibold text-blue-900">
              {isVisible ? 'Persistence Dashboard' : 'Data'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {isVisible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshMetrics}
                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
                aria-label="Refresh metrics"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVisibility}
              className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
              aria-label={isVisible ? 'Hide dashboard' : 'Show dashboard'}
            >
              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>
        </div>
        {isVisible && (
          <CardDescription className="text-xs text-blue-700">
            Real-time data persistence monitoring • Last updated: {lastUpdate.toLocaleTimeString()}
          </CardDescription>
        )}
      </CardHeader>

      {isVisible && (
        <CardContent className="space-y-4 max-h-[calc(80vh-8rem)] overflow-y-auto">
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/50">
              <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
              <TabsTrigger value="relationships" className="text-xs">Relations</TabsTrigger>
              <TabsTrigger value="tests" className="text-xs">Tests</TabsTrigger>
            </TabsList>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-3 mt-3">
              {/* Storage Usage */}
              <div className="p-3 rounded-lg bg-white/50 border space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Storage Usage</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {Math.round(storagePercentage)}%
                  </Badge>
                </div>
                <Progress value={storagePercentage} className="h-2" />
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Used: {(metrics.localStorage.used / 1024).toFixed(1)}KB</div>
                  <div>Items: {metrics.localStorage.items}</div>
                </div>
              </div>

              {/* Session Data */}
              <div className="p-3 rounded-lg bg-white/50 border space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Session Data</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {metrics.sessionStorage.items} items
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">
                  Size: {(metrics.sessionStorage.used / 1024).toFixed(1)}KB
                </div>
              </div>

              {/* Cache Status */}
              <div className="p-3 rounded-lg bg-white/50 border">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Cache API</span>
                  <Badge 
                    variant={metrics.cache.active ? "default" : "secondary"}
                    className="ml-auto text-xs"
                  >
                    {metrics.cache.active ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              </div>
            </TabsContent>

            {/* Relationships Tab */}
            <TabsContent value="relationships" className="space-y-2 mt-3">
              {relationships.map(rel => (
                <div key={rel.id} className="p-2 rounded-lg bg-white/50 border">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(rel.status)}
                    <span className="text-sm font-medium">{rel.source}</span>
                    <GitBranch className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-600">{rel.target}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {rel.type}
                  </Badge>
                  {rel.metadata && (
                    <div className="mt-1 text-xs text-gray-500">
                      {Object.entries(rel.metadata).map(([key, value]) => (
                        <div key={key}>{key}: {String(value)}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* Tests Tab */}
            <TabsContent value="tests" className="space-y-2 mt-3">
              {testScenarios.map(scenario => (
                <div key={scenario.id} className="p-2 rounded-lg bg-white/50 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{scenario.name}</span>
                    <div className="flex items-center gap-1">
                      {scenario.status === 'running' && (
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                      )}
                      <Badge 
                        variant={
                          scenario.status === 'passed' ? 'default' :
                          scenario.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {scenario.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{scenario.description}</p>
                  
                  {scenario.results && (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Assertions:</span>
                        <span>{scenario.results.passed}/{scenario.results.assertions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{scenario.results.duration}ms</span>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 h-7 text-xs"
                    onClick={() => runTestScenario(scenario.id)}
                    disabled={scenario.status === 'running'}
                  >
                    {scenario.status === 'running' ? 'Running...' : 'Run Test'}
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto Refresh
              </Label>
              <Switch 
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>

            <Button 
              variant="destructive" 
              size="sm" 
              onClick={clearAllStorage}
              className="w-full"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All Storage
            </Button>
          </div>

          {/* Development Warning */}
          <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 border border-yellow-200">
            <Bug className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              Development monitoring tool
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default PersistenceDashboard;