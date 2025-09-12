/**
 * CalDAV client for Apple Calendar integration
 * This is a placeholder implementation
 */

export interface CalDAVEvent {
  uid: string;
  summary: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}

export class CalDAVClient {
  constructor(private serverUrl: string, private credentials: { username: string; password: string }) {}

  async connect(): Promise<void> {
    // CalDAV connection is established lazily when needed
    // No persistent connection required for stateless operations
  }

  async getCalendars(): Promise<any[]> {
    try {
      const response = await fetch(`${this.serverUrl}/calendars/`, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`CalDAV request failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      return this.parseCalendarList(xmlText);
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
      return [];
    }
  }

  async getEvents(calendarUrl: string, startDate: Date, endDate: Date): Promise<CalDAVEvent[]> {
    try {
      const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      const response = await fetch(`${this.serverUrl}${calendarUrl}`, {
        method: 'REPORT',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '1'
        },
        body: this.buildCalendarQuery(start, end)
      });

      if (!response.ok) {
        throw new Error(`CalDAV query failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      return this.parseEvents(xmlText);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  }

  async createEvent(calendarUrl: string, event: CalDAVEvent): Promise<void> {
    try {
      const icalData = this.convertToICal(event);
      const eventUrl = `${calendarUrl}${event.uid}.ics`;
      
      const response = await fetch(`${this.serverUrl}${eventUrl}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`,
          'Content-Type': 'text/calendar; charset=utf-8'
        },
        body: icalData
      });

      if (!response.ok) {
        throw new Error(`CalDAV event creation failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(calendarUrl: string, event: CalDAVEvent): Promise<void> {
    try {
      const icalData = this.convertToICal(event);
      const eventUrl = `${calendarUrl}${event.uid}.ics`;
      
      const response = await fetch(`${this.serverUrl}${eventUrl}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`,
          'Content-Type': 'text/calendar; charset=utf-8'
        },
        body: icalData
      });

      if (!response.ok) {
        throw new Error(`CalDAV event update failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async deleteEvent(calendarUrl: string, uid: string): Promise<void> {
    try {
      const eventUrl = `${calendarUrl}${uid}.ics`;
      
      const response = await fetch(`${this.serverUrl}${eventUrl}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`
        }
      });

      if (!response.ok) {
        throw new Error(`CalDAV event deletion failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  async discoverCalendars(): Promise<string[]> {
    try {
      const response = await fetch(`${this.serverUrl}/`, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${btoa(`${this.credentials.username}:${this.credentials.password}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`CalDAV discovery failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      return this.parseCalendarDiscovery(xmlText);
    } catch (error) {
      console.error('Failed to discover calendars:', error);
      return [];
    }
  }

  async fetchEvents(calendarUrl: string, startDate: Date, endDate: Date): Promise<CalDAVEvent[]> {
    return this.getEvents(calendarUrl, startDate, endDate);
  }

  convertToAppEvent(caldavEvent: CalDAVEvent, userId: string): any {
    return {
      external_calendar_id: caldavEvent.uid,
      title: caldavEvent.summary,
      description: caldavEvent.description,
      start_time: caldavEvent.startDate.toISOString(),
      end_time: caldavEvent.endDate.toISOString(),
      location: caldavEvent.location,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private parseCalendarList(xmlText: string): any[] {
    // Parse CalDAV XML response to extract calendar information
    // This is a simplified parser - in production, use a proper XML parser
    const calendars: any[] = [];
    
    // Extract calendar URLs from XML response
    const urlMatches = xmlText.match(/<D:href>([^<]+)<\/D:href>/g);
    if (urlMatches) {
      urlMatches.forEach(match => {
        const url = match.replace(/<\/?D:href>/g, '');
        if (url.includes('/calendars/') && !url.endsWith('/calendars/')) {
          calendars.push({
            url: url,
            name: url.split('/').pop() || 'Unknown Calendar',
            displayName: url.split('/').pop() || 'Unknown Calendar'
          });
        }
      });
    }
    
    return calendars;
  }

  private parseEvents(xmlText: string): CalDAVEvent[] {
    // Parse CalDAV XML response to extract event information
    const events: CalDAVEvent[] = [];
    
    // Extract event data from XML response
    // This is a simplified parser - in production, use a proper XML parser
    const eventMatches = xmlText.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
    if (eventMatches) {
      eventMatches.forEach(eventText => {
        const event = this.parseICalEvent(eventText);
        if (event) {
          events.push(event);
        }
      });
    }
    
    return events;
  }

  private parseCalendarDiscovery(xmlText: string): string[] {
    // Parse CalDAV discovery response to find calendar collections
    const calendars: string[] = [];
    
    const urlMatches = xmlText.match(/<D:href>([^<]+)<\/D:href>/g);
    if (urlMatches) {
      urlMatches.forEach(match => {
        const url = match.replace(/<\/?D:href>/g, '');
        if (url.includes('/calendars/') && !url.endsWith('/calendars/')) {
          calendars.push(url);
        }
      });
    }
    
    return calendars;
  }

  private buildCalendarQuery(start: string, end: string): string {
    return `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${start}" end="${end}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;
  }

  private convertToICal(event: CalDAVEvent): string {
    const start = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PolyHarmony Calendar//EN
BEGIN:VEVENT
UID:${event.uid}
DTSTART:${start}
DTEND:${end}
DTSTAMP:${now}
SUMMARY:${event.summary || ''}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT
END:VCALENDAR`;
  }

  private parseICalEvent(eventText: string): CalDAVEvent | null {
    try {
      const uidMatch = eventText.match(/UID:([^\r\n]+)/);
      const summaryMatch = eventText.match(/SUMMARY:([^\r\n]+)/);
      const descriptionMatch = eventText.match(/DESCRIPTION:([^\r\n]+)/);
      const locationMatch = eventText.match(/LOCATION:([^\r\n]+)/);
      const startMatch = eventText.match(/DTSTART:([^\r\n]+)/);
      const endMatch = eventText.match(/DTEND:([^\r\n]+)/);
      
      if (!uidMatch || !startMatch || !endMatch) {
        return null;
      }
      
      const startDate = this.parseICalDate(startMatch[1]);
      const endDate = this.parseICalDate(endMatch[1]);
      
      if (!startDate || !endDate) {
        return null;
      }
      
      return {
        uid: uidMatch[1],
        summary: summaryMatch?.[1] || '',
        description: descriptionMatch?.[1] || '',
        location: locationMatch?.[1] || '',
        startDate,
        endDate
      };
    } catch (error) {
      console.error('Failed to parse iCal event:', error);
      return null;
    }
  }

  private parseICalDate(dateString: string): Date | null {
    try {
      // Parse iCal date format (YYYYMMDDTHHMMSSZ)
      if (dateString.length === 15 && dateString.endsWith('Z')) {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateString.substring(6, 8));
        const hour = parseInt(dateString.substring(9, 11));
        const minute = parseInt(dateString.substring(11, 13));
        const second = parseInt(dateString.substring(13, 15));
        
        return new Date(Date.UTC(year, month, day, hour, minute, second));
      }
      
      // Parse date-only format (YYYYMMDD)
      if (dateString.length === 8) {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateString.substring(6, 8));
        
        return new Date(Date.UTC(year, month, day));
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse iCal date:', error);
      return null;
    }
  }
}
