/**
 * Comprehensive Key Error Handler
 * 
 * Provides robust error handling for key corruption/unavailability edge cases:
 * - Environment key validation and recovery
 * - Master key derivation failure recovery
 * - Database key corruption handling
 * - Browser storage encryption failures
 * - Key escrow and recovery mechanisms
 * - Graceful degradation strategies
 */

import * as crypto from 'crypto';
import { z } from 'zod';
import { SupabaseClient } from '@supabase/supabase-js';
import { KeyManagementService, KeyType, AccessReason } from './key-management-service';
import { EnhancedEncryptionService } from './enhanced-encryption-service';
import { KeyEscrowService, EscrowMethod, RecoveryResult } from './key-escrow';
import { getKeyDerivationService } from '../security/key-derivation-service';
import { SecretsManager } from '../config/secrets-manager';

// Error types for key-related failures
export enum KeyErrorType {
  ENVIRONMENT_KEY_MISSING = 'environment_key_missing',
  ENVIRONMENT_KEY_INVALID = 'environment_key_invalid',
  MASTER_KEY_DERIVATION_FAILED = 'master_key_derivation_failed',
  MASTER_KEY_CACHE_CORRUPTED = 'master_key_cache_corrupted',
  DATABASE_KEY_CORRUPTED = 'database_key_corrupted',
  DATABASE_KEY_ACCESS_DENIED = 'database_key_access_denied',
  BROWSER_STORAGE_CORRUPTED = 'browser_storage_corrupted',
  BROWSER_CRYPTO_UNAVAILABLE = 'browser_crypto_unavailable',
  KEY_DERIVATION_SERVICE_FAILED = 'key_derivation_service_failed',
  ENCRYPTION_SERVICE_FAILED = 'encryption_service_failed',
  ESCROW_DATA_CORRUPTED = 'escrow_data_corrupted',
  RECOVERY_METHOD_FAILED = 'recovery_method_failed',
  KEY_ROTATION_FAILED = 'key_rotation_failed',
  KEY_ACCESS_EXPIRED = 'key_access_expired',
  METADATA_CORRUPTION = 'metadata_corruption',
  SALT_CORRUPTION = 'salt_corruption'
}

// Recovery strategy options
export enum RecoveryStrategy {
  REGENERATE_KEY = 'regenerate_key',
  USE_BACKUP_KEY = 'use_backup_key',
  FALLBACK_TO_DEMO = 'fallback_to_demo',
  PROMPT_FOR_RECOVERY = 'prompt_for_recovery',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  EMERGENCY_RECOVERY = 'emergency_recovery',
  CLEAR_AND_RESTART = 'clear_and_restart'
}

// Key error details
export interface KeyError {
  type: KeyErrorType;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  recoveryStrategy?: RecoveryStrategy;
  recoverable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Recovery operation result
export interface KeyRecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  newKey?: string;
  fallbackMode?: boolean;
  errors?: string[];
  warning?: string;
}

// Validation schemas
const encryptionKeySchema = z.string().length(64).regex(/^[0-9a-f]+$/i);
const keyMetadataSchema = z.object({
  keyType: z.string(),
  ownerId: z.string().uuid(),
  entityId: z.string().uuid(),
  createdAt: z.string(),
  version: z.number(),
  algorithm: z.string()
});

/**
 * Comprehensive Key Error Handler Service
 */
export class KeyErrorHandler {
  private static instance: KeyErrorHandler;
  private supabase: SupabaseClient;
  private keyService: KeyManagementService;
  private encryptionService: EnhancedEncryptionService;
  private escrowService: KeyEscrowService;
  private secrets: SecretsManager;
  private errorHistory: Map<string, KeyError[]> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly ERROR_HISTORY_LIMIT = 100;

  private constructor(
    supabase: SupabaseClient,
    keyService: KeyManagementService,
    encryptionService: EnhancedEncryptionService,
    escrowService: KeyEscrowService
  ) {
    this.supabase = supabase;
    this.keyService = keyService;
    this.encryptionService = encryptionService;
    this.escrowService = escrowService;
    this.secrets = SecretsManager.getInstance();
  }

  static initialize(
    supabase: SupabaseClient,
    keyService: KeyManagementService,
    encryptionService: EnhancedEncryptionService,
    escrowService: KeyEscrowService
  ): KeyErrorHandler {
    if (!KeyErrorHandler.instance) {
      KeyErrorHandler.instance = new KeyErrorHandler(
        supabase, keyService, encryptionService, escrowService
      );
    }
    return KeyErrorHandler.instance;
  }

  static getInstance(): KeyErrorHandler {
    if (!KeyErrorHandler.instance) {
      throw new Error('KeyErrorHandler not initialized. Call initialize() first.');
    }
    return KeyErrorHandler.instance;
  }

  /**
   * Handles environment key validation and recovery
   */
  async handleEnvironmentKeyError(error: Error): Promise<KeyRecoveryResult> {
    const keyError: KeyError = {
      type: KeyErrorType.ENVIRONMENT_KEY_MISSING,
      message: error.message,
      timestamp: new Date().toISOString(),
      recoverable: true,
      severity: 'critical'
    };

    try {
      // Try to get key from secrets manager
      const encryptionKey = this.secrets.getSecret('ENCRYPTION_KEY');
      
      if (!encryptionKey) {
        keyError.type = KeyErrorType.ENVIRONMENT_KEY_MISSING;
        keyError.recoveryStrategy = RecoveryStrategy.FALLBACK_TO_DEMO;
        this.recordError('environment', keyError);
        
        return {
          success: false,
          strategy: RecoveryStrategy.FALLBACK_TO_DEMO,
          fallbackMode: true,
          warning: 'Using demo mode due to missing encryption key'
        };
      }

      // Validate key format
      const validation = encryptionKeySchema.safeParse(encryptionKey);
      if (!validation.success) {
        keyError.type = KeyErrorType.ENVIRONMENT_KEY_INVALID;
        keyError.recoveryStrategy = RecoveryStrategy.REGENERATE_KEY;
        keyError.context = { validationErrors: validation.error.errors };
        this.recordError('environment', keyError);

        // Try to generate new key in development
        if (process.env.NODE_ENV === 'development') {
          const newKey = crypto.randomBytes(32).toString('hex');
          process.env.ENCRYPTION_KEY = newKey;
          
          return {
            success: true,
            strategy: RecoveryStrategy.REGENERATE_KEY,
            newKey,
            warning: 'Generated new encryption key for development'
          };
        }

        return {
          success: false,
          strategy: RecoveryStrategy.FALLBACK_TO_DEMO,
          fallbackMode: true,
          errors: ['Invalid encryption key format']
        };
      }

      // Key is valid, continue normally
      return {
        success: true,
        strategy: RecoveryStrategy.USE_BACKUP_KEY
      };

    } catch (recoveryError) {
      keyError.context = { recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) };
      this.recordError('environment', keyError);
      
      return {
        success: false,
        strategy: RecoveryStrategy.FALLBACK_TO_DEMO,
        fallbackMode: true,
        errors: ['Key recovery failed']
      };
    }
  }

  /**
   * Handles master key derivation failures
   */
  async handleMasterKeyDerivationError(
    userId: string,
    error: Error
  ): Promise<KeyRecoveryResult> {
    const keyError: KeyError = {
      type: KeyErrorType.MASTER_KEY_DERIVATION_FAILED,
      message: error.message,
      context: { userId },
      timestamp: new Date().toISOString(),
      recoverable: true,
      severity: 'high'
    };

    try {
      // Clear corrupted cache first
      this.keyService.clearUserMasterKeyCache(userId);
      
      // Check if we have escrow data for recovery
      const escrowRecords = await this.getEscrowRecords(userId);
      if (escrowRecords.length > 0) {
        keyError.recoveryStrategy = RecoveryStrategy.PROMPT_FOR_RECOVERY;
        this.recordError(userId, keyError);
        
        return {
          success: false,
          strategy: RecoveryStrategy.PROMPT_FOR_RECOVERY,
          warning: 'Master key derivation failed. Recovery options available.'
        };
      }

      // Try to regenerate master key metadata
      const { data: existingData } = await this.supabase
        .from('user_master_keys')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingData) {
        // Delete corrupted metadata and force regeneration
        await this.supabase
          .from('user_master_keys')
          .delete()
          .eq('user_id', userId);
          
        keyError.recoveryStrategy = RecoveryStrategy.REGENERATE_KEY;
        this.recordError(userId, keyError);
        
        return {
          success: true,
          strategy: RecoveryStrategy.REGENERATE_KEY,
          warning: 'Regenerated master key due to derivation failure'
        };
      }

      // No existing data, safe to continue with new key generation
      return {
        success: true,
        strategy: RecoveryStrategy.REGENERATE_KEY
      };

    } catch (recoveryError) {
      keyError.context = { ...keyError.context, recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) };
      keyError.recoveryStrategy = RecoveryStrategy.GRACEFUL_DEGRADATION;
      this.recordError(userId, keyError);
      
      return {
        success: false,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        errors: ['Master key recovery failed']
      };
    }
  }

  /**
   * Handles database key corruption
   */
  async handleDatabaseKeyCorruption(
    keyId: string,
    userId: string,
    error: Error
  ): Promise<KeyRecoveryResult> {
    const keyError: KeyError = {
      type: KeyErrorType.DATABASE_KEY_CORRUPTED,
      message: error.message,
      context: { keyId, userId },
      timestamp: new Date().toISOString(),
      recoverable: true,
      severity: 'high'
    };

    try {
      // Get key information
      const { data: keyRecord } = await this.supabase
        .from('encryption_keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (!keyRecord) {
        keyError.type = KeyErrorType.DATABASE_KEY_ACCESS_DENIED;
        keyError.recoveryStrategy = RecoveryStrategy.REGENERATE_KEY;
        this.recordError(userId, keyError);
        
        return {
          success: false,
          strategy: RecoveryStrategy.REGENERATE_KEY,
          errors: ['Key not found in database']
        };
      }

      // Validate metadata
      const metadataValidation = keyMetadataSchema.safeParse(keyRecord.metadata);
      if (!metadataValidation.success) {
        keyError.type = KeyErrorType.METADATA_CORRUPTION;
        keyError.context = { 
          ...keyError.context, 
          validationErrors: metadataValidation.error.errors 
        };
      }

      // Try to decrypt the key to check for corruption
      try {
        const masterKey = await this.getUserMasterKeyWithFallback(userId);
        if (masterKey) {
          await this.decryptKeyWithMaster(keyRecord.encrypted_key, masterKey);
        }
      } catch (decryptionError) {
        // Key is definitely corrupted, need to rotate
        keyError.recoveryStrategy = RecoveryStrategy.REGENERATE_KEY;
        this.recordError(userId, keyError);
        
        // If user is owner, rotate the key
        if (keyRecord.key_owner_id === userId) {
          try {
            await this.keyService.rotateKey(keyId, userId);
            return {
              success: true,
              strategy: RecoveryStrategy.REGENERATE_KEY,
              warning: 'Key was corrupted and has been rotated'
            };
          } catch (rotationError) {
            keyError.type = KeyErrorType.KEY_ROTATION_FAILED;
            keyError.context = { ...keyError.context, rotationError: rotationError instanceof Error ? rotationError.message : String(rotationError) };
            this.recordError(userId, keyError);
            
            return {
              success: false,
              strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
              errors: ['Key corruption detected but rotation failed']
            };
          }
        }
        
        // User is not owner, cannot recover this key
        return {
          success: false,
          strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
          errors: ['Access denied to corrupted key']
        };
      }

      // Key appears to be valid
      return {
        success: true,
        strategy: RecoveryStrategy.USE_BACKUP_KEY
      };

    } catch (recoveryError) {
      keyError.context = { ...keyError.context, recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) };
      this.recordError(userId, keyError);
      
      return {
        success: false,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        errors: ['Database key recovery failed']
      };
    }
  }

  /**
   * Handles browser storage encryption failures
   */
  async handleBrowserStorageError(error: Error): Promise<KeyRecoveryResult> {
    const keyError: KeyError = {
      type: KeyErrorType.BROWSER_STORAGE_CORRUPTED,
      message: error.message,
      timestamp: new Date().toISOString(),
      recoverable: true,
      severity: 'medium'
    };

    try {
      // Check if Web Crypto API is available
      if (typeof window !== 'undefined' && !('crypto' in window)) {
        keyError.type = KeyErrorType.BROWSER_CRYPTO_UNAVAILABLE;
        keyError.recoveryStrategy = RecoveryStrategy.GRACEFUL_DEGRADATION;
        this.recordError('browser', keyError);
        
        return {
          success: true,
          strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
          warning: 'Using unencrypted storage due to crypto API unavailability'
        };
      }

      // Clear corrupted browser storage
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('secure_') || key.includes('ph_session')) {
            try {
              localStorage.removeItem(key);
            } catch (removeError) {
              console.warn(`Failed to remove corrupted storage key: ${key}`, removeError);
            }
          }
        });
      }

      keyError.recoveryStrategy = RecoveryStrategy.CLEAR_AND_RESTART;
      this.recordError('browser', keyError);

      return {
        success: true,
        strategy: RecoveryStrategy.CLEAR_AND_RESTART,
        warning: 'Cleared corrupted browser storage'
      };

    } catch (recoveryError) {
      keyError.context = { recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError) };
      keyError.recoveryStrategy = RecoveryStrategy.GRACEFUL_DEGRADATION;
      this.recordError('browser', keyError);
      
      return {
        success: true,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        warning: 'Using fallback storage due to recovery failure'
      };
    }
  }

  /**
   * Handles key access expiration
   */
  async handleKeyAccessExpired(
    keyId: string,
    userId: string
  ): Promise<KeyRecoveryResult> {
    const keyError: KeyError = {
      type: KeyErrorType.KEY_ACCESS_EXPIRED,
      message: 'Key access has expired',
      context: { keyId, userId },
      timestamp: new Date().toISOString(),
      recoverable: false,
      severity: 'medium'
    };

    try {
      // Remove expired access
      await this.keyService.revokeKeyAccess(keyId, userId);
      
      keyError.recoveryStrategy = RecoveryStrategy.GRACEFUL_DEGRADATION;
      this.recordError(userId, keyError);
      
      return {
        success: false,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        warning: 'Key access expired. Contact key owner for renewed access.'
      };

    } catch (error) {
      keyError.context = { ...keyError.context, cleanupError: error instanceof Error ? error.message : String(error) };
      this.recordError(userId, keyError);
      
      return {
        success: false,
        strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
        errors: ['Failed to clean up expired key access']
      };
    }
  }

  /**
   * Attempts emergency key recovery using escrow
   */
  async attemptEmergencyRecovery(
    userId: string,
    recoveryMethod: EscrowMethod,
    recoveryData: any
  ): Promise<KeyRecoveryResult> {
    const attemptKey = `${userId}:${recoveryMethod}`;
    const currentAttempts = this.recoveryAttempts.get(attemptKey) || 0;
    
    if (currentAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
      return {
        success: false,
        strategy: RecoveryStrategy.EMERGENCY_RECOVERY,
        errors: ['Maximum recovery attempts exceeded']
      };
    }

    this.recoveryAttempts.set(attemptKey, currentAttempts + 1);

    try {
      let recoveryResult: RecoveryResult;
      
      switch (recoveryMethod) {
        case EscrowMethod.PASSWORD:
          recoveryResult = await this.escrowService.recoverWithPassword(
            userId,
            recoveryData.password
          );
          break;
          
        case EscrowMethod.SECURITY_QUESTIONS:
          recoveryResult = await this.escrowService.recoverWithSecurityQuestions(
            userId,
            recoveryData.answers
          );
          break;
          
        case EscrowMethod.BACKUP_CODES:
          recoveryResult = await this.escrowService.recoverWithBackupCode(
            userId,
            recoveryData.code
          );
          break;
          
        case EscrowMethod.SOCIAL_RECOVERY:
          // Social recovery not yet implemented in escrow service
          throw new Error('Social recovery method not yet implemented');
          break;
          
        default:
          throw new Error(`Unknown recovery method: ${recoveryMethod}`);
      }

      if (recoveryResult.success) {
        // Reset attempt counter on success
        this.recoveryAttempts.delete(attemptKey);
        
        return {
          success: true,
          strategy: RecoveryStrategy.EMERGENCY_RECOVERY,
          warning: 'Master key recovered from escrow'
        };
      }

      return {
        success: false,
        strategy: RecoveryStrategy.EMERGENCY_RECOVERY,
        errors: [recoveryResult.error || 'Recovery failed'],
        warning: `${recoveryResult.remainingAttempts || 0} attempts remaining`
      };

    } catch (error) {
      const keyError: KeyError = {
        type: KeyErrorType.RECOVERY_METHOD_FAILED,
        message: error instanceof Error ? error.message : String(error),
        context: { userId, recoveryMethod, attempts: currentAttempts + 1 },
        timestamp: new Date().toISOString(),
        recoverable: true,
        severity: 'high'
      };
      
      this.recordError(userId, keyError);
      
      return {
        success: false,
        strategy: RecoveryStrategy.EMERGENCY_RECOVERY,
        errors: ['Recovery attempt failed'],
        warning: `${this.MAX_RECOVERY_ATTEMPTS - currentAttempts - 1} attempts remaining`
      };
    }
  }

  /**
   * Gets comprehensive error diagnostics for a user or context
   */
  getErrorDiagnostics(context: string): {
    errors: KeyError[];
    patterns: Record<string, number>;
    recommendations: string[];
  } {
    const errors = this.errorHistory.get(context) || [];
    const patterns: Record<string, number> = {};
    
    errors.forEach(error => {
      patterns[error.type] = (patterns[error.type] || 0) + 1;
    });

    const recommendations: string[] = [];
    
    // Analyze patterns and provide recommendations
    if (patterns[KeyErrorType.ENVIRONMENT_KEY_MISSING] > 0) {
      recommendations.push('Set up proper encryption key in environment variables');
    }
    
    if (patterns[KeyErrorType.MASTER_KEY_DERIVATION_FAILED] > 1) {
      recommendations.push('Consider setting up key escrow for recovery');
    }
    
    if (patterns[KeyErrorType.DATABASE_KEY_CORRUPTED] > 0) {
      recommendations.push('Check database integrity and consider key rotation');
    }
    
    if (patterns[KeyErrorType.BROWSER_STORAGE_CORRUPTED] > 1) {
      recommendations.push('Clear browser storage or disable secure storage');
    }

    return { errors, patterns, recommendations };
  }

  /**
   * Validates system key health
   */
  async validateSystemKeyHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check environment key
      const encryptionKey = this.secrets.getSecret('ENCRYPTION_KEY');
      if (!encryptionKey) {
        issues.push('ENCRYPTION_KEY not configured');
      } else {
        const validation = encryptionKeySchema.safeParse(encryptionKey);
        if (!validation.success) {
          issues.push('ENCRYPTION_KEY has invalid format');
        }
      }

      // Check key derivation service
      try {
        const keyDerivationService = getKeyDerivationService();
        await keyDerivationService.deriveKeyHex('test', Buffer.from('salt'), { iterations: 1 });
      } catch (error) {
        issues.push('Key derivation service unavailable');
      }

      // Check database connectivity
      try {
        await this.supabase.from('encryption_keys').select('count').limit(1);
      } catch (error) {
        issues.push('Database connection failed');
      }

      // Check for frequent errors
      const allErrors = Array.from(this.errorHistory.values()).flat();
      const recentErrors = allErrors.filter(
        error => Date.now() - new Date(error.timestamp).getTime() < 24 * 60 * 60 * 1000
      );
      
      if (recentErrors.length > 10) {
        warnings.push('High error rate detected in last 24 hours');
      }

      return {
        healthy: issues.length === 0,
        issues,
        warnings
      };

    } catch (error) {
      return {
        healthy: false,
        issues: ['Health check failed'],
        warnings: []
      };
    }
  }

  // Helper methods

  private recordError(context: string, error: KeyError): void {
    const contextErrors = this.errorHistory.get(context) || [];
    contextErrors.push(error);
    
    // Limit error history size
    if (contextErrors.length > this.ERROR_HISTORY_LIMIT) {
      contextErrors.splice(0, contextErrors.length - this.ERROR_HISTORY_LIMIT);
    }
    
    this.errorHistory.set(context, contextErrors);
    
    // Log critical errors immediately
    if (error.severity === 'critical') {
      console.error('[KEY_ERROR_HANDLER] Critical error:', error);
    }
  }

  private async getUserMasterKeyWithFallback(userId: string): Promise<string | null> {
    try {
      // This would normally call the key service, but we need to handle failures
      const masterKey = await (this.keyService as any).getUserMasterKey(userId);
      return masterKey;
    } catch (error) {
      console.warn(`Failed to get master key for user ${userId}:`, error);
      return null;
    }
  }

  private async decryptKeyWithMaster(encryptedKey: string, masterKey: string): Promise<string> {
    // This would normally use the key service's private method
    const originalKey = process.env.ENCRYPTION_KEY;
    try {
      process.env.ENCRYPTION_KEY = masterKey;
      const { decryptSync } = await import('../encryption');
      return decryptSync(encryptedKey);
    } finally {
      if (originalKey) {
        process.env.ENCRYPTION_KEY = originalKey;
      }
    }
  }

  private async getEscrowRecords(userId: string): Promise<any[]> {
    try {
      // This would query the escrow service for available recovery options
      return []; // Placeholder - would return actual escrow records
    } catch (error) {
      console.warn(`Failed to get escrow records for user ${userId}:`, error);
      return [];
    }
  }
}

/**
 * Convenience wrapper for common key error scenarios
 */
export class KeyErrorWrapper {
  private errorHandler: KeyErrorHandler;

  constructor(errorHandler: KeyErrorHandler) {
    this.errorHandler = errorHandler;
  }

  /**
   * Wraps encryption operations with error handling
   */
  async safeEncrypt(
    operation: () => Promise<string>,
    fallback?: () => Promise<string>
  ): Promise<string> {
    try {
      return await operation();
    } catch (error) {
      console.warn('[KEY_ERROR_WRAPPER] Encryption failed, attempting recovery:', error);
      
      if (error instanceof Error && error.message.includes('ENCRYPTION_KEY')) {
        const recovery = await this.errorHandler.handleEnvironmentKeyError(error);
        if (recovery.success && !recovery.fallbackMode) {
          return await operation();
        }
      }
      
      if (fallback) {
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Wraps decryption operations with error handling
   */
  async safeDecrypt(
    operation: () => Promise<string>,
    fallback?: () => Promise<string>
  ): Promise<string> {
    try {
      return await operation();
    } catch (error) {
      console.warn('[KEY_ERROR_WRAPPER] Decryption failed, attempting recovery:', error);
      
      if (error instanceof Error && (error.message.includes('Decryption failed') || error.message.includes('Invalid'))) {
        // Could be corruption, try fallback
        if (fallback) {
          return await fallback();
        }
      }
      
      throw error;
    }
  }

  /**
   * Wraps key access operations with error handling
   */
  async safeKeyAccess<T>(
    operation: () => Promise<T>,
    userId: string,
    keyId?: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.warn('[KEY_ERROR_WRAPPER] Key access failed:', error);
      
      if (keyId && error instanceof Error && error.message.includes('expired')) {
        await this.errorHandler.handleKeyAccessExpired(keyId, userId);
      }
      
      return null;
    }
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: KeyErrorHandler | null = null;

export function initializeKeyErrorHandler(
  supabase: SupabaseClient,
  keyService: KeyManagementService,
  encryptionService: EnhancedEncryptionService,
  escrowService: KeyEscrowService
): KeyErrorHandler {
  globalErrorHandler = KeyErrorHandler.initialize(
    supabase, keyService, encryptionService, escrowService
  );
  return globalErrorHandler;
}

export function getKeyErrorHandler(): KeyErrorHandler {
  if (!globalErrorHandler) {
    throw new Error('KeyErrorHandler not initialized. Call initializeKeyErrorHandler() first.');
  }
  return globalErrorHandler;
}

export function createKeyErrorWrapper(errorHandler?: KeyErrorHandler): KeyErrorWrapper {
  const handler = errorHandler || getKeyErrorHandler();
  return new KeyErrorWrapper(handler);
}
