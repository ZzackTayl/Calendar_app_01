import { NextResponse } from 'next/server';

/**
 * Health check endpoint for testing network connectivity
 * Used by RealtimeErrorBoundary to verify connection status
 */
export async function GET() {
  try {
    // Basic health check - just return OK status
    // In production, you might want to check database connectivity too
    return NextResponse.json(
      { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'calendar-app' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}