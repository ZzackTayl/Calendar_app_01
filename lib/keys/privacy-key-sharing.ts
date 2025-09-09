/**
 * Privacy-Aware Key Sharing System
 * 
 * Implements secure key sharing mechanisms that respect the 4-level privacy system
 * and relationship permissions. Enables selective data sharing between partners
 * while maintaining privacy boundaries and audit trails.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { 
  KeyDerivation, 
  KeyDerivationHelpers,
  KeyMetadata,
  DerivationContext,
  KeyDomain,
  EntityType,
  FieldType
} from './key-derivation';
import { KeyManagementService } from './key-management-service';
import { ConnectionTier, PrivacyOverride } from '@/lib/supabase/types';

// Privacy levels for key sharing
export enum PrivacyLevel {
  PRIVATE = 'private',
  BUSY_ONLY = 'busy_only', 
  DETAILS = 'details',
  PUBLIC = 'public'
}

// Key sharing permissions
export interface KeySharingPermissions {
  canRead: boolean;
  canWrite: boolean;
  canShare: boolean;
  canRevoke: boolean;
  expiresAt?: string;
}

// Key sharing configuration
export interface KeySharingConfig {
  keyId: string;
  ownerId: string;
  recipientId: string;
  privacyLevel: PrivacyLevel;
  permissions: KeySharingPermissions;
  entityType: EntityType;
  entityId: string;
  fieldType?: FieldType;
  sharedAt: string;
  sharedBy: string;
}

// Key sharing request
export interface KeySharingRequest {
  requestId: string;
  requestedBy: string;
  keyOwnerId: string;
  entityType: EntityType;
  entityId: string;
  privacyLevel: PrivacyLevel;
  reason: string;
  permissions: KeySharingPermissions;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

// Key sharing audit entry
export interface KeySharingAudit {
  id: string;
  keyId: string;
  action: 'shared' | 'revoked' | 'accessed' | 'requested';
  performedBy: string;
  targetUser: string;
  privacyLevel: PrivacyLevel;
  timestamp: string;
  metadata: {
    reason?: string;
    permissions?: KeySharingPermissions;
    ipAddress?: string;
    userAgent?: string;
  };
}

// Relationship privacy configuration
export interface RelationshipPrivacyConfig {
  relationshipId: string;
  userId: string;
  partnerId: string;
  defaultPrivacyLevel: PrivacyLevel;
  allowedSharingLevels: PrivacyLevel[];
  autoApproveSharing: boolean;
  requireExplicitConsent: boolean;
}

/**
 * Privacy-aware key sharing service
 */
export class PrivacyKeySharing {
  private keyManagementService: KeyManagementService;
  private keyDerivation: KeyDerivation;
  private sharingConfigs: Map<string, KeySharingConfig> = new Map();
  private sharingRequests: Map<string, KeySharingRequest> = new Map();
  private auditLog: KeySharingAudit[] = [];
  private relationshipConfigs: Map<string, RelationshipPrivacyConfig> = new Map();

  constructor(
    private supabase: SupabaseClient,
    keyManagementService: KeyManagementService,
    keyDerivation: KeyDerivation
  ) {
    this.keyManagementService = keyManagementService;
    this.keyDerivation = keyDerivation;
  }

  /**
   * Requests permission to access another user's encrypted data
   */
  async requestKeyAccess(
    requesterId: string,
    keyOwnerId: string,
    entityType: EntityType,
    entityId: string,
    privacyLevel: PrivacyLevel,
    reason: string,
    requestedPermissions: KeySharingPermissions
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Check if requester has relationship with key owner
      const relationship = await this.getRelationship(requesterId, keyOwnerId);
      if (!relationship) {
        return {
          success: false,
          error: 'No relationship exists between users'
        };
      }

      // Check if privacy level is allowed for sharing
      const relationshipConfig = await this.getRelationshipPrivacyConfig(relationship.id);
      if (relationshipConfig && !relationshipConfig.allowedSharingLevels.includes(privacyLevel)) {
        return {
          success: false,
          error: 'Requested privacy level not allowed for this relationship'
        };
      }

      const requestId = crypto.randomUUID();
      const sharingRequest: KeySharingRequest = {
        requestId,
        requestedBy: requesterId,
        keyOwnerId,
        entityType,
        entityId,
        privacyLevel,
        reason,
        permissions: requestedPermissions,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      this.sharingRequests.set(requestId, sharingRequest);

      // Auto-approve if configured
      if (relationshipConfig?.autoApproveSharing) {
        return await this.approveKeyAccess(keyOwnerId, requestId);
      }

      // Log the request
      await this.logSharingAction('requested', requestId, requesterId, keyOwnerId, privacyLevel, {
        reason,
        permissions: requestedPermissions
      });

      return { success: true, requestId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request key access'
      };
    }
  }

  /**
   * Approves a key sharing request
   */
  async approveKeyAccess(
    approverId: string,
    requestId: string
  ): Promise<{ success: boolean; keyId?: string; error?: string }> {
    try {
      const request = this.sharingRequests.get(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.keyOwnerId !== approverId) {
        return { success: false, error: 'Only key owner can approve requests' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'Request is not pending' };
      }

      // Create shared key configuration
      const keyId = await this.createSharedKey(request);
      
      const sharingConfig: KeySharingConfig = {
        keyId,
        ownerId: request.keyOwnerId,
        recipientId: request.requestedBy,
        privacyLevel: request.privacyLevel,
        permissions: request.permissions,
        entityType: request.entityType,
        entityId: request.entityId,
        sharedAt: new Date().toISOString(),
        sharedBy: approverId
      };

      this.sharingConfigs.set(keyId, sharingConfig);
      
      // Update request status
      request.status = 'approved';
      this.sharingRequests.set(requestId, request);

      // Log the approval
      await this.logSharingAction('shared', keyId, approverId, request.requestedBy, request.privacyLevel, {
        reason: 'Request approved',
        permissions: request.permissions
      });

      return { success: true, keyId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve key access'
      };
    }
  }

  /**
   * Denies a key sharing request
   */
  async denyKeyAccess(
    denierId: string,
    requestId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = this.sharingRequests.get(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      if (request.keyOwnerId !== denierId) {
        return { success: false, error: 'Only key owner can deny requests' };
      }

      if (request.status !== 'pending') {
        return { success: false, error: 'Request is not pending' };
      }

      // Update request status
      request.status = 'denied';
      this.sharingRequests.set(requestId, request);

      // Log the denial
      await this.logSharingAction('revoked', requestId, denierId, request.requestedBy, request.privacyLevel, {
        reason: reason || 'Request denied'
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deny key access'
      };
    }
  }

  /**
   * Revokes shared key access
   */
  async revokeKeyAccess(
    revokerId: string,
    keyId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = this.sharingConfigs.get(keyId);
      if (!config) {
        return { success: false, error: 'Shared key configuration not found' };
      }

      // Only owner or recipient can revoke (if they have permission)
      if (config.ownerId !== revokerId && 
          !(config.recipientId === revokerId && config.permissions.canRevoke)) {
        return { success: false, error: 'Insufficient permissions to revoke access' };
      }

      // Remove the sharing configuration
      this.sharingConfigs.delete(keyId);

      // Log the revocation
      await this.logSharingAction('revoked', keyId, revokerId, config.recipientId, config.privacyLevel, {
        reason: reason || 'Access revoked'
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke key access'
      };
    }
  }

  /**
   * Checks if a user has access to decrypt specific data
   */
  async checkDecryptionAccess(
    userId: string,
    entityType: EntityType,
    entityId: string,
    fieldType: FieldType | undefined,
    privacyLevel: PrivacyLevel
  ): Promise<{ hasAccess: boolean; keyId?: string; config?: KeySharingConfig }> {
    try {
      // User always has access to their own data
      if (entityType === EntityType.USER && entityId === userId) {
        return { hasAccess: true };
      }

      // Check for shared key configurations
      for (const [keyId, config] of this.sharingConfigs) {
        if (config.recipientId === userId &&
            config.entityType === entityType &&
            config.entityId === entityId &&
            this.isPrivacyLevelAllowed(privacyLevel, config.privacyLevel) &&
            config.permissions.canRead) {
          
          // Check field type match if specified
          if (fieldType && config.fieldType && config.fieldType !== fieldType) {
            continue;
          }

          // Check if sharing hasn't expired
          if (config.permissions.expiresAt && 
              new Date(config.permissions.expiresAt) < new Date()) {
            continue;
          }

          return { hasAccess: true, keyId, config };
        }
      }

      // Check relationship-based access
      const relationshipAccess = await this.checkRelationshipAccess(
        userId, 
        entityType, 
        entityId, 
        privacyLevel
      );

      return relationshipAccess;
    } catch (error) {
      console.error('[PRIVACY_KEY_SHARING] Error checking decryption access:', error);
      return { hasAccess: false };
    }
  }

  /**
   * Encrypts data with privacy-aware key sharing
   */
  async encryptWithSharing(
    userId: string,
    data: string,
    context: {
      entityType: EntityType;
      entityId: string;
      fieldType?: FieldType;
      privacyLevel: PrivacyLevel;
    },
    sharedWith?: string[]
  ): Promise<{ success: boolean; encryptedData?: string; keyId?: string; error?: string }> {
    try {
      const domain = this.mapPrivacyLevelToDomain(context.privacyLevel);
      
      const derivationContext: DerivationContext = {
        userId,
        domain,
        entityType: context.entityType,
        entityId: context.entityId,
        fieldType: context.fieldType
      };

      const { key, metadata } = this.keyDerivation.deriveCompleteKey(derivationContext);
      const encryptedData = this.performEncryption(data, key);

      // Set up sharing if recipients specified
      if (sharedWith && sharedWith.length > 0) {
        for (const recipientId of sharedWith) {
          const relationship = await this.getRelationship(userId, recipientId);
          if (relationship) {
            const sharingConfig: KeySharingConfig = {
              keyId: metadata.keyId,
              ownerId: userId,
              recipientId,
              privacyLevel: context.privacyLevel,
              permissions: {
                canRead: true,
                canWrite: false,
                canShare: false,
                canRevoke: false
              },
              entityType: context.entityType,
              entityId: context.entityId,
              fieldType: context.fieldType,
              sharedAt: new Date().toISOString(),
              sharedBy: userId
            };

            this.sharingConfigs.set(`${metadata.keyId}:${recipientId}`, sharingConfig);
          }
        }
      }

      return { 
        success: true, 
        encryptedData, 
        keyId: metadata.keyId 
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed'
      };
    }
  }

  /**
   * Decrypts data with privacy-aware access checking
   */
  async decryptWithAccess(
    userId: string,
    encryptedData: string,
    context: {
      entityType: EntityType;
      entityId: string;
      fieldType?: FieldType;
      privacyLevel: PrivacyLevel;
    }
  ): Promise<{ success: boolean; decryptedData?: string; error?: string }> {
    try {
      // Check access permissions
      const accessCheck = await this.checkDecryptionAccess(
        userId,
        context.entityType,
        context.entityId,
        context.fieldType,
        context.privacyLevel
      );

      if (!accessCheck.hasAccess) {
        return {
          success: false,
          error: 'Access denied: Insufficient permissions'
        };
      }

      // Derive key and decrypt
      const domain = this.mapPrivacyLevelToDomain(context.privacyLevel);
      
      const derivationContext: DerivationContext = {
        userId: accessCheck.config?.ownerId || userId, // Use original owner's key
        domain,
        entityType: context.entityType,
        entityId: context.entityId,
        fieldType: context.fieldType
      };

      const { key } = this.keyDerivation.deriveCompleteKey(derivationContext);
      const decryptedData = this.performDecryption(encryptedData, key);

      // Log access if this was shared data
      if (accessCheck.config) {
        await this.logSharingAction(
          'accessed',
          accessCheck.keyId!,
          userId,
          accessCheck.config.ownerId,
          context.privacyLevel
        );
      }

      return { success: true, decryptedData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed'
      };
    }
  }

  /**
   * Gets pending sharing requests for a user
   */
  getPendingRequests(userId: string): KeySharingRequest[] {
    return Array.from(this.sharingRequests.values())
      .filter(req => req.keyOwnerId === userId && req.status === 'pending')
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  /**
   * Gets sharing audit log for a user
   */
  getSharingAuditLog(userId: string, limit = 100): KeySharingAudit[] {
    return this.auditLog
      .filter(entry => entry.performedBy === userId || entry.targetUser === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Sets relationship privacy configuration
   */
  setRelationshipPrivacyConfig(config: RelationshipPrivacyConfig): void {
    this.relationshipConfigs.set(config.relationshipId, config);
  }

  /**
   * Gets relationship privacy configuration
   */
  getRelationshipPrivacyConfig(relationshipId: string): RelationshipPrivacyConfig | null {
    return this.relationshipConfigs.get(relationshipId) || null;
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Creates a shared key for the approved request
   */
  private async createSharedKey(request: KeySharingRequest): Promise<string> {
    const keyId = crypto.randomUUID();
    
    // In a production system, you might want to create a separate key
    // or use key wrapping techniques. For now, we use the derived key approach.
    
    return keyId;
  }

  /**
   * Maps privacy level to key domain
   */
  private mapPrivacyLevelToDomain(privacyLevel: PrivacyLevel): KeyDomain {
    switch (privacyLevel) {
      case PrivacyLevel.PRIVATE:
        return KeyDomain.PERSONAL;
      case PrivacyLevel.BUSY_ONLY:
        return KeyDomain.RELATIONSHIP;
      case PrivacyLevel.DETAILS:
        return KeyDomain.VISIBLE;
      case PrivacyLevel.PUBLIC:
        return KeyDomain.PUBLIC;
      default:
        return KeyDomain.PERSONAL;
    }
  }

  /**
   * Checks if a privacy level allows access to another privacy level
   */
  private isPrivacyLevelAllowed(requestedLevel: PrivacyLevel, allowedLevel: PrivacyLevel): boolean {
    const levels = {
      [PrivacyLevel.PUBLIC]: 0,
      [PrivacyLevel.DETAILS]: 1,
      [PrivacyLevel.BUSY_ONLY]: 2,
      [PrivacyLevel.PRIVATE]: 3
    };

    return levels[requestedLevel] <= levels[allowedLevel];
  }

  /**
   * Checks relationship-based access to data
   */
  private async checkRelationshipAccess(
    userId: string,
    entityType: EntityType,
    entityId: string,
    privacyLevel: PrivacyLevel
  ): Promise<{ hasAccess: boolean; keyId?: string }> {
    try {
      // Check if this is event data and user is part of related relationship
      if (entityType === EntityType.EVENT) {
        const { data: event } = await this.supabase
          .from('events')
          .select('creator_id, relationships(*)')
          .eq('id', entityId)
          .single();

        if (event && event.relationships) {
          // Check if user is in the relationship associated with this event
          for (const rel of event.relationships) {
            if ((rel.user_id === userId || rel.partner_id === userId) &&
                this.isPrivacyLevelAllowed(privacyLevel, rel.default_privacy_level)) {
              return { hasAccess: true };
            }
          }
        }
      }

      // Check if this is relationship data and user is part of it
      if (entityType === EntityType.RELATIONSHIP) {
        const { data: relationship } = await this.supabase
          .from('relationships')
          .select('user_id, partner_id, default_privacy_level')
          .eq('id', entityId)
          .single();

        if (relationship && 
            (relationship.user_id === userId || relationship.partner_id === userId) &&
            this.isPrivacyLevelAllowed(privacyLevel, relationship.default_privacy_level)) {
          return { hasAccess: true };
        }
      }

      return { hasAccess: false };
    } catch (error) {
      console.error('[PRIVACY_KEY_SHARING] Error checking relationship access:', error);
      return { hasAccess: false };
    }
  }

  /**
   * Gets relationship between two users
   */
  private async getRelationship(userId1: string, userId2: string): Promise<{ id: string } | null> {
    try {
      const { data: relationship } = await this.supabase
        .from('relationships')
        .select('id')
        .or(`and(user_id.eq.${userId1},partner_id.eq.${userId2}),and(user_id.eq.${userId2},partner_id.eq.${userId1})`)
        .single();

      return relationship;
    } catch (error) {
      return null;
    }
  }

  /**
   * Performs AES-256-GCM encryption
   */
  private performEncryption(data: string, key: Buffer): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Performs AES-256-GCM decryption
   */
  private performDecryption(encryptedData: string, key: Buffer): string {
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
   * Logs a key sharing action
   */
  private async logSharingAction(
    action: 'shared' | 'revoked' | 'accessed' | 'requested',
    keyId: string,
    performedBy: string,
    targetUser: string,
    privacyLevel: PrivacyLevel,
    metadata: {
      reason?: string;
      permissions?: KeySharingPermissions;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<void> {
    const auditEntry: KeySharingAudit = {
      id: crypto.randomUUID(),
      keyId,
      action,
      performedBy,
      targetUser,
      privacyLevel,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.auditLog.push(auditEntry);

    // In production, write to database
    try {
      await this.supabase
        .from('key_sharing_audit')
        .insert(auditEntry);
    } catch (error) {
      console.error('[PRIVACY_KEY_SHARING] Failed to write audit log:', error);
    }

    // Keep audit log size manageable
    if (this.auditLog.length > 5000) {
      this.auditLog = this.auditLog.slice(-2500);
    }
  }
}

/**
 * Helper functions for privacy-aware key sharing
 */
export class PrivacyKeySharingHelpers {
  /**
   * Creates a privacy key sharing service instance
   */
  static createService(
    supabase: SupabaseClient,
    keyManagementService: KeyManagementService
  ): PrivacyKeySharing {
    const keyDerivation = KeyDerivation.getInstance();
    return new PrivacyKeySharing(supabase, keyManagementService, keyDerivation);
  }

  /**
   * Creates default relationship privacy configuration
   */
  static createDefaultRelationshipConfig(
    relationshipId: string,
    userId: string,
    partnerId: string,
    tier: ConnectionTier
  ): RelationshipPrivacyConfig {
    const privacyLevel = this.mapConnectionTierToPrivacyLevel(tier);
    
    return {
      relationshipId,
      userId,
      partnerId,
      defaultPrivacyLevel: privacyLevel,
      allowedSharingLevels: this.getAllowedSharingLevels(privacyLevel),
      autoApproveSharing: tier === 'details', // Auto-approve for details tier
      requireExplicitConsent: tier === 'private' // Require consent for private tier
    };
  }

  /**
   * Maps connection tier to privacy level
   */
  static mapConnectionTierToPrivacyLevel(tier: ConnectionTier): PrivacyLevel {
    switch (tier) {
      case 'private':
        return PrivacyLevel.PRIVATE;
      case 'busy_only':
        return PrivacyLevel.BUSY_ONLY;
      case 'details':
        return PrivacyLevel.DETAILS;
      default:
        return PrivacyLevel.PRIVATE;
    }
  }

  /**
   * Gets allowed sharing levels for a privacy level
   */
  static getAllowedSharingLevels(baseLevel: PrivacyLevel): PrivacyLevel[] {
    switch (baseLevel) {
      case PrivacyLevel.PRIVATE:
        return [PrivacyLevel.PRIVATE];
      case PrivacyLevel.BUSY_ONLY:
        return [PrivacyLevel.BUSY_ONLY, PrivacyLevel.PRIVATE];
      case PrivacyLevel.DETAILS:
        return [PrivacyLevel.DETAILS, PrivacyLevel.BUSY_ONLY, PrivacyLevel.PRIVATE];
      case PrivacyLevel.PUBLIC:
        return [PrivacyLevel.PUBLIC, PrivacyLevel.DETAILS, PrivacyLevel.BUSY_ONLY, PrivacyLevel.PRIVATE];
      default:
        return [PrivacyLevel.PRIVATE];
    }
  }
}
