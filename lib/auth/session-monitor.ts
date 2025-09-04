/**
 * Session Monitor for Authentication Context Integrity
 * 
 * This module provides monitoring and validation of authentication sessions
 * to ensure context consistency and detect potential security issues.
 */

import { User, Session } from '@supabase/supabase-js';
import { validateAuthSession, SessionValidationResult } from './session-manager';
import { createSupabaseClient } from '../supabase/client';

export interface SessionHealthMetrics {
  totalSessions: number;
  healthySessions: number;
  degradedSessions: number;
  failedSessions: number;
  lastCheck: number;
}

export interface SessionMonitorConfig {
  checkInterval: number; // milliseconds
  maxFailures: number;
  alertThreshold: number; // percentage of failed sessions
}

export class SessionMonitor {
  private config: SessionMonitorConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private metrics: SessionHealthMetrics = {
    totalSessions: 0,
    healthySessions: 0,
    degradedSessions: 0,
    failedSessions: 0,
    lastCheck: 0
  };

  constructor(config: Partial<SessionMonitorConfig> = {}) {
    this.config = {
      checkInterval: 30000, // 30 seconds
      maxFailures: 3,
      alertThreshold: 20, // 20% failure rate
      ...config
    };
  }

  /**
   * Start monitoring sessions
   */
  public start(): void {
    if (this.isRunning) return;

    console.log('SessionMonitor: Starting session monitoring');
    this.isRunning = true;
    
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring sessions
   */
  public stop(): void {
    if (!this.isRunning) return;

    console.log('SessionMonitor: Stopping session monitoring');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform a health check on the current session
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        this.updateMetrics('no_session');
        return;
      }

      const validation = await validateAuthSession();
      this.updateMetrics(validation.contextIntegrity);
      
      // Check if we need to alert
      const failureRate = (this.metrics.failedSessions / this.metrics.totalSessions) * 100;
      if (failureRate > this.config.alertThreshold) {
        this.triggerAlert(failureRate);
      }
      
    } catch (error) {
      console.error('SessionMonitor: Health check failed:', error);
      this.updateMetrics('failed');
    }
  }

  /**
   * Update session metrics
   */
  private updateMetrics(status: string): void {
    this.metrics.totalSessions++;
    this.metrics.lastCheck = Date.now();
    
    switch (status) {
      case 'healthy':
        this.metrics.healthySessions++;
        break;
      case 'degraded':
        this.metrics.degradedSessions++;
        break;
      case 'failed':
        this.metrics.failedSessions++;
        break;
      case 'no_session':
        // Don't count as failure if no session exists
        break;
    }
  }

  /**
   * Trigger security alert
   */
  private triggerAlert(failureRate: number): void {
    console.warn(`SessionMonitor: SECURITY ALERT - High failure rate: ${failureRate.toFixed(1)}%`, {
      metrics: this.metrics,
      threshold: this.config.alertThreshold,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current session health metrics
   */
  public getMetrics(): SessionHealthMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalSessions: 0,
      healthySessions: 0,
      degradedSessions: 0,
      failedSessions: 0,
      lastCheck: 0
    };
  }
}

// Singleton instance
let sessionMonitor: SessionMonitor | null = null;

/**
 * Get the singleton session monitor instance
 */
export function getSessionMonitor(): SessionMonitor {
  if (!sessionMonitor) {
    sessionMonitor = new SessionMonitor();
  }
  return sessionMonitor;
}

/**
 * Initialize session monitoring
 */
export function initializeSessionMonitoring(config?: Partial<SessionMonitorConfig>): SessionMonitor {
  const monitor = getSessionMonitor();
  if (config) {
    // Update config if provided
    Object.assign((monitor as any).config, config);
  }
  monitor.start();
  return monitor;
}