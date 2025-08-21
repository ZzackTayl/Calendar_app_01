'use client';

import { useState } from 'react';
import { useTimeZone } from '@/lib/time-zones/time-zone-context';
import { 
  detectUserTimeZone,
  getTimeZoneDisplayName,
  getTimeZoneOffset,
  COMMON_TIME_ZONES
} from '@/lib/time-zones/time-zone-utils';
import TimeZoneSelector from '@/components/ui/time-zone-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Clock, Undo } from 'lucide-react';
import TimeZoneDisplay from '@/components/ui/time-zone-display';

/**
 * Time Zone Settings Page
 */
export default function TimeZoneSettingsPage() {
  // Get time zone context
  const { 
    currentTimeZone, 
    displayTimeZone, 
    timeZoneDisplayName,
    userPreferences,
    updateUserPreferences,
    isLoading
  } = useTimeZone();
  
  // Show secondary time zone state
  const [showSecondaryTimeZone, setShowSecondaryTimeZone] = useState(
    userPreferences.showSecondaryTimeZone
  );
  
  // Secondary time zone state
  const [secondaryTimeZone, setSecondaryTimeZone] = useState(
    userPreferences.secondaryTimeZone
  );
  
  const router = useRouter();
  
  // Handle setting the default time zone
  const handleSetDefaultTimeZone = async (timeZone: string) => {
    await updateUserPreferences({
      defaultTimeZone: timeZone
    });
  };
  
  // Handle toggling the secondary time zone
  const handleToggleSecondaryTimeZone = async (checked: boolean) => {
    setShowSecondaryTimeZone(checked);
    await updateUserPreferences({
      showSecondaryTimeZone: checked
    });
  };
  
  // Handle setting the secondary time zone
  const handleSetSecondaryTimeZone = async (timeZone: string) => {
    setSecondaryTimeZone(timeZone);
    await updateUserPreferences({
      secondaryTimeZone: timeZone
    });
  };
  
  // Handle restoring the detected time zone
  const handleRestoreDetectedTimeZone = async () => {
    const detectedTimeZone = detectUserTimeZone();
    await updateUserPreferences({
      defaultTimeZone: detectedTimeZone
    });
  };
  
  // Current date for preview
  const now = new Date();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/settings')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Globe className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Time Zone Settings</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Current Time Zone Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Current Time Zone
              </CardTitle>
              <CardDescription>
                Your current detected time zone and display preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Detected Time Zone</h3>
                  <div className="p-3 bg-accent/20 rounded-md">
                    <div className="font-medium">{getTimeZoneDisplayName(currentTimeZone)}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {currentTimeZone} {getTimeZoneOffset(currentTimeZone)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Display Time Zone</h3>
                  <div className="p-3 bg-accent/20 rounded-md">
                    <div className="font-medium">{timeZoneDisplayName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {displayTimeZone} {getTimeZoneOffset(displayTimeZone)}
                    </div>
                  </div>
                </div>
              </div>
              
              {currentTimeZone !== displayTimeZone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreDetectedTimeZone}
                  className="mt-4"
                >
                  <Undo className="w-4 h-4 mr-2" />
                  Restore Detected Time Zone
                </Button>
              )}
              
              <div className="bg-muted/30 p-4 rounded-md mt-4">
                <h3 className="text-sm font-medium mb-2">Current Time Preview</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <TimeZoneDisplay 
                      date={now} 
                      format="EEEE, MMMM d, yyyy h:mm:ss a"
                      showTimeZone={true}
                      showOffset={true}
                    />
                  </div>
                  
                  {showSecondaryTimeZone && (
                    <div>
                      <TimeZoneDisplay 
                        date={now} 
                        timeZone={secondaryTimeZone}
                        format="EEEE, MMMM d, yyyy h:mm:ss a"
                        showTimeZone={true}
                        showOffset={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Time Zone Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Change Default Time Zone</CardTitle>
              <CardDescription>
                Select a time zone to use for displaying events and dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimeZoneSelector
                value={displayTimeZone}
                onChange={handleSetDefaultTimeZone}
                showSelected={false}
              />
            </CardContent>
          </Card>
          
          {/* Secondary Time Zone */}
          <Card>
            <CardHeader>
              <CardTitle>Secondary Time Zone</CardTitle>
              <CardDescription>
                Optionally display a secondary time zone for comparison
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-secondary" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Show Secondary Time Zone
                </Label>
                <Switch
                  id="show-secondary"
                  checked={showSecondaryTimeZone}
                  onCheckedChange={handleToggleSecondaryTimeZone}
                />
              </div>
              
              {showSecondaryTimeZone && (
                <div className="pt-4">
                  <TimeZoneSelector
                    value={secondaryTimeZone}
                    onChange={handleSetSecondaryTimeZone}
                    label="Secondary Time Zone"
                    variant="dropdown"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
