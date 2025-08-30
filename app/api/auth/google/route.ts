
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { createOAuthStateData, storeOAuthState } from '@/lib/security/oauth-state';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get authenticated user for state validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Failed to generate OAuth URL' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { code, state } = requestBody;

    // Validate required parameters
    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    if (!state) {
      return NextResponse.json({ error: 'State parameter is required for security' }, { status: 400 });
    }

    // Validate OAuth state for CSRF protection
    const { validateOAuthState } = await import('@/lib/security/oauth-state');
    const stateValidation = await validateOAuthState(state, user.id, 'google');
    
    if (!stateValidation.valid) {
      return NextResponse.json({ 
        error: 'Invalid or expired state parameter',
        details: 'OAuth state validation failed. Please try again.'
      }, { status: 400 });
    }

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { access_token, refresh_token, expiry_date } = tokens;

    if (!access_token) {
      return NextResponse.json({ 
        error: 'Failed to obtain access token',
        details: 'Google did not provide an access token'
      }, { status: 500 });
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
      return NextResponse.json({ 
        error: 'Failed to save Google Calendar credentials',
        details: 'Database error occurred while saving credentials'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Successfully connected to Google Calendar',
      connection_verified: true
    });
  } catch (error: any) {
    console.error('Error in Google OAuth flow:', error);
    
    if (error.code === 'invalid_grant') {
      return NextResponse.json({ 
        error: 'Invalid authorization code',
        details: 'The authorization code is invalid or has expired. Please try again.'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred during OAuth flow'
    }, { status: 500 });
  }
}
