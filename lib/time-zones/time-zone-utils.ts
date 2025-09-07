/**
 * Time Zone Utility Functions
 * 
 * This module provides functions for handling time zones in the calendar app.
 * It includes utilities for detection, conversion, and formatting of dates
 * across different time zones.
 */
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format, parseISO, isValid } from 'date-fns';
import spacetime from 'spacetime';
import moment from 'moment-timezone';
import * as ct from 'countries-and-timezones';
import { ValidationError } from '../validation/errors';

/**
 * Geolocation configuration and types
 */
export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  fallbackToIP?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface TimeZoneDetectionResult {
  timeZone: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'geolocation' | 'ip' | 'browser' | 'fallback';
  location?: LocationData;
  suggestions?: string[];
}

export interface TravelDetectionResult {
  hasChanged: boolean;
  previousTimeZone?: string;
  currentTimeZone: string;
  confidence: number;
  detectedAt: Date;
}

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
 * Enhanced time zone detection with geolocation support
 * @param options Geolocation and detection options
 * @returns Promise with detailed detection result
 */
export async function detectTimeZoneAdvanced(
  options: GeolocationOptions = {}
): Promise<TimeZoneDetectionResult> {
  const defaultOptions: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
    fallbackToIP: true,
    ...options
  };

  try {
    // Try geolocation first if available
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const location = await getCurrentLocation(defaultOptions);
        const geoResult = await detectTimeZoneFromLocation(location);
        if (geoResult) {
          return {
            timeZone: geoResult.timeZone,
            confidence: 'high',
            method: 'geolocation',
            location,
            suggestions: geoResult.suggestions
          };
        }
      } catch (geoError) {
        console.warn('Geolocation detection failed:', geoError);
      }
    }

    // Fallback to IP-based detection
    if (defaultOptions.fallbackToIP) {
      try {
        const ipResult = await detectTimeZoneFromIP();
        if (ipResult) {
          return {
            timeZone: ipResult.timeZone,
            confidence: 'medium',
            method: 'ip',
            suggestions: ipResult.suggestions
          };
        }
      } catch (ipError) {
        console.warn('IP-based detection failed:', ipError);
      }
    }

    // Browser-based detection
    const browserTimeZone = detectUserTimeZone();
    return {
      timeZone: browserTimeZone,
      confidence: 'medium',
      method: 'browser'
    };
  } catch (error) {
    console.error('Advanced time zone detection error:', error);
    return {
      timeZone: 'UTC',
      confidence: 'low',
      method: 'fallback'
    };
  }
}

/**
 * Simple time zone detection (original function)
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
    const utcDate = toZonedTime(dateObject, fromTimeZone);
    return fromZonedTime(utcDate, toTimeZone);
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
    return String(st.timezone().current.offset);
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
 * Get current location using Geolocation API
 * @param options Geolocation options
 * @returns Promise with location data
 */
export function getCurrentLocation(options: GeolocationOptions): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = 'Unknown geolocation error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'User denied the request for Geolocation';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get user location timed out';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge
      }
    );
  });
}

/**
 * Detect time zone from geographic coordinates
 * @param location Location data from geolocation
 * @returns Time zone detection result with suggestions
 */
export async function detectTimeZoneFromLocation(
  location: LocationData
): Promise<{ timeZone: string; suggestions: string[] } | null> {
  try {
    // Use moment-timezone to find timezone by coordinates
    const timeZone = moment.tz.guess(true);
    
    // Get nearby timezones for suggestions
    const suggestions = getNearbyTimeZones(location.latitude, location.longitude);
    
    // Validate the detected timezone
    if (moment.tz.zone(timeZone)) {
      return {
        timeZone,
        suggestions: suggestions.slice(0, 5) // Top 5 suggestions
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting timezone from location:', error);
    return null;
  }
}

/**
 * Get nearby time zones based on coordinates
 * @param latitude Geographic latitude
 * @param longitude Geographic longitude
 * @returns Array of nearby time zone identifiers
 */
export function getNearbyTimeZones(latitude: number, longitude: number): string[] {
  try {
    // Get all countries and their timezones
    const countries = ct.getAllCountries();
    const nearbyZones: { zone: string; distance: number }[] = [];
    
    // Calculate approximate distance to each country and collect timezones
    Object.values(countries).forEach(country => {
      if ((country as any).latlng && country.timezones) {
        const countryLat = (country as any).latlng[0];
        const countryLng = (country as any).latlng[1];
        
        // Simple distance calculation (not precise, but good enough for suggestions)
        const distance = Math.sqrt(
          Math.pow(latitude - countryLat, 2) + Math.pow(longitude - countryLng, 2)
        );
        
        country.timezones.forEach(zone => {
          nearbyZones.push({ zone, distance });
        });
      }
    });
    
    // Sort by distance and return unique timezones
    return [...new Set(
      nearbyZones
        .sort((a, b) => a.distance - b.distance)
        .map(item => item.zone)
    )];
  } catch (error) {
    console.error('Error getting nearby timezones:', error);
    return [];
  }
}

/**
 * Detect time zone using IP geolocation (fallback method)
 * @returns Promise with IP-based timezone detection
 */
export async function detectTimeZoneFromIP(): Promise<{ timeZone: string; suggestions: string[] } | null> {
  try {
    // Try multiple IP geolocation services for reliability
    const services = [
      'https://ipapi.co/timezone/',
      'https://worldtimeapi.org/api/ip'
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(service);
        if (!response.ok) continue;
        
        let timeZone: string;
        
        if (service.includes('ipapi.co')) {
          timeZone = await response.text();
        } else if (service.includes('worldtimeapi.org')) {
          const data = await response.json();
          timeZone = data.timezone;
        } else {
          continue;
        }
        
        // Validate the timezone
        if (timeZone && moment.tz.zone(timeZone)) {
          return {
            timeZone: timeZone.trim(),
            suggestions: getRegionalTimeZones(timeZone)
          };
        }
      } catch (serviceError) {
        console.warn(`Service ${service} failed:`, serviceError);
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('IP-based timezone detection failed:', error);
    return null;
  }
}

/**
 * Get regional time zones for suggestions
 * @param baseTimeZone Base timezone to find regional alternatives
 * @returns Array of regional timezone suggestions
 */
export function getRegionalTimeZones(baseTimeZone: string): string[] {
  try {
    const region = baseTimeZone.split('/')[0]; // e.g., 'America', 'Europe', 'Asia'
    const allZones = moment.tz.names();
    
    return allZones
      .filter(zone => zone.startsWith(region + '/'))
      .slice(0, 8); // Limit to 8 suggestions
  } catch (error) {
    console.error('Error getting regional timezones:', error);
    return [];
  }
}

/**
 * Detect timezone changes for travel detection
 * @param previousTimeZone Previous detected timezone
 * @param options Detection options
 * @returns Travel detection result
 */
export async function detectTimeZoneChange(
  previousTimeZone?: string,
  options: GeolocationOptions = {}
): Promise<TravelDetectionResult> {
  try {
    const currentDetection = await detectTimeZoneAdvanced(options);
    const currentTimeZone = currentDetection.timeZone;
    
    if (!previousTimeZone) {
      return {
        hasChanged: false,
        currentTimeZone,
        confidence: 0,
        detectedAt: new Date()
      };
    }
    
    const hasChanged = previousTimeZone !== currentTimeZone;
    let confidence = 0;
    
    if (hasChanged) {
      // Calculate confidence based on detection method and accuracy
      switch (currentDetection.method) {
        case 'geolocation':
          confidence = 0.9;
          break;
        case 'ip':
          confidence = 0.7;
          break;
        case 'browser':
          confidence = 0.5;
          break;
        default:
          confidence = 0.3;
      }
      
      // Reduce confidence if timezones are in the same offset
      const prevOffset = moment.tz(previousTimeZone).utcOffset();
      const currOffset = moment.tz(currentTimeZone).utcOffset();
      if (prevOffset === currOffset) {
        confidence *= 0.6;
      }
    }
    
    return {
      hasChanged,
      previousTimeZone,
      currentTimeZone,
      confidence,
      detectedAt: new Date()
    };
  } catch (error) {
    console.error('Error detecting timezone change:', error);
    return {
      hasChanged: false,
      currentTimeZone: previousTimeZone || 'UTC',
      confidence: 0,
      detectedAt: new Date()
    };
  }
}

/**
 * Get smart timezone suggestions for event creation
 * @param eventLocation Optional event location description
 * @param userLocation Optional user location data
 * @returns Array of suggested timezones with relevance scores
 */
export async function getSmartTimeZoneSuggestions(
  eventLocation?: string,
  userLocation?: LocationData
): Promise<{ timeZone: string; label: string; relevance: number }[]> {
  try {
    const suggestions: { timeZone: string; label: string; relevance: number }[] = [];
    
    // Add user's current timezone with high relevance
    const currentTz = await detectTimeZoneAdvanced();
    suggestions.push({
      timeZone: currentTz.timeZone,
      label: `${getTimeZoneDisplayName(currentTz.timeZone)} (Current)`,
      relevance: 1.0
    });
    
    // Add nearby timezones if user location is available
    if (userLocation) {
      const nearbyZones = getNearbyTimeZones(userLocation.latitude, userLocation.longitude);
      nearbyZones.slice(0, 3).forEach((zone, index) => {
        if (zone !== currentTz.timeZone) {
          suggestions.push({
            timeZone: zone,
            label: `${getTimeZoneDisplayName(zone)} (Nearby)`,
            relevance: 0.8 - (index * 0.1)
          });
        }
      });
    }
    
    // Add common business timezones
    const businessZones = [
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo'
    ];
    
    businessZones.forEach(zone => {
      if (!suggestions.find(s => s.timeZone === zone)) {
        suggestions.push({
          timeZone: zone,
          label: `${getTimeZoneDisplayName(zone)} (Business Hours)`,
          relevance: 0.5
        });
      }
    });
    
    // If event location is provided, try to extract timezone hints
    if (eventLocation) {
      const locationHints = extractTimeZoneFromLocation(eventLocation);
      locationHints.forEach(zone => {
        if (!suggestions.find(s => s.timeZone === zone)) {
          suggestions.push({
            timeZone: zone,
            label: `${getTimeZoneDisplayName(zone)} (Location Match)`,
            relevance: 0.9
          });
        }
      });
    }
    
    // Sort by relevance and return top suggestions
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);
  } catch (error) {
    console.error('Error getting smart timezone suggestions:', error);
    return COMMON_TIME_ZONES.slice(0, 5).map(tz => ({
      timeZone: tz.value,
      label: tz.label,
      relevance: 0.3
    }));
  }
}

/**
 * Extract potential timezones from location text
 * @param locationText Location description
 * @returns Array of potential timezone identifiers
 */
export function extractTimeZoneFromLocation(locationText: string): string[] {
  const locationLower = locationText.toLowerCase();
  const zones: string[] = [];
  
  // City mappings
  const cityMappings: Record<string, string> = {
    'new york': 'America/New_York',
    'nyc': 'America/New_York',
    'los angeles': 'America/Los_Angeles',
    'la': 'America/Los_Angeles',
    'chicago': 'America/Chicago',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'tokyo': 'Asia/Tokyo',
    'sydney': 'Australia/Sydney',
    'berlin': 'Europe/Berlin',
    'moscow': 'Europe/Moscow',
    'mumbai': 'Asia/Kolkata',
    'delhi': 'Asia/Kolkata',
    'shanghai': 'Asia/Shanghai',
    'beijing': 'Asia/Shanghai'
  };
  
  // Check for direct city matches
  Object.entries(cityMappings).forEach(([city, zone]) => {
    if (locationLower.includes(city)) {
      zones.push(zone);
    }
  });
  
  // Check for country/region mentions
  const countryMappings: Record<string, string[]> = {
    'usa': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    'united states': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    'uk': ['Europe/London'],
    'britain': ['Europe/London'],
    'england': ['Europe/London'],
    'france': ['Europe/Paris'],
    'germany': ['Europe/Berlin'],
    'japan': ['Asia/Tokyo'],
    'australia': ['Australia/Sydney'],
    'india': ['Asia/Kolkata'],
    'china': ['Asia/Shanghai']
  };
  
  Object.entries(countryMappings).forEach(([country, countryZones]) => {
    if (locationLower.includes(country)) {
      zones.push(...countryZones);
    }
  });
  
  return [...new Set(zones)];
}

/**
 * Store timezone change in local storage for travel detection
 * @param timeZone Current timezone
 * @param location Optional location data
 */
export function storeTimeZoneHistory(timeZone: string, location?: LocationData): void {
  try {
    const history = getTimeZoneHistory();
    const entry = {
      timeZone,
      location,
      timestamp: Date.now()
    };
    
    history.unshift(entry);
    
    // Keep only last 10 entries
    const limitedHistory = history.slice(0, 10);
    
    localStorage.setItem('timezone_history', JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Error storing timezone history:', error);
  }
}

/**
 * Get timezone history from local storage
 * @returns Array of timezone history entries
 */
export function getTimeZoneHistory(): Array<{
  timeZone: string;
  location?: LocationData;
  timestamp: number;
}> {
  try {
    const stored = localStorage.getItem('timezone_history');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting timezone history:', error);
    return [];
  }
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
  const utcDate1 = toZonedTime(
    typeof date1 === 'string' ? parseISO(date1) : date1, 
    timeZone1
  );
  
  const utcDate2 = toZonedTime(
    typeof date2 === 'string' ? parseISO(date2) : date2, 
    timeZone2
  );
  
  // Compare UTC timestamps
  if (utcDate1 < utcDate2) return -1;
  if (utcDate1 > utcDate2) return 1;
  return 0;
}
