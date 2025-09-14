import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { EnhancedMultiPartnerChecker, BatchConflictCheckRequest } from '@/lib/conflict-detection/enhanced-multi-partner-checker';
import { isAfter, parseISO, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { NextResponse } from 'next/server';

interface GroupAvailabilityRequest {
  group_ids: string[];
  time_range: {
    start: string;
    end: string;
  };
  duration_minutes: number;
  buffer_minutes?: number;
  preferred_times?: string[]; // ISO time strings like "09:00", "14:00"
}

interface GroupAvailabilityResult {
  group_id: string;
  group_name: string;
  member_count: number;
  available_members: string[];
  conflicted_members: string[];
  availability_score: number; // 0-1 based on member availability
  best_time_slots: Array<{
    start_time: string;
    end_time: string;
    available_members: string[];
    confidence_score: number;
  }>;
}

interface ConflictSummary {
  total_groups_checked: number;
  total_members_checked: number;
  groups_with_conflicts: number;
  overall_availability_score: number;
}

interface GroupAvailabilityResponse {
  success: boolean;
  group_availability: GroupAvailabilityResult[];
  optimal_time_slots: Array<{
    start_time: string;
    end_time: string;
    confidence_score: number;
    available_groups: string[];
    total_available_members: number;
  }>;
  conflict_summary: ConflictSummary;
  performance_metrics?: {
    processing_time_ms: number;
    groups_checked: number;
    database_queries: number;
    cache_hit_ratio: number;
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let databaseQueries = 0;
  let cacheHits = 0;

  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<GroupAvailabilityResponse>({
        success: false,
        group_availability: [],
        optimal_time_slots: [],
        conflict_summary: {
          total_groups_checked: 0,
          total_members_checked: 0,
          groups_with_conflicts: 0,
          overall_availability_score: 0
        },
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse the request body
    const body: GroupAvailabilityRequest = await request.json();
    const { 
      group_ids, 
      time_range, 
      duration_minutes,
      buffer_minutes = 15,
      preferred_times = []
    } = body;

    // Validate required fields
    if (!group_ids || group_ids.length === 0 || !time_range || !duration_minutes) {
      return NextResponse.json<GroupAvailabilityResponse>({
        success: false,
        group_availability: [],
        optimal_time_slots: [],
        conflict_summary: {
          total_groups_checked: 0,
          total_members_checked: 0,
          groups_with_conflicts: 0,
          overall_availability_score: 0
        },
        error: 'Missing required fields: group_ids, time_range, and duration_minutes are required'
      }, { status: 400 });
    }

    // Validate time range
    const rangeStart = parseISO(time_range.start);
    const rangeEnd = parseISO(time_range.end);

    if (isAfter(rangeStart, rangeEnd)) {
      return NextResponse.json<GroupAvailabilityResponse>({
        success: false,
        group_availability: [],
        optimal_time_slots: [],
        conflict_summary: {
          total_groups_checked: 0,
          total_members_checked: 0,
          groups_with_conflicts: 0,
          overall_availability_score: 0
        },
        error: 'Time range start must be before end'
      }, { status: 400 });
    }

    // Get group members for all requested groups
    const { data: groupMembers, error: membersError } = await supabase
      .from('relationship_group_members')
      .select(`
        group_id,
        relationship:relationships!inner(
          partner_id,
          partner_name,
          user_id
        ),
        relationship_groups!inner(
          group_name
        )
      `)
      .in('group_id', group_ids)
      .eq('relationships.user_id', user.id);

    databaseQueries++;

    if (membersError) {
      throw new Error(`Failed to fetch group members: ${membersError.message}`);
    }

    if (!groupMembers || groupMembers.length === 0) {
      return NextResponse.json<GroupAvailabilityResponse>({
        success: false,
        group_availability: [],
        optimal_time_slots: [],
        conflict_summary: {
          total_groups_checked: group_ids.length,
          total_members_checked: 0,
          groups_with_conflicts: 0,
          overall_availability_score: 1
        },
        error: 'No members found in the specified groups or insufficient permissions'
      }, { status: 404 });
    }

    // Organize members by group
    const membersByGroup = new Map<string, Array<{ partner_id: string; partner_name: string }>>();
    const groupNames = new Map<string, string>();
    
    groupMembers.forEach((member: any) => {
      const groupId = member.group_id;
      const groupName = member.relationship_groups?.group_name || 'Unknown Group';
      const partnerInfo = {
        partner_id: member.relationship?.partner_id,
        partner_name: member.relationship?.partner_name || 'Unknown Partner'
      };

      if (!membersByGroup.has(groupId)) {
        membersByGroup.set(groupId, []);
        groupNames.set(groupId, groupName);
      }
      membersByGroup.get(groupId)!.push(partnerInfo);
    });

    const enhancedChecker = new EnhancedMultiPartnerChecker(supabase);
    const groupAvailability: GroupAvailabilityResult[] = [];
    let totalMembersChecked = 0;

    // Check availability for each group
    for (const [groupId, members] of membersByGroup) {
      const partnerIds = members.map(m => m.partner_id);
      totalMembersChecked += partnerIds.length;

      // Generate time slots to check within the range
      const timeSlots = generateTimeSlots(rangeStart, rangeEnd, duration_minutes, preferred_times);
      const bestSlots: GroupAvailabilityResult['best_time_slots'] = [];

      for (const slot of timeSlots.slice(0, 10)) { // Limit to 10 slots per group for performance
        const batchRequest: BatchConflictCheckRequest = {
          event_start: slot.start_time,
          event_end: slot.end_time,
          partner_ids: partnerIds,
          buffer_time_minutes: buffer_minutes,
          consider_travel_time: false,
          alternative_slots_count: 0 // We're generating our own slots
        };

        const response = await enhancedChecker.checkBatch(batchRequest, user.id);
        databaseQueries += response.performance_metrics.database_queries;
        
        if (response.performance_metrics.cache_hit_ratio > 0) {
          cacheHits++;
        }

        // Calculate available members for this slot
        const conflictedPartnerIds = new Set(response.conflicts.map(c => c.partner_id));
        const availableMembers = partnerIds.filter(id => !conflictedPartnerIds.has(id));
        const confidenceScore = availableMembers.length / partnerIds.length;

        bestSlots.push({
          start_time: slot.start_time,
          end_time: slot.end_time,
          available_members: availableMembers,
          confidence_score: confidenceScore
        });
      }

      // Sort by confidence score and take the best ones
      bestSlots.sort((a, b) => b.confidence_score - a.confidence_score);

      // Calculate overall group availability score
      const availabilityScore = bestSlots.length > 0 ? 
        bestSlots.slice(0, 3).reduce((sum, slot) => sum + slot.confidence_score, 0) / 3 : 0;

      // Find the best overall availability for this group
      const bestSlot = bestSlots[0];
      const availableMembers = bestSlot ? bestSlot.available_members : [];
      const conflictedMembers = partnerIds.filter(id => !availableMembers.includes(id));

      groupAvailability.push({
        group_id: groupId,
        group_name: groupNames.get(groupId)!,
        member_count: members.length,
        available_members: availableMembers,
        conflicted_members: conflictedMembers,
        availability_score: availabilityScore,
        best_time_slots: bestSlots.slice(0, 5) // Return top 5 slots
      });
    }

    // Generate optimal time slots across all groups
    const optimalSlots = findOptimalTimeSlots(groupAvailability, duration_minutes);

    // Calculate conflict summary
    const conflictSummary: ConflictSummary = {
      total_groups_checked: group_ids.length,
      total_members_checked: totalMembersChecked,
      groups_with_conflicts: groupAvailability.filter(g => g.conflicted_members.length > 0).length,
      overall_availability_score: groupAvailability.reduce((sum, g) => sum + g.availability_score, 0) / groupAvailability.length
    };

    const processingTime = Date.now() - startTime;

    return NextResponse.json<GroupAvailabilityResponse>({
      success: true,
      group_availability: groupAvailability,
      optimal_time_slots: optimalSlots,
      conflict_summary: conflictSummary,
      performance_metrics: {
        processing_time_ms: processingTime,
        groups_checked: group_ids.length,
        database_queries: databaseQueries,
        cache_hit_ratio: cacheHits / Math.max(1, group_ids.length)
      }
    });

  } catch (error) {
    console.error('Error in group availability check:', error);
    const processingTime = Date.now() - startTime;

    return NextResponse.json<GroupAvailabilityResponse>({
      success: false,
      group_availability: [],
      optimal_time_slots: [],
      conflict_summary: {
        total_groups_checked: 0,
        total_members_checked: 0,
        groups_with_conflicts: 0,
        overall_availability_score: 0
      },
      performance_metrics: {
        processing_time_ms: processingTime,
        groups_checked: 0,
        database_queries: databaseQueries,
        cache_hit_ratio: 0
      },
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Generate time slots within the specified range
 */
function generateTimeSlots(
  rangeStart: Date,
  rangeEnd: Date,
  durationMinutes: number,
  preferredTimes: string[]
): Array<{ start_time: string; end_time: string }> {
  const slots: Array<{ start_time: string; end_time: string }> = [];
  
  // Generate slots based on preferred times first
  if (preferredTimes.length > 0) {
    const dayStart = startOfDay(rangeStart);
    
    for (const timeStr of preferredTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const slotStart = new Date(dayStart);
      slotStart.setHours(hours, minutes || 0, 0, 0);
      
      // Only include if within range
      if (slotStart >= rangeStart && slotStart <= rangeEnd) {
        const slotEnd = addMinutes(slotStart, durationMinutes);
        if (slotEnd <= rangeEnd) {
          slots.push({
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString()
          });
        }
      }
    }
  }
  
  // Generate regular hourly slots if no preferred times or to fill gaps
  if (slots.length < 5) {
    let currentTime = new Date(rangeStart);
    
    while (currentTime < rangeEnd) {
      const slotEnd = addMinutes(currentTime, durationMinutes);
      
      if (slotEnd <= rangeEnd) {
        slots.push({
          start_time: currentTime.toISOString(),
          end_time: slotEnd.toISOString()
        });
      }
      
      // Move to next hour
      currentTime = addMinutes(currentTime, 60);
    }
  }
  
  return slots.slice(0, 20); // Limit to 20 slots for performance
}

/**
 * Find optimal time slots across all groups
 */
function findOptimalTimeSlots(
  groupAvailability: GroupAvailabilityResult[],
  durationMinutes: number
): Array<{
  start_time: string;
  end_time: string;
  confidence_score: number;
  available_groups: string[];
  total_available_members: number;
}> {
  const slotMap = new Map<string, {
    groups: string[];
    totalMembers: number;
    totalAvailable: number;
  }>();

  // Aggregate slots across all groups
  groupAvailability.forEach(group => {
    group.best_time_slots.forEach(slot => {
      const key = `${slot.start_time}-${slot.end_time}`;
      
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          groups: [],
          totalMembers: 0,
          totalAvailable: 0
        });
      }
      
      const slotData = slotMap.get(key)!;
      slotData.groups.push(group.group_id);
      slotData.totalMembers += group.member_count;
      slotData.totalAvailable += slot.available_members.length;
    });
  });

  // Convert to optimal slots format and sort by quality
  const optimalSlots = Array.from(slotMap.entries()).map(([key, data]) => {
    const [start_time, end_time] = key.split('-');
    const confidence_score = data.totalAvailable / Math.max(1, data.totalMembers);
    
    return {
      start_time,
      end_time,
      confidence_score,
      available_groups: data.groups,
      total_available_members: data.totalAvailable
    };
  });

  return optimalSlots
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, 10); // Return top 10 optimal slots
}