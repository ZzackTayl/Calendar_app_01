#!/usr/bin/env node

/**
 * PolyHarmony Monitoring and Alerting System
 * 
 * This script monitors system health and sends alerts based on configured thresholds
 * Supports multiple notification channels: Email, Slack, Discord, SMS
 * 
 * Usage: node scripts/monitoring-alerts.js [--check-once]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const MONITORING_INTERVAL = 60000; // 1 minute
const ALERT_COOLDOWN = 300000; // 5 minutes between duplicate alerts
const ALERT_LOG_DIR = './backups/logs';

/**
 * Alert severity levels
 */
const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning', 
  CRITICAL: 'critical'
};

/**
 * Monitoring thresholds
 */
const THRESHOLDS = {
  DATABASE_RESPONSE_TIME: {
    warning: 1000,    // 1 second
    critical: 5000    // 5 seconds
  },
  MEMORY_USAGE: {
    warning: 80,      // 80%
    critical: 90      // 90%
  },
  AUTH_RESPONSE_TIME: {
    warning: 500,     // 500ms
    critical: 2000    // 2 seconds
  },
  ERROR_RATE: {
    warning: 5,       // 5%
    critical: 20      // 20%
  }
};

/**
 * Alert tracking to prevent spam
 */
let lastAlerts = new Map();

/**
 * Main monitoring function
 */
async function runMonitoring(checkOnce = false) {
  console.log('🔍 Starting PolyHarmony system monitoring...');
  
  if (checkOnce) {
    await performHealthCheck();
    return;
  }
  
  // Run continuous monitoring
  setInterval(async () => {
    try {
      await performHealthCheck();
    } catch (error) {
      console.error('Monitoring check failed:', error);
      await sendAlert({
        type: 'monitoring_system_error',
        severity: SEVERITY.CRITICAL,
        message: 'Monitoring system encountered an error',
        details: error.message,
        component: 'monitoring'
      });
    }
  }, MONITORING_INTERVAL);
  
  console.log(`✅ Monitoring started with ${MONITORING_INTERVAL/1000}s interval`);
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Running health checks...`);
  
  const checks = [
    checkDatabaseHealth,
    checkAuthenticationHealth, 
    checkSystemPerformance,
    checkApplicationHealth
  ];
  
  for (const check of checks) {
    try {
      await check();
    } catch (error) {
      console.error(`Health check failed:`, error);
    }
  }
}

/**
 * Check database health and performance
 */
async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await sendAlert({
        type: 'database_configuration_missing',
        severity: SEVERITY.CRITICAL,
        message: 'Database configuration missing',
        component: 'database'
      });
      return;
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test basic connectivity
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      await sendAlert({
        type: 'database_connectivity_error',
        severity: SEVERITY.CRITICAL,
        message: 'Database connectivity failed',
        details: error.message,
        component: 'database',
        metrics: { responseTime }
      });
      return;
    }
    
    // Check response time thresholds
    if (responseTime > THRESHOLDS.DATABASE_RESPONSE_TIME.critical) {
      await sendAlert({
        type: 'database_response_critical',
        severity: SEVERITY.CRITICAL,
        message: `Database response time critically slow: ${responseTime}ms`,
        component: 'database',
        metrics: { responseTime, threshold: THRESHOLDS.DATABASE_RESPONSE_TIME.critical }
      });
    } else if (responseTime > THRESHOLDS.DATABASE_RESPONSE_TIME.warning) {
      await sendAlert({
        type: 'database_response_warning',
        severity: SEVERITY.WARNING,
        message: `Database response time degraded: ${responseTime}ms`,
        component: 'database', 
        metrics: { responseTime, threshold: THRESHOLDS.DATABASE_RESPONSE_TIME.warning }
      });
    }
    
    console.log(`  ✅ Database: ${responseTime}ms response time`);
    
  } catch (error) {
    await sendAlert({
      type: 'database_health_check_failed',
      severity: SEVERITY.CRITICAL,
      message: 'Database health check failed',
      details: error.message,
      component: 'database'
    });
  }
}

/**
 * Check authentication system health
 */
async function checkAuthenticationHealth() {
  const startTime = Date.now();
  
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      await sendAlert({
        type: 'auth_configuration_missing',
        severity: SEVERITY.CRITICAL,
        message: 'Authentication configuration missing',
        component: 'authentication'
      });
      return;
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test auth service
    await supabase.auth.getSession();
    
    const responseTime = Date.now() - startTime;
    
    // Check response time thresholds
    if (responseTime > THRESHOLDS.AUTH_RESPONSE_TIME.critical) {
      await sendAlert({
        type: 'auth_response_critical',
        severity: SEVERITY.CRITICAL,
        message: `Authentication response time critically slow: ${responseTime}ms`,
        component: 'authentication',
        metrics: { responseTime, threshold: THRESHOLDS.AUTH_RESPONSE_TIME.critical }
      });
    } else if (responseTime > THRESHOLDS.AUTH_RESPONSE_TIME.warning) {
      await sendAlert({
        type: 'auth_response_warning', 
        severity: SEVERITY.WARNING,
        message: `Authentication response time degraded: ${responseTime}ms`,
        component: 'authentication',
        metrics: { responseTime, threshold: THRESHOLDS.AUTH_RESPONSE_TIME.warning }
      });
    }
    
    console.log(`  ✅ Authentication: ${responseTime}ms response time`);
    
  } catch (error) {
    await sendAlert({
      type: 'auth_health_check_failed',
      severity: SEVERITY.CRITICAL,
      message: 'Authentication health check failed',
      details: error.message,
      component: 'authentication'
    });
  }
}

/**
 * Check system performance metrics
 */
async function checkSystemPerformance() {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    // Check memory usage thresholds
    if (memoryUsagePercent > THRESHOLDS.MEMORY_USAGE.critical) {
      await sendAlert({
        type: 'memory_usage_critical',
        severity: SEVERITY.CRITICAL,
        message: `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        component: 'system',
        metrics: { 
          memoryUsagePercent: memoryUsagePercent.toFixed(1),
          memoryUsedMB,
          threshold: THRESHOLDS.MEMORY_USAGE.critical
        }
      });
    } else if (memoryUsagePercent > THRESHOLDS.MEMORY_USAGE.warning) {
      await sendAlert({
        type: 'memory_usage_warning',
        severity: SEVERITY.WARNING,
        message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        component: 'system',
        metrics: { 
          memoryUsagePercent: memoryUsagePercent.toFixed(1),
          memoryUsedMB,
          threshold: THRESHOLDS.MEMORY_USAGE.warning
        }
      });
    }
    
    console.log(`  ✅ Memory: ${memoryUsagePercent.toFixed(1)}% (${memoryUsedMB}MB)`);
    
  } catch (error) {
    await sendAlert({
      type: 'performance_check_failed',
      severity: SEVERITY.WARNING,
      message: 'System performance check failed',
      details: error.message,
      component: 'system'
    });
  }
}

/**
 * Check application health via health endpoint
 */
async function checkApplicationHealth() {
  const startTime = Date.now();
  
  try {
    // In production, this would be the actual domain
    const healthUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/health`
      : 'http://localhost:3000/api/health';
    
    // For now, just check if we can create the client (endpoint might not be accessible in this context)
    const responseTime = Date.now() - startTime;
    console.log(`  ✅ Application: Health check simulated (${responseTime}ms)`);
    
    // In a real deployment, you would use fetch to test the actual endpoint:
    /*
    const response = await fetch(healthUrl);
    const data = await response.json();
    
    if (!response.ok || data.status !== 'healthy') {
      await sendAlert({
        type: 'application_health_unhealthy',
        severity: SEVERITY.CRITICAL,
        message: 'Application health check failed',
        details: data,
        component: 'application'
      });
    }
    */
    
  } catch (error) {
    await sendAlert({
      type: 'application_health_check_failed',
      severity: SEVERITY.CRITICAL,
      message: 'Application health check failed',
      details: error.message,
      component: 'application'
    });
  }
}

/**
 * Send alert through configured channels
 */
async function sendAlert(alert) {
  const alertKey = `${alert.type}_${alert.component}`;
  const now = Date.now();
  
  // Check if we've sent this alert recently (cooldown period)
  if (lastAlerts.has(alertKey)) {
    const lastSent = lastAlerts.get(alertKey);
    if (now - lastSent < ALERT_COOLDOWN) {
      return; // Skip duplicate alert
    }
  }
  
  // Record this alert
  lastAlerts.set(alertKey, now);
  
  const enrichedAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    hostname: require('os').hostname(),
    environment: process.env.VERCEL_ENV || 'development'
  };
  
  console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  
  // Log alert to file
  await logAlert(enrichedAlert);
  
  // Send through configured channels
  await Promise.allSettled([
    sendEmailAlert(enrichedAlert),
    sendSlackAlert(enrichedAlert),
    sendDiscordAlert(enrichedAlert),
    sendSMSAlert(enrichedAlert)
  ]);
}

/**
 * Log alert to file system
 */
async function logAlert(alert) {
  try {
    await fs.mkdir(ALERT_LOG_DIR, { recursive: true });
    
    const logFile = path.join(ALERT_LOG_DIR, `alerts-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `${alert.timestamp} [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}\n`;
    
    await fs.appendFile(logFile, logEntry);
    
    // Also save detailed alert as JSON
    const detailedLogFile = path.join(ALERT_LOG_DIR, `alert-${alert.id}.json`);
    await fs.writeFile(detailedLogFile, JSON.stringify(alert, null, 2));
    
  } catch (error) {
    console.error('Failed to log alert:', error);
  }
}

/**
 * Send email alert (placeholder - implement with actual email service)
 */
async function sendEmailAlert(alert) {
  if (alert.severity !== SEVERITY.CRITICAL) {
    return; // Only send emails for critical alerts
  }
  
  try {
    // Implement actual email sending here
    // Using SendGrid, Nodemailer, or other email service
    
    console.log(`📧 Email alert would be sent: ${alert.message}`);
    
    // Example email content:
    const emailContent = {
      to: process.env.ALERT_EMAIL || 'ops-team@polyharmony.app',
      subject: `[CRITICAL] PolyHarmony Alert: ${alert.type}`,
      html: `
        <h2>PolyHarmony System Alert</h2>
        <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
        <p><strong>Component:</strong> ${alert.component}</p>
        <p><strong>Message:</strong> ${alert.message}</p>
        <p><strong>Time:</strong> ${alert.timestamp}</p>
        ${alert.details ? `<p><strong>Details:</strong> ${alert.details}</p>` : ''}
        ${alert.metrics ? `<p><strong>Metrics:</strong> ${JSON.stringify(alert.metrics)}</p>` : ''}
        <p><strong>Environment:</strong> ${alert.environment}</p>
        <p><strong>Host:</strong> ${alert.hostname}</p>
      `
    };
    
    // TODO: Implement actual email sending
    // await sendEmailViaProvider(emailContent);
    
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}

/**
 * Send Slack alert (placeholder - implement with webhook)
 */
async function sendSlackAlert(alert) {
  try {
    if (!process.env.SLACK_WEBHOOK_URL) {
      return; // Slack not configured
    }
    
    const color = alert.severity === SEVERITY.CRITICAL ? 'danger' : 
                  alert.severity === SEVERITY.WARNING ? 'warning' : 'good';
    
    const slackMessage = {
      attachments: [{
        color,
        title: `PolyHarmony Alert: ${alert.type}`,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Component', value: alert.component, short: true },
          { title: 'Environment', value: alert.environment, short: true },
          { title: 'Time', value: alert.timestamp, short: true }
        ],
        footer: 'PolyHarmony Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    console.log(`💬 Slack alert would be sent: ${alert.message}`);
    
    // TODO: Implement actual Slack webhook call
    // await fetch(process.env.SLACK_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(slackMessage)
    // });
    
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

/**
 * Send Discord alert (placeholder)
 */
async function sendDiscordAlert(alert) {
  try {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      return; // Discord not configured
    }
    
    console.log(`🎮 Discord alert would be sent: ${alert.message}`);
    
    // TODO: Implement Discord webhook
    
  } catch (error) {
    console.error('Failed to send Discord alert:', error);
  }
}

/**
 * Send SMS alert (placeholder - for critical alerts only)
 */
async function sendSMSAlert(alert) {
  if (alert.severity !== SEVERITY.CRITICAL) {
    return; // Only SMS for critical alerts
  }
  
  try {
    if (!process.env.TWILIO_PHONE_NUMBER) {
      return; // SMS not configured
    }
    
    console.log(`📱 SMS alert would be sent: ${alert.message}`);
    
    // TODO: Implement SMS via Twilio or similar service
    
  } catch (error) {
    console.error('Failed to send SMS alert:', error);
  }
}

/**
 * Cleanup old alert logs
 */
async function cleanupOldLogs() {
  try {
    const files = await fs.readdir(ALERT_LOG_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days
    
    for (const file of files) {
      const filePath = path.join(ALERT_LOG_DIR, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        console.log(`Cleaned up old log file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old logs:', error);
  }
}

// Export functions for testing
module.exports = {
  runMonitoring,
  performHealthCheck,
  sendAlert,
  SEVERITY,
  THRESHOLDS
};

// Run monitoring if this file is executed directly
if (require.main === module) {
  const checkOnce = process.argv.includes('--check-once');
  
  runMonitoring(checkOnce)
    .then(() => {
      if (checkOnce) {
        console.log('Single health check completed');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('Monitoring failed to start:', error);
      process.exit(1);
    });
  
  // Cleanup old logs daily
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000); // 24 hours
}