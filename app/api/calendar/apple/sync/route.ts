import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { CalDAVClient } from '@/lib/caldav-client';
import { startOfMonth, endOfMonth } from 'date-fns';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { decrypt } from '@/lib/encryption';
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

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('apple_calendar_access_token, apple_calendar_refresh_token, apple_calendar_token_expires_at')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    return api.error(ErrorCode.NOT_FOUND);
  }

  const { apple_calendar_access_token, apple_calendar_refresh_token, apple_calendar_token_expires_at } = userData;

  if (!apple_calendar_access_token || !apple_calendar_refresh_token) {
    return api.error(ErrorCode.VALIDATION_ERROR);
  }

  // Check if credentials have expired
  if (apple_calendar_token_expires_at && new Date(apple_calendar_token_expires_at) < new Date()) {
    return api.error(ErrorCode.UNAUTHORIZED);
  }

  // Decrypt the stored credentials
  let appleId: string;
  let appSpecificPassword: string;
  
  try {
    appleId = await decrypt(apple_calendar_access_token);
    appSpecificPassword = await decrypt(apple_calendar_refresh_token);
  } catch (decryptionError: any) {
    console.error('Failed to decrypt Apple Calendar credentials:', decryptionError.message);
    return api.error(ErrorCode.UNAUTHORIZED);
  }

  try {
    console.log(`Starting sync for Apple ID: ${appleId.substring(0, 3)}***`);

    const caldavClient = new CalDAVClient(
      'https://caldav.icloud.com',
      {
        username: appleId, // Decrypted Apple ID (email)
        password: appSpecificPassword // Decrypted app-specific password
      }
    );

    // Discover available calendars
    let calendars: string[] = [];
    try {
      calendars = await caldavClient.discoverCalendars();
      console.log(`Discovered ${calendars.length} calendars`);
    } catch (discoveryError: any) {
      console.error('Failed to discover calendars:', discoveryError.message);
      
      // Handle specific CalDAV errors
      if (discoveryError.message.includes('401') || discoveryError.message.includes('Unauthorized')) {
        return api.error(ErrorCode.UNAUTHORIZED);
      } else if (discoveryError.message.includes('403')) {
        return api.error(ErrorCode.FORBIDDEN);
      } else {
        return api.success({ 
          error: 'Failed to discover calendars',
          details: `CalDAV error: ${discoveryError.message}`
        }, { status: 502 });
      }
    }
    
    if (calendars.length === 0) {
      return api.error(ErrorCode.NOT_FOUND);
    }

    // Sync events from all calendars
    const currentDate = new Date();
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);

    let totalEvents = 0;
    let syncedEvents = 0;

    const syncErrors: string[] = [];
    
    for (const calendarUrl of calendars) {
      try {
        console.log(`Syncing calendar: ${calendarUrl}`);
        
        // Fetch events from this calendar
        const caldavEvents = await caldavClient.fetchEvents(calendarUrl, startDate, endDate);
        console.log(`Fetched ${caldavEvents.length} events from calendar: ${calendarUrl}`);
        
        for (const caldavEvent of caldavEvents) {
          try {
            // Convert CalDAV event to your app's format
            const appEvent = caldavClient.convertToAppEvent(caldavEvent, user.id);
            
            // Ensure we have a valid external_calendar_id
            if (!appEvent.external_calendar_id) {
              console.warn('Skipping event without external_calendar_id:', caldavEvent.uid);
              continue;
            }
            
            // Upsert event to your database
            const { error: upsertError } = await supabase
              .from('events')
              .upsert([appEvent], { 
                onConflict: 'external_calendar_id',
                ignoreDuplicates: false 
              });

            if (upsertError) {
              console.error('Failed to upsert event:', upsertError);
              syncErrors.push(`Event ${caldavEvent.uid}: ${upsertError.message}`);
            } else {
              syncedEvents++;
            }
            
            totalEvents++;
          } catch (eventError: any) {
            console.error('Error processing event:', eventError);
            syncErrors.push(`Event ${caldavEvent.uid}: ${eventError.message}`);
            totalEvents++;
          }
        }
      } catch (calendarError: any) {
        console.error(`Error syncing calendar ${calendarUrl}:`, calendarError);
        syncErrors.push(`Calendar ${calendarUrl}: ${calendarError.message}`);
        // Continue with other calendars even if one fails
      }
    }

    // Update last sync time
    const { error: syncUpdateError } = await supabase
      .from('calendar_integration_setup')
      .upsert({
        user_id: user.id,
        apple_calendar_setup_completed: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (syncUpdateError) {
      console.warn('Failed to update sync timestamp:', syncUpdateError);
    }

    const response = {
      message: 'Successfully synced Apple Calendar',
      sync_summary: {
        calendars_found: calendars.length,
        events_processed: totalEvents,
        events_synced: syncedEvents,
        events_failed: totalEvents - syncedEvents,
        sync_period: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        },
        sync_completed_at: new Date().toISOString()
      },
      ...(syncErrors.length > 0 && { 
        warnings: syncErrors.slice(0, 10), // Limit to first 10 errors
        total_errors: syncErrors.length
      })
    };

    console.log('Apple Calendar sync completed:', response.sync_summary);
    return api.success(response);
    
  } catch (error: any) {
    console.error('Unexpected error syncing Apple Calendar:', error);
    
    // Update setup status to indicate sync failure
    // First get the current retry count
    const { data: currentSetup } = await supabase
      .from('calendar_integration_setup')
      .select('setup_retry_count')
      .eq('user_id', user.id)
      .single();

    const retryCount = (currentSetup?.setup_retry_count || 0) + 1;

    const { error: errorUpdateError } = await supabase
      .from('calendar_integration_setup')
      .upsert({
        user_id: user.id,
        setup_status: 'failed',
        setup_error_message: error.message || 'Unknown sync error',
        setup_retry_count: retryCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (errorUpdateError) {
      console.warn('Failed to update error status:', errorUpdateError);
    }
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
} 
