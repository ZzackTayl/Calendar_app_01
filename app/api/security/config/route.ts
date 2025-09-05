import { NextRequest, NextResponse } from 'next/server';
import { 
  getProductionSecurityConfig, 
  validateProductionConfig,
  isDemoModeAllowed,
  initializeProductionSecurity
} from '@/lib/security/production-config';
import { incidentResponse } from '@/lib/security/incident-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'config';

    switch (action) {
      case 'config':
        const config = getProductionSecurityConfig();
        return NextResponse.json({ 
          success: true, 
          data: {
            ...config,
            // Don't expose sensitive configuration details
            authentication: {
              ...config.authentication,
              // Hide specific values, just show if they're configured
              sessionTimeout: config.authentication.sessionTimeout > 0,
              maxLoginAttempts: config.authentication.maxLoginAttempts > 0
            }
          }
        });

      case 'validation':
        const validation = validateProductionConfig();
        return NextResponse.json({ success: true, data: validation });

      case 'demo-mode-status':
        const demoAllowed = isDemoModeAllowed();
        return NextResponse.json({ 
          success: true, 
          data: { 
            allowed: demoAllowed,
            environment: process.env.NODE_ENV 
          }
        });

      case 'incidents':
        const incidents = incidentResponse.getIncidents(50);
        return NextResponse.json({ success: true, data: incidents });

      case 'open-incidents':
        const openIncidents = incidentResponse.getOpenIncidents();
        return NextResponse.json({ success: true, data: openIncidents });

      case 'health':
        const healthCheck = await performSecurityHealthCheck();
        return NextResponse.json({ success: true, data: healthCheck });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SECURITY-CONFIG-API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'initialize':
        initializeProductionSecurity();
        return NextResponse.json({ success: true });

      case 'create-incident':
        const incident = incidentResponse.createManualIncident(
          data.type,
          data.severity,
          data.title,
          data.description,
          data.affectedUsers,
          data.relatedEvents
        );
        return NextResponse.json({ success: true, data: incident });

      case 'update-incident':
        const updated = incidentResponse.updateIncidentStatus(data.incidentId, data.status);
        return NextResponse.json({ success: updated });

      case 'validate-environment':
        const envValidation = validateProductionEnvironment();
        return NextResponse.json({ success: true, data: envValidation });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SECURITY-CONFIG-API] Error in POST:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Perform comprehensive security health check
 */
async function performSecurityHealthCheck() {
  const config = getProductionSecurityConfig();
  const validation = validateProductionConfig();
  const openIncidents = incidentResponse.getOpenIncidents();
  
  const healthStatus = {
    overall: 'healthy' as 'healthy' | 'warning' | 'critical',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      configuration: {
        status: validation.isValid ? 'pass' : 'fail',
        errors: validation.errors,
        warnings: validation.warnings
      },
      demoMode: {
        status: config.demoMode.allowInProduction ? 'warning' : 'pass',
        message: config.demoMode.allowInProduction 
          ? 'Demo mode is allowed in production' 
          : 'Demo mode properly restricted'
      },
      incidents: {
        status: openIncidents.length === 0 ? 'pass' : 'warning',
        openIncidents: openIncidents.length,
        criticalIncidents: openIncidents.filter(i => i.severity === 'critical').length
      },
      monitoring: {
        status: config.monitoring.enableRealTimeAlerts ? 'pass' : 'warning',
        realTimeAlerts: config.monitoring.enableRealTimeAlerts,
        auditTrail: config.monitoring.enableAuditTrail
      },
      authentication: {
        status: 'pass',
        emailVerificationRequired: config.authentication.requireEmailVerification,
        strongPasswordsEnforced: config.authentication.enforceStrongPasswords,
        sessionTimeout: config.authentication.sessionTimeout
      },
      headers: {
        status: 'pass',
        httpsRequired: config.environment.requireHttps,
        strictTransportSecurity: config.environment.strictTransportSecurity
      }
    }
  };

  // Determine overall health status
  const hasErrors = validation.errors.length > 0;
  const hasCriticalIncidents = openIncidents.some(i => i.severity === 'critical');
  const hasWarnings = validation.warnings.length > 0 || openIncidents.length > 0;

  if (hasErrors || hasCriticalIncidents) {
    healthStatus.overall = 'critical';
  } else if (hasWarnings) {
    healthStatus.overall = 'warning';
  }

  return healthStatus;
}

/**
 * Validate production environment setup
 */
function validateProductionEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const checks = [];

  // Environment variable checks
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY'
  ];

  requiredVars.forEach(varName => {
    checks.push({
      name: `Environment Variable: ${varName}`,
      status: process.env[varName] ? 'pass' : 'fail',
      message: process.env[varName] ? 'Configured' : 'Missing'
    });
  });

  // Security-specific checks
  checks.push({
    name: 'HTTPS Configuration',
    status: !isProduction || (process.env.NEXTAUTH_URL?.startsWith('https://')) ? 'pass' : 'fail',
    message: isProduction ? 'HTTPS required in production' : 'HTTP allowed in development'
  });

  checks.push({
    name: 'Demo Mode Configuration',
    status: !isProduction || process.env.ENABLE_DEMO_MODE !== 'true' ? 'pass' : 'fail',
    message: process.env.ENABLE_DEMO_MODE === 'true' ? 'Demo mode enabled' : 'Demo mode disabled'
  });

  checks.push({
    name: 'Encryption Key Format',
    status: !process.env.ENCRYPTION_KEY || 
           (process.env.ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(process.env.ENCRYPTION_KEY)) 
           ? 'pass' : 'fail',
    message: !process.env.ENCRYPTION_KEY ? 'Not configured' : 
             process.env.ENCRYPTION_KEY.length === 64 ? 'Valid format' : 'Invalid format'
  });

  const passedChecks = checks.filter(c => c.status === 'pass').length;
  const totalChecks = checks.length;

  return {
    overall: passedChecks === totalChecks ? 'pass' : 'fail',
    score: `${passedChecks}/${totalChecks}`,
    checks,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
}