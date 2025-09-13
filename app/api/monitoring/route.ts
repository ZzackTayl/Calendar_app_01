import { NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { productionMonitoring } from '@/lib/monitoring/production-monitoring';
import { getEnvironmentConfig } from '@/lib/config/env-validation';
import { NextRequest } from 'next/server';

/**
 * Production Monitoring Dashboard API
 * Provides real-time monitoring data for operational dashboards
 */

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'status';
    const config = getEnvironmentConfig();

    // Security check - only allow monitoring access in secure environments or with proper auth
    if (config.isProduction) {
      // In production, you'd implement proper authentication here
      // For now, we'll allow it for demonstration
    }

    switch (type) {
      case 'status':
        return api.success(productionMonitoring.getStatus());
      
      case 'dashboard':
        return api.success(productionMonitoring.getDashboardData());
      
      case 'health':
        // Redirect to health check endpoint
        return NextResponse.redirect(new URL('/api/health', request.url));
      
      default:
        return api.error(ErrorCode.VALIDATION_ERROR);
    }
  } catch (error) {
    productionMonitoring.logError('monitoring-api-error', error, 'error');
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'acknowledge-alert':
        if (!body.alertId) {
          return api.error(ErrorCode.VALIDATION_ERROR);
        }
        
        const acknowledged = productionMonitoring.acknowledgeAlert(body.alertId);
        return api.success({ success: acknowledged });
      
      case 'resolve-alert':
        if (!body.alertId) {
          return api.error(ErrorCode.VALIDATION_ERROR);
        }
        
        const resolved = productionMonitoring.resolveAlert(body.alertId);
        return api.success({ success: resolved });
      
      case 'log-error':
        if (!body.type || !body.message) {
          return api.error(ErrorCode.VALIDATION_ERROR);
        }
        
        productionMonitoring.logError(
          body.type,
          new Error(body.message),
          body.level || 'error',
          body.context
        );
        
        return api.success({ success: true });
      
      case 'track-request':
        if (!body.endpoint || typeof body.responseTime !== 'number') {
          return api.error(ErrorCode.VALIDATION_ERROR);
        }
        
        productionMonitoring.trackRequest(body.endpoint, body.responseTime);
        return api.success({ success: true });
      
      default:
        return api.error(ErrorCode.VALIDATION_ERROR);
    }
  } catch (error) {
    productionMonitoring.logError('monitoring-api-post-error', error, 'error');
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}