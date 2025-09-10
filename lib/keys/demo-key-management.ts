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

    // Store relationship
    const relationships = this.getFromStorage('demo_relationships', {});
    relationships[relationshipId] = relationship;
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
   * Encrypts demo event data
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
   * Decrypts demo event data
   */
  async decryptDemoEventData(
    userId: string,
    eventId: string,
    encryptedData: {
      title_encrypted?: string;
      description_encrypted?: string;
      location_encrypted?: string;
      notes_encrypted?: string;
    },
    privacyLevel: PrivacyLevel = PrivacyLevel.BUSY_ONLY
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

    // Decrypt each field if provided
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
            userId,
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
    
    const allRelationships = this.getFromStorage('demo_relationships', {});
    const relationships = Object.values(allRelationships).filter(
      (rel: any) => rel.userId === userId || rel.partnerId === userId
    ) as DemoRelationship[];
    
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
    
    // Create demo users
    const alice = await demoManager.createDemoUser('alice@demo.com', 'demo-password-123');
    const bob = await demoManager.createDemoUser('bob@demo.com', 'demo-password-456');
    
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
        PrivacyLevel.BUSY_ONLY
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
