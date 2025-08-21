'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { rrulestr } from 'rrule';
import { format, parseISO, isValid, isSameDay } from 'date-fns';
import { 
  generateRecurrenceOccurrences,
  getRecurrenceDescription,
  isRecurrenceException
} from '@/lib/recurrence/recurrence-utils';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { Button } from './button';
import { Repeat, Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';
import TimeZoneDisplay from './time-zone-display';

interface RecurrencePreviewProps {
  /**
   * Recurrence rule as string
   */
  rrule: string;
  
  /**
   * Start date of the first occurrence
   */
  startDate: Date | string;
  
  /**
   * End date of the first occurrence
   */
  endDate: Date | string;
  
  /**
   * Maximum number of occurrences to show
   */
  maxOccurrences?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Time zone for displaying dates
   */
  timeZone?: string;
  
  /**
   * Array of exception dates
   */
  exceptionDates?: string[];
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * Whether to initially show all occurrences
   */
  initialExpanded?: boolean;
  
  /**
   * Handler for clicking an occurrence
   */
  onOccurrenceClick?: (start: Date, end: Date, index: number) => void;
}

/**
 * Recurrence Preview Component
 * 
 * A component for displaying the occurrences of a recurring event
 */
export function RecurrencePreview({
  rrule,
  startDate,
  endDate,
  maxOccurrences = 10,
  className,
  timeZone,
  exceptionDates = [],
  compact = false,
  initialExpanded = false,
  onOccurrenceClick
}: RecurrencePreviewProps) {
  // State for expanded/collapsed view
  const [expanded, setExpanded] = useState(initialExpanded);
  
  // Parse dates if they are strings
  const start = useMemo(() => {
    if (typeof startDate === 'string') {
      return parseISO(startDate);
    }
    return startDate;
  }, [startDate]);
  
  const end = useMemo(() => {
    if (typeof endDate === 'string') {
      return parseISO(endDate);
    }
    return endDate;
  }, [endDate]);
  
  // Parse recurrence rule and generate occurrences
  const [description, occurrences] = useMemo(() => {
    try {
      // Get human-readable description
      const rule = rrulestr(rrule);
      const desc = getRecurrenceDescription(rule);
      
      // Generate occurrences
      const occs = generateRecurrenceOccurrences(
        rule,
        start,
        end,
        maxOccurrences,
        timeZone
      );
      
      return [desc, occs];
    } catch (error) {
      console.error('Error generating recurrence preview:', error);
      return ['Invalid recurrence rule', []];
    }
  }, [rrule, start, end, maxOccurrences, timeZone]);
  
  // Number of occurrences to display in collapsed view
  const visibleOccurrences = expanded ? occurrences : occurrences.slice(0, 3);
  
  // Check if there are more occurrences than shown
  const hasMore = occurrences.length > 3 && !expanded;
  
  // Return null if no valid recurrence rule
  if (!rrule || !occurrences.length) {
    return null;
  }
  
  // For compact mode, just show a badge
  if (compact) {
    return (
      <Badge variant="outline" className={cn("flex items-center gap-1", className)}>
        <Repeat className="h-3 w-3" />
        <span className="text-xs">{description}</span>
      </Badge>
    );
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center">
        <Repeat className="h-4 w-4 text-muted-foreground mr-2" />
        <h4 className="font-medium text-sm">Recurring Event</h4>
      </div>
      
      <p className="text-sm text-muted-foreground">{description}</p>
      
      <div className="space-y-2 mt-4">
        {visibleOccurrences.map((occurrence, index) => {
          const [occStart, occEnd] = occurrence;
          const isException = exceptionDates && isRecurrenceException(
            occStart, exceptionDates, timeZone
          );
          
          return (
            <div 
              key={index}
              className={cn(
                "p-2 rounded-md border",
                isException ? "opacity-50 border-dashed" : "border-solid",
                !isException && onOccurrenceClick && "cursor-pointer hover:bg-accent",
              )}
              onClick={() => {
                if (!isException && onOccurrenceClick) {
                  onOccurrenceClick(occStart, occEnd, index);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="text-sm font-medium">
                      Occurrence {index + 1}
                      {index === 0 && " (Original)"}
                    </p>
                    <TimeZoneDisplay 
                      date={occStart}
                      timeZone={timeZone}
                      format="EEE, MMM d, yyyy"
                      variant="compact"
                      showTimeZone={false}
                    />
                  </div>
                </div>
                
                {isException && (
                  <Badge variant="outline" className="text-xs">
                    <X className="h-3 w-3 mr-1" /> Exception
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
        
        {hasMore && (
          <Button 
            variant="ghost" 
            className="w-full text-sm h-auto py-2" 
            onClick={() => setExpanded(true)}
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Show {occurrences.length - 3} more occurrences
          </Button>
        )}
        
        {expanded && occurrences.length > 3 && (
          <Button 
            variant="ghost" 
            className="w-full text-sm h-auto py-2" 
            onClick={() => setExpanded(false)}
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Show fewer occurrences
          </Button>
        )}
      </div>
    </div>
  );
}

export default RecurrencePreview;
