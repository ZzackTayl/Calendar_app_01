/**
 * Health API Tests
 * 
 * Comprehensive testing for the health monitoring endpoint including:
 * - Database connectivity checks
 * - Authentication system health
 * - Performance monitoring
 * - Integration status validation
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('/api/health', () => {
  let mockSupabaseClient: any;
  let mockCreateClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const supabaseModule = await import('@supabase/supabase-js');
    mockCreateClient = supabaseModule.createClient;

    mockSupabaseClient = {
      from: vi.fn(() => mockSupabaseClient),
      select: vi.fn(() => mockSupabaseClient),
      limit: vi.fn(() => mockSupabaseClient),
      auth: {
        getSession: vi.fn(),
      },
    };

    mockCreateClient.mockReturnValue(mockSupabaseClient);

    // Set required environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Overall Health Check', () => {
    it('should return healthy status when all components are healthy', async () => {
      // Mock successful database check
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      
      // Mock successful auth check
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
      expect(body.uptime).toBeDefined();
      expect(body.responseTime).toBeDefined();
      expect(body.checks).toHaveLength(3); // database, auth, performance
      expect(body.version).toBeDefined();
      expect(body.environment).toBeDefined();
    });

    it('should return degraded status when some components are degraded', async () => {
      // Mock slow database response (degraded)
      mockSupabaseClient.limit.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ data: [{ id: 'test' }], error: null });
          }, 1500); // Simulate slow response
        });
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      
      // Fast forward time to simulate slow database response
      const responsePromise = GET(request);
      vi.advanceTimersByTime(1500);
      const response = await responsePromise;
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.status).toBe('degraded');
      expect(body.checks.some(check => check.status === 'degraded')).toBe(true);
    });

    it('should return unhealthy status when critical components fail', async () => {
      // Mock database failure
      mockSupabaseClient.limit.mockResolvedValue({ 
        data: null, 
        error: { message: 'Connection failed' } 
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.status).toBe('unhealthy');
      expect(body.checks.some(check => check.status === 'unhealthy')).toBe(true);
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock an unexpected error during health checks
      mockCreateClient.mockImplementation(() => {
        throw new Error('Unexpected configuration error');
      });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.status).toBe('unhealthy');
      expect(body.error).toContain('Unexpected configuration error');
      expect(body.timestamp).toBeDefined();
      expect(body.responseTime).toBeDefined();
    });
  });

  describe('Database Health Check', () => {
    it('should report healthy database when query succeeds quickly', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const dbCheck = body.checks.find(check => check.component === 'database');
      expect(dbCheck).toBeDefined();
      expect(dbCheck.status).toBe('healthy');
      expect(dbCheck.responseTime).toBeLessThan(1000);
      expect(dbCheck.details).toContain('executed');
    });

    it('should report degraded database when query is slow', async () => {
      mockSupabaseClient.limit.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ data: [{ id: 'test' }], error: null });
          }, 1200); // Slow response
        });
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const responsePromise = GET(request);
      vi.advanceTimersByTime(1200);
      const response = await responsePromise;
      const body = await response.json();

      const dbCheck = body.checks.find(check => check.component === 'database');
      expect(dbCheck.status).toBe('degraded');
      expect(dbCheck.responseTime).toBeGreaterThan(1000);
    });

    it('should report unhealthy database when query fails', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const dbCheck = body.checks.find(check => check.component === 'database');
      expect(dbCheck.status).toBe('unhealthy');
      expect(dbCheck.details).toContain('Database connection failed');
    });

    it('should report unhealthy database when configuration is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const dbCheck = body.checks.find(check => check.component === 'database');
      expect(dbCheck.status).toBe('unhealthy');
      expect(dbCheck.details).toContain('configuration missing');
    });
  });

  describe('Authentication Health Check', () => {
    it('should report healthy auth when service responds quickly', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const authCheck = body.checks.find(check => check.component === 'authentication');
      expect(authCheck).toBeDefined();
      expect(authCheck.status).toBe('healthy');
      expect(authCheck.responseTime).toBeLessThan(500);
      expect(authCheck.details).toContain('responded');
    });

    it('should report degraded auth when service is slow', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ data: null, error: null });
          }, 600); // Slow auth response
        });
      });

      const request = new NextRequest('http://localhost/api/health');
      const responsePromise = GET(request);
      vi.advanceTimersByTime(600);
      const response = await responsePromise;
      const body = await response.json();

      const authCheck = body.checks.find(check => check.component === 'authentication');
      expect(authCheck.status).toBe('degraded');
      expect(authCheck.responseTime).toBeGreaterThan(500);
    });

    it('should report unhealthy auth when configuration is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const authCheck = body.checks.find(check => check.component === 'authentication');
      expect(authCheck.status).toBe('unhealthy');
      expect(authCheck.details).toContain('configuration missing');
    });
  });

  describe('Performance Health Check', () => {
    it('should report healthy performance with normal memory usage', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      // Mock memory usage - healthy levels
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const performanceCheck = body.checks.find(check => check.component === 'performance');
      expect(performanceCheck).toBeDefined();
      expect(performanceCheck.status).toBe('healthy');
      expect(performanceCheck.details).toContain('Memory:');
      expect(performanceCheck.details).toContain('50.0%');
    });

    it('should report degraded performance with high memory usage', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      // Mock high memory usage - degraded levels
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 85 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 85 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const performanceCheck = body.checks.find(check => check.component === 'performance');
      expect(performanceCheck.status).toBe('degraded');
      expect(performanceCheck.details).toContain('High memory usage');
      expect(performanceCheck.details).toContain('85.0%');
    });

    it('should report unhealthy performance with critical memory usage', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      // Mock critical memory usage - unhealthy levels
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 95 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 95 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024
      });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const performanceCheck = body.checks.find(check => check.component === 'performance');
      expect(performanceCheck.status).toBe('unhealthy');
      expect(performanceCheck.details).toContain('Critical memory usage');
      expect(performanceCheck.details).toContain('95.0%');
    });
  });

  describe('Integration Health Check', () => {
    it('should skip integration check when no integrations are configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const integrationCheck = body.checks.find(check => check.component === 'integrations');
      expect(integrationCheck).toBeUndefined();
      expect(body.checks).toHaveLength(3); // Only database, auth, and performance
    });

    it('should report healthy integrations when configured', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      const integrationCheck = body.checks.find(check => check.component === 'integrations');
      expect(integrationCheck).toBeDefined();
      expect(integrationCheck.status).toBe('healthy');
      expect(integrationCheck.details).toContain('configurations verified');
      expect(body.checks).toHaveLength(4); // All components including integrations
    });
  });

  describe('Response Format Validation', () => {
    it('should include all required fields in healthy response', async () => {
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      // Verify required fields
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('responseTime');
      expect(body).toHaveProperty('checks');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('environment');

      // Verify timestamp format
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);

      // Verify checks structure
      expect(Array.isArray(body.checks)).toBe(true);
      body.checks.forEach(check => {
        expect(check).toHaveProperty('component');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('responseTime');
        expect(typeof check.responseTime).toBe('number');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(check.status);
      });
    });

    it('should include error field in unhealthy response', async () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const request = new NextRequest('http://localhost/api/health');
      const response = await GET(request);
      const body = await response.json();

      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Configuration error');
      expect(body.status).toBe('unhealthy');
    });

    it('should use appropriate HTTP status codes', async () => {
      // Test healthy response
      mockSupabaseClient.limit.mockResolvedValue({ data: [{ id: 'test' }], error: null });
      mockSupabaseClient.auth.getSession.mockResolvedValue({ data: null, error: null });

      let request = new NextRequest('http://localhost/api/health');
      let response = await GET(request);
      expect(response.status).toBe(200);

      // Test unhealthy response
      mockSupabaseClient.limit.mockResolvedValue({ 
        data: null, 
        error: { message: 'DB error' } 
      });

      request = new NextRequest('http://localhost/api/health');
      response = await GET(request);
      expect(response.status).toBe(503);
    });
  });
});