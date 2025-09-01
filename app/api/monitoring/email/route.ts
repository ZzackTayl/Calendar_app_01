/**
 * Email Monitoring API
 * 
 * Provides endpoints for accessing email system monitoring data,
 * health checks, and performance metrics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailMonitor } from '@/lib/monitoring/email-monitoring';
import { createSupabaseClient } from '@/lib/supabase/server';

// Authentication middleware
async function requireAuth(request: NextRequest) {
  const supabase = createSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { authorized: false, user: null };
  }
  
  // Check if user has admin role (adjust based on your auth system)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  const isAdmin = profile?.role === 'admin' || process.env.NODE_ENV === 'development';
  
  return { authorized: isAdmin, user };
}

export async function GET(request: NextRequest) {
  // Check authentication
  const { authorized } = await requireAuth(request);
  
  if (!authorized) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const hours = parseInt(searchParams.get('hours') || '24');

  try {
    switch (endpoint) {
      case 'metrics':
        const metrics = emailMonitor.getMetrics();
        return NextResponse.json({ metrics });

      case 'performance':
        const performance = emailMonitor.getPerformanceMetrics();
        return NextResponse.json({ performance });

      case 'alerts':
        const level = searchParams.get('level');
        const alerts = emailMonitor.getAlerts(level || undefined);
        return NextResponse.json({ alerts });

      case 'events':
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '100');
        const events = emailMonitor.getEvents(type || undefined, limit);
        return NextResponse.json({ events });

      case 'health':
        const health = await emailMonitor.checkEmailServiceHealth();
        return NextResponse.json({ health });

      case 'report':
        const report = emailMonitor.generateReport(hours);
        return NextResponse.json({ report });

      case 'dashboard':
        // Combined data for monitoring dashboard
        const dashboardData = {
          metrics: emailMonitor.getMetrics(),
          performance: emailMonitor.getPerformanceMetrics(),
          health: await emailMonitor.checkEmailServiceHealth(),
          recentAlerts: emailMonitor.getAlerts().slice(0, 10),
          recentEvents: emailMonitor.getEvents(undefined, 50),
          report: emailMonitor.generateReport(24)
        };
        return NextResponse.json(dashboardData);

      default:
        return NextResponse.json(
          {
            message: 'Email monitoring API',
            endpoints: {
              metrics: '/api/monitoring/email?endpoint=metrics',
              performance: '/api/monitoring/email?endpoint=performance',
              alerts: '/api/monitoring/email?endpoint=alerts&level=error',
              events: '/api/monitoring/email?endpoint=events&type=failed&limit=50',
              health: '/api/monitoring/email?endpoint=health',
              report: '/api/monitoring/email?endpoint=report&hours=24',
              dashboard: '/api/monitoring/email?endpoint=dashboard'
            }
          },
          { status: 200 }
        );
    }
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const { authorized } = await requireAuth(request);
  
  if (!authorized) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'record_event':
        // Manually record an email event
        emailMonitor.recordEvent(data);
        return NextResponse.json({ success: true });

      case 'record_delivery_time':
        // Record delivery timing
        emailMonitor.recordDeliveryTime(data.messageId, data.deliveryTime);
        return NextResponse.json({ success: true });

      case 'test_health':
        // Trigger health check
        const health = await emailMonitor.checkEmailServiceHealth();
        return NextResponse.json({ health });

      case 'clear_alerts':
        // Clear resolved alerts (implementation depends on requirements)
        return NextResponse.json({ 
          message: 'Alert clearing not implemented',
          success: false 
        });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Monitoring API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}