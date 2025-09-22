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
  const { user } = useAuth();
  
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

  // Enhanced diagnostic logging for database schema issues (development only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.log('[DATABASE-SCHEMA-DEBUG] Initializing timezone context diagnostics:', {
      userId: user?.id || 'no-user',
      hasSupabaseClient: !!supabase,
      timestamp: new Date().toISOString()
    });

    // Test database connection and schema
    const testDatabaseConnection = async () => {
      try {
        console.log('[DATABASE-SCHEMA-DEBUG] Testing database connection...');

        // Test basic connection
        const { data: connectionTest, error: connectionError } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);

        console.log('[DATABASE-SCHEMA-DEBUG] Connection test result:', {
          hasData: !!connectionTest,
          hasError: !!connectionError,
          errorCode: connectionError?.code,
          errorMessage: connectionError?.message,
          timestamp: new Date().toISOString()
        });

        // Test specific column existence
        console.log('[DATABASE-SCHEMA-DEBUG] Testing calendar_color_scheme column...');
        const { data: columnTest, error: columnError } = await supabase
          .from('user_profiles')
          .select('calendar_color_scheme')
          .limit(1);

        console.log('[DATABASE-SCHEMA-DEBUG] Column test result:', {
          hasData: !!columnTest,
          hasError: !!columnError,
          errorCode: columnError?.code,
          errorMessage: columnError?.message,
          timestamp: new Date().toISOString()
        });

        // Log environment info
        console.log('[DATABASE-SCHEMA-DEBUG] Environment diagnostics:', {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
          supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
          nodeEnv: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('[DATABASE-SCHEMA-DEBUG] Database connection test failed:', {
          error,
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
      }
    };

    if (user) {
      testDatabaseConnection();
    }
  }, [user, supabase]);
  /**
   * Effect to load user preferences
   */
  useEffect(() => {
    async function loadUserPreferences() {
      // Demo mode removed for production
      
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
        // Load preferences from user profile - use maybeSingle() to handle missing profiles
        console.log('[TIMEZONE-DEBUG] Loading user preferences for user:', user.id, {
          timestamp: new Date().toISOString()
        });

        const { data, error } = await supabase
          .from('user_profiles')
          .select('time_zone')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[TIMEZONE-DEBUG] Query result:', {
          hasData: !!data,
          data,
          hasError: !!error,
          errorMessage: error?.message,
          errorCode: error?.code,
          timestamp: new Date().toISOString()
        });

        if (error) {
          console.error('[TIMEZONE-DEBUG] Error loading user time zone preferences:', {
            error,
            userId: user.id,
            errorCode: error.code,
            errorMessage: error.message,
            timestamp: new Date().toISOString()
          });
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
          // No profile yet, create one using centralized function
          console.log('[TIMEZONE-DEBUG] Creating new user profile for user:', user.id, {
            timeZone: detectedTimeZone,
            timestamp: new Date().toISOString()
          });

          try {
            // Try to use the centralized profile creation function
            // Fallback: Create profile directly if function doesn't exist
            console.log('[TIMEZONE-DEBUG] Attempting to create user profile with calendar_color_scheme:', {
              userId: user.id,
              calendarColorScheme: 'default',
              timestamp: new Date().toISOString()
            });

            const { error: profileError } = await supabase
              .from('user_profiles')
              .upsert({
                id: user.id,
                time_zone: 'UTC',
                default_calendar_view: 'month',
                email_notifications: true,
                push_notifications: true,
                calendar_color_scheme: 'default',
                onboarding_source: 'web',
                marketing_consent: false,
                newsletter_consent: false
              }, { onConflict: 'id' });

            console.log('[TIMEZONE-DEBUG] Profile creation result:', {
              hasError: !!profileError,
              errorCode: profileError?.code,
              errorMessage: profileError?.message,
              timestamp: new Date().toISOString()
            });

            if (profileError) {
              console.error('[TIMEZONE-DEBUG] Error creating user profile with time zone:', {
                error: profileError,
                userId: user.id,
                errorCode: profileError.code,
                errorMessage: profileError.message,
                timestamp: new Date().toISOString()
              });

              // If function doesn't exist, try direct insert
              if (profileError.code === 'PGRST202' || profileError.message?.includes('function') && profileError.message?.includes('does not exist')) {
                console.log('[TIMEZONE-DEBUG] Function not found, trying direct insert:', {
                  userId: user.id,
                  timestamp: new Date().toISOString()
                });

                // Try direct insert instead
                const { error: insertError } = await supabase
                  .from('user_profiles')
                  .upsert({
                    id: user.id,
                    time_zone: detectedTimeZone,
                    email_notifications: true,
                    push_notifications: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });

                if (insertError) {
                  console.error('[TIMEZONE-DEBUG] Direct insert also failed:', {
                    error: insertError,
                    userId: user.id,
                    timestamp: new Date().toISOString()
                  });
                } else {
                  console.log('[TIMEZONE-DEBUG] Direct insert successful:', {
                    userId: user.id,
                    timestamp: new Date().toISOString()
                  });
                }
              }
            } else {
              console.log('[TIMEZONE-DEBUG] User profile created successfully:', {
                userId: user.id,
                timestamp: new Date().toISOString()
              });
            }

            // Set preferences regardless of creation result
            setUserPreferences({
              ...defaultPreferences,
              defaultTimeZone: detectedTimeZone
            });
            setDisplayTimeZone(detectedTimeZone);

          } catch (creationError) {
            console.error('[TIMEZONE-DEBUG] Exception during profile creation:', {
              error: creationError,
              userId: user.id,
              timestamp: new Date().toISOString()
            });

            // Fallback to detected time zone
            setUserPreferences({
              ...defaultPreferences,
              defaultTimeZone: detectedTimeZone
            });
            setDisplayTimeZone(detectedTimeZone);
          }
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
  }, [user, detectedTimeZone, supabase]);

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
    
    // Don't update database if not logged in (demo mode removed for production)
    if (!user) {
      return;
    }
    
    try {
      // Save to database - upsert with required fields for new profiles
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          time_zone: preferences.defaultTimeZone || userPreferences.defaultTimeZone,
          email_notifications: true,
          push_notifications: true,
          updated_at: new Date().toISOString()
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
  }, [user, supabase, userPreferences.defaultTimeZone]);

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
