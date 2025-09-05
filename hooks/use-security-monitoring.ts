'use client';

import { useState, useEffect, useCallback } from 'react';
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

export interface UseSecurityMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
}

export interface SecurityMonitoringState {
  metrics: SecurityMetrics | null;
  alerts: SecurityAlert[];
  activeAlerts: SecurityAlert[];
  events: SecurityEvent[];
  rules: MonitoringRule[];
  loading: boolean;
  error: string | null;
}

export function useSecurityMonitoring(options: UseSecurityMonitoringOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableNotifications = true
  } = options;

  const [state, setState] = useState<SecurityMonitoringState>({
    metrics: null,
    alerts: [],
    activeAlerts: [],
    events: [],
    rules: [],
    loading: true,
    error: null
  });

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [metrics, alerts, events, rules] = await Promise.all([
        Promise.resolve(securityMonitor.getSecurityMetrics()),
        Promise.resolve(securityMonitor.getAllAlerts(100)),
        Promise.resolve(getRecentSecurityEvents(100)),
        Promise.resolve(securityMonitor.getRules())
      ]);

      const activeAlerts = alerts.filter(alert => !alert.resolvedAt);

      setState({
        metrics,
        alerts,
        activeAlerts,
        events,
        rules,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('[SECURITY-HOOK] Error loading data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  // Real-time alert subscription
  useEffect(() => {
    const unsubscribe = securityMonitor.subscribeToAlerts((alert) => {
      setState(prev => ({
        ...prev,
        alerts: [alert, ...prev.alerts],
        activeAlerts: alert.resolvedAt ? prev.activeAlerts : [alert, ...prev.activeAlerts]
      }));

      // Show browser notification for critical alerts
      if (enableNotifications && alert.severity === 'critical' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`Security Alert: ${alert.title}`, {
            body: alert.description,
            icon: '/favicon.ico',
            tag: alert.id,
            requireInteraction: true
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(`Security Alert: ${alert.title}`, {
                body: alert.description,
                icon: '/favicon.ico',
                tag: alert.id,
                requireInteraction: true
              });
            }
          });
        }
      }
    });

    return unsubscribe;
  }, [enableNotifications]);

  // Real-time metrics subscription
  useEffect(() => {
    const unsubscribe = securityMonitor.subscribeToMetrics((metrics) => {
      setState(prev => ({ ...prev, metrics }));
    });

    return unsubscribe;
  }, []);

  // Auto-refresh
  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadData, autoRefresh, refreshInterval]);

  // Actions
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const success = securityMonitor.acknowledgeAlert(alertId);
      if (success) {
        setState(prev => ({
          ...prev,
          alerts: prev.alerts.map(alert =>
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          ),
          activeAlerts: prev.activeAlerts.map(alert =>
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          )
        }));
      }
      return success;
    } catch (error) {
      console.error('[SECURITY-HOOK] Error acknowledging alert:', error);
      return false;
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const success = securityMonitor.resolveAlert(alertId);
      if (success) {
        const resolvedAt = new Date().toISOString();
        setState(prev => ({
          ...prev,
          alerts: prev.alerts.map(alert =>
            alert.id === alertId ? { ...alert, resolvedAt, acknowledged: true } : alert
          ),
          activeAlerts: prev.activeAlerts.filter(alert => alert.id !== alertId)
        }));
      }
      return success;
    } catch (error) {
      console.error('[SECURITY-HOOK] Error resolving alert:', error);
      return false;
    }
  }, []);

  const toggleRule = useCallback(async (ruleId: string, enabled: boolean) => {
    try {
      const success = securityMonitor.toggleRule(ruleId, enabled);
      if (success) {
        setState(prev => ({
          ...prev,
          rules: prev.rules.map(rule =>
            rule.id === ruleId ? { ...rule, enabled } : rule
          )
        }));
      }
      return success;
    } catch (error) {
      console.error('[SECURITY-HOOK] Error toggling rule:', error);
      return false;
    }
  }, []);

  const updateRule = useCallback(async (rule: MonitoringRule) => {
    try {
      securityMonitor.updateRule(rule);
      setState(prev => ({
        ...prev,
        rules: prev.rules.map(r => r.id === rule.id ? rule : r)
      }));
      return true;
    } catch (error) {
      console.error('[SECURITY-HOOK] Error updating rule:', error);
      return false;
    }
  }, []);

  const generateTestAlert = useCallback(async () => {
    try {
      const alert = securityMonitor.generateAlert(
        'critical_event',
        'high',
        'Test Security Alert',
        'This is a test alert generated from the monitoring hook',
        []
      );
      return alert;
    } catch (error) {
      console.error('[SECURITY-HOOK] Error generating test alert:', error);
      return null;
    }
  }, []);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    ...state,
    actions: {
      acknowledgeAlert,
      resolveAlert,
      toggleRule,
      updateRule,
      generateTestAlert,
      refresh
    }
  };
}