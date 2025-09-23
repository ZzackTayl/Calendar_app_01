import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { PrivacyOverride } from '@/lib/supabase/types';
import { decryptToken, encryptToken } from '@/lib/encryption';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  // Validate CSRF token first
  const csrfValidation = await validateCSRFProtection(request);
  if (!csrfValidation.valid) {
    return api.success({ 
      error: csrfValidation.error || 'CSRF validation failed' 
    }, { status: 403 });
  }
  
  const supabase = await createRouteHandlerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return api.error(ErrorCode.UNAUTHORIZED);
  }

  // Get Google Calendar integration from calendar_integrations table
  const { data: integrationData, error: integrationError } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .eq('is_active', true)
    .single();

  if (integrationError || !integrationData) {
    return api.error(ErrorCode.NOT_FOUND);
  }

  const { access_token_encrypted, refresh_token_encrypted, account_email } = integrationData;

  if (!access_token_encrypted) {
    return api.error(ErrorCode.VALIDATION_ERROR);
  }

  // Decrypt tokens using proper encryption
  const accessToken = await decryptToken(access_token_encrypted);
  const refreshToken = await decryptToken(refresh_token_encrypted);
  
  if (!accessToken) {
    return api.error(ErrorCode.VALIDATION_ERROR);
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
    // Test the connection and refresh token if needed
    try {
      await calendar.calendarList.list({ maxResults: 1 });
    } catch (authError: any) {
      if (authError.code === 401 && refreshToken) {
        // Token expired, try to refresh
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Update stored tokens with new ones
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
            return api.error(ErrorCode.UNAUTHORIZED);
          }

          // Update the OAuth client with new credentials
          oauth2Client.setCredentials(credentials);
        } catch (refreshError: any) {
          console.error('Token refresh failed:', refreshError);
          return api.error(ErrorCode.UNAUTHORIZED);
        }
      } else {
        throw authError;
      }
    }
    const { data: calendarList } = await calendar.calendarList.list();
    const calendars = calendarList.items;

    if (!calendars) {
      return api.success({ message: 'No calendars found' });
    }

    let totalEvents = 0;
    let syncedEvents = 0;
    const syncErrors: string[] = [];

    for (const cal of calendars) {
      try {
        const { data: events } = await calendar.events.list({ 
          calendarId: cal.id!,
          timeMin: new Date().toISOString(), // Only sync future events
          maxResults: 100 // Limit to prevent overwhelming the system
        });
        const googleEvents = events.items;

        if (googleEvents) {
          for (const googleEvent of googleEvents) {
            try {
              // Map Google Calendar privacy to our privacy system
              const privacyOverride = mapGoogleCalendarPrivacy(googleEvent);

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
                status: mapGoogleEventStatus(googleEvent.status || undefined),
                external_calendar_id: googleEvent.id,
                external_calendar_source: 'google_calendar',
                // Use new unified privacy system
                privacy_override: privacyOverride,
                color: googleEvent.colorId ? getGoogleCalendarColor(googleEvent.colorId) : null,
                visible_to_contacts: [],
                visible_to_groups: [],
              };

              const { error: upsertError } = await supabase
                .from('events')
                .upsert([eventData], { 
                  onConflict: 'external_calendar_id',
                  ignoreDuplicates: false 
                });

              if (upsertError) {
                console.error('Failed to upsert event:', upsertError);
                syncErrors.push(`Event ${googleEvent.id}: ${upsertError.message}`);
              } else {
                syncedEvents++;
              }
              
              totalEvents++;
            } catch (eventError: any) {
              console.error('Error processing event:', eventError);
              syncErrors.push(`Event ${googleEvent.id}: ${eventError.message}`);
              totalEvents++;
            }
          }
        }
      } catch (calendarError: any) {
        console.error(`Error syncing calendar ${cal.id}:`, calendarError);
        syncErrors.push(`Calendar ${cal.id}: ${calendarError.message}`);
      }
    }

    // Update last sync time
    const { error: syncUpdateError } = await supabase
      .from('calendar_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_error: syncErrors.length > 0 ? syncErrors.slice(0, 3).join('; ') : null,
      })
      .eq('id', integrationData.id);

    if (syncUpdateError) {
      console.warn('Failed to update sync timestamp:', syncUpdateError);
    }

    const response = {
      message: 'Successfully synced Google Calendar',
      sync_summary: {
        calendars_found: calendars.length,
        events_processed: totalEvents,
        events_synced: syncedEvents,
        events_failed: totalEvents - syncedEvents,
        sync_completed_at: new Date().toISOString()
      },
      ...(syncErrors.length > 0 && { 
        warnings: syncErrors.slice(0, 10), // Limit to first 10 errors
        total_errors: syncErrors.length
      })
    };

    console.log('Google Calendar sync completed:', response.sync_summary);
    return api.success(response);

  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    
    // Update integration with error
    await supabase
      .from('calendar_integrations')
      .update({
        sync_error: error instanceof Error ? error.message : 'Unknown sync error',
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', integrationData.id);

    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * Map Google Calendar event privacy to our privacy system
 */
function mapGoogleCalendarPrivacy(googleEvent: any): PrivacyOverride {
  // Google Calendar doesn't have explicit privacy levels like our system
  // We'll use 'default' which means it follows the connection tier system
  // Users can manually override specific events if needed
  
  // If the event is marked as private in Google Calendar, we could map it
  // For now, we'll use 'default' to let the connection tier system handle it
  return 'default';
}

/**
 * Map Google Calendar event status to our event status
 */
function mapGoogleEventStatus(googleStatus?: string): 'confirmed' | 'tentative' | 'cancelled' {
  if (!googleStatus) return 'confirmed';
  
  switch (googleStatus.toLowerCase()) {
    case 'confirmed':
      return 'confirmed';
    case 'tentative':
      return 'tentative';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'confirmed';
  }
}

/**
 * Get Google Calendar color from color ID
 */
function getGoogleCalendarColor(colorId?: string): string | null {
  if (!colorId) return null;
  
  // Google Calendar color mapping
  const googleColors: Record<string, string> = {
    '1': '#7986cb', // Lavender
    '2': '#33b679', // Sage
    '3': '#8e63ce', // Grape
    '4': '#e67c73', // Flamingo
    '5': '#f6c026', // Banana
    '6': '#f4b400', // Tangerine
    '7': '#039be5', // Peacock
    '8': '#616161', // Graphite
    '9': '#3f51b5', // Blueberry
    '10': '#0b8043', // Basil
    '11': '#d60000', // Tomato
  };
  
  return googleColors[colorId] || null;
}
