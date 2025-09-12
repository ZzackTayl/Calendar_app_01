/**
 * Core Key Derivation Utilities
 * 
 * Implements HKDF-based hierarchical key derivation for the key escrow system.
 * Integrates with the existing 4-level privacy system and supports both
 * production and demo modes.
 */

import * as crypto from 'crypto';
import { ConnectionTier, PrivacyOverride } from '@/lib/supabase/types';

// Key derivation constants
const HKDF_HASH_ALGORITHM = 'sha256';
const KEY_LENGTH = 32; // 256 bits for AES-256
const SALT_LENGTH = 32;
const INFO_MAX_LENGTH = 255;

// Domain identifiers for key derivation
export enum KeyDomain {
  PERSONAL = 'personal',
  RELATIONSHIP = 'relationship', 
  VISIBLE = 'visible',
  PUBLIC = 'public'
}

// Entity types for key derivation
export enum EntityType {
  EVENT = 'event',
  USER = 'user',
  RELATIONSHIP = 'relationship',
  GROUP = 'group'
}

// Field types for key derivation
export enum FieldType {
  DESCRIPTION = 'description',
  LOCATION = 'location',
  NOTES = 'notes',
  CONTACT = 'contact',
  PERSONAL_DETAILS = 'personal_details',
  PHONE = 'phone'
}

// Key metadata structure
export interface KeyMetadata {
  keyId: string;
  domain: KeyDomain;
  entityType: EntityType;
  entityId: string;
  fieldType?: FieldType;
  derivedAt: string;
  expiresAt?: string;
  version: number;
}

// Key derivation context
export interface DerivationContext {
  userId: string;
  domain: KeyDomain;
  entityType: EntityType;
  entityId: string;
  fieldType?: FieldType;
  timestamp?: string;
  version?: number;
}

// Master key configuration
export interface MasterKeyConfig {
  applicationMasterKey: string;
  recoveryMasterKey: string;
  demoMasterKey?: string;
  keyRotationInterval: number; // in seconds
}

/**
 * Core key derivation class implementing HKDF-based hierarchical key generation
 */
export class KeyDerivation {
  private static instance: KeyDerivation;
  private masterKeyConfig: MasterKeyConfig;
  private keyCache: Map<string, { key: Buffer; expiresAt: number; metadata: KeyMetadata }> = new Map();
  private isDemoMode: boolean;

  private constructor(config: MasterKeyConfig, isDemoMode = false) {
    this.masterKeyConfig = config;
    this.isDemoMode = isDemoMode;
  }

  /**
   * Initialize the key derivation system
   */
  static initialize(config: MasterKeyConfig, isDemoMode = false): KeyDerivation {
    if (!KeyDerivation.instance) {
      KeyDerivation.instance = new KeyDerivation(config, isDemoMode);
    }
    return KeyDerivation.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): KeyDerivation {
    if (!KeyDerivation.instance) {
      throw new Error('KeyDerivation not initialized. Call initialize() first.');
    }
    return KeyDerivation.instance;
  }

  /**
   * Maps privacy levels to key domains
   */
  static privacyLevelToDomain(privacyLevel: string): KeyDomain {
    switch (privacyLevel) {
      case 'private':
        return KeyDomain.PERSONAL;
      case 'busy_only':
        return KeyDomain.RELATIONSHIP;
      case 'details':
        return KeyDomain.VISIBLE;
      default:
        return KeyDomain.PUBLIC;
    }
  }

  /**
   * Maps connection tiers to key domains
   */
  static connectionTierToDomain(tier: ConnectionTier): KeyDomain {
    switch (tier) {
      case 'private':
        return KeyDomain.PERSONAL;
      case 'busy_only':
        return KeyDomain.RELATIONSHIP;
      case 'details':
        return KeyDomain.VISIBLE;
      default:
        return KeyDomain.PUBLIC;
    }
  }

  /**
   * Derives a User Master Key (UMK) from the Application Master Key
   * CRITICAL: Ensures complete user isolation by using user-specific entropy
   */
  deriveUserMasterKey(userId: string): Buffer {
    const masterKey = this.isDemoMode ? 
      this.masterKeyConfig.demoMasterKey || this.masterKeyConfig.applicationMasterKey :
      this.masterKeyConfig.applicationMasterKey;
    
    // CRITICAL: Include userId in salt generation for user-specific entropy
    const salt = this.generateSalt('user_master_key', `user:${userId}:${crypto.randomBytes(16).toString('hex')}`);
    
    // CRITICAL: Include additional user-specific context in info parameter
    const userSpecificInfo = `UMK:${userId}:${crypto.createHash('sha256').update(userId + masterKey).digest('hex').substring(0, 16)}`;
    const info = this.buildInfo('USER_MASTER', userSpecificInfo);
    
    return this.hkdf(Buffer.from(masterKey, 'hex'), salt, info, KEY_LENGTH);
  }

  /**
   * Derives a domain key from a User Master Key
   */
  deriveDomainKey(userMasterKey: Buffer, userId: string, domain: KeyDomain): Buffer {
    const salt = this.generateSalt(`domain_${domain}`);
    const info = this.buildInfo('DOMAIN', `${userId}:${domain}`);
    
    return this.hkdf(userMasterKey, salt, info, KEY_LENGTH);
  }

  /**
   * Derives an entity key from a domain key
   */
  deriveEntityKey(
    domainKey: Buffer, 
    context: DerivationContext
  ): Buffer {
    const salt = this.generateSalt(`entity_${context.entityType}`);
    const info = this.buildInfo(
      'ENTITY', 
      `${context.entityId}:${context.entityType}:${context.domain}`
    );
    
    return this.hkdf(domainKey, salt, info, KEY_LENGTH);
  }

  /**
   * Derives a field key from an entity key
   */
  deriveFieldKey(
    entityKey: Buffer,
    context: DerivationContext
  ): Buffer {
    if (!context.fieldType) {
      throw new Error('Field type is required for field key derivation');
    }

    const salt = this.generateSalt(`field_${context.fieldType}`);
    const timestamp = context.timestamp || new Date().toISOString();
    const version = context.version || 1;
    
    const info = this.buildInfo(
      'FIELD',
      `${context.fieldType}:${context.entityId}:${timestamp}:v${version}`
    );
    
    return this.hkdf(entityKey, salt, info, KEY_LENGTH);
  }

  /**
   * Complete key derivation chain - derives the final key for encryption/decryption
   */
  deriveCompleteKey(context: DerivationContext): { key: Buffer; metadata: KeyMetadata } {
    const cacheKey = this.buildCacheKey(context);
    
    // Check cache first
    const cached = this.keyCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { key: cached.key, metadata: cached.metadata };
    }

    // Derive the complete key chain
    const userMasterKey = this.deriveUserMasterKey(context.userId);
    const domainKey = this.deriveDomainKey(userMasterKey, context.userId, context.domain);
    const entityKey = this.deriveEntityKey(domainKey, context);
    
    let finalKey: Buffer;
    let keyId: string;

    if (context.fieldType) {
      finalKey = this.deriveFieldKey(entityKey, context);
      keyId = `field:${context.userId}:${context.domain}:${context.entityType}:${context.entityId}:${context.fieldType}`;
    } else {
      finalKey = entityKey;
      keyId = `entity:${context.userId}:${context.domain}:${context.entityType}:${context.entityId}`;
    }

    const metadata: KeyMetadata = {
      keyId,
      domain: context.domain,
      entityType: context.entityType,
      entityId: context.entityId,
      fieldType: context.fieldType,
      derivedAt: new Date().toISOString(),
      version: context.version || 1
    };

    // Cache the key with expiration
    const expiresAt = Date.now() + (this.masterKeyConfig.keyRotationInterval * 1000);
    this.keyCache.set(cacheKey, {
      key: finalKey,
      expiresAt,
      metadata
    });

    return { key: finalKey, metadata };
  }

  /**
   * Derives multiple keys in batch for performance
   */
  deriveBatchKeys(contexts: DerivationContext[]): Array<{ key: Buffer; metadata: KeyMetadata }> {
    // Performance optimization: batch similar derivations and reuse computations
    const results: Array<{ key: Buffer; metadata: KeyMetadata }> = [];
    const userMasterKeys = new Map<string, Buffer>();
    const domainKeys = new Map<string, Buffer>();

    for (const context of contexts) {
      const cacheKey = this.buildCacheKey(context);
      
      // Check cache first
      const cached = this.keyCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        results.push({ key: cached.key, metadata: cached.metadata });
        continue;
      }

      // Derive keys with optimization for repeated users/domains
      let userMasterKey = userMasterKeys.get(context.userId);
      if (!userMasterKey) {
        userMasterKey = this.deriveUserMasterKey(context.userId);
        userMasterKeys.set(context.userId, userMasterKey);
      }

      const domainKeyId = `${context.userId}:${context.domain}`;
      let domainKey = domainKeys.get(domainKeyId);
      if (!domainKey) {
        domainKey = this.deriveDomainKey(userMasterKey, context.userId, context.domain);
        domainKeys.set(domainKeyId, domainKey);
      }

      const entityKey = this.deriveEntityKey(domainKey, context);
      
      let finalKey: Buffer;
      let keyId: string;

      if (context.fieldType) {
        finalKey = this.deriveFieldKey(entityKey, context);
        keyId = `field:${context.userId}:${context.domain}:${context.entityType}:${context.entityId}:${context.fieldType}`;
      } else {
        finalKey = entityKey;
        keyId = `entity:${context.userId}:${context.domain}:${context.entityType}:${context.entityId}`;
      }

      const metadata: KeyMetadata = {
        keyId,
        domain: context.domain,
        entityType: context.entityType,
        entityId: context.entityId,
        fieldType: context.fieldType,
        derivedAt: new Date().toISOString(),
        version: context.version || 1
      };

      // Cache the key with expiration
      const expiresAt = Date.now() + (this.masterKeyConfig.keyRotationInterval * 1000);
      this.keyCache.set(cacheKey, {
        key: finalKey,
        expiresAt,
        metadata
      });

      results.push({ key: finalKey, metadata });
    }

    return results;
  }

  /**
   * Rotates keys for a specific user (generates new keys with incremented version)
   */
  rotateUserKeys(userId: string): void {
    // Clear cache for this user
    for (const [cacheKey] of this.keyCache) {
      if (cacheKey.includes(userId)) {
        this.keyCache.delete(cacheKey);
      }
    }

    // Note: In a production system, this would also trigger re-encryption
    // of all data encrypted with the old keys
    console.log(`Key rotation initiated for user: ${userId}`);
  }

  /**
   * Clears key cache (should be called on logout)
   */
  clearCache(userId?: string): void {
    if (userId) {
      // Clear cache for specific user
      for (const [cacheKey] of this.keyCache) {
        if (cacheKey.includes(userId)) {
          this.keyCache.delete(cacheKey);
        }
      }
    } else {
      // Clear entire cache
      this.keyCache.clear();
    }
  }

  /**
   * Gets cache statistics for monitoring
   */
  getCacheStats(): { totalKeys: number; expiredKeys: number; cacheHitRate: number } {
    const now = Date.now();
    let expiredKeys = 0;
    
    for (const [key, value] of this.keyCache) {
      if (now >= value.expiresAt) {
        expiredKeys++;
      }
    }

    return {
      totalKeys: this.keyCache.size,
      expiredKeys,
      cacheHitRate: 0 // Would need to implement hit tracking for real metrics
    };
  }

  /**
   * HKDF implementation using Node.js crypto
   */
  private hkdf(
    inputKeyMaterial: Buffer,
    salt: Buffer,
    info: Buffer,
    length: number
  ): Buffer {
    // Extract step
    const prk = crypto.createHmac(HKDF_HASH_ALGORITHM, salt)
      .update(inputKeyMaterial)
      .digest();

    // Expand step
    const hashLength = crypto.createHash(HKDF_HASH_ALGORITHM).digest().length;
    const n = Math.ceil(length / hashLength);
    
    if (n > 255) {
      throw new Error('HKDF length too long');
    }

    let previousT = Buffer.alloc(0);
    let output = Buffer.alloc(0);

    for (let i = 1; i <= n; i++) {
      const hmac = crypto.createHmac(HKDF_HASH_ALGORITHM, prk);
      hmac.update(previousT);
      hmac.update(info);
      hmac.update(Buffer.from([i]));
      previousT = Buffer.from(hmac.digest());
      output = Buffer.concat([output, previousT]);
    }

    return output.slice(0, length);
  }

  /**
   * Generates a cryptographically secure salt for key derivation
   */
  private generateSalt(purpose: string, additionalContext?: string): Buffer {
    // CRITICAL: Create user-specific salt with high entropy
    // Use multiple independent entropy sources to prevent predictability
    const secureEntropyInputs = [
      `salt:${purpose}`,
      this.masterKeyConfig.applicationMasterKey,
      additionalContext || '',
      // Use high-resolution timer for better entropy than Date.now()
      process.hrtime.bigint().toString(),
      // Use cryptographic randomness instead of Math.random()
      crypto.randomBytes(32).toString('hex'),
      crypto.randomBytes(16).toString('hex'),
      // Add process-specific entropy
      process.pid.toString(),
      // Add additional entropy for user isolation
      crypto.randomUUID()
    ];

    // Multiple rounds of secure hashing with different entropy sources
    let salt = crypto.createHash('sha256')
      .update(secureEntropyInputs.join(':'))
      .digest();

    // Additional entropy mixing with separate random input
    const additionalEntropy = crypto.randomBytes(32);
    salt = crypto.createHmac('sha256', salt)
      .update(additionalEntropy)
      .digest();

    // Final entropy mixing to ensure maximum unpredictability
    const finalEntropy = crypto.randomBytes(32);
    salt = crypto.createHash('sha512')
      .update(salt)
      .update(finalEntropy)
      .digest()
      .slice(0, 32); // Take first 32 bytes for consistent size

    return salt;
  }

  /**
   * Builds the info parameter for HKDF
   */
  private buildInfo(type: string, data: string): Buffer {
    const info = `${type}:${data}`;
    if (info.length > INFO_MAX_LENGTH) {
      throw new Error(`Info parameter too long: ${info.length} > ${INFO_MAX_LENGTH}`);
    }
    return Buffer.from(info, 'utf8');
  }

  /**
   * Builds a cache key for the given context
   */
  private buildCacheKey(context: DerivationContext): string {
    const parts = [
      context.userId,
      context.domain,
      context.entityType,
      context.entityId,
      context.fieldType || 'entity',
      context.version || '1'
    ];
    return parts.join(':');
  }

  /**
   * Validates master key configuration
   */
  static validateMasterKeyConfig(config: MasterKeyConfig): boolean {
    try {
      // Check key format and length
      if (!config.applicationMasterKey || config.applicationMasterKey.length !== 64) {
        throw new Error('Application master key must be 64 hex characters');
      }
      
      if (!config.recoveryMasterKey || config.recoveryMasterKey.length !== 64) {
        throw new Error('Recovery master key must be 64 hex characters');
      }

      if (config.demoMasterKey && config.demoMasterKey.length !== 64) {
        throw new Error('Demo master key must be 64 hex characters');
      }

      // Validate key rotation interval
      if (config.keyRotationInterval < 3600) { // Minimum 1 hour
        throw new Error('Key rotation interval must be at least 3600 seconds');
      }

      // Check that keys are valid hex
      Buffer.from(config.applicationMasterKey, 'hex');
      Buffer.from(config.recoveryMasterKey, 'hex');
      if (config.demoMasterKey) {
        Buffer.from(config.demoMasterKey, 'hex');
      }

      return true;
    } catch (error) {
      console.error('Master key configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Generates a new master key for initial setup
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Securely compares two keys for equality
   */
  static secureKeyCompare(key1: Buffer, key2: Buffer): boolean {
    if (key1.length !== key2.length) {
      return false;
    }
    return crypto.timingSafeEqual(key1, key2);
  }
}

/**
 * Helper functions for easy key derivation
 */
export class KeyDerivationHelpers {
  /**
   * Derives a key for event encryption
   */
  static deriveEventKey(
    userId: string,
    eventId: string,
    privacyLevel: string,
    fieldType?: FieldType
  ): { key: Buffer; metadata: KeyMetadata } {
    const derivation = KeyDerivation.getInstance();
    const domain = KeyDerivation.privacyLevelToDomain(privacyLevel);
    
    const context: DerivationContext = {
      userId,
      domain,
      entityType: EntityType.EVENT,
      entityId: eventId,
      fieldType
    };

    return derivation.deriveCompleteKey(context);
  }

  /**
   * Derives a key for user data encryption
   */
  static deriveUserDataKey(
    userId: string,
    fieldType: FieldType
  ): { key: Buffer; metadata: KeyMetadata } {
    const derivation = KeyDerivation.getInstance();
    
    const context: DerivationContext = {
      userId,
      domain: KeyDomain.PERSONAL, // User data is always personal
      entityType: EntityType.USER,
      entityId: userId,
      fieldType
    };

    return derivation.deriveCompleteKey(context);
  }

  /**
   * Derives a key for relationship data encryption
   */
  static deriveRelationshipKey(
    userId: string,
    relationshipId: string,
    fieldType?: FieldType
  ): { key: Buffer; metadata: KeyMetadata } {
    const derivation = KeyDerivation.getInstance();
    
    const context: DerivationContext = {
      userId,
      domain: KeyDomain.RELATIONSHIP,
      entityType: EntityType.RELATIONSHIP,
      entityId: relationshipId,
      fieldType
    };

    return derivation.deriveCompleteKey(context);
  }

  /**
   * Derives a key for group data encryption
   */
  static deriveGroupKey(
    userId: string,
    groupId: string,
    privacyLevel: string,
    fieldType?: FieldType
  ): { key: Buffer; metadata: KeyMetadata } {
    const derivation = KeyDerivation.getInstance();
    const domain = KeyDerivation.privacyLevelToDomain(privacyLevel);
    
    const context: DerivationContext = {
      userId,
      domain,
      entityType: EntityType.GROUP,
      entityId: groupId,
      fieldType
    };

    return derivation.deriveCompleteKey(context);
  }
}
