'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, ExternalLink, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GoogleCalendarIntegrationProps {
  userId: string
}

interface IntegrationStatus {
  isConnected: boolean
  accountEmail?: string
  lastSync?: string
  syncError?: string
  isActive: boolean
}

export function GoogleCalendarIntegration({ userId }: GoogleCalendarIntegrationProps) {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    isConnected: false,
    isActive: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  // Fetch integration status
  const fetchIntegrationStatus = async () => {
    try {
      const response = await fetch('/api/calendar/integrations')
      if (response.ok) {
        const data = await response.json()
        const googleIntegration = data.integrations?.find((i: any) => i.provider === 'google')
        
        if (googleIntegration) {
          setIntegrationStatus({
            isConnected: true,
            accountEmail: googleIntegration.account_email,
            lastSync: googleIntegration.last_sync_at,
            syncError: googleIntegration.sync_error,
            isActive: googleIntegration.is_active
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch integration status:', error)
    }
  }

  useEffect(() => {
    fetchIntegrationStatus()
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/calendar/oauth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider: 'google', 
          action: 'initialize' 
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.oauth_url) {
        // Redirect to Google OAuth
        window.location.href = data.oauth_url
      } else {
        throw new Error(data.error || 'Failed to initialize Google Calendar connection')
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Google Calendar',
        variant: 'destructive'
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSync = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/google/sync', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Sync Successful',
          description: data.message || 'Google Calendar synced successfully'
        })
        await fetchIntegrationStatus() // Refresh status
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync Google Calendar',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? This will stop syncing your calendars.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/oauth/setup?provider=google', {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Disconnected',
          description: 'Google Calendar has been disconnected'
        })
        setIntegrationStatus({
          isConnected: false,
          isActive: false
        })
      } else {
        throw new Error(data.error || 'Failed to disconnect')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast({
        title: 'Disconnect Failed',
        description: error instanceof Error ? error.message : 'Failed to disconnect Google Calendar',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    if (!integrationStatus.isConnected) {
      return <XCircle className="h-5 w-5 text-gray-400" />
    }
    if (integrationStatus.syncError) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />
  }

  const getStatusBadge = () => {
    if (!integrationStatus.isConnected) {
      return <Badge variant="secondary">Not Connected</Badge>
    }
    if (integrationStatus.syncError) {
      return <Badge variant="destructive">Sync Error</Badge>
    }
    return <Badge variant="default">Connected</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Sync your events with Google Calendar for seamless scheduling
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {integrationStatus.isConnected ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">
                  Connected as {integrationStatus.accountEmail}
                </span>
              </div>
              
              {integrationStatus.lastSync && (
                <p className="text-xs text-muted-foreground">
                  Last synced: {new Date(integrationStatus.lastSync).toLocaleString()}
                </p>
              )}
              
              {integrationStatus.syncError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sync error: {integrationStatus.syncError}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleSync}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              
              <Button
                onClick={handleDisconnect}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Google Calendar to automatically sync events and keep your schedules in sync.
            </p>
            
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
