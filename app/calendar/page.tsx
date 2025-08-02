'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Event, type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, CupSoda as Today, Clock, MapPin, Users } from 'lucide-react'
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
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    fetchData()
  }, [user, demoMode, router, currentDate])

  const fetchData = async () => {
    if (demoMode) {
      // Load demo data for calendar
      const demoEvents = [
        {
          id: 'demo-1',
          title: 'Coffee with Alex',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          privacy_level: 'public',
          relationship_id: 'demo-rel-1'
        },
        {
          id: 'demo-2', 
          title: 'Date Night with Sam',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          privacy_level: 'private',
          relationship_id: 'demo-rel-2'
        }
      ]
      
      const demoRelationships = [
        {
          id: 'demo-rel-1',
          partner_name: 'Alex',
          color: '#3B82F6',
          relationship_type: 'primary'
        },
        {
          id: 'demo-rel-2', 
          partner_name: 'Sam',
          color: '#10B981',
          relationship_type: 'secondary'
        }
      ]
      
      setEvents(demoEvents as any)
      setRelationships(demoRelationships as any)
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
        .eq('user_id', user?.id || '')
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
    return relationship?.color || '#6B7280'
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.start_time), date)
    )
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
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
            !isCurrentMonth ? 'text-gray-400' : ''
          }`}
          onClick={() => setSelectedDate(day)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-xs text-gray-500">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          {/* Event dots */}
          <div className="flex flex-wrap gap-1">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className="event-dot"
                style={{ 
                  backgroundColor: event.relationship_id 
                    ? getRelationshipColor(event.relationship_id) 
                    : '#6B7280',
                  left: `${index * 6}px`,
                  bottom: '4px'
                }}
                title={event.title}
              />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-xs text-gray-500">+{dayEvents.length - 3}</span>
            )}
          </div>
        </div>
      )
      currentDay = addDays(currentDay, 1)
    }

    return days
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
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
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Calendar</h1>
            </div>
            <div className="flex items-center space-x-2">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">
                    {format(currentDate, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth('prev')}
                      className="touch-target"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigateMonth('next')}
                      className="touch-target"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendarDays()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event Details Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            {selectedDate && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    {format(selectedDate, 'EEEE, MMMM d')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">No events scheduled</p>
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
                            className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/events/${event.id}`)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ 
                                    backgroundColor: event.relationship_id 
                                      ? getRelationshipColor(event.relationship_id) 
                                      : '#6B7280' 
                                  }}
                                />
                                <h4 className="font-medium text-gray-900">{event.title}</h4>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`privacy-indicator-${event.privacy_level}`}
                              >
                                {event.privacy_level}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
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
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
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
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
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
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: relationship.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {relationship.partner_name}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
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
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
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
      </div>
    </div>
  )
}