import { describe, it, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const CONTRACT_DIR = 'contracts/pact';

function createCalendarPact(description: string) {
  return new PactV3({
    consumer: 'CalendarWebApp',
    provider: 'CalendarAPI',
    logLevel: process.env.PACT_LOG_LEVEL ?? 'info',
    dir: CONTRACT_DIR,
    spec: 3,
    pactfileWriteMode: 'update',
  });
}

describe('Calendar API Contracts', () => {
  describe('Calendar Export', () => {
    it('returns 200 for valid calendar export request', async () => {
      const pact = createCalendarPact('export-calendar');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to export calendar')
        .withRequest({
          method: 'GET',
          path: '/api/calendar/export',
          query: {
            format: MatchersV3.regex('^(ical|csv|json)$', 'ical'),
            start_date: MatchersV3.regex('^\\d{4}-\\d{2}-\\d{2}$', '2025-09-01'),
            end_date: MatchersV3.regex('^\\d{4}-\\d{2}-\\d{2}$', '2025-09-30'),
            privacy_level: MatchersV3.regex('^(private|visible|semi_private|public)$', 'visible'),
          },
          headers: {
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': MatchersV3.like('attachment; filename="calendar.ics"'),
          },
          body: MatchersV3.like('BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PolyHarmony//Calendar//EN\nBEGIN:VEVENT\nUID:d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2\nDTSTART:20250920T100000Z\nDTEND:20250920T110000Z\nSUMMARY:Team Meeting\nDESCRIPTION:Weekly team sync\nLOCATION:Conference Room A\nEND:VEVENT\nEND:VCALENDAR'),
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/calendar/export?format=ical&start_date=2025-09-01&end_date=2025-09-30&privacy_level=visible`, {
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
          },
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toContain('text/calendar');
        const calendarData = await response.text();
        expect(calendarData).toContain('BEGIN:VCALENDAR');
        expect(calendarData).toContain('END:VCALENDAR');
      });
    });

    it('returns 400 for invalid export format', async () => {
      const pact = createCalendarPact('export-calendar-invalid-format');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to export calendar with invalid format')
        .withRequest({
          method: 'GET',
          path: '/api/calendar/export',
          query: {
            format: 'invalid-format',
            start_date: '2025-09-01',
            end_date: '2025-09-30',
          },
          headers: {
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            error: MatchersV3.like('ValidationError'),
            message: MatchersV3.like('Invalid export format. Supported formats: ical, csv, json'),
            details: {
              field: MatchersV3.like('format'),
              value: MatchersV3.like('invalid-format'),
              allowed: ['ical', 'csv', 'json'],
            },
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/calendar/export?format=invalid-format&start_date=2025-09-01&end_date=2025-09-30`, {
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
          },
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.error).toBe('ValidationError');
        expect(error.message).toContain('Invalid export format');
      });
    });
  });

  describe('Calendar Import', () => {
    it('returns 201 for valid calendar import', async () => {
      const pact = createCalendarPact('import-calendar');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to import calendar data')
        .withRequest({
          method: 'POST',
          path: '/api/calendar/import',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
          body: {
            format: MatchersV3.regex('^(ical|csv|json)$', 'ical'),
            data: MatchersV3.like('BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//External//Calendar//EN\nBEGIN:VEVENT\nUID:external-event-123\nDTSTART:20250922T140000Z\nDTEND:20250922T150000Z\nSUMMARY:Imported Meeting\nEND:VEVENT\nEND:VCALENDAR'),
            privacy_level: MatchersV3.regex('^(private|visible|semi_private|public)$', 'private'),
            merge_strategy: MatchersV3.regex('^(skip_duplicates|overwrite|create_new)$', 'skip_duplicates'),
          },
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            imported_events: [{
              id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
              title: MatchersV3.like('Imported Meeting'),
              start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-22T14:00:00.000Z'),
              end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-22T15:00:00.000Z'),
              status: MatchersV3.regex('^(imported|skipped|error)$', 'imported'),
            }],
            summary: {
              total_events: MatchersV3.integer(1),
              imported: MatchersV3.integer(1),
              skipped: MatchersV3.integer(0),
              errors: MatchersV3.integer(0),
            },
            errors: [],
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/calendar/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            format: 'ical',
            data: 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//External//Calendar//EN\nBEGIN:VEVENT\nUID:external-event-123\nDTSTART:20250922T140000Z\nDTEND:20250922T150000Z\nSUMMARY:Imported Meeting\nEND:VEVENT\nEND:VCALENDAR',
            privacy_level: 'private',
            merge_strategy: 'skip_duplicates',
          }),
        });

        expect(response.status).toBe(201);
        const result = await response.json();
        expect(result).toHaveProperty('imported_events');
        expect(result).toHaveProperty('summary');
        expect(result.summary.total_events).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Calendar Integration', () => {
    it('returns 200 for calendar integrations list', async () => {
      const pact = createCalendarPact('list-integrations');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to list calendar integrations')
        .withRequest({
          method: 'GET',
          path: '/api/calendar/integrations',
          headers: {
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            integrations: [{
              id: MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000'),
              provider: MatchersV3.regex('^(google|apple|outlook|caldav)$', 'google'),
              display_name: MatchersV3.like('Google Calendar'),
              is_active: MatchersV3.boolean(true),
              last_sync: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-19T12:00:00.000Z'),
              sync_status: MatchersV3.regex('^(active|error|pending|disabled)$', 'active'),
              calendar_count: MatchersV3.integer(3),
              created_at: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-01T00:00:00.000Z'),
            }],
            available_providers: [{
              provider: MatchersV3.regex('^(google|apple|outlook|caldav)$', 'google'),
              display_name: MatchersV3.like('Google Calendar'),
              description: MatchersV3.like('Sync with your Google Calendar'),
              is_configured: MatchersV3.boolean(false),
              auth_url: MatchersV3.like('/api/calendar/oauth/setup?provider=google'),
            }],
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/calendar/integrations`, {
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
          },
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toHaveProperty('integrations');
        expect(result).toHaveProperty('available_providers');
        expect(Array.isArray(result.integrations)).toBe(true);
        expect(Array.isArray(result.available_providers)).toBe(true);
      });
    });

    it('returns 201 for successful Google Calendar sync', async () => {
      const pact = createCalendarPact('sync-google-calendar');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to sync with Google Calendar')
        .withRequest({
          method: 'POST',
          path: '/api/calendar/google/sync',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
          body: {
            calendar_ids: ['primary'],
            sync_direction: MatchersV3.regex('^(import|export|bidirectional)$', 'import'),
            privacy_mapping: {
              private: MatchersV3.like('private'),
              public: MatchersV3.like('visible'),
            },
          },
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            sync_id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
            status: MatchersV3.like('completed'),
            calendars_synced: [{
              calendar_id: MatchersV3.like('primary'),
              calendar_name: MatchersV3.like('Primary Calendar'),
              events_imported: MatchersV3.integer(5),
              events_exported: MatchersV3.integer(0),
              last_sync: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-19T12:00:00.000Z'),
            }],
            summary: {
              total_events_imported: MatchersV3.integer(5),
              total_events_exported: MatchersV3.integer(0),
              sync_duration_ms: MatchersV3.integer(2500),
              errors: [],
            },
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/calendar/google/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            calendar_ids: ['primary'],
            sync_direction: 'import',
            privacy_mapping: {
              private: 'private',
              public: 'visible',
            },
          }),
        });

        expect(response.status).toBe(201);
        const result = await response.json();
        expect(result).toHaveProperty('sync_id');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('calendars_synced');
        expect(result.status).toBe('completed');
      });
    });
  });

  describe('Privacy & Sharing', () => {
    it('returns 200 for events with privacy filtering', async () => {
      const pact = createCalendarPact('events-with-privacy');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to get events with privacy filtering')
        .withRequest({
          method: 'GET',
          path: '/api/events/with-privacy',
          query: {
            viewer_id: MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000'),
            start_date: MatchersV3.regex('^\\d{4}-\\d{2}-\\d{2}$', '2025-09-01'),
            end_date: MatchersV3.regex('^\\d{4}-\\d{2}-\\d{2}$', '2025-09-30'),
          },
          headers: {
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            events: [{
              id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
              title: MatchersV3.like('Team Meeting'),
              description: MatchersV3.like('Weekly team sync'),
              start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T10:00:00.000Z'),
              end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T11:00:00.000Z'),
              privacy_level: MatchersV3.regex('^(private|visible|semi_private|public)$', 'visible'),
              is_visible_to_viewer: MatchersV3.boolean(true),
              visible_details: ['title', 'time'],
              owner: {
                id: MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000'),
                display_name: MatchersV3.like('Event Owner'),
              },
            }],
            privacy_summary: {
              total_events: MatchersV3.integer(5),
              visible_events: MatchersV3.integer(3),
              filtered_events: MatchersV3.integer(2),
              privacy_levels: {
                private: MatchersV3.integer(1),
                visible: MatchersV3.integer(2),
                semi_private: MatchersV3.integer(1),
                public: MatchersV3.integer(1),
              },
            },
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/events/with-privacy?viewer_id=550e8400-e29b-41d4-a716-446655440000&start_date=2025-09-01&end_date=2025-09-30`, {
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
          },
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toHaveProperty('events');
        expect(result).toHaveProperty('privacy_summary');
        expect(Array.isArray(result.events)).toBe(true);
      });
    });
  });
});