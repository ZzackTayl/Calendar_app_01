import { useState, useEffect } from 'react';

interface SecurityMetrics {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: string;
  threats: number;
  uptime: string;
  riskScore: number;
  activeAlerts: number;
  totalEvents: number;
  suspiciousPatterns: number;
  eventsByType: Record<string, number>;
}

interface SecurityMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
}

export function useSecurityMonitoring(options: SecurityMonitoringOptions = {}) {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    threats: 0,
    uptime: '100%',
    riskScore: 15,
    activeAlerts: 0,
    totalEvents: 42,
    suspiciousPatterns: 1,
    eventsByType: {
      'auth': 25,
      'access': 12,
      'security': 5
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alerts = [];
  const activeAlerts = [];
  const events = [];
  const rules = [];

  const actions = {
    refreshData: () => {
      setMetrics(prev => ({
        ...prev,
        lastCheck: new Date().toISOString()
      }));
    }
  };

  useEffect(() => {
    if (options.autoRefresh) {
      const interval = setInterval(() => {
        setMetrics(prev => ({
          ...prev,
          lastCheck: new Date().toISOString()
        }));
      }, options.refreshInterval || 60000);

      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, options.refreshInterval]);

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
