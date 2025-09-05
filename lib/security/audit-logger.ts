/**
 * Comprehensive Authentication Audit Logging Service
 * Provides detailed audit trails for all authentication events
 */

import { securityLogger } from './event-logger';

export interface AuditEvent {
  id: string;
  timestamp: string;
  category: AuditCategory;
  action: string;
  outcome: 'success' | 'failure' | 'pending';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  details: Record<string, any>;
  context: AuditContext;
  compliance: ComplianceInfo;
}

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'session_management'
  | 'user_management'
  | 'security_event'
  | 'data_access'
  | 'configuration_change';

export interface AuditContext {
  source: string;
  component: string;
  environment: string;
  requestId?: string;
  correlationId?: string;
}

export interface ComplianceInfo {
  retentionPeriod: number; // days
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  regulations: string[]; // e.g., ['GDPR', 'SOX', 'HIPAA']
  dataSubjects?: string[]; // User IDs affected
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 50000; // Keep more events for audit purposes
  private readonly defaultRetentionDays = 2555; // 7 years for compliance

  /**
   * Log an audit event
   */
  logAuditEvent(
    category: AuditCategory,
    action: string,
    outcome: AuditEvent['outcome'],
    details: Record<string, any> = {},
    context: Partial<AuditContext> = {}
  ): AuditEvent {
    const event: AuditEvent = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      category,
      action,
      outcome,
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      route: details.route,
      details: this.sanitizeDetails(details),
      context: {
        source: 'polyharmony-auth',
        component: context.component || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        requestId: context.requestId,
        correlationId: context.correlationId || this.generateCorrelationId()
      },
      compliance: {
        retentionPeriod: this.defaultRetentionDays,
        classification: this.classifyEvent(category, action),
        regulations: this.getApplicableRegulations(category, action),
        dataSubjects: details.userId ? [details.userId] : undefined
      }
    };

    // Store in memory
    this.events.push(event);
    
    // Maintain memory limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console with structured format
    this.logToConsole(event);

    // Persist for compliance
    this.persistAuditEvent(event);

    // Also log as security event for monitoring
    if (this.shouldCreateSecurityEvent(event)) {
      securityLogger.logEvent(
        this.mapToSecurityEventType(event),
        {
          auditId: event.id,
          category: event.category,
          action: event.action,
          outcome: event.outcome,
          ...event.details
        },
        `audit_${event.category}`,
        this.mapToSecuritySeverity(event)
      );
    }

    return event;
  }

  /**
   * Log authentication attempt
   */
  logAuthenticationAttempt(details: {
    userId?: string;
    email?: string;
    method: 'password' | 'oauth' | 'magic_link' | 'demo';
    outcome: 'success' | 'failure';
    failureReason?: string;
    route?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): AuditEvent {
    return this.logAuditEvent(
      'authentication',
      'login_attempt',
      details.outcome,
      {
        userId: details.userId,
        email: details.email ? this.hashPII(details.email) : undefined,
        method: details.method,
        failureReason: details.failureReason,
        route: details.route,
        sessionId: details.sessionId,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent
      },
      {
        component: 'auth_service',
        requestId: details.sessionId
      }
    );
  }

  /**
   * Log session creation
   */
  logSessionCreation(details: {
    userId: string;
    sessionId: string;
    expiresAt: string;
    method: string;
    route?: string;
  }): AuditEvent {
    return this.logAuditEvent(
      'session_management',
      'session_created',
      'success',
      {
        userId: details.userId,
        sessionId: details.sessionId,
        expiresAt: details.expiresAt,
        method: details.method,
        route: details.route
      },
      {
        component: 'session_manager',
        correlationId: details.sessionId
      }
    );
  }

  /**
   * Log session validation
   */
  logSessionValidation(details: {
    userId?: string;
    sessionId: string;
    outcome: 'success' | 'failure';
    validationType: 'server' | 'client' | 'middleware';
    failureReason?: string;
    route?: string;
  }): AuditEvent {
    return this.logAuditEvent(
      'session_management',
      'session_validation',
      details.outcome,
      {
        userId: details.userId,
        sessionId: details.sessionId,
        validationType: details.validationType,
        failureReason: details.failureReason,
        route: details.route
      },
      {
        component: 'session_validator',
        correlationId: details.sessionId
      }
    );
  }

  /**
   * Log session termination
   */
  logSessionTermination(details: {
    userId?: string;
    sessionId: string;
    reason: 'logout' | 'expiry' | 'security' | 'admin';
    route?: string;
  }): AuditEvent {
    return this.logAuditEvent(
      'session_management',
      'session_terminated',
      'success',
      {
        userId: details.userId,
        sessionId: details.sessionId,
        reason: details.reason,
        route: details.route
      },
      {
        component: 'session_manager',
        correlationId: details.sessionId
      }
    );
  }

  /**
   * Log authorization check
   */
  logAuthorizationCheck(details: {
    userId?: string;
    resource: string;
    action: string;
    outcome: 'granted' | 'denied';
    reason?: string;
    route?: string;
  }): AuditEvent {
    return this.logAuditEvent(
      'authorization',
      'access_check',
      details.outcome === 'granted' ? 'success' : 'failure',
      {
        userId: details.userId,
        resource: details.resource,
        action: details.action,
        reason: details.reason,
        route: details.route
      },
      {
        component: 'authorization_service'
      }
    );
  }

  /**
   * Log user account changes
   */
  logUserAccountChange(details: {
    userId: string;
    action: 'created' | 'updated' | 'deleted' | 'verified' | 'suspended';
    changes?: Record<string, any>;
    adminUserId?: string;
    reason?: string;
  }): AuditEvent {
    return this.logAuditEvent(
      'user_management',
      `user_${details.action}`,
      'success',
      {
        userId: details.userId,
        changes: details.changes ? this.sanitizeUserChanges(details.changes) : undefined,
        adminUserId: details.adminUserId,
        reason: details.reason
      },
      {
        component: 'user_service'
      }
    );
  }

  /**
   * Log security configuration changes
   */
  logSecurityConfigChange(details: {
    component: string;
    setting: string;
    oldValue?: any;
    newValue?: any;
    adminUserId?: string;
    reason?: string;
  }): AuditEvent {
    return this.logAuditEvent(
      'configuration_change',
      'security_config_changed',
      'success',
      {
        component: details.component,
        setting: details.setting,
        oldValue: this.sanitizeConfigValue(details.oldValue),
        newValue: this.sanitizeConfigValue(details.newValue),
        adminUserId: details.adminUserId,
        reason: details.reason
      },
      {
        component: 'config_service'
      }
    );
  }

  /**
   * Get audit events for a specific user
   */
  getUserAuditTrail(userId: string, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(event => event.userId === userId || event.details.adminUserId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get audit events by category
   */
  getAuditEventsByCategory(category: AuditCategory, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(event => event.category === category)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get audit events in time range
   */
  getAuditEventsInRange(startTime: Date, endTime: Date): AuditEvent[] {
    return this.events
      .filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= startTime && eventTime <= endTime;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Generate audit report
   */
  generateAuditReport(options: {
    startDate: Date;
    endDate: Date;
    categories?: AuditCategory[];
    userId?: string;
    includeFailures?: boolean;
  }): {
    summary: {
      totalEvents: number;
      eventsByCategory: Record<string, number>;
      eventsByOutcome: Record<string, number>;
      uniqueUsers: number;
      timeRange: { start: string; end: string };
    };
    events: AuditEvent[];
  } {
    let filteredEvents = this.getAuditEventsInRange(options.startDate, options.endDate);

    if (options.categories) {
      filteredEvents = filteredEvents.filter(event => 
        options.categories!.includes(event.category)
      );
    }

    if (options.userId) {
      filteredEvents = filteredEvents.filter(event => 
        event.userId === options.userId || event.details.adminUserId === options.userId
      );
    }

    if (options.includeFailures === false) {
      filteredEvents = filteredEvents.filter(event => event.outcome === 'success');
    }

    const eventsByCategory: Record<string, number> = {};
    const eventsByOutcome: Record<string, number> = {};
    const uniqueUsers = new Set<string>();

    filteredEvents.forEach(event => {
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsByOutcome[event.outcome] = (eventsByOutcome[event.outcome] || 0) + 1;
      if (event.userId) uniqueUsers.add(event.userId);
    });

    return {
      summary: {
        totalEvents: filteredEvents.length,
        eventsByCategory,
        eventsByOutcome,
        uniqueUsers: uniqueUsers.size,
        timeRange: {
          start: options.startDate.toISOString(),
          end: options.endDate.toISOString()
        }
      },
      events: filteredEvents
    };
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Sanitize sensitive details
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove or hash sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'email'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = this.hashPII(sanitized[field]);
      }
    });

    return sanitized;
  }

  /**
   * Sanitize user changes for audit
   */
  private sanitizeUserChanges(changes: Record<string, any>): Record<string, any> {
    const sanitized = { ...changes };
    
    // Hash PII fields
    if (sanitized.email) sanitized.email = this.hashPII(sanitized.email);
    if (sanitized.phone) sanitized.phone = this.hashPII(sanitized.phone);
    
    // Remove sensitive fields entirely
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.tokens;
    
    return sanitized;
  }

  /**
   * Sanitize configuration values
   */
  private sanitizeConfigValue(value: any): any {
    if (typeof value === 'string' && (
      value.includes('password') || 
      value.includes('secret') || 
      value.includes('key') ||
      value.includes('token')
    )) {
      return '[REDACTED]';
    }
    return value;
  }

  /**
   * Hash PII for audit compliance
   */
  private hashPII(value: string): string {
    // In production, use a proper cryptographic hash
    // For now, just mask the value
    if (value.includes('@')) {
      // Email
      const [local, domain] = value.split('@');
      return `${local.charAt(0)}***@${domain}`;
    }
    return `${value.charAt(0)}***${value.charAt(value.length - 1)}`;
  }

  /**
   * Classify event for compliance
   */
  private classifyEvent(category: AuditCategory, action: string): ComplianceInfo['classification'] {
    if (category === 'authentication' || category === 'session_management') {
      return 'confidential';
    }
    if (category === 'user_management' || category === 'data_access') {
      return 'restricted';
    }
    return 'internal';
  }

  /**
   * Get applicable regulations
   */
  private getApplicableRegulations(category: AuditCategory, action: string): string[] {
    const regulations: string[] = [];
    
    // All authentication events are subject to these
    if (category === 'authentication' || category === 'session_management') {
      regulations.push('SOX', 'PCI-DSS');
    }
    
    // User data events
    if (category === 'user_management' || category === 'data_access') {
      regulations.push('GDPR', 'CCPA');
    }
    
    return regulations;
  }

  /**
   * Check if audit event should create security event
   */
  private shouldCreateSecurityEvent(event: AuditEvent): boolean {
    // Create security events for failures and security-related actions
    return event.outcome === 'failure' || 
           event.category === 'security_event';
  }

  /**
   * Map audit event to security event type
   */
  private mapToSecurityEventType(event: AuditEvent): any {
    if (event.category === 'authentication' && event.outcome === 'failure') {
      return 'auth_bypass_attempt';
    }
    if (event.category === 'session_management' && event.outcome === 'failure') {
      return 'session_validation_failed';
    }
    if (event.category === 'authorization' && event.outcome === 'failure') {
      return 'unauthorized_access';
    }
    return 'security_alert';
  }

  /**
   * Map audit event to security severity
   */
  private mapToSecuritySeverity(event: AuditEvent): any {
    if (event.outcome === 'failure') {
      if (event.category === 'authentication') return 'high';
      if (event.category === 'authorization') return 'medium';
      if (event.category === 'session_management') return 'high';
    }
    return 'low';
  }

  /**
   * Log to console with structured format
   */
  private logToConsole(event: AuditEvent): void {
    const logMessage = `[AUDIT-${event.category.toUpperCase()}] ${event.action}: ${event.outcome}`;
    const logData = {
      id: event.id,
      timestamp: event.timestamp,
      userId: event.userId,
      route: event.route,
      context: event.context,
      compliance: event.compliance
    };

    if (event.outcome === 'failure') {
      console.error(logMessage, logData);
    } else {
      console.log(logMessage, logData);
    }
  }

  /**
   * Persist audit event for compliance
   */
  private persistAuditEvent(event: AuditEvent): void {
    // In development, store in localStorage
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const stored = localStorage.getItem('ph_audit_events') || '[]';
        const events = JSON.parse(stored);
        events.push(event);
        
        // Keep only last 5000 events in localStorage
        if (events.length > 5000) {
          events.splice(0, events.length - 5000);
        }
        
        localStorage.setItem('ph_audit_events', JSON.stringify(events));
      } catch (error) {
        console.error('Failed to persist audit event:', error);
      }
    }

    // In production, this would send to a secure audit database
    // with proper encryption and access controls
  }

  /**
   * Get client IP (placeholder - would be more sophisticated in production)
   */
  private getClientIP(): string | undefined {
    return 'unknown';
  }

  /**
   * Get user agent
   */
  private getUserAgent(): string | undefined {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.userAgent;
    }
    return 'unknown';
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Convenience functions for common audit events
export const logAuthenticationAttempt = (details: Parameters<typeof auditLogger.logAuthenticationAttempt>[0]) =>
  auditLogger.logAuthenticationAttempt(details);

export const logSessionCreation = (details: Parameters<typeof auditLogger.logSessionCreation>[0]) =>
  auditLogger.logSessionCreation(details);

export const logSessionValidation = (details: Parameters<typeof auditLogger.logSessionValidation>[0]) =>
  auditLogger.logSessionValidation(details);

export const logSessionTermination = (details: Parameters<typeof auditLogger.logSessionTermination>[0]) =>
  auditLogger.logSessionTermination(details);

export const logAuthorizationCheck = (details: Parameters<typeof auditLogger.logAuthorizationCheck>[0]) =>
  auditLogger.logAuthorizationCheck(details);

export const logUserAccountChange = (details: Parameters<typeof auditLogger.logUserAccountChange>[0]) =>
  auditLogger.logUserAccountChange(details);

export const logSecurityConfigChange = (details: Parameters<typeof auditLogger.logSecurityConfigChange>[0]) =>
  auditLogger.logSecurityConfigChange(details);

export const getUserAuditTrail = (userId: string, limit?: number) =>
  auditLogger.getUserAuditTrail(userId, limit);

export const generateAuditReport = (options: Parameters<typeof auditLogger.generateAuditReport>[0]) =>
  auditLogger.generateAuditReport(options);