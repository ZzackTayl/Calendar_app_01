/**
 * Performance-Optimized Security Event Logging
 * Provides intelligent logging with development performance optimizations
 */

import { SecurityEvent, SecurityEventType, SecuritySeverity } from './event-logger'

// Performance configuration based on environment
const LOGGING_CONFIG = {
  development: {
    BUFFER_SIZE: 50, // Smaller buffer for development
    FLUSH_INTERVAL: 5000, // 5 seconds
    ENABLE_PATTERN_DETECTION: false, // Disable expensive pattern detection
    CONSOLE_LOG_LEVEL: 'warn', // Only log warnings and errors
    STORE_EVENTS: false, // Don't store in localStorage in dev for performance
    BATCH_WRITES: true // Batch console writes
  },
  production: {
    BUFFER_SIZE: 500,
    FLUSH_INTERVAL: 10000, // 10 seconds
    ENABLE_PATTERN_DETECTION: true,
    CONSOLE_LOG_LEVEL: 'info',
    STORE_EVENTS: true,
    BATCH_WRITES: false
  }
}

interface LogBuffer {
  events: SecurityEvent[]
  lastFlush: number
}

class PerformanceSecurityLogger {
  private config = LOGGING_CONFIG[process.env.NODE_ENV as 'development' | 'production'] || LOGGING_CONFIG.development
  private buffer: LogBuffer = { events: [], lastFlush: Date.now() }
  private isFlushScheduled = false

  /**
   * High-performance event logging with buffering
   */
  logEventFast(
    type: SecurityEventType,
    details: Record<string, any> = {},
    context: string = 'middleware',
    severity?: SecuritySeverity
  ): void {
    // Skip low-priority events in development
    if (process.env.NODE_ENV === 'development') {
      const skipInDev = ['security_validation_completed', 'middleware_block']
      if (skipInDev.includes(type) && severity === 'low') {
        return
      }
    }

    const event: SecurityEvent = {
      id: this.generateEventIdFast(),
      timestamp: new Date().toISOString(),
      type,
      severity: severity || this.determineSeverityFast(type),
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: this.getClientIPFast(),
      userAgent: this.getUserAgentFast(),
      route: details.route,
      details,
      context
    }

    // Add to buffer instead of immediate processing
    this.buffer.events.push(event)

    // Immediate console log for critical events
    if (event.severity === 'critical' || event.severity === 'high') {
      this.logToConsoleFast(event)
    }

    // Schedule buffer flush if needed
    this.scheduleFlush()
  }

  /**
   * Fast authentication bypass logging
   */
  logAuthBypassAttemptFast(details: {
    route: string
    userId?: string
    reason: string
    authState?: any
  }): void {
    this.logEventFast('auth_bypass_attempt', {
      ...details,
      severity: 'critical',
      requiresImmedateAttention: true
    }, 'auth_bypass', 'critical')
  }

  /**
   * Fast unauthorized access logging
   */
  logUnauthorizedAccessFast(details: {
    route: string
    userId?: string
    reason: string
    authRequired: boolean
  }): void {
    // Skip noisy unauthorized access logs in development
    if (process.env.NODE_ENV === 'development' &&
        details.reason.includes('development mode')) {
      return
    }

    this.logEventFast('unauthorized_access', {
      ...details,
      severity: 'medium'
    }, 'access_control', 'medium')
  }

  /**
   * Fast middleware action logging
   */
  logMiddlewareActionFast(details: {
    route: string
    action: 'blocked' | 'redirected' | 'allowed'
    reason: string
    userId?: string
    securityLevel: string
  }): void {
    // Skip 'allowed' actions in development to reduce noise
    if (process.env.NODE_ENV === 'development' && details.action === 'allowed') {
      return
    }

    const severity = details.action === 'blocked' ? 'high' : 'low'

    this.logEventFast('middleware_block', {
      ...details,
      severity
    }, 'middleware', severity)
  }

  /**
   * Get recent critical events only (for performance)
   */
  getCriticalEvents(limit: number = 20): SecurityEvent[] {
    return this.buffer.events
      .filter(event => event.severity === 'critical' || event.severity === 'high')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): {
    bufferSize: number
    lastFlush: number
    criticalEvents: number
    config: any
  } {
    return {
      bufferSize: this.buffer.events.length,
      lastFlush: this.buffer.lastFlush,
      criticalEvents: this.buffer.events.filter((e: SecurityEvent) =>
        e.severity === 'critical' || e.severity === 'high'
      ).length,
      config: this.config
    }
  }

  /**
   * Force flush buffer (for testing or manual flush)
   */
  flushBuffer(): void {
    if (this.buffer.events.length === 0) {
      return
    }

    const events = [...this.buffer.events]
    this.buffer.events = []
    this.buffer.lastFlush = Date.now()

    // Process events in batch
    this.processBatchedEvents(events)
  }

  /**
   * Clear all buffered events
   */
  clearBuffer(): void {
    this.buffer.events = []
    this.buffer.lastFlush = Date.now()
  }

  /**
   * Schedule buffer flush
   */
  private scheduleFlush(): void {
    const shouldFlush = this.buffer.events.length >= this.config.BUFFER_SIZE ||
                       Date.now() - this.buffer.lastFlush >= this.config.FLUSH_INTERVAL

    if (shouldFlush && !this.isFlushScheduled) {
      this.isFlushScheduled = true

      // Use setTimeout to avoid blocking middleware
      setTimeout(() => {
        this.flushBuffer()
        this.isFlushScheduled = false
      }, 0)
    }
  }

  /**
   * Process batched events efficiently
   */
  private processBatchedEvents(events: SecurityEvent[]): void {
    try {
      // Batch console logging
      if (this.config.BATCH_WRITES) {
        const criticalEvents = events.filter(e => e.severity === 'critical' || e.severity === 'high')
        if (criticalEvents.length > 0) {
          console.warn(`[SECURITY-BATCH] ${criticalEvents.length} critical/high events:`,
            criticalEvents.map(e => `${e.type}:${e.route}`))
        }

        const warningEvents = events.filter(e => e.severity === 'medium')
        if (warningEvents.length > 0 && process.env.NODE_ENV !== 'development') {
          console.log(`[SECURITY-BATCH] ${warningEvents.length} medium severity events`)
        }
      } else {
        // Individual logging for production
        events.forEach(event => this.logToConsoleFast(event))
      }

      // Store events if enabled
      if (this.config.STORE_EVENTS) {
        this.persistEventsBatch(events)
      }

      // Pattern detection only in production
      if (this.config.ENABLE_PATTERN_DETECTION) {
        this.detectPatternsBatch(events)
      }

    } catch (error) {
      console.error('[SECURITY-LOGGER] Error processing batch:', error)
    }
  }

  /**
   * Fast console logging
   */
  private logToConsoleFast(event: SecurityEvent): void {
    const logMessage = `[SEC-${event.severity.toUpperCase()}] ${event.type}${event.route ? ` on ${event.route}` : ''}`

    // Respect console log level configuration
    switch (event.severity) {
      case 'critical':
      case 'high':
        if (['error', 'warn', 'info'].includes(this.config.CONSOLE_LOG_LEVEL)) {
          console.error(logMessage, { id: event.id, context: event.context })
        }
        break
      case 'medium':
        if (['warn', 'info'].includes(this.config.CONSOLE_LOG_LEVEL)) {
          console.warn(logMessage, { id: event.id, context: event.context })
        }
        break
      case 'low':
        if (this.config.CONSOLE_LOG_LEVEL === 'info') {
          console.log(logMessage, { id: event.id, context: event.context })
        }
        break
    }
  }

  /**
   * Fast event ID generation
   */
  private generateEventIdFast(): string {
    if (process.env.NODE_ENV === 'development') {
      // Simple ID for development
      return `dev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
    }
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Fast severity determination
   */
  private determineSeverityFast(type: SecurityEventType): SecuritySeverity {
    // Simplified severity mapping for performance
    if (type.includes('bypass') || type.includes('critical')) return 'critical'
    if (type.includes('unauthorized') || type.includes('failed')) return 'high'
    if (type.includes('validation') || type.includes('alert')) return 'medium'
    return 'low'
  }

  /**
   * Fast client IP extraction (placeholder)
   */
  private getClientIPFast(): string | undefined {
    return process.env.NODE_ENV === 'development' ? 'dev-ip' : undefined
  }

  /**
   * Fast user agent extraction (placeholder)
   */
  private getUserAgentFast(): string | undefined {
    return process.env.NODE_ENV === 'development' ? 'dev-agent' : undefined
  }

  /**
   * Batch persist events
   */
  private persistEventsBatch(events: SecurityEvent[]): void {
    // In production, this would batch write to database
    // In development, skip for performance
    if (process.env.NODE_ENV === 'development') {
      return
    }

    // Placeholder for batch database write
    console.log(`[SECURITY-PERSIST] Persisting ${events.length} events`)
  }

  /**
   * Batch pattern detection
   */
  private detectPatternsBatch(events: SecurityEvent[]): void {
    // Simplified pattern detection
    const authFailures = events.filter(e =>
      e.type === 'session_validation_failed' || e.type === 'auth_bypass_attempt'
    )

    if (authFailures.length > 3) {
      console.error('[SECURITY-PATTERN] Multiple auth failures detected:', authFailures.length)
    }
  }
}

// Export singleton instance
export const performanceSecurityLogger = new PerformanceSecurityLogger()

// Convenience functions for fast logging
export const logAuthBypassAttemptFast = (details: Parameters<typeof performanceSecurityLogger.logAuthBypassAttemptFast>[0]) =>
  performanceSecurityLogger.logAuthBypassAttemptFast(details)

export const logUnauthorizedAccessFast = (details: Parameters<typeof performanceSecurityLogger.logUnauthorizedAccessFast>[0]) =>
  performanceSecurityLogger.logUnauthorizedAccessFast(details)

export const logMiddlewareActionFast = (details: Parameters<typeof performanceSecurityLogger.logMiddlewareActionFast>[0]) =>
  performanceSecurityLogger.logMiddlewareActionFast(details)

// Utilities
export const getSecurityLogStats = () => performanceSecurityLogger.getBufferStats()
export const flushSecurityLogs = () => performanceSecurityLogger.flushBuffer()
export const getCriticalSecurityEvents = (limit?: number) => performanceSecurityLogger.getCriticalEvents(limit)