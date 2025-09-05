/**
 * Security Alerting Service
 * Handles real-time notifications and alerts for security events
 */

import { type SecurityAlert, type SecuritySeverity } from './monitoring-service';

export interface AlertChannel {
  id: string;
  name: string;
  type: 'browser' | 'console' | 'webhook' | 'email';
  enabled: boolean;
  config: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  severityThreshold: SecuritySeverity;
  channels: string[];
  enabled: boolean;
  cooldownMinutes: number;
}

class SecurityAlertingService {
  private channels: AlertChannel[] = [];
  private rules: AlertRule[] = [];
  private lastAlertTimes: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert channels
   */
  private initializeDefaultChannels(): void {
    this.channels = [
      {
        id: 'browser_notifications',
        name: 'Browser Notifications',
        type: 'browser',
        enabled: true,
        config: {
          icon: '/favicon.ico',
          requirePermission: true
        }
      },
      {
        id: 'console_logging',
        name: 'Console Logging',
        type: 'console',
        enabled: true,
        config: {
          logLevel: 'error'
        }
      }
    ];
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'critical_alerts',
        name: 'Critical Security Alerts',
        severityThreshold: 'critical',
        channels: ['browser_notifications', 'console_logging'],
        enabled: true,
        cooldownMinutes: 1
      },
      {
        id: 'high_severity_alerts',
        name: 'High Severity Alerts',
        severityThreshold: 'high',
        channels: ['console_logging'],
        enabled: true,
        cooldownMinutes: 5
      },
      {
        id: 'medium_severity_alerts',
        name: 'Medium Severity Alerts',
        severityThreshold: 'medium',
        channels: ['console_logging'],
        enabled: true,
        cooldownMinutes: 15
      }
    ];
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert: SecurityAlert): Promise<void> {
    const applicableRules = this.rules.filter(rule => 
      rule.enabled && this.shouldTriggerRule(rule, alert)
    );

    for (const rule of applicableRules) {
      // Check cooldown
      const lastAlertKey = `${rule.id}_${alert.type}`;
      const lastAlertTime = this.lastAlertTimes.get(lastAlertKey) || 0;
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      
      if (Date.now() - lastAlertTime < cooldownMs) {
        continue; // Skip due to cooldown
      }

      // Send to configured channels
      for (const channelId of rule.channels) {
        const channel = this.channels.find(c => c.id === channelId && c.enabled);
        if (channel) {
          await this.sendToChannel(channel, alert);
        }
      }

      // Update last alert time
      this.lastAlertTimes.set(lastAlertKey, Date.now());
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: SecurityAlert): Promise<void> {
    try {
      switch (channel.type) {
        case 'browser':
          await this.sendBrowserNotification(channel, alert);
          break;
        case 'console':
          this.sendConsoleAlert(channel, alert);
          break;
        case 'webhook':
          await this.sendWebhookAlert(channel, alert);
          break;
        case 'email':
          await this.sendEmailAlert(channel, alert);
          break;
        default:
          console.warn(`[ALERTING] Unknown channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`[ALERTING] Failed to send alert to channel ${channel.id}:`, error);
    }
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(channel: AlertChannel, alert: SecurityAlert): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // Request permission if needed
    if (channel.config.requirePermission && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return;
      }
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(alert.title, {
        body: alert.description,
        icon: channel.config.icon || '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.severity === 'critical',
        silent: false
      });

      // Auto-close after 10 seconds for non-critical alerts
      if (alert.severity !== 'critical') {
        setTimeout(() => notification.close(), 10000);
      }

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  /**
   * Send console alert
   */
  private sendConsoleAlert(channel: AlertChannel, alert: SecurityAlert): void {
    const logLevel = channel.config.logLevel || 'error';
    const message = `[SECURITY-ALERT] ${alert.title}`;
    const data = {
      alertId: alert.id,
      severity: alert.severity,
      type: alert.type,
      description: alert.description,
      timestamp: alert.timestamp,
      eventCount: alert.events.length
    };

    switch (logLevel) {
      case 'error':
        console.error(message, data);
        break;
      case 'warn':
        console.warn(message, data);
        break;
      case 'info':
        console.info(message, data);
        break;
      default:
        console.log(message, data);
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(channel: AlertChannel, alert: SecurityAlert): Promise<void> {
    if (!channel.config.url) {
      console.error('[ALERTING] Webhook URL not configured');
      return;
    }

    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        type: alert.type,
        timestamp: alert.timestamp,
        eventCount: alert.events.length
      },
      metadata: {
        source: 'polyharmony-security',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(channel.config.headers || {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(channel: AlertChannel, alert: SecurityAlert): Promise<void> {
    // This would integrate with your email service
    // For now, just log that an email would be sent
    console.log(`[ALERTING] Email alert would be sent to ${channel.config.recipients}:`, {
      subject: `Security Alert: ${alert.title}`,
      body: alert.description,
      severity: alert.severity
    });
  }

  /**
   * Check if rule should trigger for alert
   */
  private shouldTriggerRule(rule: AlertRule, alert: SecurityAlert): boolean {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const alertSeverityIndex = severityLevels.indexOf(alert.severity);
    const ruleSeverityIndex = severityLevels.indexOf(rule.severityThreshold);
    
    return alertSeverityIndex >= ruleSeverityIndex;
  }

  /**
   * Add or update alert channel
   */
  addChannel(channel: AlertChannel): void {
    const existingIndex = this.channels.findIndex(c => c.id === channel.id);
    if (existingIndex >= 0) {
      this.channels[existingIndex] = channel;
    } else {
      this.channels.push(channel);
    }
    console.log(`[ALERTING] Channel ${channel.id} configured`);
  }

  /**
   * Add or update alert rule
   */
  addRule(rule: AlertRule): void {
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
    console.log(`[ALERTING] Rule ${rule.id} configured`);
  }

  /**
   * Get all channels
   */
  getChannels(): AlertChannel[] {
    return [...this.channels];
  }

  /**
   * Get all rules
   */
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  /**
   * Enable/disable channel
   */
  toggleChannel(channelId: string, enabled: boolean): boolean {
    const channel = this.channels.find(c => c.id === channelId);
    if (channel) {
      channel.enabled = enabled;
      console.log(`[ALERTING] Channel ${channelId} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable rule
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      console.log(`[ALERTING] Rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Test alert system
   */
  async testAlert(severity: SecuritySeverity = 'medium'): Promise<void> {
    const testAlert: SecurityAlert = {
      id: `test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'critical_event',
      severity,
      title: 'Test Security Alert',
      description: 'This is a test alert to verify the alerting system is working correctly.',
      events: [],
      acknowledged: false
    };

    await this.sendAlert(testAlert);
    console.log('[ALERTING] Test alert sent');
  }
}

// Export singleton instance
export const securityAlerting = new SecurityAlertingService();

// Convenience functions
export const sendSecurityAlert = (alert: SecurityAlert) => securityAlerting.sendAlert(alert);
export const testSecurityAlert = (severity?: SecuritySeverity) => securityAlerting.testAlert(severity);
export const addAlertChannel = (channel: AlertChannel) => securityAlerting.addChannel(channel);
export const addAlertRule = (rule: AlertRule) => securityAlerting.addRule(rule);
export const getAlertChannels = () => securityAlerting.getChannels();
export const getAlertRules = () => securityAlerting.getRules();