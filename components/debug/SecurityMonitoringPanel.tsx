'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSecurityMonitoring } from '@/hooks/use-security-monitoring';
import { type SecurityEventType } from '@/lib/security/event-logger';

export function SecurityMonitoringPanel() {
  const [selectedType, setSelectedType] = useState<SecurityEventType | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    metrics,
    alerts,
    activeAlerts,
    events,
    rules,
    loading,
    error,
    actions
  } = useSecurityMonitoring({
    autoRefresh,
    refreshInterval: 5000, // 5 seconds for debug panel
    enableNotifications: true
  });

  const filteredEvents = selectedType === 'all'
    ? events
    : events.filter(event => event.type === selectedType);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeColor = (type: string) => {
    if (type.includes('bypass') || type.includes('unauthorized')) return 'bg-red-100 text-red-800';
    if (type.includes('validation') || type.includes('session')) return 'bg-orange-100 text-orange-800';
    if (type.includes('demo')) return 'bg-purple-100 text-purple-800';
    if (type.includes('middleware')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div>Loading security monitoring data...</div>;
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTitle className="text-red-800">Error Loading Security Data</AlertTitle>
        <AlertDescription className="text-red-700">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return <div>No security data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Security Monitoring Dashboard</h2>
        <div className="flex gap-2">
          <Button
            onClick={actions.refreshData}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            {autoRefresh ? 'Stop Auto-Refresh' : 'Auto-Refresh'}
          </Button>
          <Button
            onClick={() => console.log('Test alert functionality would be implemented here')}
            variant="outline"
            size="sm"
          >
            Test Alert
          </Button>
        </div>
      </div>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.riskScore >= 80 ? 'text-red-600' :
              metrics.riskScore >= 60 ? 'text-orange-600' :
              metrics.riskScore >= 40 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {metrics.riskScore}/100
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.activeAlerts}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Events (1h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalEvents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {metrics.suspiciousPatterns.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">🚨 Active Security Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <span className="ml-2 text-sm font-medium">{alert.title}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => console.log('Acknowledge alert:', alert.id)}
                      variant="outline"
                      size="sm"
                      disabled={alert.acknowledged}
                    >
                      {alert.acknowledged ? 'Ack' : 'Acknowledge'}
                    </Button>
                    <Button
                      onClick={() => console.log('Resolve alert:', alert.id)}
                      variant="default"
                      size="sm"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
              {activeAlerts.length > 3 && (
                <div className="text-sm text-gray-600">
                  +{activeAlerts.length - 3} more alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suspicious Patterns Alert */}
      {metrics.suspiciousPatterns.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">⚠️ Suspicious Patterns Detected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="destructive">
                {metrics.suspiciousPatterns.length} suspicious pattern{(metrics.suspiciousPatterns.length > 1) ? 's' : ''} detected
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Event Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(metrics.eventsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{type}</span>
                <Badge variant="secondary">{count as number}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="auth_bypass_attempt">Bypass</TabsTrigger>
              <TabsTrigger value="unauthorized_access">Unauthorized</TabsTrigger>
              <TabsTrigger value="session_validation_failed">Session</TabsTrigger>
              <TabsTrigger value="demo_mode_activated">Demo</TabsTrigger>
              <TabsTrigger value="middleware_block">Middleware</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedType} className="mt-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No events found for the selected filter
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getEventTypeColor(event.type)}>
                            {event.type}
                          </Badge>
                          <Badge className={`text-white ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-sm">
                        <div><strong>Context:</strong> {event.context}</div>
                        {event.userId && <div><strong>User ID:</strong> {event.userId}</div>}
                        {event.route && <div><strong>Route:</strong> {event.route}</div>}
                        {event.ipAddress && <div><strong>IP:</strong> {event.ipAddress}</div>}
                      </div>

                      {Object.keys(event.details).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-blue-600">View Details</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
