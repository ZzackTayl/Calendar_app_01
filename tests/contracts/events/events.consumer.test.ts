import { describe, it, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const CONTRACT_DIR = 'contracts/pact';

function createEventsPact(description: string) {
  return new PactV3({
    consumer: 'CalendarWebApp',
    provider: 'EventsAPI',
    logLevel: process.env.PACT_LOG_LEVEL ?? 'info',
    dir: CONTRACT_DIR,
    spec: 3,
    pactfileWriteMode: 'update',
  });
}

describe('Events API Contracts', () => {
  describe('Event Creation', () => {
    it('returns 201 for valid event creation', async () => {
      const pact = createEventsPact('create-event');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to create a new event')
        .withRequest({
          method: 'POST',
          path: '/api/events',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
          body: {
            title: MatchersV3.like('Team Meeting'),
            description: MatchersV3.like('Weekly team sync'),
            start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T10:00:00.000Z'),
            end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T11:00:00.000Z'),
            privacy_level: MatchersV3.regex('^(private|visible|semi_private|public)$', 'visible'),
            invited_partners: [],
            location: MatchersV3.like('Conference Room A'),
            is_recurring: MatchersV3.boolean(false),
          },
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
            title: MatchersV3.like('Team Meeting'),
            description: MatchersV3.like('Weekly team sync'),
            start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T10:00:00.000Z'),
            end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T11:00:00.000Z'),
            privacy_level: MatchersV3.like('visible'),
            user_id: MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000'),
            invited_partners: [],
            location: MatchersV3.like('Conference Room A'),
            is_recurring: MatchersV3.boolean(false),
            created_at: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-19T00:00:00.000Z'),
            updated_at: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-19T00:00:00.000Z'),
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            title: 'Team Meeting',
            description: 'Weekly team sync',
            start_time: '2025-09-20T10:00:00.000Z',
            end_time: '2025-09-20T11:00:00.000Z',
            privacy_level: 'visible',
            invited_partners: [],
            location: 'Conference Room A',
            is_recurring: false,
          }),
        });

        expect(response.status).toBe(201);
        const event = await response.json();
        expect(event).toHaveProperty('id');
        expect(event.title).toBe('Team Meeting');
        expect(event.privacy_level).toBe('visible');
      });
    });

    it('returns 400 for invalid event data', async () => {
      const pact = createEventsPact('create-event-invalid-data');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to create an event with invalid data')
        .withRequest({
          method: 'POST',
          path: '/api/events',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
          body: {
            title: '',
            start_time: 'invalid-date',
            end_time: '2025-09-20T10:00:00.000Z', // End before start
          },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            error: MatchersV3.like('ValidationError'),
            message: MatchersV3.like('Invalid event data provided'),
            details: [{
              field: MatchersV3.like('title'),
              message: MatchersV3.like('Title is required'),
            }],
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            title: '',
            start_time: 'invalid-date',
            end_time: '2025-09-20T10:00:00.000Z',
          }),
        });

        expect(response.status).toBe(400);
        const error = await response.json();
        expect(error.error).toBe('ValidationError');
      });
    });
  });

  describe('Event Retrieval', () => {
    it('returns 200 for valid event retrieval', async () => {
      const pact = createEventsPact('get-event');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to get a specific event')
        .withRequest({
          method: 'GET',
          path: MatchersV3.regex('^/api/events/[0-9a-f-]{36}$', '/api/events/d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
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
            id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
            title: MatchersV3.like('Team Meeting'),
            description: MatchersV3.like('Weekly team sync'),
            start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T10:00:00.000Z'),
            end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T11:00:00.000Z'),
            privacy_level: MatchersV3.like('visible'),
            user_id: MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000'),
            invited_partners: [],
            location: MatchersV3.like('Conference Room A'),
            is_recurring: MatchersV3.boolean(false),
            created_at: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-19T00:00:00.000Z'),
            updated_at: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-19T00:00:00.000Z'),
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/events/d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2`, {
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
          },
        });

        expect(response.status).toBe(200);
        const event = await response.json();
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('title');
        expect(event).toHaveProperty('privacy_level');
      });
    });

    it('returns 404 for non-existent event', async () => {
      const pact = createEventsPact('get-non-existent-event');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to get a non-existent event')
        .withRequest({
          method: 'GET',
          path: '/api/events/00000000-0000-0000-0000-000000000000',
          headers: {
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
        })
        .willRespondWith({
          status: 404,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            error: MatchersV3.like('NotFound'),
            message: MatchersV3.like('Event not found'),
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/events/00000000-0000-0000-0000-000000000000`, {
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
          },
        });

        expect(response.status).toBe(404);
        const error = await response.json();
        expect(error.error).toBe('NotFound');
      });
    });
  });

  describe('Conflict Detection', () => {
    it('returns 200 for conflict checking with no conflicts', async () => {
      const pact = createEventsPact('check-conflicts-none');

      pact
        .given('User with relationships and events exists')
        .uponReceiving('a request to check for conflicts with no conflicts found')
        .withRequest({
          method: 'POST',
          path: '/api/events/check-conflicts',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
          body: {
            start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-21T14:00:00.000Z'),
            end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-21T15:00:00.000Z'),
            partner_ids: [MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000')],
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            has_conflicts: MatchersV3.boolean(false),
            conflicts: [],
            suggestions: [],
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/events/check-conflicts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            start_time: '2025-09-21T14:00:00.000Z',
            end_time: '2025-09-21T15:00:00.000Z',
            partner_ids: ['550e8400-e29b-41d4-a716-446655440000'],
          }),
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toHaveProperty('has_conflicts');
        expect(result).toHaveProperty('conflicts');
      });
    });

    it('returns 200 for conflict checking with conflicts found', async () => {
      const pact = createEventsPact('check-conflicts-found');

      pact
        .given('Multiple users with shared events exist')
        .uponReceiving('a request to check for conflicts with conflicts found')
        .withRequest({
          method: 'POST',
          path: '/api/events/check-conflicts',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': MatchersV3.like('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          },
          body: {
            start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T10:00:00.000Z'),
            end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T11:00:00.000Z'),
            partner_ids: [MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000')],
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            has_conflicts: MatchersV3.boolean(true),
            conflicts: [{
              partner_id: MatchersV3.uuid('550e8400-e29b-41d4-a716-446655440000'),
              partner_name: MatchersV3.like('Partner Name'),
              conflicting_event: {
                id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
                title: MatchersV3.like('Existing Meeting'),
                start_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T09:30:00.000Z'),
                end_time: MatchersV3.timestamp("yyyy-MM-dd'T'HH:mm:ss.SSSX", '2025-09-20T10:30:00.000Z'),
              },
              conflict_type: MatchersV3.regex('^(overlap|adjacent|privacy)$', 'overlap'),
            }],
            suggestions: [],
          },
        });

      await pact.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/events/check-conflicts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-jwt-token',
          },
          body: JSON.stringify({
            start_time: '2025-09-20T10:00:00.000Z',
            end_time: '2025-09-20T11:00:00.000Z',
            partner_ids: ['550e8400-e29b-41d4-a716-446655440000'],
          }),
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.has_conflicts).toBe(true);
        expect(result.conflicts).toHaveLength(1);
      });
    });
  });
});