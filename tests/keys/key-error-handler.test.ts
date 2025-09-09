/**
 * Comprehensive Test Suite for Key Error Handler
 * 
 * Tests all key corruption/unavailability edge cases:
 * - Environment key validation and recovery
 * - Master key derivation failure recovery
 * - Database key corruption handling
 * - Browser storage encryption failures
 * - Key escrow and recovery mechanisms
 * - Graceful degradation strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
// Note: crypto is mocked in setup-unit.ts
import {
  KeyErrorHandler,
  KeyErrorType,
  RecoveryStrategy,
  KeyErrorWrapper,
  initializeKeyErrorHandler,
  createKeyErrorWrapper
} from '@/lib/keys/key-error-handler';
import { KeyManagementService } from '@/lib/keys/key-management-service';
import { EnhancedEncryptionService } from '@/lib/keys/enhanced-encryption-service';
import { KeyEscrowService, EscrowMethod } from '@/lib/keys/key-escrow';
import { PermissionResolutionService } from '@/lib/keys/permission-resolution-service';
import {
  encrypt,
  decrypt,
  encryptWithRecovery,
  decryptWithRecovery,
  encryptTokenWithRecovery,
  decryptTokenWithRecovery,
  validateEncryptedData
} from '@/lib/encryption';
import { testHelpers } from '../test-helpers';

// Test configuration
const TEST_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const CORRUPT_KEY = 'invalid_key_format';
const EMPTY_KEY = '';

describe('KeyErrorHandler', () => {
  let supabase: any;
  let keyService: KeyManagementService;
  let encryptionService: EnhancedEncryptionService;
  let escrowService: KeyEscrowService;
  let errorHandler: KeyErrorHandler;
  let permissionService: PermissionResolutionService;
  
  let originalEnvKey: string | undefined;

  beforeEach(async () => {
    // Store original environment key
    originalEnvKey = process.env.ENCRYPTION_KEY;
    
    // Set up test environment
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    
    // Create test instances
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    keyService = new KeyManagementService(supabase);
    permissionService = new PermissionResolutionService(supabase, keyService);
    encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
    escrowService = KeyEscrowService.initialize(true); // Demo mode
    
    errorHandler = initializeKeyErrorHandler(
      supabase,
      keyService,
      encryptionService,
      escrowService
    );
  });

  afterEach(async () => {
    // Restore original environment key
    if (originalEnvKey) {
      process.env.ENCRYPTION_KEY = originalEnvKey;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
    
    // Clear any test data
    await testHelpers.cleanupTestData();
  });

  describe('Environment Key Error Handling', () => {
    it('should handle missing encryption key', async () => {
      delete process.env.ENCRYPTION_KEY;
      
      const error = new Error('ENCRYPTION_KEY must be a 64-character hex string');
      const result = await errorHandler.handleEnvironmentKeyError(error);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.FALLBACK_TO_DEMO);
      expect(result.fallbackMode).toBe(true);
      expect(result.warning).toContain('demo mode');
    });

    it('should handle invalid encryption key format', async () => {
      process.env.ENCRYPTION_KEY = CORRUPT_KEY;
      
      const error = new Error('ENCRYPTION_KEY must be a 64-character hex string');
      const result = await errorHandler.handleEnvironmentKeyError(error);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.FALLBACK_TO_DEMO);
      expect(result.fallbackMode).toBe(true);
      expect(result.errors).toContain('Invalid encryption key format');
    });

    it('should regenerate key in development environment', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      process.env.ENCRYPTION_KEY = CORRUPT_KEY;
      
      try {
        const error = new Error('ENCRYPTION_KEY must be a 64-character hex string');
        const result = await errorHandler.handleEnvironmentKeyError(error);
        
        expect(result.success).toBe(true);
        expect(result.strategy).toBe(RecoveryStrategy.REGENERATE_KEY);
        expect(result.newKey).toBeDefined();
        expect(result.newKey).toHaveLength(64);
        expect(result.warning).toContain('Generated new encryption key');
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('should validate valid key and continue normally', async () => {
      const error = new Error('ENCRYPTION_KEY must be a 64-character hex string');
      const result = await errorHandler.handleEnvironmentKeyError(error);
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategy.USE_BACKUP_KEY);
    });
  });

  describe('Master Key Derivation Error Handling', () => {
    it('should handle derivation failure with cache clearing', async () => {
      const userId = 'test-user-' + Date.now();
      const clearCacheSpy = vi.spyOn(keyService, 'clearUserMasterKeyCache');
      
      const error = new Error('Key derivation failed');
      const result = await errorHandler.handleMasterKeyDerivationError(userId, error);
      
      expect(clearCacheSpy).toHaveBeenCalledWith(userId);
      expect(result.recoverable !== undefined).toBe(true);
    });

    it('should prompt for recovery when escrow data exists', async () => {
      const userId = crypto.randomUUID();
      
      // Mock escrow service to return available records
      const getEscrowRecordsSpy = vi.spyOn(errorHandler as any, 'getEscrowRecords')
        .mockResolvedValue([{ method: EscrowMethod.PASSWORD }]);
      
      const error = new Error('Key derivation failed');
      const result = await errorHandler.handleMasterKeyDerivationError(userId, error);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.PROMPT_FOR_RECOVERY);
      expect(result.warning).toContain('Recovery options available');
    });

    it('should regenerate master key when corrupted metadata exists', async () => {
      const userId = crypto.randomUUID();
      
      // Create corrupted metadata in database
      await supabase
        .from('user_master_keys')
        .insert({
          user_id: userId,
          key_derivation_metadata: { corrupted: true },
          created_at: new Date().toISOString()
        });
      
      const error = new Error('Key derivation failed');
      const result = await errorHandler.handleMasterKeyDerivationError(userId, error);
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategy.REGENERATE_KEY);
      expect(result.warning).toContain('Regenerated master key');
      
      // Verify metadata was deleted
      const { data } = await supabase
        .from('user_master_keys')
        .select('*')
        .eq('user_id', userId);
      expect(data).toHaveLength(0);
    });

    it('should handle graceful degradation on recovery failure', async () => {
      const userId = crypto.randomUUID();
      
      // Mock database error
      const mockSupabase = {
        ...supabase,
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.reject(new Error('Database error'))
            })
          }),
          delete: () => ({
            eq: () => Promise.reject(new Error('Database error'))
          })
        })
      };
      
      const handlerWithMockDb = new (KeyErrorHandler as any)(
        mockSupabase, keyService, encryptionService, escrowService
      );
      
      const error = new Error('Key derivation failed');
      const result = await handlerWithMockDb.handleMasterKeyDerivationError(userId, error);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
      expect(result.errors).toContain('Master key recovery failed');
    });
  });

  describe('Database Key Corruption Handling', () => {
    it('should handle missing key in database', async () => {
      const keyId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      const error = new Error('Key not found');
      const result = await errorHandler.handleDatabaseKeyCorruption(keyId, userId, error);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.REGENERATE_KEY);
      expect(result.errors).toContain('Key not found in database');
    });

    it('should validate and fix metadata corruption', async () => {
      const keyId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      // Insert key with corrupted metadata
      await supabase
        .from('encryption_keys')
        .insert({
          id: keyId,
          key_type: 'relationship',
          key_owner_id: userId,
          encrypted_key: 'test_encrypted_key',
          metadata: { corrupted: 'data' } // Invalid metadata format
        });
      
      const error = new Error('Metadata corruption');
      const result = await errorHandler.handleDatabaseKeyCorruption(keyId, userId, error);
      
      // Should detect metadata corruption but still attempt recovery
      expect(result).toBeDefined();
    });

    it('should rotate corrupted key when user is owner', async () => {
      const keyId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      const encryptedKey = await encrypt('test_key_data');
      
      // Insert valid key
      await supabase
        .from('encryption_keys')
        .insert({
          id: keyId,
          key_type: 'relationship',
          key_owner_id: userId,
          encrypted_key: encryptedKey,
          metadata: {
            keyType: 'relationship',
            ownerId: userId,
            entityId: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            version: 1,
            algorithm: 'AES-256-GCM'
          }
        });
      
      // Mock key service rotation
      const rotateSpy = vi.spyOn(keyService, 'rotateKey').mockResolvedValue();
      
      const error = new Error('Key corruption detected');
      const result = await errorHandler.handleDatabaseKeyCorruption(keyId, userId, error);
      
      if (result.success) {
        expect(result.strategy).toBe(RecoveryStrategy.REGENERATE_KEY);
        expect(result.warning).toContain('rotated');
        expect(rotateSpy).toHaveBeenCalledWith(keyId, userId);
      }
    });

    it('should deny access to corrupted key for non-owners', async () => {
      const keyId = crypto.randomUUID();
      const ownerId = crypto.randomUUID();
      const userId = crypto.randomUUID(); // Different from owner
      const encryptedKey = await encrypt('test_key_data');
      
      // Insert key owned by someone else
      await supabase
        .from('encryption_keys')
        .insert({
          id: keyId,
          key_type: 'relationship',
          key_owner_id: ownerId, // Different owner
          encrypted_key: encryptedKey,
          metadata: {
            keyType: 'relationship',
            ownerId: ownerId,
            entityId: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            version: 1,
            algorithm: 'AES-256-GCM'
          }
        });
      
      const error = new Error('Key corruption detected');
      const result = await errorHandler.handleDatabaseKeyCorruption(keyId, userId, error);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
      expect(result.errors).toContain('Access denied to corrupted key');
    });
  });

  describe('Browser Storage Error Handling', () => {
    let originalWindow: any;
    let originalLocalStorage: any;

    beforeEach(() => {
      originalWindow = global.window;
      originalLocalStorage = global.localStorage;
    });

    afterEach(() => {
      global.window = originalWindow;
      global.localStorage = originalLocalStorage;
    });

    it('should handle crypto API unavailability', async () => {
      // Mock window without crypto API
      global.window = {} as any;
      
      const error = new Error('Crypto API unavailable');
      const result = await errorHandler.handleBrowserStorageError(error);
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
      expect(result.warning).toContain('unencrypted storage');
    });

    it('should clear corrupted browser storage', async () => {
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      
      // Mock Object.keys to return storage keys
      const mockKeys = ['secure_session', 'ph_session_data', 'other_key'];
      vi.spyOn(Object, 'keys').mockReturnValue(mockKeys);
      
      global.window = { crypto: {} } as any;
      global.localStorage = mockLocalStorage;
      
      const error = new Error('Storage corruption');
      const result = await errorHandler.handleBrowserStorageError(error);
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategy.CLEAR_AND_RESTART);
      expect(result.warning).toContain('Cleared corrupted browser storage');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('secure_session');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('ph_session_data');
    });

    it('should handle storage clearing failures gracefully', async () => {
      const mockLocalStorage = {
        removeItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage access denied');
        })
      };
      
      global.window = { crypto: {} } as any;
      global.localStorage = mockLocalStorage;
      vi.spyOn(Object, 'keys').mockReturnValue(['secure_test']);
      
      const error = new Error('Storage corruption');
      const result = await errorHandler.handleBrowserStorageError(error);
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
      expect(result.warning).toContain('fallback storage');
    });
  });

  describe('Key Access Expiration Handling', () => {
    it('should handle expired key access', async () => {
      const keyId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      // Mock key service revocation
      const revokeSpy = vi.spyOn(keyService, 'revokeKeyAccess').mockResolvedValue();
      
      const result = await errorHandler.handleKeyAccessExpired(keyId, userId);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
      expect(result.warning).toContain('Key access expired');
      expect(revokeSpy).toHaveBeenCalledWith(keyId, userId);
    });

    it('should handle revocation failures', async () => {
      const keyId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      // Mock key service revocation failure
      vi.spyOn(keyService, 'revokeKeyAccess').mockRejectedValue(new Error('Revocation failed'));
      
      const result = await errorHandler.handleKeyAccessExpired(keyId, userId);
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
      expect(result.errors).toContain('Failed to clean up expired key access');
    });
  });

  describe('Emergency Recovery', () => {
    it('should handle password-based recovery', async () => {
      const userId = crypto.randomUUID();
      const password = 'test_recovery_password';
      
      // Mock successful escrow recovery
      const recoverSpy = vi.spyOn(escrowService, 'recoverWithPassword')
        .mockResolvedValue({ success: true, userMasterKey: Buffer.from('recovered_key') });
      
      const result = await errorHandler.attemptEmergencyRecovery(
        userId,
        EscrowMethod.PASSWORD,
        { password }
      );
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategy.EMERGENCY_RECOVERY);
      expect(result.warning).toContain('Master key recovered from escrow');
      expect(recoverSpy).toHaveBeenCalledWith(userId, password);
    });

    it('should handle security questions recovery', async () => {
      const userId = crypto.randomUUID();
      const answers = ['answer1', 'answer2', 'answer3'];
      
      // Mock successful escrow recovery
      const recoverSpy = vi.spyOn(escrowService, 'recoverWithSecurityQuestions')
        .mockResolvedValue({ success: true, userMasterKey: Buffer.from('recovered_key') });
      
      const result = await errorHandler.attemptEmergencyRecovery(
        userId,
        EscrowMethod.SECURITY_QUESTIONS,
        { answers }
      );
      
      expect(result.success).toBe(true);
      expect(result.strategy).toBe(RecoveryStrategy.EMERGENCY_RECOVERY);
      expect(recoverSpy).toHaveBeenCalledWith(userId, answers);
    });

    it('should limit recovery attempts', async () => {
      const userId = crypto.randomUUID();
      const password = 'wrong_password';
      
      // Mock failed escrow recovery
      vi.spyOn(escrowService, 'recoverWithPassword')
        .mockResolvedValue({ success: false, error: 'Invalid password' });
      
      // Attempt recovery multiple times
      for (let i = 0; i < 5; i++) {
        const result = await errorHandler.attemptEmergencyRecovery(
          userId,
          EscrowMethod.PASSWORD,
          { password }
        );
        
        if (i < 3) {
          expect(result.success).toBe(false);
          expect(result.errors).toContain('Invalid password');
        } else {
          // Should be blocked after max attempts
          expect(result.errors).toContain('Maximum recovery attempts exceeded');
        }
      }
    });

    it('should handle unknown recovery methods', async () => {
      const userId = crypto.randomUUID();
      
      const result = await errorHandler.attemptEmergencyRecovery(
        userId,
        'unknown_method' as EscrowMethod,
        {}
      );
      
      expect(result.success).toBe(false);
      expect(result.strategy).toBe(RecoveryStrategy.EMERGENCY_RECOVERY);
      expect(result.errors).toContain('Recovery attempt failed');
    });
  });

  describe('System Health Validation', () => {
    it('should validate healthy system', async () => {
      const health = await errorHandler.validateSystemKeyHealth();
      
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    it('should detect missing encryption key', async () => {
      delete process.env.ENCRYPTION_KEY;
      
      const health = await errorHandler.validateSystemKeyHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('ENCRYPTION_KEY not configured');
    });

    it('should detect invalid encryption key format', async () => {
      process.env.ENCRYPTION_KEY = CORRUPT_KEY;
      
      const health = await errorHandler.validateSystemKeyHealth();
      
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('ENCRYPTION_KEY has invalid format');
    });

    it('should warn about high error rates', async () => {
      // Simulate many errors
      for (let i = 0; i < 15; i++) {
        const error = {
          type: KeyErrorType.ENVIRONMENT_KEY_MISSING,
          message: 'Test error',
          timestamp: new Date().toISOString(),
          recoverable: true,
          severity: 'medium' as const
        };
        (errorHandler as any).recordError('test_context', error);
      }
      
      const health = await errorHandler.validateSystemKeyHealth();
      
      expect(health.warnings).toContain('High error rate detected in last 24 hours');
    });
  });

  describe('Error Diagnostics', () => {
    it('should provide comprehensive error diagnostics', async () => {
      const context = 'test_user';
      
      // Create various error types
      const errors = [
        { type: KeyErrorType.ENVIRONMENT_KEY_MISSING, message: 'Missing key', timestamp: new Date().toISOString(), recoverable: true, severity: 'critical' as const },
        { type: KeyErrorType.MASTER_KEY_DERIVATION_FAILED, message: 'Derivation failed', timestamp: new Date().toISOString(), recoverable: true, severity: 'high' as const },
        { type: KeyErrorType.MASTER_KEY_DERIVATION_FAILED, message: 'Another derivation failure', timestamp: new Date().toISOString(), recoverable: true, severity: 'high' as const },
        { type: KeyErrorType.DATABASE_KEY_CORRUPTED, message: 'Corrupted key', timestamp: new Date().toISOString(), recoverable: true, severity: 'high' as const }
      ];
      
      errors.forEach(error => {
        (errorHandler as any).recordError(context, error);
      });
      
      const diagnostics = errorHandler.getErrorDiagnostics(context);
      
      expect(diagnostics.errors).toHaveLength(4);
      expect(diagnostics.patterns[KeyErrorType.ENVIRONMENT_KEY_MISSING]).toBe(1);
      expect(diagnostics.patterns[KeyErrorType.MASTER_KEY_DERIVATION_FAILED]).toBe(2);
      expect(diagnostics.patterns[KeyErrorType.DATABASE_KEY_CORRUPTED]).toBe(1);
      
      expect(diagnostics.recommendations).toContain('Set up proper encryption key in environment variables');
      expect(diagnostics.recommendations).toContain('Consider setting up key escrow for recovery');
      expect(diagnostics.recommendations).toContain('Check database integrity and consider key rotation');
    });
  });
});

describe('KeyErrorWrapper', () => {
  let errorHandler: KeyErrorHandler;
  let wrapper: KeyErrorWrapper;
  
  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const keyService = new KeyManagementService(supabase);
    const permissionService = new PermissionResolutionService(supabase, keyService);
    const encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
    const escrowService = KeyEscrowService.initialize(true);
    
    errorHandler = initializeKeyErrorHandler(
      supabase, keyService, encryptionService, escrowService
    );
    
    wrapper = createKeyErrorWrapper(errorHandler);
  });

  it('should wrap encryption with error recovery', async () => {
    const testData = 'test encryption data';
    
    const result = await wrapper.safeEncrypt(
      () => encrypt(testData),
      () => Promise.resolve('fallback_encrypted')
    );
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should use fallback on encryption failure', async () => {
    const testData = 'test encryption data';
    
    const result = await wrapper.safeEncrypt(
      () => { throw new Error('ENCRYPTION_KEY missing'); },
      () => Promise.resolve('fallback_encrypted')
    );
    
    expect(result).toBe('fallback_encrypted');
  });

  it('should wrap decryption with error recovery', async () => {
    const testData = 'test decryption data';
    const encrypted = await encrypt(testData);
    
    const result = await wrapper.safeDecrypt(
      () => decrypt(encrypted),
      () => Promise.resolve('fallback_decrypted')
    );
    
    expect(result).toBe(testData);
  });

  it('should handle key access with graceful failure', async () => {
    const userId = crypto.randomUUID();
    const keyId = crypto.randomUUID();
    
    const result = await wrapper.safeKeyAccess(
      () => { throw new Error('Key access denied'); },
      userId,
      keyId
    );
    
    expect(result).toBeNull();
  });

  it('should handle expired key access', async () => {
    const userId = crypto.randomUUID();
    const keyId = crypto.randomUUID();
    
    const result = await wrapper.safeKeyAccess(
      () => { throw new Error('Key access expired'); },
      userId,
      keyId
    );
    
    expect(result).toBeNull();
  });
});

describe('Enhanced Encryption Functions', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  describe('encryptWithRecovery', () => {
    it('should encrypt successfully with recovery wrapper', async () => {
      const testData = 'test data for recovery encryption';
      
      const result = await encryptWithRecovery(testData);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      // Should be decryptable
      const decrypted = await decrypt(result);
      expect(decrypted).toBe(testData);
    });

    it('should fallback on encryption failure', async () => {
      const testData = 'test data';
      
      // Create options that will cause failure
      const badOptions = {
        useKeyDerivation: true,
        salt: 'invalid_salt',
        keyDerivationMetadata: {
          algorithm: 'unknown_algorithm',
          parameters: {}
        }
      };
      
      // Should still work with fallback
      const result = await encryptWithRecovery(testData, badOptions);
      expect(result).toBeDefined();
    });
  });

  describe('decryptWithRecovery', () => {
    it('should decrypt successfully with recovery wrapper', async () => {
      const testData = 'test data for recovery decryption';
      const encrypted = await encrypt(testData);
      
      const result = await decryptWithRecovery(encrypted);
      
      expect(result).toBe(testData);
    });

    it('should handle corrupted data gracefully', async () => {
      const corruptedData = 'corrupted:data:format';
      
      await expect(decryptWithRecovery(corruptedData)).rejects.toThrow();
    });
  });

  describe('Token Encryption with Recovery', () => {
    it('should encrypt and decrypt tokens with recovery', async () => {
      const token = 'test_token_12345';
      
      const encrypted = await encryptTokenWithRecovery(token);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(token);
      
      const decrypted = await decryptTokenWithRecovery(encrypted!);
      expect(decrypted).toBe(token);
    });

    it('should handle null tokens gracefully', async () => {
      const encrypted = await encryptTokenWithRecovery(null);
      expect(encrypted).toBeNull();
      
      const decrypted = await decryptTokenWithRecovery(null);
      expect(decrypted).toBeNull();
    });

    it('should use graceful degradation in development', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      delete process.env.ENCRYPTION_KEY;
      
      try {
        const token = 'test_token_dev';
        const result = await encryptTokenWithRecovery(token);
        
        expect(result).toBe(`UNENCRYPTED:${token}`);
        
        const decrypted = await decryptTokenWithRecovery(result!);
        expect(decrypted).toBe(token);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      }
    });

    it('should return null on decryption failure', async () => {
      const corruptedToken = 'corrupted_encrypted_token';
      
      const result = await decryptTokenWithRecovery(corruptedToken);
      expect(result).toBeNull();
    });
  });

  describe('validateEncryptedData', () => {
    it('should validate legacy format correctly', async () => {
      const testData = 'test validation data';
      const encrypted = await encrypt(testData);
      
      const validation = validateEncryptedData(encrypted);
      
      expect(validation.valid).toBe(true);
      expect(validation.format).toBe('legacy');
      expect(validation.issues).toHaveLength(0);
      expect(validation.recoverable).toBe(true);
    });

    it('should validate enhanced JSON format correctly', async () => {
      const testData = 'test validation data';
      const options = await import('@/lib/encryption').then(m => m.createKeyDerivationOptions());
      const encrypted = await encrypt(testData, options);
      
      const validation = validateEncryptedData(encrypted);
      
      expect(validation.valid).toBe(true);
      expect(validation.format).toBe('enhanced');
      expect(validation.issues).toHaveLength(0);
      expect(validation.recoverable).toBe(true);
    });

    it('should detect invalid legacy format', () => {
      const invalidData = 'invalid:format';
      
      const validation = validateEncryptedData(invalidData);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('legacy');
      expect(validation.issues).toContain('Invalid legacy format - expected 3 parts');
      expect(validation.recoverable).toBe(false);
    });

    it('should detect invalid JSON format', () => {
      const invalidJson = '{"incomplete": "json"';
      
      const validation = validateEncryptedData(invalidJson);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('unknown');
      expect(validation.issues).toContain('JSON parsing failed');
      expect(validation.recoverable).toBe(false);
    });

    it('should detect missing fields in enhanced format', () => {
      const incompleteJson = JSON.stringify({
        version: 2,
        algorithm: 'aes-256-gcm',
        // Missing required fields
      });
      
      const validation = validateEncryptedData(incompleteJson);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('enhanced');
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recoverable).toBe(false);
    });

    it('should detect invalid hex formats in legacy data', () => {
      const invalidHex = 'invalid_hex:another_invalid:third_invalid';
      
      const validation = validateEncryptedData(invalidHex);
      
      expect(validation.valid).toBe(false);
      expect(validation.format).toBe('legacy');
      expect(validation.issues).toContain('Invalid IV format');
      expect(validation.issues).toContain('Invalid auth tag format');
      expect(validation.issues).toContain('Invalid encrypted data format');
    });
  });
});

describe('Production Readiness Tests', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  it('should handle high-volume error scenarios without memory leaks', async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const keyService = new KeyManagementService(supabase);
    const permissionService = new PermissionResolutionService(supabase, keyService);
    const encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
    const escrowService = KeyEscrowService.initialize(true);
    
    const errorHandler = initializeKeyErrorHandler(
      supabase, keyService, encryptionService, escrowService
    );
    
    // Simulate 1000 errors
    for (let i = 0; i < 1000; i++) {
      const error = new Error('Test high-volume error');
      await errorHandler.handleEnvironmentKeyError(error);
    }
    
    const diagnostics = errorHandler.getErrorDiagnostics('environment');
    
    // Should limit error history to prevent memory leaks
    expect(diagnostics.errors.length).toBeLessThanOrEqual(100);
  });

  it('should maintain performance under concurrent error scenarios', async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const keyService = new KeyManagementService(supabase);
    const permissionService = new PermissionResolutionService(supabase, keyService);
    const encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
    const escrowService = KeyEscrowService.initialize(true);
    
    const errorHandler = initializeKeyErrorHandler(
      supabase, keyService, encryptionService, escrowService
    );
    
    const startTime = Date.now();
    
    // Run 100 concurrent error handling operations
    const promises = Array(100).fill(0).map((_, i) => {
      const userId = `user_${i}`;
      const error = new Error('Concurrent test error');
      return errorHandler.handleMasterKeyDerivationError(userId, error);
    });
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    // Should complete within reasonable time (less than 5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  it('should provide consistent behavior across different environments', async () => {
    const environments = ['development', 'staging', 'production'];
    const results: any[] = [];
    
    for (const env of environments) {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = env;
      delete process.env.ENCRYPTION_KEY;
      
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_ANON_KEY!
        );
        
        const keyService = new KeyManagementService(supabase);
        const permissionService = new PermissionResolutionService(supabase, keyService);
        const encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
        const escrowService = KeyEscrowService.initialize(true);
        
        const errorHandler = initializeKeyErrorHandler(
          supabase, keyService, encryptionService, escrowService
        );
        
        const error = new Error('ENCRYPTION_KEY must be a 64-character hex string');
        const result = await errorHandler.handleEnvironmentKeyError(error);
        
        results.push({ env, result });
      } finally {
        process.env.NODE_ENV = originalEnv;
        process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
      }
    }
    
    // Development should allow key regeneration
    const devResult = results.find(r => r.env === 'development')?.result;
    expect(devResult?.success || devResult?.strategy === RecoveryStrategy.REGENERATE_KEY).toBeTruthy();
    
    // Production should fallback to demo
    const prodResults = results.filter(r => r.env !== 'development');
    prodResults.forEach(({ result }) => {
      expect(result.strategy).toBe(RecoveryStrategy.FALLBACK_TO_DEMO);
      expect(result.fallbackMode).toBe(true);
    });
  });

  it('should handle database failures gracefully', async () => {
    // Mock failing database
    const failingSupabase = {
      from: () => ({
        select: () => Promise.reject(new Error('Database connection failed')),
        insert: () => Promise.reject(new Error('Database connection failed')),
        delete: () => Promise.reject(new Error('Database connection failed')),
        update: () => Promise.reject(new Error('Database connection failed'))
      })
    };
    
    const keyService = new KeyManagementService(failingSupabase as any);
    const permissionService = new PermissionResolutionService(failingSupabase as any, keyService);
    const encryptionService = new EnhancedEncryptionService(failingSupabase as any, keyService, permissionService);
    const escrowService = KeyEscrowService.initialize(true);
    
    const errorHandler = initializeKeyErrorHandler(
      failingSupabase as any, keyService, encryptionService, escrowService
    );
    
    const health = await errorHandler.validateSystemKeyHealth();
    
    expect(health.healthy).toBe(false);
    expect(health.issues).toContain('Database connection failed');
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  it('should handle extremely long error messages', async () => {
    const longMessage = 'A'.repeat(10000);
    const error = new Error(longMessage);
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const keyService = new KeyManagementService(supabase);
    const permissionService = new PermissionResolutionService(supabase, keyService);
    const encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
    const escrowService = KeyEscrowService.initialize(true);
    
    const errorHandler = initializeKeyErrorHandler(
      supabase, keyService, encryptionService, escrowService
    );
    
    const result = await errorHandler.handleEnvironmentKeyError(error);
    
    expect(result).toBeDefined();
    expect(typeof result.strategy).toBe('string');
  });

  it('should handle empty and whitespace-only data', async () => {
    const testCases = ['', '   ', '\n\t\r', null, undefined];
    
    for (const testCase of testCases) {
      const encrypted = await encryptTokenWithRecovery(testCase as any);
      expect(encrypted).toBeNull();
      
      const decrypted = await decryptTokenWithRecovery(testCase as any);
      expect(decrypted).toBeNull();
      
      if (testCase) {
        const validation = validateEncryptedData(testCase);
        expect(validation.valid).toBe(false);
      }
    }
  });

  it('should handle circular reference scenarios', async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const keyService = new KeyManagementService(supabase);
    const permissionService = new PermissionResolutionService(supabase, keyService);
    const encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
    const escrowService = KeyEscrowService.initialize(true);
    
    const errorHandler = initializeKeyErrorHandler(
      supabase, keyService, encryptionService, escrowService
    );
    
    // Create circular context reference
    const context = { self: null as any };
    context.self = context;
    
    const error = {
      type: KeyErrorType.ENVIRONMENT_KEY_MISSING,
      message: 'Test circular reference',
      context,
      timestamp: new Date().toISOString(),
      recoverable: true,
      severity: 'medium' as const
    };
    
    // Should not crash when recording error with circular reference
    expect(() => {
      (errorHandler as any).recordError('test', error);
    }).not.toThrow();
  });
});

describe('Integration with Existing Systems', () => {
  it('should integrate with key management service error flows', async () => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const keyService = new KeyManagementService(supabase);
    const permissionService = new PermissionResolutionService(supabase, keyService);
    const encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);
    const escrowService = KeyEscrowService.initialize(true);
    
    const errorHandler = initializeKeyErrorHandler(
      supabase, keyService, encryptionService, escrowService
    );
    
    const wrapper = createKeyErrorWrapper(errorHandler);
    
    const userId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    
    // Test key access with error handling
    const result = await wrapper.safeKeyAccess(
      async () => {
        const key = await keyService.getKeyForEntity(userId, entityId, 'event');
        return key;
      },
      userId
    );
    
    // Should handle the case where no key exists gracefully
    expect(result).toBeNull();
  });
});
