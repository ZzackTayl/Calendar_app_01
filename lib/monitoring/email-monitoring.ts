/**
 * Email System Monitoring and Alerting
 * 
 * This module provides comprehensive monitoring for email delivery:
 * 1. Real-time delivery tracking
 * 2. Performance metrics collection
 * 3. Error detection and alerting
 * 4. Health checks for email services
 * 5. Dashboard for monitoring email system health
 */

import { EventEmitter } from 'events';

// Types for monitoring data
export interface EmailMetrics {
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  complained: number;
}

export interface EmailPerformanceMetrics {
  averageDeliveryTime: number;
  p95DeliveryTime: number;
  p99DeliveryTime: number;
  throughput: number; // emails per minute
  errorRate: number; // percentage
  providerUptime: Record<string, number>; // percentage per provider
}

export interface EmailAlert {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'delivery' | 'performance' | 'security' | 'quota' | 'provider';
  message: string;
  details?: any;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface EmailEvent {
  id: string;
  timestamp: Date;
  type: 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'unsubscribed' | 'complained';
  recipient: string;
  messageId: string;
  provider: string;
  duration?: number;
  error?: string;
  metadata?: any;
}

// Main monitoring class
export class EmailMonitoringSystem extends EventEmitter {
  private metrics: EmailMetrics = {
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    complained: 0
  };

  private performanceMetrics: EmailPerformanceMetrics = {
    averageDeliveryTime: 0,
    p95DeliveryTime: 0,
    p99DeliveryTime: 0,
    throughput: 0,
    errorRate: 0,
    providerUptime: {}
  };

  private alerts: EmailAlert[] = [];
  private events: EmailEvent[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  private deliveryTimes: number[] = [];
  private recentEvents: Array<{ timestamp: number; type: string }> = [];
  
  // Configuration
  private config = {
    metricsRetentionHours: 24,
    alertRetentionDays: 7,
    eventRetentionDays: 30,
    performanceThresholds: {
      maxDeliveryTime: 30000, // 30 seconds
      minThroughput: 10, // emails per minute
      maxErrorRate: 0.05, // 5%
      minProviderUptime: 0.95 // 95%
    },
    alertThresholds: {
      consecutiveFailures: 5,
      errorRateSpike: 0.1, // 10%
      deliveryTimeSpike: 60000, // 1 minute
      lowThroughput: 5 // emails per minute
    }
  };

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Record an email event
   */
  recordEvent(event: Omit<EmailEvent, 'id' | 'timestamp'>): void {
    const fullEvent: EmailEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event
    };

    this.events.push(fullEvent);
    this.updateMetrics(fullEvent);
    this.checkAlerts(fullEvent);
    
    // Emit event for real-time listeners
    this.emit('emailEvent', fullEvent);
    
    // Cleanup old events
    this.cleanupOldData();
  }

  /**
   * Record email delivery timing
   */
  recordDeliveryTime(messageId: string, deliveryTime: number): void {
    this.deliveryTimes.push(deliveryTime);
    
    // Keep only recent delivery times for performance calculation
    if (this.deliveryTimes.length > 1000) {
      this.deliveryTimes = this.deliveryTimes.slice(-1000);
    }
    
    this.updatePerformanceMetrics();
  }

  /**
   * Get current email metrics
   */
  getMetrics(): EmailMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): EmailPerformanceMetrics {
    this.updatePerformanceMetrics();
    return { ...this.performanceMetrics };
  }

  /**
   * Get recent alerts
   */
  getAlerts(level?: string): EmailAlert[] {
    return this.alerts
      .filter(alert => !level || alert.level === level)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get recent events
   */
  getEvents(type?: string, limit = 100): EmailEvent[] {
    return this.events
      .filter(event => !type || event.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Check email service health
   */
  async checkEmailServiceHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    providers: Record<string, { status: string; latency?: number; error?: string }>;
    issues: string[];
  }> {
    const providers: Record<string, { status: string; latency?: number; error?: string }> = {};
    const issues: string[] = [];

    // Test each configured email provider
    const emailProviders = this.getConfiguredProviders();
    
    for (const providerName of emailProviders) {
      try {
        const startTime = Date.now();
        await this.testProvider(providerName);
        const latency = Date.now() - startTime;
        
        providers[providerName] = {
          status: latency < 5000 ? 'healthy' : 'slow',
          latency
        };
        
        if (latency > 5000) {
          issues.push(`${providerName} is responding slowly (${latency}ms)`);
        }
      } catch (error) {
        providers[providerName] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error)
        };
        issues.push(`${providerName} is not responding: ${error}`);
      }
    }

    // Determine overall health
    const healthyProviders = Object.values(providers).filter(p => p.status === 'healthy').length;
    const totalProviders = Object.keys(providers).length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyProviders === totalProviders) {
      overall = 'healthy';
    } else if (healthyProviders > 0) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return { overall, providers, issues };
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor every minute
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
      this.updatePerformanceMetrics();
      this.checkSystemAlerts();
    }, 60000);

    console.log('📊 Email monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    console.log('📊 Email monitoring stopped');
  }

  /**
   * Generate monitoring report
   */
  generateReport(hours = 24): {
    summary: EmailMetrics & { totalEvents: number };
    performance: EmailPerformanceMetrics;
    alerts: { total: number; byLevel: Record<string, number> };
    trends: { hourly: Array<{ hour: string; sent: number; failed: number }> };
    topErrors: Array<{ error: string; count: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > cutoffTime);
    
    // Calculate trends
    const hourlyData = new Map<string, { sent: number; failed: number }>();
    recentEvents.forEach(event => {
      const hour = event.timestamp.toISOString().substring(0, 13);
      const data = hourlyData.get(hour) || { sent: 0, failed: 0 };
      
      if (event.type === 'sent') data.sent++;
      if (event.type === 'failed') data.failed++;
      
      hourlyData.set(hour, data);
    });
    
    const trends = Array.from(hourlyData.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
    
    // Calculate top errors
    const errorCounts = new Map<string, number>();
    recentEvents
      .filter(e => e.type === 'failed' && e.error)
      .forEach(e => {
        const count = errorCounts.get(e.error!) || 0;
        errorCounts.set(e.error!, count + 1);
      });
    
    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Calculate alert summary
    const recentAlerts = this.alerts.filter(a => a.timestamp > cutoffTime);
    const alertsByLevel = recentAlerts.reduce((acc, alert) => {
      acc[alert.level] = (acc[alert.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        ...this.metrics,
        totalEvents: recentEvents.length
      },
      performance: this.getPerformanceMetrics(),
      alerts: {
        total: recentAlerts.length,
        byLevel: alertsByLevel
      },
      trends,
      topErrors
    };
  }

  // Private methods

  private updateMetrics(event: EmailEvent): void {
    switch (event.type) {
      case 'sent':
        this.metrics.sent++;
        break;
      case 'delivered':
        this.metrics.delivered++;
        break;
      case 'failed':
        this.metrics.failed++;
        break;
      case 'bounced':
        this.metrics.bounced++;
        break;
      case 'opened':
        this.metrics.opened++;
        break;
      case 'clicked':
        this.metrics.clicked++;
        break;
      case 'unsubscribed':
        this.metrics.unsubscribed++;
        break;
      case 'complained':
        this.metrics.complained++;
        break;
    }
    
    // Track recent events for throughput calculation
    this.recentEvents.push({ timestamp: Date.now(), type: event.type });
    
    // Keep only recent events (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.recentEvents = this.recentEvents.filter(e => e.timestamp > oneHourAgo);
  }

  private updatePerformanceMetrics(): void {
    if (this.deliveryTimes.length > 0) {
      // Calculate average
      this.performanceMetrics.averageDeliveryTime = 
        this.deliveryTimes.reduce((sum, time) => sum + time, 0) / this.deliveryTimes.length;
      
      // Calculate percentiles
      const sorted = [...this.deliveryTimes].sort((a, b) => a - b);
      this.performanceMetrics.p95DeliveryTime = sorted[Math.floor(sorted.length * 0.95)] || 0;
      this.performanceMetrics.p99DeliveryTime = sorted[Math.floor(sorted.length * 0.99)] || 0;
    }
    
    // Calculate throughput (events per minute)
    const recentEventCount = this.recentEvents.filter(e => e.type === 'sent').length;
    this.performanceMetrics.throughput = recentEventCount; // per hour, convert as needed
    
    // Calculate error rate
    const totalEvents = this.metrics.sent + this.metrics.failed;
    this.performanceMetrics.errorRate = totalEvents > 0 ? this.metrics.failed / totalEvents : 0;
  }

  private checkAlerts(event: EmailEvent): void {
    // Check for consecutive failures
    const recentFailures = this.events
      .slice(-this.config.alertThresholds.consecutiveFailures)
      .filter(e => e.type === 'failed');
    
    if (recentFailures.length === this.config.alertThresholds.consecutiveFailures) {
      this.createAlert('error', 'delivery', 
        `${this.config.alertThresholds.consecutiveFailures} consecutive email failures detected`);
    }
    
    // Check delivery time spikes
    if (event.duration && event.duration > this.config.alertThresholds.deliveryTimeSpike) {
      this.createAlert('warning', 'performance', 
        `Slow email delivery detected: ${event.duration}ms`, { messageId: event.messageId });
    }
  }

  private checkSystemAlerts(): void {
    // Check error rate spike
    if (this.performanceMetrics.errorRate > this.config.alertThresholds.errorRateSpike) {
      this.createAlert('warning', 'performance', 
        `High error rate detected: ${(this.performanceMetrics.errorRate * 100).toFixed(1)}%`);
    }
    
    // Check low throughput
    if (this.performanceMetrics.throughput < this.config.alertThresholds.lowThroughput) {
      this.createAlert('warning', 'performance', 
        `Low email throughput: ${this.performanceMetrics.throughput} emails/hour`);
    }
  }

  private createAlert(
    level: EmailAlert['level'], 
    category: EmailAlert['category'], 
    message: string, 
    details?: any
  ): void {
    const alert: EmailAlert = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      details
    };
    
    this.alerts.push(alert);
    this.emit('alert', alert);
    
    // Log critical alerts
    if (level === 'critical' || level === 'error') {
      console.error(`🚨 Email Alert [${level.toUpperCase()}]: ${message}`, details);
    }
  }

  private async performHealthChecks(): Promise<void> {
    try {
      const health = await this.checkEmailServiceHealth();
      
      if (health.overall === 'unhealthy') {
        this.createAlert('critical', 'provider', 
          'All email providers are unhealthy', { issues: health.issues });
      } else if (health.overall === 'degraded') {
        this.createAlert('warning', 'provider', 
          'Some email providers are experiencing issues', { issues: health.issues });
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  private getConfiguredProviders(): string[] {
    const providers: string[] = [];
    
    if (process.env.RESEND_API_KEY) providers.push('resend');
    if (process.env.SENDGRID_API_KEY) providers.push('sendgrid');
    if (process.env.SMTP_HOST) providers.push('smtp');
    
    return providers.length > 0 ? providers : ['console'];
  }

  private async testProvider(providerName: string): Promise<void> {
    // In a real implementation, this would make actual test requests to providers
    // For now, we simulate the test
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    
    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error(`Provider ${providerName} test failed`);
    }
  }

  private cleanupOldData(): void {
    const now = Date.now();
    
    // Clean up old events
    const eventCutoff = now - this.config.eventRetentionDays * 24 * 60 * 60 * 1000;
    this.events = this.events.filter(e => e.timestamp.getTime() > eventCutoff);
    
    // Clean up old alerts
    const alertCutoff = now - this.config.alertRetentionDays * 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > alertCutoff);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
export const emailMonitor = new EmailMonitoringSystem();

// Webhook handlers for email service providers
export class EmailWebhookHandlers {
  /**
   * Handle Resend webhooks
   */
  static handleResendWebhook(payload: any): void {
    const { type, data } = payload;
    
    let eventType: EmailEvent['type'];
    switch (type) {
      case 'email.sent':
        eventType = 'sent';
        break;
      case 'email.delivered':
        eventType = 'delivered';
        break;
      case 'email.delivery_delay':
      case 'email.bounced':
        eventType = 'bounced';
        break;
      case 'email.complained':
        eventType = 'complained';
        break;
      case 'email.opened':
        eventType = 'opened';
        break;
      case 'email.clicked':
        eventType = 'clicked';
        break;
      default:
        console.warn(`Unknown Resend webhook type: ${type}`);
        return;
    }
    
    emailMonitor.recordEvent({
      type: eventType,
      recipient: data.to,
      messageId: data.id,
      provider: 'resend',
      metadata: data
    });
  }

  /**
   * Handle SendGrid webhooks
   */
  static handleSendGridWebhook(events: any[]): void {
    events.forEach(event => {
      let eventType: EmailEvent['type'];
      
      switch (event.event) {
        case 'processed':
        case 'delivered':
          eventType = 'delivered';
          break;
        case 'bounce':
        case 'blocked':
          eventType = 'bounced';
          break;
        case 'open':
          eventType = 'opened';
          break;
        case 'click':
          eventType = 'clicked';
          break;
        case 'unsubscribe':
          eventType = 'unsubscribed';
          break;
        case 'spamreport':
          eventType = 'complained';
          break;
        default:
          console.warn(`Unknown SendGrid event type: ${event.event}`);
          return;
      }
      
      emailMonitor.recordEvent({
        type: eventType,
        recipient: event.email,
        messageId: event.sg_message_id || event['smtp-id'],
        provider: 'sendgrid',
        metadata: event
      });
    });
  }
}

// Export monitoring utilities
export default emailMonitor;