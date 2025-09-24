'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type Event } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Users, Heart, BarChart3, User, Settings, Home } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
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
color = "bg-blue-500", // Default direct Tailwind color
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
  className={`cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 mobile-card rounded-2xl p-4 text-white ${color} hover:opacity-90`}
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
      className="flex items-center p-3 rounded-lg mobile-touch-target bg-blue-800/40"
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
          <p className="text-sm opacity-90 text-blue-100">{dateDisplay} at {format(eventDate, 'h:mm a')}</p>
        </div>
      </div>
      <Badge className="ml-auto bg-blue-700/60 text-white border-blue-600/50" aria-label={`Privacy level: ${getPrivacyLevelBadge(event.privacy_level).label}`}>
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
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const redirectedRef = useRef(false)
  
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
    // Redirect to sign-in once if not authenticated
    if (!authLoading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push('/auth/signin?next=/dashboard');
      return;
    }

    if (user) {
      // Reset redirect guard when user becomes available
      redirectedRef.current = false;
      fetchData()
    }
  }, [user, authLoading, router, fetchData])

  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  // CRITICAL: Prevent rendering dashboard content if authentication is still loading or user is not authenticated
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // SECURITY: Double-check authentication before rendering
  if (!user) {
    // This should not happen as middleware and useEffect redirect, but as a safety measure
    // Don't push router here to avoid multiple simultaneous redirects
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Main Navigation Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-50">
        <div className="mobile-container">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="touch-target"
                aria-label="Go to homepage"
              >
                <Home className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">PolyHarmony</h1>
            </div>

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href="/dashboard"
                    className={navigationMenuTriggerStyle()}
                    aria-current="page"
                  >
                    Dashboard
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href="/calendar"
                    className={navigationMenuTriggerStyle()}
                  >
                    Calendar
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href="/relationships"
                    className={navigationMenuTriggerStyle()}
                  >
                    Relationships
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href="/settings"
                    className={navigationMenuTriggerStyle()}
                  >
                    Settings
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <NotificationDropdown />
          </div>
        </div>
      </header>

      <main className="mobile-container mobile-padding" id="main-content">
        <div className="flex justify-between items-center mb-6">
          <h1 className="mobile-heading font-bold text-foreground">Dashboard</h1>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Events Card */}
          <div className="rounded-2xl p-6 text-white bg-blue-600 border border-blue-700">
            <div className="flex items-center mb-4">
              <Calendar className="h-6 w-6 mr-3 text-white" />
              <h3 className="mobile-heading font-semibold text-white">Upcoming Events</h3>
            </div>
            <p className="text-sm mb-4 opacity-90 text-blue-100">Your next {upcomingEvents.length} events</p>
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
                          <div className="flex-grow border-t border-blue-300"></div>
                          <span className="mx-4 text-sm font-medium whitespace-nowrap text-blue-200">
                            {dayLabel}
                          </span>
                          <div className="flex-grow border-t border-blue-300"></div>
                        </div>
                      )
                      
                      // Map events for this day
                      const eventItems = events.map(event => (
                        <div key={event.id} className="flex items-center p-3 rounded-lg mobile-touch-target bg-blue-700/50">
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
                <p className="text-center py-4 opacity-90 mobile-text text-blue-100">
                  No upcoming events
                </p>
              )}
              <button
                className="w-full mt-4 mobile-touch-target bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 py-3 px-4 rounded-lg border border-blue-200"
                onClick={() => handleNavigate('/events/create')}
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                Add Event
              </button>
            </div>
          </div>

          
        </div>
      </main>
    </div>
  )
}
