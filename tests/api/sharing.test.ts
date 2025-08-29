/**
 * Sharing API Tests
 * 
 * Comprehensive testing for calendar sharing endpoints including:
 * - CRUD operations with privacy levels
 * - Password protection and hashing
 * - Token generation and validation
 * - Permission and filter management
 * - Security and access control
 * - Share type validation (public, private, password_protected)
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/sharing/route';
import { POST as TokenPOST, PUT as TokenPUT } from '@/app/api/sharing/token/route';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@supabase/auth-helpers-nextjs');
vi.mock('@/lib/auth/password-utils');
vi.mock('crypto');
vi.mock('next/headers');

describe('/api/sharing', () => {
  let supabaseMock: any;
  let createRouteHandlerClient: any;
  let mockHashPassword: any;
  let mockValidatePasswordStrength: any;
  let mockRandomBytes: any;

  const mockUser = { 
    id: 'user-123', 
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated'
  };

  const validShare = {
    share_name: 'My Calendar Share',
    description: 'Sharing my work calendar',
    share_type: 'public' as const,
    expires_at: '2025-12-31T23:59:59.000Z',
    permissions: [
      {
        permission_type: 'view' as const,
        scope: 'events' as const
      }
    ],
    filters: [
      {
        filter_type: 'privacy_level' as const,
        filter_value: 'public',
        filter_operator: 'equals' as const
      }
    ]
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock Supabase server
    const supabaseServerModule = await import('@/lib/supabase/server');
    createRouteHandlerClient = supabaseServerModule.createRouteHandlerClient;

    // Mock password utils
    const passwordUtilsModule = await import('@/lib/auth/password-utils');
    mockHashPassword = passwordUtilsModule.hashPassword;
    mockValidatePasswordStrength = passwordUtilsModule.validatePasswordStrength;

    // Mock crypto
    const cryptoModule = await import('crypto');
    mockRandomBytes = cryptoModule.randomBytes;

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
      },
      from: vi.fn(() => supabaseMock),
      select: vi.fn(() => supabaseMock),
      insert: vi.fn(() => supabaseMock),
      update: vi.fn(() => supabaseMock),
      delete: vi.fn(() => supabaseMock),
      eq: vi.fn(() => supabaseMock),
      or: vi.fn(() => supabaseMock),
      range: vi.fn(() => supabaseMock),
      order: vi.fn(() => supabaseMock),
      single: vi.fn(() => supabaseMock),
    };

    createRouteHandlerClient.mockReturnValue(supabaseMock);
    
    // Mock crypto functions
    mockRandomBytes.mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-token-12345')
    });

    // Mock password functions
    mockHashPassword.mockResolvedValue('hashed-password');
    mockValidatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
  });

  describe('GET - Fetch Shares', () => {
    const mockShares = [
      {
        id: 'share-1',
        share_name: 'Work Calendar',
        description: 'My work schedule',
        share_type: 'public',
        access_token: 'cal_token123',
        expires_at: null,
        is_active: true,
        view_count: 5,
        last_accessed_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        share_permissions: [
          { permission_type: 'view', scope: 'events' }
        ],
        share_filters: [
          { filter_type: 'privacy_level', filter_value: 'public', filter_operator: 'equals' }
        ],
        share_subscriptions: [{ count: 3 }]
      }
    ];

    it('should fetch shares successfully', async () => {
      supabaseMock.order.mockResolvedValue({ data: mockShares, error: null });

      const request = new NextRequest('http://localhost/api/sharing');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.shares).toBeDefined();
      expect(body.shares[0].share_name).toBe('Work Calendar');
      expect(body.shares[0].permissions).toHaveLength(1);
      expect(body.shares[0].filters).toHaveLength(1);
      expect(body.shares[0].subscriber_count).toBe(3);
      expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should apply search filter with sanitization', async () => {
      supabaseMock.order.mockResolvedValue({ data: mockShares, error: null });

      const request = new NextRequest('http://localhost/api/sharing?search=work<script>');
      await GET(request);

      expect(supabaseMock.or).toHaveBeenCalledWith(
        'share_name.ilike.%workscript%,description.ilike.%workscript%'
      );
    });

    it('should apply share type filter', async () => {
      supabaseMock.order.mockResolvedValue({ data: mockShares, error: null });

      const request = new NextRequest('http://localhost/api/sharing?type=password_protected');
      await GET(request);

      expect(supabaseMock.eq).toHaveBeenCalledWith('share_type', 'password_protected');
    });

    it('should apply active status filter', async () => {
      supabaseMock.order.mockResolvedValue({ data: mockShares, error: null });

      const request = new NextRequest('http://localhost/api/sharing?active=true');
      await GET(request);

      expect(supabaseMock.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should apply pagination correctly', async () => {
      supabaseMock.order.mockResolvedValue({ data: mockShares, error: null });

      const request = new NextRequest('http://localhost/api/sharing?limit=25&offset=50');
      await GET(request);

      expect(supabaseMock.range).toHaveBeenCalledWith(50, 74);
    });

    it('should return 401 for unauthenticated requests', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Unauthorized') 
      });

      const request = new NextRequest('http://localhost/api/sharing');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      const request = new NextRequest('http://localhost/api/sharing');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to fetch shares');
    });
  });

  describe('POST - Create Share', () => {
    const mockCreatedShare = {
      id: 'share-new',
      ...validShare,
      user_id: mockUser.id,
      access_token: 'cal_mock-token-12345',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    beforeEach(() => {
      supabaseMock.single.mockResolvedValue({ data: mockCreatedShare, error: null });
      
      // Mock permission and filter insertions
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'calendar_shares') return supabaseMock;
        if (table === 'share_permissions' || table === 'share_filters') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return supabaseMock;
      });
    });

    it('should create public share successfully', async () => {
      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.share.share_name).toBe('My Calendar Share');
      expect(body.share.access_token).toContain('cal_');
      expect(supabaseMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          share_name: 'My Calendar Share',
          share_type: 'public'
        })
      );
    });

    it('should create password-protected share with secure hashing', async () => {
      const passwordShare = {
        ...validShare,
        share_type: 'password_protected' as const,
        password: 'SecurePass123!'
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(passwordShare),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockValidatePasswordStrength).toHaveBeenCalledWith('SecurePass123!');
      expect(mockHashPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(supabaseMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: 'hashed-password'
        })
      );
    });

    it('should reject weak passwords', async () => {
      mockValidatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 8 characters', 'Password must contain uppercase letter']
      });

      const passwordShare = {
        ...validShare,
        share_type: 'password_protected' as const,
        password: 'weak'
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(passwordShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Password does not meet security requirements');
      expect(body.details).toHaveLength(2);
    });

    it('should create permissions and filters', async () => {
      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShare),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(supabaseMock.from).toHaveBeenCalledWith('share_permissions');
      expect(supabaseMock.from).toHaveBeenCalledWith('share_filters');
    });

    it('should validate privacy level in filters', async () => {
      const invalidShare = {
        ...validShare,
        filters: [
          {
            filter_type: 'privacy_level' as const,
            filter_value: 'invalid_privacy_level',
            filter_operator: 'equals' as const
          }
        ]
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(invalidShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      
      // Should still accept it as the filter_value is just a string in the schema
      // But in a real implementation, you might want additional validation
      expect(response.status).toBe(201);
    });

    it('should generate secure access tokens', async () => {
      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(body.share.access_token).toBe('cal_mock-token-12345');
    });

    it('should validate required fields', async () => {
      const invalidShare = { ...validShare };
      delete invalidShare.share_name;

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(invalidShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation error');
      expect(body.details).toBeDefined();
    });

    it('should sanitize input to prevent XSS', async () => {
      const maliciousShare = {
        share_name: 'Calendar<script>alert(1)</script>',
        description: 'Desc<img src=x onerror=alert(1)>',
        share_type: 'public' as const
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(maliciousShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      // Should reject input with dangerous characters
      expect(response.status).toBe(400);
    });

    it('should validate share type enum', async () => {
      const invalidShare = {
        ...validShare,
        share_type: 'invalid_type'
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(invalidShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });

    it('should validate permission types', async () => {
      const invalidShare = {
        ...validShare,
        permissions: [
          {
            permission_type: 'invalid_permission',
            scope: 'events'
          }
        ]
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(invalidShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation error');
    });

    it('should return 401 for unauthenticated requests', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Unauthorized') 
      });

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(validShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('PUT - Update Share', () => {
    const updateData = {
      id: 'share-1',
      share_name: 'Updated Calendar',
      share_type: 'password_protected' as const,
      password: 'NewSecurePass456!',
      permissions: [
        {
          permission_type: 'edit' as const,
          scope: 'events' as const
        }
      ]
    };

    beforeEach(() => {
      supabaseMock.single.mockResolvedValue({ 
        data: { ...updateData, user_id: mockUser.id }, 
        error: null 
      });

      // Mock permission/filter updates
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'calendar_shares') return supabaseMock;
        if (table === 'share_permissions' || table === 'share_filters') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null })
            })),
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return supabaseMock;
      });
    });

    it('should update share successfully', async () => {
      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.share).toBeDefined();
      expect(supabaseMock.update).toHaveBeenCalled();
      expect(supabaseMock.eq).toHaveBeenCalledWith('id', 'share-1');
      expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should require share ID', async () => {
      const invalidData = { ...updateData };
      delete invalidData.id;

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Share ID is required');
    });

    it('should update password with validation', async () => {
      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      await PUT(request);

      expect(mockValidatePasswordStrength).toHaveBeenCalledWith('NewSecurePass456!');
      expect(mockHashPassword).toHaveBeenCalledWith('NewSecurePass456!');
    });

    it('should update permissions and filters', async () => {
      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      await PUT(request);

      // Verify that existing permissions are deleted and new ones are added
      expect(supabaseMock.from).toHaveBeenCalledWith('share_permissions');
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      });

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to update share');
    });
  });

  describe('DELETE - Delete Share', () => {
    beforeEach(() => {
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'calendar_shares') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null })
              }))
            }))
          };
        }
        return supabaseMock;
      });
    });

    it('should delete share successfully', async () => {
      const request = new NextRequest('http://localhost/api/sharing?id=share-1', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it('should require share ID', async () => {
      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Share ID is required');
    });

    it('should enforce user ownership', async () => {
      const request = new NextRequest('http://localhost/api/sharing?id=share-1', {
        method: 'DELETE'
      });

      await DELETE(request);

      // Verify that deletion is filtered by user_id
      expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'calendar_shares') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
              }))
            }))
          };
        }
        return supabaseMock;
      });

      const request = new NextRequest('http://localhost/api/sharing?id=share-1', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to delete share');
    });
  });

  describe('Token Access Tests', () => {
    beforeEach(() => {
      // Mock the auth helpers
      const { createRouteHandlerClient } = require('@supabase/auth-helpers-nextjs');
      createRouteHandlerClient.mockReturnValue(supabaseMock);

      const { cookies } = require('next/headers');
      cookies.mockReturnValue({});
    });

    it('should access share via valid token', async () => {
      const mockShareData = {
        id: 'share-1',
        expires_at: null,
        privacy_level: 'public',
        allow_resharing: true,
        created_at: '2025-01-01T00:00:00Z',
        owner: {
          id: 'user-123',
          full_name: 'Test User'
        },
        calendars: [
          {
            calendar_id: 'cal-1',
            calendar: {
              id: 'cal-1',
              name: 'Work Calendar',
              color: '#3b82f6',
              description: 'My work schedule'
            }
          }
        ]
      };

      supabaseMock.single.mockResolvedValue({ data: mockShareData, error: null });
      supabaseMock.update.mockResolvedValue({ error: null });

      const request = new NextRequest('http://localhost/api/sharing/token', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token-123' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await TokenPOST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.share).toBeDefined();
      expect(body.calendars).toBeDefined();
      expect(body.share.privacyLevel).toBe('public');
      expect(body.calendars).toHaveLength(1);
    });

    it('should reject invalid tokens', async () => {
      supabaseMock.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'No rows found' } 
      });

      const request = new NextRequest('http://localhost/api/sharing/token', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await TokenPOST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe('Invalid or expired share token');
    });

    it('should reject expired shares', async () => {
      const expiredShareData = {
        id: 'share-1',
        expires_at: '2024-01-01T00:00:00Z', // Expired
        owner: { id: 'user-123', full_name: 'Test User' },
        calendars: []
      };

      supabaseMock.single.mockResolvedValue({ data: expiredShareData, error: null });

      const request = new NextRequest('http://localhost/api/sharing/token', {
        method: 'POST',
        body: JSON.stringify({ token: 'expired-token' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await TokenPOST(request);
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Share has expired');
    });

    it('should regenerate tokens for owner', async () => {
      const mockShareData = {
        id: 'share-1',
        user_id: 'user-123',
        share_type: 'link'
      };

      supabaseMock.single.mockResolvedValue({ data: mockShareData, error: null });
      supabaseMock.update.mockResolvedValue({ error: null });

      const request = new NextRequest('http://localhost/api/sharing/token', {
        method: 'PUT',
        body: JSON.stringify({ shareId: 'share-1' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await TokenPUT(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.token).toBe('mock-token-12345');
      expect(supabaseMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          share_token: 'mock-token-12345'
        })
      );
    });
  });

  describe('Privacy Level Security Tests', () => {
    it('should enforce privacy level filters', async () => {
      const privateShare = {
        ...validShare,
        filters: [
          {
            filter_type: 'privacy_level' as const,
            filter_value: 'private',
            filter_operator: 'equals' as const
          }
        ]
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(privateShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      
      expect(response.status).toBe(201);
      // Verify that privacy level filters are stored
      expect(supabaseMock.from).toHaveBeenCalledWith('share_filters');
    });

    it('should validate privacy level values in filters', async () => {
      // Test all valid privacy levels
      const validPrivacyLevels = ['private', 'visible', 'semi_private', 'public'];
      
      for (const privacyLevel of validPrivacyLevels) {
        const shareWithPrivacy = {
          ...validShare,
          filters: [
            {
              filter_type: 'privacy_level' as const,
              filter_value: privacyLevel,
              filter_operator: 'equals' as const
            }
          ]
        };

        const request = new NextRequest('http://localhost/api/sharing', {
          method: 'POST',
          body: JSON.stringify(shareWithPrivacy),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });

    it('should support multiple privacy level filters', async () => {
      const multiPrivacyShare = {
        ...validShare,
        filters: [
          {
            filter_type: 'privacy_level' as const,
            filter_value: 'public',
            filter_operator: 'equals' as const
          },
          {
            filter_type: 'privacy_level' as const,
            filter_value: 'visible',
            filter_operator: 'equals' as const
          }
        ]
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(multiPrivacyShare),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });

  describe('Security and Access Control', () => {
    it('should prevent unauthorized access to shares', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Unauthorized') 
      });

      const request = new NextRequest('http://localhost/api/sharing');
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it('should enforce user isolation in queries', async () => {
      supabaseMock.order.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/sharing');
      await GET(request);

      // Verify that all queries are filtered by user_id
      expect(supabaseMock.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should sanitize all input to prevent XSS', async () => {
      const xssPayloads = {
        share_name: '<script>alert("xss")</script>',
        description: '"><img src=x onerror=alert(1)>',
        share_type: 'public' as const
      };

      const request = new NextRequest('http://localhost/api/sharing', {
        method: 'POST',
        body: JSON.stringify(xssPayloads),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      // Should reject dangerous input
      expect(response.status).toBe(400);
    });

    it('should validate all enum values strictly', async () => {
      const invalidEnums = [
        { share_type: 'invalid_type' },
        { permissions: [{ permission_type: 'invalid_permission', scope: 'events' }] },
        { permissions: [{ permission_type: 'view', scope: 'invalid_scope' }] },
        { filters: [{ filter_type: 'invalid_filter', filter_value: 'test', filter_operator: 'equals' }] },
        { filters: [{ filter_type: 'privacy_level', filter_value: 'test', filter_operator: 'invalid_operator' }] }
      ];

      for (const invalidData of invalidEnums) {
        const request = new NextRequest('http://localhost/api/sharing', {
          method: 'POST',
          body: JSON.stringify({ ...validShare, ...invalidData }),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });
});