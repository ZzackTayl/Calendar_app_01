'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type Event } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Users, Heart, LogOut, BarChart3, FileText } from 'lucide-react'
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
  <Card 
    className="cursor-pointer hover:shadow-lg transition-shadow mobile-card" 
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="mobile-text font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="mobile-text-large font-bold">{description}</div>
      {children}
    </CardContent>
  </Card>
))

DashboardCard.displayName = 'DashboardCard'

const EventItem = React.memo(({ event, getRelationshipColor }: {
  event: Event
  getRelationshipColor: (id: string | undefined) => string
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
    <div className="flex items-center justify-between p-3 border rounded-lg mobile-touch-target">
      <div className="flex items-center space-x-3">
        <div 
          className="w-3 h-3 rounded-full relationship-color-dot" 
          data-color={getRelationshipColor(event.relationship_id)}
        />
        <div>
          <p className="font-medium mobile-text">{event.title}</p>
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
    relationships.forEach(r => map.set(r.id, r.color || '#6B7280'))
    return map
  }, [relationships])

  const getRelationshipColor = useCallback((relationshipId: string | undefined) => {
    return relationshipColorMap.get(relationshipId || '') || '#6B7280'
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
      <div className="mobile-container mobile-padding">
        <div className="flex justify-between items-center mb-6">
          <h1 className="mobile-heading font-bold">Dashboard</h1>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            size="sm"
            className="mobile-touch-target"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
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
          <DashboardCard
            title="Templates"
            description="Manage"
            icon={FileText}
            onClick={() => handleNavigate('/templates')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center mobile-heading">
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
                <p className="text-muted-foreground text-center py-4 mobile-text">
                  No upcoming events
                </p>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4 mobile-touch-target"
                onClick={() => handleNavigate('/events/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </CardContent>
          </Card>

          <Card className="mobile-card">
            <CardHeader>
              <CardTitle className="flex items-center mobile-heading">
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
                  <div key={relationship.id} className="flex items-center justify-between p-3 border rounded-lg mobile-touch-target">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full relationship-color-dot" 
                        data-color={relationship.color}
                      />
                      <div>
                        <p className="font-medium mobile-text">{relationship.partner_name}</p>
                        <p className="text-sm text-muted-foreground">{relationship.relationship_type}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2">{relationship.relationship_type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4 mobile-text">
                  No relationships yet
                </p>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4 mobile-touch-target"
                onClick={() => handleNavigate('/relationships/add')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Relationship
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}