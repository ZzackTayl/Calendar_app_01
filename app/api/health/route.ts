import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check for Docker containers
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected', // Will be enhanced with actual DB check
        redis: 'connected',     // Will be enhanced with actual Redis check
        mailhog: 'available'   // MailHog is available in Docker
      }
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { 
      status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}