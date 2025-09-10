import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { decryptToken, encryptToken } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get Google Calendar integration
  const { data: integrationData, error: integrationError } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .single();

  if (integrationError || !integrationData) {
    return NextResponse.json({ error: 'Google Calendar integration not found or not active' }, { status: 404 });
  }

  const { access_token_encrypted, refresh_token_encrypted, account_email } = integrationData;

  if (!access_token_encrypted) {
    return NextResponse.json({ error: 'Not connected to Google Calendar' }, { status: 400 });
  }

  // Decrypt tokens
  const accessToken = await decryptToken(access_token_encrypted);
  const refreshToken = await decryptToken(refresh_token_encrypted);
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Invalid access token' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    // Test connection and refresh token if needed
    try {
      await calendar.calendarList.list({ maxResults: 1 });
    } catch (authError: any) {
      if (authError.code === 401 && refreshToken) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Update stored tokens
          const { error: updateError } = await supabase
            .from('calendar_integrations')
            .update({
              access_token_encrypted: await encryptToken(credentials.access_token),
              refresh_token_encrypted: await encryptToken(credentials.refresh_token || refreshToken),
              token_expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
              last_sync_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('provider', 'google');

          if (updateError) {
            console.error('Failed to update refreshed tokens:', updateError);
            return NextResponse.json({ error: 'Failed to refresh authentication' }, { status: 401 });
          }

          oauth2Client.setCredentials(credentials);
        } catch (refreshError: any) {
          console.error('Token refresh failed:', refreshError);
          return NextResponse.json({ error: 'Authentication expired and refresh failed' }, { status: 401 });
        }
      } else {
        throw authError;
      }
    }

    // Get request body
    const body = await request.json();
    const { eventIds, targetCalendarId } = body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json({ error: 'Event IDs are required' }, { status: 400 });
    }

    // Get events from our database
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .in('id', eventIds)
      .eq('user_id', user.id);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No events found' }, { status: 404 });
    }

    // Get user's primary calendar if no target calendar specified
    let calendarId = targetCalendarId;
    if (!calendarId) {
      const { data: calendarList } = await calendar.calendarList.list();
      const primaryCalendar = calendarList.items?.find(cal => cal.primary);
      calendarId = primaryCalendar?.id || 'primary';
    }

    let exportedCount = 0;
    const exportErrors: string[] = [];

    for (const event of events) {
      try {
        // Map our event to Google Calendar format
        const googleEvent = {
          summary: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          start: {
            dateTime: event.is_all_day ? undefined : event.start_time,
            date: event.is_all_day ? event.start_time.split('T')[0] : undefined,
            timeZone: event.time_zone || 'UTC',
          },
          end: {
            dateTime: event.is_all_day ? undefined : event.end_time,
            date: event.is_all_day ? event.end_time.split('T')[0] : undefined,
            timeZone: event.time_zone || 'UTC',
          },
          recurrence: event.recurrence_rule ? [event.recurrence_rule] : undefined,
          visibility: mapPrivacyToGoogleVisibility(event.privacy_override),
          // Store our event ID in extended properties for future sync
          extendedProperties: {
            private: {
              polyharmony_event_id: event.id,
              polyharmony_sync: 'true'
            }
          }
        };

        // Create the event in Google Calendar
        const response = await calendar.events.insert({
          calendarId: calendarId,
          requestBody: googleEvent,
        });
        const createdEvent = response.data;

        // Update our event with the Google Calendar ID for future sync
        await supabase
          .from('events')
          .update({
            external_calendar_id: createdEvent.id,
            external_calendar_source: 'google_calendar',
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        exportedCount++;
      } catch (eventError: any) {
        console.error(`Error exporting event ${event.id}:`, eventError);
        exportErrors.push(`Event "${event.title}": ${eventError.message}`);
      }
    }

    // Update integration sync status
    await supabase
      .from('calendar_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_error: exportErrors.length > 0 ? exportErrors.slice(0, 3).join('; ') : null,
      })
      .eq('user_id', user.id)
      .eq('provider', 'google');

    return NextResponse.json({
      success: true,
      message: `Successfully exported ${exportedCount} of ${events.length} events to Google Calendar`,
      exported_count: exportedCount,
      total_events: events.length,
      target_calendar: calendarId,
      ...(exportErrors.length > 0 && { 
        warnings: exportErrors.slice(0, 10),
        total_errors: exportErrors.length
      })
    });

  } catch (error) {
    console.error('Error exporting to Google Calendar:', error);
    
    // Update integration with error
    await supabase
      .from('calendar_integrations')
      .update({
        sync_error: error instanceof Error ? error.message : 'Unknown export error',
        last_sync_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', 'google');

    return NextResponse.json({ 
      error: 'Failed to export to Google Calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Maps our privacy override to Google Calendar visibility
 */
function mapPrivacyToGoogleVisibility(privacyOverride: string | null | undefined): string {
  switch (privacyOverride) {
    case 'private':
      return 'private';
    case 'default':
    default:
      return 'default';
  }
}
