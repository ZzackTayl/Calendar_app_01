import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import ProductionMonitoringService from '@/lib/monitoring/production-monitoring';
import type { MonitoringMetrics } from '@/lib/monitoring/production-monitoring';

const getConfigMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/config/env-validation', () => ({
  getEnvironmentConfig: getConfigMock,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const defaultConfig = {
  env: 'test',
  isProduction: false,
  supabase: {
    url: 'https://example.supabase.co',
    serviceRoleKey: 'service-role-key',
    anonKey: 'anon-key',
  },
};

let memorySpy: ReturnType<typeof vi.spyOn> | undefined;

function stubHealthySupabaseClient() {
  const fromMock = vi.fn(() => ({
    select: vi.fn(() => Promise.resolve({ error: null })),
  }));
  const authMock = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  };
  return { from: fromMock, auth: authMock } as any;
}

describe('Production Monitoring Tests', () => {
  beforeAll(() => {
    console.log('📊 Starting Production Monitoring Tests - CRITICAL FOR PRODUCTION');
  });

  afterAll(() => {
    console.log('📊 Production Monitoring Tests completed');
  });

  beforeEach(() => {
    getConfigMock.mockReturnValue(defaultConfig);
    createClientMock.mockReturnValue(stubHealthySupabaseClient());
    memorySpy = vi.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 256 * 1024 * 1024,
      heapTotal: 192 * 1024 * 1024,
      heapUsed: 150 * 1024 * 1024,
      external: 12 * 1024 * 1024,
      arrayBuffers: 8 * 1024 * 1024,
    } as any);
  });

  afterEach(() => {
    memorySpy?.mockRestore();
    memorySpy = undefined;
    vi.clearAllMocks();
  });

  describe('Health Check Endpoints', () => {
    it('should record health metrics within the one-second budget', async () => {
      const monitor = new ProductionMonitoringService();
      await (monitor as any).collectMetrics();
      const metrics = (monitor as any).metrics as MonitoringMetrics[];

      expect(metrics).toHaveLength(1);
      expect(metrics[0].performance.responseTime).toBeLessThan(1000);
      expect(metrics[0].database.connectionHealth).toBe('healthy');
      expect(metrics[0].performance.memoryUsage.heapUsed).toBeGreaterThan(0);
    });

    it('should downgrade database health when Supabase connectivity fails', async () => {
      createClientMock.mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ error: new Error('connection refused') })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any));

      const monitor = new ProductionMonitoringService();
      await (monitor as any).collectMetrics();
      const metrics = (monitor as any).metrics as MonitoringMetrics[];

      expect(metrics[0].database.connectionHealth).toBe('failed');
      expect(metrics[0].database.queryPerformance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Critical System Alerting', () => {
    it('should alert when database connectivity is lost', async () => {
      createClientMock.mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ error: new Error('db down') })),
        })),
        auth: {
          getSession: vi.fn().mockResolvedValue({ error: null }),
        },
      } as any));

      const monitor = new ProductionMonitoringService();
      await (monitor as any).collectMetrics();
      await (monitor as any).evaluateAlertRules();

      const alerts = (monitor as any).alerts as any[];
      expect(alerts.some(alert => alert.ruleId === 'database-connection-failed')).toBe(true);
    });

    it('should raise alerts when error rates spike', async () => {
      const monitor = new ProductionMonitoringService();
      for (let i = 0; i < 12; i += 1) {
        monitor.trackRequest('/api/events', 120);
      }
      monitor.logError('api', new Error('boom'));
      monitor.logError('api', new Error('boom again'));

      await (monitor as any).collectMetrics();
      await (monitor as any).evaluateAlertRules();

      const alerts = (monitor as any).alerts as any[];
      expect(alerts.some(alert => alert.ruleId === 'high-error-rate')).toBe(true);
    });

    it('should escalate privacy violations as critical alerts', async () => {
      const monitor = new ProductionMonitoringService();
      monitor.logError('privacy-breach', new Error('Sensitive data exposed'), 'critical');
      await (monitor as any).collectMetrics();
      await (monitor as any).evaluateAlertRules();

      const alerts = (monitor as any).alerts as any[];
      expect(alerts.some(alert => alert.ruleId === 'critical-errors-detected')).toBe(true);
    });
  });

  describe('Performance Degradation Detection', () => {
    it('should flag event loop lag and memory pressure', async () => {
      const monitor = new ProductionMonitoringService();
      const syntheticMetric: MonitoringMetrics = {
        timestamp: new Date().toISOString(),
        performance: {
          responseTime: 150,
          memoryUsage: {
            rss: 600 * 1024 * 1024,
            heapTotal: 512 * 1024 * 1024,
            heapUsed: 520 * 1024 * 1024,
            external: 16 * 1024 * 1024,
            arrayBuffers: 8 * 1024 * 1024,
          } as any,
          eventLoopLag: 180,
          activeConnections: 42,
        },
        database: {
          connectionHealth: 'healthy',
          queryPerformance: 120,
        },
        authentication: {
          successRate: 0.97,
          failureRate: 0.03,
          activeUsers: 1200,
        },
        errors: {
          errorRate: 0.01,
          criticalErrors: 0,
          recentErrors: [],
        },
      };

      (monitor as any).metrics.push(syntheticMetric);
      await (monitor as any).evaluateAlertRules();

      const alerts = (monitor as any).alerts as any[];
      expect(alerts.some(alert => alert.ruleId === 'event-loop-lag')).toBe(true);
      expect(alerts.some(alert => alert.ruleId === 'high-memory-usage')).toBe(true);
    });
  });

  describe('Automated Recovery Procedures', () => {
    it('should clear stale caches and expired alerts during cleanup', async () => {
      const monitor = new ProductionMonitoringService();
      (monitor as any).requestCounts.set('/api/events', 18);
      (monitor as any).responseTimes.set('/api/events', [100, 220, 140]);
      (monitor as any).alerts.push({
        id: 'old-alert',
        ruleId: 'database-connection-failed',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        severity: 'critical',
        message: 'Old alert',
        metrics: {},
        acknowledged: false,
      });
      (monitor as any).lastResetTime = Date.now() - (2 * 60 * 60 * 1000);

      await (monitor as any).cleanupOldData();

      expect((monitor as any).requestCounts.size).toBe(0);
      expect((monitor as any).responseTimes.size).toBe(0);
      const alerts = (monitor as any).alerts as any[];
      expect(alerts.some(alert => alert.id === 'old-alert')).toBe(false);
    });
  });

  describe('Monitoring Data Collection', () => {
    it('should aggregate request metrics for dashboards', async () => {
      const monitor = new ProductionMonitoringService();
      monitor.trackRequest('/api/invitations', 100);
      monitor.trackRequest('/api/invitations', 200);
      monitor.trackRequest('/api/health', 50);
      await (monitor as any).collectMetrics();

      const dashboard = monitor.getDashboardData();
      const invitationMetric = dashboard.requestMetrics.find(metric => metric.endpoint === '/api/invitations');
      expect(invitationMetric?.count).toBe(2);
      expect(invitationMetric?.averageResponseTime).toBe(150);
      expect(dashboard.metrics.length).toBeGreaterThan(0);
    });
  });

  describe('Alert Configuration and Testing', () => {
    it('should allow acknowledging and resolving alerts while respecting cooldowns', async () => {
      const monitor = new ProductionMonitoringService();
      const syntheticMetric: MonitoringMetrics = {
        timestamp: new Date().toISOString(),
        performance: {
          responseTime: 120,
          memoryUsage: {
            rss: 200 * 1024 * 1024,
            heapTotal: 180 * 1024 * 1024,
            heapUsed: 170 * 1024 * 1024,
            external: 8 * 1024 * 1024,
            arrayBuffers: 4 * 1024 * 1024,
          } as any,
          eventLoopLag: 20,
          activeConnections: 30,
        },
        database: {
          connectionHealth: 'healthy',
          queryPerformance: 140,
        },
        authentication: {
          successRate: 0.85,
          failureRate: 0.2,
          activeUsers: 400,
        },
        errors: {
          errorRate: 0.02,
          criticalErrors: 1,
          recentErrors: [
            {
              timestamp: new Date().toISOString(),
              level: 'critical',
              message: 'Critical privacy alert',
            },
          ],
        },
      };

      (monitor as any).metrics.push(syntheticMetric);
      await (monitor as any).evaluateAlertRules();

      const alerts = (monitor as any).alerts as any[];
      const criticalAlert = alerts.find(alert => alert.ruleId === 'critical-errors-detected');

      expect(criticalAlert).toBeDefined();
      expect(monitor.acknowledgeAlert(criticalAlert.id)).toBe(true);
      expect(criticalAlert.acknowledged).toBe(true);
      expect(monitor.resolveAlert(criticalAlert.id)).toBe(true);
      expect(criticalAlert.resolvedAt).toBeDefined();

      const alertCountBefore = alerts.length;
      await (monitor as any).evaluateAlertRules();
      expect(alerts.length).toBe(alertCountBefore);
    });
  });

  describe('Dashboard and Reporting', () => {
    it('should expose consolidated monitoring status', async () => {
      const monitor = new ProductionMonitoringService();
      monitor.logError('api', new Error('rate limit exceeded'));
      await (monitor as any).collectMetrics();

      const status = monitor.getStatus();
      expect(status.isMonitoring).toBe(false);
      expect(status.metricsCount).toBe(1);
      expect(status.errorsCount).toBe(1);
      expect(status.latestMetrics?.timestamp).toBeDefined();
    });
  });
});
