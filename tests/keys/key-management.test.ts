/**
 * Key Management Service Tests
 * 
 * Tests the three-layer permission system with encryption keys
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KeyManagementService, KeyType, AccessReason } from '@/lib/keys/key-management-service';
import { PermissionResolutionService, PrivacyLevel } from '@/lib/keys/permission-resolution-service';
import { EnhancedEncryptionService } from '@/lib/keys/enhanced-encryption-service';
import { testHelpers } from '@/tests/test-helpers';

const describeIntegration = process.env.TEST_TYPE === 'integration' ? describe : describe.skip;

describeIntegration('Key Management Service', () => {
  let supabase: SupabaseClient;
  let keyService: KeyManagementService;
  let permissionService: PermissionResolutionService;
  let encryptionService: EnhancedEncryptionService;
  
  // Test users
  let alice: any;
  let bob: any;
  let charlie: any;
  
  // Test relationships and groups
  let aliceBobRelationship: any;
  let testGroup: any;
  let testEvent: any;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    keyService = new KeyManagementService(supabase);
    permissionService = new PermissionResolutionService(supabase, keyService);
    encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);

    // Create test users
    alice = await testHelpers.createTestUser({ email: 'alice@test.com', name: 'Alice' });
    bob = await testHelpers.createTestUser({ email: 'bob@test.com', name: 'Bob' });
    charlie = await testHelpers.createTestUser({ email: 'charlie@test.com', name: 'Charlie' });

    // Create test relationship
    aliceBobRelationship = await testHelpers.createTestRelationship(alice.id, bob.id);

    // Create test group
    testGroup = await testHelpers.createTestGroup(alice.id, [bob.id]);

    // Create test event
    testEvent = await testHelpers.createTestEvent(alice.id);
  });

  afterEach(async () => {
    await testHelpers.cleanupTestData([alice?.id, bob?.id, charlie?.id]);
  });

  describe('Key Generation and Storage', () => {
    it('should create relationship keys for both partners', async () => {
      const keyId = await keyService.createRelationshipKey(
        alice.id,
        bob.id,
        aliceBobRelationship.id
      );

      expect(keyId).toBeTruthy();

      // Both users should have access
      const aliceKey = await keyService.getKeyForEntity(alice.id, aliceBobRelationship.id, 'relationship');
      const bobKey = await keyService.getKeyForEntity(bob.id, aliceBobRelationship.id, 'relationship');

      expect(aliceKey).toBeTruthy();
      expect(bobKey).toBeTruthy();
      expect(aliceKey).toBe(bobKey); // Should be the same key
    });

    it('should create group keys with access for all members', async () => {
      const keyId = await keyService.createGroupKey(
        alice.id,
        testGroup.id,
        [alice.id, bob.id]
      );

      expect(keyId).toBeTruthy();

      // All group members should have access
      const aliceKey = await keyService.getKeyForEntity(alice.id, testGroup.id, 'group');
      const bobKey = await keyService.getKeyForEntity(bob.id, testGroup.id, 'group');

      expect(aliceKey).toBeTruthy();
      expect(bobKey).toBeTruthy();
      expect(aliceKey).toBe(bobKey);

      // Non-member should not have access
      const charlieKey = await keyService.getKeyForEntity(charlie.id, testGroup.id, 'group');
      expect(charlieKey).toBeNull();
    });

    it('should create event-specific keys', async () => {
      const keyId = await keyService.createEventKey(
        alice.id,
        testEvent.id,
        [bob.id] // Allow Bob access
      );

      expect(keyId).toBeTruthy();

      // Owner should have access
      const aliceKey = await keyService.getKeyForEntity(alice.id, testEvent.id, 'event');
      expect(aliceKey).toBeTruthy();

      // Allowed user should have access
      const bobKey = await keyService.getKeyForEntity(bob.id, testEvent.id, 'event');
      expect(bobKey).toBeTruthy();
      expect(bobKey).toBe(aliceKey);

      // Non-allowed user should not have access
      const charlieKey = await keyService.getKeyForEntity(charlie.id, testEvent.id, 'event');
      expect(charlieKey).toBeNull();
    });
  });

  describe('Key Access Management', () => {
    it('should grant and revoke key access', async () => {
      const keyId = await keyService.createEventKey(alice.id, testEvent.id, []);

      // Initially, only Alice should have access
      const aliceKey = await keyService.getKeyForEntity(alice.id, testEvent.id, 'event');
      const bobKey = await keyService.getKeyForEntity(bob.id, testEvent.id, 'event');

      expect(aliceKey).toBeTruthy();
      expect(bobKey).toBeNull();

      // Grant access to Bob
      await keyService.grantKeyAccess(keyId, bob.id, alice.id, AccessReason.INVITATION);

      // Now Bob should have access
      const bobKeyAfterGrant = await keyService.getKeyForEntity(bob.id, testEvent.id, 'event');
      expect(bobKeyAfterGrant).toBeTruthy();

      // Revoke Bob's access
      await keyService.revokeKeyAccess(keyId, bob.id);

      // Bob should no longer have access
      const bobKeyAfterRevoke = await keyService.getKeyForEntity(bob.id, testEvent.id, 'event');
      expect(bobKeyAfterRevoke).toBeNull();
    });

    it('should handle expired key access', async () => {
      const keyId = await keyService.createEventKey(alice.id, testEvent.id, []);
      
      // Grant temporary access that expires in the past
      const pastDate = new Date(Date.now() - 1000).toISOString();
      await keyService.grantKeyAccess(keyId, bob.id, alice.id, AccessReason.INVITATION, pastDate);

      // Bob should not have access due to expiration
      const bobKey = await keyService.getKeyForEntity(bob.id, testEvent.id, 'event');
      expect(bobKey).toBeNull();
    });

    it('should update group key access when membership changes', async () => {
      const keyId = await keyService.createGroupKey(alice.id, testGroup.id, [alice.id, bob.id]);

      // Add Charlie to the group
      await keyService.updateGroupKeyAccess(testGroup.id, alice.id, [alice.id, bob.id, charlie.id]);

      // Charlie should now have access
      const charlieKey = await keyService.getKeyForEntity(charlie.id, testGroup.id, 'group');
      expect(charlieKey).toBeTruthy();

      // Remove Bob from the group
      await keyService.updateGroupKeyAccess(testGroup.id, alice.id, [alice.id, charlie.id]);

      // Bob should no longer have access
      const bobKey = await keyService.getKeyForEntity(bob.id, testGroup.id, 'group');
      expect(bobKey).toBeNull();
    });
  });

  describe('Key Rotation', () => {
    it('should allow key owners to rotate keys', async () => {
      const keyId = await keyService.createEventKey(alice.id, testEvent.id, [bob.id]);
      
      const originalKey = await keyService.getKeyForEntity(alice.id, testEvent.id, 'event');
      
      // Rotate the key
      await keyService.rotateKey(keyId, alice.id);
      
      const rotatedKey = await keyService.getKeyForEntity(alice.id, testEvent.id, 'event');
      
      expect(rotatedKey).toBeTruthy();
      expect(rotatedKey).not.toBe(originalKey); // Should be a different key
    });

    it('should prevent non-owners from rotating keys', async () => {
      const keyId = await keyService.createEventKey(alice.id, testEvent.id, [bob.id]);
      
      // Bob should not be able to rotate Alice's key
      await expect(keyService.rotateKey(keyId, bob.id))
        .rejects.toThrow('Unauthorized: Only key owner can rotate keys');
    });
  });
});

describeIntegration('Permission Resolution Service', () => {
  let supabase: SupabaseClient;
  let keyService: KeyManagementService;
  let permissionService: PermissionResolutionService;
  
  let alice: any;
  let bob: any;
  let charlie: any;
  let relationship: any;
  let group: any;
  let privateEvent: any;
  let visibleEvent: any;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    keyService = new KeyManagementService(supabase);
    permissionService = new PermissionResolutionService(supabase, keyService);

    alice = await testHelpers.createTestUser({ email: 'alice@test.com' });
    bob = await testHelpers.createTestUser({ email: 'bob@test.com' });
    charlie = await testHelpers.createTestUser({ email: 'charlie@test.com' });

    relationship = await testHelpers.createTestRelationship(alice.id, bob.id);
    group = await testHelpers.createTestGroup(alice.id, [bob.id]);
    
    privateEvent = await testHelpers.createTestEvent(alice.id, { 
      privacy_level: PrivacyLevel.PRIVATE 
    });
    visibleEvent = await testHelpers.createTestEvent(alice.id, { 
      privacy_level: PrivacyLevel.VISIBLE 
    });
  });

  afterEach(async () => {
    await testHelpers.cleanupTestData([alice?.id, bob?.id, charlie?.id]);
  });

  describe('Three-Layer Permission Resolution', () => {
    it('should resolve Layer 3: Invitation permissions (strongest)', async () => {
      // Add Bob as an invitee to Alice's private event
      await testHelpers.inviteUserToEvent(privateEvent.id, bob.id, alice.id);

      const permissions = await permissionService.resolveEventPermissions(bob.id, privateEvent.id);

      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(false);
      expect(permissions.accessReason).toBe(AccessReason.INVITATION);
      expect(permissions.privacyLevel).toBe(PrivacyLevel.VISIBLE);
    });

    it('should resolve Layer 2: Event-level overrides', async () => {
      // Update event to have custom permissions for Bob
      await testHelpers.updateEvent(privateEvent.id, {
        custom_permissions: {
          allowedUsers: [bob.id],
          canEdit: [bob.id]
        }
      });

      const permissions = await permissionService.resolveEventPermissions(bob.id, privateEvent.id);

      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(true);
      expect(permissions.accessReason).toBe(AccessReason.EVENT_OVERRIDE);
    });

    it('should resolve Layer 1: Relationship permissions (base layer)', async () => {
      const permissions = await permissionService.resolveEventPermissions(bob.id, visibleEvent.id);

      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(false);
      expect(permissions.accessReason).toBe(AccessReason.RELATIONSHIP);
    });

    it('should deny access when no permissions exist', async () => {
      // Charlie has no relationship with Alice
      const permissions = await permissionService.resolveEventPermissions(charlie.id, privateEvent.id);

      expect(permissions.canView).toBe(false);
      expect(permissions.canEdit).toBe(false);
    });
  });

  describe('Privacy Level Enforcement', () => {
    it('should enforce PRIVATE events are only visible to creator', async () => {
      const permissions = await permissionService.resolveEventPermissions(bob.id, privateEvent.id);
      expect(permissions.canView).toBe(false);

      const creatorPermissions = await permissionService.resolveEventPermissions(alice.id, privateEvent.id);
      expect(creatorPermissions.canView).toBe(true);
      expect(creatorPermissions.canEdit).toBe(true);
    });

    it('should allow relationship access to VISIBLE events', async () => {
      const permissions = await permissionService.resolveEventPermissions(bob.id, visibleEvent.id);
      expect(permissions.canView).toBe(true);
    });
  });

  describe('Group-based Permissions', () => {
    it('should grant access via group membership', async () => {
      // Create an event that should be visible to group members
      const groupEvent = await testHelpers.createTestEvent(alice.id, {
        privacy_level: PrivacyLevel.VISIBLE
      });

      const permissions = await permissionService.resolveEventPermissions(bob.id, groupEvent.id);

      expect(permissions.canView).toBe(true);
      expect(permissions.accessReason).toBe(AccessReason.GROUP_MEMBERSHIP);
    });
  });

  describe('Permission Validation', () => {
    it('should validate view permissions', async () => {
      const canView = await permissionService.validatePermission(alice.id, privateEvent.id, 'view');
      expect(canView).toBe(true);

      const cannotView = await permissionService.validatePermission(charlie.id, privateEvent.id, 'view');
      expect(cannotView).toBe(false);
    });

    it('should validate edit permissions', async () => {
      const canEdit = await permissionService.validatePermission(alice.id, privateEvent.id, 'edit');
      expect(canEdit).toBe(true);

      const cannotEdit = await permissionService.validatePermission(bob.id, privateEvent.id, 'edit');
      expect(cannotEdit).toBe(false);
    });
  });
});

describeIntegration('Enhanced Encryption Service', () => {
  let supabase: SupabaseClient;
  let keyService: KeyManagementService;
  let permissionService: PermissionResolutionService;
  let encryptionService: EnhancedEncryptionService;
  
  let alice: any;
  let bob: any;
  let testEvent: any;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    keyService = new KeyManagementService(supabase);
    permissionService = new PermissionResolutionService(supabase, keyService);
    encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);

    alice = await testHelpers.createTestUser({ email: 'alice@test.com' });
    bob = await testHelpers.createTestUser({ email: 'bob@test.com' });
    testEvent = await testHelpers.createTestEvent(alice.id);
  });

  afterEach(async () => {
    await testHelpers.cleanupTestData([alice?.id, bob?.id]);
  });

  describe('Field Encryption', () => {
    it('should encrypt sensitive fields', async () => {
      const context = {
        userId: alice.id,
        entityType: 'event' as const,
        entityId: testEvent.id,
        fieldType: 'description' as const
      };

      const sensitiveDescription = 'Doctor appointment at 2pm';
      const encrypted = await encryptionService.encryptField(context, sensitiveDescription);

      expect(encrypted.encryptedValue).toBeTruthy();
      expect(encrypted.encryptionKeyId).toBeTruthy();
      expect(encrypted.algorithm).toBe('AES-256-GCM');
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.metadata?.fieldType).toBe('description');
    });

    it('should decrypt fields for authorized users', async () => {
      const context = {
        userId: alice.id,
        entityType: 'event' as const,
        entityId: testEvent.id,
        fieldType: 'description' as const
      };

      const originalText = 'Private therapy session';
      const encrypted = await encryptionService.encryptField(context, originalText);

      // Alice (owner) should be able to decrypt
      const decrypted = await encryptionService.decryptField(alice.id, encrypted, context);
      expect(decrypted.canAccess).toBe(true);
      expect(decrypted.decryptedValue).toBe(originalText);
    });

    it('should deny decryption for unauthorized users', async () => {
      const context = {
        userId: alice.id,
        entityType: 'event' as const,
        entityId: testEvent.id,
        fieldType: 'description' as const
      };

      const originalText = 'Private medical appointment';
      const encrypted = await encryptionService.encryptField(context, originalText);

      // Bob (no access) should not be able to decrypt
      const decrypted = await encryptionService.decryptField(bob.id, encrypted, context);
      expect(decrypted.canAccess).toBe(false);
      expect(decrypted.decryptedValue).toBe('[Encrypted - Access Denied]');
    });
  });

  describe('Event Data Encryption', () => {
    it('should encrypt sensitive event data based on privacy level', async () => {
      const eventData = {
        description: 'Doctor appointment for annual checkup',
        location: '123 Medical Center Dr',
        notes: 'Bring insurance card'
      };

      const encrypted = await encryptionService.encryptEventData(
        alice.id,
        testEvent.id,
        eventData,
        PrivacyLevel.PRIVATE
      );

      expect(encrypted.description_encrypted).toBeTruthy();
      expect(encrypted.location_encrypted).toBeTruthy();
      expect(encrypted.notes_encrypted).toBeTruthy();
    });

    it('should not encrypt non-sensitive data for public events', async () => {
      const eventData = {
        description: 'Team meeting',
        location: 'Conference room',
        notes: 'Bring laptop'
      };

      const encrypted = await encryptionService.encryptEventData(
        alice.id,
        testEvent.id,
        eventData,
        PrivacyLevel.PUBLIC
      );

      // Non-sensitive data should not be encrypted for public events
      expect(encrypted.description_encrypted).toBeUndefined();
      expect(encrypted.location_encrypted).toBeUndefined();
      expect(encrypted.notes_encrypted).toBeUndefined();
    });

    it('should decrypt event data for authorized users', async () => {
      const originalData = {
        description: 'Private consultation with therapist',
        location: 'Mental Health Clinic',
        notes: 'Discuss anxiety management'
      };

      const encrypted = await encryptionService.encryptEventData(
        alice.id,
        testEvent.id,
        originalData,
        PrivacyLevel.PRIVATE
      );

      // Prepare event data as it would come from database
      const eventFromDB = {
        id: testEvent.id,
        description_encrypted: encrypted.description_encrypted,
        location_encrypted: encrypted.location_encrypted,
        notes_encrypted: encrypted.notes_encrypted
      };

      const decrypted = await encryptionService.decryptEventData(alice.id, eventFromDB);

      expect(decrypted.description).toBe(originalData.description);
      expect(decrypted.location).toBe(originalData.location);
      expect(decrypted.notes).toBe(originalData.notes);
    });
  });

  describe('Sensitive Content Detection', () => {
    const testCases = [
      { text: 'Doctor appointment', should: true, reason: 'medical keyword' },
      { text: 'Team meeting', should: false, reason: 'non-sensitive' },
      { text: 'Therapy session', should: true, reason: 'mental health keyword' },
      { text: '123 Main Street', should: true, reason: 'address pattern' },
      { text: 'Coffee shop downtown', should: false, reason: 'general location' },
      { text: 'Private dinner at home', should: true, reason: 'private keyword' },
      { text: 'Hospital visit', should: true, reason: 'medical location' }
    ];

    testCases.forEach(({ text, should, reason }) => {
      it(`should ${should ? 'encrypt' : 'not encrypt'} "${text}" (${reason})`, async () => {
        const context = {
          userId: alice.id,
          entityType: 'event' as const,
          entityId: testEvent.id,
          fieldType: 'description' as const
        };

        if (should) {
          // Should encrypt
          const encrypted = await encryptionService.encryptField(context, text);
          expect(encrypted.encryptedValue).toBeTruthy();
        } else {
          // Encryption service encrypts if shouldEncryptField returns true
          // We can't directly test shouldEncryptField as it's private
          // So we test the behavior through encryptEventData
          const encrypted = await encryptionService.encryptEventData(
            alice.id,
            testEvent.id,
            { description: text },
            PrivacyLevel.PRIVATE
          );
          
          if (should) {
            expect(encrypted.description_encrypted).toBeTruthy();
          } else {
            expect(encrypted.description_encrypted).toBeUndefined();
          }
        }
      });
    });
  });

  describe('Legacy Data Migration', () => {
    it('should migrate legacy encrypted data to new format', async () => {
      const legacyData = {
        description: 'legacy_encrypted_string_here',
        location: 'another_legacy_encrypted_string'
      };

      const migrated = await encryptionService.migrateLegacyData(
        alice.id,
        'event',
        testEvent.id,
        legacyData
      );

      expect(migrated.description_encrypted).toBeTruthy();
      expect(migrated.location_encrypted).toBeTruthy();
      
      // Should be in new JSON format
      expect(() => JSON.parse(migrated.description_encrypted!)).not.toThrow();
    });
  });
});

describeIntegration('Integration: End-to-End Encryption Flow', () => {
  let supabase: SupabaseClient;
  let keyService: KeyManagementService;
  let permissionService: PermissionResolutionService;
  let encryptionService: EnhancedEncryptionService;
  
  let alice: any;
  let bob: any;
  let charlie: any;
  let relationship: any;

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    keyService = new KeyManagementService(supabase);
    permissionService = new PermissionResolutionService(supabase, keyService);
    encryptionService = new EnhancedEncryptionService(supabase, keyService, permissionService);

    alice = await testHelpers.createTestUser({ email: 'alice@test.com' });
    bob = await testHelpers.createTestUser({ email: 'bob@test.com' });
    charlie = await testHelpers.createTestUser({ email: 'charlie@test.com' });
    
    relationship = await testHelpers.createTestRelationship(alice.id, bob.id);
  });

  afterEach(async () => {
    await testHelpers.cleanupTestData([alice?.id, bob?.id, charlie?.id]);
  });

  it('should handle complete event creation with encryption flow', async () => {
    const eventPermissions = {
      privacyLevel: PrivacyLevel.SEMI_PRIVATE,
      allowedUsers: [bob.id],
      allowedRelationships: [relationship.id]
    };

    const eventData = {
      title: 'Therapy Session', // Not encrypted (basic info)
      description: 'Session with Dr. Smith about anxiety',
      location: '123 Psychology Center Dr',
      notes: 'Remember to discuss recent symptoms'
    };

    // Create event with encryption
    const { eventId, keyId } = await permissionService.createEventWithEncryption(
      alice.id,
      eventData,
      eventPermissions
    );

    expect(eventId).toBeTruthy();
    expect(keyId).toBeTruthy();

    // Encrypt the sensitive data
    const encryptedData = await encryptionService.encryptEventData(
      alice.id,
      eventId,
      eventData,
      eventPermissions.privacyLevel
    );

    // Verify Alice can decrypt
    const aliceDecrypted = await encryptionService.decryptEventData(alice.id, {
      id: eventId,
      ...encryptedData
    });
    
    expect(aliceDecrypted.description).toBe(eventData.description);
    expect(aliceDecrypted.location).toBe(eventData.location);
    expect(aliceDecrypted.notes).toBe(eventData.notes);

    // Verify Bob can decrypt (he's allowed)
    const bobDecrypted = await encryptionService.decryptEventData(bob.id, {
      id: eventId,
      ...encryptedData
    });
    
    expect(bobDecrypted.description).toBe(eventData.description);

    // Verify Charlie cannot decrypt (not allowed)
    const charlieDecrypted = await encryptionService.decryptEventData(charlie.id, {
      id: eventId,
      ...encryptedData
    });
    
    expect(charlieDecrypted.description).toBe('[Encrypted - Access Denied]');
  });

  it('should handle invitation-based key sharing', async () => {
    // Alice creates a private event
    const { eventId, keyId } = await permissionService.createEventWithEncryption(
      alice.id,
      { title: 'Private Event' },
      { privacyLevel: PrivacyLevel.PRIVATE }
    );

    // Initially, only Alice has access
    const aliceKey = await keyService.getKeyForEntity(alice.id, eventId, 'event');
    const bobKey = await keyService.getKeyForEntity(bob.id, eventId, 'event');
    
    expect(aliceKey).toBeTruthy();
    expect(bobKey).toBeNull();

    // Alice invites Bob
    await keyService.grantKeyAccess(keyId, bob.id, alice.id, AccessReason.INVITATION);

    // Now Bob should have access
    const bobKeyAfterInvite = await keyService.getKeyForEntity(bob.id, eventId, 'event');
    expect(bobKeyAfterInvite).toBeTruthy();
    expect(bobKeyAfterInvite).toBe(aliceKey);
  });

  it('should handle group-based encryption scenarios', async () => {
    // Create a group with Alice and Bob
    const group = await testHelpers.createTestGroup(alice.id, [bob.id]);
    const groupKeyId = await keyService.createGroupKey(alice.id, group.id, [alice.id, bob.id]);

    // Alice creates an event that uses group encryption
    const { eventId } = await permissionService.createEventWithEncryption(
      alice.id,
      { title: 'Group Event', description: 'Family therapy session' },
      { 
        privacyLevel: PrivacyLevel.VISIBLE,
        allowedGroups: [group.id]
      }
    );

    const encryptedData = await encryptionService.encryptEventData(
      alice.id,
      eventId,
      { description: 'Family therapy session' },
      PrivacyLevel.VISIBLE
    );

    // Both group members should be able to decrypt
    const aliceDecrypted = await encryptionService.decryptEventData(alice.id, {
      id: eventId,
      ...encryptedData
    });
    
    const bobDecrypted = await encryptionService.decryptEventData(bob.id, {
      id: eventId,
      ...encryptedData
    });

    expect(aliceDecrypted.description).toBe('Family therapy session');
    expect(bobDecrypted.description).toBe('Family therapy session');

    // Add Charlie to the group
    await keyService.updateGroupKeyAccess(group.id, alice.id, [alice.id, bob.id, charlie.id]);

    // Charlie should now have access
    const charlieDecrypted = await encryptionService.decryptEventData(charlie.id, {
      id: eventId,
      ...encryptedData
    });
    
    expect(charlieDecrypted.description).toBe('Family therapy session');
  });
});
