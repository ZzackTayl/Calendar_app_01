import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { generateCSRFTokenResponse } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';

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
  const api = createApiResponse();
  const requestId = Math.random().toString(36).substring(2, 15);
  const timestamp = new Date().toISOString();
  
  try {
    // Validate request method (should always be GET for this route)
    if (request.method !== 'GET') {
      console.warn(`[${requestId}] Invalid method ${request.method} for CSRF token endpoint`);
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: 'Method not allowed'
      });
    }

    // Server-side authentication check
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn(`[${requestId}] Authentication failed:`, authError?.message);
      return api.error(ErrorCode.UNAUTHORIZED, {
        message: 'Authentication required',
        details: authError?.message
      });
    }
    console.info(`[${requestId}] Generating CSRF token for user: ${user.id}`);

    // Generate CSRF token response
    const tokenResponse = await generateCSRFTokenResponse(user);
    
    console.info(`[${requestId}] CSRF token generated successfully`);
    return tokenResponse;
    
  } catch (error) {
    console.error(`[${requestId}] Error generating CSRF token:`, error);
    
    // Return generic error to avoid information disclosure
    return api.error(ErrorCode.INTERNAL_ERROR, {
      message: 'Failed to generate CSRF token'
    });
  }
}