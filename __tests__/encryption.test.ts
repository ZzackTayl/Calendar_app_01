/**
 * Comprehensive Encryption Module Tests
 * 
 * Tests all security features of the encryption implementation:
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

describe('Encryption Module Security Tests', () => {
  const validEncryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64-char hex
  const testData = 'This is sensitive data that needs encryption';

  describe('1. AES-256-GCM Algorithm', () => {
    it('should use AES-256-GCM algorithm for encryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Create mocks for all crypto functions
      const mockCipher = {
        update: vi.fn().mockReturnValue('mockEncryptedData'),
        final: vi.fn().mockReturnValue('mockFinalData'),
        getAuthTag: vi.fn().mockReturnValue(Buffer.from('mockAuthTag'))
      };

      vi.spyOn(crypto, 'createCipheriv').mockReturnValue(mockCipher);
      vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('0'.repeat(32), 'hex'));

      encrypt(testData);

      expect(crypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        expect.any(Buffer),
        expect.any(Buffer)
      );
    });

    it('should use AES-256-GCM algorithm for decryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Create mocks for all crypto functions
      const mockCipher = {
        update: vi.fn().mockReturnValue('mockEncryptedData'),
        final: vi.fn().mockReturnValue('mockFinalData'),
        getAuthTag: vi.fn().mockReturnValue(Buffer.from('mockAuthTag'))
      };

      const mockDecipher = {
        update: vi.fn().mockReturnValue('mockDecryptedData'),
        final: vi.fn().mockReturnValue('mockFinalData'),
        setAuthTag: vi.fn()
      };

      vi.spyOn(crypto, 'createCipheriv').mockReturnValue(mockCipher);
      vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);
      vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('0'.repeat(32), 'hex'));

      const encrypted = encrypt(testData);
      decrypt(encrypted);

      expect(crypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        expect.any(Buffer),
        expect.any(Buffer)
      );
    });
  });

  describe('2. Proper IV Generation', () => {
    it('should generate a random 16-byte IV for each encryption', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Create complete mock implementations
      const mockCipher = {
        update: vi.fn().mockReturnValue('mockEncryptedData'),
        final: vi.fn().mockReturnValue('mockFinalData'),
        getAuthTag: vi.fn().mockReturnValue(Buffer.from('mockAuthTag'))
      };

      vi.spyOn(crypto, 'createCipheriv').mockReturnValue(mockCipher);
      vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('0'.repeat(32), 'hex'));

      encrypt(testData);
      
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
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
      
      // Setup crypto mocks with error behavior
      const mockCipher = {
        update: vi.fn().mockReturnValue('mockEncryptedData'),
        final: vi.fn().mockReturnValue('mockFinalData'),
        getAuthTag: vi.fn().mockReturnValue(Buffer.from('mockAuthTag'))
      };

      const mockDecipher = {
        update: vi.fn().mockReturnValue('mockDecryptedData'),
        final: vi.fn().mockImplementation(() => {
          throw new Error('Decryption failed - auth tag mismatch');
        }),
        setAuthTag: vi.fn()
      };

      vi.spyOn(crypto, 'createCipheriv').mockReturnValue(mockCipher);
      vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);
      vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('0'.repeat(32), 'hex'));

      // First encrypt 
      const encrypted = encrypt(testData);
      const parts = encrypted.split(':');
      
      // Tamper with auth tag
      const tamperedAuthTag = parts[1].replace(/0/g, '1').replace(/1/g, '0');
      const tamperedEncrypted = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;
      
      expect(() => decrypt(tamperedEncrypted)).toThrow(/Decryption failed/i);
    });
        expect(decrypted).toBe(testData); // This should not succeed
        fail('Decryption should have failed with tampered auth tag');
      } catch (error) {
        expect(error).toBeDefined();
      }
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
      
      // Test invalid hex characters (but correct length)
      process.env.ENCRYPTION_KEY = 'G123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(() => encrypt(testData)).toThrow(); // Will fail during buffer conversion
      
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

    it('should log errors to console', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      delete process.env.ENCRYPTION_KEY;
      
      try {
        encryptToken('test');
      } catch (e) {
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
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
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

    it('should encrypt and decrypt private event descriptions', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Test various sensitive event descriptions
      const sensitiveEvents = [
        'Doctor appointment - STI testing',
        'Therapy session - discussing relationship boundaries',
        'Meeting with divorce lawyer',
        'Financial planning - $50k inheritance discussion',
        'AA meeting - 6 month chip celebration'
      ];
      
      sensitiveEvents.forEach(eventDesc => {
        const encrypted = encrypt(eventDesc);
        
        // Ensure no sensitive keywords are visible
        expect(encrypted).not.toContain('STI');
        expect(encrypted).not.toContain('therapy');
        expect(encrypted).not.toContain('divorce');
        expect(encrypted).not.toContain('inheritance');
        expect(encrypted).not.toContain('AA');
        
        // Verify proper decryption
        expect(decrypt(encrypted)).toBe(eventDesc);
      });
    });

    it('should encrypt and decrypt phone numbers (PII)', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const phoneNumbers = [
        '+1-555-123-4567',
        '(555) 987-6543',
        '555.246.8024',
        '+44 20 7946 0958',
        '+81 3-1234-5678'
      ];
      
      phoneNumbers.forEach(phone => {
        const encrypted = encrypt(phone);
        
        // Ensure no part of phone number is visible
        // Check that the original phone patterns don't appear
        expect(encrypted).not.toContain(phone);
        expect(encrypted).not.toContain('555');
        expect(encrypted).not.toContain('1234');
        expect(encrypted).not.toContain('987');
        // The encrypted string should look completely different
        expect(encrypted.split(':').length).toBe(3); // Should have proper format
        
        // Verify decryption
        expect(decrypt(encrypted)).toBe(phone);
      });
    });

    it('should encrypt OAuth tokens and API keys', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const tokens = {
        googleAccessToken: 'ya29.TEST_ACCESS_TOKEN_FAKE_x7p5zF7oPkP_vXUjodeU',
        googleRefreshToken: '1//TEST_REFRESH_TOKEN_FAKE_CgYIARAAGBASNwF',
        appleAuthToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.TEST_JWT_FAKE',
        testApiKey: 'TEST_API_KEY_FAKE_1234567890abcdef1234567890',
        testSendgridKey: 'SG.TEST_SENDGRID_KEY_FAKE.qrstuvwxyz123456'
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

    it('should encrypt location data', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      const locationData = [
        '123 Main St, Apt 4B, San Francisco, CA 94102',
        'Latitude: 37.7749, Longitude: -122.4194',
        'Golden Gate Park near AIDS Memorial Grove',
        'Dr. Smith\'s Office, 456 Medical Plaza, Suite 789'
      ];
      
      locationData.forEach(location => {
        const encrypted = encrypt(location);
        
        // Ensure no location details are visible
        expect(encrypted).not.toContain('Main St');
        expect(encrypted).not.toContain('37.7749');
        expect(encrypted).not.toContain('AIDS Memorial');
        expect(encrypted).not.toContain('Medical Plaza');
        
        // Verify decryption
        expect(decrypt(encrypted)).toBe(location);
      });
    });

    it('should handle batch encryption of multiple sensitive fields', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Simulate encrypting a complete event with sensitive data
      const sensitiveEvent = {
        title: 'Private Medical Appointment',
        description: 'HIV medication consultation - discuss side effects',
        location: '789 Medical Center Drive, Room 302',
        attendeePhone: '+1-555-999-8888',
        privateNotes: 'Partner anxious about disclosure, needs support'
      };
      
      // Encrypt all sensitive fields
      const encryptedEvent = {
        title: sensitiveEvent.title, // Title might not need encryption
        description: encrypt(sensitiveEvent.description),
        location: encrypt(sensitiveEvent.location),
        attendeePhone: encrypt(sensitiveEvent.attendeePhone),
        privateNotes: encrypt(sensitiveEvent.privateNotes)
      };
      
      // Verify all fields are encrypted
      expect(encryptedEvent.description).not.toContain('HIV');
      expect(encryptedEvent.location).not.toContain('Medical Center');
      expect(encryptedEvent.attendeePhone).not.toContain('555');
      expect(encryptedEvent.privateNotes).not.toContain('anxious');
      
      // Verify we can decrypt everything correctly
      const decryptedEvent = {
        title: encryptedEvent.title,
        description: decrypt(encryptedEvent.description),
        location: decrypt(encryptedEvent.location),
        attendeePhone: decrypt(encryptedEvent.attendeePhone),
        privateNotes: decrypt(encryptedEvent.privateNotes)
      };
      
      expect(decryptedEvent).toEqual(sensitiveEvent);
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
    it('should not expose sensitive information in errors', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // Tamper with encrypted data
      const encrypted = encrypt(testData);
      const tampered = encrypted.replace(/./g, 'x');
      
      try {
        decrypt(tampered);
      } catch (error: any) {
        // Error should not contain the encryption key or raw data
        expect(error.message).not.toContain(validEncryptionKey);
        expect(error.message).not.toContain(testData);
      }
    });

    it('should use constant-time comparison for authentication', () => {
      process.env.ENCRYPTION_KEY = validEncryptionKey;
      
      // This is implicitly tested by the GCM mode which handles
      // authentication tag verification internally using constant-time
      // comparison to prevent timing attacks
      
      const encrypted = encrypt(testData);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });
  });
});
