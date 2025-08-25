import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { ConflictCheckRequest, ConflictCheckResponse, SchedulingConflict } from '@/lib/supabase/types';
import { isAfter, isBefore, parseISO, differenceInMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ConflictCheckResponse>({
        success: false,
        conflicts: [],
        has_conflicts: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse the request body
    const body: ConflictCheckRequest = await request.json();
    const { event_start, event_end, partner_ids, exclude_event_id } = body;

    // Validate required fields
    if (!event_start || !event_end || !partner_ids || partner_ids.length === 0) {
      return NextResponse.json<ConflictCheckResponse>({
        success: false,
        conflicts: [],
        has_conflicts: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const eventStart = parseISO(event_start);
    const eventEnd = parseISO(event_end);

    // Validate date range
    if (isAfter(eventStart, eventEnd)) {
      return NextResponse.json<ConflictCheckResponse>({
        success: false,
        conflicts: [],
        has_conflicts: false,
        error: 'Event start time must be before end time'
      }, { status: 400 });
    }

    const conflicts: SchedulingConflict[] = [];

    // Check for conflicts with each partner
    for (const partnerId of partner_ids) {
      // Get partner's events that overlap with the proposed time
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          end_time,
          is_all_day,
          relationships!inner(
            partner_name,
            user_id
          )
        `)
        .eq('relationships.user_id', partnerId)
        .or(`start_time.lt.${event_end},end_time.gt.${event_start}`)
        .not('is_all_day', 'eq', true); // Exclude all-day events for now

      // Exclude the current event if editing
      if (exclude_event_id) {
        query = query.neq('id', exclude_event_id);
      }

      const { data: conflictingEvents, error: eventsError } = await query;

      if (eventsError) {
        console.error('Error fetching conflicting events:', eventsError);
        continue;
      }

      if (conflictingEvents && conflictingEvents.length > 0) {
        // Get partner name
        const partnerName = (conflictingEvents[0] as any)?.relationships?.partner_name || 'Unknown Partner';

        // Calculate overlap details
        const conflictingEventDetails = conflictingEvents.map(event => {
          const eventStartTime = parseISO(event.start_time);
          const eventEndTime = parseISO(event.end_time);
          
          // Calculate overlap
          const overlapStart = isAfter(eventStartTime, eventStart) ? eventStartTime : eventStart;
          const overlapEnd = isBefore(eventEndTime, eventEnd) ? eventEndTime : eventEnd;
          const overlapMinutes = differenceInMinutes(overlapEnd, overlapStart);

          return {
            id: event.id,
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time,
            overlap_minutes: Math.max(0, overlapMinutes)
          };
        }).filter(event => event.overlap_minutes > 0);

        if (conflictingEventDetails.length > 0) {
          conflicts.push({
            partner_id: partnerId,
            partner_name: partnerName,
            conflicting_events: conflictingEventDetails
          });
        }
      }
    }

    return NextResponse.json<ConflictCheckResponse>({
      success: true,
      conflicts,
      has_conflicts: conflicts.length > 0
    });

  } catch (error) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json<ConflictCheckResponse>({
      success: false,
      conflicts: [],
      has_conflicts: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
