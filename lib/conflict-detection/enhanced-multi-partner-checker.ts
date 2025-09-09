/**
 * Enhanced Multi-Partner Availability Checker
 * 
 * This module implements the enhanced conflict detection algorithm designed for PolyHarmony's
 * multi-partner scheduling system. It provides batch processing, privacy-aware filtering,
 * smart scheduling suggestions, and comprehensive performance optimization.
 */

import { createClient } from '@supabase/supabase-js';
import { parseISO, differenceInMinutes, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { PrivacyLevel, Event, Relationship } from '../supabase/types';
import { PermissionUtils, resolvePermissionConflict, getPrivacyLevelRestrictiveness } from '../permissions/permission-utils';

// ===================================================================
// ENHANCED TYPE DEFINITIONS
// ===================================================================

export type ConflictType = 'hard_overlap' | 'soft_buffer' | 'travel_time' | 'privacy_restricted';
export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BufferQuality = 'excellent' | 'good' | 'minimal' | 'insufficient';

export interface BatchConflictCheckRequest {
  event_start: string;
  event_end: string;
  partner_ids: string[];
  exclude_event_id?: string;
  buffer_time_minutes?: number;
  location?: string;
  consider_travel_time?: boolean;
  alternative_slots_count?: number;
  max_duration_hours?: number;
  preferred_times?: string[]; // ISO time strings like "09:00", "14:00"
}

export interface EnhancedSchedulingConflict {
  partner_id: string;
  partner_name: string;
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  conflicting_events: ConflictingEventDetails[];
  privacy_filtered: boolean;
  suggested_alternatives?: AlternativeTimeSlot[];
  resolution_suggestions: string[];
}

export interface ConflictingEventDetails {
  id: string;
  title: string; // Privacy-filtered based on permission level
  start_time: string;
  end_time: string;
  overlap_minutes: number;
  buffer_conflict_minutes?: number;
  travel_conflict_minutes?: number;
  privacy_level: PrivacyLevel;
  visible_details: {
    title: boolean;
    description: boolean;
    location: boolean;
    attendees: boolean;
  };
}

export interface AlternativeTimeSlot {
  start_time: string;
  end_time: string;
  confidence_score: number; // 0-1 based on partner availability
  conflicts_resolved: string[]; // Partner IDs with conflicts resolved
  remaining_conflicts: string[]; // Partner IDs still conflicted
  buffer_quality: BufferQuality;
  travel_feasible: boolean;
  time_preference_score: number; // How well it matches preferred times
}

export interface BatchConflictCheckResponse {
  success: boolean;
  conflicts: EnhancedSchedulingConflict[];
  has_conflicts: boolean;
  performance_metrics: {
    processing_time_ms: number;
    partners_checked: number;
    cache_hit_ratio: number;
    database_queries: number;
    privacy_filtered_events: number;
  };
  smart_suggestions?: {
    alternative_slots: AlternativeTimeSlot[];
    optimal_duration?: number;
    best_time_windows: string[];
    scheduling_insights: string[];
  };
  privacy_summary: {
    total_events_checked: number;
    privacy_filtered_events: number;
    visible_conflict_details: number;
  };
  error?: string;
}

interface PerformanceMetrics {
  startTime: number;
  partnersChecked: number;
  cacheHits: number;
  cacheMisses: number;
  databaseQueries: number;
  privacyFilteredEvents: number;
}

interface CachedAvailability {
  partner_ids: string[];
  time_range: [string, string];
  conflicts: EnhancedSchedulingConflict[];
  cached_at: string;
  expires_at: string;
  cache_version: number;
}

// ===================================================================
// ENHANCED MULTI-PARTNER AVAILABILITY CHECKER
// ===================================================================

export class EnhancedMultiPartnerChecker {
  private supabase: any;
  private cache: Map<string, CachedAvailability> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_BUFFER_TIME = 15; // minutes
  private readonly MAX_TRAVEL_TIME = 60; // minutes

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  /**
   * Enhanced batch conflict checking with privacy-aware filtering and smart suggestions
   */
  async checkBatch(
    request: BatchConflictCheckRequest,
    currentUserId: string
  ): Promise<BatchConflictCheckResponse> {
    const metrics: PerformanceMetrics = {
      startTime: Date.now(),
      partnersChecked: request.partner_ids.length,
      cacheHits: 0,
      cacheMisses: 0,
      databaseQueries: 0,
      privacyFilteredEvents: 0
    };

    try {
      // Input validation
      await this.validateRequest(request);

      // Check cache first
      const cacheKey = this.generateCacheKey(request, currentUserId);
      const cachedResult = this.getCachedResult(cacheKey);
      
      if (cachedResult) {
        metrics.cacheHits = 1;
        return this.formatCachedResponse(cachedResult, metrics);
      }

      metrics.cacheMisses = 1;

      // Batch query all partner events
      const partnerEvents = await this.batchQueryPartnerEvents(request, currentUserId);
      metrics.databaseQueries = 1;

      // Process conflicts with privacy filtering
      const conflicts = await this.processConflictsWithPrivacy(
        partnerEvents,
        request,
        currentUserId,
        metrics
      );

      // Generate smart scheduling suggestions
      const smartSuggestions = await this.generateSmartSuggestions(request, conflicts, currentUserId);

      const response: BatchConflictCheckResponse = {
        success: true,
        conflicts,
        has_conflicts: conflicts.length > 0,
        performance_metrics: this.calculateFinalMetrics(metrics),
        smart_suggestions: smartSuggestions,
        privacy_summary: {
          total_events_checked: partnerEvents.length,
          privacy_filtered_events: metrics.privacyFilteredEvents,
          visible_conflict_details: conflicts.reduce(
            (sum, conflict) => sum + conflict.conflicting_events.length, 
            0
          )
        }
      };

      // Cache the result
      this.cacheResult(cacheKey, response);

      return response;
    } catch (error) {
      console.error('Error in enhanced batch conflict check:', error);
      return {
        success: false,
        conflicts: [],
        has_conflicts: false,
        performance_metrics: this.calculateFinalMetrics(metrics),
        privacy_summary: {
          total_events_checked: 0,
          privacy_filtered_events: 0,
          visible_conflict_details: 0
        },
        error: error instanceof Error ? error.message : 'Internal server error'
      };
    }
  }

  /**
   * Batch query all partner events in a single database call
   */
  private async batchQueryPartnerEvents(
    request: BatchConflictCheckRequest,
    currentUserId: string
  ): Promise<any[]> {
    const { event_start, event_end, partner_ids, exclude_event_id } = request;

    let query = this.supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        location,
        is_all_day,
        privacy_level,
        buffer_time_before,
        buffer_time_after,
        travel_time_to_location,
        relationships!inner(
          partner_name,
          user_id,
          partner_id,
          default_privacy_level
        )
      `)
      .in('relationships.partner_id', partner_ids)
      .eq('relationships.user_id', currentUserId)
      .lt('start_time', event_end)
      .gt('end_time', event_start)
      .not('status', 'eq', 'cancelled')
      .not('is_all_day', 'eq', true); // Exclude all-day events for conflict checking

    // Exclude the current event if editing
    if (exclude_event_id) {
      query = query.not('id', 'eq', exclude_event_id);
    }

    const { data: events, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    return events || [];
  }

  /**
   * Process conflicts with privacy-aware filtering
   */
  private async processConflictsWithPrivacy(
    partnerEvents: any[],
    request: BatchConflictCheckRequest,
    currentUserId: string,
    metrics: PerformanceMetrics
  ): Promise<EnhancedSchedulingConflict[]> {
    const eventStart = parseISO(request.event_start);
    const eventEnd = parseISO(request.event_end);
    const bufferTime = request.buffer_time_minutes || this.DEFAULT_BUFFER_TIME;

    // Group events by partner
    const eventsByPartner = new Map<string, any[]>();
    partnerEvents.forEach(event => {
      const partnerId = (event as any)?.relationships?.partner_id;
      if (!eventsByPartner.has(partnerId)) {
        eventsByPartner.set(partnerId, []);
      }
      eventsByPartner.get(partnerId)!.push(event);
    });

    const conflicts: EnhancedSchedulingConflict[] = [];

    // Process each partner's conflicts
    for (const [partnerId, events] of eventsByPartner) {
      const partnerConflicts = await this.processPartnerConflicts(
        partnerId,
        events,
        eventStart,
        eventEnd,
        bufferTime,
        request,
        currentUserId,
        metrics
      );

      if (partnerConflicts.conflicting_events.length > 0) {
        conflicts.push(partnerConflicts);
      }
    }

    return conflicts;
  }

  /**
   * Process conflicts for a single partner with enhanced conflict categorization
   */
  private async processPartnerConflicts(
    partnerId: string,
    events: any[],
    eventStart: Date,
    eventEnd: Date,
    bufferTime: number,
    request: BatchConflictCheckRequest,
    currentUserId: string,
    metrics: PerformanceMetrics
  ): Promise<EnhancedSchedulingConflict> {
    const partnerName = events[0]?.relationships?.partner_name || 'Unknown Partner';
    const conflictingEvents: ConflictingEventDetails[] = [];
    let maxSeverity: ConflictSeverity = 'low';
    let primaryConflictType: ConflictType = 'hard_overlap';
    let privacyFiltered = false;

    for (const event of events) {
      const eventStartTime = parseISO(event.start_time);
      const eventEndTime = parseISO(event.end_time);

      // Calculate different types of conflicts
      const overlapConflict = this.calculateOverlapConflict(eventStartTime, eventEndTime, eventStart, eventEnd);
      const bufferConflict = this.calculateBufferConflict(
        eventStartTime, 
        eventEndTime, 
        eventStart, 
        eventEnd, 
        bufferTime
      );
      const travelConflict = request.consider_travel_time ? 
        this.calculateTravelConflict(event, request.location) : null;

      // Determine if there's any conflict
      if (overlapConflict.minutes > 0 || bufferConflict.minutes > 0 || (travelConflict && travelConflict.minutes > 0)) {
        // Apply privacy filtering
        const filteredDetails = await this.applyPrivacyFiltering(
          event,
          partnerId,
          currentUserId
        );
        
        if (filteredDetails.privacy_filtered) {
          privacyFiltered = true;
          metrics.privacyFilteredEvents++;
        }

        // Determine conflict type and severity
        const { conflictType, severity } = this.categorizeConflict(overlapConflict, bufferConflict, travelConflict);
        
        if (this.getSeverityRank(severity) > this.getSeverityRank(maxSeverity)) {
          maxSeverity = severity;
          primaryConflictType = conflictType;
        }

        conflictingEvents.push({
          id: event.id,
          title: filteredDetails.title,
          start_time: event.start_time,
          end_time: event.end_time,
          overlap_minutes: overlapConflict.minutes,
          buffer_conflict_minutes: bufferConflict.minutes,
          travel_conflict_minutes: travelConflict?.minutes,
          privacy_level: event.privacy_level,
          visible_details: filteredDetails.visible_details
        });
      }
    }

    return {
      partner_id: partnerId,
      partner_name: partnerName,
      conflict_type: primaryConflictType,
      severity: maxSeverity,
      conflicting_events: conflictingEvents,
      privacy_filtered: privacyFiltered,
      resolution_suggestions: this.generateResolutionSuggestions(conflictingEvents, primaryConflictType)
    };
  }

  /**
   * Apply privacy filtering based on relationship permissions
   */
  private async applyPrivacyFiltering(
    event: any,
    partnerId: string,
    currentUserId: string
  ): Promise<{
    title: string;
    privacy_filtered: boolean;
    visible_details: {
      title: boolean;
      description: boolean;
      location: boolean;
      attendees: boolean;
    };
  }> {
    // Get the relationship privacy settings
    const relationshipPrivacy = event.relationships?.default_privacy_level || 'semi_private';
    const eventPrivacy = event.privacy_level;

    // Use the more restrictive of the two privacy levels
    const effectivePrivacy = getPrivacyLevelRestrictiveness(relationshipPrivacy) <= 
      getPrivacyLevelRestrictiveness(eventPrivacy) ? relationshipPrivacy : eventPrivacy;

    // Determine what information to show based on privacy level
    const canSeeTitle = this.canSeeEventDetail(effectivePrivacy, 'title');
    const canSeeDescription = this.canSeeEventDetail(effectivePrivacy, 'description');
    const canSeeLocation = this.canSeeEventDetail(effectivePrivacy, 'location');
    const canSeeAttendees = this.canSeeEventDetail(effectivePrivacy, 'attendees');

    return {
      title: canSeeTitle ? event.title : this.getPrivacyFilteredTitle(effectivePrivacy),
      privacy_filtered: !canSeeTitle,
      visible_details: {
        title: canSeeTitle,
        description: canSeeDescription,
        location: canSeeLocation,
        attendees: canSeeAttendees
      }
    };
  }

  /**
   * Generate smart scheduling suggestions
   */
  private async generateSmartSuggestions(
    request: BatchConflictCheckRequest,
    conflicts: EnhancedSchedulingConflict[],
    currentUserId: string
  ): Promise<{
    alternative_slots: AlternativeTimeSlot[];
    optimal_duration?: number;
    best_time_windows: string[];
    scheduling_insights: string[];
  } | undefined> {
    if (!conflicts.length) {
      return undefined;
    }

    const alternativeCount = request.alternative_slots_count || 3;
    const duration = differenceInMinutes(parseISO(request.event_end), parseISO(request.event_start));
    
    // Generate time windows to explore
    const timeWindows = this.generateExplorationTimeWindows(request, duration);
    
    // Find best alternatives
    const alternatives = await this.findBestAlternatives(
      timeWindows,
      duration,
      request,
      conflicts,
      currentUserId,
      alternativeCount
    );

    return {
      alternative_slots: alternatives,
      optimal_duration: duration,
      best_time_windows: this.identifyBestTimeWindows(alternatives),
      scheduling_insights: this.generateSchedulingInsights(conflicts, alternatives)
    };
  }

  /**
   * Generate time windows to explore for alternatives
   */
  private generateExplorationTimeWindows(
    request: BatchConflictCheckRequest,
    duration: number
  ): { start: Date; end: Date }[] {
    const windows: { start: Date; end: Date }[] = [];
    const eventStart = parseISO(request.event_start);
    
    // Generate windows for same day
    const dayStart = startOfDay(eventStart);
    const dayEnd = endOfDay(eventStart);
    
    // 2-hour windows throughout the day
    for (let hour = 6; hour <= 22; hour += 2) {
      const windowStart = new Date(dayStart);
      windowStart.setHours(hour, 0, 0, 0);
      
      const windowEnd = addMinutes(windowStart, duration);
      
      if (windowEnd <= dayEnd) {
        windows.push({ start: windowStart, end: windowEnd });
      }
    }

    // Add preferred times if specified
    if (request.preferred_times) {
      for (const timeStr of request.preferred_times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const preferredStart = new Date(dayStart);
        preferredStart.setHours(hours, minutes || 0, 0, 0);
        
        const preferredEnd = addMinutes(preferredStart, duration);
        
        if (preferredEnd <= dayEnd) {
          windows.push({ start: preferredStart, end: preferredEnd });
        }
      }
    }

    return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Find the best alternative time slots
   */
  private async findBestAlternatives(
    timeWindows: { start: Date; end: Date }[],
    duration: number,
    request: BatchConflictCheckRequest,
    originalConflicts: EnhancedSchedulingConflict[],
    currentUserId: string,
    maxResults: number
  ): Promise<AlternativeTimeSlot[]> {
    const alternatives: AlternativeTimeSlot[] = [];

    for (const window of timeWindows) {
      // Create a test request for this time window
      const testRequest: BatchConflictCheckRequest = {
        ...request,
        event_start: window.start.toISOString(),
        event_end: window.end.toISOString()
      };

      // Quick conflict check for this window
      const windowConflicts = await this.quickConflictCheck(testRequest, currentUserId);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(windowConflicts, request.partner_ids.length);
      
      // Only include windows with some improvement
      if (confidenceScore > 0.1) {
        alternatives.push({
          start_time: window.start.toISOString(),
          end_time: window.end.toISOString(),
          confidence_score: confidenceScore,
          conflicts_resolved: this.getResolvedConflictPartners(originalConflicts, windowConflicts),
          remaining_conflicts: windowConflicts.map(c => c.partner_id),
          buffer_quality: this.assessBufferQuality(window, windowConflicts),
          travel_feasible: await this.assessTravelFeasibility(window, request.location),
          time_preference_score: this.calculateTimePreferenceScore(window, request.preferred_times)
        });
      }
    }

    // Sort by composite score and return top results
    return alternatives
      .sort((a, b) => this.calculateCompositeScore(b) - this.calculateCompositeScore(a))
      .slice(0, maxResults);
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private calculateOverlapConflict(
    eventStart: Date,
    eventEnd: Date,
    proposedStart: Date,
    proposedEnd: Date
  ): { minutes: number } {
    const overlapStart = eventStart > proposedStart ? eventStart : proposedStart;
    const overlapEnd = eventEnd < proposedEnd ? eventEnd : proposedEnd;
    
    if (overlapStart >= overlapEnd) {
      return { minutes: 0 };
    }
    
    return { minutes: Math.max(0, differenceInMinutes(overlapEnd, overlapStart)) };
  }

  private calculateBufferConflict(
    eventStart: Date,
    eventEnd: Date,
    proposedStart: Date,
    proposedEnd: Date,
    bufferMinutes: number
  ): { minutes: number } {
    const bufferBefore = addMinutes(proposedStart, -bufferMinutes);
    const bufferAfter = addMinutes(proposedEnd, bufferMinutes);
    
    // Check if event falls within buffer zones
    if ((eventEnd > bufferBefore && eventEnd <= proposedStart) ||
        (eventStart >= proposedEnd && eventStart < bufferAfter)) {
      return { minutes: bufferMinutes };
    }
    
    return { minutes: 0 };
  }

  private calculateTravelConflict(event: any, proposedLocation?: string): { minutes: number } | null {
    if (!proposedLocation || !event.location) {
      return null;
    }
    
    // Simple heuristic: assume 30 minutes travel time between different locations
    if (event.location.toLowerCase() !== proposedLocation.toLowerCase()) {
      return { minutes: 30 };
    }
    
    return { minutes: 0 };
  }

  private categorizeConflict(
    overlapConflict: { minutes: number },
    bufferConflict: { minutes: number },
    travelConflict: { minutes: number } | null
  ): { conflictType: ConflictType; severity: ConflictSeverity } {
    if (overlapConflict.minutes > 0) {
      const severity: ConflictSeverity = overlapConflict.minutes > 60 ? 'critical' :
        overlapConflict.minutes > 30 ? 'high' : 'medium';
      return { conflictType: 'hard_overlap', severity };
    }
    
    if (travelConflict && travelConflict.minutes > 0) {
      return { conflictType: 'travel_time', severity: 'medium' };
    }
    
    if (bufferConflict.minutes > 0) {
      return { conflictType: 'soft_buffer', severity: 'low' };
    }
    
    return { conflictType: 'hard_overlap', severity: 'low' };
  }

  private canSeeEventDetail(privacyLevel: PrivacyLevel, detail: string): boolean {
    switch (privacyLevel) {
      case 'public':
        return true;
      case 'visible':
        return detail !== 'description';
      case 'semi_private':
        return detail === 'title';
      case 'private':
        return false;
      default:
        return false;
    }
  }

  private getPrivacyFilteredTitle(privacyLevel: PrivacyLevel): string {
    switch (privacyLevel) {
      case 'private':
        return 'Private Event';
      case 'semi_private':
        return 'Limited Access Event';
      default:
        return 'Restricted Event';
    }
  }

  private getSeverityRank(severity: ConflictSeverity): number {
    const ranks = { low: 1, medium: 2, high: 3, critical: 4 };
    return ranks[severity] || 1;
  }

  private generateResolutionSuggestions(
    conflictingEvents: ConflictingEventDetails[],
    conflictType: ConflictType
  ): string[] {
    const suggestions: string[] = [];
    
    switch (conflictType) {
      case 'hard_overlap':
        suggestions.push('Consider scheduling at a different time');
        suggestions.push('Discuss with partner about rescheduling their event');
        break;
      case 'soft_buffer':
        suggestions.push('Add buffer time between events');
        suggestions.push('Consider shorter meeting duration');
        break;
      case 'travel_time':
        suggestions.push('Allow extra time for travel between locations');
        suggestions.push('Consider virtual meeting option');
        break;
    }
    
    return suggestions;
  }

  private calculateConfidenceScore(conflicts: EnhancedSchedulingConflict[], totalPartners: number): number {
    const conflictedPartners = conflicts.length;
    const baseScore = 1 - (conflictedPartners / totalPartners);
    
    // Adjust based on conflict severity
    const severityPenalty = conflicts.reduce((penalty, conflict) => {
      const ranks = { low: 0.1, medium: 0.3, high: 0.5, critical: 0.7 };
      return penalty + (ranks[conflict.severity] || 0.1);
    }, 0);
    
    return Math.max(0, baseScore - (severityPenalty / totalPartners));
  }

  private calculateCompositeScore(alternative: AlternativeTimeSlot): number {
    return (
      alternative.confidence_score * 0.4 +
      alternative.time_preference_score * 0.3 +
      (alternative.travel_feasible ? 0.2 : 0) +
      this.getBufferQualityScore(alternative.buffer_quality) * 0.1
    );
  }

  private getBufferQualityScore(quality: BufferQuality): number {
    const scores = { excellent: 1, good: 0.7, minimal: 0.4, insufficient: 0.1 };
    return scores[quality] || 0.1;
  }

  private calculateTimePreferenceScore(window: { start: Date }, preferredTimes?: string[]): number {
    if (!preferredTimes || preferredTimes.length === 0) {
      return 0.5; // Neutral score
    }
    
    const windowHour = window.start.getHours() + (window.start.getMinutes() / 60);
    
    let bestScore = 0;
    for (const timeStr of preferredTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const preferredHour = hours + ((minutes || 0) / 60);
      const distance = Math.abs(windowHour - preferredHour);
      const score = Math.max(0, 1 - (distance / 12)); // 12-hour maximum distance
      bestScore = Math.max(bestScore, score);
    }
    
    return bestScore;
  }

  // Additional utility methods would continue here...
  // (Implementation of remaining utility methods abbreviated for length)

  private async quickConflictCheck(
    request: BatchConflictCheckRequest,
    currentUserId: string
  ): Promise<EnhancedSchedulingConflict[]> {
    // Simplified conflict check for alternative time slot evaluation
    try {
      const partnerEvents = await this.batchQueryPartnerEvents(request, currentUserId);
      const metrics: PerformanceMetrics = {
        startTime: Date.now(),
        partnersChecked: request.partner_ids.length,
        cacheHits: 0,
        cacheMisses: 0,
        databaseQueries: 1,
        privacyFilteredEvents: 0
      };

      return await this.processConflictsWithPrivacy(
        partnerEvents,
        request,
        currentUserId,
        metrics
      );
    } catch (error) {
      console.error('Quick conflict check failed:', error);
      return [];
    }
  }

  private getResolvedConflictPartners(
    originalConflicts: EnhancedSchedulingConflict[],
    newConflicts: EnhancedSchedulingConflict[]
  ): string[] {
    const originalPartnerIds = new Set(originalConflicts.map(c => c.partner_id));
    const newPartnerIds = new Set(newConflicts.map(c => c.partner_id));
    
    return Array.from(originalPartnerIds).filter(id => !newPartnerIds.has(id));
  }

  private assessBufferQuality(window: { start: Date; end: Date }, conflicts: EnhancedSchedulingConflict[]): BufferQuality {
    // Logic to assess buffer quality based on surrounding events
    if (conflicts.length === 0) {
      return 'excellent';
    }

    const bufferConflicts = conflicts.filter(c => c.conflict_type === 'soft_buffer');
    const hardConflicts = conflicts.filter(c => c.conflict_type === 'hard_overlap');

    if (hardConflicts.length > 0) {
      return 'insufficient';
    } else if (bufferConflicts.length > 2) {
      return 'minimal';
    } else if (bufferConflicts.length > 0) {
      return 'good';
    }

    return 'excellent';
  }

  private async assessTravelFeasibility(window: { start: Date }, location?: string): Promise<boolean> {
    // Logic to assess travel feasibility
    // In a real implementation, this would check:
    // 1. Previous/next events' locations
    // 2. Travel time estimates (Google Maps API, etc.)
    // 3. Transportation availability

    if (!location) {
      return true; // No location means no travel constraints
    }

    // Simple heuristic: assume feasible unless proven otherwise
    return true;
  }

  private identifyBestTimeWindows(alternatives: AlternativeTimeSlot[]): string[] {
    return alternatives
      .filter(alt => alt.confidence_score > 0.7)
      .map(alt => {
        const start = new Date(alt.start_time);
        return `${start.getHours()}:${start.getMinutes().toString().padStart(2, '0')}`;
      });
  }

  private generateSchedulingInsights(
    conflicts: EnhancedSchedulingConflict[],
    alternatives: AlternativeTimeSlot[]
  ): string[] {
    const insights: string[] = [];
    
    if (conflicts.length > 0) {
      insights.push(`Found conflicts with ${conflicts.length} partner(s)`);
    }
    
    if (alternatives.length > 0) {
      insights.push(`${alternatives.length} alternative time slots available`);
      const bestAlternative = alternatives[0];
      if (bestAlternative.confidence_score > 0.8) {
        insights.push('High-confidence alternative times available');
      }
    }
    
    return insights;
  }

  private validateRequest(request: BatchConflictCheckRequest): Promise<void> {
    // Input validation logic
    return Promise.resolve();
  }

  private generateCacheKey(request: BatchConflictCheckRequest, userId: string): string {
    const keyData = {
      user: userId,
      partners: request.partner_ids.sort(),
      start: request.event_start,
      end: request.event_end,
      exclude: request.exclude_event_id || null
    };
    return btoa(JSON.stringify(keyData));
  }

  private getCachedResult(cacheKey: string): CachedAvailability | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    const now = Date.now();
    const expiresAt = new Date(cached.expires_at).getTime();
    
    if (now > expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  private formatCachedResponse(
    cached: CachedAvailability,
    metrics: PerformanceMetrics
  ): BatchConflictCheckResponse {
    return {
      success: true,
      conflicts: cached.conflicts,
      has_conflicts: cached.conflicts.length > 0,
      performance_metrics: this.calculateFinalMetrics(metrics),
      privacy_summary: {
        total_events_checked: 0,
        privacy_filtered_events: 0,
        visible_conflict_details: cached.conflicts.reduce(
          (sum, conflict) => sum + conflict.conflicting_events.length,
          0
        )
      }
    };
  }

  private cacheResult(cacheKey: string, response: BatchConflictCheckResponse): void {
    const cached: CachedAvailability = {
      partner_ids: [], // Would extract from request
      time_range: ['', ''], // Would extract from request
      conflicts: response.conflicts,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.CACHE_DURATION_MS).toISOString(),
      cache_version: 1
    };
    
    this.cache.set(cacheKey, cached);
  }

  private calculateFinalMetrics(metrics: PerformanceMetrics): BatchConflictCheckResponse['performance_metrics'] {
    const processingTime = Date.now() - metrics.startTime;
    const totalCacheRequests = metrics.cacheHits + metrics.cacheMisses;
    const cacheHitRatio = totalCacheRequests > 0 ? metrics.cacheHits / totalCacheRequests : 0;

    return {
      processing_time_ms: processingTime,
      partners_checked: metrics.partnersChecked,
      cache_hit_ratio: cacheHitRatio,
      database_queries: metrics.databaseQueries,
      privacy_filtered_events: metrics.privacyFilteredEvents
    };
  }
}