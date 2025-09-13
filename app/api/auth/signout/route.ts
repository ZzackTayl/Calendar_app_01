import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

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