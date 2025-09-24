import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Environment Diagnostic API Endpoint
 *
 * This endpoint provides comprehensive environment configuration diagnostics
 * to verify production deployment setup and identify configuration issues.
 */

interface DiagnosticResult {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface EnvironmentDiagnostics {
  timestamp: string;
  environment: string;
  nodeVersion: string;
  serverInfo: {
    url: string;
    headers: Record<string, string>;
  };
  environmentVariables: {
    required: Record<string, DiagnosticResult>;
    optional: Record<string, DiagnosticResult>;
    security: Record<string, DiagnosticResult>;
  };
  supabaseConnectivity: DiagnosticResult;
  securityCheck: DiagnosticResult;
  overallStatus: 'healthy' | 'warning' | 'error';
  recommendations: string[];
}

// Mask sensitive values for display
function maskValue(value: string, length: number = 4): string {
  if (!value) return 'NOT_SET';
  if (value.length <= length) return '*'.repeat(length);
  return value.substring(0, length) + '*'.repeat(value.length - length);
}

// Check if environment variable is properly set
function checkEnvVar(name: string, required: boolean = true): DiagnosticResult {
  const value = process.env[name] as string | undefined;

  if (!value || value.trim() === '') {
    return {
      status: 'error',
      message: required ? `Required environment variable '${name}' is not set` : `Optional environment variable '${name}' is not set`,
      details: { required, value: 'NOT_SET' }
    };
  }

  // Basic validation for specific variables
  if (name.includes('URL') && !value.startsWith('http')) {
    return {
      status: 'warning',
      message: `Environment variable '${name}' may be invalid (should start with http/https)`,
      details: { required, value: maskValue(value) }
    };
  }

  if (name.includes('KEY') && value.length < 20) {
    return {
      status: 'warning',
      message: `Environment variable '${name}' appears to be too short for a valid key`,
      details: { required, value: maskValue(value) }
    };
  }

  return {
    status: 'healthy',
    message: `Environment variable '${name}' is properly configured`,
    details: { required, value: maskValue(value) }
  };
}

// Test Supabase connectivity
async function testSupabaseConnectivity(): Promise<DiagnosticResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      status: 'error',
      message: 'Cannot test Supabase connectivity: Required environment variables missing',
      details: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey
      }
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Test basic connectivity with a simple query
    const startTime = Date.now();
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'error',
        message: `Supabase connectivity failed: ${error.message}`,
        details: {
          error: error.message,
          responseTime: `${responseTime}ms`
        }
      };
    }

    return {
      status: 'healthy',
      message: `Supabase connectivity successful (${responseTime}ms response time)`,
      details: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `Supabase connectivity test failed: ${error.message}`,
      details: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Security validation
function performSecurityCheck(): DiagnosticResult {
  const issues = [];
  const warnings = [];

  // Check for development mode in production
  if (process.env.NODE_ENV === 'development') {
    issues.push('NODE_ENV is set to development (should be production)');
  }

  // Check for debug flags
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
    issues.push('NEXT_PUBLIC_DEV_AUTH_BYPASS is enabled (security risk)');
  }

  if (process.env.ENABLE_DEBUG_LOGGING === 'true') {
    warnings.push('ENABLE_DEBUG_LOGGING is enabled (performance impact)');
  }

  // Check for weak encryption keys
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length < 64) {
    issues.push('ENCRYPTION_KEY appears to be too short');
  }

  if (encryptionKey && encryptionKey.includes('your-')) {
    issues.push('ENCRYPTION_KEY still contains placeholder text');
  }

  if (issues.length > 0) {
    return {
      status: 'error',
      message: `Security issues detected: ${issues.join(', ')}`,
      details: { issues, warnings }
    };
  }

  if (warnings.length > 0) {
    return {
      status: 'warning',
      message: `Security warnings: ${warnings.join(', ')}`,
      details: { issues: [], warnings }
    };
  }

  return {
    status: 'healthy',
    message: 'No security issues detected',
    details: { issues: [], warnings: [] }
  };
}

export async function GET(request: NextRequest) {
  try {
    // Gather environment diagnostics
    const diagnostics: EnvironmentDiagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      nodeVersion: process.version,
      serverInfo: {
        url: request.url,
        headers: {
          host: request.headers.get('host') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          origin: request.headers.get('origin') || 'unknown'
        }
      },
      environmentVariables: {
        required: {
          NODE_ENV: checkEnvVar('NODE_ENV'),
          NEXT_PUBLIC_SUPABASE_URL: checkEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
          NEXT_PUBLIC_SUPABASE_ANON_KEY: checkEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
          SUPABASE_SERVICE_ROLE_KEY: checkEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
          ENCRYPTION_KEY: checkEnvVar('ENCRYPTION_KEY'),
          KEY_DERIVATION_SECRET: checkEnvVar('KEY_DERIVATION_SECRET'),
          JWT_SECRET: checkEnvVar('JWT_SECRET'),
          NEXTAUTH_SECRET: checkEnvVar('NEXTAUTH_SECRET'),
          RESEND_API_KEY: checkEnvVar('RESEND_API_KEY'),
          INVITATION_FROM_EMAIL: checkEnvVar('INVITATION_FROM_EMAIL')
        },
        optional: {
          SENDGRID_API_KEY: checkEnvVar('SENDGRID_API_KEY', false),
          GOOGLE_CLIENT_ID: checkEnvVar('GOOGLE_CLIENT_ID', false),
          GOOGLE_CLIENT_SECRET: checkEnvVar('GOOGLE_CLIENT_SECRET', false),
          AWS_ACCESS_KEY_ID: checkEnvVar('AWS_ACCESS_KEY_ID', false),
          AWS_SECRET_ACCESS_KEY: checkEnvVar('AWS_SECRET_ACCESS_KEY', false),
          AWS_REGION: checkEnvVar('AWS_REGION', false),
          PORT: checkEnvVar('PORT', false),
          NEXT_PUBLIC_APP_URL: checkEnvVar('NEXT_PUBLIC_APP_URL', false),
          NEXTAUTH_URL: checkEnvVar('NEXTAUTH_URL', false),
          LOG_LEVEL: checkEnvVar('LOG_LEVEL', false)
        },
        security: {
          RATE_LIMIT_ENABLED: checkEnvVar('RATE_LIMIT_ENABLED', false),
          RATE_LIMIT_MAX_REQUESTS: checkEnvVar('RATE_LIMIT_MAX_REQUESTS', false),
          FEATURE_GOOGLE_CALENDAR: checkEnvVar('FEATURE_GOOGLE_CALENDAR', false),
          FEATURE_EMAIL_NOTIFICATIONS: checkEnvVar('FEATURE_EMAIL_NOTIFICATIONS', false),
          SKIP_EMAIL_VERIFICATION: checkEnvVar('SKIP_EMAIL_VERIFICATION', false),
          WEBHOOK_VERIFY_IN_DEV: checkEnvVar('WEBHOOK_VERIFY_IN_DEV', false)
        }
      },
      supabaseConnectivity: await testSupabaseConnectivity(),
      securityCheck: performSecurityCheck(),
      overallStatus: 'healthy',
      recommendations: []
    };

    // Determine overall status
    const allResults = [
      ...Object.values(diagnostics.environmentVariables.required),
      ...Object.values(diagnostics.environmentVariables.optional),
      diagnostics.supabaseConnectivity,
      diagnostics.securityCheck
    ];

    const hasErrors = allResults.some(r => r.status === 'error');
    const hasWarnings = allResults.some(r => r.status === 'warning');

    if (hasErrors) {
      diagnostics.overallStatus = 'error';
    } else if (hasWarnings) {
      diagnostics.overallStatus = 'warning';
    }

    // Generate recommendations
    if (diagnostics.overallStatus !== 'healthy') {
      if (hasErrors) {
        diagnostics.recommendations.push('Fix all ERROR status items before proceeding');
        diagnostics.recommendations.push('Ensure all required environment variables are properly set');
      }

      if (diagnostics.environmentVariables.required.NEXT_PUBLIC_SUPABASE_URL.status === 'error') {
        diagnostics.recommendations.push('Configure NEXT_PUBLIC_SUPABASE_URL with your Supabase project URL');
      }

      if (diagnostics.environmentVariables.required.NEXT_PUBLIC_SUPABASE_ANON_KEY.status === 'error') {
        diagnostics.recommendations.push('Configure NEXT_PUBLIC_SUPABASE_ANON_KEY with your Supabase anonymous key');
      }

      if (diagnostics.environmentVariables.required.SUPABASE_SERVICE_ROLE_KEY.status === 'error') {
        diagnostics.recommendations.push('Configure SUPABASE_SERVICE_ROLE_KEY with your Supabase service role key');
      }

      if (diagnostics.supabaseConnectivity.status === 'error') {
        diagnostics.recommendations.push('Verify Supabase credentials and network connectivity');
        diagnostics.recommendations.push('Check if your Supabase project is active and accessible');
      }

      if (diagnostics.securityCheck.status === 'error') {
        diagnostics.recommendations.push('Address all security issues before deploying to production');
      }

      diagnostics.recommendations.push('Review the complete diagnostic output for detailed configuration guidance');
    }

    // Return appropriate HTTP status code
    const statusCode = diagnostics.overallStatus === 'error' ? 500 :
                      diagnostics.overallStatus === 'warning' ? 200 : 200;

    return NextResponse.json(diagnostics, {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('Environment diagnostic error:', error);

    return NextResponse.json({
      status: 'error',
      message: 'Failed to generate environment diagnostics',
      error: error.message,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
  });
}
