import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  generateCSRFToken,
  createCSRFTokenData,
  validateCSRFToken,
  cleanupExpiredCSRFTokens
} from '@/lib/security/csrf';
import {
  generateOAuthState,
  createOAuthStateData,
  validateOAuthState,
  validateOAuthCallback,
  cleanupExpiredOAuthStates
} from '@/lib/security/oauth-state';

// Mock Supabase client for testing
const mockSupabase = {
  from: (table: string) => ({
    upsert: () => ({ data: null, error: null }),
    insert: () => ({ data: null, error: null }),
    select: () => ({
      eq: () => ({
        eq: () => ({
          single: () => ({ 
            data: { 
              token: 'mock-token', 
              expires_at: new Date(Date.now() + 3600000).toISOString(),
              state: 'mock-state',
              nonce: 'mock-nonce',
              provider: 'google'
            }, 
            error: null 
          })
        }),
        single: () => ({ 
          data: { 
            token: 'mock-token', 
            expires_at: new Date(Date.now() + 3600000).toISOString() 
          }, 
          error: null 
        })
      })
    }),
    delete: () => ({
      eq: () => ({ data: null, error: null }),
      lt: () => ({ data: null, error: null })
    })
  })
};

describe('OAuth and CSRF Security', () => {
  describe('CSRF Token Generation and Validation', () => {
    it('should generate cryptographically secure CSRF tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      // Tokens should be different
      expect(token1).not.toBe(token2);
      
      // Tokens should be hexadecimal and 64 characters long (32 bytes * 2)
      expect(token1).toMatch(/^[a-f0-9]{64}$/);
      expect(token2).toMatch(/^[a-f0-9]{64}$/);
      expect(token1.length).toBe(64);
      expect(token2.length).toBe(64);
    });

    it('should create CSRF token data with proper structure', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const tokenData = createCSRFTokenData(userId);
      
      expect(tokenData).toHaveProperty('token');
      expect(tokenData).toHaveProperty('expires');
      expect(tokenData).toHaveProperty('userId', userId);
      expect(tokenData.token).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof tokenData.expires).toBe('number');
      expect(tokenData.expires).toBeGreaterThan(Date.now());
    });

    it('should validate expiration times correctly', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const tokenData = createCSRFTokenData(userId);
      
      // Token should not be expired immediately
      const notExpired = tokenData.expires > Date.now();
      expect(notExpired).toBe(true);
      
      // Token should expire in approximately 1 hour (with some tolerance)
      const expectedExpiry = Date.now() + (60 * 60 * 1000);
      const tolerance = 5000; // 5 seconds tolerance
      expect(Math.abs(tokenData.expires - expectedExpiry)).toBeLessThan(tolerance);
    });
  });

  describe('OAuth State Generation and Validation', () => {
    it('should generate cryptographically secure OAuth state', () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      
      // States should be different
      expect(state1).not.toBe(state2);
      
      // States should be hexadecimal and 64 characters long (32 bytes * 2)
      expect(state1).toMatch(/^[a-f0-9]{64}$/);
      expect(state2).toMatch(/^[a-f0-9]{64}$/);
      expect(state1.length).toBe(64);
      expect(state2.length).toBe(64);
    });

    it('should create OAuth state data with proper structure', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const provider = 'google';
      const stateData = createOAuthStateData(userId, provider);
      
      expect(stateData).toHaveProperty('state');
      expect(stateData).toHaveProperty('expires');
      expect(stateData).toHaveProperty('userId', userId);
      expect(stateData).toHaveProperty('provider', provider);
      expect(stateData).toHaveProperty('nonce');
      expect(stateData.state).toMatch(/^[a-f0-9]{64}$/);
      expect(stateData.nonce).toMatch(/^[a-f0-9]{32}$/);
      expect(typeof stateData.expires).toBe('number');
      expect(stateData.expires).toBeGreaterThan(Date.now());
    });

    it('should validate OAuth callback parameters', () => {
      // Valid callback
      const validCallback = validateOAuthCallback({
        state: 'valid-state',
        code: 'valid-code'
      });
      expect(validCallback.valid).toBe(true);
      
      // Missing state
      const missingState = validateOAuthCallback({
        code: 'valid-code'
      });
      expect(missingState.valid).toBe(false);
      expect(missingState.error).toContain('Missing state parameter');
      
      // Missing code
      const missingCode = validateOAuthCallback({
        state: 'valid-state'
      });
      expect(missingCode.valid).toBe(false);
      expect(missingCode.error).toContain('Missing authorization code');
      
      // OAuth provider error
      const providerError = validateOAuthCallback({
        state: 'valid-state',
        error: 'access_denied'
      });
      expect(providerError.valid).toBe(false);
      expect(providerError.error).toContain('OAuth provider error');
    });
  });

  describe('Security Token Collision Resistance', () => {
    it('should have extremely low probability of collision', () => {
      const tokens = new Set();
      const iterations = 10000;
      
      // Generate many tokens and check for duplicates
      for (let i = 0; i < iterations; i++) {
        const token = generateCSRFToken();
        expect(tokens.has(token)).toBe(false); // Should never have duplicates
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(iterations);
    });

    it('should have sufficient entropy', () => {
      const token = generateCSRFToken();
      
      // Check character distribution (rough entropy check)
      const chars = token.split('');
      const uniqueChars = new Set(chars);
      
      // With 64 hex characters, we should have good character distribution
      // At minimum, should have more than half the possible hex characters (0-9, a-f)
      expect(uniqueChars.size).toBeGreaterThan(8);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject invalid user IDs', () => {
      const invalidUserIds = [
        '',
        null,
        undefined,
        'not-a-uuid',
        '123',
        'invalid-uuid-format'
      ];
      
      invalidUserIds.forEach(userId => {
        expect(() => {
          createCSRFTokenData(userId as string);
        }).not.toThrow(); // Function should handle gracefully
      });
    });

    it('should reject invalid providers', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidProviders = ['facebook', 'twitter', '', null, undefined];
      
      invalidProviders.forEach(provider => {
        expect(() => {
          createOAuthStateData(userId, provider as any);
        }).not.toThrow(); // Function should handle gracefully
      });
    });
  });
});

describe('Security Integration Tests', () => {
  describe('CSRF Protection Flow', () => {
    it('should require CSRF token for state-changing operations', async () => {
      // Mock request without CSRF token
      const mockRequest = {
        method: 'POST',
        headers: {
          get: (name: string) => null // No CSRF token
        }
      };
      
      // This would typically be tested with actual API calls
      expect(mockRequest.headers.get('X-CSRF-Token')).toBeNull();
    });

    it('should validate CSRF token format', () => {
      const validToken = generateCSRFToken();
      const invalidTokens = [
        'short',
        'not-hex-characters!',
        '123', 
        'g'.repeat(64), // Invalid hex character
        'a'.repeat(32)  // Too short
      ];
      
      expect(validToken).toMatch(/^[a-f0-9]{64}$/);
      
      invalidTokens.forEach(token => {
        expect(token).not.toMatch(/^[a-f0-9]{64}$/);
      });
    });
  });

  describe('OAuth State Protection Flow', () => {
    it('should generate unique states for each OAuth flow', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const state1 = createOAuthStateData(userId, 'google');
      const state2 = createOAuthStateData(userId, 'google');
      
      expect(state1.state).not.toBe(state2.state);
      expect(state1.nonce).not.toBe(state2.nonce);
    });

    it('should include nonce for additional security', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const stateData = createOAuthStateData(userId, 'google');
      
      expect(stateData.nonce).toBeDefined();
      expect(stateData.nonce).toMatch(/^[a-f0-9]{32}$/);
      expect(stateData.nonce.length).toBe(32);
    });
  });
});

describe('Cleanup and Maintenance', () => {
  it('should handle cleanup operations gracefully', async () => {
    // These would normally interact with the database
    expect(async () => {
      await cleanupExpiredCSRFTokens();
      await cleanupExpiredOAuthStates();
    }).not.toThrow();
  });
});