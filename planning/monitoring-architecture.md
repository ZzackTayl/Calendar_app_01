# Monitoring Architecture: Comprehensive Observability Strategy
## Production Monitoring, Alerting, and Performance Optimization

---

## Executive Summary

This monitoring architecture provides a **comprehensive observability strategy** for the PolyHarmony Calendar application. Designed to support the My_Approach developer's Phase 4 work (Days 24-25: Performance monitoring setup) while providing enterprise-grade monitoring capabilities.

**Architecture Focus**: Multi-layer monitoring with metrics, logs, traces, and alerting for production reliability and performance optimization.

**Key Components**:
- **Infrastructure Monitoring**: System resources and container health
- **Application Monitoring**: API performance, error tracking, user behavior
- **Database Monitoring**: Query performance, connection pooling, data integrity
- **Business Monitoring**: User engagement, feature usage, business metrics
- **Security Monitoring**: Threat detection, compliance tracking

---

## 1. Monitoring Architecture Overview

### 1.1 Layered Monitoring Strategy

#### Infrastructure Layer
- **System Metrics**: CPU, memory, disk, network utilization
- **Container Health**: Docker container status and resource usage
- **Service Discovery**: Automatic service detection and monitoring

#### Application Layer
- **API Performance**: Response times, throughput, error rates
- **User Experience**: Page load times, user interactions, conversion rates
- **Error Tracking**: Exception monitoring, stack traces, error patterns

#### Data Layer
- **Database Performance**: Query execution times, connection pools, locks
- **Cache Performance**: Hit rates, response times, memory usage
- **Storage Metrics**: File system usage, backup status, data integrity

#### Business Layer
- **User Engagement**: Active users, session duration, feature usage
- **Business Metrics**: Calendar events created, user registrations, retention
- **Compliance Metrics**: Data access patterns, audit trail completeness

### 1.2 Monitoring Stack Architecture

#### Primary Monitoring Stack
```yaml
# Production monitoring infrastructure
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    networks:
      - monitoring-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus
    networks:
      - monitoring-network

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - monitoring-network

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log
    command: -config.file=/etc/promtail/config.yml
    networks:
      - monitoring-network
```

---

## 2. Infrastructure Monitoring

### 2.1 System Metrics Collection

#### Node Exporter for System Metrics
```yaml
# Node exporter for system monitoring
node-exporter:
  image: prom/node-exporter:latest
  ports:
    - "9100:9100"
  volumes:
    - /proc:/host/proc:ro
    - /sys:/host/sys:ro
    - /:/rootfs:ro
  command:
    - '--path.procfs=/host/proc'
    - '--path.rootfs=/rootfs'
    - '--path.sysfs=/host/sys'
    - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
  networks:
    - monitoring-network
```

#### Docker Metrics Collection
```yaml
# Docker metrics collection
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  ports:
    - "8080:8080"
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  networks:
    - monitoring-network
```

### 2.2 Custom Metrics Collection

#### Application Metrics Endpoint
```javascript
// Prometheus metrics endpoint
export async function GET() {
  const metrics = await collectMetrics();

  return new Response(metrics, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

async function collectMetrics() {
  const startTime = performance.now();

  // Collect application metrics
  const activeUsers = await getActiveUsersCount();
  const totalEvents = await getTotalEventsCount();
  const apiResponseTime = await measureAPIResponseTime();

  const metrics = `
# Application Metrics
polyharmony_active_users ${activeUsers}
polyharmony_total_events ${totalEvents}
polyharmony_api_response_time ${apiResponseTime}

# System Metrics
polyharmony_memory_usage ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}
polyharmony_cpu_usage ${process.cpuUsage().user / 1000000}
polyharmony_uptime ${Math.floor(process.uptime())}

# Database Metrics
polyharmony_db_connections ${await getDatabaseConnectionCount()}
polyharmony_db_query_time ${await getAverageQueryTime()}

# Cache Metrics
polyharmony_cache_hit_rate ${await getCacheHitRate()}
polyharmony_cache_size ${await getCacheSize()}
  `;

  const endTime = performance.now();
  const collectionTime = endTime - startTime;

  // Add metrics collection time
  return metrics + `polyharmony_metrics_collection_time ${collectionTime}`;
}
```

---

## 3. Application Performance Monitoring

### 3.1 API Performance Tracking

#### Request Metrics
```javascript
// API performance middleware
export class PerformanceMiddleware {
  static trackAPIPerformance(req, res, next) {
    const startTime = performance.now();
    const requestId = generateRequestId();

    // Add request tracking headers
    res.set('X-Request-ID', requestId);
    res.set('X-Start-Time', startTime.toString());

    // Track request completion
    res.on('finish', () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const statusCode = res.statusCode;

      // Record metrics
      this.recordAPIMetrics({
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    });

    next();
  }

  static async recordAPIMetrics(metrics) {
    // Store metrics in database
    await db.execute(sql`
      INSERT INTO api_metrics (
        request_id, method, path, status_code, duration,
        user_agent, ip_address, timestamp
      ) VALUES (
        ${metrics.requestId}, ${metrics.method}, ${metrics.path},
        ${metrics.statusCode}, ${metrics.duration}, ${metrics.userAgent},
        ${metrics.ip}, ${metrics.timestamp}
      )
    `);

    // Update Prometheus metrics
    apiRequestDuration
      .labels(metrics.method, metrics.path, metrics.statusCode.toString())
      .observe(metrics.duration / 1000);

    apiRequestTotal
      .labels(metrics.method, metrics.path, metrics.statusCode.toString())
      .inc();
  }
}
```

### 3.2 User Experience Monitoring

#### Real User Monitoring (RUM)
```javascript
// Frontend performance tracking
export class UserExperienceTracker {
  static trackPageLoad() {
    if ('performance' in window) {
      window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];

        this.sendMetrics({
          pageLoadTime: perfData.loadEventEnd - perfData.fetchStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
          firstPaint: this.getFirstPaintTime(),
          firstContentfulPaint: this.getFirstContentfulPaintTime(),
          largestContentfulPaint: this.getLargestContentfulPaintTime()
        });
      });
    }
  }

  static trackUserInteractions() {
    // Track button clicks, form submissions, etc.
    document.addEventListener('click', (event) => {
      if (event.target.matches('button, a, input[type="submit"]')) {
        this.trackInteraction({
          element: event.target.tagName,
          id: event.target.id,
          className: event.target.className,
          timestamp: Date.now()
        });
      }
    });
  }

  static trackError(error, errorInfo) {
    // Track JavaScript errors
    this.sendError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }
}
```

---

## 4. Database Monitoring

### 4.1 PostgreSQL Performance Monitoring

#### Query Performance Tracking
-- Create query monitoring tables
CREATE TABLE query_performance_log (
  id SERIAL PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT,
  execution_time INTERVAL NOT NULL,
  rows_affected INTEGER,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query monitoring function
CREATE FUNCTION log_query_performance()
RETURNS TRIGGER AS $
BEGIN
  -- Only log queries that exceed performance threshold
  IF (clock_timestamp() - statement_timestamp()) <= interval '100 milliseconds' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO query_performance_log (
    query_hash, query_text, execution_time, rows_affected, user_id
  ) VALUES (
    encode(digest(TG_OP || ' ' || TG_TABLE_NAME, 'sha256'), 'hex'),
    TG_OP || ' on ' || TG_TABLE_NAME,
    clock_timestamp() - statement_timestamp(),
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN 1 ELSE 0 END,
    COALESCE(current_setting('app.user_id', true)::uuid, NULL)
  );

  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

#### Connection Pool Monitoring
```sql
-- Connection monitoring view
CREATE VIEW connection_pool_status AS
SELECT
  datname as database_name,
  usename as username,
  client_addr as client_ip,
  state,
  state_change as state_since,
  query_start,
  CASE
    WHEN state = 'active' THEN
      extract(epoch from (now() - query_start)) * 1000
    ELSE 0
  END as active_time_ms
FROM pg_stat_activity
WHERE state IS NOT NULL;
```

### 4.2 Database Health Checks

#### Comprehensive Health Monitoring
```javascript
// Database health monitoring service
export class DatabaseHealthMonitor {
  static async checkDatabaseHealth() {
    const healthChecks = await Promise.all([
      this.checkConnectionPool(),
      this.checkQueryPerformance(),
      this.checkReplicationStatus(),
      this.checkDiskSpace(),
      this.checkLockContention()
    ]);

    return {
      overall: healthChecks.every(check => check.status === 'healthy'),
      timestamp: new Date().toISOString(),
      checks: healthChecks
    };
  }

  static async checkConnectionPool() {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity
    `);

    const { total_connections, active_connections, idle_connections } = result.rows[0];

    return {
      name: 'Connection Pool',
      status: active_connections > 100 ? 'warning' : 'healthy',
      value: `${active_connections}/${total_connections}`,
      details: { active_connections, idle_connections }
    };
  }

  static async checkQueryPerformance() {
    const result = await db.execute(sql`
      SELECT
        ROUND(AVG(extract(epoch from execution_time) * 1000), 2) as avg_query_time,
        MAX(extract(epoch from execution_time) * 1000) as max_query_time,
        COUNT(*) as total_queries
      FROM query_performance_log
      WHERE timestamp > NOW() - INTERVAL '1 hour'
    `);

    const { avg_query_time, max_query_time } = result.rows[0];

    return {
      name: 'Query Performance',
      status: avg_query_time > 1000 ? 'warning' : 'healthy',
      value: `${avg_query_time}ms average`,
      details: { avg_query_time, max_query_time }
    };
  }
}
```

---

## 5. Log Management & Analysis

### 5.1 Centralized Logging Architecture

#### Application Logging Configuration
```javascript
// Comprehensive logging configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    // Sensitive data sanitization
    winston.format((info, opts) => {
      // Remove or mask sensitive information
      if (info.password) info.password = '[REDACTED]';
      if (info.token) info.token = '[REDACTED]';
      if (info.email) info.email = info.email.replace(/(.{2}).*(@.*)/, '$1***$2');
      if (info.creditCard) info.creditCard = '[REDACTED]';
      return info;
    })()
  ),
  defaultMeta: {
    service: 'polyharmony-calendar',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Error logs (separate file)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Combined application logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 20,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // Console logging for development
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});
```

### 5.2 Log Analysis & Alerting

#### Log Analysis Queries
```javascript
// Log analysis for error patterns
export class LogAnalyzer {
  static async analyzeErrorPatterns() {
    // Analyze error frequency by type
    const errorAnalysis = await db.execute(sql`
      SELECT
        error_type,
        COUNT(*) as error_count,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence,
        COUNT(DISTINCT user_id) as affected_users
      FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY error_type
      ORDER BY error_count DESC
    `);

    // Analyze error trends
    const errorTrends = await db.execute(sql`
      SELECT
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as error_count,
        COUNT(DISTINCT error_type) as unique_errors
      FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY hour
      ORDER BY hour DESC
    `);

    return { errorAnalysis, errorTrends };
  }

  static async identifyCriticalErrors() {
    // Find errors affecting many users
    const criticalErrors = await db.execute(sql`
      SELECT
        error_message,
        error_stack,
        COUNT(DISTINCT user_id) as affected_users,
        COUNT(*) as total_occurrences,
        MAX(timestamp) as last_occurrence
      FROM error_logs
      WHERE timestamp > NOW() - INTERVAL '1 hour'
        AND error_type = 'runtime_error'
      GROUP BY error_message, error_stack
      HAVING COUNT(DISTINCT user_id) >= 5
      ORDER BY affected_users DESC
    `);

    return criticalErrors.rows;
  }
}
```

---

## 6. Alerting & Notification System

### 6.1 Alert Configuration

#### Prometheus Alert Rules
```yaml
# Alert configuration for Prometheus
groups:
  - name: application_alerts
    rules:
      # High error rate alert
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          service: polyharmony-calendar
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | printf \"%.2f\" }}% over the last 5 minutes"

      # Slow response time alert
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
          service: polyharmony-calendar
        annotations:
          summary: "Slow response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      # Database connection pool exhaustion
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count > 90
        for: 5m
        labels:
          severity: critical
          service: database
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Current connections: {{ $value }}"

      # Memory usage alert
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.8
        for: 5m
        labels:
          severity: warning
          service: polyharmony-calendar
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value | printf \"%.2f\" }}% of limit"

      # Disk space alert
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 5m
        labels:
          severity: critical
          service: infrastructure
        annotations:
          summary: "Low disk space detected"
          description: "Available disk space is {{ $value | printf \"%.2f\" }}% of total"
```

### 6.2 Alert Escalation & Notification

#### Multi-Channel Alerting
```javascript
// Alert management system
export class AlertManager {
  static async sendAlert(alert) {
    const alertConfig = this.getAlertConfig(alert.type);

    // Send to multiple channels based on severity
    if (alert.severity === 'critical') {
      await Promise.all([
        this.sendSlackAlert(alert),
        this.sendEmailAlert(alert),
        this.sendSMSAlert(alert)
      ]);
    } else if (alert.severity === 'warning') {
      await Promise.all([
        this.sendSlackAlert(alert),
        this.sendEmailAlert(alert)
      ]);
    } else {
      await this.sendSlackAlert(alert);
    }

    // Log alert for audit trail
    await this.logAlert(alert);
  }

  static async sendSlackAlert(alert) {
    const payload = {
      channel: this.getSlackChannel(alert.type),
      username: 'PolyHarmony Alert Bot',
      icon_emoji: ':warning:',
      attachments: [{
        color: this.getAlertColor(alert.severity),
        title: alert.title,
        text: alert.description,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Service', value: alert.service, short: true },
          { title: 'Timestamp', value: alert.timestamp, short: true }
        ],
        footer: 'PolyHarmony Monitoring',
        ts: Date.now()
      }]
    };

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  static async sendEmailAlert(alert) {
    const emailData = {
      to: process.env.ALERT_EMAIL_RECIPIENTS,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: this.generateEmailTemplate(alert)
    };

    await emailService.send(emailData);
  }
}
```

---

## 7. Performance Optimization Monitoring

### 7.1 Application Performance Tracking

#### Performance Metrics Collection
```javascript
// Performance monitoring middleware
export class PerformanceMonitor {
  static trackPerformance(req, res, next) {
    const startTime = process.hrtime.bigint();

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(...args) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1e6; // Convert to milliseconds

      // Record performance metrics
      this.recordPerformanceMetrics({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: duration,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      originalEnd.apply(this, args);
    }.bind(res);

    next();
  }

  static async recordPerformanceMetrics(metrics) {
    // Store in database
    await db.execute(sql`
      INSERT INTO performance_metrics (
        method, path, status_code, duration, user_agent, timestamp
      ) VALUES (
        ${metrics.method}, ${metrics.path}, ${metrics.statusCode},
        ${metrics.duration}, ${metrics.userAgent}, ${metrics.timestamp}
      )
    `);

    // Update Prometheus metrics
    httpRequestDuration
      .labels(metrics.method, metrics.path, metrics.statusCode.toString())
      .observe(metrics.duration / 1000);

    // Log slow requests
    if (metrics.duration > 2000) {
      logger.warn('Slow request detected', {
        method: metrics.method,
        path: metrics.path,
        duration: metrics.duration,
        userAgent: metrics.userAgent
      });
    }
  }
}
```

### 7.2 Database Performance Optimization

#### Query Performance Monitoring
```sql
-- Slow query monitoring
CREATE TABLE slow_queries (
  id SERIAL PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT,
  execution_time INTERVAL NOT NULL,
  plan TEXT,
  user_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Query plan analysis function
CREATE FUNCTION analyze_query_performance()
RETURNS TRIGGER AS $$
DECLARE
  query_plan TEXT;
BEGIN
  -- Only log queries slower than 1 second
  IF (clock_timestamp() - statement_timestamp()) > interval '1 second' THEN
    -- Get query execution plan
    EXECUTE 'EXPLAIN (ANALYZE, BUFFERS) ' || TG_OP || ' FROM ' || TG_TABLE_NAME
    INTO query_plan;

    INSERT INTO slow_queries (
      query_hash, query_text, execution_time, plan, user_id
    ) VALUES (
      encode(digest(TG_OP || ' ' || TG_TABLE_NAME, 'sha256'), 'hex'),
      TG_OP || ' on ' || TG_TABLE_NAME,
      clock_timestamp() - statement_timestamp(),
      query_plan,
      auth.uid()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

---

## 8. Security Monitoring

### 8.1 Security Event Tracking

#### Intrusion Detection
```javascript
// Security event monitoring
export class SecurityMonitor {
  static async trackSecurityEvent(event) {
    const securityEvent = {
      type: event.type,
      severity: event.severity,
      description: event.description,
      source: event.source,
      userId: event.userId,
      ipAddress: event.ip,
      userAgent: event.userAgent,
      timestamp: new Date().toISOString(),
      metadata: event.metadata
    };

    // Store security event
    await db.execute(sql`
      INSERT INTO security_events (
        event_type, severity, description, source_ip, user_id, user_agent, timestamp, metadata
      ) VALUES (
        ${securityEvent.type}, ${securityEvent.severity}, ${securityEvent.description},
        ${securityEvent.ipAddress}, ${securityEvent.userId}, ${securityEvent.userAgent},
        ${securityEvent.timestamp}, ${JSON.stringify(securityEvent.metadata)}
      )
    `);

    // Alert on critical security events
    if (event.severity === 'critical') {
      await this.alertSecurityTeam(securityEvent);
    }

    // Log for audit trail
    logger.warn('Security event detected', securityEvent);
  }

  static async trackFailedLoginAttempt(email, ip, userAgent) {
    await this.trackSecurityEvent({
      type: 'failed_login',
      severity: 'medium',
      description: `Failed login attempt for ${email}`,
      source: ip,
      userAgent: userAgent,
      metadata: { email }
    });
  }

  static async trackSuspiciousActivity(activity, ip, userAgent) {
    await this.trackSecurityEvent({
      type: 'suspicious_activity',
      severity: 'high',
      description: activity.description,
      source: ip,
      userAgent: userAgent,
      metadata: activity.metadata
    });
  }
}
```

### 8.2 Compliance Monitoring

#### GDPR Compliance Tracking
```javascript
// GDPR compliance monitoring
export class ComplianceMonitor {
  static async trackDataAccess(dataType, userId, accessorId) {
    await db.execute(sql`
      INSERT INTO data_access_log (
        data_type, user_id, accessor_id, access_type, timestamp
      ) VALUES (
        ${dataType}, ${userId}, ${accessorId}, 'read', NOW()
      )
    `);
  }

  static async trackDataDeletion(userId, deletionReason) {
    await db.execute(sql`
      INSERT INTO data_deletion_log (
        user_id, deletion_reason, deleted_by, timestamp
      ) VALUES (
        ${userId}, ${deletionReason}, ${auth.uid()}, NOW()
      )
    `);
  }

  static async generateComplianceReport() {
    const report = {
      dataAccess: await this.getDataAccessSummary(),
      dataDeletion: await this.getDataDeletionSummary(),
      userConsent: await this.getUserConsentSummary(),
      securityIncidents: await this.getSecurityIncidentSummary()
    };

    return report;
  }
}
```

---

## 9. Dashboard & Visualization

### 9.1 Grafana Dashboard Configuration

#### Main Application Dashboard
```json
{
  "dashboard": {
    "title": "PolyHarmony Calendar - Application Overview",
    "tags": ["application", "monitoring"],
    "timezone": "UTC",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error rate"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "polyharmony_active_users",
            "legendFormat": "Active users"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "Active connections"
          }
        ]
      }
    ]
  }
}
```

### 9.2 Business Metrics Dashboard

#### User Engagement Metrics
```json
{
  "dashboard": {
    "title": "PolyHarmony Calendar - Business Metrics",
    "panels": [
      {
        "title": "Daily Active Users",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(daily_active_users)",
            "legendFormat": "Daily active users"
          }
        ]
      },
      {
        "title": "Calendar Events Created",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(polyharmony_events_created_total[24h])",
            "legendFormat": "Events per day"
          }
        ]
      },
      {
        "title": "User Retention",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(user_retention_7day[7d])",
            "legendFormat": "7-day retention"
          },
          {
            "expr": "rate(user_retention_30day[30d])",
            "legendFormat": "30-day retention"
          }
        ]
      }
    ]
  }
}
```

---

## 10. Implementation Roadmap

### **Week 1: Foundation**
- [ ] Set up Prometheus, Grafana, Loki stack
- [ ] Implement basic system and application metrics
- [ ] Configure alerting for critical issues
- [ ] Set up log aggregation

### **Week 2: Application Monitoring**
- [ ] Implement API performance tracking
- [ ] Add user experience monitoring
- [ ] Set up error tracking and alerting
- [ ] Create application performance dashboards

### **Week 3: Database & Infrastructure**
- [ ] Implement database performance monitoring
- [ ] Set up infrastructure monitoring
- [ ] Configure database health checks
- [ ] Create database performance dashboards

### **Week 4: Advanced Features**
- [ ] Implement security monitoring
- [ ] Set up business metrics tracking
- [ ] Configure compliance monitoring
- [ ] Create comprehensive alerting system

---

## 11. Success Metrics & KPIs

### **Monitoring Coverage**
- **System Metrics**: 100% coverage of critical system resources
- **Application Metrics**: 95% coverage of API endpoints and features
- **Database Metrics**: 90% coverage of database operations
- **Error Tracking**: 100% capture of application errors
- **Performance Tracking**: 95% coverage of user interactions

### **Alerting Effectiveness**
- **Mean Time to Detection (MTTD)**: <5 minutes for critical issues
- **Mean Time to Resolution (MTTR)**: <30 minutes for known issues
- **False Positive Rate**: <5% of total alerts
- **Alert Coverage**: 100% of critical system components

### **Performance Optimization**
- **Page Load Time**: <2 seconds for 95th percentile
- **API Response Time**: <500ms for 95th percentile
- **Database Query Time**: <100ms for 95th percentile
- **Error Rate**: <0.1% for production traffic

### **Business Impact**
- **User Experience**: 99%+ application availability
- **Incident Response**: 24/7 monitoring coverage
- **Data Protection**: Zero data loss incidents
- **Compliance**: 100% audit trail coverage

---

## 12. Conclusion & Recommendations

### **Recommended Implementation Priority**

#### **Immediate (Days 1-3)**
1. **Infrastructure Monitoring**: System metrics, container health
2. **Basic Application Monitoring**: API response times, error rates
3. **Essential Alerting**: Critical system alerts, error notifications
4. **Log Aggregation**: Centralized logging setup

#### **Short Term (Days 4-7)**
1. **Advanced Application Monitoring**: User experience, performance tracking
2. **Database Monitoring**: Query performance, connection pooling
3. **Security Monitoring**: Basic security event tracking
4. **Dashboard Creation**: Main monitoring dashboards

#### **Medium Term (Week 2)**
1. **Business Metrics**: User engagement, feature usage tracking
2. **Performance Optimization**: Detailed performance analysis
3. **Compliance Monitoring**: GDPR, SOC 2 compliance tracking
4. **Advanced Alerting**: Predictive alerting, anomaly detection

### **Expected Benefits**

#### **Operational Excellence**
- **Proactive Issue Detection**: Identify problems before users notice
- **Faster Resolution**: Comprehensive monitoring enables quick diagnosis
- **Reduced Downtime**: Early warning systems prevent outages
- **Performance Optimization**: Data-driven performance improvements

#### **Business Value**
- **User Experience**: Continuous monitoring ensures optimal performance
- **Data-Driven Decisions**: Comprehensive metrics inform business decisions
- **Compliance Assurance**: Automated compliance monitoring and reporting
- **Cost Optimization**: Resource monitoring prevents over-provisioning

#### **Technical Benefits**
- **Full Observability**: Complete visibility into system behavior
- **Automated Operations**: Alerting and automated responses
- **Historical Analysis**: Long-term trend analysis and capacity planning
- **Debugging Efficiency**: Comprehensive logs and metrics for faster debugging

---

*Architecture Status*: Complete - Ready for implementation
*Last Updated*: September 23, 2025
*Next Review*: December 23, 2025
*Monitoring Architect*: Infrastructure & Monitoring Team

**Note**: This monitoring architecture provides a comprehensive framework for the My_Approach developer's Phase 4 work (Days 24-25: Performance monitoring setup). The modular design allows for incremental implementation while ensuring enterprise-grade monitoring capabilities.
