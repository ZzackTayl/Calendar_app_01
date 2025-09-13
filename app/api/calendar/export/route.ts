import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import ical from 'ical-generator';
import { RRule } from 'rrule';
import { format, parseISO } from 'date-fns';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const includePrivate = searchParams.get('include_private') === 'true';
    const eventIds = searchParams.get('event_ids')?.split(',');

    // Build query
    let query = supabase
      .from('events')
      .select(`
        *,
        relationship:relationship_id(name),
        event_permissions(*)
      `)
      .eq('user_id', user.id);

    // Apply filters
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('end_time', endDate);
    }
    if (eventIds && eventIds.length > 0) {
      query = query.in('id', eventIds);
    }
    if (!includePrivate) {
      query = query.not('privacy_level', 'eq', 'private');
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // Create iCalendar
    const calendar = ical({
      name: 'PolyHarmony Calendar',
      description: 'Exported calendar from PolyHarmony',
      timezone: 'UTC',
      url: 'https://polyharmony.app',
      ttl: 60 * 60 * 24, // 1 day
      prodId: {
        company: 'PolyHarmony',
        product: 'Calendar',
        language: 'EN'
      }
    });

    // Add events to calendar
    for (const event of events || []) {
      try {
        const icalEvent = await convertEventToICal(event, calendar);
        calendar.createEvent(icalEvent);
      } catch (error) {
        console.error('Error converting event to iCal:', error);
        // Continue with other events even if one fails
      }
    }

    // Generate the iCalendar content
    const icalContent = calendar.toString();

    // Return as downloadable file
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="polyharmony-calendar-${format(new Date(), 'yyyy-MM-dd')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/calendar/export:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Get request body for event IDs and options
    const body = await request.json();
    const { 
      eventIds, 
      startDate, 
      endDate, 
      includePrivate = false,
      calendarName = 'PolyHarmony Calendar'
    } = body;

    // Build query similar to GET but using POST body parameters
    let query = supabase
      .from('events')
      .select(`
        *,
        relationship:relationship_id(name),
        event_permissions(*)
      `)
      .eq('user_id', user.id);

    if (eventIds && eventIds.length > 0) {
      query = query.in('id', eventIds);
    }
    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('end_time', endDate);
    }
    if (!includePrivate) {
      query = query.not('privacy_level', 'eq', 'private');
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // Create iCalendar with custom name
    const calendar = ical({
      name: calendarName,
      description: `Exported calendar from PolyHarmony - ${calendarName}`,
      timezone: 'UTC',
      url: 'https://polyharmony.app',
      ttl: 60 * 60 * 24,
      prodId: {
        company: 'PolyHarmony',
        product: 'Calendar',
        language: 'EN'
      }
    });

    // Add events to calendar
    for (const event of events || []) {
      try {
        const icalEvent = await convertEventToICal(event, calendar);
        calendar.createEvent(icalEvent);
      } catch (error) {
        console.error('Error converting event to iCal:', error);
      }
    }

    // Generate the iCalendar content
    const icalContent = calendar.toString();

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${calendarName.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/calendar/export:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * Convert a database event to iCal event format
 */
async function convertEventToICal(event: any, calendar: any) {
  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);

  const icalEvent: any = {
    uid: event.external_calendar_id || `polyharmony-${event.id}@polyharmony.app`,
    start: startDate,
    end: endDate,
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    created: event.created_at ? parseISO(event.created_at) : new Date(),
    lastModified: event.updated_at ? parseISO(event.updated_at) : new Date(),
    timezone: event.time_zone || 'UTC'
  };

  // Handle all-day events
  if (event.is_all_day) {
    icalEvent.allDay = true;
  }

  // Map status
  if (event.status) {
    switch (event.status) {
      case 'confirmed':
        icalEvent.status = 'CONFIRMED';
        break;
      case 'tentative':
        icalEvent.status = 'TENTATIVE';
        break;
      case 'cancelled':
        icalEvent.status = 'CANCELLED';
        break;
      default:
        icalEvent.status = 'CONFIRMED';
    }
  }

  // Handle recurrence
  if (event.recurrence_rule) {
    try {
      // Parse the RRule string and convert to iCal RRULE
      const rrule = RRule.fromString(event.recurrence_rule);
      icalEvent.repeating = {
        freq: rrule.options.freq,
        count: rrule.options.count,
        interval: rrule.options.interval,
        until: rrule.options.until,
        byweekday: rrule.options.byweekday,
        bymonth: rrule.options.bymonth,
        bymonthday: rrule.options.bymonthday
      };
    } catch (rruleError) {
      console.warn('Error parsing recurrence rule:', rruleError);
    }
  }

  // Add privacy classification
  switch (event.privacy_level) {
    case 'public':
      icalEvent.class = 'PUBLIC';
      break;
    case 'private':
      icalEvent.class = 'PRIVATE';
      break;
    case 'custom':
      icalEvent.class = 'CONFIDENTIAL';
      break;
    default:
      icalEvent.class = 'PUBLIC';
  }

  // Add relationship context if available
  if (event.relationship && event.relationship.name) {
    icalEvent.categories = [event.relationship.name];
  }

  // Add custom properties for PolyHarmony-specific data
  icalEvent.x = {
    'POLYHARMONY-EVENT-ID': event.id,
    'POLYHARMONY-PRIVACY-LEVEL': event.privacy_level,
    'POLYHARMONY-COLOR': event.color || ''
  };

  return icalEvent;
}