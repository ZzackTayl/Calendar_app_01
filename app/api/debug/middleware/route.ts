import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const headers = Object.fromEntries(request.headers.entries())
  
  return NextResponse.json({
    message: 'Debug endpoint for middleware testing',
    middlewareExecuted: headers['x-middleware-executed'] === 'true',
    middlewareRoute: headers['x-middleware-route'],
    allHeaders: headers,
    timestamp: new Date().toISOString()
  })
}