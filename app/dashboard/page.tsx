'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type Event } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Users, Heart, Settings, LogOut, Home, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, startOfToday, addDays, isToday, isTomorrow } from 'date-fns'
import { DemoStore } from '@/lib/demo-store'

// Memoized components for better performance
const DashboardCard = React.memo(({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  children 
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  children?: React.ReactNode
}) => (
  <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{description}</div>
      {children}
    </CardContent>
  </Card>
))

DashboardCard.displayName = 'DashboardCard'

const EventItem = React.memo(({ event, getRelationshipColor }: {
  event: Event
  getRelationshipColor: (id: string) => string
}) => {
  const eventDate = new Date(event.start_time)
  const isEventToday = isToday(eventDate)
  const isEventTomorrow = isTomorrow(eventDate)
  
  const dateDisplay = isEventToday 
    ? 'Today' 
    : isEventTomorrow 
    ? 'Tomorrow' 
    : format(eventDate, 'MMM d')

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: getRelationshipColor(event.relationship_id || '') }}
        />
        <div>
          <p className="font-medium">{event.title}</p>
          <p className="text-sm text-muted-foreground">{dateDisplay} at {format(eventDate, 'h:mm a')}</p>
        </div>
      </div>
      <Badge variant="secondary">{event.privacy_level}</Badge>
    </div>
  )
})

EventItem.displayName = 'EventItem'

export default function Dashboard() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const { user, demoMode, signOut } = useAuth()
  const router = useRouter()
  
  // Memoize Supabase client
  const supabase = useMemo(() => createSupabaseClient(), [])

  // Memoize expensive calculations
  const relationshipColorMap = useMemo(() => {
    const map = new Map<string, string>()
    relationships.forEach(r => map.set(r.id, r.color))
    return map
  }, [relationships])

  const getRelationshipColor = useCallback((relationshipId: string) => {
    return relationshipColorMap.get(relationshipId) || '#6B7280'
  }, [relationshipColorMap])

  const fetchData = useCallback(async () => {
    if (demoMode) {
      const uid = user?.id || 'demo-user'
      const rels = DemoStore.listRelationships(uid)
      const events = DemoStore.listEvents(uid, {
        from: startOfToday().toISOString(),
        to: addDays(startOfToday(), 7).toISOString(),
      })
      setRelationships(rels as any)
      setUpcomingEvents(events as any)
      setLoading(false)
      return
    }

    try {
      // Combine queries for better performance
      const [relationshipsResult, eventsResult] = await Promise.all([
        supabase
          .from('relationships')
          .select('*')
          .eq('user_id', user?.id || '')
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('*')
          .eq('owner_id', user?.id || '')
          .gte('start_time', startOfToday().toISOString())
          .lte('start_time', addDays(startOfToday(), 7).toISOString())
          .order('start_time', { ascending: true })
          .limit(5)
      ])
      
      if (relationshipsResult.error) throw relationshipsResult.error
      if (eventsResult.error) throw eventsResult.error
      
      setRelationships(relationshipsResult.data || [])
      setUpcomingEvents(eventsResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [demoMode, supabase, user?.id])

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    fetchData()
  }, [user, demoMode, router, fetchData])

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.push('/')
  }, [signOut, router])

  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Relationships"
            description={relationships.length.toString()}
            icon={Heart}
            onClick={() => handleNavigate('/relationships')}
          />
          <DashboardCard
            title="Upcoming Events"
            description={upcomingEvents.length.toString()}
            icon={Calendar}
            onClick={() => handleNavigate('/calendar')}
          />
          <DashboardCard
            title="Groups"
            description="0"
            icon={Users}
            onClick={() => handleNavigate('/groups')}
          />
          <DashboardCard
            title="Analytics"
            description="View"
            icon={BarChart3}
            onClick={() => handleNavigate('/analytics')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Upcoming Events
              </CardTitle>
              <CardDescription>
                Your next {upcomingEvents.length} events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <EventItem 
                    key={event.id} 
                    event={event} 
                    getRelationshipColor={getRelationshipColor}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No upcoming events
                </p>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => handleNavigate('/events/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Relationships
              </CardTitle>
              <CardDescription>
                Manage your connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relationships.length > 0 ? (
                relationships.map((relationship) => (
                  <div key={relationship.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: relationship.color }}
                      />
                                        <div>
                    <p className="font-medium">{relationship.partner_name}</p>
                    <p className="text-sm text-muted-foreground">{relationship.relationship_type}</p>
                  </div>
                </div>
                <Badge variant="secondary">{relationship.relationship_type}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Relationships Summary */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Your Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            {relationships.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-4">No relationships yet</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/relationships/add')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Partner
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {relationships.slice(0, 4).map((relationship) => (
                  <div key={relationship.id} className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: relationship.color || '#6B7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {relationship.partner_name || 'Unknown Partner'}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {relationship.relationship_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
                {relationships.length > 4 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => router.push('/relationships')}
                  >
                    View all {relationships.length} relationships
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Features Placeholder */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Relationship Insights
            </CardTitle>
            <CardDescription>Coming Soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Time allocation and relationship analytics will be available soon.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Relationship Agreements
            </CardTitle>
            <CardDescription>Coming Soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                Track and manage relationship agreements and boundaries.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </div>
  )
}