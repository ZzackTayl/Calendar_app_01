/**
 * Permission Resolution Service
 * 
 * Handles the three-layer permission architecture:
 * 1. Relationship/Group permissions (base layer)
 * 2. Event-level overrides
 * 3. Invitation permissions (strongest override)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { KeyManagementService, AccessReason } from './key-management-service';

export enum PrivacyLevel {
  PRIVATE = 'private',         // Only creator
  SEMI_PRIVATE = 'semi_private', // Limited based on relationship settings
  VISIBLE = 'visible',         // Visible to specific relationships
  PUBLIC = 'public'           // Visible to all connected relationships
}

export interface PermissionContext {
  userId: string;
  eventId?: string;
  relationshipId?: string;
  groupId?: string;
  invitationId?: string;
}

export interface PermissionResult {
  canView: boolean;
  canEdit: boolean;
  encryptionKeyId?: string;
  accessReason: AccessReason;
  privacyLevel: PrivacyLevel;
}

export interface EventPermissions {
  privacyLevel: PrivacyLevel;
  allowedUsers?: string[];
  allowedRelationships?: string[];
  allowedGroups?: string[];
  customEncryptionKey?: string;
}

export class PermissionResolutionService {
  constructor(
    private supabase: SupabaseClient,
    private keyService: KeyManagementService
  ) {}

  /**
   * Resolves permissions for a user to access an event
   * Follows the three-layer hierarchy
   */
  async resolveEventPermissions(
    userId: string,
    eventId: string
  ): Promise<PermissionResult> {
    try {
      // Get event details
      const { data: event, error: eventError } = await this.supabase
        .from('events')
        .select(`
          *,
          event_participants(user_id, invited_by, accepted_at),
          user:creator_id(id)
        `)
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          canView: false,
          canEdit: false,
          accessReason: AccessReason.OWNER,
          privacyLevel: PrivacyLevel.PRIVATE
        };
      }

      // Layer 3: Check invitation permissions (strongest)
      const invitationResult = await this.checkInvitationPermissions(userId, event);
      if (invitationResult.canView) {
        return invitationResult;
      }

      // Layer 2: Check event-level overrides
      const eventLevelResult = await this.checkEventLevelPermissions(userId, event);
      if (eventLevelResult.canView) {
        return eventLevelResult;
      }

      // Layer 1: Check relationship/group permissions (base layer)
      const baseResult = await this.checkBasePermissions(userId, event);
      return baseResult;

    } catch (error) {
      console.error('[PERMISSION] Failed to resolve event permissions:', error);
      return {
        canView: false,
        canEdit: false,
        accessReason: AccessReason.OWNER,
        privacyLevel: PrivacyLevel.PRIVATE
      };
    }
  }

  /**
   * Layer 3: Check invitation permissions (strongest override)
   */
  private async checkInvitationPermissions(
    userId: string,
    event: any
  ): Promise<PermissionResult> {
    // Check if user is directly invited
    const invitation = event.event_participants?.find(
      (p: any) => p.user_id === userId
    );

    if (invitation) {
      // Find invitation-specific encryption key if exists
      const keyId = await this.getInvitationEncryptionKey(event.id, userId);
      
      return {
        canView: true,
        canEdit: false, // Invitees typically can't edit unless they're the creator
        encryptionKeyId: keyId || event.encryption_key_id,
        accessReason: AccessReason.INVITATION,
        privacyLevel: PrivacyLevel.VISIBLE
      };
    }

    return {
      canView: false,
      canEdit: false,
      accessReason: AccessReason.INVITATION,
      privacyLevel: PrivacyLevel.PRIVATE
    };
  }

  /**
   * Layer 2: Check event-level permission overrides
   */
  private async checkEventLevelPermissions(
    userId: string,
    event: any
  ): Promise<PermissionResult> {
    // Check if user is the event creator
    if (event.creator_id === userId) {
      return {
        canView: true,
        canEdit: true,
        encryptionKeyId: event.encryption_key_id,
        accessReason: AccessReason.OWNER,
        privacyLevel: event.privacy_level || PrivacyLevel.PRIVATE
      };
    }

    // Check if event has custom permissions for this user
    if (event.custom_permissions) {
      const customPerms = event.custom_permissions as any;
      
      if (customPerms.allowedUsers?.includes(userId)) {
        const keyId = await this.getEventEncryptionKey(event.id);
        
        return {
          canView: true,
          canEdit: customPerms.canEdit?.includes(userId) || false,
          encryptionKeyId: keyId || event.encryption_key_id,
          accessReason: AccessReason.EVENT_OVERRIDE,
          privacyLevel: event.privacy_level || PrivacyLevel.VISIBLE
        };
      }
    }

    return {
      canView: false,
      canEdit: false,
      accessReason: AccessReason.EVENT_OVERRIDE,
      privacyLevel: PrivacyLevel.PRIVATE
    };
  }

  /**
   * Layer 1: Check relationship/group permissions (base layer)
   */
  private async checkBasePermissions(
    userId: string,
    event: any
  ): Promise<PermissionResult> {
    const eventPrivacy = event.privacy_level || PrivacyLevel.PRIVATE;
    
    // Private events are only visible to creator
    if (eventPrivacy === PrivacyLevel.PRIVATE) {
      return {
        canView: event.creator_id === userId,
        canEdit: event.creator_id === userId,
        encryptionKeyId: event.encryption_key_id,
        accessReason: AccessReason.OWNER,
        privacyLevel: eventPrivacy
      };
    }

    // Check group-based permissions
    const groupResult = await this.checkGroupPermissions(userId, event);
    if (groupResult.canView) {
      return groupResult;
    }

    // Check relationship-based permissions
    const relationshipResult = await this.checkRelationshipPermissions(userId, event);
    return relationshipResult;
  }

  /**
   * Check if user has access via group membership
   */
  private async checkGroupPermissions(
    userId: string,
    event: any
  ): Promise<PermissionResult> {
    // Get groups the event creator is in that include this user
    const { data: sharedGroups } = await this.supabase
      .from('group_members')
      .select(`
        group_id,
        groups!inner(
          id,
          created_by,
          encryption_key_id,
          privacy_settings
        )
      `)
      .eq('user_id', userId)
      .eq('groups.created_by', event.creator_id);

    if (sharedGroups && sharedGroups.length > 0) {
      const group = sharedGroups[0]; // Use first matching group
      
      return {
        canView: true,
        canEdit: false,
        encryptionKeyId: (group as any).groups?.encryption_key_id,
        accessReason: AccessReason.GROUP_MEMBERSHIP,
        privacyLevel: event.privacy_level || PrivacyLevel.VISIBLE
      };
    }

    return {
      canView: false,
      canEdit: false,
      accessReason: AccessReason.GROUP_MEMBERSHIP,
      privacyLevel: PrivacyLevel.PRIVATE
    };
  }

  /**
   * Check if user has access via relationship
   */
  private async checkRelationshipPermissions(
    userId: string,
    event: any
  ): Promise<PermissionResult> {
    // Check if there's a relationship between the user and event creator
    const { data: relationship } = await this.supabase
      .from('relationships')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${event.creator_id}),and(user1_id.eq.${event.creator_id},user2_id.eq.${userId})`)
      .single();

    if (relationship) {
      // Check if the relationship allows calendar access
      const privacySettings = relationship.privacy_settings as any;
      const allowsCalendarAccess = privacySettings?.calendar_access !== false;
      
      if (allowsCalendarAccess) {
        return {
          canView: event.privacy_level !== PrivacyLevel.PRIVATE,
          canEdit: false,
          encryptionKeyId: relationship.encryption_key_id,
          accessReason: AccessReason.RELATIONSHIP,
          privacyLevel: event.privacy_level || PrivacyLevel.VISIBLE
        };
      }
    }

    return {
      canView: false,
      canEdit: false,
      accessReason: AccessReason.RELATIONSHIP,
      privacyLevel: PrivacyLevel.PRIVATE
    };
  }

  /**
   * Gets the appropriate encryption key for an event based on permission layer
   */
  async getEncryptionKeyForEvent(
    userId: string,
    eventId: string
  ): Promise<string | null> {
    const permissions = await this.resolveEventPermissions(userId, eventId);
    
    if (!permissions.canView || !permissions.encryptionKeyId) {
      return null;
    }

    // Get the actual encryption key
    return await this.keyService.getKeyForEntity(
      userId,
      permissions.encryptionKeyId,
      this.getEntityTypeFromAccessReason(permissions.accessReason)
    );
  }

  /**
   * Creates event with appropriate encryption based on privacy settings
   */
  async createEventWithEncryption(
    creatorId: string,
    eventData: any,
    eventPermissions: EventPermissions
  ): Promise<{ eventId: string; keyId: string }> {
    try {
      const eventId = crypto.randomUUID();
      let keyId: string;

      // Determine which key to use based on privacy level and settings
      if (eventPermissions.customEncryptionKey) {
        // Use custom event-specific key
        keyId = await this.keyService.createEventKey(
          creatorId,
          eventId,
          eventPermissions.allowedUsers || []
        );
      } else if (eventPermissions.allowedGroups?.length) {
        // Use group key
        const groupId = eventPermissions.allowedGroups[0]; // Use first group
        keyId = await this.getGroupEncryptionKey(groupId) || 
               await this.keyService.createGroupKey(creatorId, groupId, []);
      } else if (eventPermissions.allowedRelationships?.length) {
        // Use relationship key
        const relationshipId = eventPermissions.allowedRelationships[0];
        keyId = await this.getRelationshipEncryptionKey(relationshipId) ||
               await this.keyService.createRelationshipKey(creatorId, creatorId, relationshipId);
      } else {
        // Create event-specific key for private events
        keyId = await this.keyService.createEventKey(creatorId, eventId, []);
      }

      // Create the event with encryption key reference
      const { error: eventError } = await this.supabase
        .from('events')
        .insert({
          id: eventId,
          creator_id: creatorId,
          encryption_key_id: keyId,
          privacy_level: eventPermissions.privacyLevel,
          custom_permissions: {
            allowedUsers: eventPermissions.allowedUsers,
            allowedRelationships: eventPermissions.allowedRelationships,
            allowedGroups: eventPermissions.allowedGroups
          },
          ...eventData
        });

      if (eventError) throw eventError;

      return { eventId, keyId };
    } catch (error) {
      console.error('[PERMISSION] Failed to create event with encryption:', error);
      throw new Error('Failed to create encrypted event');
    }
  }

  /**
   * Helper methods
   */
  private async getInvitationEncryptionKey(eventId: string, userId: string): Promise<string | null> {
    // Check if there's a specific key for this invitation
    const { data: key } = await this.supabase
      .from('encryption_keys')
      .select('id')
      .eq('key_type', 'event')
      .eq('metadata->entityId', eventId)
      .single();

    return key?.id || null;
  }

  private async getEventEncryptionKey(eventId: string): Promise<string | null> {
    const { data: key } = await this.supabase
      .from('encryption_keys')
      .select('id')
      .eq('key_type', 'event')
      .eq('metadata->entityId', eventId)
      .single();

    return key?.id || null;
  }

  private async getGroupEncryptionKey(groupId: string): Promise<string | null> {
    const { data: key } = await this.supabase
      .from('encryption_keys')
      .select('id')
      .eq('key_type', 'group')
      .eq('metadata->entityId', groupId)
      .single();

    return key?.id || null;
  }

  private async getRelationshipEncryptionKey(relationshipId: string): Promise<string | null> {
    const { data: key } = await this.supabase
      .from('encryption_keys')
      .select('id')
      .eq('key_type', 'relationship')
      .eq('metadata->entityId', relationshipId)
      .single();

    return key?.id || null;
  }

  private getEntityTypeFromAccessReason(reason: AccessReason): 'event' | 'relationship' | 'group' {
    switch (reason) {
      case AccessReason.GROUP_MEMBERSHIP:
        return 'group';
      case AccessReason.RELATIONSHIP:
        return 'relationship';
      case AccessReason.INVITATION:
      case AccessReason.EVENT_OVERRIDE:
      case AccessReason.OWNER:
      default:
        return 'event';
    }
  }

  /**
   * Validates that user has permission to perform an action
   */
  async validatePermission(
    userId: string,
    eventId: string,
    action: 'view' | 'edit' | 'delete'
  ): Promise<boolean> {
    const permissions = await this.resolveEventPermissions(userId, eventId);
    
    switch (action) {
      case 'view':
        return permissions.canView;
      case 'edit':
      case 'delete':
        return permissions.canEdit;
      default:
        return false;
    }
  }
}
