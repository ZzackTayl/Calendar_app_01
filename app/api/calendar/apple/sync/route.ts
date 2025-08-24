
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { dav, Calendar } from 'dav';

// This is a placeholder for the decryption logic.
// In a real application, you would use a library like `crypto` to decrypt the user's credentials.
const decrypt = (text: string) => {
  return text.replace('encrypted_', '');
};

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('apple_calendar_access_token, apple_calendar_refresh_token')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { apple_calendar_access_token, apple_calendar_refresh_token } = userData;

  if (!apple_calendar_access_token || !apple_calendar_refresh_token) {
    return NextResponse.json({ error: 'Not connected to Apple Calendar' }, { status: 400 });
  }

  const appleId = decrypt(apple_calendar_access_token);
  const appSpecificPassword = decrypt(apple_calendar_refresh_token);

  const xhr = new dav.transport.Basic(
    new dav.Credentials({
      username: appleId,
      password: appSpecificPassword,
    })
  );

  const account = await dav.createAccount({
    server: 'https://caldav.icloud.com',
    xhr: xhr,
    loadObjects: true,
  });

  try {
    const calendars = account.calendars;

    if (!calendars) {
      return NextResponse.json({ message: 'No calendars found' });
    }

    for (const cal of calendars) {
      for (const calObj of cal.objects) {
        const eventData = {
          user_id: user.id,
          title: calObj.data.summary || 'Imported Event',
          description: calObj.data.description || null,
          location: calObj.data.location || null,
          start_time: calObj.data.start?.toISOString(),
          end_time: calObj.data.end?.toISOString(),
          is_all_day: false, // CalDAV does not have a standard for all-day events
          time_zone: calObj.data.start?.tz || 'UTC',
          recurrence_rule: calObj.data.rrule?.toString(),
          status: 'confirmed',
          external_calendar_id: calObj.data.uid,
          external_calendar_source: 'apple_calendar',
          privacy_level: 'private',
          color: null,
          visible_to_contacts: [],
          visible_to_groups: [],
        };

        await supabase.from('events').upsert([eventData], { onConflict: 'external_calendar_id' });
      }
    }

    return NextResponse.json({ message: 'Successfully synced Apple Calendar' });
  } catch (error) {
    console.error('Error syncing Apple Calendar:', error);
    return NextResponse.json({ error: 'Failed to sync Apple Calendar' }, { status: 500 });
  }
}
