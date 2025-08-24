
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('google_calendar_access_token, google_calendar_refresh_token')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { google_calendar_access_token, google_calendar_refresh_token } = userData;

  if (!google_calendar_access_token) {
    return NextResponse.json({ error: 'Not connected to Google Calendar' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: google_calendar_access_token,
    refresh_token: google_calendar_refresh_token,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const { data: calendarList } = await calendar.calendarList.list();
    const calendars = calendarList.items;

    if (!calendars) {
      return NextResponse.json({ message: 'No calendars found' });
    }

    for (const cal of calendars) {
      const { data: events } = await calendar.events.list({ calendarId: cal.id! });
      const googleEvents = events.items;

      if (googleEvents) {
        for (const googleEvent of googleEvents) {
          const eventData = {
            user_id: user.id,
            title: googleEvent.summary || 'Imported Event',
            description: googleEvent.description || null,
            location: googleEvent.location || null,
            start_time: googleEvent.start?.dateTime || googleEvent.start?.date,
            end_time: googleEvent.end?.dateTime || googleEvent.end?.date,
            is_all_day: !!googleEvent.start?.date,
            time_zone: googleEvent.start?.timeZone || 'UTC',
            recurrence_rule: googleEvent.recurrence ? googleEvent.recurrence.join('\n') : null,
            status: 'confirmed',
            external_calendar_id: googleEvent.id,
            external_calendar_source: 'google_calendar',
            privacy_level: 'private',
            color: null,
            visible_to_contacts: [],
            visible_to_groups: [],
          };

          await supabase.from('events').upsert([eventData], { onConflict: 'external_calendar_id' });
        }
      }
    }

    return NextResponse.json({ message: 'Successfully synced Google Calendar' });
  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    return NextResponse.json({ error: 'Failed to sync Google Calendar' }, { status: 500 });
  }
}
