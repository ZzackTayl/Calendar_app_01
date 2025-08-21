/**
 * Time Zone Utility Functions
 * 
 * This module provides functions for handling time zones in the calendar app.
 * It includes utilities for detection, conversion, and formatting of dates
 * across different time zones.
 */
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { format, parseISO, isValid } from 'date-fns';
import spacetime from 'spacetime';
import { ValidationError } from '../validation/errors';

/**
 * Common time zones with user-friendly names
 */
export const COMMON_TIME_ZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST/NZDT)' }
];

/**
 * Detect the user's local time zone
 * @returns The IANA time zone identifier
 */
export function detectUserTimeZone(): string {
  try {
    // Primary detection method using Intl API
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Fallback for older browsers or if detection fails
    if (!timeZone) {
      // Use spacetime as fallback
      const detected = spacetime.now().timezone().name;
      if (detected) return detected;
      
      // Final fallback to UTC
      return 'UTC';
    }
    
    return timeZone;
  } catch (error) {
    console.error('Time zone detection error:', error);
    return 'UTC'; // Safe fallback
  }
}

/**
 * Get user-friendly display name for a time zone
 * @param timeZone IANA time zone identifier
 * @returns User-friendly display name
 */
export function getTimeZoneDisplayName(timeZone: string): string {
  try {
    const commonTimeZone = COMMON_TIME_ZONES.find(tz => tz.value === timeZone);
    if (commonTimeZone) return commonTimeZone.label;
    
    // Generate a display name for time zones not in our common list
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone,
      timeZoneName: 'long'
    });
    
    // Extract the time zone name from the formatted date
    const parts = formatter.formatToParts(now);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    if (timeZonePart) {
      return `${timeZone.replace('_', ' ')} (${timeZonePart.value})`;
    }
    
    // Fallback to just the time zone ID with underscores replaced by spaces
    return timeZone.replace('_', ' ');
  } catch (error) {
    console.error('Error getting time zone display name:', error);
    return timeZone; // Fallback to the ID itself
  }
}

/**
 * Convert a date from one time zone to another
 * @param date Date to convert (Date object or ISO string)
 * @param fromTimeZone Source time zone
 * @param toTimeZone Target time zone
 * @returns Date object in the target time zone
 */
export function convertTimeZone(
  date: Date | string, 
  fromTimeZone: string, 
  toTimeZone: string
): Date {
  try {
    // Ensure we have a Date object
    const dateObject = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObject)) {
      throw new ValidationError('Invalid date provided for time zone conversion');
    }
    
    // Convert to UTC first, then to the target time zone
    const utcDate = zonedTimeToUtc(dateObject, fromTimeZone);
    return utcToZonedTime(utcDate, toTimeZone);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    
    console.error('Time zone conversion error:', error);
    throw new ValidationError(`Failed to convert time between ${fromTimeZone} and ${toTimeZone}`);
  }
}

/**
 * Format a date in a specific time zone
 * @param date Date to format (Date object or ISO string)
 * @param timeZone Target time zone
 * @param formatString Format string (date-fns compatible)
 * @returns Formatted date string
 */
export function formatDateInTimeZone(
  date: Date | string, 
  timeZone: string, 
  formatString: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  try {
    // Ensure we have a Date object
    const dateObject = typeof date === 'string' ? parseISO(date) : date;
    
    if (!isValid(dateObject)) {
      throw new ValidationError('Invalid date provided for formatting');
    }
    
    return formatInTimeZone(dateObject, timeZone, formatString);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    
    console.error('Time zone formatting error:', error);
    // Fallback to UTC formatting
    const utcDate = typeof date === 'string' ? parseISO(date) : date;
    return format(utcDate, formatString) + ' (UTC)';
  }
}

/**
 * Get the current offset from UTC for a time zone
 * @param timeZone IANA time zone identifier
 * @returns Offset string like "+01:00" or "-05:00"
 */
export function getTimeZoneOffset(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', { 
      timeZone,
      timeStyle: 'long'
    });
    
    // Format the date and extract the GMT offset
    const formatted = formatter.format(now);
    const match = formatted.match(/GMT([+-]\d{1,2}(?::\d{2})?)/);
    
    if (match) {
      return match[1];
    }
    
    // Fallback method using spacetime
    const st = spacetime(now, timeZone);
    return st.timezone().current.offset;
  } catch (error) {
    console.error('Error getting time zone offset:', error);
    return '';
  }
}

/**
 * Check if a time zone is using Daylight Saving Time at a specific date
 * @param timeZone IANA time zone identifier
 * @param date Date to check (defaults to now)
 * @returns True if DST is active, false otherwise
 */
export function isTimeZoneInDST(timeZone: string, date: Date = new Date()): boolean {
  try {
    // Use spacetime to check DST status
    const st = spacetime(date, timeZone);
    return st.isDST();
  } catch (error) {
    console.error('Error checking DST status:', error);
    return false;
  }
}

/**
 * Get a list of all IANA time zones
 * @returns Array of time zone objects with value and label
 */
export function getAllTimeZones(): { value: string, label: string }[] {
  // Use our predefined list of common time zones
  // In a production app, you might want to use a more comprehensive list
  return COMMON_TIME_ZONES;
}

/**
 * Get the time zone from user preferences or detect it
 * @param userPreferredTimeZone Optional user preference
 * @returns The time zone to use
 */
export function getEffectiveTimeZone(userPreferredTimeZone?: string | null): string {
  if (userPreferredTimeZone) {
    return userPreferredTimeZone;
  }
  
  return detectUserTimeZone();
}

/**
 * Compare two dates across different time zones
 * @param date1 First date
 * @param timeZone1 First date's time zone
 * @param date2 Second date
 * @param timeZone2 Second date's time zone
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDatesAcrossTimeZones(
  date1: Date | string,
  timeZone1: string,
  date2: Date | string,
  timeZone2: string
): number {
  // Convert both dates to UTC for comparison
  const utcDate1 = zonedTimeToUtc(
    typeof date1 === 'string' ? parseISO(date1) : date1, 
    timeZone1
  );
  
  const utcDate2 = zonedTimeToUtc(
    typeof date2 === 'string' ? parseISO(date2) : date2, 
    timeZone2
  );
  
  // Compare UTC timestamps
  if (utcDate1 < utcDate2) return -1;
  if (utcDate1 > utcDate2) return 1;
  return 0;
}
