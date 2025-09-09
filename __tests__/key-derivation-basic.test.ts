/**
 * Basic Key Derivation Test
 * 
 * Simple test to verify key derivation functionality works
 */

import { describe, it, expect } from 'vitest';
import {
  KeyDerivationService,
  KeyDerivationAlgorithm,
  SecurityLevel
} from '@/lib/security/key-derivation-service';

describe('Basic Key Derivation', () => {
  it('should create service and derive key', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.PBKDF2, // Use PBKDF2 for simplicity
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const result = await service.deriveKey('test-password');
    
    expect(result.derivedKey).toHaveLength(32); // 32 bytes
    expect(result.salt).toHaveLength(32);       // 32 bytes
    expect(result.algorithm).toBe(KeyDerivationAlgorithm.PBKDF2);
    expect(result.parameters).toBeDefined();
    expect(result.derivedAt).toBeDefined();
  });

  it('should produce different keys with different salts', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.PBKDF2,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const result1 = await service.deriveKey('same-password');
    const result2 = await service.deriveKey('same-password');

    expect(result1.derivedKey.toString('hex')).not.toBe(result2.derivedKey.toString('hex'));
    expect(result1.salt.toString('hex')).not.toBe(result2.salt.toString('hex'));
  });

  it('should verify derived keys correctly', async () => {
    const service = new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.PBKDF2,
      securityLevel: SecurityLevel.DEVELOPMENT
    });

    const password = 'test-password-123';
    const result = await service.deriveKeyHex(password);
    
    const isValid = await service.verifyKey(password, result.metadata, result.key);
    expect(isValid).toBe(true);
    
    const isInvalid = await service.verifyKey('wrong-password', result.metadata, result.key);
    expect(isInvalid).toBe(false);
  });
});
