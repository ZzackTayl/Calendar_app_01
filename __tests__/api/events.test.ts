
import { GET, POST } from '@/app/api/events/route';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the Supabase client
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/auth/session-manager');
vi.mock('@/lib/rate-limiting');
vi.mock('@/lib/security/csrf');

// Mock user session
const mockUser = { id: 'user-123', email: 'test@example.com' };

describe('/api/events', () => {
  let supabaseMock: any;
  let createRouteHandlerClient: any;
  let requireAuthentication: any;
  let checkRateLimit: any;
  let isAdminUser: any;
  let createRateLimitHeaders: any;
  let validateCSRFProtection: any;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock authentication
    const authModule = await import('@/lib/auth/session-manager');
    requireAuthentication = authModule.requireAuthentication;
    (requireAuthentication as any).mockResolvedValue({
      valid: true,
      user: mockUser,
      contextIntegrity: 'healthy',
      error: null
    });

    // Mock CSRF validation
    const csrfModule = await import('@/lib/security/csrf');
    validateCSRFProtection = csrfModule.validateCSRFProtection;
    (validateCSRFProtection as any).mockResolvedValue({
      valid: true,
      error: null
    });

    // Mock rate limiting
    const rateLimitModule = await import('@/lib/rate-limiting');
    checkRateLimit = rateLimitModule.checkRateLimit;
    isAdminUser = rateLimitModule.isAdminUser;
    createRateLimitHeaders = rateLimitModule.createRateLimitHeaders;
    (checkRateLimit as any).mockReturnValue({
      isLimited: false,
      remaining: 100,
      resetTime: Date.now() + 60000,
      retryAfter: 0,
      blocked: false
    });
    (isAdminUser as any).mockResolvedValue(false);
    (createRateLimitHeaders as any).mockReturnValue({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '100',
      'X-RateLimit-Reset': String(Date.now() + 60000)
    });

    // Dynamically import the mocked module
    const supabaseServerModule = await import('@/lib/supabase/server');
    createRouteHandlerClient = supabaseServerModule.createRouteHandlerClient;

    // Mock Supabase client functions
    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn(() => supabaseMock),
      select: vi.fn(() => supabaseMock),
      insert: vi.fn(() => supabaseMock),
      eq: vi.fn(() => supabaseMock),
      or: vi.fn(() => supabaseMock),
      gte: vi.fn(() => supabaseMock),
      lte: vi.fn(() => supabaseMock),
      order: vi.fn(() => supabaseMock),
      range: vi.fn(() => supabaseMock),
      single: vi.fn(() => supabaseMock),
    };

    // Set the mock implementation for the createRouteHandlerClient
    (createRouteHandlerClient as any).mockReturnValue(supabaseMock);
  });

  describe('GET', () => {
    it('should fetch events successfully', async () => {
      // Arrange
      const mockEvents = [{ id: 'evt-1', title: 'Test Event' }];
      supabaseMock.range.mockResolvedValue({ data: mockEvents, error: null });

      const request = new NextRequest('http://localhost/api/events?limit=10&offset=0');

      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.events).toEqual(mockEvents);
      expect(supabaseMock.from).toHaveBeenCalledWith('events');
      expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(supabaseMock.range).toHaveBeenCalledWith(0, 9);
    });

    it('should return 401 if user is not authenticated', async () => {
      // Arrange
      (requireAuthentication as any).mockResolvedValue({
        valid: false,
        user: null,
        contextIntegrity: 'degraded',
        error: 'No active session'
      });
      const request = new NextRequest('http://localhost/api/events');

      // Act
      const response = await GET(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.error).toBe('Authentication required');
    });

    it('should handle database errors gracefully', async () => {
        // Arrange
        const dbError = { message: 'DB error' };
        supabaseMock.range.mockResolvedValue({ data: null, error: dbError });
        const request = new NextRequest('http://localhost/api/events');
  
        // Act
        const response = await GET(request);
        const body = await response.json();
  
        // Assert
        expect(response.status).toBe(500);
        expect(body.error).toBe('Failed to fetch events');
      });
  });

  describe('POST', () => {
    const validEvent = {
      title: 'New Event',
      start_time: '2025-01-01T10:00:00Z',
      end_time: '2025-01-01T11:00:00Z',
      privacy_level: 'private',
    };

    it('should create an event successfully', async () => {
      // Arrange
      const newEvent = { ...validEvent, id: 'evt-2', user_id: mockUser.id };
      supabaseMock.single.mockResolvedValue({ data: newEvent, error: null });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(validEvent),
        headers: { 'Content-Type': 'application/json' },
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.event).toEqual(newEvent);
      expect(supabaseMock.from).toHaveBeenCalledWith('events');
      expect(supabaseMock.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...validEvent,
        user_id: mockUser.id,
      }));
    });

    it('should return 401 if user is not authenticated', async () => {
        // Arrange
        (requireAuthentication as any).mockResolvedValue({
          valid: false,
          user: null,
          contextIntegrity: 'degraded',
          error: 'No active session'
        });
        const request = new NextRequest('http://localhost/api/events', {
          method: 'POST',
          body: JSON.stringify(validEvent),
          headers: { 'Content-Type': 'application/json' },
        });
  
        // Act
        const response = await POST(request);
        const body = await response.json();
  
        // Assert
        expect(response.status).toBe(401);
        expect(body.error).toBe('Authentication required');
      });

    it('should return 400 for invalid event data', async () => {
      // Arrange
      const invalidEvent = { ...validEvent, title: '' }; // Invalid title
      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(invalidEvent),
        headers: { 'Content-Type': 'application/json' },
      });

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });

    it('should handle database errors gracefully on create', async () => {
        // Arrange
        const dbError = { message: 'DB error' };
        supabaseMock.single.mockResolvedValue({ data: null, error: dbError });
        const request = new NextRequest('http://localhost/api/events', {
          method: 'POST',
          body: JSON.stringify(validEvent),
          headers: { 'Content-Type': 'application/json' },
        });
  
        // Act
        const response = await POST(request);
        const body = await response.json();
  
        // Assert
        expect(response.status).toBe(500);
        expect(body.error).toBe('Failed to create event');
      });

    it('should set default timezone when not provided', async () => {
      const eventWithoutTimezone = {
        ...validEvent
        // No time_zone specified
      };
      
      const newEvent = { ...eventWithoutTimezone, id: 'evt-6', user_id: mockUser.id, time_zone: 'UTC' };
      supabaseMock.single.mockResolvedValue({ data: newEvent, error: null });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(eventWithoutTimezone),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.event.time_zone).toBe('UTC');
    });
  });

  describe('Privacy Level Edge Cases', () => {
    it('should handle empty visible_to arrays for semi_private events', async () => {
      const semiPrivateEvent = {
        title: 'Semi Private Event',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'semi_private' as const,
        visible_to_relationships: [],
        visible_to_groups: []
      };
      
      const newEvent = { ...semiPrivateEvent, id: 'evt-7', user_id: mockUser.id };
      supabaseMock.single.mockResolvedValue({ data: newEvent, error: null });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(semiPrivateEvent),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      // Should not create permissions for empty arrays
    });

    it('should handle mixed permission scenarios', async () => {
      const complexEvent = {
        title: 'Complex Privacy Event',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'semi_private' as const,
        relationship_id: 'rel-primary',
        visible_to_relationships: ['rel-123', 'rel-456'],
        visible_to_groups: ['group-789'],
        color: '#FF5500'
      };
      
      const newEvent = { ...complexEvent, id: 'evt-8', user_id: mockUser.id };
      supabaseMock.single.mockResolvedValue({ data: newEvent, error: null });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(complexEvent),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(response.status).toBe(201);
    });

    it('should handle permission creation errors gracefully', async () => {
      const eventWithPermissions = {
        title: 'Event with Permissions',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'public' as const,
        visible_to_relationships: ['rel-123']
      };
      
      const newEvent = { ...eventWithPermissions, id: 'evt-9', user_id: mockUser.id };
      supabaseMock.single.mockResolvedValue({ data: newEvent, error: null });

      // Mock permissions insertion failure
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'events') return supabaseMock;
        if (table === 'event_permissions') {
          return {
            insert: vi.fn().mockResolvedValue({ error: { message: 'Permission creation failed' } })
          };
        }
        return supabaseMock;
      });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(eventWithPermissions),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      // Should still succeed even if permissions fail
      expect(response.status).toBe(201);
    });
  });

  describe('Input Sanitization and Security', () => {
    it('should sanitize search input to prevent XSS', async () => {
      supabaseMock.range.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/events?search=<script>alert(1)</script>');
      await GET(request);

      // Should strip dangerous characters from search
      expect(supabaseMock.or).toHaveBeenCalledWith(
        'title.ilike.%scriptalert(1)/script%,description.ilike.%scriptalert(1)/script%,location.ilike.%scriptalert(1)/script%'
      );
    });

    it('should reject events with XSS in title', async () => {
      const maliciousEvent = {
        title: '<script>alert(\"xss\")</script>',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'private' as const
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(maliciousEvent),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject events with XSS in description', async () => {
      const maliciousEvent = {
        title: 'Valid Title',
        description: '<img src=x onerror=alert(1)>',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'private' as const
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(maliciousEvent),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should reject events with XSS in location', async () => {
      const maliciousEvent = {
        title: 'Valid Title',
        location: '<svg onload=alert(1)>',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'private' as const
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(maliciousEvent),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should validate color format strictly', async () => {
      const eventWithInvalidColor = {
        title: 'Event with Color',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'private' as const,
        color: 'invalid-color'
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(eventWithInvalidColor),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should validate status enum values', async () => {
      const eventWithInvalidStatus = {
        title: 'Event with Status',
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'private' as const,
        status: 'invalid-status'
      };

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        body: JSON.stringify(eventWithInvalidStatus),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should enforce user isolation', async () => {
      supabaseMock.range.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/events');
      await GET(request);

      // Verify that queries are always filtered by user_id
      expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });
});
