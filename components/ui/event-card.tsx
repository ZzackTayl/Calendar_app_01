'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDateInTimeZone, getEffectiveTimeZone } from '@/lib/time-zones/time-zone-utils'
import { 
  Clock, 
  Users, 
  MapPin, 
  Calendar, 
  Eye,
  EyeOff, 
  Lock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play
} from 'lucide-react'
import { Event } from '@/lib/supabase/types'
import { Tooltip } from '@/components/ui/tooltip'
import { format, isToday, isTomorrow, addDays, differenceInMinutes } from 'date-fns'

/**
 * Props for the EventCard component
 * 
 * Modern card design matching the provided UI mockup with state-based styling.
 */
interface EventCardProps {
  /** Event data from the database - must be valid Event object */
  event: Event
  /** Current user's timezone preference for display formatting */
  userTimeZone?: string
  /** Whether to show compact view (reduced information display) */
  compact?: boolean
  /** Whether to show detailed information - overrides compact on desktop */
  showDetails?: boolean
  /** ViewMode context for responsive behavior */
  viewMode?: 'month' | 'week' | 'day' | 'list'
  /** Click handler for main card interaction */
  onClick?: (event: Event) => void
  /** Edit action handler - typically for event owners */
  onEdit?: (event: Event) => void
  /** Join/participate action handler - for live events */
  onJoin?: (event: Event) => void
  /** Loading state indicator - shows skeleton while processing */
  isLoading?: boolean
  /** Error state with user-friendly message */
  error?: string
  /** Additional CSS classes for custom styling */
  className?: string
  /** Test ID for automated testing and QA */
  'data-testid'?: string
  /** Current user ID for permission checks */
  currentUserId?: string
  /** Whether user can edit this event */
  canEdit?: boolean
}

/**
 * Event state derived from event data
 */
type EventState = 'live' | 'upcoming' | 'past' | 'cancelled' | 'tentative'

/**
 * Get the current state of an event based on timing and status
 */
const getEventState = (event: Event): EventState => {
  const now = new Date()
  const startTime = new Date(event.start_time)
  const endTime = new Date(event.end_time)

  if (event.status === 'cancelled') return 'cancelled'
  if (event.status === 'tentative') return 'tentative'

  if (now >= startTime && now <= endTime) return 'live'
  if (now < startTime) return 'upcoming'
  return 'past'
}

/**
 * Format time range with duration calculation
 */
const formatTimeWithDuration = (
  startTime: string, 
  endTime: string, 
  timeZone: string, 
  isAllDay: boolean = false
): { timeText: string; durationText?: string } => {
  if (isAllDay) {
    return { timeText: 'All day' }
  }

  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = differenceInMinutes(end, start)
    
    const startFormatted = formatDateInTimeZone(startTime, timeZone, 'h:mm a')
    const endFormatted = formatDateInTimeZone(endTime, timeZone, 'h:mm a')
    
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    let durationText = ''
    
    if (hours > 0 && minutes > 0) {
      durationText = `${hours}h ${minutes}m`
    } else if (hours > 0) {
      durationText = `${hours}h`
    } else {
      durationText = `${minutes}m`
    }
    
    return {
      timeText: `${startFormatted} – ${endFormatted}`,
      durationText: `(${durationText})`
    }
  } catch (error) {
    console.error('Error formatting time range:', error)
    return { timeText: 'Time unavailable' }
  }
}

/**
 * Format date in a human-friendly way
 */
const formatEventDate = (dateString: string, timeZone: string): string => {
  try {
    const date = new Date(dateString)
    
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    
    const daysDiff = Math.floor((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 7 && daysDiff > 1) {
      return format(date, 'EEEE') // Day name for this week
    }
    
    return formatDateInTimeZone(dateString, timeZone, 'MMM d, yyyy')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Date unavailable'
  }
}

/**
 * Get event subtitle based on state
 */
const getEventSubtitle = (eventState: EventState, event: Event): string => {
  switch (eventState) {
    case 'live':
      return 'This session is now open.'
    case 'upcoming':
      return event.description || 'A moment of focus awaits.'
    case 'past':
      return 'Session completed.'
    case 'cancelled':
      return 'This session was cancelled.'
    case 'tentative':
      return 'This session is tentative.'
    default:
      return event.description || 'Scheduled session.'
  }
}

/**
 * Get the current state of an event based on timing and status
 */
const getEventState = (event: Event): EventState => {
  const now = new Date()
  const startTime = new Date(event.start_time)
  const endTime = new Date(event.end_time)

  if (event.status === 'cancelled') return 'cancelled'
  if (event.status === 'tentative') return 'tentative'

  if (now >= startTime && now <= endTime) return 'live'
  if (now < startTime) return 'upcoming'
  return 'past'
}

/**
 * Format time range with proper timezone support
 */
const formatTimeRange = (
  startTime: string, 
  endTime: string, 
  timeZone: string, 
  isAllDay: boolean = false
): string => {
  if (isAllDay) {
    return 'All day'
  }

  try {
    const start = formatDateInTimeZone(startTime, timeZone, 'h:mm a')
    const end = formatDateInTimeZone(endTime, timeZone, 'h:mm a')
    return `${start} - ${end}`
  } catch (error) {
    console.error('Error formatting time range:', error)
    return 'Time unavailable'
  }
}

/**
 * Get attendee count with proper pluralization
 */
const getAttendeeText = (count: number): string => {
  if (count === 0) return 'No attendees'
  if (count === 1) return '1 attendee'
  return `${count} attendees`
}

/**
 * Enhanced EventCard Component
 * 
 * A fully accessible, neurodiversity-affirming event card component that:
 * - Supports all EventStatus types with proper visual indicators
 * - Provides timezone-aware time display
 * - Includes comprehensive ARIA labels and screen reader support
 * - Uses semantic HTML structure for accessibility
 * - Optimizes performance with React.memo
 * - Integrates with existing design system
 * - Handles loading and error states gracefully
 * 
 * Design principles:
 * - Predictable visual hierarchy
 * - Clear state indicators
 * - High contrast accessibility
 * - Consistent interaction patterns
 * - Non-technical error messaging
 */
const EventCard = React.memo<EventCardProps>(({
  event,
  userTimeZone,
  compact = false,
  showDetails,
  viewMode = 'month',
  onClick,
  onEdit,
  // onDelete,  // Reserved for future use
  onJoin,
  isLoading = false,
  error,
  className,
  'data-testid': testId = 'event-card',
  currentUserId,
  canEdit = false,
  // canDelete = false  // Reserved for future use
}) => {
  const effectiveTimeZone = getEffectiveTimeZone(userTimeZone || event.time_zone)
  const eventState = getEventState(event)
  const privacyInfo = privacyConfig[event.privacy_level]
  const statusInfo = event.status ? statusConfig[event.status] : statusConfig.confirmed

  // Determine if we should show detailed view based on props and responsive context
  const shouldShowDetails = React.useMemo(() => {
    // If showDetails is explicitly set, respect it
    if (showDetails !== undefined) return showDetails
    
    // Desktop logic: show details in sidebar for week/month views, always for day view
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return viewMode === 'day' || viewMode === 'list' || !compact
    }
    
    // Mobile logic: show details only in day view or when explicitly clicked
    return viewMode === 'day' || viewMode === 'list'
  }, [showDetails, viewMode, compact])

  // Responsive compact override - always compact on small screens except in day/list view
  const effectiveCompact = React.useMemo(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return viewMode !== 'day' && viewMode !== 'list'
    }
    return compact
  }, [compact, viewMode])

  // Calculate attendee count with proper handling of undefined arrays
  const attendeeCount = React.useMemo(() => {
    let count = 0
    if (event.visible_to_relationships?.length) {
      count += event.visible_to_relationships.length
    }
    if (event.visible_to_groups?.length) {
      count += event.visible_to_groups.length
    }
    // Always include the event owner as an attendee
    return Math.max(count + 1, 1)
  }, [event.visible_to_relationships, event.visible_to_groups])

  // Format date and time
  const formattedDate = React.useMemo(() => {
    try {
      return formatDateInTimeZone(event.start_time, effectiveTimeZone, 'MMM d, yyyy')
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Date unavailable'
    }
  }, [event.start_time, effectiveTimeZone])

  const formattedTime = React.useMemo(() => {
    return formatTimeRange(
      event.start_time, 
      event.end_time, 
      effectiveTimeZone, 
      event.is_all_day
    )
  }, [event.start_time, event.end_time, effectiveTimeZone, event.is_all_day])

  // Event state styling
  const stateStyles = React.useMemo(() => {
    switch (eventState) {
      case 'live':
        return {
          container: 'bg-emerald-50 border-emerald-200 border-2',
          indicator: 'bg-emerald-500 animate-pulse',
          badge: 'bg-emerald-500 text-white',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }
      case 'upcoming':
        return {
          container: 'bg-blue-50 border-blue-200 border-2',
          indicator: 'bg-blue-500',
          badge: 'bg-blue-500 text-white',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
      case 'past':
        return {
          container: 'bg-gray-50 border-gray-200',
          indicator: 'bg-gray-400',
          badge: 'bg-gray-500 text-white',
          button: 'bg-gray-600 hover:bg-gray-700 text-white'
        }
      case 'cancelled':
        return {
          container: 'bg-red-50 border-red-200 opacity-75',
          indicator: 'bg-red-500',
          badge: 'bg-red-500 text-white',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        }
      case 'tentative':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          indicator: 'bg-yellow-500',
          badge: 'bg-yellow-500 text-white',
          button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
        }
      default:
        return {
          container: 'bg-white border-gray-200',
          indicator: 'bg-gray-400',
          badge: 'bg-gray-500 text-white',
          button: 'bg-gray-600 hover:bg-gray-700 text-white'
        }
    }
  }, [eventState])

  // Action button logic with enhanced permissions and accessibility
  const actionButton = React.useMemo(() => {
    // Live events get join button with proper context
    if (eventState === 'live') {
      return { 
        text: 'Join', 
        handler: onJoin, 
        ariaLabel: `Join live event "${event.title}", currently in progress`,
        variant: 'default' as const,
        icon: Play
      }
    }
    
    // Upcoming events show view or edit based on permissions
    if (eventState === 'upcoming') {
      if (canEdit && event.user_id === currentUserId) {
        return { 
          text: 'Edit', 
          handler: onEdit, 
          ariaLabel: `Edit your upcoming event "${event.title}"`,
          variant: 'outline' as const
        }
      }
      return { 
        text: 'View', 
        handler: onClick, 
        ariaLabel: `View details for upcoming event "${event.title}"`,
        variant: 'outline' as const
      }
    }
    
    // Cancelled events are view-only with clear context
    if (eventState === 'cancelled') {
      return { 
        text: 'Details', 
        handler: onClick, 
        ariaLabel: `View details for cancelled event "${event.title}"`,
        variant: 'ghost' as const
      }
    }
    
    // Past events default to view
    return { 
      text: 'View', 
      handler: onClick, 
      ariaLabel: `View details for past event "${event.title}"`,
      variant: 'ghost' as const
    }
  }, [eventState, event.title, event.user_id, currentUserId, canEdit, onClick, onEdit, onJoin])

  // Loading state with enhanced accessibility
  if (isLoading) {
    return (
      <div 
        className={cn(
          "rounded-lg p-4 border border-gray-200 animate-pulse bg-white",
          effectiveCompact && "p-3",
          className
        )}
        data-testid={`${testId}-loading`}
        role="status"
        aria-label="Loading event information, please wait"
        aria-live="polite"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {/* Status indicator skeleton */}
            <div className="w-3 h-3 bg-gray-300 rounded-full" aria-hidden="true" />
            <div className="space-y-2 flex-1">
              {/* Title skeleton */}
              <div className="h-5 bg-gray-300 rounded w-3/4" aria-hidden="true" />
              {/* Metadata skeleton */}
              <div className="h-4 bg-gray-300 rounded w-1/2" aria-hidden="true" />
              {!compact && (
                <div className="h-4 bg-gray-300 rounded w-2/3" aria-hidden="true" />
              )}
            </div>
          </div>
          {/* Action button skeleton */}
          <div className="h-10 bg-gray-300 rounded w-20" aria-hidden="true" />
        </div>
        <span className="sr-only">Loading event data</span>
      </div>
    )
  }

  // Error state with enhanced accessibility and user-friendly messaging
  if (error) {
    return (
      <div 
        className={cn(
          "rounded-lg p-4 border-2 border-red-200 bg-red-50",
          effectiveCompact && "p-3",
          className
        )}
        data-testid={`${testId}-error`}
        role="alert"
        aria-live="assertive"
        aria-label="Event loading error"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle 
            className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" 
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              Unable to Load Event
            </h3>
            <p className="text-sm text-red-700">
              {error || 'An unexpected error occurred while loading this event. Please try again later.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const PrivacyIcon = privacyInfo.icon
  const StatusIcon = statusInfo.icon

  return (
    <article 
      className={cn(
        "rounded-lg transition-all duration-200 hover:shadow-md focus-within:shadow-md",
        "border-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2",
        stateStyles.container,
        effectiveCompact ? "p-3" : "p-4",
        className
      )}
      data-testid={testId}
      role="article"
      aria-labelledby={`${testId}-title`}
      aria-describedby={`${testId}-details`}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault()
          onClick(event)
        }
      }}
    >
        <div className="flex items-start justify-between gap-4">
          {/* Left side: Event details */}
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* State indicator with accessibility */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-1">
              <div 
                className={cn(
                  "w-3 h-3 rounded-full",
                  stateStyles.indicator
                )}
                role="img"
                aria-label={`Event status: ${eventState}`}
              />
              {!effectiveCompact && (
                <Badge 
                  className={cn("text-xs px-1 py-0", stateStyles.badge)}
                  aria-label={`Event state: ${eventState}`}
                >
                  {eventState}
                </Badge>
              )}
            </div>
            
            {/* Event information */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title and status */}
              <div className="flex items-start gap-2">
                <h3 
                  id={`${testId}-title`}
                  className={cn(
                    "font-semibold text-lg leading-tight",
                    effectiveCompact && "text-base",
                    eventState === 'cancelled' && "line-through text-gray-600"
                  )}
                >
                  {event.title}
                </h3>
                {event.status !== 'confirmed' && (
                  <Tooltip content={`Event status: ${statusInfo.label}`}>
                    <span 
                      className="flex-shrink-0 mt-0.5" 
                      role="img" 
                      aria-label={`Event status: ${statusInfo.label}`}
                    >
                      <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
                    </span>
                  </Tooltip>
                )}
              </div>

              {/* Event metadata */}
              <div 
                id={`${testId}-details`}
                className="space-y-1"
              >
                {/* Date and time */}
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    <span className="sr-only">Date: </span>
                    {formattedDate}
                  </span>
                  <Clock className="w-4 h-4 flex-shrink-0 ml-2" aria-hidden="true" />
                  <span className="truncate">
                    <span className="sr-only">Time: </span>
                    {formattedTime}
                  </span>
                </div>

                {/* Location (if available) */}
                {event.location && shouldShowDetails && (
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      <span className="sr-only">Location: </span>
                      {event.location}
                    </span>
                  </div>
                )}

                {/* Attendees and privacy */}
                <div className="flex items-center space-x-4 text-sm text-gray-700">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                    <span>
                      <span className="sr-only">Attendees: </span>
                      {getAttendeeText(attendeeCount)}
                    </span>
                  </div>
                  
                  <Tooltip content={`Privacy setting: ${privacyInfo.label}`}>
                    <div className="flex items-center space-x-1 cursor-help">
                      <PrivacyIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs">
                        <span className="sr-only">Privacy level: </span>
                        {privacyInfo.label}
                      </span>
                    </div>
                  </Tooltip>
                </div>

                {/* Description (if available and showing details) */}
                {event.description && shouldShowDetails && (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                    <span className="sr-only">Description: </span>
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Action button */}
          <div className="flex-shrink-0">
            <Button 
              variant={actionButton.variant}
              size={effectiveCompact ? 'sm' : 'default'}
              onClick={() => actionButton.handler?.(event)}
              disabled={!actionButton.handler}
              aria-label={actionButton.ariaLabel}
              className={cn(
                eventState === 'live' && "animate-pulse shadow-lg",
                eventState === 'cancelled' && "opacity-75"
              )}
            >
              {actionButton.icon && (
                <actionButton.icon className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              {actionButton.text}
            </Button>
          </div>
        </div>

        {/* Color strip for event color (if available) */}
        {event.color && !compact && (
          <div 
            className={`h-1 w-full rounded-full mt-3 opacity-60 ${event.color ? `bg-[${event.color}]` : ''}`}
            role="img"
            aria-label={`Event theme color: ${event.color}`}
          />
        )}
      </article>
    )
})

EventCard.displayName = 'EventCard'

// Export with comprehensive TypeScript support
export { EventCard }
export type { EventCardProps, EventState }

// Default export for convenience
export default EventCard
