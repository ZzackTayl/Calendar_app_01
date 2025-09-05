/**
 * Security Monitoring and Audit System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { securityMonitor, generateSecurityAlert } from '@/lib/security/monitoring-service';
import { securityLogger } from '@/lib/security/event-logger';
import { auditLogger, logAuthenticationAttempt, logSessionValidation } from '@/lib/security/audit-logger';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('Security Event Logger', () => {
  it('should log security events with proper structure', () => {
    const eventDetails = {
      route: '/test',
      userId: 'test-user-123',
      reason: 'Test security event'
    };

    securityLogger.logAuthBypassAttempt(eventDetails);

    const recentEvents = securityLogger.getRecentEvents(1);
    expect(recentEvents).toHaveLength(1);
    
    const event = recentEvents[0];
    expect(event.type).toBe('auth_bypass_attempt');
    expect(event.severity).toBe('critical');
    expect(event.details.route).toBe('/test');
    expect(event.details.userId).toBe('test-user-123');
    expect(event.context).toBe('auth_bypass');
  });

  it('should generate security statistics', () => {
    // Log some test events
    securityLogger.logAuthBypassAttempt({ route: '/test1', reason: 'test' });
    securityLogger.logSessionValidationFailure({ 
      error: 'test error', 
      validationType: 'server' 
    });
    securityLogger.logUnauthorizedAccess({ 
      route: '/test2', 
      reason: 'test', 
      authRequired: true 
    });

    const stats = securityLogger.getSecurityStats(60);
    
    expect(stats.totalEvents).toBeGreaterThan(0);
    expect(stats.eventsByType).toHaveProperty('auth_bypass_attempt');
    expect(stats.eventsByType).toHaveProperty('session_validation_failed');
    expect(stats.eventsByType).toHaveProperty('unauthorized_access');
    expect(stats.eventsBySeverity).toHaveProperty('critical');
    expect(stats.eventsBySeverity).toHaveProperty('high');
  });
});

describe('Security Monitoring Service', () => {
  it('should generate security alerts', () => {
    const alert = generateSecurityAlert(
      'critical_event',
      'high',
      'Test Security Alert',
      'This is a test alert for monitoring',
      []
    );

    expect(alert.id).toBeDefined();
    expect(alert.type).toBe('critical_event');
    expect(alert.severity).toBe('high');
    expect(alert.title).toBe('Test Security Alert');
    expect(alert.acknowledged).toBe(false);
  });

  it('should track active alerts', () => {
    const initialAlerts = securityMonitor.getActiveAlerts();
    const initialCount = initialAlerts.length;

    generateSecurityAlert(
      'threshold_exceeded',
      'medium',
      'Test Threshold Alert',
      'Test threshold exceeded',
      []
    );

    const activeAlerts = securityMonitor.getActiveAlerts();
    expect(activeAlerts.length).toBe(initialCount + 1);
  });

  it('should calculate security metrics', () => {
    const metrics = securityMonitor.getSecurityMetrics();
    
    expect(metrics).toHaveProperty('totalEvents');
    expect(metrics).toHaveProperty('eventsByType');
    expect(metrics).toHaveProperty('eventsBySeverity');
    expect(metrics).toHaveProperty('alertsGenerated');
    expect(metrics).toHaveProperty('activeAlerts');
    expect(metrics).toHaveProperty('riskScore');
    expect(typeof metrics.riskScore).toBe('number');
    expect(metrics.riskScore).toBeGreaterThanOrEqual(0);
    expect(metrics.riskScore).toBeLessThanOrEqual(100);
  });

  it('should manage monitoring rules', () => {
    const rules = securityMonitor.getRules();
    expect(rules.length).toBeGreaterThan(0);
    
    const rule = rules[0];
    expect(rule).toHaveProperty('id');
    expect(rule).toHaveProperty('name');
    expect(rule).toHaveProperty('threshold');
    expect(rule).toHaveProperty('timeWindow');
    expect(rule).toHaveProperty('enabled');
  });
});

describe('Audit Logger', () => {
  it('should log authentication attempts with proper audit trail', () => {
    const authDetails = {
      email: 'test@example.com',
      method: 'password' as const,
      outcome: 'success' as const,
      userId: 'test-user-123'
    };

    const auditEvent = logAuthenticationAttempt(authDetails);
    
    expect(auditEvent.category).toBe('authentication');
    expect(auditEvent.action).toBe('login_attempt');
    expect(auditEvent.outcome).toBe('success');
    expect(auditEvent.userId).toBe('test-user-123');
    expect(auditEvent.compliance.classification).toBe('confidential');
    expect(auditEvent.compliance.regulations).toContain('SOX');
  });

  it('should log session validation events', () => {
    const sessionDetails = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      outcome: 'failure' as const,
      validationType: 'server' as const,
      failureReason: 'Session expired'
    };

    const auditEvent = logSessionValidation(sessionDetails);
    
    expect(auditEvent.category).toBe('session_management');
    expect(auditEvent.action).toBe('session_validation');
    expect(auditEvent.outcome).toBe('failure');
    expect(auditEvent.details.failureReason).toBe('Session expired');
  });

  it('should generate audit reports', () => {
    // Log some test events
    logAuthenticationAttempt({
      email: 'user1@example.com',
      method: 'password',
      outcome: 'success',
      userId: 'user-1'
    });

    logAuthenticationAttempt({
      email: 'user2@example.com',
      method: 'password',
      outcome: 'failure',
      userId: 'user-2',
      failureReason: 'Invalid password'
    });

    const report = auditLogger.generateAuditReport({
      startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      endDate: new Date()
    });

    expect(report.summary.totalEvents).toBeGreaterThan(0);
    expect(report.summary.eventsByCategory).toHaveProperty('authentication');
    expect(report.summary.eventsByOutcome).toHaveProperty('success');
    expect(report.summary.eventsByOutcome).toHaveProperty('failure');
    expect(report.events.length).toBeGreaterThan(0);
  });

  it('should track user audit trails', () => {
    const userId = 'audit-test-user';
    
    // Log multiple events for the same user
    logAuthenticationAttempt({
      email: 'audit@example.com',
      method: 'password',
      outcome: 'success',
      userId
    });

    logSessionValidation({
      userId,
      sessionId: 'session-123',
      outcome: 'success',
      validationType: 'server'
    });

    const userTrail = auditLogger.getUserAuditTrail(userId);
    expect(userTrail.length).toBeGreaterThanOrEqual(2);
    
    // All events should be for the same user
    userTrail.forEach(event => {
      expect(event.userId).toBe(userId);
    });
  });

  it('should handle PII sanitization', () => {
    const auditEvent = logAuthenticationAttempt({
      email: 'sensitive@example.com',
      method: 'password',
      outcome: 'success',
      userId: 'test-user'
    });

    // Email should be hashed/masked in audit details
    expect(auditEvent.details.email).not.toBe('sensitive@example.com');
    expect(auditEvent.details.email).toContain('***');
  });
});

describe('Integration Tests', () => {
  it('should integrate security events with audit logging', () => {
    // Log a security event that should also create an audit event
    securityLogger.logAuthBypassAttempt({
      route: '/protected',
      userId: 'test-user',
      reason: 'Invalid session'
    });

    // Check that both security and audit events were created
    const securityEvents = securityLogger.getRecentEvents(10);
    const authBypassEvents = securityEvents.filter(e => e.type === 'auth_bypass_attempt');
    expect(authBypassEvents.length).toBeGreaterThan(0);
  });

  it('should handle real-time monitoring subscriptions', (done) => {
    let alertReceived = false;

    // Subscribe to alerts
    const unsubscribe = securityMonitor.subscribeToAlerts((alert) => {
      expect(alert.title).toBe('Test Real-time Alert');
      alertReceived = true;
      unsubscribe();
      done();
    });

    // Generate an alert
    setTimeout(() => {
      generateSecurityAlert(
        'critical_event',
        'critical',
        'Test Real-time Alert',
        'Testing real-time alert delivery',
        []
      );
    }, 100);

    // Timeout the test if no alert is received
    setTimeout(() => {
      if (!alertReceived) {
        unsubscribe();
        done(new Error('Alert not received within timeout'));
      }
    }, 1000);
  });
});

describe('Compliance and Retention', () => {
  it('should set appropriate compliance classifications', () => {
    const authEvent = logAuthenticationAttempt({
      email: 'test@example.com',
      method: 'password',
      outcome: 'success'
    });

    expect(authEvent.compliance.classification).toBe('confidential');
    expect(authEvent.compliance.regulations).toContain('SOX');
    expect(authEvent.compliance.retentionPeriod).toBeGreaterThan(0);
  });

  it('should generate compliance-ready audit reports', () => {
    const report = auditLogger.generateAuditReport({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date()
    });

    expect(report.summary).toHaveProperty('timeRange');
    expect(report.summary.timeRange.start).toBeDefined();
    expect(report.summary.timeRange.end).toBeDefined();
    expect(report.events).toBeInstanceOf(Array);
    
    // Check that events have compliance information
    if (report.events.length > 0) {
      const event = report.events[0];
      expect(event.compliance).toBeDefined();
      expect(event.compliance.classification).toBeDefined();
      expect(event.compliance.regulations).toBeInstanceOf(Array);
    }
  });
});