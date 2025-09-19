/**
 * Production Monitoring Service
 * 
 * Enterprise-grade monitoring system for production deployments.
 * Handles real-time monitoring, alerting, performance tracking, and system health.
 */

import { createClient } from '@supabase/supabase-js';
import { getEnvironmentConfig } from '@/lib/config/env-validation';
import { shouldAutoStartService } from '@/lib/runtime-flags';

export interface MonitoringMetrics {
  timestamp: string;
  performance: {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    eventLoopLag: number;
    activeConnections: number;
  };
  database: {
    connectionHealth: 'healthy' | 'degraded' | 'failed';
    queryPerformance: number;
    activeConnections?: number;
  };
  authentication: {
    successRate: number;
    failureRate: number;
    activeUsers: number;
  };
  errors: {
    errorRate: number;
    criticalErrors: number;
    recentErrors: ErrorMetric[];
  };
}

export interface ErrorMetric {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  stack?: string;
  context?: any;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: MonitoringMetrics) => boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: string;
  severity: AlertRule['severity'];
  message: string;
  metrics: Partial<MonitoringMetrics>;
  acknowledged: boolean;
  resolvedAt?: string;
}

class ProductionMonitoringService {
  private config: any;
  private metrics: MonitoringMetrics[] = [];
  private errors: ErrorMetric[] = [];
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  
  // Performance tracking
  private requestCounts = new Map<string, number>();
  private responseTimes = new Map<string, number[]>();
  private lastResetTime = Date.now();

  constructor() {
    this.config = getEnvironmentConfig();
    this.initializeDefaultAlertRules();
  }

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      // Database health alerts
      {
        id: 'database-connection-failed',
        name: 'Database Connection Failed',
        condition: (metrics) => metrics.database.connectionHealth === 'failed',
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 5
      },
      {
        id: 'database-performance-degraded',
        name: 'Database Performance Degraded',
        condition: (metrics) => metrics.database.queryPerformance > 2000,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 10
      },

      // Performance alerts
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        condition: (metrics) => {
          const memUsageMB = metrics.performance.memoryUsage.heapUsed / 1024 / 1024;
          return memUsageMB > 400; // 400MB threshold
        },
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 15
      },
      {
        id: 'event-loop-lag',
        name: 'Event Loop Lag Detected',
        condition: (metrics) => metrics.performance.eventLoopLag > 100,
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 5
      },

      // Authentication alerts
      {
        id: 'auth-failure-rate-high',
        name: 'High Authentication Failure Rate',
        condition: (metrics) => metrics.authentication.failureRate > 0.1, // >10% failure rate
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 10
      },

      // Error rate alerts
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.errors.errorRate > 0.05, // >5% error rate
        severity: 'error',
        enabled: true,
        cooldownPeriod: 5
      },
      {
        id: 'critical-errors-detected',
        name: 'Critical Errors Detected',
        condition: (metrics) => metrics.errors.criticalErrors > 0,
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 1
      }
    ];
  }

  /**
   * Start continuous monitoring
   */
  public startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.warn('Monitoring is already running');
      return;
    }

    console.log('🔍 Starting production monitoring service...');
    this.isMonitoring = true;

    // Collect initial metrics
    this.collectMetrics();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.evaluateAlertRules();
        await this.cleanupOldData();
      } catch (error) {
        this.logError('monitoring-service-error', error, 'critical');
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🔍 Stopping production monitoring service...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.isMonitoring = false;
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Performance metrics
      const memUsage = process.memoryUsage();
      const eventLoopLag = await this.measureEventLoopLag();
      
      // Database health
      const databaseHealth = await this.checkDatabaseHealth();
      
      // Authentication metrics (simplified - in production would track real auth events)
      const authMetrics = this.getAuthenticationMetrics();
      
      // Error metrics
      const errorMetrics = this.getErrorMetrics();
      
      const metrics: MonitoringMetrics = {
        timestamp: new Date().toISOString(),
        performance: {
          responseTime: Date.now() - startTime,
          memoryUsage: memUsage,
          eventLoopLag,
          activeConnections: 1 // Simplified
        },
        database: databaseHealth,
        authentication: authMetrics,
        errors: errorMetrics
      };

      // Store metrics
      this.metrics.push(metrics);
      
      // Keep only last 100 metrics to prevent memory leaks
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }
      
    } catch (error) {
      this.logError('metrics-collection-failed', error, 'error');
    }
  }

  /**
   * Measure event loop lag
   */
  private async measureEventLoopLag(): Promise<number> {
    return new Promise(resolve => {
      const start = Date.now();
      setImmediate(() => {
        resolve(Date.now() - start);
      });
    });
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<MonitoringMetrics['database']> {
    const startTime = Date.now();
    
    try {
      if (!this.config.supabase.serviceRoleKey) {
        return {
          connectionHealth: 'failed',
          queryPerformance: 0
        };
      }

      const supabase = createClient(
        this.config.supabase.url,
        this.config.supabase.serviceRoleKey
      );

      // Simple health check query
      const { error } = await Promise.race([
        supabase.from('profiles').select('count', { count: 'exact', head: true }),
        new Promise<{ error: Error }>((_, reject) => 
          setTimeout(() => reject({ error: new Error('Database timeout') }), 5000)
        )
      ]);

      const queryTime = Date.now() - startTime;
      
      if (error) {
        return {
          connectionHealth: 'failed',
          queryPerformance: queryTime
        };
      }
      
      return {
        connectionHealth: queryTime > 2000 ? 'degraded' : 'healthy',
        queryPerformance: queryTime
      };
      
    } catch (error) {
      return {
        connectionHealth: 'failed',
        queryPerformance: Date.now() - startTime
      };
    }
  }

  /**
   * Get authentication metrics
   */
  private getAuthenticationMetrics(): MonitoringMetrics['authentication'] {
    // In production, these would be tracked from actual auth events
    return {
      successRate: 0.95, // 95% success rate
      failureRate: 0.05, // 5% failure rate
      activeUsers: 0 // Would track real active users
    };
  }

  /**
   * Get error metrics
   */
  private getErrorMetrics(): MonitoringMetrics['errors'] {
    const recentErrors = this.errors.slice(-10); // Last 10 errors
    const criticalErrors = recentErrors.filter(e => e.level === 'critical').length;
    const totalRequests = Math.max(Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0), 1);
    const totalErrors = recentErrors.length;
    
    return {
      errorRate: totalErrors / totalRequests,
      criticalErrors,
      recentErrors
    };
  }

  /**
   * Evaluate alert rules and trigger alerts
   */
  private async evaluateAlertRules(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      
      // Check cooldown period
      if (rule.lastTriggered) {
        const lastTriggeredTime = new Date(rule.lastTriggered).getTime();
        const cooldownMs = rule.cooldownPeriod * 60 * 1000;
        if (Date.now() - lastTriggeredTime < cooldownMs) {
          continue;
        }
      }
      
      // Evaluate rule condition
      if (rule.condition(latestMetrics)) {
        await this.triggerAlert(rule, latestMetrics);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, metrics: MonitoringMetrics): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      timestamp: new Date().toISOString(),
      severity: rule.severity,
      message: `Alert: ${rule.name}`,
      metrics: metrics,
      acknowledged: false
    };
    
    this.alerts.push(alert);
    rule.lastTriggered = alert.timestamp;
    
    // Log alert
    console.log(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${rule.name}`);
    
    // In production, this would send alerts via email, Slack, PagerDuty, etc.
    if (this.config.isProduction) {
      await this.sendProductionAlert(alert);
    }
  }

  /**
   * Send production alert (placeholder for real implementation)
   */
  private async sendProductionAlert(alert: Alert): Promise<void> {
    // In production, implement actual alerting:
    // - Send email via configured email provider
    // - Send to Slack webhook
    // - Create PagerDuty incident
    // - Send SMS via Twilio
    
    console.log(`📧 Would send production alert: ${alert.message}`);
  }

  /**
   * Log an error with metadata
   */
  public logError(type: string, error: any, level: ErrorMetric['level'] = 'error', context?: any): void {
    const errorMetric: ErrorMetric = {
      timestamp: new Date().toISOString(),
      level,
      message: `${type}: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context
    };
    
    this.errors.push(errorMetric);
    
    // Keep only last 1000 errors to prevent memory leaks
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }
    
    // Log to console
    const logMethod = level === 'critical' ? console.error : 
                     level === 'error' ? console.error :
                     level === 'warning' ? console.warn : console.log;
    
    logMethod(`[${level.toUpperCase()}] ${errorMetric.message}`);
  }

  /**
   * Track request metrics
   */
  public trackRequest(endpoint: string, responseTime: number): void {
    // Update request counts
    this.requestCounts.set(endpoint, (this.requestCounts.get(endpoint) || 0) + 1);
    
    // Track response times
    const times = this.responseTimes.get(endpoint) || [];
    times.push(responseTime);
    
    // Keep only last 100 response times per endpoint
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
    
    this.responseTimes.set(endpoint, times);
  }

  /**
   * Get current monitoring status
   */
  public getStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    errorsCount: number;
    activeAlerts: number;
    latestMetrics?: MonitoringMetrics;
  } {
    const activeAlerts = this.alerts.filter(alert => !alert.acknowledged && !alert.resolvedAt).length;
    
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length,
      errorsCount: this.errors.length,
      activeAlerts,
      latestMetrics: this.metrics[this.metrics.length - 1]
    };
  }

  /**
   * Get performance dashboard data
   */
  public getDashboardData(): {
    metrics: MonitoringMetrics[];
    alerts: Alert[];
    errors: ErrorMetric[];
    requestMetrics: {
      endpoint: string;
      count: number;
      averageResponseTime: number;
    }[];
  } {
    // Calculate request metrics
    const requestMetrics = Array.from(this.requestCounts.entries()).map(([endpoint, count]) => {
      const times = this.responseTimes.get(endpoint) || [];
      const averageResponseTime = times.length > 0 
        ? times.reduce((sum, time) => sum + time, 0) / times.length 
        : 0;
      
      return {
        endpoint,
        count,
        averageResponseTime: Math.round(averageResponseTime)
      };
    });
    
    return {
      metrics: this.metrics.slice(-50), // Last 50 metrics
      alerts: this.alerts.slice(-20), // Last 20 alerts
      errors: this.errors.slice(-50), // Last 50 errors
      requestMetrics
    };
  }

  /**
   * Clean up old data
   */
  private async cleanupOldData(): Promise<void> {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Clean up old alerts
    this.alerts = this.alerts.filter(alert => {
      return new Date(alert.timestamp).getTime() > cutoffTime;
    });
    
    // Reset request counters periodically (every hour)
    if (Date.now() - this.lastResetTime > 60 * 60 * 1000) {
      this.requestCounts.clear();
      this.responseTimes.clear();
      this.lastResetTime = Date.now();
    }
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date().toISOString();
      alert.acknowledged = true;
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const productionMonitoring = new ProductionMonitoringService();

// Auto-start monitoring in production runtime (skip during build/test)
if (
  typeof window === 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  shouldAutoStartService()
) {
  // Start monitoring with 1-minute intervals in production
  productionMonitoring.startMonitoring(60000);

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down monitoring...');
    productionMonitoring.stopMonitoring();
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down monitoring...');
    productionMonitoring.stopMonitoring();
    process.exit(0);
  });
}

export default ProductionMonitoringService;
