/**
 * Tests for Account Deletion API Endpoint
 * 
 * This test suite validates the security, functionality, and compliance
 * aspects of the account deletion implementation.
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/account/delete/route'
import { vi } from 'vitest';

// Mock the dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/rate-limiting');

describe('/api/account/delete', () => {
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

  beforeEach(async () => {
    vi.clearAllMocks();

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
    mockCheckRateLimit.mockReturnValue({
      isLimited: false,
      remaining: 2,
      resetTime: Date.now() + 3600000
    });
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
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Account deletion failed. Please contact support if this issue persists.')
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
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid password')
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
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.details).toBeDefined()
    })

    it('should require confirmation text', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
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
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockCheckRateLimit.mockReturnValue({
        isLimited: true,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        retryAfter: 3600
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many account deletion attempts')
      expect(data.retryAfter).toBe(3600)
    })

    it('should include rate limit headers', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockCheckRateLimit.mockReturnValue({
        isLimited: true,
        remaining: 0,
        resetTime: Date.now() + 3600000,
        retryAfter: 3600
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: 'password123'
        })
      })

      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(response.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Data Deletion Process', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        error: null
      })

      // Mock successful deletions
      const mockDelete = jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
          in: jest.fn().mockResolvedValue({ error: null })
        })
      })

      mockAdminClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
          in: jest.fn().mockResolvedValue({ error: null })
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

      mockAdminClient.storage.from.mockReturnValue({
        remove: jest.fn().mockResolvedValue({ error: null })
      })

      mockAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null })
    })

    it('should successfully delete account with all data', async () => {
      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('permanently deleted')
      expect(data.deletedAt).toBeDefined()
    })

    it('should handle deletion errors gracefully', async () => {
      // Mock a deletion error
      mockAdminClient.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            error: { message: 'Database error' } 
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Account deletion failed')
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
          password: 'password123'
        })
      })

      await POST(request)

      expect(mockCreateAdminClient).toHaveBeenCalled()
    })

    it('should log deletion attempts for audit', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
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
          password: 'password123'
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
      mockAdminClient.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            error: { message: 'Sensitive database error with credentials' } 
          })
        })
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).not.toContain('database')
      expect(data.error).not.toContain('credentials')
      expect(data.error).toBe('Account deletion failed. Please contact support if this issue persists.')
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
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: mockAttachments,
                error: null
              })
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        }
      })

      const mockStorageRemove = jest.fn().mockResolvedValue({ error: null })
      mockAdminClient.storage.from.mockReturnValue({
        remove: mockStorageRemove
      })

      const request = new NextRequest('http://localhost:3000/api/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
          password: 'password123'
        })
      })

      await POST(request)

      expect(mockStorageRemove).toHaveBeenCalledWith(
        expect.arrayContaining(['storage/attachments/file1.pdf'])
      )
    })
  })
})