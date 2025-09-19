/**
 * Real-time Security Event Monitoring Service
 * Provides real-time detection, alerting, and monitoring for security events
 */

import { securityLogger, type SecurityEvent, type SecurityEventType, type SecuritySeverity } from './event-logger';
import { shouldAutoStartService } from '@/lib/runtime-flags';

// Re-export SecuritySeverity for other modules
export type { SecuritySeverity };

import { securityAlerting } from './alerting-service';

export interface SecurityAlert {
  id: string;
  timestamp: string;
  type: 'pattern_detected' | 'threshold_exceeded' | 'critical_event' | 'anomaly_detected';
  severity: SecuritySeverity;
  title: string;
  description: string;
  events: SecurityEvent[];
  acknowledged: boolean;
  resolvedAt?: string;
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  eventType?: SecurityEventType;
  threshold: number;
  timeWindow: number; // minutes
  severity: SecuritySeverity;
  enabled: boolean;
  alertOnMatch: boolean;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  alertsGenerated: number;
  activeAlerts: number;
  suspiciousPatterns: string[];
  riskScore: number;
}

class SecurityMonitoringService {
  private alerts: SecurityAlert[] = [];
  private subscribers: ((alert: SecurityAlert) => void)[] = [];
  private metricsSubscribers: ((metrics: SecurityMetrics) => void)[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private readonly maxAlerts = 1000;

  private readonly defaultRules: MonitoringRule[] = [
    {
      id: 'auth_bypass_critical',
      name: 'Authentication Bypass Detection',
      description: 'Detects multiple authentication bypass attempts',
      eventType: 'auth_bypass_attempt',
      threshold: 1, // Alert on any bypass attempt
      timeWindow: 5,
      severity: 'critical',
      enabled: true,
      alertOnMatch: true
    },
    {
      id: 'session_validation_failures',
      name: 'Session Validation Failures',
      description: 'Detects multiple session validation failures',
      eventType: 'session_validation_failed',
      threshold: 5,
      timeWindow: 10,
      severity: 'high',
      enabled: true,
      alertOnMatch: true
    },
    {
      id: 'unauthorized_access_pattern',
      name: 'Unauthorized Access Pattern',
      description: 'Detects patterns of unauthorized access attempts',
      eventType: 'unauthorized_access',
      threshold: 10,
      timeWindow: 15,
      severity: 'medium',
      enabled: true,
      alertOnMatch: true
    },
    {
      id: 'demo_mode_security',
      name: 'Demo Mode Security Events',
      description: 'Monitors demo mode activation in production',
      eventType: 'demo_mode_activated',
      threshold: 1,
      timeWindow: 5,
      severity: 'high',
      enabled: true,
      alertOnMatch: true
    },
    {
      id: 'suspicious_activity_burst',
      name: 'Suspicious Activity Burst',
      description: 'Detects bursts of suspicious activity',
      eventType: 'suspicious_activity',
      threshold: 3,
      timeWindow: 5,
      severity: 'high',
      enabled: true,
      alertOnMatch: true
    }
  ];

  private rules: MonitoringRule[] = [...this.defaultRules];

  constructor() {
    if (shouldAutoStartService()) {
      this.startMonitoring();
    }
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Check for security events every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkSecurityRules();
      this.updateMetrics();
    }, 30000);

    console.log('[SECURITY-MONITOR] Real-time monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    console.log('[SECURITY-MONITOR] Monitoring stopped');
  }

  /**
   * Subscribe to real-time alerts
   */
  subscribeToAlerts(callback: (alert: SecurityAlert) => void): () => void {
    this.subscribers.push(callback);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to metrics updates
   */
  subscribeToMetrics(callback: (metrics: SecurityMetrics) => void): () => void {
    this.metricsSubscribers.push(callback);
    
    return () => {
      const index = this.metricsSubscribers.indexOf(callback);
      if (index > -1) {
        this.metricsSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Generate security alert
   */
  generateAlert(
    type: SecurityAlert['type'],
    severity: SecuritySeverity,
    title: string,
    description: string,
    events: SecurityEvent[]
  ): SecurityAlert {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      title,
      description,
      events,
      acknowledged: false
    };

    // Add to alerts list
    this.alerts.push(alert);
    
    // Maintain alert limit
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Log the alert
    console.error(`[SECURITY-ALERT-${severity.toUpperCase()}] ${title}`, {
      alertId: alert.id,
      description,
      eventCount: events.length,
      events: events.slice(0, 3) // Log first 3 events
    });

    // Notify subscribers
    this.notifySubscribers(alert);

    // Send through alerting system
    securityAlerting.sendAlert(alert);

    // Log as security event
    securityLogger.logEvent('security_alert', {
      alertId: alert.id,
      alertType: type,
      title,
      description,
      eventCount: events.length,
      relatedEvents: events.map(e => e.id)
    }, 'monitoring_service', severity);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      console.log(`[SECURITY-MONITOR] Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = new Date().toISOString();
      alert.acknowledged = true;
      console.log(`[SECURITY-MONITOR] Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return this.alerts
      .filter(alert => !alert.resolvedAt)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100): SecurityAlert[] {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(timeWindow: number = 60): SecurityMetrics {
    const stats = securityLogger.getSecurityStats(timeWindow);
    const activeAlerts = this.getActiveAlerts();
    const recentAlerts = this.alerts.filter(
      alert => new Date(alert.timestamp) > new Date(Date.now() - timeWindow * 60 * 1000)
    );

    return {
      totalEvents: stats.totalEvents,
      eventsByType: stats.eventsByType,
      eventsBySeverity: stats.eventsBySeverity,
      alertsGenerated: recentAlerts.length,
      activeAlerts: activeAlerts.length,
      suspiciousPatterns: stats.suspiciousPatterns,
      riskScore: this.calculateRiskScore(stats, activeAlerts)
    };
  }

  /**
   * Add or update monitoring rule
   */
  updateRule(rule: MonitoringRule): void {
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
    console.log(`[SECURITY-MONITOR] Rule updated: ${rule.name}`);
  }

  /**
   * Get monitoring rules
   */
  getRules(): MonitoringRule[] {
    return [...this.rules];
  }

  /**
   * Enable/disable rule
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      console.log(`[SECURITY-MONITOR] Rule ${enabled ? 'enabled' : 'disabled'}: ${rule.name}`);
      return true;
    }
    return false;
  }

  /**
   * Check security rules against recent events
   */
  private checkSecurityRules(): void {
    const enabledRules = this.rules.filter(rule => rule.enabled);
    
    enabledRules.forEach(rule => {
      const cutoff = new Date(Date.now() - rule.timeWindow * 60 * 1000);
      const recentEvents = securityLogger.getRecentEvents(1000, rule.eventType)
        .filter(event => new Date(event.timestamp) > cutoff);

      if (recentEvents.length >= rule.threshold && rule.alertOnMatch) {
        // Check if we already have a recent alert for this rule
        const recentAlert = this.alerts.find(alert => 
          alert.type === 'threshold_exceeded' &&
          alert.description.includes(rule.name) &&
          new Date(alert.timestamp) > new Date(Date.now() - rule.timeWindow * 60 * 1000)
        );

        if (!recentAlert) {
          this.generateAlert(
            'threshold_exceeded',
            rule.severity,
            `Security Rule Triggered: ${rule.name}`,
            `${rule.description}. Detected ${recentEvents.length} events in ${rule.timeWindow} minutes (threshold: ${rule.threshold})`,
            recentEvents.slice(0, 10) // Include up to 10 events
          );
        }
      }
    });
  }

  /**
   * Update metrics for subscribers
   */
  private updateMetrics(): void {
    const metrics = this.getSecurityMetrics();
    this.metricsSubscribers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('[SECURITY-MONITOR] Error notifying metrics subscriber:', error);
      }
    });
  }

  /**
   * Notify alert subscribers
   */
  private notifySubscribers(alert: SecurityAlert): void {
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('[SECURITY-MONITOR] Error notifying alert subscriber:', error);
      }
    });
  }

  /**
   * Calculate risk score based on events and alerts
   */
  private calculateRiskScore(stats: any, activeAlerts: SecurityAlert[]): number {
    let score = 0;

    // Base score from event severity
    score += (stats.eventsBySeverity.critical || 0) * 10;
    score += (stats.eventsBySeverity.high || 0) * 5;
    score += (stats.eventsBySeverity.medium || 0) * 2;
    score += (stats.eventsBySeverity.low || 0) * 1;

    // Additional score from active alerts
    activeAlerts.forEach(alert => {
      switch (alert.severity) {
        case 'critical': score += 20; break;
        case 'high': score += 10; break;
        case 'medium': score += 5; break;
        case 'low': score += 2; break;
      }
    });

    // Suspicious patterns increase score
    score += stats.suspiciousPatterns.length * 15;

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitoringService();

// Convenience functions
export const subscribeToSecurityAlerts = (callback: (alert: SecurityAlert) => void) => 
  securityMonitor.subscribeToAlerts(callback);

export const subscribeToSecurityMetrics = (callback: (metrics: SecurityMetrics) => void) => 
  securityMonitor.subscribeToMetrics(callback);

export const generateSecurityAlert = (
  type: SecurityAlert['type'],
  severity: SecuritySeverity,
  title: string,
  description: string,
  events: SecurityEvent[]
) => securityMonitor.generateAlert(type, severity, title, description, events);

export const getActiveSecurityAlerts = () => securityMonitor.getActiveAlerts();
export const getSecurityMetrics = (timeWindow?: number) => securityMonitor.getSecurityMetrics(timeWindow);
export const acknowledgeSecurityAlert = (alertId: string) => securityMonitor.acknowledgeAlert(alertId);
export const resolveSecurityAlert = (alertId: string) => securityMonitor.resolveAlert(alertId);
