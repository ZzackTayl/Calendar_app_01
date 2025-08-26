import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CalDAVClient } from '@/lib/caldav-client';

// Mock environment variables
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64-character hex string
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google';

// Mock fetch for HTTP requests
global.fetch = vi.fn();

// Mock crypto for encryption/decryption
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn(() => new Uint8Array(32)),
    subtle: {
      generateKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
});

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockReturnValue({
        setCredentials: vi.fn(),
      }),
    },
    calendar: vi.fn().mockReturnValue({
      calendarList: {
        list: vi.fn(),
      },
      events: {
        list: vi.fn(),
      },
    }),
  },
}));

// Mock Supabase server functions
vi.mock('@/lib/supabase/server', () => ({
  createRouteHandlerClient: vi.fn(),
  createSupabaseServer: vi.fn(),
}));

describe('Calendar Integrations', () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock user
    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn(),
    };

    // Mock the Supabase functions
    const { createRouteHandlerClient, createSupabaseServer } = require('@/lib/supabase/server');
    createRouteHandlerClient.mockReturnValue(mockSupabase);
    createSupabaseServer.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Apple Calendar Integration (CalDAV)', () => {
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
                  <calendar-data>
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
                  </calendar-data>
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
    });

    describe('Apple Calendar API Routes', () => {
      it('should authenticate Apple Calendar successfully', async () => {
        // Mock successful CalDAV connection
        const mockCalDAVResponse = `
          <?xml version="1.0" encoding="utf-8"?>
          <multistatus xmlns="DAV:">
            <response>
              <href>/calendars/primary</href>
            </response>
          </multistatus>
        `;

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockCalDAVResponse),
        });

        // Mock user data with no existing Apple Calendar connection
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            apple_calendar_access_token: null,
            apple_calendar_refresh_token: null,
          },
          error: null,
        });

        // Mock successful upsert
        mockSupabase.upsert.mockResolvedValueOnce({
          data: { id: 'test-user-id' },
          error: null,
        });

        const { POST } = await import('@/app/api/auth/apple/route');
        const request = new Request('http://localhost:3000/api/auth/apple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appleId: 'test@icloud.com',
            appSpecificPassword: 'abcd-efgh-ijkl-mnop',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('Successfully connected to Apple Calendar');
        expect(data.calendars_found).toBeGreaterThan(0);
        expect(data.connection_tested).toBe(true);
      });

      it('should handle Apple Calendar authentication errors', async () => {
        // Mock CalDAV authentication failure
        (fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        // Mock user data with no existing connection
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            apple_calendar_access_token: null,
            apple_calendar_refresh_token: null,
          },
          error: null,
        });

        const { POST } = await import('@/app/api/auth/apple/route');
        const request = new Request('http://localhost:3000/api/auth/apple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appleId: 'test@icloud.com',
            appSpecificPassword: 'invalid-password',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication failed');
        expect(data.details).toContain('Invalid Apple ID or app-specific password');
      });

      it('should sync Apple Calendar events successfully', async () => {
        // Mock user data with existing Apple Calendar connection
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            apple_calendar_access_token: 'encrypted-apple-id',
            apple_calendar_refresh_token: 'encrypted-password',
            apple_calendar_token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        });

        // Mock CalDAV calendar discovery
        const mockDiscoveryResponse = `
          <?xml version="1.0" encoding="utf-8"?>
          <multistatus xmlns="DAV:">
            <response>
              <href>/calendars/primary</href>
            </response>
          </multistatus>
        `;

        // Mock CalDAV events fetch
        const mockEventsResponse = `
          <?xml version="1.0" encoding="utf-8"?>
          <multistatus xmlns="DAV:">
            <response>
              <propstat>
                <prop>
                  <calendar-data>
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event-123
DTSTART:20250101T100000Z
DTEND:20250101T110000Z
SUMMARY:Test Event
END:VEVENT
END:VCALENDAR
                  </calendar-data>
                </prop>
              </propstat>
            </response>
          </multistatus>
        `;

        (fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(mockDiscoveryResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(mockEventsResponse),
          });

        // Mock successful event upsert
        mockSupabase.upsert.mockResolvedValueOnce({
          data: { id: 'test-event-id' },
          error: null,
        });

        const { POST } = await import('@/app/api/calendar/apple/sync/route');
        const request = new Request('http://localhost:3000/api/calendar/apple/sync', {
          method: 'POST',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('Successfully synced Apple Calendar');
        expect(data.sync_summary.calendars_found).toBeGreaterThan(0);
        expect(data.sync_summary.events_processed).toBeGreaterThan(0);
      });
    });
  });

  describe('Google Calendar Integration (OAuth2)', () => {
    describe('Google Calendar API Routes', () => {
      it('should sync Google Calendar events successfully', async () => {
        // Mock user data with existing Google Calendar connection
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            google_calendar_access_token: 'test-access-token',
            google_calendar_refresh_token: 'test-refresh-token',
          },
          error: null,
        });

        // Mock Google Calendar API responses
        const mockCalendarList = {
          items: [
            { id: 'primary', summary: 'Primary Calendar' },
            { id: 'work', summary: 'Work Calendar' },
          ],
        };

        const mockEvents = {
          items: [
            {
              id: 'google-event-123',
              summary: 'Google Test Event',
              description: 'Google Test Description',
              location: 'Google Test Location',
              start: { dateTime: '2025-01-01T10:00:00Z' },
              end: { dateTime: '2025-01-01T11:00:00Z' },
              timeZone: 'UTC',
            },
          ],
        };

        // Mock Google APIs
        const { google } = await import('googleapis');
        const mockGoogleCalendar = google.calendar();
        mockGoogleCalendar.calendarList.list.mockResolvedValue({ data: mockCalendarList });
        mockGoogleCalendar.events.list.mockResolvedValue({ data: mockEvents });

        // Mock successful event upsert
        mockSupabase.upsert.mockResolvedValue({
          data: { id: 'test-event-id' },
          error: null,
        });

        const { POST } = await import('@/app/api/calendar/google/sync/route');
        const request = new Request('http://localhost:3000/api/calendar/google/sync', {
          method: 'POST',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('Successfully synced Google Calendar');
      });

      it('should handle Google Calendar sync errors', async () => {
        // Mock user data with existing Google Calendar connection
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            google_calendar_access_token: 'expired-token',
            google_calendar_refresh_token: 'test-refresh-token',
          },
          error: null,
        });

        // Mock Google API error
        const { google } = await import('googleapis');
        const mockGoogleCalendar = google.calendar();
        mockGoogleCalendar.calendarList.list.mockRejectedValue(new Error('Invalid credentials'));

        const { POST } = await import('@/app/api/calendar/google/sync/route');
        const request = new Request('http://localhost:3000/api/calendar/google/sync', {
          method: 'POST',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toContain('Failed to sync Google Calendar');
      });
    });
  });

  describe('Calendar Integration Setup', () => {
    it('should get calendar integration setup status', async () => {
      // Mock user authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock calendar integration setup data
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'setup-id',
          user_id: 'test-user-id',
          google_calendar_requested: true,
          google_calendar_setup_completed: true,
          apple_calendar_requested: false,
          apple_calendar_setup_completed: false,
          setup_status: 'completed',
        },
        error: null,
      });

      const { GET } = await import('@/app/api/calendar/oauth/setup/route');
      const request = new Request('http://localhost:3000/api/calendar/oauth/setup', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.setup_status).toBeDefined();
      expect(data.data.available_providers).toContain('google');
      expect(data.data.available_providers).toContain('apple');
    });
  });

  describe('Error Handling and Edge Cases', () => {
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

  describe('Security and Validation', () => {
    it('should validate Apple ID format', async () => {
      const { POST } = await import('@/app/api/auth/apple/route');
      const request = new Request('http://localhost:3000/api/auth/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appleId: 'invalid-email',
          appSpecificPassword: 'abcd-efgh-ijkl-mnop',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid Apple ID format');
    });

    it('should validate app-specific password format', async () => {
      const { POST } = await import('@/app/api/auth/apple/route');
      const request = new Request('http://localhost:3000/api/auth/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appleId: 'test@icloud.com',
          appSpecificPassword: 'invalid-password-format',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid app-specific password format');
    });

    it('should require authentication for sync endpoints', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { POST } = await import('@/app/api/calendar/apple/sync/route');
      const request = new Request('http://localhost:3000/api/calendar/apple/sync', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});
