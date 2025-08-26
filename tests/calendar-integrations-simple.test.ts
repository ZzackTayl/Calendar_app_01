import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalDAVClient } from '@/lib/caldav-client';

// Mock fetch for HTTP requests
global.fetch = vi.fn();

describe('Calendar Integrations - Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CalDAV Client', () => {
    it('should initialize with correct configuration', () => {
      const config = {
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      };

      const client = new CalDAVClient(config);
      expect(client).toBeInstanceOf(CalDAVClient);
    });

    it('should discover calendars successfully', async () => {
      const mockResponse = `
        <?xml version="1.0" encoding="utf-8"?>
        <multistatus xmlns="DAV:">
          <response>
            <href>/calendars/primary</href>
            <propstat>
              <prop>
                <resourcetype>
                  <collection/>
                  <calendar xmlns="urn:ietf:params:xml:ns:caldav"/>
                </resourcetype>
                <displayname>Primary Calendar</displayname>
              </prop>
              <status>HTTP/1.1 200 OK</status>
            </propstat>
          </response>
        </multistatus>
      `;

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      });

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      const calendars = await client.discoverCalendars();
      expect(calendars).toContain('/calendars/primary');
      expect(fetch).toHaveBeenCalledWith(
        'https://caldav.icloud.com',
        expect.objectContaining({
          method: 'PROPFIND',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('should handle calendar discovery errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      await expect(client.discoverCalendars()).rejects.toThrow('Failed to discover calendars: 401');
    });

    it('should fetch events from calendar', async () => {
      const mockResponse = `
        <?xml version="1.0" encoding="utf-8"?>
        <multistatus xmlns="DAV:">
          <response>
            <propstat>
              <prop>
                <c:calendar-data>
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event-123
DTSTART:20250101T100000Z
DTEND:20250101T110000Z
SUMMARY:Test Event
DESCRIPTION:Test Description
LOCATION:Test Location
END:VEVENT
END:VCALENDAR
                </c:calendar-data>
              </prop>
            </propstat>
          </response>
        </multistatus>
      `;

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      });

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const events = await client.fetchEvents('/calendars/primary', startDate, endDate);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        uid: 'test-event-123',
        summary: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
      });
    });

    it('should convert CalDAV events to app format', () => {
      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      const caldavEvent = {
        uid: 'test-event-123',
        summary: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        start: new Date('2025-01-01T10:00:00Z'),
        end: new Date('2025-01-01T11:00:00Z'),
        isAllDay: false,
        timezone: 'UTC',
        recurrence: undefined,
      };

      const appEvent = client.convertToAppEvent(caldavEvent, 'test-user-id');

      expect(appEvent).toMatchObject({
        user_id: 'test-user-id',
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        external_calendar_id: 'test-event-123',
        external_calendar_source: 'apple_calendar',
        privacy_level: 'private',
      });
    });

    it('should handle network timeouts gracefully', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      await expect(client.discoverCalendars()).rejects.toThrow('Network timeout');
    });

    it('should handle malformed XML responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('Invalid XML response'),
      });

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      const calendars = await client.discoverCalendars();
      expect(calendars).toEqual([]);
    });

    it('should handle empty calendar responses', async () => {
      const mockResponse = `
        <?xml version="1.0" encoding="utf-8"?>
        <multistatus xmlns="DAV:">
        </multistatus>
      `;

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      });

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      const calendars = await client.discoverCalendars();
      expect(calendars).toEqual([]);
    });
  });

  describe('Event Format Conversion', () => {
    it('should handle all-day events correctly', () => {
      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      const caldavEvent = {
        uid: 'all-day-event-123',
        summary: 'All Day Event',
        description: 'This is an all-day event',
        location: 'Home',
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-02T00:00:00Z'),
        isAllDay: true,
        timezone: 'UTC',
        recurrence: undefined,
      };

      const appEvent = client.convertToAppEvent(caldavEvent, 'test-user-id');

      expect(appEvent).toMatchObject({
        user_id: 'test-user-id',
        title: 'All Day Event',
        description: 'This is an all-day event',
        location: 'Home',
        external_calendar_id: 'all-day-event-123',
        external_calendar_source: 'apple_calendar',
        privacy_level: 'private',
        is_all_day: true,
      });
    });

    it('should handle recurring events', () => {
      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      const caldavEvent = {
        uid: 'recurring-event-123',
        summary: 'Weekly Meeting',
        description: 'Team standup',
        location: 'Conference Room A',
        start: new Date('2025-01-01T09:00:00Z'),
        end: new Date('2025-01-01T10:00:00Z'),
        isAllDay: false,
        timezone: 'UTC',
        recurrence: 'FREQ=WEEKLY;BYDAY=MO',
      };

      const appEvent = client.convertToAppEvent(caldavEvent, 'test-user-id');

      expect(appEvent).toMatchObject({
        user_id: 'test-user-id',
        title: 'Weekly Meeting',
        description: 'Team standup',
        location: 'Conference Room A',
        external_calendar_id: 'recurring-event-123',
        external_calendar_source: 'apple_calendar',
        privacy_level: 'private',
        recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO',
      });
    });
  });

  describe('Security and Validation', () => {
    it('should properly encode credentials in Authorization header', async () => {
      const mockResponse = `
        <?xml version="1.0" encoding="utf-8"?>
        <multistatus xmlns="DAV:">
          <response>
            <href>/calendars/primary</href>
          </response>
        </multistatus>
      `;

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      });

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test-password',
      });

      await client.discoverCalendars();

      expect(fetch).toHaveBeenCalledWith(
        'https://caldav.icloud.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Basic ' + btoa('test@icloud.com:test-password'),
          }),
        })
      );
    });

    it('should handle special characters in credentials', async () => {
      const mockResponse = `
        <?xml version="1.0" encoding="utf-8"?>
        <multistatus xmlns="DAV:">
          <response>
            <href>/calendars/primary</href>
          </response>
        </multistatus>
      `;

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockResponse),
      });

      const client = new CalDAVClient({
        serverUrl: 'https://caldav.icloud.com',
        username: 'test@icloud.com',
        password: 'test@password!123',
      });

      await client.discoverCalendars();

      expect(fetch).toHaveBeenCalledWith(
        'https://caldav.icloud.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Basic ' + btoa('test@icloud.com:test@password!123'),
          }),
        })
      );
    });
  });
});
