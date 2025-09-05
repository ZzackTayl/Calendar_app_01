/**
 * Security Event Logging System
 * Provides comprehensive logging and monitoring for security events
 */

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  details: Record<string, any>;
  context: string;
}

export type SecurityEventType = 
  | 'auth_bypass_attempt'
  | 'invalid_session'
  | 'unauthorized_access'
  | 'session_validation_failed'
  | 'demo_mode_activated'
  | 'demo_mode_blocked'
  | 'session_terminated'
  | 'security_alert'
  | 'suspicious_activity'
  | 'middleware_block'
  | 'route_protection_triggered'
  | 'session_refresh_failed'
  | 'user_verification_failed';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityPattern {
  pattern: string;
  threshold: number;
  timeWindow: number; // minutes
  severity: SecuritySeverity;
}

class SecurityEventLogger {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 10000; // Keep last 10k events in memory
  private readonly patterns: SecurityPattern[] = [
    {
      pattern: 'auth_bypass_attempt',
      threshold: 3,
      timeWindow: 5,
      severity: 'critical'
    },
    {
      pattern: 'invalid_session',
      threshold: 5,
      timeWindow: 10,
      severity: 'high'
    },
    {
      pattern: 'unauthorized_access',
      threshold: 10,
      timeWindow: 15,
      severity: 'medium'
    }
  ];

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    details: Record<string, any> = {},
    context: string = 'unknown',
    severity?: SecuritySeverity
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type,
      severity: severity || this.determineSeverity(type),
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      route: details.route,
      details,
      context
    };

    // Add to memory store
    this.events.push(event);
    
    // Maintain memory limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console with appropriate level
    this.logToConsole(event);

    // Check for suspicious patterns
    this.checkSuspiciousPatterns(event);

    // Store persistently (in production, this would go to a database)
    this.persistEvent(event);
  }

  /**
   * Log authentication bypass attempt
   */
  logAuthBypassAttempt(details: {
    route: string;
    userId?: string;
    reason: string;
    authState?: any;
  }): void {
    this.logEvent('auth_bypass_attempt', {
      ...details,
      severity: 'critical',
      requiresImmedateAttention: true
    }, 'auth_bypass', 'critical');
  }

  /**
   * Log session validation failure
   */
  logSessionValidationFailure(details: {
    userId?: string;
    error: string;
    validationType: string;
    securityAlerts?: string[];
  }): void {
    this.logEvent('session_validation_failed', {
      ...details,
      severity: 'high'
    }, 'session_validation', 'high');
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(details: {
    route: string;
    userId?: string;
    reason: string;
    authRequired: boolean;
  }): void {
    this.logEvent('unauthorized_access', {
      ...details,
      severity: 'medium'
    }, 'access_control', 'medium');
  }

  /**
   * Log demo mode security events
   */
  logDemoModeEvent(details: {
    action: 'activated' | 'blocked' | 'cleared';
    environment: string;
    hasExplicitConfig: boolean;
    reason?: string;
  }): void {
    const type = details.action === 'blocked' ? 'demo_mode_blocked' : 'demo_mode_activated';
    const severity = details.action === 'blocked' ? 'high' : 'medium';
    
    this.logEvent(type, details, 'demo_mode', severity);
  }

  /**
   * Log middleware security actions
   */
  logMiddlewareAction(details: {
    route: string;
    action: 'blocked' | 'redirected' | 'allowed';
    reason: string;
    userId?: string;
    securityLevel: string;
  }): void {
    const severity = details.action === 'blocked' ? 'high' : 'low';
    
    this.logEvent('middleware_block', {
      ...details,
      severity
    }, 'middleware', severity);
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100, type?: SecurityEventType): SecurityEvent[] {
    let filtered = this.events;
    
    if (type) {
      filtered = filtered.filter(event => event.type === type);
    }
    
    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(timeWindow: number = 60): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    suspiciousPatterns: string[];
  } {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) > cutoff
    );

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      suspiciousPatterns: this.detectSuspiciousPatterns(recentEvents)
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine event severity based on type
   */
  private determineSeverity(type: SecurityEventType): SecuritySeverity {
    const severityMap: Record<SecurityEventType, SecuritySeverity> = {
      'auth_bypass_attempt': 'critical',
      'invalid_session': 'high',
      'unauthorized_access': 'medium',
      'session_validation_failed': 'high',
      'demo_mode_activated': 'medium',
      'demo_mode_blocked': 'high',
      'session_terminated': 'medium',
      'security_alert': 'high',
      'suspicious_activity': 'high',
      'middleware_block': 'medium',
      'route_protection_triggered': 'medium',
      'session_refresh_failed': 'medium',
      'user_verification_failed': 'high'
    };

    return severityMap[type] || 'medium';
  }

  /**
   * Log to console with appropriate level
   */
  private logToConsole(event: SecurityEvent): void {
    const logMessage = `[SECURITY-${event.severity.toUpperCase()}] ${event.type}: ${event.context}`;
    const logData = {
      id: event.id,
      timestamp: event.timestamp,
      userId: event.userId,
      route: event.route,
      details: event.details
    };

    switch (event.severity) {
      case 'critical':
        console.error(logMessage, logData);
        break;
      case 'high':
        console.error(logMessage, logData);
        break;
      case 'medium':
        console.warn(logMessage, logData);
        break;
      case 'low':
        console.log(logMessage, logData);
        break;
    }
  }

  /**
   * Check for suspicious patterns
   */
  private checkSuspiciousPatterns(event: SecurityEvent): void {
    this.patterns.forEach(pattern => {
      const recentEvents = this.getEventsInTimeWindow(pattern.pattern, pattern.timeWindow);
      
      if (recentEvents.length >= pattern.threshold) {
        console.error(`[SECURITY-PATTERN] Suspicious pattern detected: ${pattern.pattern}`, {
          threshold: pattern.threshold,
          actual: recentEvents.length,
          timeWindow: pattern.timeWindow,
          severity: pattern.severity
        });

        // Log pattern detection as a security event (without triggering pattern check)
        const patternEvent: SecurityEvent = {
          id: this.generateEventId(),
          timestamp: new Date().toISOString(),
          type: 'suspicious_activity',
          severity: pattern.severity,
          userId: undefined,
          sessionId: undefined,
          ipAddress: this.getClientIP(),
          userAgent: this.getUserAgent(),
          route: undefined,
          details: {
            pattern: pattern.pattern,
            threshold: pattern.threshold,
            actual: recentEvents.length,
            timeWindow: pattern.timeWindow,
            recentEvents: recentEvents.slice(0, 5) // Include first 5 events
          },
          context: 'pattern_detection'
        };

        // Add to memory store without triggering pattern check
        this.events.push(patternEvent);
        if (this.events.length > this.maxEvents) {
          this.events = this.events.slice(-this.maxEvents);
        }

        // Log to console
        this.logToConsole(patternEvent);

        // Persist event
        this.persistEvent(patternEvent);
      }
    });
  }

  /**
   * Get events matching pattern in time window
   */
  private getEventsInTimeWindow(pattern: string, timeWindow: number): SecurityEvent[] {
    const cutoff = new Date(Date.now() - timeWindow * 60 * 1000);
    return this.events.filter(
      event => event.type === pattern && new Date(event.timestamp) > cutoff
    );
  }

  /**
   * Detect suspicious patterns in events
   */
  private detectSuspiciousPatterns(events: SecurityEvent[]): string[] {
    const patterns: string[] = [];
    
    // Check for rapid authentication failures
    const authFailures = events.filter(e => 
      e.type === 'session_validation_failed' || e.type === 'auth_bypass_attempt'
    );
    if (authFailures.length > 5) {
      patterns.push('rapid_auth_failures');
    }

    // Check for multiple unauthorized access attempts
    const unauthorizedAttempts = events.filter(e => e.type === 'unauthorized_access');
    if (unauthorizedAttempts.length > 10) {
      patterns.push('multiple_unauthorized_attempts');
    }

    return patterns;
  }

  /**
   * Persist event (in production, this would go to a database)
   */
  private persistEvent(event: SecurityEvent): void {
    // In development, just store in localStorage for debugging
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const stored = localStorage.getItem('ph_security_events') || '[]';
        const events = JSON.parse(stored);
        events.push(event);
        
        // Keep only last 1000 events in localStorage
        if (events.length > 1000) {
          events.splice(0, events.length - 1000);
        }
        
        localStorage.setItem('ph_security_events', JSON.stringify(events));
      } catch (error) {
        console.error('Failed to persist security event:', error);
      }
    }

    // In production, this would send to a logging service or database
    // Example: await sendToLoggingService(event);
  }

  /**
   * Get client IP (in production, this would be more sophisticated)
   */
  private getClientIP(): string | undefined {
    // In a real implementation, this would extract IP from request headers
    return 'unknown';
  }

  /**
   * Get user agent (in production, this would be from request headers)
   */
  private getUserAgent(): string | undefined {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.userAgent;
    }
    return 'unknown';
  }
}

// Export singleton instance
export const securityLogger = new SecurityEventLogger();

// Convenience functions
export const logAuthBypassAttempt = (details: Parameters<typeof securityLogger.logAuthBypassAttempt>[0]) => 
  securityLogger.logAuthBypassAttempt(details);

export const logSessionValidationFailure = (details: Parameters<typeof securityLogger.logSessionValidationFailure>[0]) => 
  securityLogger.logSessionValidationFailure(details);

export const logUnauthorizedAccess = (details: Parameters<typeof securityLogger.logUnauthorizedAccess>[0]) => 
  securityLogger.logUnauthorizedAccess(details);

export const logDemoModeEvent = (details: Parameters<typeof securityLogger.logDemoModeEvent>[0]) => 
  securityLogger.logDemoModeEvent(details);

export const logMiddlewareAction = (details: Parameters<typeof securityLogger.logMiddlewareAction>[0]) => 
  securityLogger.logMiddlewareAction(details);

export const getSecurityStats = () => securityLogger.getSecurityStats();
export const getRecentSecurityEvents = (limit?: number, type?: SecurityEventType) => 
  securityLogger.getRecentEvents(limit, type);