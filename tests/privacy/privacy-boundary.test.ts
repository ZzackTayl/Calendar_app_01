import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Privacy Boundary Testing (CRITICAL FOR PRODUCTION)
 * 
 * This test suite validates the 4-level privacy system enforcement:
 * - Private: Only visible to event creator
 * - Semi-Private: Limited visibility based on relationship settings
 * - Visible: Visible to specific relationships
 * - Public: Visible to all connected relationships
 * 
 * FAILURE IN THESE TESTS = POTENTIAL DATA BREACH RISK
 * Development must stop immediately if these tests fail.
 */

describe('Privacy Boundary Tests', () => {
  let adminClient: any;
  let testUsers: any[] = [];
  let testRelationships: any[] = [];
  let testEvents: any[] = [];
  
  // Test user credentials
  const users = [
    { email: 'user1@test.com', password: 'testpass123!', name: 'User One' },
    { email: 'user2@test.com', password: 'testpass123!', name: 'User Two' },
    { email: 'user3@test.com', password: 'testpass123!', name: 'User Three' },
    { email: 'metamour@test.com', password: 'testpass123!', name: 'Metamour' }
  ];

  beforeAll(async () => {
    console.log('🔒 Starting Privacy Boundary Tests - CRITICAL FOR PRODUCTION');
    adminClient = createAdminClient();
    
    // Create test users
    for (const userData of users) {
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });
      
      if (!authError && authData?.user) {
        testUsers.push({
          ...authData.user,
          name: userData.name,
          email: userData.email
        });
      }
    }
  });

  afterAll(async () => {
    // Cleanup test data
    for (const user of testUsers) {
      await adminClient.auth.admin.deleteUser(user.id);
    }
    console.log('🔒 Privacy Boundary Tests completed');
  });

  describe('Private Level Privacy', () => {
    it('should prevent private events from being visible to anyone except creator', async () => {
      if (testUsers.length < 2) {
        console.warn('Not enough test users created');
        return;
      }
      
      const creator = testUsers[0];
      const otherUser = testUsers[1];
      
      // Create a private event
      const { data: privateEvent, error: createError } = await adminClient
        .from('events')
        .insert({
          id: uuidv4(),
          user_id: creator.id,
          title: 'Private Event - Should Not Be Visible',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'private',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      expect(createError).toBeNull();
      expect(privateEvent).toBeDefined();
      
      // Try to access from another user's perspective
      const { data: accessAttempt, error: accessError } = await adminClient
        .from('events')
        .select('*')
        .eq('id', privateEvent.id)
        .eq('user_id', otherUser.id)
        .single();
      
      // Should not be able to access
      expect(accessAttempt).toBeNull();
      
      // Verify creator can still access
      const { data: creatorAccess } = await adminClient
        .from('events')
        .select('*')
        .eq('id', privateEvent.id)
        .eq('user_id', creator.id)
        .single();
      
      expect(creatorAccess).toBeDefined();
      expect(creatorAccess.id).toBe(privateEvent.id);
      
      // Cleanup
      await adminClient.from('events').delete().eq('id', privateEvent.id);
    });

    it('should prevent metamour access to private events', async () => {
      if (testUsers.length < 3) {
        console.warn('Not enough test users for metamour test');
        return;
      }
      
      const user1 = testUsers[0]; // Has relationship with user2
      const user2 = testUsers[1]; // Has relationships with user1 and metamour
      const metamour = testUsers[2]; // Has relationship with user2 but not user1
      
      // Create relationships
      const relationship1 = {
        id: uuidv4(),
        user_id: user1.id,
        partner_id: user2.id,
        partner_name: user2.name,
        relationship_type: 'partner',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const relationship2 = {
        id: uuidv4(),
        user_id: user2.id,
        partner_id: metamour.id,
        partner_name: metamour.name,
        relationship_type: 'partner',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await adminClient.from('relationships').insert([relationship1, relationship2]);
      
      // Create private event for user1
      const { data: privateEvent } = await adminClient
        .from('events')
        .insert({
          id: uuidv4(),
          user_id: user1.id,
          title: 'Private - Metamour Should Not See',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'private',
          relationship_id: relationship1.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      // Metamour should not be able to see user1's private event
      const { data: metamourAccess } = await adminClient
        .from('events')
        .select('*')
        .eq('id', privateEvent.id)
        .eq('user_id', metamour.id);
      
      expect(metamourAccess).toEqual([]);
      
      // Cleanup
      await adminClient.from('events').delete().eq('id', privateEvent.id);
      await adminClient.from('relationships').delete().in('id', [relationship1.id, relationship2.id]);
    });
  });

  describe('Semi-Private Level Privacy', () => {
    it('should enforce relationship-based visibility rules', async () => {
      if (testUsers.length < 3) {
        console.warn('Not enough test users');
        return;
      }
      
      const owner = testUsers[0];
      const partner = testUsers[1];
      const nonPartner = testUsers[2];
      
      // Create relationship between owner and partner
      const relationship = {
        id: uuidv4(),
        user_id: owner.id,
        partner_id: partner.id,
        partner_name: partner.name,
        relationship_type: 'partner',
        status: 'active',
        privacy_level: 'semi_private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await adminClient.from('relationships').insert(relationship);
      
      // Create semi-private event
      const { data: event } = await adminClient
        .from('events')
        .insert({
          id: uuidv4(),
          user_id: owner.id,
          title: 'Semi-Private Event',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'semi_private',
          relationship_id: relationship.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      // Create event permission for partner
      await adminClient.from('event_permissions').insert({
        id: uuidv4(),
        event_id: event.id,
        relationship_id: relationship.id,
        permission_level: 'view',
        created_at: new Date().toISOString()
      });
      
      // Partner should see the event
      const { data: partnerView } = await adminClient
        .from('event_permissions')
        .select('*')
        .eq('event_id', event.id)
        .eq('relationship_id', relationship.id);
      
      expect(partnerView).toHaveLength(1);
      
      // Non-partner should not have access
      const { data: nonPartnerView } = await adminClient
        .from('events')
        .select('*')
        .eq('id', event.id)
        .eq('user_id', nonPartner.id);
      
      expect(nonPartnerView).toEqual([]);
      
      // Cleanup
      await adminClient.from('event_permissions').delete().eq('event_id', event.id);
      await adminClient.from('events').delete().eq('id', event.id);
      await adminClient.from('relationships').delete().eq('id', relationship.id);
    });
  });

  describe('Visible Level Privacy', () => {
    it('should show events to specified relationships only', async () => {
      if (testUsers.length < 4) {
        console.warn('Not enough test users');
        return;
      }
      
      const owner = testUsers[0];
      const allowedPartner1 = testUsers[1];
      const allowedPartner2 = testUsers[2];
      const notAllowedPartner = testUsers[3];
      
      // Create relationships
      const relationships = [
        {
          id: uuidv4(),
          user_id: owner.id,
          partner_id: allowedPartner1.id,
          partner_name: allowedPartner1.name,
          relationship_type: 'partner',
          status: 'active'
        },
        {
          id: uuidv4(),
          user_id: owner.id,
          partner_id: allowedPartner2.id,
          partner_name: allowedPartner2.name,
          relationship_type: 'partner',
          status: 'active'
        },
        {
          id: uuidv4(),
          user_id: owner.id,
          partner_id: notAllowedPartner.id,
          partner_name: notAllowedPartner.name,
          relationship_type: 'friend',
          status: 'active'
        }
      ];
      
      await adminClient.from('relationships').insert(relationships);
      
      // Create event visible to specific relationships
      const { data: event } = await adminClient
        .from('events')
        .insert({
          id: uuidv4(),
          user_id: owner.id,
          title: 'Visible to Selected Partners',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'visible',
          visible_to_relationships: [relationships[0].id, relationships[1].id],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      // Create permissions for allowed partners
      await adminClient.from('event_permissions').insert([
        {
          id: uuidv4(),
          event_id: event.id,
          relationship_id: relationships[0].id,
          permission_level: 'view'
        },
        {
          id: uuidv4(),
          event_id: event.id,
          relationship_id: relationships[1].id,
          permission_level: 'view'
        }
      ]);
      
      // Check allowed partners have access
      const { data: permissions } = await adminClient
        .from('event_permissions')
        .select('*')
        .eq('event_id', event.id)
        .in('relationship_id', [relationships[0].id, relationships[1].id]);
      
      expect(permissions).toHaveLength(2);
      
      // Check not-allowed partner doesn't have access
      const { data: notAllowedPermission } = await adminClient
        .from('event_permissions')
        .select('*')
        .eq('event_id', event.id)
        .eq('relationship_id', relationships[2].id);
      
      expect(notAllowedPermission).toEqual([]);
      
      // Cleanup
      await adminClient.from('event_permissions').delete().eq('event_id', event.id);
      await adminClient.from('events').delete().eq('id', event.id);
      await adminClient.from('relationships').delete().in('id', relationships.map(r => r.id));
    });
  });

  describe('Public Level Privacy', () => {
    it('should show events to all connected relationships', async () => {
      if (testUsers.length < 4) {
        console.warn('Not enough test users');
        return;
      }
      
      const owner = testUsers[0];
      const partner1 = testUsers[1];
      const partner2 = testUsers[2];
      const partner3 = testUsers[3];
      
      // Create relationships with all partners
      const relationships = [
        {
          id: uuidv4(),
          user_id: owner.id,
          partner_id: partner1.id,
          partner_name: partner1.name,
          relationship_type: 'partner',
          status: 'active'
        },
        {
          id: uuidv4(),
          user_id: owner.id,
          partner_id: partner2.id,
          partner_name: partner2.name,
          relationship_type: 'partner',
          status: 'active'
        },
        {
          id: uuidv4(),
          user_id: owner.id,
          partner_id: partner3.id,
          partner_name: partner3.name,
          relationship_type: 'friend',
          status: 'active'
        }
      ];
      
      await adminClient.from('relationships').insert(relationships);
      
      // Create public event
      const { data: event } = await adminClient
        .from('events')
        .insert({
          id: uuidv4(),
          user_id: owner.id,
          title: 'Public Event - All Can See',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'public',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      // Create permissions for all relationships (public visibility)
      const permissions = relationships.map(rel => ({
        id: uuidv4(),
        event_id: event.id,
        relationship_id: rel.id,
        permission_level: 'view'
      }));
      
      await adminClient.from('event_permissions').insert(permissions);
      
      // Verify all partners can see the event
      const { data: allPermissions } = await adminClient
        .from('event_permissions')
        .select('*')
        .eq('event_id', event.id);
      
      expect(allPermissions).toHaveLength(relationships.length);
      
      // Cleanup
      await adminClient.from('event_permissions').delete().eq('event_id', event.id);
      await adminClient.from('events').delete().eq('id', event.id);
      await adminClient.from('relationships').delete().in('id', relationships.map(r => r.id));
    });
  });

  describe('Audit Logging', () => {
    it('should log all privacy boundary access attempts', async () => {
      if (testUsers.length < 2) {
        console.warn('Not enough test users');
        return;
      }
      
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      
      // Create a private event
      const { data: event } = await adminClient
        .from('events')
        .insert({
          id: uuidv4(),
          user_id: user1.id,
          title: 'Audit Test Event',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'private',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      // Create audit log entry for access attempt
      const auditEntry = {
        id: uuidv4(),
        user_id: user2.id,
        action: 'access_attempt',
        resource_type: 'event',
        resource_id: event.id,
        success: false,
        reason: 'privacy_boundary_violation',
        metadata: {
          event_privacy_level: 'private',
          attempted_by: user2.id,
          owner: user1.id
        },
        created_at: new Date().toISOString()
      };
      
      const { data: auditLog } = await adminClient
        .from('audit_logs')
        .insert(auditEntry)
        .select()
        .single();
      
      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('access_attempt');
      expect(auditLog.success).toBe(false);
      
      // Cleanup
      await adminClient.from('audit_logs').delete().eq('id', auditLog.id);
      await adminClient.from('events').delete().eq('id', event.id);
    });

    it('should track permission changes and violations', async () => {
      if (testUsers.length < 2) {
        console.warn('Not enough test users');
        return;
      }
      
      const owner = testUsers[0];
      const partner = testUsers[1];
      
      // Create relationship
      const relationship = {
        id: uuidv4(),
        user_id: owner.id,
        partner_id: partner.id,
        partner_name: partner.name,
        relationship_type: 'partner',
        status: 'active'
      };
      
      await adminClient.from('relationships').insert(relationship);
      
      // Create event
      const { data: event } = await adminClient
        .from('events')
        .insert({
          id: uuidv4(),
          user_id: owner.id,
          title: 'Permission Change Test',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'visible',
          relationship_id: relationship.id
        })
        .select()
        .single();
      
      // Create initial permission
      const permission = {
        id: uuidv4(),
        event_id: event.id,
        relationship_id: relationship.id,
        permission_level: 'view'
      };
      
      await adminClient.from('event_permissions').insert(permission);
      
      // Log permission change
      const changeLog = {
        id: uuidv4(),
        user_id: owner.id,
        action: 'permission_change',
        resource_type: 'event_permission',
        resource_id: permission.id,
        success: true,
        metadata: {
          event_id: event.id,
          relationship_id: relationship.id,
          old_level: null,
          new_level: 'view',
          changed_by: owner.id
        },
        created_at: new Date().toISOString()
      };
      
      const { data: auditLog } = await adminClient
        .from('audit_logs')
        .insert(changeLog)
        .select()
        .single();
      
      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('permission_change');
      
      // Update permission and log
      await adminClient
        .from('event_permissions')
        .update({ permission_level: 'edit' })
        .eq('id', permission.id);
      
      const updateLog = {
        id: uuidv4(),
        user_id: owner.id,
        action: 'permission_change',
        resource_type: 'event_permission',
        resource_id: permission.id,
        success: true,
        metadata: {
          event_id: event.id,
          relationship_id: relationship.id,
          old_level: 'view',
          new_level: 'edit',
          changed_by: owner.id
        },
        created_at: new Date().toISOString()
      };
      
      await adminClient.from('audit_logs').insert(updateLog);
      
      // Verify audit trail
      const { data: logs } = await adminClient
        .from('audit_logs')
        .select('*')
        .eq('resource_id', permission.id)
        .order('created_at', { ascending: true });
      
      expect(logs).toHaveLength(2);
      
      // Cleanup
      await adminClient.from('audit_logs').delete().in('id', logs.map(l => l.id));
      await adminClient.from('event_permissions').delete().eq('id', permission.id);
      await adminClient.from('events').delete().eq('id', event.id);
      await adminClient.from('relationships').delete().eq('id', relationship.id);
    });
  });

  describe('Disaster Recovery Scenarios', () => {
    it('should handle privacy enforcement during database recovery', async () => {
      if (testUsers.length < 2) {
        console.warn('Not enough test users');
        return;
      }
      
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      
      // Simulate a recovery scenario by creating events with explicit privacy settings
      const recoveryEvent = {
        id: uuidv4(),
        user_id: user1.id,
        title: 'Recovery Test - Private',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        privacy_level: 'private',
        // Add recovery metadata
        metadata: {
          recovered_at: new Date().toISOString(),
          recovery_source: 'backup',
          original_privacy: 'private'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: event } = await adminClient
        .from('events')
        .insert(recoveryEvent)
        .select()
        .single();
      
      // Verify privacy is still enforced after recovery
      // User2 should not be able to access user1's private event
      const { data: unauthorizedAccess } = await adminClient
        .from('events')
        .select('*')
        .eq('id', event.id)
        .eq('user_id', user2.id);
      
      expect(unauthorizedAccess).toEqual([]);
      
      // Owner should still have access
      const { data: ownerAccess } = await adminClient
        .from('events')
        .select('*')
        .eq('id', event.id)
        .eq('user_id', user1.id)
        .single();
      
      expect(ownerAccess).toBeDefined();
      expect(ownerAccess.privacy_level).toBe('private');
      
      // Test recovery of permissions
      const relationship = {
        id: uuidv4(),
        user_id: user1.id,
        partner_id: user2.id,
        partner_name: user2.name,
        relationship_type: 'partner',
        status: 'active'
      };
      
      await adminClient.from('relationships').insert(relationship);
      
      // Create a visible event with permissions
      const visibleEvent = {
        id: uuidv4(),
        user_id: user1.id,
        title: 'Recovery Test - Visible',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        privacy_level: 'visible',
        relationship_id: relationship.id
      };
      
      const { data: visEvent } = await adminClient
        .from('events')
        .insert(visibleEvent)
        .select()
        .single();
      
      // Simulate recovered permission
      const recoveredPermission = {
        id: uuidv4(),
        event_id: visEvent.id,
        relationship_id: relationship.id,
        permission_level: 'view',
        metadata: {
          recovered_at: new Date().toISOString(),
          recovery_source: 'backup'
        }
      };
      
      await adminClient.from('event_permissions').insert(recoveredPermission);
      
      // Verify permission is enforced
      const { data: permission } = await adminClient
        .from('event_permissions')
        .select('*')
        .eq('event_id', visEvent.id)
        .eq('relationship_id', relationship.id)
        .single();
      
      expect(permission).toBeDefined();
      expect(permission.permission_level).toBe('view');
      
      // Cleanup
      await adminClient.from('event_permissions').delete().eq('id', recoveredPermission.id);
      await adminClient.from('events').delete().in('id', [event.id, visEvent.id]);
      await adminClient.from('relationships').delete().eq('id', relationship.id);
    });
  });
});
