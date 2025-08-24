'use client';

/*
 * Note on CSS Inline Styles:
 * This component uses minimal inline styles only for dynamic relationship colors
 * that are fetched from the database at runtime. These cannot be moved to external 
 * CSS as they are user-configurable and unknown at build time. All static styles
 * have been moved to external CSS classes in globals.css.
 */

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Event, type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RoadmapView } from '@/components/ui/roadmap-view'
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, CupSoda as Today, Clock, MapPin, Users, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
  startOfDay,
  endOfDay,
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns'
import { DemoStore } from '@/lib/demo-store'
import { getRelationshipColor, ensureRelationshipColor, createColorStyle } from '@/lib/relationship-colors'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'roadmap'>('month')
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null)
  const [longPressDate, setLongPressDate] = useState<Date | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [isLongPress, setIsLongPress] = useState(false)
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseClient(), [])

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    if(user || demoMode) {
      fetchData()
    }
  }, [user, demoMode, router, currentDate, supabase, fetchData])

  const fetchData = async () => {
    if (demoMode) {
      const uid = user?.id || 'demo-user'
      const rels = DemoStore.listRelationships(uid)
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const calendarStart = startOfWeek(monthStart)
      const calendarEnd = endOfWeek(monthEnd)
      const events = DemoStore.listEvents(uid, {
        from: calendarStart.toISOString(),
        to: calendarEnd.toISOString(),
      })
      setRelationships(rels as any)
      setEvents(events as any)
      setLoading(false)
      return
    }

    try {
      // Fetch relationships for color mapping
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id || '')
      
      if (relationshipsError) throw relationshipsError
      setRelationships(relationshipsData || [])

      // Fetch events for the current month view
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const calendarStart = startOfWeek(monthStart)
      const calendarEnd = endOfWeek(monthEnd)
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user?.id || '')
        .gte('start_time', calendarStart.toISOString())
        .lte('start_time', calendarEnd.toISOString())
        .order('start_time', { ascending: true })
      
      if (eventsError) throw eventsError
      setEvents(eventsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRelationshipColor = (relationshipId: string) => {
    const relationship = relationships.find(r => r.id === relationshipId)
    if (!relationship) {
      return '#6B7280' // Default gray
    }
    
    // Ensure the relationship has a color
    const color = ensureRelationshipColor(relationship)
    return color
  }

  // Helper function to create dynamic color styles
  // Note: These inline styles are necessary for dynamic relationship colors from database
  const createDynamicColorStyle = (relationshipId: string | null | undefined): React.CSSProperties => {
    if (!relationshipId) {
      return createColorStyle('#6B7280') // Default gray
    }
    
    const color = getRelationshipColor(relationshipId)
    return createColorStyle(color)
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
    } else if (viewMode === 'roadmap') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : addDays(currentDate, -7))
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
    } else if (viewMode === 'roadmap') {
      const weekEnd = addDays(currentDate, 6)
      return `${format(currentDate, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
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
      const isSelected = selectedDate && isSameDay(day, selectedDate)

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
          <div className="flex flex-wrap gap-1">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className={`event-dot-positioned event-dot-pos-${index}`}
                style={createDynamicColorStyle(event.relationship_id)}
                title={event.title}
              />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-xs text-muted-foreground">+{dayEvents.length - 3}</span>
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
        <div key={day.toISOString()} className="flex-1 min-h-[200px]">
          <div 
            className={`h-full border border-border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
              isCurrentDay ? 'bg-primary/20 border-primary/50' : 'bg-card/50 hover:bg-card/80'
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
              <div className={`text-lg font-semibold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
            
            <div className="space-y-1">
              {dayEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="week-event-item"
                  style={createDynamicColorStyle(event.relationship_id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/events/${event.id}`)
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
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Week days */}
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
          <div className={`text-3xl font-bold ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
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
                        style={createDynamicColorStyle(event.relationship_id)}
                      />
                      <h3 className="font-semibold text-lg text-foreground">{event.title}</h3>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`privacy-indicator-${event.privacy_level}`}
                    >
                      {event.privacy_level}
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

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
                onClick={() => router.push('/dashboard')}
                className="mr-2 touch-target"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CalendarIcon className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Calendar</h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="hidden sm:flex bg-muted/50 rounded-lg p-1">
                {(['month', 'week', 'day', 'roadmap'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="capitalize px-3 py-1 text-xs"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="touch-target"
              >
                <Today className="w-4 h-4 mr-1" />
                Today
              </Button>
              <Button
                size="icon"
                onClick={() => router.push('/events/create')}
                className="touch-target"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Mobile View Selector */}
        <div className="sm:hidden mb-4">
          <div className="flex bg-muted/50 rounded-lg p-1">
            {(['month', 'week', 'day', 'roadmap'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="flex-1 capitalize text-sm"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className={viewMode === 'day' || viewMode === 'roadmap' ? 'lg:col-span-3' : 'lg:col-span-2'}>
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">
                    {getViewTitle()}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
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
                
                {viewMode === 'roadmap' && (
                  <div className="flex justify-center">
                    <RoadmapView 
                      currentDate={currentDate} 
                      events={events} 
                      onDateSelect={setSelectedDate}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Event Details Sidebar - Hidden in day view as events are shown inline */}
          <div className={`space-y-6 ${viewMode === 'day' || viewMode === 'roadmap' ? 'hidden' : ''}`}>
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
                        const relationship = relationships.find(r => r.id === event.relationship_id)
                        return (
                          <div
                            key={event.id}
                            className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/events/${event.id}`)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="sidebar-event-indicator"
                                  style={createDynamicColorStyle(event.relationship_id)}
                                />
                                <h4 className="font-medium text-foreground">{event.title}</h4>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`privacy-indicator-${event.privacy_level}`}
                              >
                                {event.privacy_level}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
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
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
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
                          style={{
                            '--dynamic-color': relationship.color
                          } as React.CSSProperties}
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

            {/* Quick Actions */}
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push('/events/create')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
                <Button 
                  onClick={() => router.push('/relationships/add')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Add Partner
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </CardContent>
            </Card>
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
  )
}