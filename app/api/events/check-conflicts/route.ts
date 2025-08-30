import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { ConflictCheckRequest, ConflictCheckResponse, SchedulingConflict } from '@/lib/supabase/types';
import { isAfter, isBefore, parseISO, differenceInMinutes } from 'date-fns';
import { EnhancedMultiPartnerChecker, BatchConflictCheckRequest } from '@/lib/conflict-detection/enhanced-multi-partner-checker';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
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

    // Use enhanced checker for improved performance and privacy-awareness
    const enhancedChecker = new EnhancedMultiPartnerChecker(supabase);
    
    // Convert legacy request to enhanced batch format
    const batchRequest: BatchConflictCheckRequest = {
      event_start,
      event_end,
      partner_ids,
      exclude_event_id,
      buffer_time_minutes: 15, // Default buffer time
      consider_travel_time: false, // Conservative default for backwards compatibility
      alternative_slots_count: 3 // Generate alternatives for better UX
    };

    const batchResponse = await enhancedChecker.checkBatch(batchRequest, user.id);

    // Convert enhanced conflicts back to legacy format for backward compatibility
    const legacyConflicts: SchedulingConflict[] = batchResponse.conflicts.map(enhancedConflict => ({
      partner_id: enhancedConflict.partner_id,
      partner_name: enhancedConflict.partner_name,
      conflicting_events: enhancedConflict.conflicting_events.map(event => ({
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
        overlap_minutes: event.overlap_minutes
      }))
    }));

    return NextResponse.json<ConflictCheckResponse>({
      success: batchResponse.success,
      conflicts: legacyConflicts,
      has_conflicts: batchResponse.has_conflicts,
      error: batchResponse.error
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
