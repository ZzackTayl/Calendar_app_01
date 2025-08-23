import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { EnhancedEventSchema } from '@/lib/validation/enhanced-schemas';
import * as ical from 'node-ical';
import { format } from 'date-fns';
import { RRule } from 'rrule';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data with uploaded file
    const formData = await request.formData();
    const file = formData.get('icsFile') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No .ics file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.ics')) {
      return NextResponse.json({ error: 'File must be a .ics calendar file' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse the iCalendar data
    let parsed;
    try {
      parsed = ical.parseICS(fileContent);
    } catch (parseError) {
      console.error('Error parsing .ics file:', parseError);
      return NextResponse.json({ error: 'Invalid .ics file format' }, { status: 400 });
    }

    const importedEvents = [];
    const errors = [];

    // Process each event in the iCalendar
    for (const key in parsed) {
      const component = parsed[key];
      
      // Only process VEVENT components
      if (component.type !== 'VEVENT') {
        continue;
      }

      try {
        // Convert iCalendar event to our event format
        const eventData = await convertICalEventToEvent(component, user.id);
        
        // Validate the event data
        const validationResult = EnhancedEventSchema.safeParse(eventData);
        if (!validationResult.success) {
          errors.push({
            title: component.summary || 'Unknown Event',
            error: 'Validation failed',
            details: validationResult.error.issues
          });
          continue;
        }

        const validatedEventData = validationResult.data;

        // Insert the event into the database
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert([validatedEventData])
          .select()
          .single();

        if (eventError) {
          console.error('Error inserting event:', eventError);
          errors.push({
            title: component.summary || 'Unknown Event',
            error: 'Database insertion failed',
            details: eventError.message
          });
          continue;
        }

        importedEvents.push(newEvent);

        // Handle recurrence if present
        if (component.rrule && newEvent.id) {
          await handleRecurrenceImport(component, newEvent.id, supabase);
        }

      } catch (error) {
        console.error('Error processing event:', error);
        errors.push({
          title: component.summary || 'Unknown Event',
          error: 'Processing failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${importedEvents.length} events`,
      imported: importedEvents.length,
      errors: errors.length,
      events: importedEvents,
      errorDetails: errors
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in POST /api/calendar/import:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Convert an iCalendar VEVENT component to our event format
 */
async function convertICalEventToEvent(component: any, userId: string) {
  const startDate = component.start ? new Date(component.start) : new Date();
  const endDate = component.end ? new Date(component.end) : new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default

  // Check if it's an all-day event
  const isAllDay = component.datetype === 'date' || 
                   (component.start && typeof component.start === 'string' && !component.start.includes('T'));

  // Format dates for database storage
  const formatDateForDB = (date: Date, allDay: boolean) => {
    if (allDay) {
      return format(date, 'yyyy-MM-dd');
    }
    return date.toISOString();
  };

  // Extract recurrence rule if present
  let recurrenceRule = null;
  if (component.rrule) {
    try {
      const rrule = new RRule(component.rrule);
      recurrenceRule = rrule.toString();
    } catch (rruleError) {
      console.warn('Error parsing RRULE:', rruleError);
    }
  }

  return {
    user_id: userId,
    title: component.summary || 'Imported Event',
    description: component.description || null,
    location: component.location || null,
    start_time: formatDateForDB(startDate, isAllDay),
    end_time: formatDateForDB(endDate, isAllDay),
    is_all_day: isAllDay,
    time_zone: component.tz || 'UTC',
    recurrence_rule: recurrenceRule,
    status: mapICalStatus(component.status),
    external_calendar_id: component.uid || null,
    external_calendar_source: 'ics_import',
    privacy_level: 'private', // Default to private for imported events
    color: null, // Will use default color
    visible_to_contacts: [],
    visible_to_groups: []
  };
}

/**
 * Map iCalendar status to our event status
 */
function mapICalStatus(icalStatus: string): 'confirmed' | 'tentative' | 'cancelled' {
  if (!icalStatus) return 'confirmed';
  
  switch (icalStatus.toUpperCase()) {
    case 'CONFIRMED':
      return 'confirmed';
    case 'TENTATIVE':
      return 'tentative';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'confirmed';
  }
}

/**
 * Handle recurrence import for recurring events
 */
async function handleRecurrenceImport(component: any, eventId: string, supabase: any) {
  try {
    if (component.recurrences) {
      // Handle modified instances of recurring events
      for (const recurrenceDate in component.recurrences) {
        const recurrence = component.recurrences[recurrenceDate];
        
        // This would require additional logic to handle recurring event exceptions
        // For now, we'll store the base recurrence rule and let the frontend handle expansion
        console.log('Recurring event instance found:', recurrenceDate, recurrence.summary);
      }
    }
  } catch (error) {
    console.error('Error handling recurrence import:', error);
  }
}