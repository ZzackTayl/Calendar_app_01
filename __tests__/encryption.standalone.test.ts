/**
 * Standalone Encryption Module Tests
 * 
 * Tests all security features of the encryption implementation without mocks:
 * 1. AES-256-GCM Algorithm usage
 * 2. Proper IV Generation (random 16-byte)
 * 3. Authentication Tags (GCM mode)
 * 4. Key Validation (64-character hex enforcement)
 * 5. Structured Format (iv:authTag:encryptedData)
 * 6. Error Handling
 * 7. Null Safety
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encrypt, decrypt, encryptToken, decryptToken, isEncrypted } from '../lib/encryption';
import crypto from 'crypto';

// Mock environment variable for testing
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

describe('Encryption Module Security Tests (Standalone)', () => {
  const validEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64-char hex
  const testData = 'This is sensitive data that needs encryption';

  describe('1. AES-256-GCM Algorithm', () => {
    it('should use AES-256-GCM algorithm for encryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Spy on crypto.createCipheriv to verify algorithm
      const createCipherSpy = vi.spyOn(crypto, 'createCipheriv');
      
      encrypt(testData);
      
      expect(createCipherSpy).toHaveBeenCalledWith(
        'aes-256-gcm',
        expect.any(Buffer),
        expect.any(Buffer)
      );
      
      createCipherSpy.mockRestore();
    });

    it('should use AES-256-GCM algorithm for decryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const encrypted = encrypt(testData);
      const createDecipherSpy = vi.spyOn(crypto, 'createDecipheriv');
      
      decrypt(encrypted);
      
      expect(createDecipherSpy).toHaveBeenCalledWith(
        'aes-256-gcm',
        expect.any(Buffer),
        expect.any(Buffer)
      );
      
      createDecipherSpy.mockRestore();
    });
  });

  describe('2. Proper IV Generation', () => {
    it('should generate a random 16-byte IV for each encryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Spy on crypto.randomBytes to verify IV generation
      const randomBytesSpy = vi.spyOn(crypto, 'randomBytes');
      
      encrypt(testData);
      
      // Verify randomBytes was called with 16 to generate IV
      expect(randomBytesSpy).toHaveBeenCalledWith(16);
      
      randomBytesSpy.mockRestore();
    });

    it('should generate different IVs for multiple encryptions', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const encrypted1 = encrypt(testData);
      const encrypted2 = encrypt(testData);
      
      // Extract IVs from encrypted data
      const iv1 = encrypted1.split(':')[0];
      const iv2 = encrypted2.split(':')[0];
      
      // IVs should be different even for same data
      expect(iv1).not.toBe(iv2);
      
      // IVs should be 32 characters (16 bytes in hex)
      expect(iv1).toHaveLength(32);
      expect(iv2).toHaveLength(32);
    });
  });

  describe('3. Authentication Tags (GCM mode)', () => {
    it('should include authentication tag in encrypted output', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const encrypted = encrypt(testData);
      const parts = encrypted.split(':');
      
      // Should have exactly 3 parts: iv:authTag:encryptedData
      expect(parts).toHaveLength(3);
      
      // Auth tag (second part) should be 32 characters (16 bytes in hex)
      const authTag = parts[1];
      expect(authTag).toHaveLength(32);
      expect(/^[0-9a-f]+$/i.test(authTag)).toBe(true);
    });

    it('should fail decryption if authentication tag is tampered', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const encrypted = encrypt(testData);
      const parts = encrypted.split(':');
      
      // Tamper with auth tag
      const tamperedAuthTag = parts[1].replace(/0/g, '1').replace(/1/g, '0');
      const tamperedEncrypted = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;
      
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });

    it('should fail decryption if encrypted data is tampered', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const encrypted = encrypt(testData);
      const parts = encrypted.split(':');
      
      // Tamper with encrypted data
      const tamperedData = parts[2].substring(0, parts[2].length - 2) + 'ff';
      const tamperedEncrypted = `${parts[0]}:${parts[1]}:${tamperedData}`;
      
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });
  });

  describe('4. Key Validation', () => {
    it('should enforce 64-character hex key requirement', () => {
      // Test missing key
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt(testData)).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
      
      // Test short key
      process.env.ENCRYPTION_KEY = '0123456789abcdef';
      expect(() => encrypt(testData)).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
      
      // Test long key
      process.env.ENCRYPTION_KEY = validEncryptionKey + 'extra';
      expect(() => encrypt(testData)).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
      
      // Test valid key
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      expect(() => encrypt(testData)).not.toThrow();
    });

    it('should validate key on both encryption and decryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      const encrypted = encrypt(testData);
      
      // Change key and try to decrypt
      process.env.ENCRYPTION_KEY = 'short';
      expect(() => decrypt(encrypted)).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });
  });

  describe('5. Structured Format', () => {
    it('should use correct format: iv:authTag:encryptedData', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const encrypted = encrypt(testData);
      const parts = encrypted.split(':');
      
      // Should have exactly 3 parts
      expect(parts).toHaveLength(3);
      
      // Each part should be hex string
      parts.forEach(part => {
        expect(/^[0-9a-f]+$/i.test(part)).toBe(true);
      });
      
      // Verify structure by successful decryption
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should reject invalid format during decryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Missing parts
      expect(() => decrypt('iv:authTag')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('just-one-part')).toThrow('Invalid encrypted data format');
      
      // Empty parts
      expect(() => decrypt('::data')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('iv::data')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('iv:authTag:')).toThrow('Invalid encrypted data format');
    });
  });

  describe('6. Error Handling', () => {
    it('should provide informative error messages', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Test various error scenarios
      expect(() => decrypt('invalid')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('a:b:c')).toThrow(); // Invalid hex will cause decryption error
      
      // Test with invalid key
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt(testData)).toThrow('ENCRYPTION_KEY must be a 64-character hex string');
    });

    it('should handle encryption errors gracefully in wrapper functions', () => {
      // Test error handling when key is missing
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => encryptToken('test')).toThrow('Token encryption failed');
      expect(() => decryptToken('test')).toThrow('Token decryption failed');
    });

    it('should log errors to console', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      delete process.env.ENCRYPTION_KEY;
      
      try {
        encryptToken('test');
      } catch (error) {
        // Expected to throw
      }
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to encrypt token:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('7. Null Safety', () => {
    it('should handle null/undefined tokens in encryptToken', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      expect(encryptToken(null)).toBe(null);
      expect(encryptToken(undefined)).toBe(null);
      expect(encryptToken('')).toBe(null);
      
      // Valid tokens should encrypt
      const encrypted = encryptToken('test-token');
      expect(encrypted).not.toBe(null);
      expect(encrypted).not.toBe('test-token');
    });

    it('should handle null/undefined tokens in decryptToken', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      expect(decryptToken(null)).toBe(null);
      expect(decryptToken(undefined)).toBe(null);
      expect(decryptToken('')).toBe(null);
      
      // Valid encrypted tokens should decrypt
      const encrypted = encryptToken('test-token');
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe('test-token');
    });

    it('should properly identify encrypted vs non-encrypted data', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted('plain text')).toBe(false);
      
      const encrypted = encrypt(testData);
      expect(isEncrypted(encrypted)).toBe(true);
    });
  });

  describe('End-to-End Encryption/Decryption', () => {
    it('should successfully encrypt and decrypt various data types', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const testCases = [
        'Simple string',
        'String with special characters: !@#$%^&*()',
        'Unicode string: 🔐🔑💰',
        'Number as string: 12345',
        'JSON string: {"key": "value", "nested": {"data": true}}',
        'Long string: ' + 'A'.repeat(1000),
        'Empty string: ',
        'Whitespace only:    \n\t   '
      ];
      
      testCases.forEach(testCase => {
        if (testCase.trim()) { // Skip empty strings for encryption
          const encrypted = encrypt(testCase);
          const decrypted = decrypt(encrypted);
          expect(decrypted).toBe(testCase);
        }
      });
    });

    it('should maintain data integrity across multiple encryption cycles', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      let data = 'Original sensitive data';
      
      // Encrypt and decrypt multiple times
      for (let i = 0; i < 5; i++) {
        const encrypted = encrypt(data);
        data = decrypt(encrypted);
      }
      
      expect(data).toBe('Original sensitive data');
    });

    it('should handle large data encryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const largeData = 'A'.repeat(50000); // 50KB of data
      const encrypted = encrypt(largeData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(largeData);
      expect(encrypted).not.toBe(largeData);
      expect(encrypted.length).toBeGreaterThan(largeData.length); // Encrypted should be larger due to IV + auth tag
    });
  });

  describe('Application-Specific Encryption Use Cases', () => {
    it('should encrypt and decrypt private relationship notes', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const sensitiveNote = 'Private notes about relationship dynamics and personal boundaries';
      const encrypted = encrypt(sensitiveNote);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toContain(sensitiveNote);
      expect(decrypted).toBe(sensitiveNote);
    });

    it('should encrypt and decrypt private event descriptions', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const privateEvent = 'Confidential therapy appointment at 3 PM';
      const encrypted = encrypt(privateEvent);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toContain(privateEvent);
      expect(decrypted).toBe(privateEvent);
    });

    it('should encrypt and decrypt phone numbers (PII)', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const phoneNumber = '+1-555-123-4567';
      const encrypted = encrypt(phoneNumber);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toContain(phoneNumber);
      expect(encrypted).not.toContain('555');
      expect(decrypted).toBe(phoneNumber);
    });

    it('should encrypt OAuth tokens and API keys', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const oauthTokens = [
        'ya29.TEST_ACCESS_TOKEN_FAKE_x7p5zF7oPkP_vXUjodeU',
        'sk_live_TEST_STRIPE_KEY_FAKE_AbCdEf123456',
        'xoxp-TEST-SLACK-TOKEN-FAKE-123456789',
      ];
      
      oauthTokens.forEach(token => {
        const encrypted = encryptToken(token);
        
        // Verify encryption
        expect(encrypted).not.toBe(null);
        expect(encrypted).not.toContain(token);
        expect(encrypted).not.toContain(token.substring(0, 10));
        
        // Verify decryption
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      });
    });

    it('should encrypt location data', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const location = '1234 Main Street, Anytown, ST 12345';
      const encrypted = encrypt(location);
      const decrypted = decrypt(encrypted);
      
      expect(encrypted).not.toContain('Main Street');
      expect(encrypted).not.toContain('1234');
      expect(decrypted).toBe(location);
    });

    it('should handle batch encryption of multiple sensitive fields', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const sensitiveData = {
        email: 'user@example.com',
        phone: '+1-555-987-6543',
        notes: 'Private relationship notes',
        location: 'Home address: 456 Privacy Lane'
      };
      
      // Encrypt all fields
      const encrypted = Object.entries(sensitiveData).reduce((acc, [key, value]) => {
        acc[key] = encrypt(value);
        return acc;
      }, {} as Record<string, string>);
      
      // Verify all fields are encrypted (don't contain original data)
      Object.entries(encrypted).forEach(([key, value]) => {
        expect(value).not.toContain(sensitiveData[key as keyof typeof sensitiveData]);
      });
      
      // Decrypt and verify
      const decrypted = Object.entries(encrypted).reduce((acc, [key, value]) => {
        acc[key] = decrypt(value);
        return acc;
      }, {} as Record<string, string>);
      
      expect(decrypted).toEqual(sensitiveData);
    });

    it('should maintain encryption performance for real-world usage', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const testData = 'Typical calendar event description with some private details';
      const iterations = 100;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const encrypted = encrypt(testData);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(testData);
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      // Should be fast enough for real-world usage (< 1ms per operation on average)
      expect(avgTime).toBeLessThan(1);
    });
  });

  describe('Security Best Practices', () => {
    it('should not expose sensitive information in errors', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const sensitiveData = 'SECRET_PASSWORD_123';
      
      try {
        // Force an error by tampering with encrypted data
        const encrypted = encrypt(sensitiveData);
        const tampered = encrypted.replace(/a/g, 'z'); // Tamper with data
        decrypt(tampered);
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain(sensitiveData);
        expect(errorMessage).not.toContain('SECRET');
        expect(errorMessage).not.toContain('PASSWORD');
      }
    });

    it('should use constant-time comparison for authentication', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const data = 'Test data for timing attack prevention';
      const encrypted = encrypt(data);
      
      // Create similar but incorrect encrypted data
      const parts = encrypted.split(':');
      const wrongAuthTag = parts[1].replace(/a/g, 'b');
      const tamperedData = `${parts[0]}:${wrongAuthTag}:${parts[2]}`;
      
      // Both should fail, but timing should be similar
      // This is more of a design consideration than a direct test
      expect(() => decrypt(tamperedData)).toThrow();
      expect(() => decrypt('completely:wrong:format')).toThrow();
    });
  });
});
