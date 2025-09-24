'use client';

/*
 * Note on CSS Inline Styles:
 * This component uses minimal inline styles only for dynamic relationship colors
 * that are fetched from the database at runtime. These cannot be moved to external 
 * CSS as they are user-configurable and unknown at build time. All static styles
 * have been moved to external CSS classes in globals.css.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Event, type Relationship } from '@/lib/supabase/types'
import { useRealtimeEvents } from '@/hooks/use-realtime-events'
import { useRealtimeRelationships } from '@/hooks/use-realtime-relationships'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CupSoda as Today, Clock, MapPin, Users, X, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useHierarchicalNavigation } from '@/lib/navigation-utils'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  addWeeks,
  subWeeks,
  isSameMonth, 
  isSameDay, 
  isToday,
  isTomorrow,
  parseISO,
  differenceInMinutes
} from 'date-fns'

import { ensureRelationshipColor } from '@/lib/relationship-colors'
import { getPrivacyLevelBadge } from '@/lib/privacy-utils';
import { RealtimeErrorBoundary } from '@/components/error-boundary'
import NotificationDropdown from '@/components/notifications/NotificationDropdown'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null)
  const [longPressDate, setLongPressDate] = useState<Date | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [isLongPress, setIsLongPress] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { goBack } = useHierarchicalNavigation()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const redirectedRef = useRef(false)
  
  // Calculate date range for current view
  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    return {
      start: calendarStart.toISOString(),
      end: calendarEnd.toISOString(),
    }
  }, [currentDate])

  // Use real-time hooks for production data
  const {
    events,
    loading: eventsLoading,
    error: eventsError
  } = useRealtimeEvents({
    dateRange,
    enableOptimisticUpdates: true
  })

  const {
    relationships,
    loading: relationshipsLoading,
    error: relationshipsError
  } = useRealtimeRelationships({
    enableOptimisticUpdates: true
  })

  const loading = authLoading || eventsLoading || relationshipsLoading

  useEffect(() => {
    // Redirect to sign-in if not authenticated (only after auth loading is complete)
    // Note: Unverified users (those with user but no email_confirmed_at) are handled by middleware
    // The middleware will redirect them to /auth/confirm-email appropriately
    if (!authLoading && !user && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin')
      return
    }

    // Reset redirect flag if user becomes authenticated
    if (user && redirectedRef.current) {
      redirectedRef.current = false
    }
  }, [user, authLoading, router])

  const getRelationshipColor = (relationshipId: string) => {
    const relationship = relationships.find(r => r.id === relationshipId)
    if (!relationship) {
      return '#6B7280' // Default gray
    }

    // Ensure the relationship has a color
    const color = ensureRelationshipColor(relationship)
    return color
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event =>
      event.start_time && isSameDay(parseISO(event.start_time), date)
    )
  }

  const navigate = (direction: 'prev' | 'next') => {
    setSelectedDate(null)
    if (viewMode === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1))
    } else if (viewMode === 'day') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy')
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    } else if (viewMode === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy')
    }
    return ''
  }

  const handleTouchStart = (date: Date) => {
    setTouchStartTime(Date.now())
    setLongPressDate(date)
    setIsLongPress(false)
  }

  const handleTouchEnd = (date: Date) => {
    const touchEndTime = Date.now()
    const touchDuration = touchStartTime ? touchEndTime - touchStartTime : 0
    
    // Long press threshold: 500ms
    if (touchDuration >= 500) {
      // Long press - show quick add
      setIsLongPress(true)
      setShowQuickAdd(true)
      setSelectedDate(date)
      
      // Haptic feedback for supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
    } else if (!isLongPress) {
      // Short tap - select date to view events (only if not following a long press)
      setSelectedDate(date)
      setShowQuickAdd(false)
    }
    
    setTouchStartTime(null)
    setLongPressDate(null)
  }

  const handleTouchCancel = () => {
    setTouchStartTime(null)
    setLongPressDate(null)
    setIsLongPress(false)
  }

  const handleDayClick = (date: Date) => {
    // Only handle click if it's not a touch device or not a long press
    if (!('ontouchstart' in window) || !isLongPress) {
      setSelectedDate(date)
      setShowQuickAdd(false)
    }
    setIsLongPress(false)
  }

  const handleQuickAddEvent = () => {
    if (selectedDate) {
      // Navigate to create event with pre-selected date
      const searchParams = new URLSearchParams({
        date: selectedDate.toISOString().split('T')[0]
      })
      router.push(`/events/create?${searchParams.toString()}`)
    }
    setShowQuickAdd(false)
  }

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    const days = []
    let currentDay = calendarStart

    while (currentDay <= calendarEnd) {
      const day = currentDay
      const dayEvents = getEventsForDate(day)
      const isCurrentMonth = isSameMonth(day, currentDate)
      const isCurrentDay = isToday(day)
      const isSelected = selectedDate && isSameDay(day, selectedDate);

      days.push(
        <div
          key={day.toISOString()}
          className={`calendar-day ${isCurrentDay ? 'today' : ''} ${
            dayEvents.length > 0 ? 'has-events' : ''
          } ${isSelected ? 'ring-2 ring-primary' : ''} ${
            !isCurrentMonth ? 'text-muted-foreground/50' : ''
          } ${longPressDate && isSameDay(longPressDate, day) ? 'scale-95 bg-accent/20' : ''}`}
          onClick={() => handleDayClick(day)}
          onTouchStart={(e) => {
            e.preventDefault()
            handleTouchStart(day)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            handleTouchEnd(day)
          }}
          onTouchCancel={handleTouchCancel}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          {/* Event dots */}
          <div className="flex flex-wrap gap-1" role="list" aria-label="Events for this day">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className={`event-dot-positioned event-dot-pos-${index}`}
                data-relationship-color={getRelationshipColor(event.relationship_id || '')}
                title={`${event.title} at ${format(parseISO(event.start_time), 'h:mm a')}`}
                role="listitem"
                aria-label={`${event.title} - ${format(parseISO(event.start_time), 'h:mm a')}`}
              />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-xs text-muted-foreground" aria-label={`${dayEvents.length - 3} more events`}>
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        </div>
      )
      currentDay = addDays(currentDay, 1)
    }

    return days
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate)
    const weekEnd = endOfWeek(currentDate)
    
    const days = []
    let currentDay = weekStart

    while (currentDay <= weekEnd) {
      const day = currentDay
      const dayEvents = getEventsForDate(day)
      const isCurrentDay = isToday(day)
      const isSelected = selectedDate && isSameDay(day, selectedDate)

      days.push(
        <div key={day.toISOString()} className="flex-1 min-h-[120px]">
          <div 
            className={`h-full border border-border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
              isCurrentDay ? 'bg-gradient-to-br from-orange-500/20 to-purple-500/20 border-orange-400/50 shadow-lg shadow-orange-500/20' : 'bg-card/50 hover:bg-card/80'
            } ${isSelected ? 'ring-2 ring-primary' : ''} ${
              longPressDate && isSameDay(longPressDate, day) ? 'scale-95 bg-accent/20' : ''
            }`}
            onClick={() => handleDayClick(day)}
            onTouchStart={(e) => {
              e.preventDefault()
              handleTouchStart(day)
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              handleTouchEnd(day)
            }}
            onTouchCancel={handleTouchCancel}
          >
            <div className="text-center mb-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg font-semibold ${isCurrentDay ? 'text-orange-400' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
            
            <div className="space-y-1">
              {dayEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="week-event-item"
                  data-relationship-color={getRelationshipColor(event.relationship_id || '')}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDayClick(day) // Select the day instead of navigating to event
                  }}
                >
                  <div className="font-medium text-foreground truncate">{event.title}</div>
                  <div className="text-muted-foreground">
                    {format(parseISO(event.start_time), 'h:mm a')}
                  </div>
                </div>
              ))}
              {dayEvents.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{dayEvents.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>
      )
      currentDay = addDays(currentDay, 1)
    }

    return (
      <div className="space-y-4">
        {/* Week days - removed duplicate day headers */}
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate)
    const isCurrentDay = isToday(currentDate)

    return (
      <div className="space-y-4">
        {/* Day header */}
        <div className={`text-center p-6 rounded-lg border ${
          isCurrentDay ? 'bg-primary/20 border-primary/50' : 'bg-card/50 border-border'
        }`}>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {format(currentDate, 'EEEE')}
          </div>
          <div className={`text-3xl font-bold ${isCurrentDay ? 'text-orange-400' : 'text-foreground'}`}>
            {format(currentDate, 'd')}
          </div>
          <div className="text-sm text-muted-foreground">
            {format(currentDate, 'MMMM yyyy')}
          </div>
        </div>

        {/* Day events */}
        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <div className="text-center py-12 bg-card/30 rounded-lg border border-border">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No events scheduled for this day</p>
              <Button 
                onClick={() => router.push('/events/create')}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          ) : (
            dayEvents.map((event) => {
              const relationship = relationships.find(r => r.id === event.relationship_id)
              return (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer bg-card/50"
                  onClick={() => router.push(`/events/${event.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="day-event-indicator"
                        data-relationship-color={getRelationshipColor(event.relationship_id || '')}
                      />
                      <h3 className="font-semibold text-lg text-foreground">{event.title}</h3>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`privacy-indicator-${event.privacy_level} flex items-center space-x-1 text-xs`}
                    >
                      {getPrivacyLevelBadge(event.privacy_level).icon}
                      {getPrivacyLevelBadge(event.privacy_level).label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground ml-7">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {event.location}
                      </div>
                    )}
                    
                    {relationship && (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        {relationship.partner_name}
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-3 ml-7">
                      {event.description}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // CRITICAL: Prevent rendering calendar content if authentication is still loading or user is not authenticated
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <RealtimeErrorBoundary>
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
                    >
                      Dashboard
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="/calendar"
                      className={navigationMenuTriggerStyle()}
                      aria-current="page"
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

        {/* Calendar Header */}
        <header className="bg-card/80 backdrop-blur border-b border-border sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => goBack('/calendar')}
                  className="mr-1 sm:mr-2 touch-target flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mr-2 sm:mr-3 flex-shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">Calendar</h1>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                {/* View Mode Toggle - Desktop */}
                <div className="hidden sm:flex bg-muted/50 rounded-lg p-1">
                  {(['month', 'week', 'day'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode(mode)}
                      className="capitalize px-2 sm:px-3 py-1 text-xs"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
                
                {viewMode !== 'week' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="touch-target hidden xs:flex"
                  >
                    <Today className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Today</span>
                  </Button>
                )}
                {viewMode !== 'week' && (
                  <Button
                    size="icon"
                    onClick={() => router.push('/events/create')}
                    className="touch-target flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile View Selector */}
          <div className="sm:hidden mb-4">
            <div className="flex bg-muted/50 rounded-lg p-1">
              {(['month', 'week', 'day'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="flex-1 capitalize text-xs px-2"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className={viewMode === 'day' ? 'lg:col-span-3' : 'lg:col-span-2'}>
              <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl font-bold truncate">
                      {getViewTitle()}
                    </CardTitle>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('prev')}
                        className="touch-target"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('next')}
                        className="touch-target"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'month' && (
                    <>
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-3 uppercase tracking-wider">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-2">
                        {renderCalendarDays()}
                      </div>
                    </>
                  )}
                  
                  {viewMode === 'week' && renderWeekView()}
                  
                  {viewMode === 'day' && renderDayView()}
                  
                </CardContent>
              </Card>
            </div>

            {/* Event Details Sidebar - Hidden in day view as events are shown inline */}
            <div className={`space-y-6 ${viewMode === 'day' ? 'hidden' : ''}`}>
              {/* Selected Date Events */}
              {selectedDate && (
                <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CalendarIcon className="w-5 h-5 mr-2" />
                      {format(selectedDate, 'EEEE, MMMM d')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDateEvents.length === 0 ? (
                      <div className="text-center py-8">
                        <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No events scheduled</p>
                        <Button 
                          onClick={() => router.push('/events/create')}
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Event
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedDateEvents.map((event) => {
                          // Event state logic
                          const now = new Date()
                          const startTime = new Date(event.start_time)
                          const endTime = new Date(event.end_time)
                          const isLive = now >= startTime && now <= endTime
                          const isUpcoming = now < startTime
                          
                          // Card styling based on state
                          const cardStyles = {
                            background: isLive ? 'bg-teal-50' : 'bg-gray-50',
                            border: isLive ? 'border-teal-200' : 'border-gray-200',
                            accent: isLive ? 'bg-teal-400' : 'bg-gray-400',
                            buttonClass: isLive ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }
                          
                          // Format time and duration
                          const startFormatted = format(startTime, 'h:mm a')
                          const endFormatted = format(endTime, 'h:mm a')
                          const duration = differenceInMinutes(endTime, startTime)
                          const hours = Math.floor(duration / 60)
                          const minutes = duration % 60
                          const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                          
                          // Event date
                          const eventDate = isToday(startTime) ? 'Today' : 
                                          isTomorrow(startTime) ? 'Tomorrow' : 
                                          format(startTime, 'EEEE')
                          
                          // Subtitle
                          const subtitle = isLive ? 'This session is now open.' : (event.description || 'A moment of focus awaits.')
                          
                          // Attendee count
                          const attendeeCount = (event.visible_to_relationships?.length || 0) + 1
                          
                          // Button text
                          const buttonText = isLive ? 'Begin' : 'Prepare'
                          
                          return (
                            <article
                              key={event.id}
                              className={`rounded-xl p-6 border-2 transition-all duration-200 hover:shadow-lg relative cursor-pointer ${
                                cardStyles.background
                              } ${cardStyles.border}`}
                              onClick={() => router.push(`/events/${event.id}`)}
                            >
                              {/* Status indicator dot */}
                              <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${cardStyles.accent}`} />
                              
                              {/* Event title */}
                              <h3 className="text-xl font-semibold text-gray-900 mb-2 pr-6">{event.title}</h3>
                              
                              {/* Event subtitle */}
                              <p className="text-gray-600 mb-6 text-sm leading-relaxed">{subtitle}</p>
                              
                              {/* Event details */}
                              <div className="space-y-3 mb-6">
                                <div className="flex items-center text-gray-700">
                                  <Clock className="w-4 h-4 mr-3 flex-shrink-0" />
                                  <span className="text-sm">
                                    {eventDate}, {startFormatted} – {endFormatted} ({durationText})
                                  </span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                  <Users className="w-4 h-4 mr-3 flex-shrink-0" />
                                  <span className="text-sm">{attendeeCount} attendees</span>
                                </div>
                              </div>
                              
                              {/* Action button */}
                              <Button
                                className={`w-full py-3 font-medium transition-colors ${cardStyles.buttonClass}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Handle button action - for now just navigate to event
                                  router.push(`/events/${event.id}`)
                                }}
                              >
                                {buttonText}
                              </Button>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Relationships Legend */}
              {relationships.length > 0 && (
                <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Relationship Colors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {relationships.map((relationship) => (
                        <div key={relationship.id} className="flex items-center space-x-3">
                          <div
                            className="relationship-color-indicator"
                            data-relationship-color={getRelationshipColor(relationship.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {relationship.partner_name}
                            </p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {relationship.relationship_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
          
          {/* Quick Add Event Modal - Mobile */}
          {showQuickAdd && selectedDate && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
              <div className="bg-card border-t border-border sm:border sm:rounded-lg w-full sm:w-auto sm:min-w-[320px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Add Event
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowQuickAdd(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </div>
                
                <div className="space-y-3">
                  <Button
                    onClick={handleQuickAddEvent}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Event
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowQuickAdd(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RealtimeErrorBoundary>
  )
}
