/**
 * Standalone Key Derivation Tests
 * 
 * These tests verify the actual cryptographic implementation works correctly
 * without requiring database connections or complex mocking.
 * This is the recommended approach for testing security-critical code.
 */

import { describe, it, expect, vi } from 'vitest';
import * as crypto from 'crypto';

// We need to ensure we're NOT using the mocked crypto module for these tests
vi.unmock('crypto');
vi.unmock('@node-rs/argon2');

// Import after unmocking to get real implementations
import {
  KeyDerivationService,
  KeyDerivationAlgorithm,
  SecurityLevel,
  getKeyDerivationService
} from '@/lib/security/key-derivation-service';

describe('Key Derivation Standalone Tests (Real Cryptography)', () => {
  // Helper to measure execution time
  const measureTime = async (fn: () => Promise<any>): Promise<number> => {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    return Number(end - start) / 1_000_000; // Convert to milliseconds
  };

  describe('Core Functionality', () => {
    it('should successfully initialize key derivation service', () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });
      
      expect(service).toBeDefined();
      expect(service.getSecurityParameters()).toEqual({
        memoryCost: 4096,
        timeCost: 3,
        parallelism: 1
      });
    });

    it('should derive a valid key using Argon2id', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const password = 'test-password-123!@#';
      const result = await service.deriveKey(password);
      
      // Verify key structure
      expect(result.derivedKey).toBeInstanceOf(Buffer);
      expect(result.derivedKey.length).toBe(32); // 256 bits
      expect(result.salt).toBeInstanceOf(Buffer);
      expect(result.salt.length).toBe(32);
      expect(result.algorithm).toBe(KeyDerivationAlgorithm.ARGON2ID);
      
      // Verify key randomness (not predictable)
      const keyHex = result.derivedKey.toString('hex');
      expect(keyHex).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(keyHex).not.toBe('0'.repeat(64)); // Not all zeros
      expect(keyHex).not.toMatch(/^(.)\1+$/); // Not repeating character
    });

    it('should derive a valid key using scrypt', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.SCRYPT,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const password = 'scrypt-test-password';
      const result = await service.deriveKey(password);
      
      expect(result.derivedKey).toBeInstanceOf(Buffer);
      expect(result.derivedKey.length).toBe(32);
      expect(result.algorithm).toBe(KeyDerivationAlgorithm.SCRYPT);
      expect(result.parameters).toMatchObject({
        cost: 16384,
        blockSize: 8,
        parallelism: 1
      });
    });

    it('should derive a valid key using PBKDF2', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.PBKDF2,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const password = 'pbkdf2-test-password';
      const result = await service.deriveKey(password);
      
      expect(result.derivedKey).toBeInstanceOf(Buffer);
      expect(result.derivedKey.length).toBe(32);
      expect(result.algorithm).toBe(KeyDerivationAlgorithm.PBKDF2);
      expect(result.parameters.iterations).toBe(100000);
      expect(result.parameters.digest).toBe('sha512');
    });
  });

  describe('Security Properties', () => {
    it('should generate cryptographically random salts', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const salts = new Set<string>();
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const result = await service.deriveKey('same-password');
        salts.add(result.salt.toString('hex'));
      }
      
      // All salts should be unique
      expect(salts.size).toBe(iterations);
      
      // Verify salt randomness
      const saltArray = Array.from(salts);
      saltArray.forEach(salt => {
        expect(salt).toHaveLength(64); // 32 bytes
        expect(salt).toMatch(/^[0-9a-f]{64}$/); // Valid hex
      });
    });

    it('should produce different keys for same password with different salts', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const password = 'identical-password';
      const result1 = await service.deriveKey(password);
      const result2 = await service.deriveKey(password);
      
      // Same password but different salts = different keys
      expect(result1.salt.toString('hex')).not.toBe(result2.salt.toString('hex'));
      expect(result1.derivedKey.toString('hex')).not.toBe(result2.derivedKey.toString('hex'));
    });

    it('should produce identical keys for same password and salt', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const password = 'reproducible-password';
      const fixedSalt = crypto.randomBytes(32);
      
      const result1 = await service.deriveKey(password, fixedSalt);
      const result2 = await service.deriveKey(password, fixedSalt);
      
      // Same password + same salt = same key (deterministic)
      expect(result1.derivedKey.toString('hex')).toBe(result2.derivedKey.toString('hex'));
    });

    it('should correctly verify passwords', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const correctPassword = 'my-secure-password';
      const wrongPassword = 'wrong-password';
      
      // Derive key with correct password
      const result = await service.deriveKeyHex(correctPassword);
      
      // Verify correct password
      const isValid = await service.verifyKey(correctPassword, result.metadata, result.key);
      expect(isValid).toBe(true);
      
      // Verify wrong password fails
      const isInvalid = await service.verifyKey(wrongPassword, result.metadata, result.key);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Performance and Security Levels', () => {
    it('should use appropriate parameters for each security level', () => {
      const levels = [
        SecurityLevel.DEVELOPMENT,
        SecurityLevel.TESTING,
        SecurityLevel.PRODUCTION,
        SecurityLevel.HIGH_SECURITY
      ];

      levels.forEach(level => {
        const service = new KeyDerivationService({
          algorithm: KeyDerivationAlgorithm.ARGON2ID,
          securityLevel: level
        });

        const params = service.getSecurityParameters();
        
        // Verify parameters increase with security level
        if (level === SecurityLevel.DEVELOPMENT) {
          expect(params.memoryCost).toBe(4096); // 4 MB
          expect(params.timeCost).toBe(3);
        } else if (level === SecurityLevel.PRODUCTION) {
          expect(params.memoryCost).toBe(65536); // 64 MB
          expect(params.timeCost).toBe(4);
        } else if (level === SecurityLevel.HIGH_SECURITY) {
          expect(params.memoryCost).toBe(131072); // 128 MB
          expect(params.timeCost).toBe(6);
        }
      });
    });

    it('should complete derivation in reasonable time for development', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.PBKDF2, // Fastest algorithm
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const time = await measureTime(() => service.deriveKey('test-password'));
      
      // Development derivation should be fast
      expect(time).toBeLessThan(1000); // Less than 1 second
      expect(time).toBeGreaterThan(10); // But not too fast (indicates it's working)
    });

    it('should benchmark derivation performance', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const benchmark = await service.benchmarkDerivation();
      
      expect(benchmark.timeMs).toBeGreaterThan(0);
      expect(benchmark.algorithm).toBe(KeyDerivationAlgorithm.ARGON2ID);
      expect(benchmark.securityLevel).toBe(SecurityLevel.DEVELOPMENT);
      expect(benchmark.parameters).toBeDefined();
    });
  });

  describe('Edge Cases and Compatibility', () => {
    it('should handle Unicode passwords correctly', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const unicodePasswords = [
        '密码123',         // Chinese characters
        'пароль456',       // Cyrillic
        '🔒🔑💪',          // Emojis
        'café-münchën',    // Accented characters
        'مرحبا123'         // Arabic
      ];

      for (const password of unicodePasswords) {
        const result = await service.deriveKey(password);
        expect(result.derivedKey).toBeInstanceOf(Buffer);
        expect(result.derivedKey.length).toBe(32);
        
        // Verify we can reproduce the same key
        const result2 = await service.deriveKey(password, result.salt);
        expect(result.derivedKey.toString('hex')).toBe(result2.derivedKey.toString('hex'));
      }
    });

    it('should handle very long passwords', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.PBKDF2, // Faster for this test
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      const longPassword = 'a'.repeat(10000); // 10KB password
      const result = await service.deriveKey(longPassword);
      
      expect(result.derivedKey).toBeInstanceOf(Buffer);
      expect(result.derivedKey.length).toBe(32);
    });

    it('should reject empty passwords', async () => {
      const service = new KeyDerivationService({
        algorithm: KeyDerivationAlgorithm.ARGON2ID,
        securityLevel: SecurityLevel.DEVELOPMENT
      });

      await expect(service.deriveKey('')).rejects.toThrow('Password cannot be empty');
      await expect(service.deriveKey('   ')).rejects.toThrow('Password cannot be empty');
    });

    it('should work across all algorithms with same interface', async () => {
      const algorithms = [
        KeyDerivationAlgorithm.ARGON2ID,
        KeyDerivationAlgorithm.SCRYPT,
        KeyDerivationAlgorithm.PBKDF2
      ];

      const password = 'cross-algorithm-test';
      const results = new Map<string, string>();

      for (const algorithm of algorithms) {
        const service = new KeyDerivationService({
          algorithm,
          securityLevel: SecurityLevel.DEVELOPMENT
        });

        const result = await service.deriveKeyHex(password);
        results.set(algorithm, result.key);
        
        // Verify consistent output format
        expect(result.key).toHaveLength(64); // 32 bytes hex
        expect(result.metadata.algorithm).toBe(algorithm);
        expect(result.metadata.salt).toHaveLength(64);
      }

      // Verify different algorithms produce different keys
      const keys = Array.from(results.values());
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(algorithms.length);
    });
  });

  describe('Integration with Encryption System', () => {
    it('should produce keys suitable for AES-256-GCM encryption', async () => {
      const service = KeyDerivationService.createProductionService();
      
      const masterPassword = 'user-master-password';
      const result = await service.deriveKeyHex(masterPassword);
      
      // AES-256 requires exactly 32 bytes (256 bits)
      expect(result.key).toHaveLength(64); // 32 bytes as hex
      
      // Verify the key can be used with Node crypto
      const key = Buffer.from(result.key, 'hex');
      expect(key.length).toBe(32);
      
      // Test it works with crypto operations
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      expect(cipher).toBeDefined();
    });

    it('should support environment-based initialization', () => {
      // Save original env
      const originalNodeEnv = process.env.NODE_ENV;
      const originalSecurityLevel = process.env.SECURITY_LEVEL;

      try {
        // Test production environment
        process.env.NODE_ENV = 'production';
        process.env.SECURITY_LEVEL = 'production';
        
        const service = getKeyDerivationService();
        const params = service.getSecurityParameters();
        
        expect(params.memoryCost || params.cost || params.iterations)
          .toBeGreaterThanOrEqual(65536);
      } finally {
        // Restore original env
        process.env.NODE_ENV = originalNodeEnv;
        process.env.SECURITY_LEVEL = originalSecurityLevel;
      }
    });
  });
});
