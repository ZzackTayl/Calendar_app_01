'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  securityMonitor,
  type SecurityAlert,
  type SecurityMetrics,
  type MonitoringRule
} from '@/lib/security/monitoring-service';
import { 
  getRecentSecurityEvents, 
  type SecurityEvent 
} from '@/lib/security/event-logger';

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Real-time updates
  useEffect(() => {
    // Subscribe to real-time alerts
    const unsubscribeAlerts = securityMonitor.subscribeToAlerts((alert) => {
      setAlerts(prev => [alert, ...prev]);
      
      // Show browser notification for critical alerts
      if (alert.severity === 'critical' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`Security Alert: ${alert.title}`, {
            body: alert.description,
            icon: '/favicon.ico',
            tag: alert.id
          });
        }
      }
    });

    // Subscribe to metrics updates
    const unsubscribeMetrics = securityMonitor.subscribeToMetrics((newMetrics) => {
      setMetrics(newMetrics);
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeMetrics();
    };
  }, []);

  // Initial data load and periodic refresh
  useEffect(() => {
    const loadData = () => {
      setMetrics(securityMonitor.getSecurityMetrics());
      setAlerts(securityMonitor.getAllAlerts(50));
      setEvents(getRecentSecurityEvents(100));
      setRules(securityMonitor.getRules());
    };

    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleAcknowledgeAlert = (alertId: string) => {
    securityMonitor.acknowledgeAlert(alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const handleResolveAlert = (alertId: string) => {
    securityMonitor.resolveAlert(alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolvedAt: new Date().toISOString(), acknowledged: true } : alert
    ));
  };

  const toggleRule = (ruleId: string, enabled: boolean) => {
    securityMonitor.toggleRule(ruleId, enabled);
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled } : rule
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!metrics) {
    return <div className="p-4">Loading security dashboard...</div>;
  }

  const activeAlerts = alerts.filter(alert => !alert.resolvedAt);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.reload()}
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
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTitle className="text-red-800">
            🚨 {criticalAlerts.length} Critical Security Alert{criticalAlerts.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription className="text-red-700">
            Immediate attention required. Review the alerts tab for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRiskScoreColor(metrics.riskScore)}`}>
              {metrics.riskScore}/100
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.riskScore >= 80 ? 'High Risk' : 
               metrics.riskScore >= 60 ? 'Medium Risk' : 
               metrics.riskScore >= 40 ? 'Low Risk' : 'Minimal Risk'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {metrics.activeAlerts}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {criticalAlerts.length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Events (1h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.totalEvents}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.eventsBySeverity.critical || 0} critical events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {metrics.suspiciousPatterns.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Pattern detection active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {activeAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Event Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Event Distribution by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(metrics.eventsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">{type.replace(/_/g, ' ')}</span>
                    <Badge variant="secondary">{count as number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Event Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(metrics.eventsBySeverity).map(([severity, count]) => (
                  <div key={severity} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={`text-2xl font-bold ${getSeverityColor(severity).split(' ')[0].replace('bg-', 'text-')}`}>
                      {count as number}
                    </div>
                    <div className="text-sm capitalize">{severity}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-green-600 text-lg font-medium">✅ No Active Alerts</div>
                <p className="text-gray-500 mt-2">All security alerts have been resolved</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.severity === 'critical' ? 'border-l-red-500' :
                  alert.severity === 'high' ? 'border-l-orange-500' :
                  alert.severity === 'medium' ? 'border-l-yellow-500' :
                  'border-l-blue-500'
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline">
                          {alert.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-3">{alert.description}</p>
                    <div className="text-sm text-gray-600 mb-3">
                      Related events: {alert.events.length}
                    </div>
                    <div className="flex gap-2">
                      {!alert.acknowledged && (
                        <Button 
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          variant="outline"
                          size="sm"
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button 
                        onClick={() => handleResolveAlert(alert.id)}
                        variant="default"
                        size="sm"
                      >
                        Resolve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.slice(0, 50).map((event) => (
                  <div key={event.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {event.type.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div><strong>Context:</strong> {event.context}</div>
                      {event.route && <div><strong>Route:</strong> {event.route}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{rule.name}</h3>
                      <Button
                        onClick={() => toggleRule(rule.id, !rule.enabled)}
                        variant={rule.enabled ? "default" : "outline"}
                        size="sm"
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                    <div className="flex gap-4 text-sm">
                      <span><strong>Threshold:</strong> {rule.threshold}</span>
                      <span><strong>Time Window:</strong> {rule.timeWindow}m</span>
                      <Badge className={getSeverityColor(rule.severity)}>
                        {rule.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}