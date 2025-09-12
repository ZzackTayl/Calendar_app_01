/**
 * Core Encryption Module Tests (No Mocking)
 * 
 * These tests verify the actual encryption implementation without mocks
 * to ensure proper validation of crypto functions and security features.
 * 
 * Tests validate:
 * 1. AES-256-GCM Algorithm usage
 * 2. Proper IV Generation (random 16-byte)
 * 3. Authentication Tags (GCM mode)
 * 4. Key Validation (64-character hex enforcement)
 * 5. Structured Format (iv:authTag:encryptedData)
 * 6. Error Handling
 * 7. Null Safety
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { encrypt, decrypt, encryptToken, decryptToken, isEncrypted } from '@/lib/encryption';

// Mock environment variable for testing
const originalEnv = process.env;

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('Core Encryption Security Tests', () => {
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
      expect(() => decrypt('::encryptedData')).toThrow('Invalid encrypted data format');
      expect(() => decrypt('iv::encryptedData')).toThrow('Invalid encrypted data format');
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
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => encryptToken('test')).toThrow('Token encryption failed');
      expect(() => decryptToken('test')).toThrow('Token decryption failed');
    });
  });

  describe('7. Null Safety', () => {
    it('should handle null/undefined tokens in encryptToken', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      expect(encryptToken(null)).toBe(null);
      expect(encryptToken(undefined)).toBe(null);
      expect(encryptToken('')).toBe(null);
      
      // Should encrypt non-empty strings
      const encrypted = encryptToken('valid-token');
      expect(encrypted).not.toBe(null);
      expect(typeof encrypted).toBe('string');
    });

    it('should handle null/undefined tokens in decryptToken', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      expect(decryptToken(null)).toBe(null);
      expect(decryptToken(undefined)).toBe(null);
      expect(decryptToken('')).toBe(null);
      
      // Should decrypt valid encrypted tokens
      const encrypted = encryptToken('valid-token');
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe('valid-token');
    });

    it('should properly identify encrypted vs non-encrypted data', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Test null/undefined
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted('')).toBe(false);
      
      // Test non-encrypted strings
      expect(isEncrypted('plain text')).toBe(false);
      expect(isEncrypted('single:colon')).toBe(false);
      expect(isEncrypted('not:hex:characters!')).toBe(false);
      
      // Test encrypted string
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });
  });

  describe('End-to-End Encryption/Decryption', () => {
    it('should successfully encrypt and decrypt various data types', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Test strings
      const plainText = 'Hello, World!';
      const encrypted = encrypt(plainText);
      expect(decrypt(encrypted)).toBe(plainText);
      
      // Test JSON data
      const jsonData = JSON.stringify({ user: 'test', data: [1, 2, 3] });
      const encryptedJson = encrypt(jsonData);
      expect(decrypt(encryptedJson)).toBe(jsonData);
      
      // Test special characters
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.?/~`';
      const encryptedSpecial = encrypt(specialChars);
      expect(decrypt(encryptedSpecial)).toBe(specialChars);
      
      // Test Unicode
      const unicode = '你好世界 🌍 مرحبا بالعالم';
      const encryptedUnicode = encrypt(unicode);
      expect(decrypt(encryptedUnicode)).toBe(unicode);
    });

    it('should maintain data integrity across multiple encryption cycles', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const originalData = 'Sensitive user data that must remain intact';
      
      // Multiple encryption/decryption cycles
      for (let i = 0; i < 10; i++) {
        const encrypted = encrypt(originalData);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(originalData);
      }
    });

    it('should handle large data encryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Create large data (1MB)
      const largeData = 'x'.repeat(1024 * 1024);
      
      const encrypted = encrypt(largeData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(largeData);
      expect(decrypted.length).toBe(largeData.length);
    });
  });

  describe('Application-Specific Encryption Use Cases', () => {
    it('should encrypt and decrypt private relationship notes', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const privateNotes = 'Partner has anxiety about public events. Prefers quiet dates.';
      const encrypted = encrypt(privateNotes);
      
      // Verify it's properly encrypted
      expect(isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toContain(privateNotes);
      expect(encrypted).not.toContain('anxiety');
      expect(encrypted).not.toContain('quiet');
      
      // Verify decryption works
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(privateNotes);
    });

    it('should encrypt and decrypt OAuth tokens', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const tokens = {
        googleAccessToken: 'ya29.TEST_ACCESS_TOKEN_FAKE_x7p5zF7oPkP_vXUjodeU',
        googleRefreshToken: '1//TEST_REFRESH_TOKEN_FAKE_CgYIARAAGBASNwF',
        testApiKey: 'TEST_API_KEY_FAKE_1234567890abcdef1234567890',
      };
      
      Object.entries(tokens).forEach(([name, token]) => {
        const encrypted = encryptToken(token);
        
        // Verify encryption
        expect(encrypted).not.toBe(null);
        expect(encrypted).not.toContain(token);
        expect(encrypted).not.toContain(token.substring(0, 10));
        
        // Verify decryption
        expect(decryptToken(encrypted)).toBe(token);
      });
    });

    it('should maintain encryption performance for real-world usage', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const startTime = Date.now();
      
      // Simulate encrypting 100 events with sensitive data
      for (let i = 0; i < 100; i++) {
        const eventData = `Private therapy session ${i} - discussing relationship dynamics`;
        const encrypted = encrypt(eventData);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(eventData);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 encrypt/decrypt cycles in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Security Best Practices', () => {
    it('should not expose sensitive information in errors', async () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Tamper with encrypted data
      const encrypted = encrypt(testData);
      const tampered = encrypted.replace(/./g, 'x');
      
      try {
        decrypt(tampered);
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Error should not contain the encryption key or raw data
        expect(errorMessage).not.toContain(validEncryptionKey);
        expect(errorMessage).not.toContain(testData);
      }
    });
  });
});
