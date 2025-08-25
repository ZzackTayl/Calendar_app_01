import { addDays, addMinutes, isAfter, isBefore, differenceInDays, differenceInMinutes, parseISO } from 'date-fns'
import { Notification, NotificationType, NotificationPriority } from './types'
import { Event, Relationship } from '@/lib/supabase/types'

export interface NotificationGenerator {
  generateEventReminders: (events: Event[]) => Omit<Notification, 'id' | 'user_id' | 'created_at'>[]
  generateBirthdayReminders: (relationships: Relationship[]) => Omit<Notification, 'id' | 'user_id' | 'created_at'>[]
  generateAnniversaryReminders: (relationships: Relationship[]) => Omit<Notification, 'id' | 'user_id' | 'created_at'>[]
  generateMissedEventNotifications: (events: Event[]) => Omit<Notification, 'id' | 'user_id' | 'created_at'>[]
  generateEventConflictNotifications: (events: Event[]) => Omit<Notification, 'id' | 'user_id' | 'created_at'>[]
}

class DefaultNotificationGenerator implements NotificationGenerator {
  generateEventReminders(events: Event[]): Omit<Notification, 'id' | 'user_id' | 'created_at'>[] {
    const notifications: Omit<Notification, 'id' | 'user_id' | 'created_at'>[] = []
    const now = new Date()

    // Reminder intervals: 15 minutes, 1 hour, 1 day before
    const reminderIntervals = [15, 60, 1440] // minutes

    for (const event of events) {
      const eventStart = parseISO(event.start_time)
      
      // Skip past events
      if (isBefore(eventStart, now)) continue

      for (const intervalMinutes of reminderIntervals) {
        const reminderTime = addMinutes(eventStart, -intervalMinutes)
        
        // Only create reminders for future times within a reasonable window
        const minutesUntilReminder = differenceInMinutes(reminderTime, now)
        
        // Create reminder if it's within the next 7 days and hasn't passed
        if (minutesUntilReminder > 0 && minutesUntilReminder <= 10080) { // 7 days
          let priority: NotificationPriority = 'medium'
          if (intervalMinutes === 15) priority = 'high'
          if (intervalMinutes === 60) priority = 'medium'
          if (intervalMinutes === 1440) priority = 'low'

          const timeText = intervalMinutes === 15 ? '15 minutes' :
                          intervalMinutes === 60 ? '1 hour' :
                          intervalMinutes === 1440 ? '1 day' : `${intervalMinutes} minutes`

          notifications.push({
            type: 'event_reminder',
            title: 'Event Reminder',
            message: `${event.title} starts in ${timeText}`,
            priority,
            read: false,
            scheduled_for: reminderTime.toISOString(),
            related_id: event.id,
            action_url: '/calendar',
            metadata: {
              event_id: event.id,
              reminder_interval: intervalMinutes
            }
          })
        }
      }
    }

    return notifications
  }

  generateBirthdayReminders(relationships: Relationship[]): Omit<Notification, 'id' | 'user_id' | 'created_at'>[] {
    const notifications: Omit<Notification, 'id' | 'user_id' | 'created_at'>[] = []
    const now = new Date()

    for (const relationship of relationships) {
      if (!relationship.birthday) continue

      try {
        const birthday = parseISO(relationship.birthday)
        const thisYearBirthday = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate())
        
        // If this year's birthday has passed, check next year
        const nextBirthday = isBefore(thisYearBirthday, now) 
          ? new Date(now.getFullYear() + 1, birthday.getMonth(), birthday.getDate())
          : thisYearBirthday

        const daysUntilBirthday = differenceInDays(nextBirthday, now)

        // Create reminders for 1 day and 7 days before
        const reminderDays = [1, 7]
        
        for (const daysBefore of reminderDays) {
          if (daysUntilBirthday === daysBefore) {
            notifications.push({
              type: 'upcoming_birthday',
              title: 'Birthday Reminder',
              message: `${relationship.partner_name}'s birthday is ${daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`}`,
              priority: daysBefore === 1 ? 'high' : 'medium',
              read: false,
              related_id: relationship.id,
              action_url: '/relationships',
              metadata: {
                relationship_id: relationship.id,
                birthday: relationship.birthday,
                days_until: daysUntilBirthday
              }
            })
          }
        }
      } catch (error) {
        console.error('Error processing birthday for relationship:', relationship.id, error)
      }
    }

    return notifications
  }

  generateAnniversaryReminders(relationships: Relationship[]): Omit<Notification, 'id' | 'user_id' | 'created_at'>[] {
    const notifications: Omit<Notification, 'id' | 'user_id' | 'created_at'>[] = []
    const now = new Date()

    for (const relationship of relationships) {
      if (!relationship.anniversary_date) continue

      try {
        const anniversary = parseISO(relationship.anniversary_date)
        const thisYearAnniversary = new Date(now.getFullYear(), anniversary.getMonth(), anniversary.getDate())
        
        // If this year's anniversary has passed, check next year
        const nextAnniversary = isBefore(thisYearAnniversary, now) 
          ? new Date(now.getFullYear() + 1, anniversary.getMonth(), anniversary.getDate())
          : thisYearAnniversary

        const daysUntilAnniversary = differenceInDays(nextAnniversary, now)
        const yearsSince = now.getFullYear() - anniversary.getFullYear()

        // Create reminders for 1 day and 7 days before
        const reminderDays = [1, 7]
        
        for (const daysBefore of reminderDays) {
          if (daysUntilAnniversary === daysBefore) {
            const yearText = yearsSince > 0 ? ` (${yearsSince} year${yearsSince === 1 ? '' : 's'})` : ''
            
            notifications.push({
              type: 'relationship_anniversary',
              title: 'Anniversary Reminder',
              message: `${relationship.partner_name} anniversary is ${daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`}${yearText}`,
              priority: daysBefore === 1 ? 'high' : 'medium',
              read: false,
              related_id: relationship.id,
              action_url: '/relationships',
              metadata: {
                relationship_id: relationship.id,
                anniversary_date: relationship.anniversary_date,
                years_since: yearsSince,
                days_until: daysUntilAnniversary
              }
            })
          }
        }
      } catch (error) {
        console.error('Error processing anniversary for relationship:', relationship.id, error)
      }
    }

    return notifications
  }

  generateMissedEventNotifications(events: Event[]): Omit<Notification, 'id' | 'user_id' | 'created_at'>[] {
    const notifications: Omit<Notification, 'id' | 'user_id' | 'created_at'>[] = []
    const now = new Date()

    for (const event of events) {
      const eventStart = parseISO(event.start_time)
      const eventEnd = event.end_time ? parseISO(event.end_time) : addMinutes(eventStart, 60)
      
      // Check if event has ended and was within the last 24 hours
      if (isAfter(now, eventEnd)) {
        const hoursAfterEvent = differenceInMinutes(now, eventEnd) / 60
        
        // Create missed event notification for events that ended 1-24 hours ago
        if (hoursAfterEvent >= 1 && hoursAfterEvent <= 24) {
          notifications.push({
            type: 'missed_event',
            title: 'Missed Event',
            message: `You missed: ${event.title}`,
            priority: 'low',
            read: false,
            related_id: event.id,
            action_url: '/calendar',
            metadata: {
              event_id: event.id,
              hours_after: Math.round(hoursAfterEvent)
            }
          })
        }
      }
    }

    return notifications
  }

  generateEventConflictNotifications(events: Event[]): Omit<Notification, 'id' | 'user_id' | 'created_at'>[] {
    const notifications: Omit<Notification, 'id' | 'user_id' | 'created_at'>[] = []
    const now = new Date()

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) => 
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    )

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEvent = sortedEvents[i]
      const nextEvent = sortedEvents[i + 1]
      
      const currentStart = parseISO(currentEvent.start_time)
      const currentEnd = currentEvent.end_time ? parseISO(currentEvent.end_time) : addMinutes(currentStart, 60)
      const nextStart = parseISO(nextEvent.start_time)
      
      // Skip past events
      if (isBefore(currentStart, now)) continue
      
      // Check for overlap or very close timing (less than 30 minutes apart)
      const timeBetween = differenceInMinutes(nextStart, currentEnd)
      
      if (timeBetween < 30 && isAfter(nextStart, currentStart)) {
        const isOverlap = isBefore(nextStart, currentEnd)
        
        notifications.push({
          type: 'event_conflict',
          title: isOverlap ? 'Event Conflict' : 'Tight Schedule',
          message: isOverlap 
            ? `"${currentEvent.title}" and "${nextEvent.title}" overlap`
            : `Only ${timeBetween} minutes between "${currentEvent.title}" and "${nextEvent.title}"`,
          priority: isOverlap ? 'high' : 'medium',
          read: false,
          action_url: '/calendar',
          metadata: {
            event1_id: currentEvent.id,
            event2_id: nextEvent.id,
            is_overlap: isOverlap,
            minutes_between: timeBetween
          }
        })
      }
    }

    return notifications
  }
}

export const notificationGenerator = new DefaultNotificationGenerator()

// Utility function to generate all notifications for a user
export function generateAllNotifications(
  events: Event[], 
  relationships: Relationship[]
): Omit<Notification, 'id' | 'user_id' | 'created_at'>[] {
  const notifications: Omit<Notification, 'id' | 'user_id' | 'created_at'>[] = []
  
  // Generate different types of notifications
  notifications.push(...notificationGenerator.generateEventReminders(events))
  notifications.push(...notificationGenerator.generateBirthdayReminders(relationships))
  notifications.push(...notificationGenerator.generateAnniversaryReminders(relationships))
  notifications.push(...notificationGenerator.generateMissedEventNotifications(events))
  notifications.push(...notificationGenerator.generateEventConflictNotifications(events))
  
  // Sort by priority and scheduled time
  return notifications.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const aPriority = priorityOrder[a.priority] || 1
    const bPriority = priorityOrder[b.priority] || 1
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority // Higher priority first
    }
    
    // If same priority, sort by scheduled time (or creation time)
    const aTime = a.scheduled_for || new Date().toISOString()
    const bTime = b.scheduled_for || new Date().toISOString()
    return new Date(aTime).getTime() - new Date(bTime).getTime()
  })
}
