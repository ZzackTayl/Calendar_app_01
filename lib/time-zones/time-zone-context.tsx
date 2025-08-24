'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { detectUserTimeZone, getTimeZoneDisplayName } from './time-zone-utils';
import { useAuth } from '../auth-context';
import { createSupabaseClient } from '../supabase/client';

/**
 * Time Zone Context Type
 */
interface TimeZoneContextType {
  currentTimeZone: string;
  displayTimeZone: string;
  timeZoneDisplayName: string;
  userPreferences: {
    defaultTimeZone: string;
    showSecondaryTimeZone: boolean;
    secondaryTimeZone: string;
  };
  setDisplayTimeZone: (timeZone: string) => void;
  updateUserPreferences: (preferences: Partial<TimeZoneContextType['userPreferences']>) => Promise<void>;
  isLoading: boolean;
}

/**
 * Default user preferences
 */
const defaultPreferences = {
  defaultTimeZone: '',
  showSecondaryTimeZone: false,
  secondaryTimeZone: 'UTC'
};

/**
 * Create the Time Zone Context
 */
const TimeZoneContext = createContext<TimeZoneContextType | undefined>(undefined);

/**
 * Time Zone Provider Component
 */
export function TimeZoneProvider({ children }: { children: React.ReactNode }) {
  // Get the detected time zone
  const detectedTimeZone = useMemo(detectUserTimeZone, []);
  
  // Auth context for user information
  const { user, demoMode } = useAuth();
  
  // State for the currently displayed time zone
  const [displayTimeZone, setDisplayTimeZone] = useState<string>(detectedTimeZone);
  
  // State for user preferences
  const [userPreferences, setUserPreferences] = useState({
    ...defaultPreferences,
    defaultTimeZone: detectedTimeZone
  });
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Supabase client for database operations
  const supabase = useMemo(() => createSupabaseClient(), []);

  /**
   * Effect to load user preferences
   */
  useEffect(() => {
    async function loadUserPreferences() {
      if (demoMode) {
        // In demo mode, use detected time zone
        setUserPreferences({
          ...defaultPreferences,
          defaultTimeZone: detectedTimeZone
        });
        setDisplayTimeZone(detectedTimeZone);
        setIsLoading(false);
        return;
      }
      
      if (!user) {
        // Not logged in, use detected time zone
        setUserPreferences({
          ...defaultPreferences,
          defaultTimeZone: detectedTimeZone
        });
        setDisplayTimeZone(detectedTimeZone);
        setIsLoading(false);
        return;
      }
      
      try {
        // Load preferences from user profile
        const { data, error } = await supabase
          .from('user_profiles')
          .select('time_zone')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error loading user time zone preferences:', error);
          throw error;
        }
        
        if (data) {
          // User has preferences
          setUserPreferences({
            ...defaultPreferences,
            defaultTimeZone: data.time_zone || detectedTimeZone
          });
          setDisplayTimeZone(data.time_zone || detectedTimeZone);
        } else {
          // No profile yet, create one
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              time_zone: detectedTimeZone
            });
          
          if (insertError) {
            console.error('Error creating user profile with time zone:', insertError);
          }
          
          setUserPreferences({
            ...defaultPreferences,
            defaultTimeZone: detectedTimeZone
          });
          setDisplayTimeZone(detectedTimeZone);
        }
      } catch (error) {
        console.error('Error in time zone preference loading:', error);
        
        // Fallback to detected time zone
        setUserPreferences({
          ...defaultPreferences,
          defaultTimeZone: detectedTimeZone
        });
        setDisplayTimeZone(detectedTimeZone);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadUserPreferences();
  }, [user, demoMode, detectedTimeZone, supabase]);

  /**
   * Update user time zone preferences
   */
  const updateUserPreferences = useCallback(async (
    preferences: Partial<TimeZoneContextType['userPreferences']>
  ) => {
    // Update local state first for responsiveness
    setUserPreferences(prev => ({ ...prev, ...preferences }));
    
    // If user sets a new default, update display time zone
    if (preferences.defaultTimeZone) {
      setDisplayTimeZone(preferences.defaultTimeZone);
    }
    
    // Don't update database in demo mode or if not logged in
    if (demoMode || !user) {
      return;
    }
    
    try {
      // Save to database
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          time_zone: preferences.defaultTimeZone || userPreferences.defaultTimeZone
        });
      
      if (error) {
        console.error('Error saving user time zone preferences:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update time zone preferences:', error);
      // Revert state on error
      setUserPreferences(prev => ({
        ...prev,
        defaultTimeZone: prev.defaultTimeZone
      }));
    }
  }, [demoMode, user, supabase, userPreferences.defaultTimeZone]);

  /**
   * Calculate time zone display name
   */
  const timeZoneDisplayName = useMemo(() => {
    return getTimeZoneDisplayName(displayTimeZone);
  }, [displayTimeZone]);

  /**
   * Create context value
   */
  const contextValue = useMemo(() => ({
    currentTimeZone: detectedTimeZone, // User's actual time zone
    displayTimeZone, // Time zone currently being displayed
    timeZoneDisplayName,
    userPreferences,
    setDisplayTimeZone,
    updateUserPreferences,
    isLoading
  }), [
    detectedTimeZone, 
    displayTimeZone, 
    timeZoneDisplayName,
    userPreferences, 
    updateUserPreferences,
    isLoading
  ]);

  return (
    <TimeZoneContext.Provider value={contextValue}>
      {children}
    </TimeZoneContext.Provider>
  );
}

/**
 * Hook to use the time zone context
 */
export function useTimeZone() {
  const context = useContext(TimeZoneContext);
  
  if (context === undefined) {
    throw new Error('useTimeZone must be used within a TimeZoneProvider');
  }
  
  return context;
}

export default TimeZoneContext;
