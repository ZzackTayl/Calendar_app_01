import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { encryptToken } from '@/lib/encryption';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth error
  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent('Google Calendar connection failed')}&details=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    console.error('Missing required OAuth parameters:', { code: !!code, state: !!state });
    return NextResponse.redirect(
      new URL('/dashboard?error=' + encodeURIComponent('Invalid OAuth response from Google'), request.url)
    );
  }

  try {
    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      console.error('Invalid state parameter:', e);
      return NextResponse.redirect(
        new URL('/dashboard?error=' + encodeURIComponent('Invalid OAuth state'), request.url)
      );
    }

    // Validate state timestamp (5 minutes expiry)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 5 * 60 * 1000) {
      console.error('OAuth state expired:', { age: stateAge });
      return NextResponse.redirect(
        new URL('/dashboard?error=' + encodeURIComponent('OAuth session expired. Please try again.'), request.url)
      );
    }

    // Get user from Supabase
    const supabase = createRouteHandlerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || user.id !== stateData.user_id) {
      console.error('User authentication failed:', { userError, userId: user?.id, stateUserId: stateData.user_id });
      return NextResponse.redirect(
        new URL('/dashboard?error=' + encodeURIComponent('Authentication failed. Please sign in and try again.'), request.url)
      );
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Get user's email for the integration
    const { data: userProfile } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const accountEmail = userProfile?.email || user.email;

    // Store tokens in calendar_integrations table
    const { data: integrationData, error: integrationError } = await supabase
      .from('calendar_integrations')
      .upsert({
        user_id: user.id,
        provider: 'google',
        account_email: accountEmail,
        access_token_encrypted: encryptToken(tokens.access_token),
        refresh_token_encrypted: encryptToken(tokens.refresh_token),
        token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true,
        sync_enabled: true,
        last_sync_at: new Date().toISOString(),
        integration_data: {
          scope: tokens.scope,
          token_type: tokens.token_type,
        }
      }, {
        onConflict: 'user_id,provider,account_email'
      })
      .select()
      .single();

    if (integrationError) {
      console.error('Error storing Google Calendar integration:', integrationError);
      return NextResponse.redirect(
        new URL('/dashboard?error=' + encodeURIComponent('Failed to save Google Calendar connection'), request.url)
      );
    }

    // Update calendar integration setup status
    const { error: setupError } = await supabase
      .from('calendar_integration_setup')
      .update({
        google_calendar_setup_completed: true,
        google_calendar_setup_completed_at: new Date().toISOString(),
        setup_status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (setupError) {
      console.error('Error updating calendar setup status:', setupError);
      // Don't fail the whole flow for this
    }

    // Test the connection by fetching user's calendar list
    try {
      oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const { data: calendarList } = await calendar.calendarList.list({ maxResults: 1 });
      
      console.log('Google Calendar connection successful:', {
        userId: user.id,
        integrationId: integrationData.id,
        calendarsFound: calendarList.items?.length || 0
      });
    } catch (testError) {
      console.warn('Google Calendar test connection failed (but tokens saved):', testError);
    }

    // Success! Redirect to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?success=' + encodeURIComponent('Google Calendar connected successfully!'), request.url)
    );

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=' + encodeURIComponent('Failed to connect Google Calendar. Please try again.'), request.url)
    );
  }
}