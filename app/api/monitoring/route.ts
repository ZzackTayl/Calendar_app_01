import { NextResponse } from 'next/server';
import { productionMonitoring } from '@/lib/monitoring/production-monitoring';
import { getEnvironmentConfig } from '@/lib/config/env-validation';

/**
 * Production Monitoring Dashboard API
 * Provides real-time monitoring data for operational dashboards
 */

export async function GET(request: Request) {
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
        return NextResponse.json(productionMonitoring.getStatus());
      
      case 'dashboard':
        return NextResponse.json(productionMonitoring.getDashboardData());
      
      case 'health':
        // Redirect to health check endpoint
        return NextResponse.redirect(new URL('/api/health', request.url));
      
      default:
        return NextResponse.json(
          { error: 'Invalid monitoring type. Use: status, dashboard, health' },
          { status: 400 }
        );
    }
  } catch (error) {
    productionMonitoring.logError('monitoring-api-error', error, 'error');
    
    return NextResponse.json(
      { 
        error: 'Monitoring API failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'acknowledge-alert':
        if (!body.alertId) {
          return NextResponse.json(
            { error: 'alertId is required' },
            { status: 400 }
          );
        }
        
        const acknowledged = productionMonitoring.acknowledgeAlert(body.alertId);
        return NextResponse.json({ success: acknowledged });
      
      case 'resolve-alert':
        if (!body.alertId) {
          return NextResponse.json(
            { error: 'alertId is required' },
            { status: 400 }
          );
        }
        
        const resolved = productionMonitoring.resolveAlert(body.alertId);
        return NextResponse.json({ success: resolved });
      
      case 'log-error':
        if (!body.type || !body.message) {
          return NextResponse.json(
            { error: 'type and message are required' },
            { status: 400 }
          );
        }
        
        productionMonitoring.logError(
          body.type,
          new Error(body.message),
          body.level || 'error',
          body.context
        );
        
        return NextResponse.json({ success: true });
      
      case 'track-request':
        if (!body.endpoint || typeof body.responseTime !== 'number') {
          return NextResponse.json(
            { error: 'endpoint and responseTime are required' },
            { status: 400 }
          );
        }
        
        productionMonitoring.trackRequest(body.endpoint, body.responseTime);
        return NextResponse.json({ success: true });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: acknowledge-alert, resolve-alert, log-error, track-request' },
          { status: 400 }
        );
    }
  } catch (error) {
    productionMonitoring.logError('monitoring-api-post-error', error, 'error');
    
    return NextResponse.json(
      { 
        error: 'Monitoring API POST failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}