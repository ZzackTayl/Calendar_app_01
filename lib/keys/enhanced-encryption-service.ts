/**
 * Enhanced Encryption Service
 * 
 * Integrates with the key management system to provide
 * context-aware encryption based on permission layers
 */

import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { KeyManagementService } from './key-management-service';
import { PermissionResolutionService, PrivacyLevel } from './permission-resolution-service';

export interface EncryptionContext {
  userId: string;
  entityType: 'event' | 'relationship' | 'group' | 'user';
  entityId: string;
  fieldType: 'description' | 'location' | 'notes' | 'phone' | 'personal_details';
}

export interface EncryptedData {
  encryptedValue: string;
  encryptionKeyId: string;
  algorithm: 'AES-256-GCM';
  iv: string;
  authTag: string;
  metadata?: {
    fieldType: string;
    entityType: string;
    entityId: string;
    encryptedAt: string;
  };
}

export interface DecryptionResult {
  decryptedValue: string;
  keyId: string;
  canAccess: boolean;
}

export class EnhancedEncryptionService {
  constructor(
    private supabase: SupabaseClient,
    private keyService: KeyManagementService,
    private permissionService: PermissionResolutionService
  ) {}

  /**
   * Encrypts a field value using the appropriate key for the context
   */
  async encryptField(
    context: EncryptionContext,
    value: string
  ): Promise<EncryptedData> {
    try {
      if (!value || value.trim() === '') {
        throw new Error('Cannot encrypt empty value');
      }

      // Get the appropriate encryption key for this context
      const keyId = await this.getEncryptionKeyForContext(context);
      const encryptionKey = await this.keyService.getKeyForEntity(
        context.userId,
        context.entityId,
        context.entityType === 'user' ? 'event' : context.entityType
      );

      if (!encryptionKey) {
        throw new Error('No encryption key available for context');
      }

      // Generate IV for this encryption
      const iv = crypto.randomBytes(16);
      
      // Create cipher with proper IV
      const cipher = crypto.createCipherGCM('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
      cipher.setAAD(Buffer.from(JSON.stringify({
        entityType: context.entityType,
        entityId: context.entityId,
        fieldType: context.fieldType
      })));

      // Encrypt the value
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      return {
        encryptedValue: encrypted,
        encryptionKeyId: keyId,
        algorithm: 'AES-256-GCM',
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        metadata: {
          fieldType: context.fieldType,
          entityType: context.entityType,
          entityId: context.entityId,
          encryptedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[ENCRYPTION] Failed to encrypt field:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypts a field value if the user has permission
   */
  async decryptField(
    userId: string,
    encryptedData: EncryptedData | string,
    context?: EncryptionContext
  ): Promise<DecryptionResult> {
    try {
      // Handle legacy string format
      let data: EncryptedData;
      if (typeof encryptedData === 'string') {
        // Try to parse as structured format
        try {
          data = JSON.parse(encryptedData);
        } catch {
          // Legacy format - decrypt using global key
          const decryptedValue = await this.decryptLegacyFormat(encryptedData);
          return {
            decryptedValue,
            keyId: 'legacy',
            canAccess: true
          };
        }
      } else {
        data = encryptedData;
      }

      // Check if user has access to the encryption key
      const entityType = context?.entityType || data.metadata?.entityType;
      const entityId = context?.entityId || data.metadata?.entityId;
      
      if (!entityType || !entityId) {
        throw new Error('Insufficient context for decryption');
      }

      const encryptionKey = await this.keyService.getKeyForEntity(
        userId,
        entityId,
        entityType as 'event' | 'relationship' | 'group'
      );

      if (!encryptionKey) {
        return {
          decryptedValue: '[Encrypted - Access Denied]',
          keyId: data.encryptionKeyId,
          canAccess: false
        };
      }

      // Decrypt the value
      const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), Buffer.from(data.iv, 'hex'));
      
      // Set auth tag and AAD
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      decipher.setAAD(Buffer.from(JSON.stringify({
        entityType: data.metadata?.entityType,
        entityId: data.metadata?.entityId,
        fieldType: data.metadata?.fieldType
      })));

      let decrypted = decipher.update(data.encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        decryptedValue: decrypted,
        keyId: data.encryptionKeyId,
        canAccess: true
      };
    } catch (error) {
      console.error('[ENCRYPTION] Failed to decrypt field:', error);
      return {
        decryptedValue: '[Decryption Failed]',
        keyId: typeof encryptedData === 'string' ? 'unknown' : encryptedData.encryptionKeyId,
        canAccess: false
      };
    }
  }

  /**
   * Encrypts event data based on privacy level and permissions
   */
  async encryptEventData(
    userId: string,
    eventId: string,
    eventData: {
      description?: string;
      location?: string;
      notes?: string;
    },
    privacyLevel: PrivacyLevel = PrivacyLevel.PRIVATE
  ): Promise<{
    description_encrypted?: string;
    location_encrypted?: string;
    notes_encrypted?: string;
  }> {
    const encryptedData: any = {};

    const context: EncryptionContext = {
      userId,
      entityType: 'event',
      entityId: eventId,
      fieldType: 'description' // Will be overridden for each field
    };

    // Only encrypt if privacy level requires it
    if (privacyLevel === PrivacyLevel.PRIVATE || privacyLevel === PrivacyLevel.SEMI_PRIVATE) {
      if (eventData.description && this.shouldEncryptField(eventData.description, 'description')) {
        const encrypted = await this.encryptField(
          { ...context, fieldType: 'description' },
          eventData.description
        );
        encryptedData.description_encrypted = JSON.stringify(encrypted);
      }

      if (eventData.location && this.shouldEncryptField(eventData.location, 'location')) {
        const encrypted = await this.encryptField(
          { ...context, fieldType: 'location' },
          eventData.location
        );
        encryptedData.location_encrypted = JSON.stringify(encrypted);
      }

      if (eventData.notes && this.shouldEncryptField(eventData.notes, 'notes')) {
        const encrypted = await this.encryptField(
          { ...context, fieldType: 'notes' },
          eventData.notes
        );
        encryptedData.notes_encrypted = JSON.stringify(encrypted);
      }
    }

    return encryptedData;
  }

  /**
   * Decrypts event data for a user
   */
  async decryptEventData(
    userId: string,
    eventData: {
      id: string;
      description?: string;
      location?: string;
      notes?: string;
      description_encrypted?: string;
      location_encrypted?: string;
      notes_encrypted?: string;
    }
  ): Promise<{
    description?: string;
    location?: string;
    notes?: string;
  }> {
    const decryptedData: any = {};

    const context: EncryptionContext = {
      userId,
      entityType: 'event',
      entityId: eventData.id,
      fieldType: 'description' // Will be overridden for each field
    };

    // Decrypt description
    if (eventData.description_encrypted) {
      const result = await this.decryptField(
        userId,
        eventData.description_encrypted,
        { ...context, fieldType: 'description' }
      );
      decryptedData.description = result.canAccess ? result.decryptedValue : eventData.description;
    } else {
      decryptedData.description = eventData.description;
    }

    // Decrypt location
    if (eventData.location_encrypted) {
      const result = await this.decryptField(
        userId,
        eventData.location_encrypted,
        { ...context, fieldType: 'location' }
      );
      decryptedData.location = result.canAccess ? result.decryptedValue : eventData.location;
    } else {
      decryptedData.location = eventData.location;
    }

    // Decrypt notes
    if (eventData.notes_encrypted) {
      const result = await this.decryptField(
        userId,
        eventData.notes_encrypted,
        { ...context, fieldType: 'notes' }
      );
      decryptedData.notes = result.canAccess ? result.decryptedValue : eventData.notes;
    } else {
      decryptedData.notes = eventData.notes;
    }

    return decryptedData;
  }

  /**
   * Encrypts user sensitive data
   */
  async encryptUserData(
    userId: string,
    userData: {
      phone?: string;
      personal_details?: any;
    }
  ): Promise<{
    phone_encrypted?: string;
    personal_details_encrypted?: string;
  }> {
    const encryptedData: any = {};

    const context: EncryptionContext = {
      userId,
      entityType: 'user',
      entityId: userId,
      fieldType: 'phone' // Will be overridden for each field
    };

    if (userData.phone && this.shouldEncryptField(userData.phone, 'phone')) {
      const encrypted = await this.encryptField(
        { ...context, fieldType: 'phone' },
        userData.phone
      );
      encryptedData.phone_encrypted = JSON.stringify(encrypted);
    }

    if (userData.personal_details) {
      const encrypted = await this.encryptField(
        { ...context, fieldType: 'personal_details' },
        JSON.stringify(userData.personal_details)
      );
      encryptedData.personal_details_encrypted = JSON.stringify(encrypted);
    }

    return encryptedData;
  }

  /**
   * Gets the appropriate encryption key ID for a context
   */
  private async getEncryptionKeyForContext(context: EncryptionContext): Promise<string> {
    switch (context.entityType) {
      case 'event':
        // For events, get the event's encryption key or create one
        const { data: event } = await this.supabase
          .from('events')
          .select('encryption_key_id, creator_id')
          .eq('id', context.entityId)
          .single();

        if (event?.encryption_key_id) {
          return event.encryption_key_id;
        }

        // Create new event key if none exists
        return await this.keyService.createEventKey(
          event?.creator_id || context.userId,
          context.entityId,
          []
        );

      case 'relationship':
        // Get relationship key
        const { data: relationship } = await this.supabase
          .from('relationships')
          .select('encryption_key_id, user_id, partner_id')
          .eq('id', context.entityId)
          .single();

        if (relationship?.encryption_key_id) {
          return relationship.encryption_key_id;
        }

        // Create new relationship key
        return await this.keyService.createRelationshipKey(
          relationship.user_id,
          relationship.partner_id,
          context.entityId
        );

      case 'group':
        // Get group key
        const { data: group } = await this.supabase
          .from('groups')
          .select('encryption_key_id, created_by')
          .eq('id', context.entityId)
          .single();

        if (group?.encryption_key_id) {
          return group.encryption_key_id;
        }

        // Get group members to create key
        const { data: members } = await this.supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', context.entityId);

        const memberIds = members?.map(m => m.user_id) || [];

        return await this.keyService.createGroupKey(
          group.created_by,
          context.entityId,
          memberIds
        );

      case 'user':
        // For user data, create a personal key
        return await this.keyService.createEventKey(
          context.userId,
          context.entityId,
          []
        );

      default:
        throw new Error(`Unknown entity type: ${context.entityType}`);
    }
  }

  /**
   * Determines if a field should be encrypted based on content
   */
  private shouldEncryptField(value: string, fieldType: string): boolean {
    if (!value || value.trim() === '') return false;

    // Always encrypt these field types
    if (['phone', 'personal_details', 'notes'].includes(fieldType)) {
      return true;
    }

    // For descriptions and locations, check for sensitive content
    if (fieldType === 'description' || fieldType === 'location') {
      const sensitiveKeywords = [
        // Medical keywords
        'doctor', 'hospital', 'clinic', 'therapy', 'medical', 'appointment',
        'checkup', 'consultation', 'treatment', 'medication', 'prescription',
        'surgery', 'procedure', 'test', 'scan', 'x-ray', 'blood work',
        'dentist', 'dental', 'orthodontist', 'chiropractor', 'physical therapy',
        'mental health', 'counseling', 'psychiatrist', 'psychologist',
        
        // Personal/intimate keywords
        'private', 'personal', 'intimate', 'secret', 'confidential',
        'date night', 'anniversary', 'romantic', 'relationship',
        'family', 'parents', 'children', 'kids',
        
        // Financial keywords
        'bank', 'financial', 'loan', 'mortgage', 'tax', 'attorney',
        'lawyer', 'legal', 'court', 'hearing',
        
        // Address patterns (basic detection)
        'home', 'house', 'apartment', 'address', 'residence'
      ];

      const lowerValue = value.toLowerCase();
      const hasSensitiveKeyword = sensitiveKeywords.some(keyword => 
        lowerValue.includes(keyword)
      );

      // Check for address-like patterns
      const hasAddressPattern = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|place|pl|court|ct)/i.test(value);
      
      return hasSensitiveKeyword || hasAddressPattern;
    }

    return false;
  }

  /**
   * Decrypts legacy format data (fallback for existing encrypted data)
   */
  private async decryptLegacyFormat(encryptedValue: string): Promise<string> {
    // This would use the global encryption key for legacy data
    // Implementation depends on existing encryption format
    try {
      const { decrypt } = await import('@/lib/encryption');
      return decrypt(encryptedValue);
    } catch {
      return '[Legacy Decryption Failed]';
    }
  }

  /**
   * Migrates legacy encrypted data to new format
   */
  async migrateLegacyData(
    userId: string,
    entityType: 'event' | 'user',
    entityId: string,
    legacyEncryptedData: Record<string, string>
  ): Promise<Record<string, string>> {
    const migratedData: Record<string, string> = {};

    for (const [fieldName, encryptedValue] of Object.entries(legacyEncryptedData)) {
      try {
        // Decrypt using legacy method
        const decryptedValue = await this.decryptLegacyFormat(encryptedValue);
        
        // Re-encrypt using new system
        const context: EncryptionContext = {
          userId,
          entityType,
          entityId,
          fieldType: fieldName as any
        };

        const newEncryptedData = await this.encryptField(context, decryptedValue);
        migratedData[`${fieldName}_encrypted`] = JSON.stringify(newEncryptedData);
      } catch (error) {
        console.error(`[ENCRYPTION] Failed to migrate field ${fieldName}:`, error);
        // Keep original data if migration fails
        migratedData[fieldName] = encryptedValue;
      }
    }

    return migratedData;
  }
}
