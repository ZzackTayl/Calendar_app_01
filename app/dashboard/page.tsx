'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type Event } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Users, Heart, BarChart3, User, Settings } from 'lucide-react'
import NotificationDropdown from '@/components/notifications/NotificationDropdown'
import { useRouter } from 'next/navigation'
import { format, startOfToday, addDays, isToday, isTomorrow } from 'date-fns'
import { getPrivacyLevelBadge } from '@/lib/privacy-utils';

// Memoized components for better performance
const DashboardCard = React.memo(({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  children,
  color = "bg-yellow-400", // Default bright yellow like the image
  ariaLabel
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  children?: React.ReactNode
  color?: string
  ariaLabel?: string
}) => (
  <div 
    className={`cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 mobile-card rounded-2xl p-4 text-white ${
      color === 'bg-yellow-400' ? 'bg-[#facc15]' :
      color === 'bg-orange-400' ? 'bg-[#fb923c]' :
      color === 'bg-green-400' ? 'bg-[#4ade80]' :
      color === 'bg-purple-400' ? 'bg-[#a78bfa]' :
      color === 'bg-blue-400' ? 'bg-[#60a5fa]' : 'bg-[#facc15]'
    }`}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    }}
    role="button"
    tabIndex={0}
    aria-label={ariaLabel || `View ${title}`}
  >
    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
      <h3 className="mobile-text font-semibold text-white">{title}</h3>
      <Icon className="h-5 w-5 text-white" aria-hidden="true" />
    </div>
    <div className="pt-2">
      <div className="mobile-text-large font-bold text-white">{description}</div>
      {children}
    </div>
  </div>
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
    <div 
      className="flex items-center p-3 rounded-lg mobile-touch-target bg-black/40"
      aria-label={`Event: ${event.title} on ${dateDisplay} at ${format(eventDate, 'h:mm a')}`}
    >
      <div className="flex items-center space-x-3 flex-1">
        <div 
          className="w-3 h-3 rounded-full relationship-color-dot" 
          data-color={getRelationshipColor(event.relationship_id)}
          aria-hidden="true"
        />
        <div>
          <p className="font-medium mobile-text text-white">{event.title}</p>
          <p className="text-sm opacity-90">{dateDisplay} at {format(eventDate, 'h:mm a')}</p>
        </div>
      </div>
      <Badge className="ml-auto bg-white/40 text-white border-white/50" aria-label={`Privacy level: ${getPrivacyLevelBadge(event.privacy_level).label}`}>
        {getPrivacyLevelBadge(event.privacy_level).label}
      </Badge>
    </div>
  )
})

EventItem.displayName = 'EventItem'

export default function Dashboard() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
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

  const getRelationshipTypeLabel = (type: string | undefined) => {
    if (!type) return ''
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Helper function to convert hex color to visible background with border
  const getCardStyling = (hexColor: string) => {
    if (!hexColor || hexColor === '#6B7280') {
      return {
        style: {},
        className: "border-border shadow-lg bg-card hover:shadow-xl transition-all duration-300"
      }
    }
    
    // Convert hex to RGB
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    return {
      style: {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.6)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.8)`,
        borderWidth: '2px',
        borderStyle: 'solid'
      },
      className: "shadow-lg hover:shadow-xl transition-all duration-300"
    }
  }

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      // Combine queries for better performance
      const [relationshipsResult, eventsResult] = await Promise.all([
        supabase
          .from('relationships')
          .select('*')
          .eq('user_id', user.id)
          .order('partner_name', { ascending: true }),
        supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .gte('start_time', startOfToday().toISOString())
          .lte('start_time', addDays(startOfToday(), 7).toISOString())
          .order('start_time', { ascending: true })
      ])

      if (relationshipsResult.error) throw relationshipsResult.error
      if (eventsResult.error) throw eventsResult.error

      setRelationships(relationshipsResult.data || [])
      setUpcomingEvents(eventsResult.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (!loading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user) {
      fetchData()
    }
  }, [user, loading, router, fetchData])

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
          <NotificationDropdown />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
          <DashboardCard
            title="Calendar"
            description="View"
            icon={Calendar}
            onClick={() => handleNavigate('/calendar')}
            color="bg-yellow-400"
            ariaLabel="View calendar"
          />
          <DashboardCard
            title="Relationships"
            description={relationships.length.toString()}
            icon={Heart}
            onClick={() => handleNavigate('/relationships')}
            color="bg-orange-400"
            ariaLabel="View relationships"
          />
          
          <DashboardCard
            title="Groups"
            description="0"
            icon={Users}
            onClick={() => handleNavigate('/groups')}
            color="bg-green-400"
            ariaLabel="View groups"
          />
          <DashboardCard
            title="Settings"
            description="Manage"
            icon={Settings}
            onClick={() => handleNavigate('/settings')}
            color="bg-purple-400"
            ariaLabel="Manage settings"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Events Card */}
          <div className="rounded-2xl p-6 text-white mobile-card bg-[#60a5fa]">
            <div className="flex items-center mb-4">
              <Calendar className="h-6 w-6 mr-3" />
              <h3 className="mobile-heading font-semibold">Upcoming Events</h3>
            </div>
            <p className="text-sm mb-4 opacity-90">Your next {upcomingEvents.length} events</p>
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3" aria-label="Upcoming events list">
                  {(() => {
                    // Group events by day
                    const eventsByDay: Record<string, Event[]> = {}
                    upcomingEvents.forEach(event => {
                      const eventDate = new Date(event.start_time)
                      const dayKey = format(eventDate, 'yyyy-MM-dd')
                      if (!eventsByDay[dayKey]) {
                        eventsByDay[dayKey] = []
                      }
                      eventsByDay[dayKey].push(event)
                    })

                    // Render events with day dividers
                    const sortedDays = Object.keys(eventsByDay).sort()
                    return sortedDays.flatMap((day, index) => {
                      const events = eventsByDay[day]
                      const dayDate = new Date(day)
                      let dayLabel = ''
                      
                      if (isToday(dayDate)) {
                        dayLabel = 'Today'
                      } else if (isTomorrow(dayDate)) {
                        dayLabel = 'Tomorrow'
                      } else {
                        dayLabel = format(dayDate, 'EEEE, MMMM d')
                      }
                      
                      // Create divider element
                      const divider = (
                        <div key={`divider-${day}`} className="flex items-center my-4">
                          <div className="flex-grow border-t border-white/30"></div>
                          <span className="mx-4 text-sm font-medium whitespace-nowrap">
                            {dayLabel}
                          </span>
                          <div className="flex-grow border-t border-white/30"></div>
                        </div>
                      )
                      
                      // Map events for this day
                      const eventItems = events.map(event => (
                        <div key={event.id} className="flex items-center p-3 rounded-lg mobile-touch-target bg-black/40">
                          <EventItem 
                            event={event} 
                            getRelationshipColor={getRelationshipColor}
                          />
                        </div>
                      ))
                      
                      // Return divider and events
                      return [divider, ...eventItems]
                    })
                  })()}
                </div>
              ) : (
                <p className="text-center py-4 opacity-90 mobile-text">
                  No upcoming events
                </p>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4 mobile-touch-target bg-white/90 border-white text-blue-600 hover:bg-white hover:text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => handleNavigate('/events/create')}
                aria-label="Add new event"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  )
}
