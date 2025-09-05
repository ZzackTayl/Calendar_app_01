import { NextRequest, NextResponse } from 'next/server';
import { securityMonitor } from '@/lib/security/monitoring-service';
import { getRecentSecurityEvents } from '@/lib/security/event-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';
    const timeWindow = parseInt(searchParams.get('timeWindow') || '60');
    const limit = parseInt(searchParams.get('limit') || '100');

    switch (action) {
      case 'metrics':
        const metrics = securityMonitor.getSecurityMetrics(timeWindow);
        return NextResponse.json({ success: true, data: metrics });

      case 'alerts':
        const alerts = securityMonitor.getAllAlerts(limit);
        return NextResponse.json({ success: true, data: alerts });

      case 'active-alerts':
        const activeAlerts = securityMonitor.getActiveAlerts();
        return NextResponse.json({ success: true, data: activeAlerts });

      case 'events':
        const events = getRecentSecurityEvents(limit);
        return NextResponse.json({ success: true, data: events });

      case 'rules':
        const rules = securityMonitor.getRules();
        return NextResponse.json({ success: true, data: rules });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SECURITY-API] Error in monitoring endpoint:', error);
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
      case 'acknowledge-alert':
        const acknowledged = securityMonitor.acknowledgeAlert(data.alertId);
        return NextResponse.json({ success: acknowledged });

      case 'resolve-alert':
        const resolved = securityMonitor.resolveAlert(data.alertId);
        return NextResponse.json({ success: resolved });

      case 'toggle-rule':
        const toggled = securityMonitor.toggleRule(data.ruleId, data.enabled);
        return NextResponse.json({ success: toggled });

      case 'update-rule':
        securityMonitor.updateRule(data.rule);
        return NextResponse.json({ success: true });

      case 'generate-test-alert':
        const alert = securityMonitor.generateAlert(
          'critical_event',
          'high',
          'Test Security Alert',
          'This is a test alert generated from the API',
          []
        );
        return NextResponse.json({ success: true, data: alert });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[SECURITY-API] Error in monitoring POST endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}