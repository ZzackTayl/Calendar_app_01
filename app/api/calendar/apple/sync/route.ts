import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { CalDAVClient } from '@/lib/caldav-client';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('apple_calendar_access_token, apple_calendar_refresh_token, apple_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { apple_calendar_access_token, apple_id } = userData;

  if (!apple_calendar_access_token || !apple_id) {
    return NextResponse.json({ error: 'Not connected to Apple Calendar' }, { status: 400 });
  }

  try {
    // Apple Calendar CalDAV configuration
    // Apple uses iCloud's CalDAV server
    const caldavConfig = {
      serverUrl: 'https://caldav.icloud.com',
      username: apple_id, // Apple ID (email)
      password: apple_calendar_access_token, // App-specific password
      calendarPath: '/calendars/'
    };

    const caldavClient = new CalDAVClient(caldavConfig);

    // Discover available calendars
    const calendars = await caldavClient.discoverCalendars();
    
    if (calendars.length === 0) {
      return NextResponse.json({ error: 'No calendars found' }, { status: 404 });
    }

    // Sync events from all calendars
    const currentDate = new Date();
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);

    let totalEvents = 0;
    let syncedEvents = 0;

    for (const calendarUrl of calendars) {
      try {
        // Fetch events from this calendar
        const caldavEvents = await caldavClient.fetchEvents(calendarUrl, startDate, endDate);
        
        for (const caldavEvent of caldavEvents) {
          // Convert CalDAV event to your app's format
          const appEvent = caldavClient.convertToAppEvent(caldavEvent, user.id);
          
          // Upsert event to your database
          const { error: upsertError } = await supabase
            .from('events')
            .upsert([appEvent], { 
              onConflict: 'external_calendar_id',
              ignoreDuplicates: false 
            });

          if (!upsertError) {
            syncedEvents++;
          }
          
          totalEvents++;
        }
      } catch (calendarError) {
        console.error(`Error syncing calendar ${calendarUrl}:`, calendarError);
        // Continue with other calendars even if one fails
      }
    }

    return NextResponse.json({ 
      message: 'Successfully synced Apple Calendar',
      calendarsFound: calendars.length,
      eventsProcessed: totalEvents,
      eventsSynced: syncedEvents
    });
    
  } catch (error) {
    console.error('Error syncing Apple Calendar:', error);
    return NextResponse.json({ 
      error: 'Failed to sync Apple Calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
