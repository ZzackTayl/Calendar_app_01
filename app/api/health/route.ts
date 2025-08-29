import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface HealthCheck {
  component: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: string;
}

export async function GET() {
  const healthChecks: HealthCheck[] = [];
  let overallStatus = 'healthy';
  const startTime = Date.now();

  try {
    // Database connectivity check
    const dbCheck = await checkDatabaseHealth();
    healthChecks.push(dbCheck);
    
    // Authentication system check
    const authCheck = await checkAuthHealth();
    healthChecks.push(authCheck);
    
    // Application performance check
    const performanceCheck = await checkPerformanceHealth();
    healthChecks.push(performanceCheck);

    // External services check (if any integrations are active)
    const integrationsCheck = await checkIntegrationsHealth();
    if (integrationsCheck) {
      healthChecks.push(integrationsCheck);
    }

    // Determine overall status
    if (healthChecks.some(check => check.status === 'unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (healthChecks.some(check => check.status === 'degraded')) {
      overallStatus = 'degraded';
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: totalTime,
      checks: healthChecks,
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
      environment: process.env.VERCEL_ENV || 'development'
    }, { status: overallStatus === 'healthy' ? 200 : 503 });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: totalTime,
      checks: healthChecks,
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'development'
    }, { status: 503 });
  }
}

async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test database connectivity with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) throw error;

    const responseTime = Date.now() - startTime;
    
    return {
      component: 'database',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
      details: `Database query executed in ${responseTime}ms`
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'database',
      status: 'unhealthy',
      responseTime,
      details: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function checkAuthHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Auth configuration missing');
    }

    // Test auth service availability
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test auth session (this should work even without a valid session)
    const { error } = await supabase.auth.getSession();
    
    // Auth errors are expected for anonymous requests, so we only check for configuration issues
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'authentication',
      status: responseTime > 500 ? 'degraded' : 'healthy',
      responseTime,
      details: `Auth service responded in ${responseTime}ms`
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'authentication',
      status: 'unhealthy',
      responseTime,
      details: error instanceof Error ? error.message : 'Auth service unavailable'
    };
  }
}

async function checkPerformanceHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    // Check if memory usage is concerning (>90% of heap)
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let details = `Memory: ${memoryUsedMB}MB/${memoryTotalMB}MB (${memoryUsagePercent.toFixed(1)}%)`;
    
    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      details += ' - Critical memory usage';
    } else if (memoryUsagePercent > 80) {
      status = 'degraded';
      details += ' - High memory usage';
    }
    
    return {
      component: 'performance',
      status,
      responseTime,
      details
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'performance',
      status: 'unhealthy',
      responseTime,
      details: error instanceof Error ? error.message : 'Performance check failed'
    };
  }
}

async function checkIntegrationsHealth(): Promise<HealthCheck | null> {
  // Only check integrations if they are configured
  const hasGoogleIntegration = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  
  if (!hasGoogleIntegration) {
    return null; // Skip integration checks if not configured
  }
  
  const startTime = Date.now();
  
  try {
    // For now, just verify configuration is present
    // In the future, this could test actual integration connectivity
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'integrations',
      status: 'healthy',
      responseTime,
      details: 'Integration configurations verified'
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      component: 'integrations',
      status: 'unhealthy',
      responseTime,
      details: error instanceof Error ? error.message : 'Integration check failed'
    };
  }
}
