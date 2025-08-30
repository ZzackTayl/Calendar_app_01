import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { EnhancedMultiPartnerChecker, BatchConflictCheckRequest, BatchConflictCheckResponse } from '@/lib/conflict-detection/enhanced-multi-partner-checker';
import { isAfter, parseISO } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<BatchConflictCheckResponse>({
        success: false,
        conflicts: [],
        has_conflicts: false,
        performance_metrics: {
          processing_time_ms: 0,
          partners_checked: 0,
          cache_hit_ratio: 0,
          database_queries: 0,
          privacy_filtered_events: 0
        },
        privacy_summary: {
          total_events_checked: 0,
          privacy_filtered_events: 0,
          visible_conflict_details: 0
        },
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse the request body
    const body: BatchConflictCheckRequest = await request.json();
    const { 
      event_start, 
      event_end, 
      partner_ids, 
      exclude_event_id,
      buffer_time_minutes = 15,
      location,
      consider_travel_time = false,
      alternative_slots_count = 3,
      max_duration_hours = 8,
      preferred_times = []
    } = body;

    // Validate required fields
    if (!event_start || !event_end || !partner_ids || partner_ids.length === 0) {
      return NextResponse.json<BatchConflictCheckResponse>({
        success: false,
        conflicts: [],
        has_conflicts: false,
        performance_metrics: {
          processing_time_ms: 0,
          partners_checked: 0,
          cache_hit_ratio: 0,
          database_queries: 0,
          privacy_filtered_events: 0
        },
        privacy_summary: {
          total_events_checked: 0,
          privacy_filtered_events: 0,
          visible_conflict_details: 0
        },
        error: 'Missing required fields: event_start, event_end, and partner_ids are required'
      }, { status: 400 });
    }

    const eventStart = parseISO(event_start);
    const eventEnd = parseISO(event_end);

    // Validate date range
    if (isAfter(eventStart, eventEnd)) {
      return NextResponse.json<BatchConflictCheckResponse>({
        success: false,
        conflicts: [],
        has_conflicts: false,
        performance_metrics: {
          processing_time_ms: 0,
          partners_checked: 0,
          cache_hit_ratio: 0,
          database_queries: 0,
          privacy_filtered_events: 0
        },
        privacy_summary: {
          total_events_checked: 0,
          privacy_filtered_events: 0,
          visible_conflict_details: 0
        },
        error: 'Event start time must be before end time'
      }, { status: 400 });
    }

    // Validate partner count (reasonable limit for performance)
    if (partner_ids.length > 50) {
      return NextResponse.json<BatchConflictCheckResponse>({
        success: false,
        conflicts: [],
        has_conflicts: false,
        performance_metrics: {
          processing_time_ms: 0,
          partners_checked: 0,
          cache_hit_ratio: 0,
          database_queries: 0,
          privacy_filtered_events: 0
        },
        privacy_summary: {
          total_events_checked: 0,
          privacy_filtered_events: 0,
          visible_conflict_details: 0
        },
        error: 'Too many partners specified. Maximum 50 partners allowed per request.'
      }, { status: 400 });
    }

    // Initialize the enhanced checker
    const enhancedChecker = new EnhancedMultiPartnerChecker(supabase);
    
    // Execute the batch conflict check
    const response = await enhancedChecker.checkBatch({
      event_start,
      event_end,
      partner_ids,
      exclude_event_id,
      buffer_time_minutes,
      location,
      consider_travel_time,
      alternative_slots_count,
      max_duration_hours,
      preferred_times
    }, user.id);

    return NextResponse.json<BatchConflictCheckResponse>(response);

  } catch (error) {
    console.error('Error in batch conflict check:', error);
    return NextResponse.json<BatchConflictCheckResponse>({
      success: false,
      conflicts: [],
      has_conflicts: false,
      performance_metrics: {
        processing_time_ms: 0,
        partners_checked: 0,
        cache_hit_ratio: 0,
        database_queries: 0,
        privacy_filtered_events: 0
      },
      privacy_summary: {
        total_events_checked: 0,
        privacy_filtered_events: 0,
        visible_conflict_details: 0
      },
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}