/**
 * Integration test for Key Derivation Service
 * 
 * Tests the actual implementation without mocks to ensure it works correctly
 */

import { describe, it, expect } from 'vitest';
import {
  KeyDerivationService,
  KeyDerivationAlgorithm,
  SecurityLevel
} from '@/lib/security/key-derivation-service';

describe('Key Derivation Integration Tests (Real Implementation)', () => {
  it('should derive keys using Argon2id algorithm', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const password = 'test-password-123';
    const result = await service.deriveKey(password);
    
    // Verify structure
    expect(result.derivedKey).toBeInstanceOf(Buffer);
    expect(result.derivedKey).toHaveLength(32); // 32 bytes
    expect(result.salt).toBeInstanceOf(Buffer);
    expect(result.salt).toHaveLength(32); // 32 bytes
    expect(result.algorithm).toBe(KeyDerivationAlgorithm.ARGON2ID);
    expect(result.parameters).toHaveProperty('memoryCost');
    expect(result.parameters).toHaveProperty('timeCost');
    expect(result.parameters).toHaveProperty('parallelism');
    
    // Verify the key is actually derived (not just zeros or a pattern)
    const keyHex = result.derivedKey.toString('hex');
    expect(keyHex).not.toMatch(/^0+$/); // Not all zeros
    expect(keyHex).not.toMatch(/^(.)\1+$/); // Not repeating pattern
  });

  it('should produce different keys with different salts using Argon2id', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const password = 'same-password';
    const result1 = await service.deriveKey(password);
    const result2 = await service.deriveKey(password);

    // Different salts should produce different keys
    expect(result1.salt.toString('hex')).not.toBe(result2.salt.toString('hex'));
    expect(result1.derivedKey.toString('hex')).not.toBe(result2.derivedKey.toString('hex'));
  });

  it('should produce identical keys with same password and salt using Argon2id', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const password = 'test-password';
    const salt = Buffer.from('fixed-salt-for-testing-purposes-32bytes!!', 'utf8').slice(0, 32);
    
    const result1 = await service.deriveKey(password, salt);
    const result2 = await service.deriveKey(password, salt);

    // Same password + same salt = same key
    expect(result1.derivedKey.toString('hex')).toBe(result2.derivedKey.toString('hex'));
  });

  it('should verify keys correctly with Argon2id', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const correctPassword = 'correct-password';
    const wrongPassword = 'wrong-password';
    
    const result = await service.deriveKeyHex(correctPassword);
    
    // Correct password should verify
    const isValid = await service.verifyKey(correctPassword, result.metadata, result.key);
    expect(isValid).toBe(true);
    
    // Wrong password should not verify
    const isInvalid = await service.verifyKey(wrongPassword, result.metadata, result.key);
    expect(isInvalid).toBe(false);
  });

  it('should work with scrypt algorithm', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.SCRYPT,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const password = 'test-password-scrypt';
    const result = await service.deriveKey(password);
    
    expect(result.derivedKey).toBeInstanceOf(Buffer);
    expect(result.derivedKey).toHaveLength(32);
    expect(result.algorithm).toBe(KeyDerivationAlgorithm.SCRYPT);
    expect(result.parameters).toHaveProperty('cost');
    expect(result.parameters).toHaveProperty('blockSize');
    expect(result.parameters).toHaveProperty('parallelism');
  });

  it('should work with PBKDF2 algorithm', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.PBKDF2,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const password = 'test-password-pbkdf2';
    const result = await service.deriveKey(password);
    
    expect(result.derivedKey).toBeInstanceOf(Buffer);
    expect(result.derivedKey).toHaveLength(32);
    expect(result.algorithm).toBe(KeyDerivationAlgorithm.PBKDF2);
    expect(result.parameters).toHaveProperty('iterations');
    expect(result.parameters.iterations).toBe(100000); // Development setting
    expect(result.parameters).toHaveProperty('digest');
  });

  it('should use correct security parameters for production', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.PRODUCTION
    });

    const params = service.getSecurityParameters();
    
    expect(params.memoryCost).toBe(65536); // 64 MB
    expect(params.timeCost).toBe(4);
    expect(params.parallelism).toBe(2);
  });

  it('should benchmark key derivation performance', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.PBKDF2, // Fastest for testing
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const benchmark = await service.benchmarkDerivation();
    
    expect(benchmark.timeMs).toBeGreaterThan(0);
    expect(benchmark.timeMs).toBeLessThan(5000); // Should complete within 5 seconds
    expect(benchmark.algorithm).toBe(KeyDerivationAlgorithm.PBKDF2);
    expect(benchmark.securityLevel).toBe(SecurityLevel.DEVELOPMENT);
  });

  it('should handle Unicode passwords correctly', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const unicodePassword = '密码🔒café';
    const result = await service.deriveKey(unicodePassword);
    
    expect(result.derivedKey).toBeInstanceOf(Buffer);
    expect(result.derivedKey).toHaveLength(32);
    
    // Should be able to verify the same password
    const hexResult = await service.deriveKeyHex(unicodePassword, result.salt);
    const isValid = await service.verifyKey(unicodePassword, hexResult.metadata, hexResult.key);
    expect(isValid).toBe(true);
  });

  it('should integrate with encryption system', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    // Derive a key
    const masterPassword = 'user-master-password';
    const derivedResult = await service.deriveKeyHex(masterPassword);
    
    // The derived key should be suitable for AES-256
    expect(derivedResult.key).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(derivedResult.metadata.algorithm).toBe(KeyDerivationAlgorithm.ARGON2ID);
    
    // Should be able to reproduce the same key
    const reproduced = await service.deriveKeyHex(
      masterPassword,
      Buffer.from(derivedResult.metadata.salt, 'hex'),
      derivedResult.metadata.parameters
    );
    
    expect(reproduced.key).toBe(derivedResult.key);
  });
});
