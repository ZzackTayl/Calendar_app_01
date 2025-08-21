/**
 * Recurrence Utility Functions
 * 
 * This module provides functions for handling recurring events using the iCalendar
 * recurrence rule (RRULE) standard via the rrule.js library.
 */
import { RRule, RRuleSet, rrulestr, Options as RRuleOptions, Frequency } from 'rrule';
import { parseISO, format, addMinutes, addHours, differenceInMinutes, isBefore, isAfter } from 'date-fns';
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { ValidationError } from '../validation/errors';

/**
 * Common frequencies for recurrence rules
 */
export const RECURRENCE_FREQUENCIES = [
  { value: RRule.DAILY, label: 'Daily' },
  { value: RRule.WEEKLY, label: 'Weekly' },
  { value: RRule.MONTHLY, label: 'Monthly' },
  { value: RRule.YEARLY, label: 'Yearly' }
];

/**
 * Days of the week for recurrence rules
 */
export const DAYS_OF_WEEK = [
  { value: RRule.MO, label: 'Monday', shortLabel: 'Mon' },
  { value: RRule.TU, label: 'Tuesday', shortLabel: 'Tue' },
  { value: RRule.WE, label: 'Wednesday', shortLabel: 'Wed' },
  { value: RRule.TH, label: 'Thursday', shortLabel: 'Thu' },
  { value: RRule.FR, label: 'Friday', shortLabel: 'Fri' },
  { value: RRule.SA, label: 'Saturday', shortLabel: 'Sat' },
  { value: RRule.SU, label: 'Sunday', shortLabel: 'Sun' }
];

/**
 * Positions for recurrence rules (e.g., first Monday, last Friday)
 */
export const POSITIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: -1, label: 'Last' }
];

/**
 * Commonly used interval presets
 */
export const INTERVAL_PRESETS = [
  { frequency: RRule.DAILY, interval: 1, label: 'Every day' },
  { frequency: RRule.DAILY, interval: 2, label: 'Every other day' },
  { frequency: RRule.WEEKLY, interval: 1, label: 'Every week' },
  { frequency: RRule.WEEKLY, interval: 2, label: 'Every other week' },
  { frequency: RRule.MONTHLY, interval: 1, label: 'Every month' },
  { frequency: RRule.MONTHLY, interval: 3, label: 'Every quarter' },
  { frequency: RRule.YEARLY, interval: 1, label: 'Every year' }
];

/**
 * Type definitions for our recurring event pattern
 */
export interface RecurrencePattern {
  frequency: Frequency; // DAILY, WEEKLY, MONTHLY, YEARLY
  interval?: number; // How often the event repeats (1 = every time, 2 = every other, etc.)
  count?: number; // Number of occurrences
  until?: Date; // End date for recurrence
  byDay?: number[]; // Days of week (0 = Monday, 6 = Sunday)
  byMonthDay?: number[]; // Days of month (1-31)
  byMonth?: number[]; // Months (1-12)
  bySetPos?: number[]; // Positions (e.g., 1 = first, -1 = last)
  weekStart?: number; // Start day of week (0 = Monday, 6 = Sunday)
}

/**
 * Convert a recurrence pattern to an RRule options object
 * @param pattern RecurrencePattern object
 * @param startDate Start date for the recurrence
 * @returns RRuleOptions object
 */
export function patternToRRuleOptions(
  pattern: RecurrencePattern,
  startDate: Date
): RRuleOptions {
  const options: RRuleOptions = {
    freq: pattern.frequency,
    dtstart: startDate,
    interval: pattern.interval || 1
  };

  // Optional properties
  if (pattern.count) options.count = pattern.count;
  if (pattern.until) options.until = pattern.until;
  if (pattern.byDay && pattern.byDay.length) {
    options.byweekday = pattern.byDay.map(dayIndex => {
      switch (dayIndex) {
        case 0: return RRule.MO;
        case 1: return RRule.TU;
        case 2: return RRule.WE;
        case 3: return RRule.TH;
        case 4: return RRule.FR;
        case 5: return RRule.SA;
        case 6: return RRule.SU;
        default: return RRule.MO;
      }
    });
  }
  if (pattern.byMonthDay && pattern.byMonthDay.length) options.bymonthday = pattern.byMonthDay;
  if (pattern.byMonth && pattern.byMonth.length) options.bymonth = pattern.byMonth;
  if (pattern.bySetPos && pattern.bySetPos.length) options.bysetpos = pattern.bySetPos;
  if (pattern.weekStart !== undefined) options.wkst = pattern.weekStart;

  return options;
}

/**
 * Create an RRule object from a recurrence pattern
 * @param pattern RecurrencePattern object
 * @param startDate Start date for the recurrence
 * @returns RRule object
 */
export function createRRule(pattern: RecurrencePattern, startDate: Date): RRule {
  return new RRule(patternToRRuleOptions(pattern, startDate));
}

/**
 * Convert an RRule string to a recurrence pattern
 * @param rruleString RRule string
 * @returns RecurrencePattern object
 */
export function rruleToPattern(rruleString: string): RecurrencePattern {
  try {
    const rrule = rrulestr(rruleString);
    const options = rrule.options;
    
    const pattern: RecurrencePattern = {
      frequency: options.freq
    };
    
    if (options.interval !== 1) pattern.interval = options.interval;
    if (options.count) pattern.count = options.count;
    if (options.until) pattern.until = options.until;
    
    // Convert byweekday to our byDay format
    if (options.byweekday && options.byweekday.length) {
      pattern.byDay = options.byweekday.map(day => {
        if (typeof day === 'number') return day;
        return day.weekday;
      });
    }
    
    if (options.bymonthday && options.bymonthday.length) {
      pattern.byMonthDay = options.bymonthday;
    }
    
    if (options.bymonth && options.bymonth.length) {
      pattern.byMonth = options.bymonth;
    }
    
    if (options.bysetpos && options.bysetpos.length) {
      pattern.bySetPos = options.bysetpos;
    }
    
    if (options.wkst !== undefined) {
      pattern.weekStart = options.wkst;
    }
    
    return pattern;
  } catch (error) {
    console.error('Error converting RRule string to pattern:', error);
    throw new ValidationError('Invalid recurrence rule string');
  }
}

/**
 * Generate dates for a recurring event
 * @param rrule RRule object or string
 * @param startDate Start date of the first occurrence
 * @param endDate End date of the first occurrence
 * @param limit Maximum number of occurrences to generate
 * @param timeZone Time zone for the dates
 * @returns Array of date pairs [startDate, endDate]
 */
export function generateRecurrenceOccurrences(
  rrule: RRule | string,
  startDate: Date | string,
  endDate: Date | string,
  limit: number = 10,
  timeZone: string = 'UTC'
): [Date, Date][] {
  try {
    // Parse dates if they are strings
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid start or end date');
    }
    
    // Calculate event duration in minutes
    const durationMinutes = differenceInMinutes(end, start);
    
    // Create RRule object if string is provided
    const rule = typeof rrule === 'string' ? rrulestr(rrule) : rrule;
    
    // Generate occurrence start dates
    const occurrenceDates = rule.all((_, max) => max < limit);
    
    // Calculate start and end dates for each occurrence
    return occurrenceDates.map(date => {
      // Calculate end date by adding the duration
      const occurrenceEnd = addMinutes(date, durationMinutes);
      return [date, occurrenceEnd] as [Date, Date];
    });
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    
    console.error('Error generating recurrence dates:', error);
    throw new ValidationError('Failed to generate recurrence dates');
  }
}

/**
 * Generate human-readable description of a recurrence rule
 * @param rrule RRule object or string
 * @param timeZone Time zone for the dates
 * @returns Human-readable description
 */
export function getRecurrenceDescription(
  rrule: RRule | string,
  timeZone: string = 'UTC'
): string {
  try {
    const rule = typeof rrule === 'string' ? rrulestr(rrule) : rrule;
    return rule.toText();
  } catch (error) {
    console.error('Error getting recurrence description:', error);
    return 'Custom recurrence';
  }
}

/**
 * Create an RRule string from a recurrence pattern
 * @param pattern RecurrencePattern object
 * @param startDate Start date for the recurrence
 * @returns RRule string
 */
export function createRRuleString(pattern: RecurrencePattern, startDate: Date): string {
  const rrule = createRRule(pattern, startDate);
  return rrule.toString();
}

/**
 * Check if a date is an exception to a recurrence rule
 * @param date Date to check
 * @param exceptionDates Array of exception dates (ISO strings)
 * @param timeZone Time zone for comparison
 * @returns True if the date is an exception
 */
export function isRecurrenceException(
  date: Date,
  exceptionDates: string[],
  timeZone: string = 'UTC'
): boolean {
  if (!exceptionDates || !exceptionDates.length) {
    return false;
  }
  
  // Convert date to the specified time zone
  const zonedDate = utcToZonedTime(date, timeZone);
  const formattedDate = format(zonedDate, 'yyyy-MM-dd');
  
  // Check if the date is in the exceptions list
  return exceptionDates.some(exceptionDate => {
    // Parse exception date as UTC and convert to specified time zone
    const exDate = utcToZonedTime(parseISO(exceptionDate), timeZone);
    const formattedExDate = format(exDate, 'yyyy-MM-dd');
    return formattedDate === formattedExDate;
  });
}

/**
 * Add an exception to a recurrence rule
 * @param exceptionDates Array of existing exception dates
 * @param newException Date to add as exception
 * @returns Updated array of exception dates
 */
export function addRecurrenceException(
  exceptionDates: string[] = [],
  newException: Date | string
): string[] {
  // Parse date if it's a string
  const exceptionDate = typeof newException === 'string' 
    ? parseISO(newException) 
    : newException;
  
  if (!exceptionDate || isNaN(exceptionDate.getTime())) {
    throw new ValidationError('Invalid exception date');
  }
  
  // Format as ISO string
  const exceptionISOString = exceptionDate.toISOString();
  
  // Check if exception already exists
  if (exceptionDates.includes(exceptionISOString)) {
    return exceptionDates;
  }
  
  // Return updated array
  return [...exceptionDates, exceptionISOString];
}

/**
 * Remove an exception from a recurrence rule
 * @param exceptionDates Array of existing exception dates
 * @param exceptionToRemove Date to remove from exceptions
 * @returns Updated array of exception dates
 */
export function removeRecurrenceException(
  exceptionDates: string[] = [],
  exceptionToRemove: Date | string
): string[] {
  // Parse date if it's a string
  const exceptionDate = typeof exceptionToRemove === 'string' 
    ? parseISO(exceptionToRemove) 
    : exceptionToRemove;
  
  if (!exceptionDate || isNaN(exceptionDate.getTime())) {
    throw new ValidationError('Invalid exception date');
  }
  
  // Format as ISO string
  const exceptionISOString = exceptionDate.toISOString();
  
  // Return filtered array
  return exceptionDates.filter(date => date !== exceptionISOString);
}

/**
 * Get next occurrence of a recurring event
 * @param rrule RRule object or string
 * @param after Date to start looking from (default: now)
 * @param exceptionDates Array of exception dates
 * @param timeZone Time zone for comparison
 * @returns Next occurrence date or null if none
 */
export function getNextOccurrence(
  rrule: RRule | string,
  after: Date = new Date(),
  exceptionDates: string[] = [],
  timeZone: string = 'UTC'
): Date | null {
  try {
    const rule = typeof rrule === 'string' ? rrulestr(rrule) : rrule;
    
    // Function to check if a date is not an exception
    const isNotException = (date: Date) => !isRecurrenceException(date, exceptionDates, timeZone);
    
    // Get next occurrence, checking for exceptions
    let nextOccurrence = rule.after(after);
    
    // If there's an occurrence but it's an exception, keep looking
    while (nextOccurrence && !isNotException(nextOccurrence)) {
      nextOccurrence = rule.after(nextOccurrence);
    }
    
    return nextOccurrence;
  } catch (error) {
    console.error('Error getting next occurrence:', error);
    return null;
  }
}

/**
 * Create a simple recurrence rule string for common patterns
 * @param frequency Frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
 * @param interval Interval (e.g. 1 = every day, 2 = every other day)
 * @param startDate Start date
 * @param count Optional number of occurrences
 * @param until Optional end date
 * @returns RRule string
 */
export function createSimpleRecurrenceRule(
  frequency: Frequency,
  interval: number = 1,
  startDate: Date,
  count?: number,
  until?: Date
): string {
  const options: RRuleOptions = {
    freq: frequency,
    interval,
    dtstart: startDate
  };
  
  if (count) options.count = count;
  if (until) options.until = until;
  
  return new RRule(options).toString();
}
