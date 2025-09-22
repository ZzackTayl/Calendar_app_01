/**
 * Middleware Performance Monitoring
 * Tracks and reports middleware performance metrics
 */

import { middlewareCache } from '@/lib/cache/middleware-cache'
import { getSecurityLogStats } from '@/lib/security/performance-logger'

interface PerformanceSnapshot {
  timestamp: number
  totalRequests: number
  averageResponseTime: number
  cacheHitRate: number
  slowRequests: number
  errorCount: number
}

class MiddlewareMonitor {
  private snapshots: PerformanceSnapshot[] = []
  private requestMetrics: Map<string, number[]> = new Map()
  private readonly maxSnapshots = 100

  /**
   * Record a request's performance
   */
  recordRequest(pathname: string, responseTime: number, fromCache: boolean = false): void {
    if (!this.requestMetrics.has(pathname)) {
      this.requestMetrics.set(pathname, [])
    }

    const metrics = this.requestMetrics.get(pathname)!
    metrics.push(responseTime)

    // Keep only last 50 measurements per route
    if (metrics.length > 50) {
      metrics.shift()
    }

    // Record in cache stats if from cache
    if (fromCache) {
      this.incrementCacheHit()
    }
  }

  /**
   * Get current performance snapshot
   */
  getCurrentSnapshot(): PerformanceSnapshot {
    const now = Date.now()
    const allMetrics = Array.from(this.requestMetrics.values()).flat()

    const totalRequests = allMetrics.length
    const averageResponseTime = totalRequests > 0 ?
      allMetrics.reduce((sum, time) => sum + time, 0) / totalRequests : 0
    const slowRequests = allMetrics.filter(time => time > 200).length

    return {
      timestamp: now,
      totalRequests,
      averageResponseTime,
      cacheHitRate: this.calculateCacheHitRate(),
      slowRequests,
      errorCount: this.getErrorCount()
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    current: PerformanceSnapshot
    cache: ReturnType<typeof middlewareCache.getCacheStats>
    security: ReturnType<typeof getSecurityLogStats>
    routes: { [route: string]: { avgTime: number; requestCount: number } }
    recommendations: string[]
  } {
    const current = this.getCurrentSnapshot()
    const cache = middlewareCache.getCacheStats()
    const security = getSecurityLogStats()

    const routes: { [route: string]: { avgTime: number; requestCount: number } } = {}

    for (const [pathname, metrics] of this.requestMetrics.entries()) {
      const avgTime = metrics.reduce((sum, time) => sum + time, 0) / metrics.length
      routes[pathname] = {
        avgTime: Math.round(avgTime * 100) / 100,
        requestCount: metrics.length
      }
    }

    const recommendations = this.generateRecommendations(current, cache)

    return {
      current,
      cache,
      security,
      routes,
      recommendations
    }
  }

  /**
   * Get slow routes (>200ms average)
   */
  getSlowRoutes(threshold: number = 200): { route: string; avgTime: number }[] {
    const slowRoutes: { route: string; avgTime: number }[] = []

    for (const [pathname, metrics] of this.requestMetrics.entries()) {
      const avgTime = metrics.reduce((sum, time) => sum + time, 0) / metrics.length
      if (avgTime > threshold) {
        slowRoutes.push({ route: pathname, avgTime })
      }
    }

    return slowRoutes.sort((a, b) => b.avgTime - a.avgTime)
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.requestMetrics.clear()
    this.snapshots = []
  }

  /**
   * Take a performance snapshot
   */
  takeSnapshot(): void {
    const snapshot = this.getCurrentSnapshot()
    this.snapshots.push(snapshot)

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }
  }

  /**
   * Get performance trend (last 10 snapshots)
   */
  getPerformanceTrend(): {
    timestamps: number[]
    responseTimes: number[]
    cacheHitRates: number[]
    trend: 'improving' | 'stable' | 'degrading'
  } {
    const recentSnapshots = this.snapshots.slice(-10)

    if (recentSnapshots.length < 2) {
      return {
        timestamps: [],
        responseTimes: [],
        cacheHitRates: [],
        trend: 'stable'
      }
    }

    const timestamps = recentSnapshots.map(s => s.timestamp)
    const responseTimes = recentSnapshots.map(s => s.averageResponseTime)
    const cacheHitRates = recentSnapshots.map(s => s.cacheHitRate)

    // Simple trend calculation
    const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2))
    const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2))

    const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length

    let trend: 'improving' | 'stable' | 'degrading' = 'stable'
    if (secondAvg < firstAvg * 0.9) trend = 'improving'
    else if (secondAvg > firstAvg * 1.1) trend = 'degrading'

    return { timestamps, responseTimes, cacheHitRates, trend }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    current: PerformanceSnapshot,
    cache: ReturnType<typeof middlewareCache.getCacheStats>
  ): string[] {
    const recommendations: string[] = []

    // Response time recommendations
    if (current.averageResponseTime > 100) {
      recommendations.push('Average response time is high. Consider enabling middleware optimizations.')
    }

    if (current.averageResponseTime > 50 && process.env.NODE_ENV === 'development') {
      recommendations.push('Enable MINIMAL_MIDDLEWARE_LOGS=true to reduce logging overhead.')
    }

    // Cache recommendations
    if (cache.sessionCache.hitRate < 0.5) {
      recommendations.push('Session cache hit rate is low. Consider increasing cache TTL.')
    }

    if (cache.routeCache.hitRate < 0.8) {
      recommendations.push('Route cache hit rate is low. Routes may be changing too frequently.')
    }

    // Slow requests
    if (current.slowRequests > current.totalRequests * 0.1) {
      recommendations.push('More than 10% of requests are slow (>200ms). Review middleware optimizations.')
    }

    // Environment-specific recommendations
    if (process.env.NODE_ENV === 'development') {
      if (!process.env.ENABLE_MIDDLEWARE_OPTIMIZATIONS) {
        recommendations.push('Set ENABLE_MIDDLEWARE_OPTIMIZATIONS=true for better development performance.')
      }

      if (!process.env.ENABLE_MIDDLEWARE_CACHE) {
        recommendations.push('Set ENABLE_MIDDLEWARE_CACHE=true to enable intelligent caching.')
      }

      if (!process.env.MINIMAL_MIDDLEWARE_LOGS && current.averageResponseTime > 30) {
        recommendations.push('Set MINIMAL_MIDDLEWARE_LOGS=true to reduce console output overhead.')
      }
    }

    return recommendations
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  private calculateCacheHitRate(): number {
    const cache = middlewareCache.getCacheStats()
    return (cache.sessionCache.hitRate + cache.routeCache.hitRate + cache.securityCache.hitRate) / 3
  }

  /**
   * Increment cache hit counter (placeholder)
   */
  private incrementCacheHit(): void {
    // This would be implemented with actual cache hit tracking
  }

  /**
   * Get error count (placeholder)
   */
  private getErrorCount(): number {
    const security = getSecurityLogStats()
    return security.criticalEvents
  }
}

// Export singleton instance
export const middlewareMonitor = new MiddlewareMonitor()

// Utility functions
export const recordMiddlewareRequest = (pathname: string, responseTime: number, fromCache?: boolean) =>
  middlewareMonitor.recordRequest(pathname, responseTime, fromCache)

export const getMiddlewareReport = () => middlewareMonitor.getPerformanceReport()

export const getSlowMiddlewareRoutes = (threshold?: number) => middlewareMonitor.getSlowRoutes(threshold)

export const takePerformanceSnapshot = () => middlewareMonitor.takeSnapshot()

// Development helper to log performance report
if (process.env.NODE_ENV === 'development') {
  // Add global helper for debugging
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__middlewareReport = () => {
      const report = getMiddlewareReport()
      console.table(report.routes)
      console.log('Cache Stats:', report.cache)
      console.log('Recommendations:', report.recommendations)
      return report
    }
  }

  // Auto-snapshot every 30 seconds in development
  setInterval(() => {
    takePerformanceSnapshot()
  }, 30000)
}