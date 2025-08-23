'use client'

import * as React from 'react'
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns'
// import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import enUS from 'date-fns/locale/en-US'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Info, Shield } from 'lucide-react'
import { PrivacyLevel } from './privacy-level-selector'

// Import styles for react-big-calendar
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Define shared event type
export interface SharedEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resourceId?: string
  privacyLevel: PrivacyLevel
  color?: string
  location?: string
  description?: string
  // For busy-only mode
  isBusy?: boolean
}

export interface SharedCalendar {
  id: string
  name: string
  color: string
  owner: string
  description?: string
  privacyLevel: PrivacyLevel
}

export interface ShareDetails {
  id: string
  owner: {
    id: string
    name: string
  }
  created: Date
  expires?: Date
  privacyLevel: PrivacyLevel
  showPrivateEvents: boolean
  allowResharing: boolean
}

export interface SharedViewProps {
  events: SharedEvent[]
  calendars: SharedCalendar[]
  share: ShareDetails
  onEventClick?: (event: SharedEvent) => void
  onDateRangeChange?: (start: Date, end: Date) => void
  isLoading?: boolean
  className?: string
}

export function SharedView({
  events,
  calendars,
  share,
  onEventClick,
  onDateRangeChange,
  isLoading = false,
  className
}: SharedViewProps) {
  const [date, setDate] = React.useState<Date>(new Date())
  const [visibleCalendars, setVisibleCalendars] = React.useState<string[]>(
    calendars.map(calendar => calendar.id)
  )
  const [viewType, setViewType] = React.useState<'month' | 'week' | 'day'>('month')
  
  // Setup localizer for react-big-calendar (temporarily disabled)
  // const localizer = React.useMemo(() => {
  //   return dateFnsLocalizer({
  //     format,
  //     parse: (str: string) => new Date(str),
  //     startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  //     getDay: (date: Date) => date.getDay(),
  //     locales: {
  //       'en-US': enUS
  //     }
  //   })
  // }, [])
  
  // Filter events based on visible calendars
  const filteredEvents = React.useMemo(() => {
    // First filter by visible calendars
    let filtered = events.filter(event => 
      visibleCalendars.includes(event.resourceId || '')
    )
    
    // Then filter based on privacy level
    return filtered.map(event => {
      if (event.privacyLevel === 'hidden' || event.privacyLevel === 'no_access') {
        // Hidden events should not be shown at all
        return null
      } else if (event.privacyLevel === 'busy_only') {
        // Busy events only show generic "Busy" title
        return {
          ...event,
          title: 'Busy',
          description: undefined,
          location: undefined,
          isBusy: true
        }
      }
      
      // Return the original event for other privacy levels
      return event
    }).filter(Boolean) as SharedEvent[]
  }, [events, visibleCalendars])
  
  // Handle calendar view navigation
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    switch (action) {
      case 'PREV':
        if (viewType === 'month') {
          setDate(prevDate => {
            const newDate = new Date(prevDate)
            newDate.setMonth(prevDate.getMonth() - 1)
            return newDate
          })
        } else if (viewType === 'week') {
          setDate(prevDate => subWeeks(prevDate, 1))
        } else {
          setDate(prevDate => addDays(prevDate, -1))
        }
        break
        
      case 'NEXT':
        if (viewType === 'month') {
          setDate(prevDate => {
            const newDate = new Date(prevDate)
            newDate.setMonth(prevDate.getMonth() + 1)
            return newDate
          })
        } else if (viewType === 'week') {
          setDate(prevDate => addWeeks(prevDate, 1))
        } else {
          setDate(prevDate => addDays(prevDate, 1))
        }
        break
        
      case 'TODAY':
        setDate(new Date())
        break
    }
  }
  
  // Handle calendar view change
  const handleViewChange = (newView: 'month' | 'week' | 'day') => {
    setViewType(newView)
  }
  
  // Toggle calendar visibility
  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendars(prev => {
      if (prev.includes(calendarId)) {
        return prev.filter(id => id !== calendarId)
      } else {
        return [...prev, calendarId]
      }
    })
  }
  
  // Custom event style
  const eventStyleGetter = (event: SharedEvent) => {
    const isLimited = event.privacyLevel === 'limited_access' || event.isBusy
    
    // Find the calendar this event belongs to
    const calendar = calendars.find(cal => cal.id === event.resourceId)
    const backgroundColor = event.color || calendar?.color || '#3b82f6'
    
    return {
      style: {
        backgroundColor,
        borderColor: backgroundColor,
        opacity: isLimited ? 0.7 : 1,
        color: '#fff',
        ...(isLimited && { borderStyle: 'dashed' })
      }
    }
  }
  
  // Custom toolbar component
  const CustomToolbar = () => (
    <div className="flex justify-between items-center mb-4 p-2">
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleNavigate('TODAY')}
          className="mr-2"
        >
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleNavigate('PREV')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleNavigate('NEXT')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-2 text-lg font-semibold">
          {viewType === 'day' ? format(date, 'PPP') : format(date, 'MMMM yyyy')}
        </span>
      </div>
      
      <div className="flex items-center">
        <div className="flex space-x-1">
          <Button
            variant={viewType === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('month')}
          >
            Month
          </Button>
          <Button
            variant={viewType === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('week')}
          >
            Week
          </Button>
          <Button
            variant={viewType === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange('day')}
          >
            Day
          </Button>
        </div>
      </div>
    </div>
  )
  
  // Get privacy level badge props
  const getPrivacyBadge = (level: PrivacyLevel) => {
    switch (level) {
      case 'full_access':
        return { variant: 'default' as const, icon: <Eye className="h-3 w-3 mr-1" />, label: 'Full Access' }
      case 'limited_access':
        return { variant: 'secondary' as const, icon: <Eye className="h-3 w-3 mr-1" />, label: 'Limited' }
      case 'busy_only':
        return { variant: 'outline' as const, icon: <EyeOff className="h-3 w-3 mr-1" />, label: 'Busy Only' }
      case 'hidden':
        return { variant: 'outline' as const, icon: <EyeOff className="h-3 w-3 mr-1" />, label: 'Hidden' }
      default:
        return { variant: 'outline' as const, icon: <EyeOff className="h-3 w-3 mr-1" />, label: 'No Access' }
    }
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            {share.owner.name}'s Calendar
            <Badge className="ml-2" {...getPrivacyBadge(share.privacyLevel)}>
              {getPrivacyBadge(share.privacyLevel).icon}
              {getPrivacyBadge(share.privacyLevel).label}
            </Badge>
          </CardTitle>
          <CardDescription>
            Shared {format(share.created, 'PPP')}
            {share.expires && (
              <span className="text-amber-600 ml-2">
                • Expires {format(share.expires, 'PPP')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>
      
      {/* Main calendar layout with sidebar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar with calendars */}
        <div className="md:w-64 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Calendars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {calendars.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No calendars shared
                </div>
              ) : (
                calendars.map(calendar => (
                  <div key={calendar.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`cal-${calendar.id}`}
                      checked={visibleCalendars.includes(calendar.id)}
                      onChange={() => toggleCalendarVisibility(calendar.id)}
                      className="rounded text-primary border-gray-300 focus:ring-primary"
                    />
                    <label htmlFor={`cal-${calendar.id}`} className="ml-2 flex items-center cursor-pointer text-sm">
                      <div
                        className="w-3 h-3 rounded-full mr-1"
                        style={{ backgroundColor: calendar.color }}
                      />
                      <span>{calendar.name}</span>
                    </label>
                    <Badge className="ml-auto" {...getPrivacyBadge(calendar.privacyLevel)} />
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="pt-0">
              {share.privacyLevel === 'busy_only' && (
                <div className="text-xs text-muted-foreground flex items-start">
                  <Info className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span>Only busy/free status is visible. Event details are hidden.</span>
                </div>
              )}
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">About this Share</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Permission Level:</span>
                <Badge {...getPrivacyBadge(share.privacyLevel)}>
                  {getPrivacyBadge(share.privacyLevel).icon}
                  {getPrivacyBadge(share.privacyLevel).label}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Show Private Events:</span>
                <Badge variant="outline">
                  {share.showPrivateEvents ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Can Reshare:</span>
                <Badge variant="outline">
                  {share.allowResharing ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Calendar view */}
        <Card className="flex-1 min-h-[600px] border-0 shadow-md p-0">
          <CardContent className="p-0">
            <div className="p-4">
              <CustomToolbar />
            </div>
            <div className="p-0 h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">Calendar view temporarily unavailable</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {filteredEvents.length} events would be displayed
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
