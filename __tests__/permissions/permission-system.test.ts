import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createPermissionService } from '@/lib/permissions/permission-service';
import { v4 as uuidv4 } from 'uuid';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

describe('Permission System Tests', () => {
  let supabase: any;
  let permissionService: any;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;

  beforeAll(async () => {
    // Create admin client for testing
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    permissionService = createPermissionService(supabase);

    // Create test users
    const { data: user1 } = await supabase.auth.admin.createUser({
      email: 'permtest1@example.com',
      password: 'testpass123',
      email_confirm: true,
    });
    testUser1 = user1?.user;

    const { data: user2 } = await supabase.auth.admin.createUser({
      email: 'permtest2@example.com',
      password: 'testpass123',
      email_confirm: true,
    });
    testUser2 = user2?.user;

    const { data: user3 } = await supabase.auth.admin.createUser({
      email: 'permtest3@example.com',
      password: 'testpass123',
      email_confirm: true,
    });
    testUser3 = user3?.user;
  });

  afterAll(async () => {
    // Clean up test users
    if (testUser1) await supabase.auth.admin.deleteUser(testUser1.id);
    if (testUser2) await supabase.auth.admin.deleteUser(testUser2.id);
    if (testUser3) await supabase.auth.admin.deleteUser(testUser3.id);
  });

  describe('Calendar Visibility Permissions', () => {
    it('should allow users to view their own calendar', async () => {
      const result = await permissionService.canViewUserCalendar(
        testUser1.id,
        testUser1.id
      );
      
      expect(result.allowed).toBe(true);
      expect(result.level).toBe('full');
      expect(result.reason).toBe('Own calendar');
    });

    it('should deny calendar access without relationship', async () => {
      const result = await permissionService.canViewUserCalendar(
        testUser1.id,
        testUser2.id
      );
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('No relationship or shared group');
    });

    it('should allow calendar access with active relationship', async () => {
      // Create relationship
      const { data: relationship } = await supabase
        .from('relationships')
        .insert({
          user_id: testUser1.id,
          partner_id: testUser2.id,
          connection_tier: 'details',
          is_active: true,
          default_privacy_level: 'private',
          privacy_level: 'private',
        })
        .select()
        .single();

      const result = await permissionService.canViewUserCalendar(
        testUser1.id,
        testUser2.id
      );
      
      expect(result.allowed).toBe(true);
      expect(result.level).toBe('details');
      expect(result.reason).toBe('Direct relationship');

      // Clean up
      await supabase.from('relationships').delete().eq('id', relationship.id);
    });

    it('should respect connection tiers', async () => {
      // Create busy_only relationship
      const { data: busyRelationship } = await supabase
        .from('relationships')
        .insert({
          user_id: testUser1.id,
          partner_id: testUser2.id,
          connection_tier: 'busy_only',
          is_active: true,
          default_privacy_level: 'private',
          privacy_level: 'private',
        })
        .select()
        .single();

      const busyResult = await permissionService.canViewUserCalendar(
        testUser1.id,
        testUser2.id
      );
      
      expect(busyResult.allowed).toBe(true);
      expect(busyResult.level).toBe('busy_only');

      // Update to private tier
      await supabase
        .from('relationships')
        .update({ connection_tier: 'private' })
        .eq('id', busyRelationship.id);

      const privateResult = await permissionService.canViewUserCalendar(
        testUser1.id,
        testUser2.id
      );
      
      expect(privateResult.allowed).toBe(false);
      expect(privateResult.reason).toBe('Private connection tier');

      // Clean up
      await supabase.from('relationships').delete().eq('id', busyRelationship.id);
    });
  });

  describe('Event Visibility Permissions', () => {
    let testEvent: any;

    beforeAll(async () => {
      // Create test event
      const { data: event } = await supabase
        .from('events')
        .insert({
          user_id: testUser1.id,
          title: 'Test Event',
          description: 'Test Description',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'private',
          privacy_override: 'default',
        })
        .select()
        .single();
      testEvent = event;
    });

    afterAll(async () => {
      if (testEvent) {
        await supabase.from('events').delete().eq('id', testEvent.id);
      }
    });

    it('should allow event owner to view their own event', async () => {
      const result = await permissionService.canViewEvent(
        testUser1.id,
        testEvent.id
      );
      
      expect(result.allowed).toBe(true);
      expect(result.level).toBe('full');
      expect(result.reason).toBe('Own event');
    });

    it('should deny event access without relationship', async () => {
      const result = await permissionService.canViewEvent(
        testUser2.id,
        testEvent.id
      );
      
      expect(result.allowed).toBe(false);
    });

    it('should respect private override', async () => {
      // Create relationship
      const { data: relationship } = await supabase
        .from('relationships')
        .insert({
          user_id: testUser1.id,
          partner_id: testUser2.id,
          connection_tier: 'details',
          is_active: true,
          default_privacy_level: 'private',
          privacy_level: 'private',
        })
        .select()
        .single();

      // Update event to private override
      await supabase
        .from('events')
        .update({ privacy_override: 'private' })
        .eq('id', testEvent.id);

      const result = await permissionService.canViewEvent(
        testUser2.id,
        testEvent.id
      );
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Private event without permission');

      // Add explicit permission
      await supabase
        .from('event_permissions')
        .insert({
          event_id: testEvent.id,
          relationship_id: relationship.id,
          permission_level: 'private_override',
        });

      const resultWithPermission = await permissionService.canViewEvent(
        testUser2.id,
        testEvent.id
      );
      
      expect(resultWithPermission.allowed).toBe(true);
      expect(resultWithPermission.reason).toBe('Explicit permission granted');

      // Clean up
      await supabase.from('relationships').delete().eq('id', relationship.id);
    });
  });

  describe('Group Permissions', () => {
    let testGroup: any;

    beforeAll(async () => {
      // Create test group
      const { data: group } = await supabase
        .from('relationship_groups')
        .insert({
          user_id: testUser1.id,
          group_name: 'Test Group',
          description: 'Test group for permission testing',
        })
        .select()
        .single();
      testGroup = group;
    });

    afterAll(async () => {
      if (testGroup) {
        await supabase.from('relationship_groups').delete().eq('id', testGroup.id);
      }
    });

    it('should allow group members to see each other with default permissions', async () => {
      // Add users to group
      await supabase.from('group_members').insert([
        {
          group_id: testGroup.id,
          user_id: testUser1.id,
          role: 'creator',
        },
        {
          group_id: testGroup.id,
          user_id: testUser2.id,
          role: 'member',
        },
      ]);

      // User1 should see User2 via group
      const result = await permissionService.canViewUserCalendar(
        testUser1.id,
        testUser2.id
      );
      
      expect(result.allowed).toBe(true);
      expect(result.level).toBe('busy_only');
      expect(result.reason).toBe('Shared group membership');

      // Clean up
      await supabase.from('group_members').delete().eq('group_id', testGroup.id);
    });

    it('should respect group member permissions', async () => {
      // Add users to group
      await supabase.from('group_members').insert([
        {
          group_id: testGroup.id,
          user_id: testUser1.id,
          role: 'creator',
        },
        {
          group_id: testGroup.id,
          user_id: testUser2.id,
          role: 'member',
        },
      ]);

      // Add custom permission
      await supabase.from('group_member_permissions').insert({
        group_id: testGroup.id,
        user_id: testUser1.id,
        target_user_id: testUser2.id,
        permission_level: 'limited_access',
        can_see_details: true,
      });

      const result = await permissionService.canViewUserCalendar(
        testUser1.id,
        testUser2.id
      );
      
      expect(result.allowed).toBe(true);
      expect(result.level).toBe('details');
      expect(result.reason).toBe('Group permission');

      // Clean up
      await supabase.from('group_member_permissions').delete().eq('group_id', testGroup.id);
      await supabase.from('group_members').delete().eq('group_id', testGroup.id);
    });
  });

  describe('Visible Events Query', () => {
    it('should return only visible events', async () => {
      // Create events for different users
      const { data: ownEvent } = await supabase
        .from('events')
        .insert({
          user_id: testUser1.id,
          title: 'Own Event',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'private',
        })
        .select()
        .single();

      const { data: otherEvent } = await supabase
        .from('events')
        .insert({
          user_id: testUser2.id,
          title: 'Other User Event',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'private',
        })
        .select()
        .single();

      // Query without relationship - should only see own
      const { data: eventsNoRel } = await permissionService.getVisibleEventsQuery(
        testUser1.id
      );
      
      expect(eventsNoRel.length).toBe(1);
      expect(eventsNoRel[0].id).toBe(ownEvent.id);

      // Create relationship
      const { data: relationship } = await supabase
        .from('relationships')
        .insert({
          user_id: testUser1.id,
          partner_id: testUser2.id,
          connection_tier: 'details',
          is_active: true,
          default_privacy_level: 'private',
          privacy_level: 'private',
        })
        .select()
        .single();

      // Query with relationship - should see both
      const { data: eventsWithRel } = await permissionService.getVisibleEventsQuery(
        testUser1.id
      );
      
      expect(eventsWithRel.length).toBe(2);

      // Clean up
      await supabase.from('events').delete().eq('id', ownEvent.id);
      await supabase.from('events').delete().eq('id', otherEvent.id);
      await supabase.from('relationships').delete().eq('id', relationship.id);
    });

    it('should mask details for busy_only tier', async () => {
      // Create relationship with busy_only
      const { data: relationship } = await supabase
        .from('relationships')
        .insert({
          user_id: testUser1.id,
          partner_id: testUser2.id,
          connection_tier: 'busy_only',
          is_active: true,
          default_privacy_level: 'private',
          privacy_level: 'private',
        })
        .select()
        .single();

      // Create event for user2
      const { data: event } = await supabase
        .from('events')
        .insert({
          user_id: testUser2.id,
          title: 'Detailed Event Title',
          description: 'Secret details',
          location: 'Secret location',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          privacy_level: 'private',
        })
        .select()
        .single();

      // Query as user1
      const { data: events } = await permissionService.getVisibleEventsQuery(
        testUser1.id
      );
      
      const maskedEvent = events.find((e: any) => e.id === event.id);
      expect(maskedEvent).toBeDefined();
      expect(maskedEvent.title).toBe('Busy');
      expect(maskedEvent.description).toBeNull();
      expect(maskedEvent.location).toBeNull();
      expect(maskedEvent._visibility_level).toBe('busy_only');

      // Clean up
      await supabase.from('events').delete().eq('id', event.id);
      await supabase.from('relationships').delete().eq('id', relationship.id);
    });
  });
});
