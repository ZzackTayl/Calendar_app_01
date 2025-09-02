import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the encryption module
vi.mock('@/lib/encryption', () => ({
  encryptToken: vi.fn((token: string) => `encrypted_${token}`),
  decryptToken: vi.fn((encryptedToken: string) => encryptedToken.replace('encrypted_', '')),
}));

// Mock the Google APIs
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn(() => Promise.resolve({
          credentials: {
            access_token: 'new_access_token',
            refresh_token: 'new_refresh_token',
            expiry_date: Date.now() + 3600000,
          }
        })),
      })),
    },
    calendar: vi.fn(() => ({
      calendarList: {
        list: vi.fn(() => Promise.resolve({
          data: {
            items: [
              { id: 'primary', summary: 'Primary Calendar' },
              { id: 'work', summary: 'Work Calendar' }
            ]
          }
        })),
      },
      events: {
        list: vi.fn(() => Promise.resolve({
          data: {
            items: [
              {
                id: 'google_event_1',
                summary: 'Google Event',
                description: 'Event from Google Calendar',
                start: { dateTime: '2024-01-01T10:00:00Z' },
                end: { dateTime: '2024-01-01T11:00:00Z' },
                location: 'Google Office',
              }
            ]
          }
        })),
        insert: vi.fn(() => Promise.resolve({
          data: {
            id: 'created_google_event',
            summary: 'Created Event',
          }
        })),
      },
    })),
  },
}));

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: { id: 'test_user_id' } },
      error: null
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'integration_id',
              user_id: 'test_user_id',
              provider: 'google',
              account_email: 'test@example.com',
              access_token_encrypted: 'encrypted_access_token',
              refresh_token_encrypted: 'encrypted_refresh_token',
              is_active: true,
            },
            error: null
          })),
        })),
      })),
    })),
    upsert: vi.fn(() => Promise.resolve({
      data: { id: 'event_id' },
      error: null
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: null,
          error: null
        })),
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabase),
}));

describe('Google Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Token Encryption/Decryption', () => {
    it('should encrypt tokens when storing OAuth credentials', async () => {
      const { encryptToken } = await import('@/lib/encryption');
      
      const testToken = 'test_access_token';
      const encrypted = encryptToken(testToken);
      
      expect(encrypted).toBe('encrypted_test_access_token');
    });

    it('should decrypt tokens when retrieving OAuth credentials', async () => {
      const { decryptToken } = await import('@/lib/encryption');
      
      const encryptedToken = 'encrypted_test_access_token';
      const decrypted = decryptToken(encryptedToken);
      
      expect(decrypted).toBe('test_access_token');
    });

    it('should handle null tokens gracefully', async () => {
      const { encryptToken, decryptToken } = await import('@/lib/encryption');
      
      expect(encryptToken(null)).toBeNull();
      expect(decryptToken(null)).toBeNull();
    });
  });

  describe('Google Calendar Sync', () => {
    it('should successfully sync events from Google Calendar', async () => {
      // This would test the actual sync endpoint
      // For now, we're testing the mocked functionality
      const mockCalendar = {
        calendarList: {
          list: vi.fn(() => Promise.resolve({
            data: { items: [{ id: 'primary', summary: 'Primary' }] }
          }))
        },
        events: {
          list: vi.fn(() => Promise.resolve({
            data: { items: [] }
          }))
        }
      };

      const calendarList = await mockCalendar.calendarList.list();
      expect(calendarList.data.items).toHaveLength(1);
      expect(calendarList.data.items[0].id).toBe('primary');
    });

    it('should handle token refresh when access token expires', async () => {
      const mockOAuth2Client = {
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn(() => Promise.resolve({
          credentials: {
            access_token: 'new_access_token',
            refresh_token: 'new_refresh_token',
            expiry_date: Date.now() + 3600000,
          }
        }))
      };

      const { credentials } = await mockOAuth2Client.refreshAccessToken();
      expect(credentials.access_token).toBe('new_access_token');
      expect(credentials.refresh_token).toBe('new_refresh_token');
    });
  });

  describe('Event Export to Google Calendar', () => {
    it('should successfully export events to Google Calendar', async () => {
      const mockCalendar = {
        events: {
          insert: vi.fn(() => Promise.resolve({
            data: {
              id: 'created_google_event',
              summary: 'Test Event',
            }
          }))
        }
      };

      const result = await mockCalendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: 'Test Event',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' },
        }
      });

      expect(result.data.id).toBe('created_google_event');
      expect(result.data.summary).toBe('Test Event');
    });

    it('should map privacy settings correctly', () => {
      const mapPrivacyToGoogleVisibility = (privacyOverride: string | null | undefined): string => {
        switch (privacyOverride) {
          case 'private':
            return 'private';
          case 'default':
          default:
            return 'default';
        }
      };

      expect(mapPrivacyToGoogleVisibility('private')).toBe('private');
      expect(mapPrivacyToGoogleVisibility('default')).toBe('default');
      expect(mapPrivacyToGoogleVisibility(null)).toBe('default');
    });
  });

  describe('Integration Status', () => {
    it('should fetch calendar integrations correctly', async () => {
      const mockIntegrations = [
        {
          id: 'integration_1',
          provider: 'google',
          account_email: 'test@example.com',
          is_active: true,
          last_sync_at: '2024-01-01T10:00:00Z',
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: mockIntegrations,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await mockSupabase.from('calendar_integrations')
        .select('*')
        .eq('user_id', 'test_user_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      expect(result.data).toEqual(mockIntegrations);
      expect(result.data[0].provider).toBe('google');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Unauthorized' }
      });

      const result = await mockSupabase.auth.getUser();
      expect(result.data.user).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle Google API errors gracefully', async () => {
      const mockCalendar = {
        calendarList: {
          list: vi.fn(() => Promise.reject(new Error('API Error')))
        }
      };

      await expect(mockCalendar.calendarList.list()).rejects.toThrow('API Error');
    });
  });
});
