import { NextResponse } from 'next/server';

import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { createOAuthStateData, storeOAuthState } from '@/lib/security/oauth-state';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient();
    
    // Get authenticated user for state validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Generate and store OAuth state for CSRF protection
    const stateData = createOAuthStateData(user.id, 'google');
    await storeOAuthState(stateData);

    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: stateData.state, // Include state parameter for CSRF protection
      prompt: 'consent' // Force consent to get refresh token
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    const { code, state } = requestBody;

    // Validate required parameters
    if (!code) {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    if (!state) {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    // Validate OAuth state for CSRF protection
    const { validateOAuthState } = await import('@/lib/security/oauth-state');
    const stateValidation = await validateOAuthState(state, user.id, 'google');
    
    if (!stateValidation.valid) {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { access_token, refresh_token, expiry_date } = tokens;

    if (!access_token) {
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // Store encrypted tokens in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        google_calendar_access_token: access_token,
        google_calendar_refresh_token: refresh_token,
        google_calendar_token_expires_at: expiry_date ? new Date(expiry_date).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Database update failed:', updateError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    return api.success({ 
      message: 'Successfully connected to Google Calendar',
      connection_verified: true
    });
  } catch (error: any) {
    console.error('Error in Google OAuth flow:', error);
    
    if (error.code === 'invalid_grant') {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}
