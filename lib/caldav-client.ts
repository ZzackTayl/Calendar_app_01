import { Event } from '@/lib/supabase/types'

interface CalDAVConfig {
  serverUrl: string
  username: string
  password: string
  calendarPath?: string
}

interface CalDAVEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  start: Date
  end: Date
  isAllDay: boolean
  timezone?: string
  recurrence?: string
}

export class CalDAVClient {
  private config: CalDAVConfig

  constructor(config: CalDAVConfig) {
    this.config = {
      calendarPath: '/calendars/',
      ...config
    }
  }

  /**
   * Discover available calendars on the CalDAV server
   */
  async discoverCalendars(): Promise<string[]> {
    try {
      const response = await fetch(this.config.serverUrl, {
        method: 'PROPFIND',
        headers: {
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8',
          'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`
        },
        body: `
          <?xml version="1.0" encoding="utf-8" ?>
          <propfind xmlns="DAV:">
            <prop>
              <resourcetype/>
              <displayname/>
            </prop>
          </propfind>
        `
      })

      if (!response.ok) {
        throw new Error(`Failed to discover calendars: ${response.status}`)
      }

      const xmlText = await response.text()
      // Parse XML response to extract calendar URLs
      // This is a simplified version - you'd need proper XML parsing
      const calendarUrls: string[] = []
      
      // Extract calendar URLs from the response
      const matches = xmlText.match(/<href>([^<]+)<\/href>/g)
      if (matches) {
        matches.forEach(match => {
          const url = match.replace(/<href>([^<]+)<\/href>/, '$1')
          if (url.includes('calendar') && !url.endsWith('/')) {
            calendarUrls.push(url)
          }
        })
      }

      return calendarUrls
    } catch (error) {
      console.error('Error discovering calendars:', error)
      throw error
    }
  }

  /**
   * Fetch events from a specific calendar
   */
  async fetchEvents(calendarUrl: string, startDate: Date, endDate: Date): Promise<CalDAVEvent[]> {
    try {
      const timeRange = this.formatTimeRange(startDate, endDate)
      
      const response = await fetch(calendarUrl, {
        method: 'REPORT',
        headers: {
          'Depth': '1',
          'Content-Type': 'application/xml; charset=utf-8',
          'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`
        },
        body: `
          <?xml version="1.0" encoding="utf-8" ?>
          <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
            <d:prop>
              <d:getetag/>
              <c:calendar-data/>
            </d:prop>
            <c:filter>
              <c:comp-filter name="VCALENDAR">
                <c:comp-filter name="VEVENT">
                  <c:time-range start="${timeRange.start}" end="${timeRange.end}"/>
                </c:comp-filter>
              </c:comp-filter>
            </c:filter>
          </c:calendar-query>
        `
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`)
      }

      const xmlText = await response.text()
      return this.parseCalendarData(xmlText)
    } catch (error) {
      console.error('Error fetching events:', error)
      throw error
    }
  }

  /**
   * Create a new event in the calendar
   */
  async createEvent(calendarUrl: string, event: CalDAVEvent): Promise<string> {
    try {
      const icalData = this.generateICalData(event)
      const eventUrl = `${calendarUrl}/${event.uid}.ics`

      const response = await fetch(eventUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`
        },
        body: icalData
      })

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`)
      }

      return eventUrl
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(eventUrl: string, event: CalDAVEvent): Promise<void> {
    try {
      const icalData = this.generateICalData(event)

      const response = await fetch(eventUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`
        },
        body: icalData
      })

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.status}`)
      }
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventUrl: string): Promise<void> {
    try {
      const response = await fetch(eventUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.password}`)}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.status}`)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  /**
   * Convert CalDAV events to your app's Event format
   */
  convertToAppEvent(caldavEvent: CalDAVEvent, userId: string): Partial<Event> {
    return {
      user_id: userId,
      title: caldavEvent.summary,
      description: caldavEvent.description || undefined,
      location: caldavEvent.location || undefined,
      start_time: caldavEvent.start.toISOString(),
      end_time: caldavEvent.end.toISOString(),
      is_all_day: caldavEvent.isAllDay,
      time_zone: caldavEvent.timezone || 'UTC',
      recurrence_rule: caldavEvent.recurrence || undefined,
      status: 'confirmed',
      external_calendar_id: caldavEvent.uid,
      external_calendar_source: 'apple_calendar',
      privacy_level: 'private',
      color: undefined,
      visible_to_contacts: [],
      visible_to_groups: []
    }
  }

  private formatTimeRange(startDate: Date, endDate: Date) {
    return {
      start: startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      end: endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
  }

  private generateICalData(event: CalDAVEvent): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PolyHarmony//Calendar//EN
BEGIN:VEVENT
UID:${event.uid}
DTSTAMP:${formatDate(new Date())}
${event.isAllDay ? 
  `DTSTART;VALUE=DATE:${event.start.toISOString().split('T')[0]}` :
  `DTSTART:${formatDate(event.start)}`
}
${event.isAllDay ? 
  `DTEND;VALUE=DATE:${event.end.toISOString().split('T')[0]}` :
  `DTEND:${formatDate(event.end)}`
}
SUMMARY:${event.summary}
${event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : ''}
${event.location ? `LOCATION:${event.location}` : ''}
${event.recurrence ? `RRULE:${event.recurrence}` : ''}
END:VEVENT
END:VCALENDAR`
  }

  private parseCalendarData(xmlData: string): CalDAVEvent[] {
    // This is a simplified parser - you'd want to use a proper XML parser
    const events: CalDAVEvent[] = []
    
    // Extract calendar data from XML response
    const calendarDataMatches = xmlData.match(/<c:calendar-data>([\s\S]*?)<\/c:calendar-data>/g)
    
    if (calendarDataMatches) {
      calendarDataMatches.forEach(match => {
        const icalData = match.replace(/<c:calendar-data>([\s\S]*?)<\/c:calendar-data>/, '$1')
        const event = this.parseICalData(icalData)
        if (event) {
          events.push(event)
        }
      })
    }

    return events
  }

  private parseICalData(icalData: string): CalDAVEvent | null {
    // Parse iCal data to extract event information
    // This is a simplified parser - you'd want to use a proper iCal parser
    const lines = icalData.split('\n')
    let currentEvent: Partial<CalDAVEvent> = {}
    
    for (const line of lines) {
      if (line.startsWith('UID:')) {
        currentEvent.uid = line.substring(4)
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8)
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12)
      } else if (line.startsWith('LOCATION:')) {
        currentEvent.location = line.substring(9)
      } else if (line.startsWith('DTSTART')) {
        const dateStr = line.includes('VALUE=DATE:') ? 
          line.split('VALUE=DATE:')[1] : 
          line.split(':')[1]
        currentEvent.start = this.parseDate(dateStr)
        currentEvent.isAllDay = line.includes('VALUE=DATE:')
      } else if (line.startsWith('DTEND')) {
        const dateStr = line.includes('VALUE=DATE:') ? 
          line.split('VALUE=DATE:')[1] : 
          line.split(':')[1]
        currentEvent.end = this.parseDate(dateStr)
      } else if (line.startsWith('RRULE:')) {
        currentEvent.recurrence = line.substring(6)
      }
    }

    if (currentEvent.uid && currentEvent.summary && currentEvent.start && currentEvent.end) {
      return currentEvent as CalDAVEvent
    }

    return null
  }

  private parseDate(dateStr: string): Date {
    // Parse iCal date format
    if (dateStr.length === 8) {
      // All-day event (YYYYMMDD)
      const year = parseInt(dateStr.substring(0, 4))
      const month = parseInt(dateStr.substring(4, 6)) - 1
      const day = parseInt(dateStr.substring(6, 8))
      return new Date(year, month, day)
    } else {
      // Date-time event (YYYYMMDDTHHMMSSZ)
      const year = parseInt(dateStr.substring(0, 4))
      const month = parseInt(dateStr.substring(4, 6)) - 1
      const day = parseInt(dateStr.substring(6, 8))
      const hour = parseInt(dateStr.substring(9, 11))
      const minute = parseInt(dateStr.substring(11, 13))
      const second = parseInt(dateStr.substring(13, 15))
      return new Date(year, month, day, hour, minute, second)
    }
  }
}
