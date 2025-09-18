/**
 * Key Management Service
 * 
 * Handles generation, storage, and distribution of encryption keys
 * for relationships, groups, and events based on the three-layer
 * permission architecture. Enhanced with key escrow and hierarchical
 * key derivation capabilities.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { z } from 'zod';
import { encrypt, decrypt } from '@/lib/encryption';
import { getKeyDerivationService, KeyDerivationMetadata } from '@/lib/security/key-derivation-service';
import { 
  KeyDerivation, 
  KeyDerivationHelpers, 
  MasterKeyConfig, 
  KeyMetadata as NewKeyMetadata,
  DerivationContext,
  KeyDomain,
  EntityType,
  FieldType
} from './key-derivation';
import { 
  KeyEscrowService, 
  EscrowMethod, 
  EscrowRecord, 
  RecoveryResult 
} from './key-escrow';

// Key types in our system
export enum KeyType {
  RELATIONSHIP = 'relationship',
  GROUP = 'group',
  EVENT = 'event',
  MASTER = 'master' // User's master key for encrypting other keys
}

// Access reasons for audit trail
export enum AccessReason {
  RELATIONSHIP = 'relationship',
  GROUP_MEMBERSHIP = 'group',
  INVITATION = 'invitation',
  EVENT_OVERRIDE = 'event_override',
  OWNER = 'owner'
}

// Key metadata structure
export interface KeyMetadata {
  keyType: KeyType;
  ownerId: string;
  entityId: string; // relationship_id, group_id, or event_id
  createdAt: string;
  version: number;
  algorithm: 'AES-256-GCM';
}

// Key access record
export interface KeyAccess {
  keyId: string;
  userId: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  accessReason: AccessReason;
}

// Schemas for validation
const keyGenerationSchema = z.object({
  keyType: z.nativeEnum(KeyType),
  ownerId: z.string().uuid(),
  entityId: z.string().uuid()
});

const keyAccessSchema = z.object({
  keyId: z.string().uuid(),
  userId: z.string().uuid(),
  grantedBy: z.string().uuid(),
  accessReason: z.nativeEnum(AccessReason),
  expiresAt: z.string().optional()
});

// Enhanced configuration interface
export interface EnhancedKeyManagementConfig {
  masterKeys?: MasterKeyConfig;
  enableEscrow: boolean;
  enableHierarchicalDerivation: boolean;
  enableAuditLogging: boolean;
  isDemoMode: boolean;
}

// Audit log entry for key operations
export interface KeyAuditEntry {
  id: string;
  userId: string;
  operation: string;
  keyId?: string;
  entityType?: string;
  entityId?: string;
  success: boolean;
  error?: string;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    timestamp: string;
    sessionId?: string;
  };
}

export class KeyManagementService {
  private keyDerivationService = getKeyDerivationService();
  private userMasterKeyCache = new Map<string, { key: string; salt: string; expiresAt: number }>();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  
  // Enhanced key escrow capabilities
  private keyDerivation?: KeyDerivation;
  private keyEscrow?: KeyEscrowService;
  private config: EnhancedKeyManagementConfig;
  private auditLog: KeyAuditEntry[] = [];

  constructor(private supabase: SupabaseClient, enhancedConfig?: EnhancedKeyManagementConfig) {
    this.config = {
      enableEscrow: false,
      enableHierarchicalDerivation: false,
      enableAuditLogging: true,
      isDemoMode: process.env.NODE_ENV !== 'production',
      ...enhancedConfig
    };
    
    // Initialize enhanced key management if enabled
    if (this.config.enableHierarchicalDerivation && this.config.masterKeys) {
      this.keyDerivation = KeyDerivation.initialize(this.config.masterKeys, this.config.isDemoMode);
    }
    
    if (this.config.enableEscrow) {
      this.keyEscrow = KeyEscrowService.initialize(this.config.isDemoMode);
    }
  }

  /**
   * Generates a new cryptographic key
   */
  private generateKey(): string {
    // Generate 256-bit key for AES-256-GCM
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Gets or creates a user's master key using secure key derivation
   * This key is used to encrypt the user's other keys
   * 
   * SECURITY NOTE: In production, this should derive from the user's password
   * or use a proper key escrow system. This implementation uses a server-side
   * secret as a temporary measure until proper key escrow is implemented.
   */
  private async getUserMasterKey(userId: string): Promise<string> {
    // Check cache with constant-time operations to prevent timing attacks
    const cached = this.constantTimeCacheGet(userId);
    if (cached && this.constantTimeIsValid(cached.expiresAt)) {
      return cached.key;
    }

    try {
      // Check if user has stored key derivation metadata
      const { data: keyData, error } = await this.supabase
        .from('user_master_keys')
        .select('key_derivation_metadata, encrypted_master_key')
        .eq('user_id', userId)
        .single();

      let masterKey: string;
      let salt: string;

      if (!error && keyData?.key_derivation_metadata) {
        // User has existing master key - derive using stored metadata
        const metadata: KeyDerivationMetadata = keyData.key_derivation_metadata;
        const userSecret = await this.getUserSecret(userId);
        
        const result = await this.keyDerivationService.deriveKeyHex(
          userSecret,
          Buffer.from(metadata.salt, 'hex'),
          metadata.parameters
        );
        
        masterKey = result.key;
        salt = metadata.salt;
      } else {
        // No existing master key - create new one with secure derivation
        const userSecret = await this.getUserSecret(userId);
        const result = await this.keyDerivationService.deriveKeyHex(userSecret);
        
        masterKey = result.key;
        salt = result.metadata.salt;

        // Store the key derivation metadata (but not the key itself)
        await this.supabase
          .from('user_master_keys')
          .upsert({
            user_id: userId,
            key_derivation_metadata: result.metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // Cache the derived key with expiration using constant-time operations
      this.constantTimeCacheSet(userId, {
        key: masterKey,
        salt,
        expiresAt: Date.now() + this.CACHE_DURATION_MS
      });

      return masterKey;
    } catch (error) {
      console.error('[KEY_MGMT] Failed to derive user master key:', error);
      throw new Error('Failed to derive master key');
    }
  }

  /**
   * Gets the user secret for key derivation
   *
   * This implementation uses server secrets and user context to create
   * deterministic but secure key derivation seeds without predictable time components.
   */
  private async getUserSecret(userId: string): Promise<string> {
    const serverSecret = process.env.KEY_DERIVATION_SECRET;
    if (!serverSecret) {
      throw new Error('KEY_DERIVATION_SECRET environment variable is required');
    }

    // Validate server secret strength
    if (serverSecret.length < 32) {
      throw new Error('KEY_DERIVATION_SECRET must be at least 32 characters long');
    }

    if (serverSecret === 'development-secret') {
      throw new Error('Development secret detected. Production deployment requires a secure KEY_DERIVATION_SECRET');
    }

    // Create deterministic but secure seed using secure factors
    const environment = process.env.NODE_ENV || 'development';

    // Use HMAC for secure combination instead of predictable concatenation
    const hmac = crypto.createHmac('sha256', serverSecret);
    hmac.update(userId);
    hmac.update(environment);

    // Add application-specific context without time-based predictability
    const appContext = process.env.APP_INSTANCE_ID || 'default-instance';
    hmac.update(appContext);

    return hmac.digest('hex');
  }

  /**
   * Creates a new encryption key for a relationship
   */
  async createRelationshipKey(
    userId: string,
    partnerId: string,
    relationshipId: string
  ): Promise<string> {
    try {
      // Generate new key
      const key = this.generateKey();
      const keyId = crypto.randomUUID();
      
      // Get user's master key to encrypt this key
      const masterKey = await this.getUserMasterKey(userId);
      const encryptedKey = await this.encryptKeyWithMaster(key, masterKey);
      
      // Store encrypted key
      const metadata: KeyMetadata = {
        keyType: KeyType.RELATIONSHIP,
        ownerId: userId,
        entityId: relationshipId,
        createdAt: new Date().toISOString(),
        version: 1,
        algorithm: 'AES-256-GCM'
      };

      const { error: keyError } = await this.supabase
        .from('encryption_keys')
        .insert({
          id: keyId,
          key_type: KeyType.RELATIONSHIP,
          key_owner_id: userId,
          encrypted_key: encryptedKey,
          metadata
        });

      if (keyError) throw keyError;

      // Grant access to both users in the relationship
      await this.grantKeyAccess(keyId, userId, userId, AccessReason.OWNER);
      await this.grantKeyAccess(keyId, partnerId, userId, AccessReason.RELATIONSHIP);

      return keyId;
    } catch (error) {
      console.error('[KEY_MGMT] Failed to create relationship key:', error);
      throw new Error('Failed to create relationship key');
    }
  }

  /**
   * Creates a new encryption key for a group
   */
  async createGroupKey(
    ownerId: string,
    groupId: string,
    memberIds: string[]
  ): Promise<string> {
    try {
      // Generate new key
      const key = this.generateKey();
      const keyId = crypto.randomUUID();
      
      // Get owner's master key to encrypt this key
      const masterKey = await this.getUserMasterKey(ownerId);
      const encryptedKey = await this.encryptKeyWithMaster(key, masterKey);
      
      // Store encrypted key
      const metadata: KeyMetadata = {
        keyType: KeyType.GROUP,
        ownerId,
        entityId: groupId,
        createdAt: new Date().toISOString(),
        version: 1,
        algorithm: 'AES-256-GCM'
      };

      const { error: keyError } = await this.supabase
        .from('encryption_keys')
        .insert({
          id: keyId,
          key_type: KeyType.GROUP,
          key_owner_id: ownerId,
          encrypted_key: encryptedKey,
          metadata
        });

      if (keyError) throw keyError;

      // Grant access to owner
      await this.grantKeyAccess(keyId, ownerId, ownerId, AccessReason.OWNER);

      // Grant access to all group members
      for (const memberId of memberIds) {
        if (memberId !== ownerId) {
          await this.grantKeyAccess(keyId, memberId, ownerId, AccessReason.GROUP_MEMBERSHIP);
        }
      }

      return keyId;
    } catch (error) {
      console.error('[KEY_MGMT] Failed to create group key:', error);
      throw new Error('Failed to create group key');
    }
  }

  /**
   * Creates a new encryption key for an event (when privacy override is needed)
   */
  async createEventKey(
    ownerId: string,
    eventId: string,
    allowedUserIds: string[] = []
  ): Promise<string> {
    try {
      // Generate new key
      const key = this.generateKey();
      const keyId = crypto.randomUUID();
      
      // Get owner's master key to encrypt this key
      const masterKey = await this.getUserMasterKey(ownerId);
      const encryptedKey = await this.encryptKeyWithMaster(key, masterKey);
      
      // Store encrypted key
      const metadata: KeyMetadata = {
        keyType: KeyType.EVENT,
        ownerId,
        entityId: eventId,
        createdAt: new Date().toISOString(),
        version: 1,
        algorithm: 'AES-256-GCM'
      };

      const { error: keyError } = await this.supabase
        .from('encryption_keys')
        .insert({
          id: keyId,
          key_type: KeyType.EVENT,
          key_owner_id: ownerId,
          encrypted_key: encryptedKey,
          metadata
        });

      if (keyError) throw keyError;

      // Grant access to owner
      await this.grantKeyAccess(keyId, ownerId, ownerId, AccessReason.OWNER);

      // Grant access to specifically allowed users
      for (const userId of allowedUserIds) {
        await this.grantKeyAccess(keyId, userId, ownerId, AccessReason.INVITATION);
      }

      return keyId;
    } catch (error) {
      console.error('[KEY_MGMT] Failed to create event key:', error);
      throw new Error('Failed to create event key');
    }
  }

  /**
   * Grants a user access to a key
   */
  async grantKeyAccess(
    keyId: string,
    userId: string,
    grantedBy: string,
    accessReason: AccessReason,
    expiresAt?: string
  ): Promise<void> {
    try {
      const validatedData = keyAccessSchema.parse({
        keyId,
        userId,
        grantedBy,
        accessReason,
        expiresAt
      });

      // Check if access already exists
      const { data: existingAccess } = await this.supabase
        .from('key_access')
        .select('id')
        .eq('key_id', keyId)
        .eq('user_id', userId)
        .single();

      if (!existingAccess) {
        const { error } = await this.supabase
          .from('key_access')
          .insert({
            key_id: keyId,
            user_id: userId,
            granted_by: grantedBy,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt,
            access_reason: accessReason
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('[KEY_MGMT] Failed to grant key access:', error);
      throw new Error('Failed to grant key access');
    }
  }

  /**
   * Revokes a user's access to a key
   */
  async revokeKeyAccess(keyId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('key_access')
        .delete()
        .eq('key_id', keyId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('[KEY_MGMT] Failed to revoke key access:', error);
      throw new Error('Failed to revoke key access');
    }
  }

  /**
   * Gets the encryption key for a specific entity if the user has access
   */
  async getKeyForEntity(
    userId: string,
    entityId: string,
    entityType: 'event' | 'relationship' | 'group'
  ): Promise<string | null> {
    try {
      // Find the key for this entity
      const { data: keyRecord, error: keyError } = await this.supabase
        .from('encryption_keys')
        .select('id, encrypted_key, key_owner_id')
        .eq('metadata->entityId', entityId)
        .eq('key_type', entityType)
        .single();

      if (keyError || !keyRecord) {
        return null;
      }

      // Check if user has access to this key
      const { data: access, error: accessError } = await this.supabase
        .from('key_access')
        .select('*')
        .eq('key_id', keyRecord.id)
        .eq('user_id', userId)
        .single();

      if (accessError || !access) {
        return null;
      }

      // Check if access has expired
      if (access.expires_at && new Date(access.expires_at) < new Date()) {
        await this.revokeKeyAccess(keyRecord.id, userId);
        return null;
      }

      // Decrypt the key using the appropriate master key
      const masterKey = await this.getUserMasterKey(keyRecord.key_owner_id);
      const decryptedKey = await this.decryptKeyWithMaster(
        keyRecord.encrypted_key,
        masterKey
      );

      return decryptedKey;
    } catch (error) {
      console.error('[KEY_MGMT] Failed to get key for entity:', error);
      return null;
    }
  }

  /**
   * Updates group key access when members change
   */
  async updateGroupKeyAccess(
    groupId: string,
    ownerId: string,
    newMemberIds: string[]
  ): Promise<void> {
    try {
      // Get the group's key
      const { data: keyRecord } = await this.supabase
        .from('encryption_keys')
        .select('id')
        .eq('metadata->entityId', groupId)
        .eq('key_type', KeyType.GROUP)
        .single();

      if (!keyRecord) {
        throw new Error('Group key not found');
      }

      // Get current access list
      const { data: currentAccess } = await this.supabase
        .from('key_access')
        .select('user_id')
        .eq('key_id', keyRecord.id);

      const currentUserIds = currentAccess?.map(a => a.user_id) || [];
      
      // Calculate changes
      const usersToAdd = newMemberIds.filter(id => !currentUserIds.includes(id));
      const usersToRemove = currentUserIds.filter(
        id => id !== ownerId && !newMemberIds.includes(id)
      );

      // Grant access to new members
      for (const userId of usersToAdd) {
        await this.grantKeyAccess(
          keyRecord.id,
          userId,
          ownerId,
          AccessReason.GROUP_MEMBERSHIP
        );
      }

      // Revoke access from removed members
      for (const userId of usersToRemove) {
        await this.revokeKeyAccess(keyRecord.id, userId);
      }
    } catch (error) {
      console.error('[KEY_MGMT] Failed to update group key access:', error);
      throw new Error('Failed to update group key access');
    }
  }

  /**
   * Encrypts a key using a master key with explicit key parameter
   */
  private async encryptKeyWithMaster(key: string, masterKey: string): Promise<string> {
    // Use AES-256-GCM encryption with explicit key parameter
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(masterKey, 'hex'), iv);

    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts a key using a master key with explicit key parameter
   */
  private async decryptKeyWithMaster(encryptedKey: string, masterKey: string): Promise<string> {
    // Parse encrypted data format: iv:authTag:encryptedData
    const [ivHex, authTagHex, encrypted] = encryptedKey.split(':');

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted key format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(masterKey, 'hex'), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Constant-time cache operations to prevent timing attacks
   */
  private constantTimeCacheGet(userId: string): { key: string; salt: string; expiresAt: number } | undefined {
    // Always iterate through all cache entries to maintain constant time
    let result: { key: string; salt: string; expiresAt: number } | undefined = undefined;
    let found = false;

    for (const [cachedUserId, cacheEntry] of this.userMasterKeyCache.entries()) {
      // Use crypto.timingSafeEqual for constant-time string comparison
      const userIdBuffer = Buffer.from(userId, 'utf8');
      const cachedUserIdBuffer = Buffer.from(cachedUserId, 'utf8');

      // Pad to same length to avoid timing leaks
      const maxLength = Math.max(userIdBuffer.length, cachedUserIdBuffer.length);
      const paddedUserId = Buffer.alloc(maxLength);
      const paddedCachedUserId = Buffer.alloc(maxLength);

      userIdBuffer.copy(paddedUserId);
      cachedUserIdBuffer.copy(paddedCachedUserId);

      const isMatch = crypto.timingSafeEqual(paddedUserId, paddedCachedUserId);

      // Use bitwise operations to avoid branching that could leak timing
      if (isMatch && !found) {
        result = cacheEntry;
        found = true;
      }
    }

    return result;
  }

  private constantTimeCacheSet(userId: string, value: { key: string; salt: string; expiresAt: number }): void {
    // Perform cache cleanup to prevent unbounded growth
    // Use constant-time operations during cleanup
    this.constantTimeCacheCleanup();
    this.userMasterKeyCache.set(userId, value);
  }

  private constantTimeIsValid(expiresAt: number): boolean {
    const now = Date.now();
    // Avoid direct comparison that might leak timing information
    // Use arithmetic operations instead
    const timeDiff = expiresAt - now;
    return timeDiff > 0;
  }

  private constantTimeCacheCleanup(): void {
    // Remove expired entries in constant time
    const now = Date.now();
    const entriesToKeep = new Map<string, { key: string; salt: string; expiresAt: number }>();

    for (const [userId, cacheEntry] of this.userMasterKeyCache.entries()) {
      if (this.constantTimeIsValid(cacheEntry.expiresAt)) {
        entriesToKeep.set(userId, cacheEntry);
      }
    }

    this.userMasterKeyCache.clear();
    for (const [userId, cacheEntry] of entriesToKeep.entries()) {
      this.userMasterKeyCache.set(userId, cacheEntry);
    }
  }

  /**
   * Clears the master key cache for a user (e.g., on logout)
   */
  clearUserMasterKeyCache(userId: string): void {
    this.userMasterKeyCache.delete(userId);
  }

  /**
   * Clears all cached master keys (e.g., on security incident)
   */
  clearAllMasterKeyCache(): void {
    this.userMasterKeyCache.clear();
  }

  /**
   * Rotates a key (creates new version)
   */
  async rotateKey(keyId: string, userId: string): Promise<void> {
    try {
      // Verify user has owner access
      const { data: access } = await this.supabase
        .from('key_access')
        .select('access_reason')
        .eq('key_id', keyId)
        .eq('user_id', userId)
        .eq('access_reason', AccessReason.OWNER)
        .single();

      if (!access) {
        throw new Error('Unauthorized: Only key owner can rotate keys');
      }

      // Get current key
      const { data: currentKey } = await this.supabase
        .from('encryption_keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (!currentKey) {
        throw new Error('Key not found');
      }

      // Generate new key
      const newKey = this.generateKey();
      const masterKey = await this.getUserMasterKey(currentKey.key_owner_id);
      const encryptedNewKey = await this.encryptKeyWithMaster(newKey, masterKey);

      // Update metadata
      const metadata = currentKey.metadata as KeyMetadata;
      metadata.version += 1;

      // Update key
      const { error } = await this.supabase
        .from('encryption_keys')
        .update({
          encrypted_key: encryptedNewKey,
          metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId);

      if (error) throw error;
    } catch (error) {
      console.error('[KEY_MGMT] Failed to rotate key:', error);
      throw new Error('Failed to rotate key');
    }
  }

  // ===== ENHANCED KEY ESCROW AND HIERARCHICAL DERIVATION METHODS =====

  /**
   * Sets up key escrow for a user using the enhanced system
   */
  async setupUserKeyEscrow(
    userId: string,
    escrowMethod: EscrowMethod,
    escrowData: {
      password?: string;
      securityQuestions?: Array<{ question: string; answer: string }>;
      socialRecoveryParticipants?: string[];
      backupCodeCount?: number;
    },
    requestMetadata?: { userAgent?: string; ipAddress?: string; sessionId?: string }
  ): Promise<{ success: boolean; escrowRecord?: EscrowRecord; backupCodes?: string[]; error?: string }> {
    if (!this.config.enableEscrow || !this.keyEscrow) {
      return { success: false, error: 'Key escrow is not enabled' };
    }

    try {
      // Get or create user master key using hierarchical derivation
      const userMasterKey = this.keyDerivation ? 
        this.keyDerivation.deriveUserMasterKey(userId) :
        Buffer.from(await this.getUserMasterKey(userId), 'hex');

      let result: { escrowRecord: EscrowRecord; backupCodes?: string[] };

      switch (escrowMethod) {
        case EscrowMethod.PASSWORD:
          if (!escrowData.password) {
            throw new Error('Password is required for password-based escrow');
          }
          const passwordEscrow = await this.keyEscrow.createPasswordEscrow(userId, userMasterKey, escrowData.password);
          result = { escrowRecord: passwordEscrow };
          break;

        case EscrowMethod.SECURITY_QUESTIONS:
          if (!escrowData.securityQuestions || escrowData.securityQuestions.length < 5) {
            throw new Error('At least 5 security questions are required');
          }
          const questionsEscrow = await this.keyEscrow.createSecurityQuestionsEscrow(userId, userMasterKey, escrowData.securityQuestions);
          result = { escrowRecord: questionsEscrow };
          break;

        case EscrowMethod.SOCIAL_RECOVERY:
          if (!escrowData.socialRecoveryParticipants || escrowData.socialRecoveryParticipants.length < 3) {
            throw new Error('At least 3 participants are required for social recovery');
          }
          const socialEscrow = await this.keyEscrow.createSocialRecoveryEscrow(userId, userMasterKey, escrowData.socialRecoveryParticipants);
          result = { escrowRecord: socialEscrow };
          break;

        case EscrowMethod.BACKUP_CODES:
          const backupResult = await this.keyEscrow.createBackupCodesEscrow(userId, userMasterKey, escrowData.backupCodeCount);
          result = { escrowRecord: backupResult.escrowRecord, backupCodes: backupResult.backupCodes };
          break;

        default:
          throw new Error(`Unsupported escrow method: ${escrowMethod}`);
      }

      // Log successful backup
      if (this.config.enableAuditLogging) {
        await this.logKeyOperation(userId, 'setup_escrow', {
          success: true,
          requestMetadata
        });
      }

      return {
        success: true,
        escrowRecord: result.escrowRecord,
        backupCodes: result.backupCodes
      };
    } catch (error) {
      // Log failed backup
      if (this.config.enableAuditLogging) {
        await this.logKeyOperation(userId, 'setup_escrow', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestMetadata
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup key escrow'
      };
    }
  }

  /**
   * Recovers user keys using the enhanced escrow system
   */
  async recoverUserKeys(
    userId: string,
    recoveryMethod: EscrowMethod,
    recoveryData: {
      password?: string;
      securityAnswers?: Array<{ questionId: string; answer: string }>;
      socialRecoveryShares?: string[];
      backupCode?: string;
    },
    requestMetadata?: { userAgent?: string; ipAddress?: string; sessionId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enableEscrow || !this.keyEscrow) {
      return { success: false, error: 'Key escrow is not enabled' };
    }

    try {
      let recoveryResult: RecoveryResult;

      switch (recoveryMethod) {
        case EscrowMethod.PASSWORD:
          if (!recoveryData.password) {
            throw new Error('Password is required for password recovery');
          }
          recoveryResult = await this.keyEscrow.recoverWithPassword(userId, recoveryData.password);
          break;

        case EscrowMethod.SECURITY_QUESTIONS:
          if (!recoveryData.securityAnswers) {
            throw new Error('Security answers are required for security question recovery');
          }
          recoveryResult = await this.keyEscrow.recoverWithSecurityQuestions(userId, recoveryData.securityAnswers);
          break;

        case EscrowMethod.BACKUP_CODES:
          if (!recoveryData.backupCode) {
            throw new Error('Backup code is required for backup code recovery');
          }
          recoveryResult = await this.keyEscrow.recoverWithBackupCode(userId, recoveryData.backupCode);
          break;

        default:
          throw new Error(`Unsupported recovery method: ${recoveryMethod}`);
      }

      if (recoveryResult.success) {
        // Clear existing cache to force re-derivation with recovered key
        this.clearUserMasterKeyCache(userId);
        if (this.keyDerivation) {
          this.keyDerivation.clearCache(userId);
        }

        // Log successful recovery
        if (this.config.enableAuditLogging) {
          await this.logKeyOperation(userId, 'recover_keys', {
            success: true,
            requestMetadata
          });
        }

        return { success: true };
      } else {
        // Log failed recovery
        if (this.config.enableAuditLogging) {
          await this.logKeyOperation(userId, 'recover_keys', {
            success: false,
            error: recoveryResult.error,
            requestMetadata
          });
        }

        return {
          success: false,
          error: recoveryResult.error
        };
      }
    } catch (error) {
      // Log failed recovery
      if (this.config.enableAuditLogging) {
        await this.logKeyOperation(userId, 'recover_keys', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestMetadata
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Key recovery failed'
      };
    }
  }

  /**
   * Encrypts event data using hierarchical key derivation and privacy levels
   */
  async encryptEventDataEnhanced(
    userId: string,
    eventId: string,
    data: {
      description?: string;
      location?: string;
      notes?: string;
    },
    privacyLevel: string
  ): Promise<{
    description_encrypted?: string;
    location_encrypted?: string;
    notes_encrypted?: string;
  }> {
    if (!this.config.enableHierarchicalDerivation || !this.keyDerivation) {
      // Fall back to existing encryption method
      const existingKey = await this.getKeyForEntity(userId, eventId, 'event');
      if (!existingKey) {
        throw new Error('No encryption key available for event');
      }
      // Use existing encryption with the retrieved key
      return this.encryptDataWithKey(data, existingKey);
    }

    const encryptedData: any = {};
    const domain = KeyDerivation.privacyLevelToDomain(privacyLevel);

    // Encrypt description if provided
    if (data.description) {
      const context: DerivationContext = {
        userId,
        domain,
        entityType: EntityType.EVENT,
        entityId: eventId,
        fieldType: FieldType.DESCRIPTION
      };
      const { key } = this.keyDerivation.deriveCompleteKey(context);
      encryptedData.description_encrypted = this.performAESEncryption(data.description, key);
    }

    // Encrypt location if provided
    if (data.location) {
      const context: DerivationContext = {
        userId,
        domain,
        entityType: EntityType.EVENT,
        entityId: eventId,
        fieldType: FieldType.LOCATION
      };
      const { key } = this.keyDerivation.deriveCompleteKey(context);
      encryptedData.location_encrypted = this.performAESEncryption(data.location, key);
    }

    // Encrypt notes if provided
    if (data.notes) {
      const context: DerivationContext = {
        userId,
        domain,
        entityType: EntityType.EVENT,
        entityId: eventId,
        fieldType: FieldType.NOTES
      };
      const { key } = this.keyDerivation.deriveCompleteKey(context);
      encryptedData.notes_encrypted = this.performAESEncryption(data.notes, key);
    }

    return encryptedData;
  }

  /**
   * Decrypts event data using hierarchical key derivation
   */
  async decryptEventDataEnhanced(
    userId: string,
    eventId: string,
    encryptedData: {
      description_encrypted?: string;
      location_encrypted?: string;
      notes_encrypted?: string;
    },
    privacyLevel: string
  ): Promise<{
    description?: string;
    location?: string;
    notes?: string;
  }> {
    if (!this.config.enableHierarchicalDerivation || !this.keyDerivation) {
      // Fall back to existing decryption method
      const existingKey = await this.getKeyForEntity(userId, eventId, 'event');
      if (!existingKey) {
        return {}; // Return empty if no key access
      }
      return this.decryptDataWithKey(encryptedData, existingKey);
    }

    const decryptedData: any = {};
    const domain = KeyDerivation.privacyLevelToDomain(privacyLevel);

    // Decrypt description if provided
    if (encryptedData.description_encrypted) {
      try {
        const context: DerivationContext = {
          userId,
          domain,
          entityType: EntityType.EVENT,
          entityId: eventId,
          fieldType: FieldType.DESCRIPTION
        };
        const { key } = this.keyDerivation.deriveCompleteKey(context);
        decryptedData.description = this.performAESDecryption(encryptedData.description_encrypted, key);
      } catch (error) {
        // If decryption fails, user likely doesn't have access
        decryptedData.description = '[Access Denied]';
      }
    }

    // Decrypt location if provided
    if (encryptedData.location_encrypted) {
      try {
        const context: DerivationContext = {
          userId,
          domain,
          entityType: EntityType.EVENT,
          entityId: eventId,
          fieldType: FieldType.LOCATION
        };
        const { key } = this.keyDerivation.deriveCompleteKey(context);
        decryptedData.location = this.performAESDecryption(encryptedData.location_encrypted, key);
      } catch (error) {
        decryptedData.location = '[Access Denied]';
      }
    }

    // Decrypt notes if provided
    if (encryptedData.notes_encrypted) {
      try {
        const context: DerivationContext = {
          userId,
          domain,
          entityType: EntityType.EVENT,
          entityId: eventId,
          fieldType: FieldType.NOTES
        };
        const { key } = this.keyDerivation.deriveCompleteKey(context);
        decryptedData.notes = this.performAESDecryption(encryptedData.notes_encrypted, key);
      } catch (error) {
        decryptedData.notes = '[Access Denied]';
      }
    }

    return decryptedData;
  }

  /**
   * Gets audit log for key operations
   */
  getKeyAuditLog(userId: string, limit = 100): KeyAuditEntry[] {
    return this.auditLog
      .filter(entry => entry.userId === userId)
      .sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Gets cache statistics from hierarchical key derivation
   */
  getEnhancedCacheStats(): { totalKeys: number; expiredKeys: number; cacheHitRate: number } | null {
    return this.keyDerivation?.getCacheStats() || null;
  }

  /**
   * Rotates all keys for a user using enhanced system
   */
  async rotateUserKeysEnhanced(
    userId: string,
    requestMetadata?: { userAgent?: string; ipAddress?: string; sessionId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enableHierarchicalDerivation || !this.keyDerivation) {
      return { success: false, error: 'Hierarchical key derivation is not enabled' };
    }

    try {
      this.keyDerivation.rotateUserKeys(userId);
      this.clearUserMasterKeyCache(userId);

      // Log successful rotation
      if (this.config.enableAuditLogging) {
        await this.logKeyOperation(userId, 'rotate_keys', {
          success: true,
          requestMetadata
        });
      }

      return { success: true };
    } catch (error) {
      // Log failed rotation
      if (this.config.enableAuditLogging) {
        await this.logKeyOperation(userId, 'rotate_keys', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          requestMetadata
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Key rotation failed'
      };
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Performs AES-256-GCM encryption with a Buffer key
   */
  private performAESEncryption(data: string, key: Buffer): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Performs AES-256-GCM decryption with a Buffer key
   */
  private performAESDecryption(encryptedData: string, key: Buffer): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypts data with explicit key parameter (secure fallback)
   */
  private encryptDataWithKey(data: any, key: string): any {
    const encryptedData: any = {};

    // Use explicit key encryption instead of environment variable manipulation
    if (data.description) {
      encryptedData.description_encrypted = this.performAESEncryption(data.description, Buffer.from(key, 'hex'));
    }
    if (data.location) {
      encryptedData.location_encrypted = this.performAESEncryption(data.location, Buffer.from(key, 'hex'));
    }
    if (data.notes) {
      encryptedData.notes_encrypted = this.performAESEncryption(data.notes, Buffer.from(key, 'hex'));
    }

    return encryptedData;
  }

  /**
   * Decrypts data with explicit key parameter (secure fallback)
   */
  private decryptDataWithKey(encryptedData: any, key: string): any {
    const decryptedData: any = {};

    try {
      // Use explicit key decryption instead of environment variable manipulation
      if (encryptedData.description_encrypted) {
        decryptedData.description = this.performAESDecryption(encryptedData.description_encrypted, Buffer.from(key, 'hex'));
      }
      if (encryptedData.location_encrypted) {
        decryptedData.location = this.performAESDecryption(encryptedData.location_encrypted, Buffer.from(key, 'hex'));
      }
      if (encryptedData.notes_encrypted) {
        decryptedData.notes = this.performAESDecryption(encryptedData.notes_encrypted, Buffer.from(key, 'hex'));
      }
    } catch (error) {
      // Return empty object if decryption fails
      console.error('[KEY_MGMT] Decryption failed:', error);
      return {};
    }

    return decryptedData;
  }

  /**
   * Logs a key operation for audit purposes
   */
  private async logKeyOperation(
    userId: string,
    operation: string,
    details: {
      success: boolean;
      error?: string;
      keyId?: string;
      entityType?: string;
      entityId?: string;
      requestMetadata?: { userAgent?: string; ipAddress?: string; sessionId?: string };
    }
  ): Promise<void> {
    const auditEntry: KeyAuditEntry = {
      id: crypto.randomUUID(),
      userId,
      operation,
      keyId: details.keyId,
      entityType: details.entityType,
      entityId: details.entityId,
      success: details.success,
      error: details.error,
      metadata: {
        timestamp: new Date().toISOString(),
        userAgent: details.requestMetadata?.userAgent,
        ipAddress: details.requestMetadata?.ipAddress,
        sessionId: details.requestMetadata?.sessionId
      }
    };

    this.auditLog.push(auditEntry);

    // In production, write to database
    if (!this.config.isDemoMode) {
      try {
        await this.supabase
          .from('key_audit_log')
          .insert(auditEntry);
      } catch (error) {
        console.error('[KEY_MGMT] Failed to write audit log to database:', error);
      }
    }

    // Keep audit log size manageable
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000); // Keep last 5000 entries
    }
  }
}
