import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvironmentConfig } from '@/lib/config/env-validation';

/**
 * Enterprise-grade health check endpoint
 * Validates all critical system dependencies and performance metrics
 */

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    authentication: HealthCheck;
    email: HealthCheck;
    performance: HealthCheck;
    security: HealthCheck;
  };
  performance: {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: number;
  };
}

interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: any;
}

let startTime = Date.now();

export async function GET() {
  const healthCheckStart = Date.now();
  
  try {
    const config = getEnvironmentConfig();
    
    // Initialize health check results
    const checks: HealthCheckResult['checks'] = {
      database: await checkDatabase(config),
      authentication: await checkAuthentication(config),
      email: await checkEmailProvider(config),
      performance: await checkPerformanceMetrics(),
      security: await checkSecurityConfiguration(config)
    };

    // Determine overall system status
    const overallStatus = determineOverallStatus(checks);
    
    const responseTime = Date.now() - healthCheckStart;
    
    const healthResult: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'polyharmony-calendar',
      version: process.env.npm_package_version || '1.0.0-alpha.1',
      environment: config.env,
      uptime: Date.now() - startTime,
      checks,
      performance: {
        responseTime,
        memoryUsage: process.memoryUsage(),
      }
    };

    // Return appropriate status code based on health
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 500;

    return NextResponse.json(healthResult, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'polyharmony-calendar',
      error: error instanceof Error ? error.message : 'Health check system failure',
      performance: {
        responseTime: Date.now() - healthCheckStart,
        memoryUsage: process.memoryUsage(),
      }
    }, { status: 500 });
  }
}

async function checkDatabase(config: any): Promise<HealthCheck> {
  const dbCheckStart = Date.now();
  
  try {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      return {
        status: 'fail',
        message: 'Database configuration incomplete',
        responseTime: Date.now() - dbCheckStart
      };
    }

    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    // Test basic connectivity
    const result = await Promise.race([
      supabase.from('profiles').select('count', { count: 'exact', head: true }),
      new Promise<{ error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      )
    ]) as { error: Error | null };
    
    const { error } = result;

    const responseTime = Date.now() - dbCheckStart;

    if (error) {
      return {
        status: responseTime > 2000 ? 'warn' : 'fail',
        message: `Database check failed: ${error.message}`,
        responseTime
      };
    }

    return {
      status: responseTime > 1000 ? 'warn' : 'pass',
      message: 'Database connection successful',
      responseTime,
      details: {
        connectionTime: responseTime,
        performanceStatus: responseTime > 1000 ? 'slow' : 'good'
      }
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: `Database connectivity failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - dbCheckStart
    };
  }
}

async function checkAuthentication(config: any): Promise<HealthCheck> {
  const authCheckStart = Date.now();
  
  try {
    if (!config.supabase.url || !config.supabase.anonKey) {
      return {
        status: 'fail',
        message: 'Authentication configuration incomplete',
        responseTime: Date.now() - authCheckStart
      };
    }

    // Test anonymous auth client creation
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    
    // Verify auth service is responding
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      )
    ]) as { error: Error | null };
    
    const { error } = result;

    const responseTime = Date.now() - authCheckStart;

    if (error) {
      return {
        status: 'warn',
        message: `Auth service check warning: ${error.message}`,
        responseTime
      };
    }

    return {
      status: 'pass',
      message: 'Authentication service operational',
      responseTime
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: `Authentication check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - authCheckStart
    };
  }
}

async function checkEmailProvider(config: any): Promise<HealthCheck> {
  const emailCheckStart = Date.now();
  
  try {
    const provider = config.email.provider;
    
    if (provider === 'console') {
      return {
        status: 'warn',
        message: 'Email provider not configured - using console logging',
        responseTime: Date.now() - emailCheckStart,
        details: { provider: 'console' }
      };
    }

    // Basic configuration check for each provider
    const providerChecks: Record<string, () => boolean> = {
      resend: () => !!config.email.resend.apiKey,
      sendgrid: () => !!config.email.sendgrid.apiKey,
      aws_ses: () => !!(config.email.awsSes.accessKeyId && config.email.awsSes.secretAccessKey),
      smtp: () => !!(config.email.smtp.host && config.email.smtp.user)
    };

    const isConfigured = providerChecks[provider]?.() || false;
    
    if (!isConfigured) {
      return {
        status: 'fail',
        message: `Email provider ${provider} is not properly configured`,
        responseTime: Date.now() - emailCheckStart,
        details: { provider }
      };
    }

    return {
      status: 'pass',
      message: `Email provider ${provider} configured`,
      responseTime: Date.now() - emailCheckStart,
      details: { 
        provider,
        senderEmail: config.email.sender.email,
        senderName: config.email.sender.name
      }
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: `Email provider check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - emailCheckStart
    };
  }
}

async function checkPerformanceMetrics(): Promise<HealthCheck> {
  const perfCheckStart = Date.now();
  
  try {
    const memUsage = process.memoryUsage();
    const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
    const memoryLimit = 512; // MB - adjust based on deployment
    
    // Check memory usage
    const memoryStatus: 'pass' | 'warn' | 'fail' = 
      memoryUsageMB > memoryLimit ? 'fail' :
      memoryUsageMB > memoryLimit * 0.9 ? 'warn' : 'pass';
    
    // Check event loop lag (simplified)
    const eventLoopStart = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopLag = Date.now() - eventLoopStart;
    
    const lagStatus: 'pass' | 'warn' | 'fail' = 
      eventLoopLag > 200 ? 'fail' :
      eventLoopLag > 100 ? 'warn' : 'pass';
    
    const overallStatus = memoryStatus === 'fail' || lagStatus === 'fail' ? 'fail' :
                         memoryStatus === 'warn' || lagStatus === 'warn' ? 'warn' : 'pass';

    return {
      status: overallStatus,
      message: 'Performance metrics collected',
      responseTime: Date.now() - perfCheckStart,
      details: {
        memoryUsageMB: Math.round(memoryUsageMB),
        memoryLimit,
        eventLoopLag,
        uptime: process.uptime()
      }
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - perfCheckStart
    };
  }
}

async function checkSecurityConfiguration(config: any): Promise<HealthCheck> {
  const secCheckStart = Date.now();
  
  try {
    const checks = {
      encryptionKey: !!config.security.encryptionKey,
      httpsOnly: config.isProduction ? true : 'not-required-in-dev',
      nextAuthSecret: config.isProduction ? !!config.security.nextAuthSecret : 'not-required-in-dev',
      environment: ['production', 'staging', 'development', 'test'].includes(config.env)
    };

    const failures = Object.entries(checks)
      .filter(([key, value]) => value === false)
      .map(([key]) => key);

    if (failures.length > 0) {
      return {
        status: 'fail',
        message: `Security configuration failures: ${failures.join(', ')}`,
        responseTime: Date.now() - secCheckStart,
        details: checks
      };
    }

    const warnings = Object.entries(checks)
      .filter(([key, value]) => typeof value === 'string' && value.includes('not-required'))
      .map(([key]) => key);

    return {
      status: warnings.length > 0 ? 'warn' : 'pass',
      message: warnings.length > 0 
        ? `Security configuration warnings: ${warnings.join(', ')}`
        : 'Security configuration valid',
      responseTime: Date.now() - secCheckStart,
      details: {
        ...checks,
        environment: config.env,
        isSecure: config.isSecure
      }
    };
    
  } catch (error) {
    return {
      status: 'fail',
      message: `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - secCheckStart
    };
  }
}

function determineOverallStatus(checks: HealthCheckResult['checks']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.includes('fail')) {
    // Any critical failure makes system unhealthy
    const criticalFailures = ['database', 'authentication'].some(critical => 
      checks[critical as keyof typeof checks].status === 'fail'
    );
    
    return criticalFailures ? 'unhealthy' : 'degraded';
  }
  
  if (statuses.includes('warn')) {
    return 'degraded';
  }
  
  return 'healthy';
}