import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[CSP-REPORT] Content Security Policy violation report:')
    console.log(JSON.stringify(body, null, 2))

    // Log the violation details
    if (body['csp-report']) {
      const report = body['csp-report']
      console.log('[CSP-REPORT] Violation details:', {
        documentURI: report['document-uri'],
        violatedDirective: report['violated-directive'],
        effectiveDirective: report['effective-directive'],
        originalPolicy: report['original-policy'],
        blockedURI: report['blocked-uri'],
        statusCode: report['status-code']
      })
    }

    // Return success response
    return NextResponse.json({
      status: 'received',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CSP-REPORT] Error processing CSP violation report:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to process report' },
      { status: 500 }
    )
  }
}
