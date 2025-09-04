/**
 * Real-time Debug and Logging System
 * 
 * Provides comprehensive logging, debugging, and monitoring capabilities
 * for real-time subscriptions and data synchronization.
 */

import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { RealtimeAuthState } from './realtime-auth';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corrections?: any[];
}

export interface SubscriptionStatus {
  state: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  networkState?: 'online' | 'offline' | 'unknown';
  error?: string;
  lastConnected?: Date;
  reconnectAttempts?: number;
}

export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'auth' | 'subscription' | 'data' | 'network' | 'validation' | 'performance';
  message: string;
  data?: any;
  userId?: string;
  subscriptionId?: string;
  table?: string;
  context?: Record<string, any>;
}

export interface PerformanceMetrics {
  subscriptionSetupTime?: number;
  dataFetchTime?: number;
  realtimeLatency?: number;
  optimisticUpdateTime?: number;
  validationTime?: number;
  renderTime?: number;
}

export interface ConnectionHealthReport {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  subscriptions: Array<{
    id: string;
    table: string;
    status: SubscriptionStatus;
    lastActivity?: Date;
    errorCount: number;
    reconnectCount: number;
  }>;
  authState: RealtimeAuthState;
  networkState: 'online' | 'offline' | 'unknown';
  metrics: PerformanceMetrics;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestion?: string;
  }>;
}

class RealtimeDebugger {
  private static instance: RealtimeDebugger;
  private logs: DebugLogEntry[] = [];
  private maxLogEntries = 1000;
  private metrics: PerformanceMetrics = {};
  private startTimes = new Map<string, number>();
  private eventCounts = new Map<string, number>();
  private listeners: Array<(entry: DebugLogEntry) => void> = [];
  private performanceObserver?: PerformanceObserver;

  private constructor() {
    this.setupPerformanceMonitoring();
    this.startMemoryMonitoring();
  }

  static getInstance(): RealtimeDebugger {
    if (!RealtimeDebugger.instance) {
      RealtimeDebugger.instance = new RealtimeDebugger();
    }
    return RealtimeDebugger.instance;
  }

  private setupPerformanceMonitoring() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('realtime')) {
            this.logPerformanceEntry(entry);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (error) {
      console.warn('[REALTIME-DEBUG] Performance monitoring not available:', error);
    }
  }

  private startMemoryMonitoring() {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.log('debug', 'performance', 'Memory usage', {
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        });
      }
    }, 30000); // Every 30 seconds
  }

  private logPerformanceEntry(entry: PerformanceEntry) {
    this.log('debug', 'performance', `Performance entry: ${entry.name}`, {
      duration: entry.duration,
      startTime: entry.startTime,
      type: entry.entryType
    });
  }

  // Core logging functionality
  log(
    level: 'debug' | 'info' | 'warn' | 'error',
    category: 'auth' | 'subscription' | 'data' | 'network' | 'validation' | 'performance',
    message: string,
    data?: any,
    context?: {
      userId?: string;
      subscriptionId?: string;
      table?: string;
      [key: string]: any;
    }
  ) {
    const entry: DebugLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      userId: context?.userId,
      subscriptionId: context?.subscriptionId,
      table: context?.table,
      context
    };

    // Add to logs array
    this.logs.unshift(entry);

    // Trim logs if exceeding max entries
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(0, this.maxLogEntries);
    }

    // Console output with structured formatting
    const consoleMethod = level === 'debug' ? 'log' : level;
    const prefix = `[REALTIME-${category.toUpperCase()}]`;
    const timestamp = entry.timestamp.toISOString().substr(11, 12);
    
    if (data) {
      console[consoleMethod](`${prefix} ${timestamp} ${message}`, data);
    } else {
      console[consoleMethod](`${prefix} ${timestamp} ${message}`);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('[REALTIME-DEBUG] Listener error:', error);
      }
    });

    // Count events for analytics
    const eventKey = `${category}_${level}`;
    this.eventCounts.set(eventKey, (this.eventCounts.get(eventKey) || 0) + 1);
  }

  // Authentication debugging
  logAuthEvent(event: string, authState: RealtimeAuthState, details?: any) {
    this.log('info', 'auth', `Auth event: ${event}`, {
      isAuthenticated: authState.isAuthenticated,
      hasSession: !!authState.session,
      isExpiringSoon: authState.isExpiringSoon,
      retryCount: authState.retryCount,
      error: authState.error,
      lastRefresh: authState.lastRefresh,
      userEmail: authState.user?.email,
      ...details
    }, {
      userId: authState.user?.id
    });
  }

  // Subscription debugging
  logSubscriptionEvent(
    event: string, 
    subscriptionId: string, 
    table: string, 
    status?: SubscriptionStatus, 
    details?: any
  ) {
    this.log('info', 'subscription', `Subscription event: ${event}`, {
      status: status?.state,
      networkState: status?.networkState,
      reconnectAttempts: status?.reconnectAttempts,
      lastConnected: status?.lastConnected,
      error: status?.error,
      ...details
    }, {
      subscriptionId,
      table,
      userId: details?.userId
    });
  }

  // Data synchronization debugging
  logDataEvent(
    event: string,
    table: string,
    payload?: RealtimePostgresChangesPayload<any>,
    validationResult?: ValidationResult,
    details?: any
  ) {
    this.log('info', 'data', `Data event: ${event}`, {
      eventType: payload?.eventType,
      recordId: (payload?.new as any)?.id || (payload?.old as any)?.id,
      schema: payload?.schema,
      table: payload?.table,
      validationPassed: validationResult?.isValid,
      validationErrors: validationResult?.errors,
      validationWarnings: validationResult?.warnings,
      ...details
    }, {
      table,
      userId: (payload?.new as any)?.user_id || (payload?.old as any)?.user_id || details?.userId
    });
  }

  // Network debugging
  logNetworkEvent(event: string, networkState: 'online' | 'offline' | 'unknown', details?: any) {
    this.log('info', 'network', `Network event: ${event}`, {
      networkState,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // Validation debugging
  logValidationEvent(
    event: string,
    result: ValidationResult,
    table?: string,
    recordId?: string,
    details?: any
  ) {
    const level = result.isValid ? 'debug' : (result.errors.length > 0 ? 'error' : 'warn');
    
    this.log(level, 'validation', `Validation event: ${event}`, {
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      errors: result.errors,
      warnings: result.warnings,
      corrections: result.corrections,
      recordId,
      ...details
    }, {
      table,
      userId: details?.userId
    });
  }

  // Performance measurement
  startTiming(operation: string): string {
    const timingId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.startTimes.set(timingId, performance.now());
    return timingId;
  }

  endTiming(timingId: string, operation: string, details?: any): number {
    const startTime = this.startTimes.get(timingId);
    if (!startTime) {
      this.log('warn', 'performance', `No start time found for timing: ${timingId}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(timingId);

    this.log('debug', 'performance', `${operation} completed`, {
      duration: `${duration.toFixed(2)}ms`,
      timingId,
      ...details
    });

    // Store in metrics
    const metricKey = operation.toLowerCase().replace(/\s+/g, '_') + '_time' as keyof PerformanceMetrics;
    (this.metrics as any)[metricKey] = duration;

    return duration;
  }

  // Generate comprehensive health report
  generateHealthReport(
    subscriptions: Array<{ id: string; status: SubscriptionStatus; table: string }>,
    authState: RealtimeAuthState,
    networkState: 'online' | 'offline' | 'unknown',
    additionalMetrics?: Partial<PerformanceMetrics>
  ): ConnectionHealthReport {
    const issues: ConnectionHealthReport['issues'] = [];
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Analyze auth health
    if (!authState.isAuthenticated || authState.error) {
      issues.push({
        severity: 'critical',
        description: 'Authentication issues detected',
        suggestion: 'Check authentication state and refresh tokens'
      });
      overallHealth = 'unhealthy';
    } else if (authState.isExpiringSoon) {
      issues.push({
        severity: 'medium',
        description: 'Auth token expiring soon',
        suggestion: 'Proactive token refresh recommended'
      });
      if (overallHealth === 'healthy') overallHealth = 'degraded';
    }

    // Analyze subscription health
    const unhealthySubscriptions = subscriptions.filter(s => 
      s.status.state === 'error' || s.status.state === 'disconnected'
    );
    const reconnectingSubscriptions = subscriptions.filter(s => 
      s.status.state === 'reconnecting'
    );

    if (unhealthySubscriptions.length > 0) {
      issues.push({
        severity: 'high',
        description: `${unhealthySubscriptions.length} subscription(s) in error state`,
        suggestion: 'Check network connectivity and authentication'
      });
      overallHealth = 'unhealthy';
    }

    if (reconnectingSubscriptions.length > 0) {
      issues.push({
        severity: 'medium',
        description: `${reconnectingSubscriptions.length} subscription(s) reconnecting`,
        suggestion: 'Monitor connection stability'
      });
      if (overallHealth === 'healthy') overallHealth = 'degraded';
    }

    // Analyze network health
    if (networkState === 'offline') {
      issues.push({
        severity: 'high',
        description: 'Network is offline',
        suggestion: 'Check internet connectivity'
      });
      overallHealth = 'unhealthy';
    }

    // Analyze performance metrics
    const combinedMetrics = { ...this.metrics, ...additionalMetrics };
    if (combinedMetrics.subscriptionSetupTime && combinedMetrics.subscriptionSetupTime > 5000) {
      issues.push({
        severity: 'medium',
        description: 'Slow subscription setup',
        suggestion: 'Check network latency and server performance'
      });
      if (overallHealth === 'healthy') overallHealth = 'degraded';
    }

    const report: ConnectionHealthReport = {
      timestamp: new Date(),
      overallHealth,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        table: s.table,
        status: s.status,
        errorCount: this.getEventCount(`subscription_error_${s.id}`),
        reconnectCount: this.getEventCount(`subscription_reconnect_${s.id}`),
        lastActivity: this.getLastActivityTime(s.id)
      })),
      authState,
      networkState,
      metrics: combinedMetrics,
      issues
    };

    this.log('info', 'performance', 'Health report generated', {
      overallHealth: report.overallHealth,
      subscriptionCount: report.subscriptions.length,
      issueCount: report.issues.length,
      metrics: report.metrics
    });

    return report;
  }

  private getEventCount(eventKey: string): number {
    return this.eventCounts.get(eventKey) || 0;
  }

  private getLastActivityTime(subscriptionId: string): Date | undefined {
    const recentLogs = this.logs
      .filter(log => log.subscriptionId === subscriptionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return recentLogs[0]?.timestamp;
  }

  // Query and filter logs
  getLogs(filter?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    category?: 'auth' | 'subscription' | 'data' | 'network' | 'validation' | 'performance';
    userId?: string;
    subscriptionId?: string;
    table?: string;
    since?: Date;
    limit?: number;
  }): DebugLogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }
    if (filter?.category) {
      filtered = filtered.filter(log => log.category === filter.category);
    }
    if (filter?.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId);
    }
    if (filter?.subscriptionId) {
      filtered = filtered.filter(log => log.subscriptionId === filter.subscriptionId);
    }
    if (filter?.table) {
      filtered = filtered.filter(log => log.table === filter.table);
    }
    if (filter?.since) {
      filtered = filtered.filter(log => log.timestamp >= filter.since!);
    }
    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  // Export logs for analysis
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'category', 'message', 'userId', 'subscriptionId', 'table'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.timestamp.toISOString(),
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
          log.userId || '',
          log.subscriptionId || '',
          log.table || ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  // Analytics and insights
  getAnalytics(timeWindow: 'hour' | 'day' | 'week' = 'hour') {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.getTimeWindowMs(timeWindow));
    const windowLogs = this.logs.filter(log => log.timestamp >= windowStart);

    const analytics = {
      totalEvents: windowLogs.length,
      eventsByLevel: this.groupBy(windowLogs, 'level'),
      eventsByCategory: this.groupBy(windowLogs, 'category'),
      errorRate: windowLogs.filter(log => log.level === 'error').length / windowLogs.length,
      mostActiveUsers: this.getMostActive(windowLogs, 'userId'),
      mostActiveSubscriptions: this.getMostActive(windowLogs, 'subscriptionId'),
      averageMetrics: this.getAverageMetrics()
    };

    return analytics;
  }

  private getTimeWindowMs(window: 'hour' | 'day' | 'week'): number {
    switch (window) {
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private groupBy(logs: DebugLogEntry[], key: keyof DebugLogEntry): Record<string, number> {
    const groups: Record<string, number> = {};
    logs.forEach(log => {
      const value = (log[key] as string) || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
    });
    return groups;
  }

  private getMostActive(logs: DebugLogEntry[], key: keyof DebugLogEntry, limit: number = 5): Array<{ value: string; count: number }> {
    const grouped = this.groupBy(logs, key);
    return Object.entries(grouped)
      .filter(([value]) => value !== 'unknown' && value !== '')
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));
  }

  private getAverageMetrics(): PerformanceMetrics {
    const metricKeys = Object.keys(this.metrics) as (keyof PerformanceMetrics)[];
    const averages: any = {};
    
    metricKeys.forEach(key => {
      const value = this.metrics[key];
      if (typeof value === 'number') {
        averages[key] = value;
      }
    });
    
    return averages;
  }

  // Event listeners
  addLogListener(listener: (entry: DebugLogEntry) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Clear logs and reset state
  clearLogs() {
    this.logs = [];
    this.eventCounts.clear();
    this.startTimes.clear();
    this.metrics = {};
    
    this.log('info', 'performance', 'Debug logs cleared');
  }

  // Utility for conditional debugging
  isDebugEnabled(): boolean {
    return typeof window !== 'undefined' && 
           (window.localStorage?.getItem('realtimeDebug') === 'true' ||
            (window as any).__REALTIME_DEBUG__ === true);
  }

  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.listeners = [];
    this.clearLogs();
    RealtimeDebugger.instance = null as any;
  }
}

// Export singleton instance
export const realtimeDebugger = RealtimeDebugger.getInstance();

// Utility functions for easy logging
export function logRealtimeEvent(
  level: 'debug' | 'info' | 'warn' | 'error',
  category: 'auth' | 'subscription' | 'data' | 'network' | 'validation' | 'performance',
  message: string,
  data?: any,
  context?: any
) {
  realtimeDebugger.log(level, category, message, data, context);
}

export function startRealtimeTiming(operation: string): string {
  return realtimeDebugger.startTiming(operation);
}

export function endRealtimeTiming(timingId: string, operation: string, details?: any): number {
  return realtimeDebugger.endTiming(timingId, operation, details);
}

export function getRealtimeLogs(filter?: any): DebugLogEntry[] {
  return realtimeDebugger.getLogs(filter);
}

export function generateRealtimeHealthReport(
  subscriptions: any,
  authState: RealtimeAuthState,
  networkState: 'online' | 'offline' | 'unknown',
  metrics?: Partial<PerformanceMetrics>
): ConnectionHealthReport {
  return realtimeDebugger.generateHealthReport(subscriptions, authState, networkState, metrics);
}
