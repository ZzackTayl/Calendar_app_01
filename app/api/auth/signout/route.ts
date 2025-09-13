import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Error signing out:', error);
    // Redirect to home anyway
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}