import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  const headers = Object.fromEntries(request.headers.entries())
  
  return api.success({
    message: 'Debug endpoint for middleware testing',
    middlewareExecuted: headers['x-middleware-executed'] === 'true',
    middlewareRoute: headers['x-middleware-route'],
    allHeaders: headers,
    timestamp: new Date().toISOString()
  })
}