/**
 * Rate Limit Monitoring Service
 * Provides monitoring, alerting, and reporting for rate limit violations
 */

interface RateLimitViolation {
  id: string
  timestamp: number
  identifier: string
  endpoint: string
  rateLimitType: string
  attempts: number
  blocked: boolean
  userAgent?: string
  ip?: string
  userId?: string
}

interface MonitoringMetrics {
  totalViolations: number
  uniqueIPs: number
  uniqueUsers: number
  blockedIPs: number
  topEndpoints: Array<{ endpoint: string; count: number }>
  topViolators: Array<{ identifier: string; count: number }>
  recentViolations: RateLimitViolation[]
}

// In-memory store for violations (in production, use a proper database)
const violationStore: Map<string, RateLimitViolation> = new Map()
const violationHistory: RateLimitViolation[] = []

// Configuration
const MONITORING_CONFIG = {
  maxHistorySize: 1000, // Keep last 1000 violations
  alertThresholds: {
    violationsPerMinute: 10, // Alert if more than 10 violations per minute
    uniqueIPsPerMinute: 5,   // Alert if more than 5 unique IPs per minute
    blockedIPsPerHour: 3     // Alert if more than 3 IPs blocked per hour
  },
  retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
}

/**
 * Record a rate limit violation
 */
export function recordViolation(
  identifier: string,
  endpoint: string,
  rateLimitType: string,
  details: {
    attempts: number
    blocked?: boolean
    userAgent?: string
    ip?: string
    userId?: string
    timestamp: number
  }
): void {
  const violation: RateLimitViolation = {
    id: generateViolationId(),
    timestamp: details.timestamp,
    identifier: sanitizeIdentifier(identifier),
    endpoint: sanitizeEndpoint(endpoint),
    rateLimitType,
    attempts: details.attempts,
    blocked: details.blocked || false,
    userAgent: details.userAgent?.slice(0, 200), // Limit length
    ip: details.ip,
    userId: details.userId
  }
  
  // Store violation
  violationStore.set(violation.id, violation)
  violationHistory.push(violation)
  
  // Maintain history size limit
  if (violationHistory.length > MONITORING_CONFIG.maxHistorySize) {
    const removedViolation = violationHistory.shift()
    if (removedViolation) {
      violationStore.delete(removedViolation.id)
    }
  }
  
  // Log the violation
  logViolation(violation)
  
  // Check for alerts
  checkAlertThresholds()
  
  // Clean up old violations
  cleanupOldViolations()
}

/**
 * Get monitoring metrics for the specified time period
 */
export function getMonitoringMetrics(
  timeWindowMs: number = 60 * 60 * 1000 // Default: 1 hour
): MonitoringMetrics {
  const now = Date.now()
  const cutoffTime = now - timeWindowMs
  
  // Filter recent violations
  const recentViolations = violationHistory.filter(
    v => v.timestamp >= cutoffTime
  )
  
  // Calculate metrics
  const uniqueIPs = new Set(
    recentViolations
      .map(v => v.ip)
      .filter(ip => ip)
  ).size
  
  const uniqueUsers = new Set(
    recentViolations
      .map(v => v.userId)
      .filter(userId => userId)
  ).size
  
  const blockedIPs = recentViolations.filter(v => v.blocked).length
  
  // Top endpoints
  const endpointCounts = new Map<string, number>()
  recentViolations.forEach(v => {
    endpointCounts.set(v.endpoint, (endpointCounts.get(v.endpoint) || 0) + 1)
  })
  
  const topEndpoints = Array.from(endpointCounts.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  // Top violators
  const violatorCounts = new Map<string, number>()
  recentViolations.forEach(v => {
    violatorCounts.set(v.identifier, (violatorCounts.get(v.identifier) || 0) + 1)
  })
  
  const topViolators = Array.from(violatorCounts.entries())
    .map(([identifier, count]) => ({ identifier, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return {
    totalViolations: recentViolations.length,
    uniqueIPs,
    uniqueUsers,
    blockedIPs,
    topEndpoints,
    topViolators,
    recentViolations: recentViolations.slice(-20) // Last 20 violations
  }
}

/**
 * Get violations by identifier (IP or user ID)
 */
export function getViolationsByIdentifier(
  identifier: string,
  timeWindowMs: number = 24 * 60 * 60 * 1000 // Default: 24 hours
): RateLimitViolation[] {
  const now = Date.now()
  const cutoffTime = now - timeWindowMs
  
  return violationHistory.filter(
    v => v.identifier === sanitizeIdentifier(identifier) && v.timestamp >= cutoffTime
  )
}

/**
 * Check if an identifier is currently causing unusual activity
 */
export function isHighRiskIdentifier(
  identifier: string,
  timeWindowMs: number = 60 * 60 * 1000 // Default: 1 hour
): {
  isHighRisk: boolean
  reason?: string
  violationCount: number
  blockedCount: number
} {
  const violations = getViolationsByIdentifier(identifier, timeWindowMs)
  const blockedViolations = violations.filter(v => v.blocked)
  
  const violationCount = violations.length
  const blockedCount = blockedViolations.length
  
  // Define high risk criteria
  const isHighRisk = violationCount >= 10 || blockedCount >= 2
  
  let reason: string | undefined
  if (blockedCount >= 2) {
    reason = 'Multiple blocks in time window'
  } else if (violationCount >= 10) {
    reason = 'Excessive violation count'
  }
  
  return {
    isHighRisk,
    reason,
    violationCount,
    blockedCount
  }
}

/**
 * Export violations data for analysis
 */
export function exportViolationsData(
  timeWindowMs: number = 24 * 60 * 60 * 1000, // Default: 24 hours
  format: 'json' | 'csv' = 'json'
): string {
  const now = Date.now()
  const cutoffTime = now - timeWindowMs
  
  const violations = violationHistory.filter(
    v => v.timestamp >= cutoffTime
  )
  
  if (format === 'csv') {
    const headers = ['timestamp', 'identifier', 'endpoint', 'rateLimitType', 'attempts', 'blocked', 'userAgent']
    const csvRows = violations.map(v => [
      new Date(v.timestamp).toISOString(),
      v.identifier,
      v.endpoint,
      v.rateLimitType,
      v.attempts.toString(),
      v.blocked.toString(),
      v.userAgent || ''
    ])
    
    return [headers, ...csvRows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\\n')
  }
  
  return JSON.stringify(violations, null, 2)
}

/**
 * Generate a unique violation ID
 */
function generateViolationId(): string {
  return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Sanitize identifier for safe logging
 */
function sanitizeIdentifier(identifier: string): string {
  return identifier.replace(/[^\\w:.-]/g, '').slice(0, 100)
}

/**
 * Sanitize endpoint for safe logging
 */
function sanitizeEndpoint(endpoint: string): string {
  return endpoint.replace(/[^\\w\\/-]/g, '').slice(0, 200)
}

/**
 * Log violation with appropriate formatting
 */
function logViolation(violation: RateLimitViolation): void {
  const logData = {
    type: 'rate_limit_violation',
    id: violation.id,
    timestamp: new Date(violation.timestamp).toISOString(),
    identifier: violation.identifier,
    endpoint: violation.endpoint,
    rateLimitType: violation.rateLimitType,
    attempts: violation.attempts,
    blocked: violation.blocked,
    userAgent: violation.userAgent
  }
  
  if (violation.blocked) {
    console.error('[RATE_LIMIT_BLOCK]', JSON.stringify(logData))
  } else {
    console.warn('[RATE_LIMIT_VIOLATION]', JSON.stringify(logData))
  }
}

/**
 * Check alert thresholds and trigger alerts if needed
 */
function checkAlertThresholds(): void {
  const now = Date.now()
  const oneMinuteAgo = now - 60 * 1000
  const oneHourAgo = now - 60 * 60 * 1000
  
  // Check violations per minute
  const recentViolations = violationHistory.filter(v => v.timestamp >= oneMinuteAgo)
  if (recentViolations.length >= MONITORING_CONFIG.alertThresholds.violationsPerMinute) {
    triggerAlert('HIGH_VIOLATION_RATE', {
      count: recentViolations.length,
      threshold: MONITORING_CONFIG.alertThresholds.violationsPerMinute,
      timeWindow: '1 minute'
    })
  }
  
  // Check unique IPs per minute
  const uniqueIPs = new Set(recentViolations.map(v => v.ip).filter(ip => ip)).size
  if (uniqueIPs >= MONITORING_CONFIG.alertThresholds.uniqueIPsPerMinute) {
    triggerAlert('HIGH_IP_VIOLATION_RATE', {
      count: uniqueIPs,
      threshold: MONITORING_CONFIG.alertThresholds.uniqueIPsPerMinute,
      timeWindow: '1 minute'
    })
  }
  
  // Check blocked IPs per hour
  const hourlyViolations = violationHistory.filter(v => v.timestamp >= oneHourAgo)
  const blockedIPs = new Set(
    hourlyViolations
      .filter(v => v.blocked && v.ip)
      .map(v => v.ip)
  ).size
  
  if (blockedIPs >= MONITORING_CONFIG.alertThresholds.blockedIPsPerHour) {
    triggerAlert('HIGH_BLOCK_RATE', {
      count: blockedIPs,
      threshold: MONITORING_CONFIG.alertThresholds.blockedIPsPerHour,
      timeWindow: '1 hour'
    })
  }
}

/**
 * Trigger an alert (customize this for your monitoring system)
 */
function triggerAlert(alertType: string, data: any): void {
  const alertData = {
    type: 'rate_limit_alert',
    alertType,
    timestamp: new Date().toISOString(),
    data
  }
  
  console.error('[RATE_LIMIT_ALERT]', JSON.stringify(alertData))
  
  // In production, you might want to:
  // - Send to monitoring service (e.g., DataDog, New Relic)
  // - Send email/Slack notifications
  // - Store in database for dashboard display
  // - Trigger automated responses
}

/**
 * Clean up old violations to prevent memory leaks
 */
function cleanupOldViolations(): void {
  const now = Date.now()
  const cutoffTime = now - MONITORING_CONFIG.retentionPeriod
  
  // Remove violations older than retention period
  let i = 0
  while (i < violationHistory.length && violationHistory[i].timestamp < cutoffTime) {
    const removedViolation = violationHistory[i]
    violationStore.delete(removedViolation.id)
    i++
  }
  
  if (i > 0) {
    violationHistory.splice(0, i)
    console.log(`[RATE_LIMIT_CLEANUP] Removed ${i} old violations`)
  }
}

// Export the enhanced logging function for use in rate-limiting.ts
export function logRateLimitViolation(
  identifier: string,
  endpoint: string,
  rateLimitType: string,
  violation: {
    attempts: number,
    blocked?: boolean,
    userAgent?: string,
    timestamp: number
  }
): void {
  recordViolation(identifier, endpoint, rateLimitType, violation)
}