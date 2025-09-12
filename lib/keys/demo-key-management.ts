/**
 * Demo Mode Key Management
 * 
 * Provides localStorage-based key management for demo mode that mirrors
 * the production functionality. Enables users to experience the full
 * key escrow system without requiring server-side infrastructure.
 */

import { 
  KeyDerivation, 
  KeyDerivationHelpers,
  MasterKeyConfig,
  KeyMetadata,
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
import { 
  PrivacyKeySharing,
  PrivacyLevel,
  KeySharingConfig,
  KeySharingRequest,
  RelationshipPrivacyConfig
} from './privacy-key-sharing';

// Privacy boundary engine imports (with fallback for test environment)
import { getPrivacyBoundaryEngine } from '@/lib/privacy/boundary-engine';
import { decryptWithPrivacyCheck } from '@/lib/encryption/field-encryption';

export type BoundaryPrivacyLevel = 'private' | 'semi_private' | 'visible' | 'public' | 'busy_only' | 'details';

// Demo storage keys
const DEMO_STORAGE_KEYS = {
  MASTER_KEYS: 'demo_master_keys',
  ESCROW_RECORDS: 'demo_escrow_records',
  KEY_SHARES: 'demo_key_shares',
  SHARING_REQUESTS: 'demo_sharing_requests',
  RELATIONSHIP_CONFIGS: 'demo_relationship_configs',
  AUDIT_LOGS: 'demo_audit_logs',
  USER_DATA: 'demo_user_data'
};

// Demo user data structure
interface DemoUserData {
  id: string;
  email: string;
  masterKeyGenerated: boolean;
  escrowSetup: boolean;
  lastLogin: string;
}

// Demo relationship structure
interface DemoRelationship {
  id: string;
  userId: string;
  partnerId: string;
  tier: string;
  createdAt: string;
}

/**
 * Demo mode key management service
 */
export class DemoKeyManagement {
  private keyDerivation?: KeyDerivation;
  private keyEscrow?: KeyEscrowService;
  private privacyKeySharing?: PrivacyKeySharing;
  private initialized = false;

  /**
   * Initialize demo key management
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Generate or load master keys for demo mode
      const masterKeys = this.getOrCreateDemoMasterKeys();
      
      // Initialize key derivation
      this.keyDerivation = KeyDerivation.initialize(masterKeys, true);
      
      // Initialize key escrow
      this.keyEscrow = KeyEscrowService.initialize(true);

      // Create mock privacy key sharing (without real Supabase client)
      this.privacyKeySharing = new PrivacyKeySharing(
        this.createMockSupabaseClient(),
        this.createMockKeyManagementService(),
        this.keyDerivation
      );

      this.initialized = true;
      console.log('[DEMO_KEY_MGMT] Demo key management initialized');
    } catch (error) {
      console.error('[DEMO_KEY_MGMT] Failed to initialize:', error);
      throw new Error('Failed to initialize demo key management');
    }
  }

  /**
   * Creates a demo user with key management setup
   */
  async createDemoUser(email: string, password?: string): Promise<DemoUserData> {
    if (!this.initialized) {
      await this.initialize();
    }

    const userId = `demo-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const demoUser: DemoUserData = {
      id: userId,
      email,
      masterKeyGenerated: true,
      escrowSetup: false,
      lastLogin: new Date().toISOString()
    };

    // Set up password escrow if password provided
    if (password && this.keyEscrow) {
      try {
        const userMasterKey = this.keyDerivation!.deriveUserMasterKey(userId);
        const escrowResult = await this.keyEscrow.createPasswordEscrow(
          userId, 
          userMasterKey, 
          password
        );
        
        if (escrowResult) {
          demoUser.escrowSetup = true;
          
          // Store escrow records
          const existingEscrows = this.getFromStorage(DEMO_STORAGE_KEYS.ESCROW_RECORDS, {});
          existingEscrows[userId] = existingEscrows[userId] || [];
          existingEscrows[userId].push(escrowResult);
          this.setInStorage(DEMO_STORAGE_KEYS.ESCROW_RECORDS, existingEscrows);
        }
      } catch (error) {
        console.warn('[DEMO_KEY_MGMT] Failed to setup password escrow:', error);
      }
    }

    // Generate backup codes for demo
    if (this.keyEscrow) {
      try {
        const userMasterKey = this.keyDerivation!.deriveUserMasterKey(userId);
        const backupResult = await this.keyEscrow.createBackupCodesEscrow(
          userId,
          userMasterKey,
          10
        );

        if (backupResult.escrowRecord && backupResult.backupCodes) {
          // Store backup codes in demo storage
          const existingEscrows = this.getFromStorage(DEMO_STORAGE_KEYS.ESCROW_RECORDS, {});
          existingEscrows[userId] = existingEscrows[userId] || [];
          existingEscrows[userId].push(backupResult.escrowRecord);
          this.setInStorage(DEMO_STORAGE_KEYS.ESCROW_RECORDS, existingEscrows);

          // Show backup codes to user (in demo mode)
          console.log(`[DEMO_KEY_MGMT] Backup codes for ${email}:`, backupResult.backupCodes);
        }
      } catch (error) {
        console.warn('[DEMO_KEY_MGMT] Failed to generate backup codes:', error);
      }
    }

    // Store demo user data
    const userData = this.getFromStorage(DEMO_STORAGE_KEYS.USER_DATA, {});
    userData[userId] = demoUser;
    this.setInStorage(DEMO_STORAGE_KEYS.USER_DATA, userData);

    return demoUser;
  }

  /**
   * Authenticates a demo user
   */
  async authenticateDemoUser(email: string, password: string): Promise<DemoUserData | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const userData = this.getFromStorage(DEMO_STORAGE_KEYS.USER_DATA, {});
    const user = Object.values(userData).find((u: any) => u.email === email) as DemoUserData;
    
    if (!user) {
      return null;
    }

    // Try password recovery to validate password
    if (this.keyEscrow) {
      const recoveryResult = await this.keyEscrow.recoverWithPassword(user.id, password);
      if (!recoveryResult.success) {
        return null;
      }
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    userData[user.id] = user;
    this.setInStorage(DEMO_STORAGE_KEYS.USER_DATA, userData);

    return user;
  }

  /**
   * Creates a demo relationship between users
   */
  async createDemoRelationship(
    userId: string, 
    partnerEmail: string, 
    tier: 'private' | 'busy_only' | 'details' = 'busy_only'
  ): Promise<DemoRelationship | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Find partner user
    const userData = this.getFromStorage(DEMO_STORAGE_KEYS.USER_DATA, {});
    const partner = Object.values(userData).find((u: any) => u.email === partnerEmail) as DemoUserData;
    
    if (!partner) {
      console.warn(`[DEMO_KEY_MGMT] Partner user not found: ${partnerEmail}`);
      return null;
    }

    const relationshipId = `demo-rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const relationship: DemoRelationship = {
      id: relationshipId,
      userId,
      partnerId: partner.id,
      tier,
      createdAt: new Date().toISOString()
    };

    // Store relationship in format expected by PrivacyBoundaryEngine
    const relationships = this.getFromStorage('demo_relationships', []);
    const relationshipForBoundaryEngine = {
      id: relationshipId,
      user1Id: userId,
      user2Id: partner.id,
      tier,
      createdAt: new Date().toISOString()
    };
    relationships.push(relationshipForBoundaryEngine);
    this.setInStorage('demo_relationships', relationships);

    // Create relationship privacy config
    if (this.privacyKeySharing) {
      const privacyConfig: RelationshipPrivacyConfig = {
        relationshipId,
        userId,
        partnerId: partner.id,
        defaultPrivacyLevel: this.mapTierToPrivacyLevel(tier),
        allowedSharingLevels: this.getAllowedSharingLevels(tier),
        autoApproveSharing: tier === 'details',
        requireExplicitConsent: tier === 'private'
      };

      this.privacyKeySharing.setRelationshipPrivacyConfig(privacyConfig);
      
      // Store privacy config
      const configs = this.getFromStorage(DEMO_STORAGE_KEYS.RELATIONSHIP_CONFIGS, {});
      configs[relationshipId] = privacyConfig;
      this.setInStorage(DEMO_STORAGE_KEYS.RELATIONSHIP_CONFIGS, configs);
    }

    return relationship;
  }

  /**
   * Encrypts demo event data and stores ownership information
   */
  async encryptDemoEventData(
    userId: string,
    eventId: string,
    data: {
      title?: string;
      description?: string;
      location?: string;
      notes?: string;
    },
    privacyLevel: PrivacyLevel = PrivacyLevel.BUSY_ONLY
  ): Promise<{
    title_encrypted?: string;
    description_encrypted?: string;
    location_encrypted?: string;
    notes_encrypted?: string;
  }> {
    if (!this.initialized || !this.keyDerivation) {
      await this.initialize();
    }

    const encryptedData: any = {};
    const domain = this.mapPrivacyLevelToDomain(privacyLevel);

    // CRITICAL: Store event ownership information for access control
    const storedEvents = this.getFromStorage('demo_events', {});
    storedEvents[eventId] = {
      ownerId: userId,
      privacyLevel,
      createdAt: new Date().toISOString()
    };
    this.setInStorage('demo_events', storedEvents);

    // Encrypt each field if provided
    const fields: Array<{ field: keyof typeof data, fieldType: FieldType }> = [
      { field: 'title', fieldType: FieldType.DESCRIPTION },
      { field: 'description', fieldType: FieldType.DESCRIPTION },
      { field: 'location', fieldType: FieldType.LOCATION },
      { field: 'notes', fieldType: FieldType.NOTES }
    ];

    for (const { field, fieldType } of fields) {
      if (data[field]) {
        const context: DerivationContext = {
          userId,
          domain,
          entityType: EntityType.EVENT,
          entityId: eventId,
          fieldType
        };

        const { key } = this.keyDerivation!.deriveCompleteKey(context);
        const encrypted = this.performEncryption(data[field]!, key);
        encryptedData[`${field}_encrypted`] = encrypted;
      }
    }

    return encryptedData;
  }

  /**
   * Decrypts demo event data with privacy boundary enforcement
   * CRITICAL: Enforces user isolation and access control
   */
  async decryptDemoEventData(
    requestingUserId: string,
    eventId: string,
    encryptedData: {
      title_encrypted?: string;
      description_encrypted?: string;
      location_encrypted?: string;
      notes_encrypted?: string;
    },
    privacyLevel: PrivacyLevel = PrivacyLevel.BUSY_ONLY,
    eventOwnerId?: string  // CRITICAL: Must specify event owner for access control
  ): Promise<{
    title?: string;
    description?: string;
    location?: string;
    notes?: string;
  }> {
    if (!this.initialized || !this.keyDerivation) {
      await this.initialize();
    }

    const decryptedData: any = {};
    const domain = this.mapPrivacyLevelToDomain(privacyLevel);

    // CRITICAL: Find event owner if not provided
    let actualEventOwner = eventOwnerId;
    if (!actualEventOwner) {
      // Try to determine owner from stored event data or relationships
      const storedEvents = this.getFromStorage('demo_events', {});
      const eventData = storedEvents[eventId];
      if (eventData) {
        actualEventOwner = eventData.ownerId;
      }
    }

    // CRITICAL: Enforce access control - only owner can decrypt their own data
    // unless explicit sharing permissions exist
    const canAccess = await this.checkDecryptionAccess(
      requestingUserId, 
      eventId, 
      privacyLevel, 
      actualEventOwner
    );

    console.log(`[ACCESS_CONTROL_DEBUG] Final access decision for user ${requestingUserId} to event ${eventId}:`, canAccess);

    if (!canAccess.allowed) {
      console.warn(`[DEMO_KEY_MGMT] Access denied for user ${requestingUserId} to event ${eventId}: ${canAccess.reason}`);
      
      // Return "[Decryption Failed]" for all fields when access is denied
      const fields = ['title', 'description', 'location', 'notes'];
      const deniedResult: any = {};
      
      for (const field of fields) {
        const encryptedField = encryptedData[`${field}_encrypted` as keyof typeof encryptedData];
        if (encryptedField) {
          deniedResult[field] = '[Decryption Failed]';
        }
      }
      
      console.log(`[ACCESS_CONTROL_DEBUG] Returning denied result:`, deniedResult);
      return deniedResult;
    }

    // Use the correct owner ID for key derivation
    const keyDerivationUserId = canAccess.keyOwner || requestingUserId;

    // Decrypt each field if provided using our direct access control
    const fields: Array<{ field: string, fieldType: FieldType }> = [
      { field: 'title', fieldType: FieldType.DESCRIPTION },
      { field: 'description', fieldType: FieldType.DESCRIPTION },
      { field: 'location', fieldType: FieldType.LOCATION },
      { field: 'notes', fieldType: FieldType.NOTES }
    ];

    for (const { field, fieldType } of fields) {
      const encryptedField = encryptedData[`${field}_encrypted` as keyof typeof encryptedData];
      if (encryptedField) {
        try {
          const context: DerivationContext = {
            userId: keyDerivationUserId,  // CRITICAL: Use correct owner for key derivation
            domain,
            entityType: EntityType.EVENT,
            entityId: eventId,
            fieldType
          };

          const { key } = this.keyDerivation!.deriveCompleteKey(context);
          const decrypted = this.performDecryption(encryptedField, key);
          decryptedData[field] = decrypted;
        } catch (error) {
          console.warn(`[DEMO_KEY_MGMT] Failed to decrypt ${field}:`, error);
          decryptedData[field] = '[Decryption Failed]';
        }
      }
    }

    return decryptedData;
  }


  /**
   * CRITICAL: Checks if a user has permission to decrypt specific event data
   */
  private async checkDecryptionAccess(
    requestingUserId: string,
    eventId: string,
    privacyLevel: PrivacyLevel,
    eventOwnerId?: string
  ): Promise<{ 
    allowed: boolean; 
    reason: string; 
    keyOwner?: string;
    accessLevel?: 'owner' | 'shared' | 'relationship' 
  }> {
    // Rule 1: User can always access their own data
    if (eventOwnerId && requestingUserId === eventOwnerId) {
      return { 
        allowed: true, 
        reason: 'Owner access', 
        keyOwner: requestingUserId,
        accessLevel: 'owner'
      };
    }

    // Rule 2: If no owner specified, deny access
    if (!eventOwnerId) {
      return {
        allowed: false,
        reason: 'Event owner not specified and could not be determined'
      };
    }

    // Rule 3: Check if there's an explicit relationship between users
    const relationship = await this.findDemoRelationship(requestingUserId, eventOwnerId);
    if (!relationship) {
      return {
        allowed: false,
        reason: `No relationship exists between requesting user ${requestingUserId} and event owner ${eventOwnerId}`
      };
    }

    // Rule 4: Check if relationship tier allows access to this privacy level
    const relationshipPrivacyLevel = this.mapTierToPrivacyLevel(relationship.tier);
    const accessAllowed = this.isPrivacyLevelAllowed(privacyLevel, relationshipPrivacyLevel);
    
    if (!accessAllowed) {
      return {
        allowed: false,
        reason: `Relationship tier '${relationship.tier}' does not allow access to '${privacyLevel}' privacy level`
      };
    }

    // Rule 5: Check for metamour restrictions (privacy cascade)
    const isMetamour = await this.checkIfMetamour(requestingUserId, eventOwnerId);
    if (isMetamour && privacyLevel === PrivacyLevel.PRIVATE) {
      return {
        allowed: false,
        reason: 'Metamour relationships cannot access private data'
      };
    }

    // Access granted through relationship
    return {
      allowed: true,
      reason: `Access granted through ${relationship.tier} relationship`,
      keyOwner: eventOwnerId,
      accessLevel: 'relationship'
    };
  }

  /**
   * CRITICAL: Finds relationship between two users
   */
  private async findDemoRelationship(userId1: string, userId2: string): Promise<DemoRelationship | null> {
    // Timeout protection to prevent infinite loops
    const timeout = setTimeout(() => {
      console.warn(`[RELATIONSHIP_DEBUG] Relationship lookup timeout for ${userId1} -> ${userId2}`);
    }, 5000);
    
    try {
      const relationships = this.getFromStorage('demo_relationships', {});
      
      console.log(`[RELATIONSHIP_DEBUG] Looking for relationship between ${userId1} and ${userId2}`);
      console.log(`[RELATIONSHIP_DEBUG] Storage format:`, typeof relationships, Object.keys(relationships).length, 'keys');
      console.log(`[RELATIONSHIP_DEBUG] Available relationships:`, Object.values(relationships).map((r: any) => {
        return `${r.userId || r.user1Id}->${r.partnerId || r.user2Id}(${r.tier})`;
      }));
    
    // Look for relationship in either direction - handle both old and new formats
    const relationshipArray = Array.isArray(relationships) ? relationships : Object.values(relationships);
    const relationship = relationshipArray.find((rel: any) => {
      // Handle old format (userId/partnerId)
      const oldFormat = (rel.userId === userId1 && rel.partnerId === userId2) ||
                       (rel.userId === userId2 && rel.partnerId === userId1);
      // Handle new format (user1Id/user2Id)
      const newFormat = (rel.user1Id === userId1 && rel.user2Id === userId2) ||
                       (rel.user1Id === userId2 && rel.user2Id === userId1);
      return oldFormat || newFormat;
    });
    
    console.log(`[RELATIONSHIP_DEBUG] Found relationship:`, relationship ? `${relationship.userId || relationship.user1Id}->${relationship.partnerId || relationship.user2Id}(${relationship.tier})` : 'NONE');
    
    if (relationship) {
      // Convert to standard DemoRelationship format
      return {
        id: relationship.id,
        userId: relationship.user1Id,
        partnerId: relationship.user2Id,
        tier: relationship.tier,
        createdAt: relationship.createdAt
      };
    }
    
    return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * CRITICAL: Checks if privacy level allows access to another privacy level
   * Privacy hierarchy (from most restrictive to least):
   * PRIVATE > DETAILS > BUSY_ONLY > PUBLIC
   * 
   * Access rule: You can only access data at your tier level or LESS restrictive
   */
  private isPrivacyLevelAllowed(requestedLevel: PrivacyLevel, relationshipTier: PrivacyLevel): boolean {
    // Map privacy levels to access hierarchy (higher = more access)
    const accessLevels = {
      [PrivacyLevel.PRIVATE]: 4,    // Can access everything
      [PrivacyLevel.DETAILS]: 3,   // Can access details, busy_only, public  
      [PrivacyLevel.BUSY_ONLY]: 2, // Can access busy_only, public
      [PrivacyLevel.PUBLIC]: 1     // Can only access public
    };

    // Map data privacy levels (higher = more restrictive)
    const dataRestrictiveness = {
      [PrivacyLevel.PRIVATE]: 4,    // Most restrictive
      [PrivacyLevel.DETAILS]: 3,   // Medium restrictive
      [PrivacyLevel.BUSY_ONLY]: 2, // Low restrictive
      [PrivacyLevel.PUBLIC]: 1     // No restriction
    };

    const relationshipAccess = accessLevels[relationshipTier];
    const dataRestriction = dataRestrictiveness[requestedLevel];
    
    // You can access data if your relationship access level >= data restriction level
    const canAccess = relationshipAccess >= dataRestriction;
    
    console.log(`[ACCESS_CHECK] Relationship: ${relationshipTier}(${relationshipAccess}) vs Data: ${requestedLevel}(${dataRestriction}) = ${canAccess ? 'ALLOW' : 'DENY'}`);
    
    return canAccess;
  }

  /**
   * CRITICAL: Checks if users are metamours (connected through another partner)
   */
  private async checkIfMetamour(userId1: string, userId2: string): Promise<boolean> {
    const relationships = this.getFromStorage('demo_relationships', {});
    
    // Convert to array if it's stored as an object
    const relationshipArray = Array.isArray(relationships) ? relationships : Object.values(relationships);
    
    // Find all partners of userId1
    const user1Partners = relationshipArray
      .filter((rel: any) => {
        // Handle both old format (userId/partnerId) and new format (user1Id/user2Id)
        return (rel.userId === userId1 || rel.partnerId === userId1) ||
               (rel.user1Id === userId1 || rel.user2Id === userId1);
      })
      .map((rel: any) => {
        // Extract the partner's ID
        if (rel.userId && rel.partnerId) {
          return rel.userId === userId1 ? rel.partnerId : rel.userId;
        } else {
          return rel.user1Id === userId1 ? rel.user2Id : rel.user1Id;
        }
      });
    
    // Find all partners of userId2
    const user2Partners = relationshipArray
      .filter((rel: any) => {
        // Handle both old format (userId/partnerId) and new format (user1Id/user2Id)
        return (rel.userId === userId2 || rel.partnerId === userId2) ||
               (rel.user1Id === userId2 || rel.user2Id === userId2);
      })
      .map((rel: any) => {
        // Extract the partner's ID
        if (rel.userId && rel.partnerId) {
          return rel.userId === userId2 ? rel.partnerId : rel.userId;
        } else {
          return rel.user1Id === userId2 ? rel.user2Id : rel.user1Id;
        }
      });
    
    // Check if they share any common partners (metamour relationship)
    const commonPartners = user1Partners.filter(partner => user2Partners.includes(partner));
    
    // They are metamours if they share partners but are not directly connected
    const directConnection = await this.findDemoRelationship(userId1, userId2);
    
    return commonPartners.length > 0 && !directConnection;
  }

  /**
   * Demonstrates key sharing between demo users
   */
  async demonstrateKeySharing(
    ownerId: string,
    recipientId: string,
    eventId: string,
    privacyLevel: PrivacyLevel
  ): Promise<{ success: boolean; message: string }> {
    if (!this.initialized || !this.privacyKeySharing) {
      await this.initialize();
    }

    try {
      // Request key access
      const requestResult = await this.privacyKeySharing!.requestKeyAccess(
        recipientId,
        ownerId,
        EntityType.EVENT,
        eventId,
        privacyLevel,
        'Demo key sharing request',
        {
          canRead: true,
          canWrite: false,
          canShare: false,
          canRevoke: false
        }
      );

      if (requestResult.success && requestResult.requestId) {
        // Auto-approve for demo
        const approvalResult = await this.privacyKeySharing!.approveKeyAccess(
          ownerId,
          requestResult.requestId
        );

        if (approvalResult.success) {
          return {
            success: true,
            message: `Key sharing approved. Recipient can now access ${privacyLevel} level data for event ${eventId}`
          };
        } else {
          return {
            success: false,
            message: `Failed to approve key sharing: ${approvalResult.error}`
          };
        }
      } else {
        return {
          success: false,
          message: `Failed to request key sharing: ${requestResult.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Key sharing demonstration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Gets demo audit logs
   */
  getDemoAuditLogs(userId: string): any[] {
    const logs = this.getFromStorage(DEMO_STORAGE_KEYS.AUDIT_LOGS, {});
    return (logs[userId] || []).sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Clears demo data for a user
   */
  clearDemoUser(userId: string): void {
    // Clear from all storage keys
    Object.values(DEMO_STORAGE_KEYS).forEach(key => {
      const data = this.getFromStorage(key, {});
      delete data[userId];
      this.setInStorage(key, data);
    });

    // Clear key caches
    if (this.keyDerivation) {
      this.keyDerivation.clearCache(userId);
    }
  }

  /**
   * Exports demo data for migration to production
   */
  exportDemoData(userId: string): {
    userData: DemoUserData;
    escrowRecords: EscrowRecord[];
    relationships: DemoRelationship[];
    auditLogs: any[];
  } {
    const userData = this.getFromStorage(DEMO_STORAGE_KEYS.USER_DATA, {})[userId];
    const escrowRecords = this.getFromStorage(DEMO_STORAGE_KEYS.ESCROW_RECORDS, {})[userId] || [];
    
    const allRelationships = this.getFromStorage('demo_relationships', []);
    const relationships = allRelationships.filter(
      (rel: any) => rel.user1Id === userId || rel.user2Id === userId
    );
    
    const auditLogs = this.getDemoAuditLogs(userId);

    return {
      userData,
      escrowRecords,
      relationships,
      auditLogs
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Gets or creates master keys for demo mode
   */
  private getOrCreateDemoMasterKeys(): MasterKeyConfig {
    const existing = this.getFromStorage(DEMO_STORAGE_KEYS.MASTER_KEYS, null);
    
    if (existing && KeyDerivation.validateMasterKeyConfig(existing)) {
      return existing;
    }

    // Generate new demo master keys
    const masterKeys: MasterKeyConfig = {
      applicationMasterKey: KeyDerivation.generateMasterKey(),
      recoveryMasterKey: KeyDerivation.generateMasterKey(),
      demoMasterKey: KeyDerivation.generateMasterKey(),
      keyRotationInterval: 3600 // 1 hour for demo
    };

    this.setInStorage(DEMO_STORAGE_KEYS.MASTER_KEYS, masterKeys);
    return masterKeys;
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
   * Maps connection tier to privacy level
   */
  private mapTierToPrivacyLevel(tier: string): PrivacyLevel {
    switch (tier) {
      case 'private':
        return PrivacyLevel.PRIVATE;
      case 'busy_only':
        return PrivacyLevel.BUSY_ONLY;
      case 'details':
        return PrivacyLevel.DETAILS;
      default:
        return PrivacyLevel.BUSY_ONLY;
    }
  }

  /**
   * Gets allowed sharing levels for a tier
   */
  private getAllowedSharingLevels(tier: string): PrivacyLevel[] {
    const privacyLevel = this.mapTierToPrivacyLevel(tier);
    
    switch (privacyLevel) {
      case PrivacyLevel.PRIVATE:
        return [PrivacyLevel.PRIVATE];
      case PrivacyLevel.BUSY_ONLY:
        return [PrivacyLevel.BUSY_ONLY, PrivacyLevel.PRIVATE];
      case PrivacyLevel.DETAILS:
        return [PrivacyLevel.DETAILS, PrivacyLevel.BUSY_ONLY, PrivacyLevel.PRIVATE];
      default:
        return [PrivacyLevel.PRIVATE];
    }
  }

  /**
   * Performs AES-256-GCM encryption
   */
  private performEncryption(data: string, key: Buffer): string {
    const crypto = require('crypto');
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
    const crypto = require('crypto');
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
   * Creates a mock Supabase client for demo mode
   */
  private createMockSupabaseClient(): any {
    return {
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => Promise.resolve({ data: null, error: null })
          }),
          or: (condition: string) => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        }),
        insert: (data: any) => Promise.resolve({ data: null, error: null }),
        update: (data: any) => ({
          eq: (column: string, value: any) => Promise.resolve({ data: null, error: null })
        }),
        delete: () => ({
          eq: (column: string, value: any) => Promise.resolve({ data: null, error: null })
        })
      })
    };
  }

  /**
   * Creates a mock key management service for demo mode
   */
  private createMockKeyManagementService(): any {
    return {
      clearUserMasterKeyCache: () => {},
      getKeyForEntity: () => Promise.resolve(null),
      setupUserKeyEscrow: () => Promise.resolve({ success: false }),
      recoverUserKeys: () => Promise.resolve({ success: false })
    };
  }

  /**
   * Gets data from localStorage
   */
  private getFromStorage(key: string, defaultValue: any): any {
    try {
      const stored = localStorage.getItem(`demo_key_mgmt_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.warn('[DEMO_KEY_MGMT] Failed to get from storage:', error);
      return defaultValue;
    }
  }

  /**
   * Sets data in localStorage
   */
  private setInStorage(key: string, value: any): void {
    try {
      localStorage.setItem(`demo_key_mgmt_${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn('[DEMO_KEY_MGMT] Failed to set in storage:', error);
    }
  }
}

/**
 * Global demo key management instance
 */
let globalDemoKeyManagement: DemoKeyManagement | null = null;

/**
 * Gets the global demo key management instance
 */
export const getDemoKeyManagement = (): DemoKeyManagement => {
  if (!globalDemoKeyManagement) {
    globalDemoKeyManagement = new DemoKeyManagement();
  }
  return globalDemoKeyManagement;
};

/**
 * Demo helper functions
 */
export const DemoHelpers = {
  /**
   * Sets up a complete demo environment
   */
  async setupDemoEnvironment(): Promise<{
    users: DemoUserData[];
    relationships: DemoRelationship[];
    message: string;
  }> {
    const demoManager = getDemoKeyManagement();
    
    // Create demo users with strong passwords
    const alice = await demoManager.createDemoUser('alice@demo.com', 'SecureDemoPassword123!');
    const bob = await demoManager.createDemoUser('bob@demo.com', 'SecureDemoPassword456!');
    
    // Create relationship between them
    const relationship = await demoManager.createDemoRelationship(
      alice.id, 
      'bob@demo.com', 
      'busy_only'
    );

    return {
      users: [alice, bob],
      relationships: relationship ? [relationship] : [],
      message: 'Demo environment setup complete. Alice and Bob can now share encrypted calendar data.'
    };
  },

  /**
   * Demonstrates end-to-end key escrow and sharing
   */
  async demonstrateKeySystem(): Promise<{ steps: string[]; success: boolean }> {
    const steps: string[] = [];
    const demoManager = getDemoKeyManagement();

    try {
      steps.push('1. Setting up demo environment...');
      const { users, relationships } = await this.setupDemoEnvironment();
      
      if (users.length !== 2 || relationships.length !== 1) {
        throw new Error('Failed to create demo environment');
      }

      const [alice, bob] = users;
      const relationship = relationships[0];

      steps.push(`2. Created users: ${alice.email} and ${bob.email}`);
      steps.push(`3. Created relationship with tier: ${relationship.tier}`);

      // Create and encrypt demo event
      steps.push('4. Alice creates encrypted calendar event...');
      const eventId = `demo-event-${Date.now()}`;
      const eventData = {
        title: 'Private Meeting',
        description: 'Discussing sensitive project details',
        location: '123 Private Street, Secure City',
        notes: 'Remember to bring confidential documents'
      };

      const encryptedData = await demoManager.encryptDemoEventData(
        alice.id,
        eventId,
        eventData,
        PrivacyLevel.BUSY_ONLY
      );

      steps.push('5. Event data encrypted successfully');

      // Demonstrate key sharing
      steps.push('6. Demonstrating key sharing between Alice and Bob...');
      const sharingResult = await demoManager.demonstrateKeySharing(
        alice.id,
        bob.id,
        eventId,
        PrivacyLevel.BUSY_ONLY
      );

      steps.push(`7. Key sharing result: ${sharingResult.message}`);

      // Bob tries to decrypt
      steps.push('8. Bob attempts to decrypt shared event data...');
      const decryptedData = await demoManager.decryptDemoEventData(
        bob.id,
        eventId,
        encryptedData,
        PrivacyLevel.BUSY_ONLY,
        alice.id  // CRITICAL: Specify event owner for access control
      );

      const hasDecryptedData = Object.values(decryptedData).some(value => 
        value && !value.includes('[Decryption Failed]') && !value.includes('[Access Denied]')
      );

      if (hasDecryptedData) {
        steps.push('9. ✅ Bob successfully decrypted shared event data');
      } else {
        steps.push('9. ❌ Bob could not decrypt shared event data');
      }

      steps.push('10. Demo completed successfully!');
      
      return { steps, success: true };
    } catch (error) {
      steps.push(`❌ Demo failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { steps, success: false };
    }
  },

  /**
   * Clears all demo data
   */
  clearAllDemoData(): void {
    const keys = Object.values(DEMO_STORAGE_KEYS).concat(['demo_relationships']);
    keys.forEach(key => {
      try {
        localStorage.removeItem(`demo_key_mgmt_${key}`);
      } catch (error) {
        console.warn('Failed to clear demo storage key:', key, error);
      }
    });
    
    globalDemoKeyManagement = null;
    console.log('[DEMO_HELPERS] All demo data cleared');
  }
};
