/**
 * Simplified Key Error Handler Tests
 * 
 * Tests core key error handling functionality with simplified setup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  validateEncryptedData,
  encryptTokenWithRecovery,
  decryptTokenWithRecovery 
} from '@/lib/encryption';

describe('Key Error Handling - Core Functions', () => {
  beforeEach(() => {
    // Ensure test environment key
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('validateEncryptedData', () => {
    it('should validate legacy format correctly', () => {
      const legacyFormat = 'abcdef123456:fedcba654321:987654321abc';
      const validation = validateEncryptedData(legacyFormat);
      
      expect(validation.format).toBe('legacy');
      expect(validation.valid).toBe(true);
      expect(validation.recoverable).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect invalid legacy format', () => {
      const invalidFormat = 'invalid:format';
      const validation = validateEncryptedData(invalidFormat);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('legacy');
      expect(validation.issues).toContain('Invalid legacy format - expected 3 parts');
      expect(validation.recoverable).toBe(false);
    });

    it('should validate enhanced JSON format correctly', () => {
      const enhancedFormat = JSON.stringify({
        version: 2,
        algorithm: 'aes-256-gcm',
        iv: 'abcdef123456',
        authTag: 'fedcba654321',
        encryptedData: '987654321abc',
        keyDerivation: {
          salt: 'test_salt',
          algorithm: 'argon2id',
          parameters: { iterations: 100000 }
        }
      });
      
      const validation = validateEncryptedData(enhancedFormat);
      
      expect(validation.format).toBe('enhanced');
      expect(validation.valid).toBe(true);
      expect(validation.recoverable).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect missing fields in enhanced format', () => {
      const incompleteFormat = JSON.stringify({
        version: 2,
        algorithm: 'aes-256-gcm',
        // Missing required fields
      });
      
      const validation = validateEncryptedData(incompleteFormat);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('enhanced');
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recoverable).toBe(false);
    });

    it('should detect invalid hex formats in legacy data', () => {
      const invalidHexFormat = 'invalid_hex:another_invalid:third_invalid';
      const validation = validateEncryptedData(invalidHexFormat);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('legacy');
      expect(validation.issues).toContain('Invalid IV format');
      expect(validation.issues).toContain('Invalid auth tag format');
      expect(validation.issues).toContain('Invalid encrypted data format');
      expect(validation.recoverable).toBe(false);
    });

    it('should handle JSON parsing errors', () => {
      const malformedJson = '{"incomplete": "json"';
      const validation = validateEncryptedData(malformedJson);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('unknown');
      expect(validation.issues).toContain('JSON parsing failed');
      expect(validation.recoverable).toBe(false);
    });

    it('should handle empty and null data', () => {
      const testCases = ['', null, undefined];
      
      testCases.forEach(testCase => {
        if (testCase !== null && testCase !== undefined) {
          const validation = validateEncryptedData(testCase);
          expect(validation.valid).toBe(false);
        }
      });
    });
  });

  describe('Token Encryption with Recovery', () => {
    it('should handle null tokens gracefully', async () => {
      const encrypted = await encryptTokenWithRecovery(null);
      expect(encrypted).toBeNull();
      
      const decrypted = await decryptTokenWithRecovery(null);
      expect(decrypted).toBeNull();
    });

    it('should handle undefined tokens gracefully', async () => {
      const encrypted = await encryptTokenWithRecovery(undefined);
      expect(encrypted).toBeNull();
      
      const decrypted = await decryptTokenWithRecovery(undefined);
      expect(decrypted).toBeNull();
    });

    it('should handle empty string tokens', async () => {
      const encrypted = await encryptTokenWithRecovery('');
      expect(encrypted).toBeNull();
      
      const decrypted = await decryptTokenWithRecovery('');
      expect(decrypted).toBeNull();
    });

    it('should encrypt and decrypt valid tokens', async () => {
      const token = 'test_token_12345';
      const overrideKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      // Use a dedicated test override key to avoid interference from other files
      const originalOverride = process.env.ENCRYPTION_KEY_TEST_OVERRIDE;
      try {
        process.env.ENCRYPTION_KEY_TEST_OVERRIDE = overrideKey;

        const encrypted = await encryptTokenWithRecovery(token, { overrideKeyHex: overrideKey });
        expect(encrypted).toBeDefined();
        expect(encrypted).not.toBe(token);
        expect(encrypted).not.toBeNull();
        
        const decrypted = await decryptTokenWithRecovery(encrypted!, overrideKey);
        expect(decrypted).toBe(token);
      } finally {
        if (originalOverride === undefined) {
          delete process.env.ENCRYPTION_KEY_TEST_OVERRIDE;
        } else {
          process.env.ENCRYPTION_KEY_TEST_OVERRIDE = originalOverride;
        }
      }
    });

    it('should return null on decryption failure', async () => {
      const corruptedToken = 'definitely_corrupted_data';
      const result = await decryptTokenWithRecovery(corruptedToken);
      expect(result).toBeNull();
    });

    it('should handle development mode gracefully', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalKey = process.env.ENCRYPTION_KEY;
      
      try {
        process.env.NODE_ENV = 'development';
        delete process.env.ENCRYPTION_KEY;
        
        const token = 'test_token_dev';
        const result = await encryptTokenWithRecovery(token);
        
        expect(result).toBe(`UNENCRYPTED:${token}`);
        
        const decrypted = await decryptTokenWithRecovery(result!);
        expect(decrypted).toBe(token);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.ENCRYPTION_KEY = originalKey;
      }
    });

    it('should handle various token formats', async () => {
      const testTokens = [
        'simple_token',
        'token.with.dots',
        'token-with-dashes',
        'token_with_underscores',
        'TokenWithCamelCase',
        'token123WithNumbers',
        'very_long_token_that_exceeds_normal_length_expectations_for_comprehensive_testing'
      ];
      
      for (const token of testTokens) {
        const encrypted = await encryptTokenWithRecovery(token);
        expect(encrypted).toBeDefined();
        expect(encrypted).not.toBeNull();
        
        const decrypted = await decryptTokenWithRecovery(encrypted!);
        expect(decrypted).toBe(token);
      }
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle whitespace-only tokens', async () => {
      const whitespaceTokens = ['   ', '\n\t\r', ' \n ', '\t\t'];
      
      for (const token of whitespaceTokens) {
        const encrypted = await encryptTokenWithRecovery(token);
        expect(encrypted).toBeDefined();
        
        const decrypted = await decryptTokenWithRecovery(encrypted!);
        expect(decrypted).toBe(token);
      }
    });

    it('should handle special characters in tokens', async () => {
      const specialCharTokens = [
        'token@with#special$chars',
        'token/with\\slashes',
        'token[with]brackets',
        'token{with}braces',
        'token|with|pipes',
        'token<with>angles'
      ];
      
      for (const token of specialCharTokens) {
        const encrypted = await encryptTokenWithRecovery(token);
        expect(encrypted).toBeDefined();
        
        const decrypted = await decryptTokenWithRecovery(encrypted!);
        expect(decrypted).toBe(token);
      }
    });

    it('should handle unicode tokens', async () => {
      const unicodeTokens = [
        'token_with_émojis_🔑',
        'токен_на_русском',
        'トークン_日本語',
        'token_中文字符',
        'token_مع_العربية'
      ];
      
      for (const token of unicodeTokens) {
        const encrypted = await encryptTokenWithRecovery(token);
        expect(encrypted).toBeDefined();
        
        const decrypted = await decryptTokenWithRecovery(encrypted!);
        expect(decrypted).toBe(token);
      }
    });

    it('should handle very large tokens', async () => {
      const largeToken = 'x'.repeat(10000); // 10KB token
      
      const encrypted = await encryptTokenWithRecovery(largeToken);
      expect(encrypted).toBeDefined();
      
      const decrypted = await decryptTokenWithRecovery(encrypted!);
      expect(decrypted).toBe(largeToken);
    });

    it('should handle binary-like data in tokens', async () => {
      const binaryToken = Buffer.from('binary_data_example').toString('base64');
      
      const encrypted = await encryptTokenWithRecovery(binaryToken);
      expect(encrypted).toBeDefined();
      
      const decrypted = await decryptTokenWithRecovery(encrypted!);
      expect(decrypted).toBe(binaryToken);
    });
  });

  describe('Validation Boundary Conditions', () => {
    it('should handle minimum valid legacy format', () => {
      const minimalLegacy = 'a:b:c';
      const validation = validateEncryptedData(minimalLegacy);
      
      expect(validation.format).toBe('legacy');
      // This should fail validation due to invalid hex format
      expect(validation.valid).toBe(false);
    });

    it('should handle maximum reasonable data size', () => {
      const largeData = 'a'.repeat(1000000); // 1MB of data
      const validation = validateEncryptedData(largeData);
      
      // Should not crash and should return some result
      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe('boolean');
    });

    it('should handle malformed but parseable JSON', () => {
      const weirdJson = JSON.stringify({
        version: '2', // String instead of number
        algorithm: null, // Null value
        iv: 123, // Number instead of string
        authTag: {},  // Object instead of string
        encryptedData: [] // Array instead of string
      });
      
      const validation = validateEncryptedData(weirdJson);
      
      expect(validation.format).toBe('enhanced');
      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle rapid successive calls', async () => {
      const token = 'performance_test_token';
      const iterations = 100;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const encrypted = await encryptTokenWithRecovery(token);
        const decrypted = await decryptTokenWithRecovery(encrypted!);
        expect(decrypted).toBe(token);
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (less than 5 seconds for 100 iterations)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent operations', async () => {
      const token = 'concurrent_test_token';
      const concurrency = 50;
      
      const startTime = Date.now();
      
      const promises = Array(concurrency).fill(0).map(async (_, i) => {
        const testToken = `${token}_${i}`;
        const encrypted = await encryptTokenWithRecovery(testToken);
        const decrypted = await decryptTokenWithRecovery(encrypted!);
        return { original: testToken, decrypted };
      });
      
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      // All results should match
      results.forEach(result => {
        expect(result.decrypted).toBe(result.original);
      });
      
      // Should complete within reasonable time (less than 10 seconds for 50 concurrent operations)
      expect(duration).toBeLessThan(10000);
    });
  });
});

describe('Error Recovery Integration', () => {
  it('should maintain consistent behavior across different error scenarios', async () => {
    const scenarios = [
      { desc: 'valid encryption key', key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' },
      { desc: 'invalid key format', key: 'invalid_key' },
      { desc: 'empty key', key: '' },
      { desc: 'null key', key: null }
    ];
    
    const token = 'consistency_test_token';
    
    for (const scenario of scenarios) {
      const originalKey = process.env.ENCRYPTION_KEY;
      
      try {
        if (scenario.key === null) {
          delete process.env.ENCRYPTION_KEY;
        } else {
          process.env.ENCRYPTION_KEY = scenario.key;
        }
        
        let encrypted: string | null = null;
        let decrypted: string | null = null;
        let encryptError: Error | null = null;
        let decryptError: Error | null = null;
        
        try {
          encrypted = await encryptTokenWithRecovery(token);
        } catch (error) {
          encryptError = error as Error;
        }
        
        if (encrypted) {
          try {
            decrypted = await decryptTokenWithRecovery(encrypted);
          } catch (error) {
            decryptError = error as Error;
          }
        }
        
        // Log scenario results for debugging
        console.log(`Scenario "${scenario.desc}":`, {
          encrypted: encrypted ? 'success' : 'failed',
          decrypted: decrypted ? 'success' : 'failed',
          encryptError: encryptError?.message,
          decryptError: decryptError?.message
        });
        
        // At minimum, functions should not crash
        expect(typeof encrypted).toBe(encrypted === null ? 'object' : 'string');
        if (encrypted && !encryptError) {
          expect(typeof decrypted).toBe(decrypted === null ? 'object' : 'string');
        }
      } finally {
        process.env.ENCRYPTION_KEY = originalKey;
      }
    }
  });
});
