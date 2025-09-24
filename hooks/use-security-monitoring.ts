import { useState, useEffect, useCallback } from 'react';
import type { SecurityEvent } from '@/lib/security/event-logger';
import { getRecentSecurityEvents } from '@/lib/security/event-logger';
import type { SecurityAlert, SecurityMetrics, MonitoringRule } from '@/lib/security/monitoring-service';
import {
  securityMonitor,
  getActiveSecurityAlerts,
  getSecurityMetrics,
  generateSecurityAlert,
  acknowledgeSecurityAlert,
  resolveSecurityAlert,
} from '@/lib/security/monitoring-service';

interface SecurityMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
}

export function useSecurityMonitoring(options: SecurityMonitoringOptions = {}) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<SecurityAlert[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const newMetrics = getSecurityMetrics(60);
      const newActiveAlerts = getActiveSecurityAlerts();
      const allAlerts = securityMonitor.getAllAlerts(100);
      const recentEvents = getRecentSecurityEvents(100);
      const currentRules = securityMonitor.getRules();

      setMetrics(newMetrics);
      setActiveAlerts(newActiveAlerts);
      setAlerts(allAlerts);
      setEvents(recentEvents);
      setRules(currentRules);
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh security monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  const actions = {
    refresh,
    refreshData: () => {
      void refresh();
    },
    generateTestAlert: () => {
      try {
        const recent = getRecentSecurityEvents(5);
        generateSecurityAlert(
          'critical_event',
          'high',
          'Test Security Alert',
          'This is a test alert generated from the debug panel.',
          recent
        );
        void refresh();
      } catch (e) {
        console.error('Failed to generate test alert', e);
      }
    },
    acknowledgeAlert: (alertId: string) => {
      try {
        acknowledgeSecurityAlert(alertId);
        setActiveAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
        void refresh();
      } catch (e) {
        console.error('Failed to acknowledge alert', e);
      }
    },
    resolveAlert: (alertId: string) => {
      try {
        resolveSecurityAlert(alertId);
        setActiveAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true, resolvedAt: new Date().toISOString() } : a));
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true, resolvedAt: new Date().toISOString() } : a));
        void refresh();
      } catch (e) {
        console.error('Failed to resolve alert', e);
      }
    }
  };

  useEffect(() => {
    // initial load
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(() => {
        void refresh();
      }, options.refreshInterval || 60000);

      return () => clearInterval(interval);
    }
    return;
  }, [options.autoRefresh, options.refreshInterval, refresh]);

  return {
    metrics,
    alerts,
    activeAlerts,
    events,
    rules,
    loading,
    error,
    actions
  };
}
