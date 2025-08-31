import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { generateCSRFTokenResponse } from '@/lib/security/csrf';
import crypto from 'crypto';

// Force dynamic rendering - this route uses cookies and must be dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/csrf-token
 * Generate and return a CSRF token for authenticated users
 * 
 * This route is configured for dynamic rendering because it:
 * - Uses cookies for authentication via Supabase
 * - Requires server-side session validation
 * - Generates unique tokens per request
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  try {
    // Validate request method (should always be GET for this route)
    if (request.method !== 'GET') {
      console.warn(`[${requestId}] Invalid method ${request.method} for CSRF token endpoint`);
      return NextResponse.json({ 
        error: 'Method not allowed',
        timestamp,
        code: 'INVALID_REQUEST'
      }, { status: 405 });
    }

    // Create Supabase client (this uses cookies, requiring dynamic rendering)
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.warn(`[${requestId}] Authentication error:`, authError.message);
      return NextResponse.json({ 
        error: 'Authentication failed',
        timestamp,
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    if (!user) {
      console.warn(`[${requestId}] No authenticated user found`);
      return NextResponse.json({ 
        error: 'Unauthorized - Please log in',
        timestamp,
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    console.info(`[${requestId}] Generating CSRF token for user: ${user.id}`);

    // Generate CSRF token response
    const tokenResponse = await generateCSRFTokenResponse(user);
    
    console.info(`[${requestId}] CSRF token generated successfully`);
    return tokenResponse;
    
  } catch (error) {
    console.error(`[${requestId}] Error generating CSRF token:`, error);
    
    // Return generic error to avoid information disclosure
    return NextResponse.json({ 
      error: 'Failed to generate CSRF token',
      details: 'Internal server error',
      timestamp,
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}