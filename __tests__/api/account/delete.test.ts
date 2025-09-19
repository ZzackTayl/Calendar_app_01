/**
 * Tests for Account Deletion API Endpoint
 *
 * This test suite validates the security, functionality, and compliance
 * aspects of the account deletion implementation.
 */

import { NextRequest } from 'next/server'
import { vi, beforeAll } from 'vitest';
import { guardTestTypes } from '@/lib/test-guards';

// Mock the dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/rate-limiting');

let POST: typeof import('@/app/api/account/delete/route')['POST'];

// Guard this API test - requires integration environment for full API testing
guardTestTypes(['integration', 'contract'], () => {
describe.sequential('/api/account/delete', () => {
  let mockCreateRouteHandlerClient: any;
  let mockCreateAdminClient: any;
  let mockCheckRateLimit: any;
  let mockSupabaseClient: any;
  let mockAdminClient: any;

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeAll(async () => {
    ({ POST } = await import('@/app/api/account/delete/route'))
  })

  beforeEach(async () => {
    vi.resetAllMocks();
    process.env.BYPASS_ACCOUNT_DELETE_RATE_LIMIT = 'false'

    const supabaseServerModule = await import('@/lib/supabase/server');
    mockCreateRouteHandlerClient = supabaseServerModule.createRouteHandlerClient;
    mockCreateAdminClient = supabaseServerModule.createAdminClient;

    const rateLimitingModule = await import('@/lib/rate-limiting');
    mockCheckRateLimit = rateLimitingModule.checkRateLimit;

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
        signInWithPassword: vi.fn()
      }
    };

    mockAdminClient = {
      from: vi.fn(),
      storage: {
        from: vi.fn()
      },
      auth: {
        admin: {
          deleteUser: vi.fn()
        }
      }
    };
    
    mockCreateRouteHandlerClient.mockReturnValue(mockSupabaseClient);
    mockCreateAdminClient.mockReturnValue(mockAdminClient);
    
    // Default rate limit response (not limited)
    mockCheckRateLimit.mockImplementation(() => ({
      isLimited: false,
      remaining: 2,
      resetTime: Date.now() + 3600000,
      retryAfter: 0
    }));
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' }
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe('Account deletion failed. Please contact support if this issue persists.')
    })

    it('should verify user password before deletion', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' }
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: 'wrongpassword'
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('INVALID_CREDENTIALS')
      expect(body.error.message).toBe('Invalid password provided')
    })
  })

  describe('Input Validation', () => {
    it('should validate request body schema', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'WRONG_CONFIRMATION',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('Validation failed')
      expect(body.error.details).toBeDefined()
    })

    it('should require confirmation text', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('Validation failed')
    })

    it('should require password', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT'
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('Validation failed')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null
      })

      mockCheckRateLimit.mockImplementation(() => ({
        isLimited: true,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        retryAfter: 3600
      }))

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(429)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(body.error.message).toBe('Too many account deletion attempts. Please try again later.')
      expect(body.error.details?.retryAfter).toBe(3600)
    })

    it('should include rate limit headers', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null
      })

      mockCheckRateLimit.mockImplementation(() => ({
        isLimited: true,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        retryAfter: 3600
      }))

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.ok).toBe(false)
      expect(body.error.details?.retryAfter).toBe(3600)
      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(response.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Data Deletion Process', () => {
    const createQueryBuilder = (data: any[] = []) => {
      const builder: any = {}

      builder.select = vi.fn(() => builder)
      builder.delete = vi.fn(() => builder)
      builder.eq = vi.fn().mockResolvedValue({ data, error: null })
      builder.in = vi.fn().mockResolvedValue({ data, error: null })

      return builder
    }

    beforeEach(() => {
      process.env.BYPASS_ACCOUNT_DELETE_RATE_LIMIT = 'true'
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null
      })

      mockCheckRateLimit.mockImplementation(() => ({
        isLimited: false,
        remaining: 2,
        resetTime: Date.now() + 3600000,
        retryAfter: 0
      }))

      mockAdminClient.from.mockImplementation((tableName: string) => {
        if (tableName === 'event_attachments') {
          return createQueryBuilder([])
        }

        if (tableName === 'events') {
          return createQueryBuilder([])
        }

        return createQueryBuilder([])
      })

      mockAdminClient.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null })
      })

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null })
    })

    afterEach(() => {
      process.env.BYPASS_ACCOUNT_DELETE_RATE_LIMIT = 'false'
    })

    it('should successfully delete account with all data', async () => {
      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.data.success).toBe(true)
      expect(body.data.message).toContain('permanently deleted')
      expect(body.data.deletedAt).toBeDefined()
    })

    it('should handle deletion errors gracefully', async () => {
      // Mock a deletion error
      mockAdminClient.from.mockImplementationOnce(() => {
        const builder = createQueryBuilder([])
        builder.delete = vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Database error' }
          }),
          in: vi.fn().mockResolvedValue({ error: null })
        }))
        return builder
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('INTERNAL_ERROR')
      expect(body.error.message).toBe('An unexpected error occurred')
    })
  })

  describe('Security and Compliance', () => {
    it('should use admin client for deletion operations', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      await POST(request)

      expect(mockCreateAdminClient).toHaveBeenCalled()
    })

    it('should log deletion attempts for audit', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Account deletion initiated')
      )

      consoleSpy.mockRestore()
    })

    it('should not expose sensitive information in errors', async () => {
      // Mock a deletion error
      mockAdminClient.from.mockImplementationOnce(() => {
        const builder = createQueryBuilder([])
        builder.delete = vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Sensitive database error with credentials' }
          }),
          in: vi.fn().mockResolvedValue({ error: null })
        }))
        return builder
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.ok).toBe(false)
      expect(body.error.code).toBe('INTERNAL_ERROR')
      expect(body.error.message).toBe('An unexpected error occurred')
    })
  })

  describe('File Storage Cleanup', () => {
    it('should delete files from storage', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null
      })

      // Mock attachments data
      const mockAttachments = [
        {
          file_url: 'https://example.com/storage/attachments/file1.pdf',
          event_id: 'event-1'
        }
      ]

      mockAdminClient.from.mockImplementation((tableName) => {
        if (tableName === 'event_attachments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockAttachments,
                error: null
              })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        }
      })

      const mockStorageRemove = vi.fn().mockResolvedValue({ error: null })
      mockAdminClient.storage.from.mockReturnValue({
        remove: mockStorageRemove
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: process.env.TEST_USER_PASSWORD!
        })
      })

      await POST(request)

      expect(mockStorageRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['storage/attachments/file1.pdf'])
      )
    })
  })
})
}); // End guard
