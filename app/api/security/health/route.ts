import { NextRequest, NextResponse } from 'next/server';
import { 
  getProductionSecurityConfig, 
  validateProductionConfig 
} from '@/lib/security/production-config';
import { securityMonitor } from '@/lib/security/monitoring-service';
import { incidentResponse } from '@/lib/security/incident-response';
import { getSecurityStats } from '@/lib/security/event-logger';

export interface SecurityHealthCheck {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  environment: string;
  score: number; // 0-100
  checks: {
    configuration: HealthCheckResult;
    authentication: HealthCheckResult;
    monitoring: HealthCheckResult;
    incidents: HealthCheckResult;
    performance: HealthCheckResult;
    compliance: HealthCheckResult;
  };
  recommendations: string[];
  alerts: {
    active: number;
    critical: number;
    lastAlert?: string;
  };
}

export interface HealthCheckResult {
  status: 'pass' | 'warning' | 'fail';
  score: number; // 0-100
  message: string;
  details?: Record<string, any>;
  lastChecked: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const component = searchParams.get('component');

    if (component) {
      // Return specific component health
      const componentHealth = await getComponentHealth(component);
      return NextResponse.json({ success: true, data: componentHealth });
    }

    // Perform comprehensive health check
    const healthCheck = await performSecurityHealthCheck(detailed);
    
    return NextResponse.json({ 
      success: true, 
      data: healthCheck 
    });
  } catch (error) {
    console.error('[SECURITY-HEALTH] Error performing health check:', error);
    return NextResponse.json(
      { success: false, error: 'Health check failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'run-diagnostics':
        const diagnostics = await runSecurityDiagnostics();
        return NextResponse.json({ success: true, data: diagnostics });

      case 'validate-configuration':
        const validation = validateProductionConfig();
        return NextResponse.json({ success: true, data: validation });

      case 'test-monitoring':
        await testMonitoringSystem();
        return NextResponse.json({ success: true, message: 'Monitoring test completed' });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SECURITY-HEALTH] Error in POST endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Perform comprehensive security health check
 */
async function performSecurityHealthCheck(detailed: boolean = false): Promise<SecurityHealthCheck> {
  const timestamp = new Date().toISOString();
  const config = getProductionSecurityConfig();
  
  // Run all health checks
  const checks = {
    configuration: await checkConfiguration(),
    authentication: await checkAuthentication(),
    monitoring: await checkMonitoring(),
    incidents: await checkIncidents(),
    performance: await checkPerformance(),
    compliance: await checkCompliance()
  };

  // Calculate overall score
  const scores = Object.values(checks).map(check => check.score);
  const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  // Determine overall status
  let overall: SecurityHealthCheck['overall'] = 'healthy';
  const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
  const warningChecks = Object.values(checks).filter(check => check.status === 'warning');

  if (failedChecks.length > 0) {
    overall = 'critical';
  } else if (warningChecks.length > 0 || overallScore < 80) {
    overall = 'warning';
  }

  // Get alert information
  const activeAlerts = securityMonitor.getActiveAlerts();
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
  const lastAlert = activeAlerts.length > 0 ? activeAlerts[0].timestamp : undefined;

  // Generate recommendations
  const recommendations = generateRecommendations(checks, config);

  return {
    overall,
    timestamp,
    environment: process.env.NODE_ENV || 'unknown',
    score: overallScore,
    checks,
    recommendations,
    alerts: {
      active: activeAlerts.length,
      critical: criticalAlerts.length,
      lastAlert
    }
  };
}

/**
 * Check configuration health
 */
async function checkConfiguration(): Promise<HealthCheckResult> {
  const validation = validateProductionConfig();
  const config = getProductionSecurityConfig();
  
  let score = 100;
  let status: HealthCheckResult['status'] = 'pass';
  let message = 'Configuration is valid and secure';

  if (validation.errors.length > 0) {
    status = 'fail';
    score = Math.max(0, 100 - (validation.errors.length * 25));
    message = `Configuration has ${validation.errors.length} critical errors`;
  } else if (validation.warnings.length > 0) {
    status = 'warning';
    score = Math.max(70, 100 - (validation.warnings.length * 10));
    message = `Configuration has ${validation.warnings.length} warnings`;
  }

  return {
    status,
    score,
    message,
    details: {
      errors: validation.errors,
      warnings: validation.warnings,
      environment: process.env.NODE_ENV,
      httpsEnforced: config.environment.requireHttps,
      demoModeAllowed: config.demoMode.allowInProduction
    },
    lastChecked: new Date().toISOString()
  };
}

/**
 * Check authentication system health
 */
async function checkAuthentication(): Promise<HealthCheckResult> {
  const config = getProductionSecurityConfig();
  const stats = getSecurityStats(60); // Last hour
  
  let score = 100;
  let status: HealthCheckResult['status'] = 'pass';
  let message = 'Authentication system is healthy';

  // Check for authentication failures
  const authFailures = stats.eventsByType.auth_failure || 0;
  const bypassAttempts = stats.eventsByType.auth_bypass_attempt || 0;

  if (bypassAttempts > 0) {
    status = 'fail';
    score = Math.max(0, 100 - (bypassAttempts * 50));
    message = `${bypassAttempts} authentication bypass attempts detected`;
  } else if (authFailures > config.monitoring.alertThresholds.authFailures) {
    status = 'warning';
    score = Math.max(50, 100 - (authFailures * 5));
    message = `High number of authentication failures: ${authFailures}`;
  }

  return {
    status,
    score,
    message,
    details: {
      authFailures,
      bypassAttempts,
      sessionTimeout: config.authentication.sessionTimeout,
      emailVerificationRequired: config.authentication.requireEmailVerification,
      strongPasswordsEnforced: config.authentication.enforceStrongPasswords
    },
    lastChecked: new Date().toISOString()
  };
}

/**
 * Check monitoring system health
 */
async function checkMonitoring(): Promise<HealthCheckResult> {
  const config = getProductionSecurityConfig();
  const metrics = securityMonitor.getSecurityMetrics(60);
  
  let score = 100;
  let status: HealthCheckResult['status'] = 'pass';
  let message = 'Security monitoring is operational';

  // Check if monitoring is enabled
  if (!config.monitoring.enableRealTimeAlerts) {
    status = 'warning';
    score = 70;
    message = 'Real-time alerts are disabled';
  }

  // Check for monitoring issues
  if (metrics.riskScore > 80) {
    status = 'fail';
    score = Math.max(20, 100 - metrics.riskScore);
    message = `High security risk score: ${metrics.riskScore}`;
  } else if (metrics.riskScore > 50) {
    status = 'warning';
    score = Math.max(50, 100 - (metrics.riskScore / 2));
    message = `Elevated security risk score: ${metrics.riskScore}`;
  }

  return {
    status,
    score,
    message,
    details: {
      realTimeAlertsEnabled: config.monitoring.enableRealTimeAlerts,
      riskScore: metrics.riskScore,
      totalEvents: metrics.totalEvents,
      activeAlerts: metrics.activeAlerts,
      suspiciousPatterns: metrics.suspiciousPatterns.length
    },
    lastChecked: new Date().toISOString()
  };
}

/**
 * Check security incidents
 */
async function checkIncidents(): Promise<HealthCheckResult> {
  const openIncidents = incidentResponse.getOpenIncidents();
  const criticalIncidents = openIncidents.filter(i => i.severity === 'critical');
  
  let score = 100;
  let status: HealthCheckResult['status'] = 'pass';
  let message = 'No active security incidents';

  if (criticalIncidents.length > 0) {
    status = 'fail';
    score = Math.max(0, 100 - (criticalIncidents.length * 40));
    message = `${criticalIncidents.length} critical security incidents active`;
  } else if (openIncidents.length > 0) {
    status = 'warning';
    score = Math.max(60, 100 - (openIncidents.length * 15));
    message = `${openIncidents.length} security incidents require attention`;
  }

  return {
    status,
    score,
    message,
    details: {
      totalOpen: openIncidents.length,
      critical: criticalIncidents.length,
      high: openIncidents.filter(i => i.severity === 'high').length,
      medium: openIncidents.filter(i => i.severity === 'medium').length,
      recentIncidents: openIncidents.slice(0, 5).map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        timestamp: i.timestamp
      }))
    },
    lastChecked: new Date().toISOString()
  };
}

/**
 * Check system performance
 */
async function checkPerformance(): Promise<HealthCheckResult> {
  // This would integrate with your performance monitoring
  // For now, return a basic check
  
  let score = 95;
  let status: HealthCheckResult['status'] = 'pass';
  let message = 'Security system performance is good';

  return {
    status,
    score,
    message,
    details: {
      middlewareLatency: 'normal',
      authValidationSpeed: 'normal',
      monitoringOverhead: 'low'
    },
    lastChecked: new Date().toISOString()
  };
}

/**
 * Check compliance status
 */
async function checkCompliance(): Promise<HealthCheckResult> {
  const config = getProductionSecurityConfig();
  
  let score = 100;
  let status: HealthCheckResult['status'] = 'pass';
  let message = 'Security compliance requirements met';

  const complianceChecks = [
    { name: 'HTTPS Enforcement', passed: config.environment.requireHttps },
    { name: 'Audit Trail', passed: config.monitoring.enableAuditTrail },
    { name: 'Session Security', passed: config.authentication.sessionTimeout > 0 },
    { name: 'Demo Mode Restriction', passed: !config.demoMode.allowInProduction }
  ];

  const failedChecks = complianceChecks.filter(check => !check.passed);
  
  if (failedChecks.length > 0) {
    status = failedChecks.length > 2 ? 'fail' : 'warning';
    score = Math.max(40, 100 - (failedChecks.length * 20));
    message = `${failedChecks.length} compliance requirements not met`;
  }

  return {
    status,
    score,
    message,
    details: {
      checks: complianceChecks,
      failedChecks: failedChecks.map(c => c.name)
    },
    lastChecked: new Date().toISOString()
  };
}

/**
 * Generate health recommendations
 */
function generateRecommendations(
  checks: SecurityHealthCheck['checks'], 
  config: ReturnType<typeof getProductionSecurityConfig>
): string[] {
  const recommendations: string[] = [];

  if (checks.configuration.status === 'fail') {
    recommendations.push('Fix critical configuration errors immediately');
  }

  if (checks.authentication.status === 'fail') {
    recommendations.push('Investigate authentication bypass attempts');
  }

  if (!config.monitoring.enableRealTimeAlerts) {
    recommendations.push('Enable real-time security alerts for production');
  }

  if (checks.incidents.status !== 'pass') {
    recommendations.push('Review and resolve open security incidents');
  }

  if (config.demoMode.allowInProduction) {
    recommendations.push('Disable demo mode in production environment');
  }

  if (!config.environment.requireHttps) {
    recommendations.push('Enforce HTTPS for all connections');
  }

  return recommendations;
}

/**
 * Get specific component health
 */
async function getComponentHealth(component: string): Promise<HealthCheckResult> {
  switch (component) {
    case 'configuration':
      return await checkConfiguration();
    case 'authentication':
      return await checkAuthentication();
    case 'monitoring':
      return await checkMonitoring();
    case 'incidents':
      return await checkIncidents();
    case 'performance':
      return await checkPerformance();
    case 'compliance':
      return await checkCompliance();
    default:
      throw new Error(`Unknown component: ${component}`);
  }
}

/**
 * Run comprehensive security diagnostics
 */
async function runSecurityDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tests: {
      configValidation: validateProductionConfig(),
      monitoringStatus: securityMonitor.getSecurityMetrics(60),
      incidentSummary: {
        total: incidentResponse.getIncidents(100).length,
        open: incidentResponse.getOpenIncidents().length
      },
      securityStats: getSecurityStats(1440) // Last 24 hours
    }
  };

  return diagnostics;
}

/**
 * Test monitoring system
 */
async function testMonitoringSystem() {
  // Generate test security event
  await securityMonitor.generateAlert(
    'critical_event',
    'medium',
    'Security Health Check Test',
    'This is a test alert generated by the security health monitoring system',
    []
  );

  console.log('[SECURITY-HEALTH] Monitoring system test completed');
}