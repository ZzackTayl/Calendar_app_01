/**
 * Circuit Breaker Pattern Implementation
 * 
 * Provides resilience against cascading failures by monitoring service health
 * and preventing calls to failing services until they recover.
 */

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time in ms before attempting to close circuit
  monitoringWindow: number;    // Time window in ms for failure tracking
  volumeThreshold: number;     // Minimum requests before circuit can open
}

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  nextAttemptTime?: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private nextAttemptTime?: number;
  
  private readonly options: CircuitBreakerOptions;
  private readonly requestTimes: number[] = [];

  constructor(
    private readonly name: string,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringWindow: 60000, // 1 minute
      volumeThreshold: 10,
      ...options
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should remain open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log(`🔄 Circuit breaker ${this.name}: Moving to HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN - failing fast`);
      }
    }

    const startTime = Date.now();
    this.totalRequests++;
    this.cleanupOldRequests();

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    } finally {
      this.requestTimes.push(startTime);
    }
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    console.log(`🔄 Circuit breaker ${this.name}: Manually reset to CLOSED state`);
  }

  /**
   * Check if circuit breaker is available
   */
  isAvailable(): boolean {
    return this.state === CircuitState.CLOSED || 
           (this.state === CircuitState.HALF_OPEN);
  }

  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.nextAttemptTime = undefined;
      console.log(`✅ Circuit breaker ${this.name}: Recovered - moving to CLOSED state`);
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
      console.log(`❌ Circuit breaker ${this.name}: Half-open test failed - moving to OPEN state`);
    } else if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.recoveryTimeout;
      console.log(`⚠️ Circuit breaker ${this.name}: Opening circuit - failure threshold exceeded`);
    }
  }

  private shouldOpenCircuit(): boolean {
    // Need minimum volume of requests
    if (this.totalRequests < this.options.volumeThreshold) {
      return false;
    }

    // Check failure rate within monitoring window
    const recentRequests = this.getRecentRequestCount();
    if (recentRequests < this.options.volumeThreshold) {
      return false;
    }

    // Check if failure threshold is exceeded
    return this.failureCount >= this.options.failureThreshold;
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime ? Date.now() >= this.nextAttemptTime : true;
  }

  private getRecentRequestCount(): number {
    const cutoffTime = Date.now() - this.options.monitoringWindow;
    return this.requestTimes.filter(time => time >= cutoffTime).length;
  }

  private cleanupOldRequests(): void {
    const cutoffTime = Date.now() - this.options.monitoringWindow;
    const cutoffIndex = this.requestTimes.findIndex(time => time >= cutoffTime);
    
    if (cutoffIndex > 0) {
      this.requestTimes.splice(0, cutoffIndex);
    }
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuitBreaker(
    name: string, 
    options?: Partial<CircuitBreakerOptions>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    const breaker = this.getCircuitBreaker(serviceName, options);
    return breaker.execute(fn);
  }

  /**
   * Get metrics for all circuit breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const [name, breaker] of this.breakers) {
      breaker.reset();
    }
    console.log('🔄 All circuit breakers reset');
  }

  /**
   * Get system health based on circuit breaker states
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, { 
      state: CircuitState; 
      available: boolean;
      failureRate: number;
    }>;
  } {
    const services: Record<string, any> = {};
    let healthyCount = 0;
    let totalCount = 0;

    for (const [name, breaker] of this.breakers) {
      const metrics = breaker.getMetrics();
      const failureRate = metrics.totalRequests > 0 
        ? metrics.failureCount / metrics.totalRequests 
        : 0;
      
      services[name] = {
        state: metrics.state,
        available: breaker.isAvailable(),
        failureRate
      };

      if (metrics.state === CircuitState.CLOSED) {
        healthyCount++;
      }
      totalCount++;
    }

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (totalCount > 0) {
      const healthRatio = healthyCount / totalCount;
      if (healthRatio < 0.5) {
        overall = 'unhealthy';
      } else if (healthRatio < 1.0) {
        overall = 'degraded';
      }
    }

    return { overall, services };
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Pre-configured circuit breakers for common services
export const dbCircuitBreaker = circuitBreakerManager.getCircuitBreaker('database', {
  failureThreshold: 3,
  recoveryTimeout: 10000, // 10 seconds
  volumeThreshold: 5
});

export const authCircuitBreaker = circuitBreakerManager.getCircuitBreaker('authentication', {
  failureThreshold: 5,
  recoveryTimeout: 15000, // 15 seconds
  volumeThreshold: 10
});

export const emailCircuitBreaker = circuitBreakerManager.getCircuitBreaker('email', {
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds
  volumeThreshold: 3
});

export default CircuitBreakerManager;