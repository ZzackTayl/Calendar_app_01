import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { 
  getMonitoringMetrics,
  getViolationsByIdentifier,
  isHighRiskIdentifier,
  exportViolationsData
} from '@/lib/monitoring/rate-limit-monitor'
import { 
  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  isAdminUser,
  RATE_LIMITS 
} from '@/lib/rate-limiting'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    const ip = getClientIP(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = await isAdminUser(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Apply rate limiting for monitoring API
    const rateLimitResult = checkRateLimit(user.id, {
      ...RATE_LIMITS.API_CALLS,
      maxRequests: 20, // More restrictive for monitoring API
      keyGenerator: (userId: string) => `monitoring:${userId}`
    }, true) // Admin bypass enabled
    
    // Create headers for response
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      20,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000') // Default: 1 hour
    const identifier = searchParams.get('identifier') // Optional: filter by specific identifier
    const format = searchParams.get('format') as 'json' | 'csv' || 'json'
    const action = searchParams.get('action') || 'metrics'
    
    // Validate time window (max 7 days)
    const maxTimeWindow = 7 * 24 * 60 * 60 * 1000 // 7 days
    const validTimeWindow = Math.min(timeWindow, maxTimeWindow)
    
    let responseData: any
    
    switch (action) {
      case 'metrics':
        responseData = {
          timeWindow: validTimeWindow,
          metrics: getMonitoringMetrics(validTimeWindow),
          timestamp: new Date().toISOString()
        }
        break
        
      case 'violations':
        if (!identifier) {
          return NextResponse.json(
            { error: 'Identifier parameter required for violations action' },
            { status: 400, headers }
          )
        }
        responseData = {
          identifier,
          timeWindow: validTimeWindow,
          violations: getViolationsByIdentifier(identifier, validTimeWindow),
          riskAssessment: isHighRiskIdentifier(identifier, validTimeWindow),
          timestamp: new Date().toISOString()
        }
        break
        
      case 'risk-assessment':
        if (!identifier) {
          return NextResponse.json(
            { error: 'Identifier parameter required for risk assessment' },
            { status: 400, headers }
          )
        }
        responseData = {
          identifier,
          timeWindow: validTimeWindow,
          riskAssessment: isHighRiskIdentifier(identifier, validTimeWindow),
          timestamp: new Date().toISOString()
        }
        break
        
      case 'export':
        const exportData = exportViolationsData(validTimeWindow, format)
        
        if (format === 'csv') {
          const response = new Response(exportData, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="rate-limit-violations-${Date.now()}.csv"`,
              ...headers
            }
          })
          
          return response
        } else {
          responseData = {
            timeWindow: validTimeWindow,
            format,
            data: JSON.parse(exportData),
            timestamp: new Date().toISOString()
          }
        }
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: metrics, violations, risk-assessment, export' },
          { status: 400, headers }
        )
    }
    
    // Create successful response with rate limit headers
    const response = NextResponse.json(responseData)
    
    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
    
  } catch (error) {
    console.error('Error in rate limit monitoring API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: POST endpoint for manual actions (e.g., clearing violations)
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    
    // Check authentication and admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isAdminUser(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, identifier } = body
    
    // Currently, we don't have manual actions implemented
    // This could be extended to support:
    // - Clearing violation history for an identifier
    // - Temporarily whitelisting an IP/user
    // - Adjusting rate limits for specific identifiers
    
    return NextResponse.json(
      { message: 'Manual actions not yet implemented' },
      { status: 501 }
    )
    
  } catch (error) {
    console.error('Error in rate limit monitoring POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}