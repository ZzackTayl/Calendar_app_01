import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { generateCSRFTokenResponse } from '@/lib/security/csrf';

/**
 * GET /api/auth/csrf-token
 * Generate and return a CSRF token for authenticated users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate CSRF token response
    return await generateCSRFTokenResponse(user);
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json({ 
      error: 'Failed to generate CSRF token',
      details: 'Internal server error'
    }, { status: 500 });
  }
}