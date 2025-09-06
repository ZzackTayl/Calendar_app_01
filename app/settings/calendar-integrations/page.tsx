'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { GoogleCalendarIntegration } from '@/components/ui/google-calendar-integration'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Calendar, Settings, RefreshCw } from 'lucide-react'

export default function CalendarIntegrationsPage() {
  const { user } = useAuth()
  const [autoSync, setAutoSync] = useState(true)

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Please sign in to manage calendar integrations</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Calendar Integrations</h1>
          </div>
          <p className="text-muted-foreground">
            Connect your external calendars to keep all your events in sync
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <GoogleCalendarIntegration userId={user.id} />
          
          {/* Placeholder for future integrations */}
          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Apple Calendar</CardTitle>
              </div>
              <CardDescription>
                Sync with Apple Calendar (iCloud) - Coming Soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Apple Calendar integration is in development
                </p>
                <button 
                  disabled 
                  className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Outlook Calendar</CardTitle>
              </div>
              <CardDescription>
                Sync with Microsoft Outlook - Coming Soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Outlook integration is in development
                </p>
                <button 
                  disabled 
                  className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="h-5 w-5 mr-2" />
                Sync Settings
              </CardTitle>
              <CardDescription>
                Configure how your calendar integrations sync
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync calendar data at regular intervals
                  </p>
                </div>
                <Switch
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                  aria-label="Toggle auto sync"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>How Calendar Integration Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Two-Way Sync</h4>
                <p className="text-sm text-muted-foreground">
                  Events created in your external calendar will be imported to PolyHarmony, 
                  and events created in PolyHarmony can be exported to your external calendar.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Privacy Protection</h4>
                <p className="text-sm text-muted-foreground">
                  Your privacy settings in PolyHarmony are respected. Private events 
                  remain private and are not synced to external calendars.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Automatic Updates</h4>
                <p className="text-sm text-muted-foreground">
                  Changes made in either calendar are automatically synced to keep 
                  everything up to date.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
