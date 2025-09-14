import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { securityMonitor } from '@/lib/security/monitoring-service';
import { getRecentSecurityEvents } from '@/lib/security/event-logger';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';
    const timeWindow = parseInt(searchParams.get('timeWindow') || '60');
    const limit = parseInt(searchParams.get('limit') || '100');

    switch (action) {
      case 'metrics':
        const metrics = securityMonitor.getSecurityMetrics(timeWindow);
        return api.success({ success: true, data: metrics });

      case 'alerts':
        const alerts = securityMonitor.getAllAlerts(limit);
        return api.success({ success: true, data: alerts });

      case 'active-alerts':
        const activeAlerts = securityMonitor.getActiveAlerts();
        return api.success({ success: true, data: activeAlerts });

      case 'events':
        const events = getRecentSecurityEvents(limit);
        return api.success({ success: true, data: events });

      case 'rules':
        const rules = securityMonitor.getRules();
        return api.success({ success: true, data: rules });

      default:
        return api.success(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SECURITY-API] Error in monitoring endpoint:', error);
    return api.success(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'acknowledge-alert':
        const acknowledged = securityMonitor.acknowledgeAlert(data.alertId);
        return api.success({ success: acknowledged });

      case 'resolve-alert':
        const resolved = securityMonitor.resolveAlert(data.alertId);
        return api.success({ success: resolved });

      case 'toggle-rule':
        const toggled = securityMonitor.toggleRule(data.ruleId, data.enabled);
        return api.success({ success: toggled });

      case 'update-rule':
        securityMonitor.updateRule(data.rule);
        return api.success({ success: true });

      case 'generate-test-alert':
        const alert = securityMonitor.generateAlert(
          'critical_event',
          'high',
          'Test Security Alert',
          'This is a test alert generated from the API',
          []
        );
        return api.success({ success: true, data: alert });

      default:
        return api.success(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SECURITY-API] Error in monitoring POST endpoint:', error);
    return api.success(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}