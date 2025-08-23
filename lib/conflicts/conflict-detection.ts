import { Event } from '@/lib/supabase/types';
import { RRule } from 'rrule';

export interface Conflict {
  type: 'overlap' | 'travel_time' | 'recurring';
  severity: 'warning' | 'error';
  message: string;
  conflictingEvent: Event;
  details?: {
    overlapMinutes?: number;
    travelTimeMinutes?: number;
    conflictingInstances?: Date[];
  };
}

export interface ConflictDetectionOptions {
  includeTravelTime?: boolean;
  travelTimeBuffer?: number; // minutes
  maxRecurringInstances?: number;
  timeZone?: string;
}

export class ConflictDetectionService {
  private options: Required<ConflictDetectionOptions>;

  constructor(options: ConflictDetectionOptions = {}) {
    this.options = {
      includeTravelTime: options.includeTravelTime ?? true,
      travelTimeBuffer: options.travelTimeBuffer ?? 15, // 15 minutes default
      maxRecurringInstances: options.maxRecurringInstances ?? 100,
      timeZone: options.timeZone ?? 'UTC',
    };
  }

  /**
   * Detect conflicts for a new or updated event
   */
  async detectConflicts(
    event: Event,
    existingEvents: Event[],
    options?: ConflictDetectionOptions
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const mergedOptions = { ...this.options, ...options };

    // Filter events to relevant time range
    const relevantEvents = this.filterRelevantEvents(event, existingEvents);

    // Check for direct time overlaps
    const overlapConflicts = this.detectTimeOverlaps(event, relevantEvents);
    conflicts.push(...overlapConflicts);

    // Check for travel time conflicts if locations are specified
    if (mergedOptions.includeTravelTime && event.location) {
      const travelConflicts = this.detectTravelTimeConflicts(event, relevantEvents, mergedOptions);
      conflicts.push(...travelConflicts);
    }

    // Check for recurring event conflicts
    if ((event as any).recurrence_rule) {
      const recurringConflicts = this.detectRecurringConflicts(event, relevantEvents, mergedOptions);
      conflicts.push(...recurringConflicts);
    }

    return conflicts;
  }

  /**
   * Filter events to only those that might conflict with the given event
   */
  private filterRelevantEvents(event: Event, allEvents: Event[]): Event[] {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    // Expand the search window to include travel time and buffer
    const searchStart = new Date(eventStart.getTime() - (this.options.travelTimeBuffer * 60 * 1000));
    const searchEnd = new Date(eventEnd.getTime() + (this.options.travelTimeBuffer * 60 * 1000));

    return allEvents.filter(existingEvent => {
      // Skip the event itself if it's an update
      if (existingEvent.id === event.id) {
        return false;
      }

      const existingStart = new Date(existingEvent.start_time);
      const existingEnd = new Date(existingEvent.end_time);

      // Check if events overlap in time
      return existingStart < searchEnd && existingEnd > searchStart;
    });
  }

  /**
   * Detect direct time overlaps between events
   */
  private detectTimeOverlaps(event: Event, relevantEvents: Event[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    for (const existingEvent of relevantEvents) {
      const existingStart = new Date(existingEvent.start_time);
      const existingEnd = new Date(existingEvent.end_time);

      // Check for overlap
      if (eventStart < existingEnd && eventEnd > existingStart) {
        const overlapStart = new Date(Math.max(eventStart.getTime(), existingStart.getTime()));
        const overlapEnd = new Date(Math.min(eventEnd.getTime(), existingEnd.getTime()));
        const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);

        conflicts.push({
          type: 'overlap',
          severity: overlapMinutes > 30 ? 'error' : 'warning',
          message: `This event overlaps with "${existingEvent.title}" by ${Math.round(overlapMinutes)} minutes`,
          conflictingEvent: existingEvent,
          details: {
            overlapMinutes: Math.round(overlapMinutes),
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect travel time conflicts
   */
  private detectTravelTimeConflicts(
    event: Event, 
    relevantEvents: Event[], 
    options: Required<ConflictDetectionOptions>
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    if (!event.location) {
      return conflicts;
    }

    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    for (const existingEvent of relevantEvents) {
      if (!existingEvent.location || existingEvent.location === event.location) {
        continue;
      }

      const existingStart = new Date(existingEvent.start_time);
      const existingEnd = new Date(existingEvent.end_time);

      // Check if there's insufficient travel time between events
      const timeBetweenEvents = this.calculateTimeBetweenEvents(
        existingEnd, 
        eventStart, 
        existingEvent.location, 
        event.location
      );

      if (timeBetweenEvents < options.travelTimeBuffer) {
        conflicts.push({
          type: 'travel_time',
          severity: 'warning',
          message: `Insufficient travel time between "${existingEvent.title}" and this event. Estimated travel time: ${Math.round(timeBetweenEvents)} minutes`,
          conflictingEvent: existingEvent,
          details: {
            travelTimeMinutes: Math.round(timeBetweenEvents),
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts with recurring events
   */
  private detectRecurringConflicts(
    event: Event, 
    relevantEvents: Event[], 
    options: Required<ConflictDetectionOptions>
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const existingEvent of relevantEvents) {
      if (!(existingEvent as any).recurrence_rule) {
        continue;
      }

      try {
        const rrule = RRule.fromString((existingEvent as any).recurrence_rule);
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);

        // Generate recurring instances within a reasonable timeframe
        const searchStart = new Date(eventStart.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days before
        const searchEnd = new Date(eventEnd.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days after

        const instances = rrule.between(searchStart, searchEnd, true);
        const conflictingInstances: Date[] = [];

        for (const instance of instances.slice(0, options.maxRecurringInstances)) {
          const instanceStart = new Date(instance);
          const instanceEnd = new Date(instanceStart.getTime() + this.getEventDuration(existingEvent) * 60 * 1000);

          // Check for overlap
          if (eventStart < instanceEnd && eventEnd > instanceStart) {
            conflictingInstances.push(instance);
          }
        }

        if (conflictingInstances.length > 0) {
          conflicts.push({
            type: 'recurring',
            severity: conflictingInstances.length > 3 ? 'error' : 'warning',
            message: `This event conflicts with ${conflictingInstances.length} instances of the recurring event "${existingEvent.title}"`,
            conflictingEvent: existingEvent,
            details: {
              conflictingInstances,
            },
          });
        }
      } catch (error) {
        console.error('Error parsing recurrence rule:', error);
      }
    }

    return conflicts;
  }

  /**
   * Calculate estimated travel time between two locations
   */
  private calculateTimeBetweenEvents(
    endTime: Date, 
    startTime: Date, 
    fromLocation: string, 
    toLocation: string
  ): number {
    // This is a simplified calculation
    // In a real implementation, you would use a mapping service API
    
    // For now, return a reasonable estimate based on time difference
    const timeDiff = startTime.getTime() - endTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    // If locations are different, assume some travel time is needed
    if (fromLocation !== toLocation && minutesDiff < 60) {
      return Math.max(15, minutesDiff); // Minimum 15 minutes travel time
    }

    return minutesDiff;
  }

  /**
   * Get event duration in minutes
   */
  private getEventDuration(event: Event): number {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  }

  /**
   * Check if an event has any conflicts
   */
  hasConflicts(conflicts: Conflict[]): boolean {
    return conflicts.some(conflict => conflict.severity === 'error');
  }

  /**
   * Get conflicts by severity
   */
  getConflictsBySeverity(conflicts: Conflict[], severity: 'warning' | 'error'): Conflict[] {
    return conflicts.filter(conflict => conflict.severity === severity);
  }

  /**
   * Get a summary of conflicts
   */
  getConflictSummary(conflicts: Conflict[]): {
    total: number;
    errors: number;
    warnings: number;
    hasErrors: boolean;
  } {
    const errors = conflicts.filter(c => c.severity === 'error').length;
    const warnings = conflicts.filter(c => c.severity === 'warning').length;

    return {
      total: conflicts.length,
      errors,
      warnings,
      hasErrors: errors > 0,
    };
  }
}
