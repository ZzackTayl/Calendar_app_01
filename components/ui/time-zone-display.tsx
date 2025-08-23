'use client';

import React, { useMemo } from 'react';
import { formatDateInTimeZone, getTimeZoneOffset } from '@/lib/time-zones/time-zone-utils';
import { useTimeZone } from '@/lib/time-zones/time-zone-context';
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, Globe } from 'lucide-react';
import { Tooltip } from './tooltip';

interface TimeZoneDisplayProps {
  /**
   * Date to display (Date object or ISO string)
   */
  date: Date | string;
  
  /**
   * Optional time zone override
   * If not provided, uses the time zone from TimeZoneContext
   */
  timeZone?: string;
  
  /**
   * Format string for the date (date-fns compatible)
   */
  format?: string;
  
  /**
   * Whether to show the time zone name
   */
  showTimeZone?: boolean;
  
  /**
   * Whether to show the time zone offset
   */
  showOffset?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Optional native time zone info
   * If provided, shows time in both the display time zone and the original time zone
   */
  nativeTimeZone?: string;
  
  /**
   * Variant for display style
   */
  variant?: 'default' | 'compact' | 'tooltip';
}

/**
 * Time Zone Display Component
 * 
 * A component for displaying dates and times with proper time zone information.
 */
export function TimeZoneDisplay({
  date,
  timeZone,
  format = 'MMM d, yyyy h:mm a',
  showTimeZone = true,
  showOffset = true,
  className,
  nativeTimeZone,
  variant = 'default'
}: TimeZoneDisplayProps) {
  // Get global time zone context
  const { displayTimeZone } = useTimeZone();
  
  // Use provided time zone or fall back to context
  const effectiveTimeZone = timeZone || displayTimeZone;
  
  // Format the date in the effective time zone
  const formattedDate = useMemo(() => {
    try {
      return formatDateInTimeZone(date, effectiveTimeZone, format);
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to basic formatting
      return new Date(typeof date === 'string' ? date : date.toISOString()).toLocaleString();
    }
  }, [date, effectiveTimeZone, format]);
  
  // Get the time zone offset for display
  const offset = useMemo(() => {
    if (!showOffset) return null;
    return getTimeZoneOffset(effectiveTimeZone);
  }, [effectiveTimeZone, showOffset]);
  
  // Format native time zone date if provided
  const nativeFormattedDate = useMemo(() => {
    if (!nativeTimeZone || nativeTimeZone === effectiveTimeZone) return null;
    
    try {
      return formatDateInTimeZone(date, nativeTimeZone, format);
    } catch (error) {
      return null;
    }
  }, [date, nativeTimeZone, effectiveTimeZone, format]);
  
  // Build time zone display string
  const timeZoneDisplay = useMemo(() => {
    if (!showTimeZone) return null;
    
    const parts = [];
    
    // Just show the time zone ID for compact variant
    if (variant === 'compact') {
      return effectiveTimeZone;
    }
    
    // Add the time zone ID
    parts.push(effectiveTimeZone);
    
    // Add offset if available
    if (offset) {
      parts.push(`(${offset})`);
    }
    
    return parts.join(' ');
  }, [effectiveTimeZone, offset, showTimeZone, variant]);
  
  // Compact variant with just date and optional icon
  if (variant === 'compact') {
    return (
      <div className={cn("inline-flex items-center gap-1", className)}>
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span>{formattedDate}</span>
      </div>
    );
  }
  
  // Tooltip variant that shows more details on hover
  if (variant === 'tooltip') {
    return (
      <span 
        className={cn("border-b border-dotted border-muted-foreground/50", className)}
        title={`${effectiveTimeZone} ${offset}${nativeFormattedDate && nativeTimeZone ? `\nOriginal: ${nativeFormattedDate} (${nativeTimeZone})` : ''}`}
      >
        {formattedDate}
      </span>
    );
  }
  
  // Default variant with full information
  return (
    <div className={cn("space-y-1", className)}>
      <div className="font-medium">{formattedDate}</div>
      
      {timeZoneDisplay && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Globe className="h-3 w-3" />
          <span>{timeZoneDisplay}</span>
        </div>
      )}
      
      {nativeFormattedDate && nativeTimeZone && nativeTimeZone !== effectiveTimeZone && (
        <div className="text-xs text-muted-foreground">
          Original: {nativeFormattedDate} ({nativeTimeZone})
        </div>
      )}
    </div>
  );
}

export default TimeZoneDisplay;
