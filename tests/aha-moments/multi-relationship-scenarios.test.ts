/**
 * Multi-Relationship Scenario Testing
 * 
 * Tests the key "aha moments" that users need to experience for the app to be successful:
 * 1. Creating account and syncing calendar with Google/Apple
 * 2. Inviting a friend and adding them as a connection with unique permissions  
 * 3. Creating event with 3+ friends with different permission structures
 * 4. Examining how events display per each account based on privacy levels
 * 
 * These tests simulate realistic polyamorous relationship dynamics and ensure
 * the core value proposition of the app works flawlessly.
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from '../db/test-utilities';

// Realistic test personas representing different polyamory dynamics
const createTestPersonas = () => ({
  // Primary relationship holder
  alex: {
    id: 'alex-poly-organizer',
    phone: '+14155552001', 
    display_name: 'Alex Chen',
    email: 'alex.chen@testpoly.com',
    timezone: 'America/Los_Angeles',
    preferences: {
      default_privacy: 'semi_private',
      calendar_sync: 'google',
      notifications_enabled: true
    }
  },
  
  // Established primary partner
  jordan: {
    id: 'jordan-primary',
    phone: '+14155552002',
    display_name: 'Jordan Rivera', 
    email: 'jordan.r@testpoly.com',
    timezone: 'America/Los_Angeles',
    preferences: {
      default_privacy: 'visible',
      calendar_sync: 'apple',
      notifications_enabled: true
    }
  },
  
  // Secondary partner with specific boundaries
  sam: {
    id: 'sam-secondary',
    phone: '+14155552003',
    display_name: 'Sam Thompson',
    email: 'sam.t@testpoly.com', 
    timezone: 'America/New_York',
    preferences: {
      default_privacy: 'semi_private',
      calendar_sync: null,
      notifications_enabled: false
    }
  },
  
  // New casual connection
  riley: {
    id: 'riley-casual',
    phone: '+14155552004',
    display_name: 'Riley Park',
    email: 'riley.park@testpoly.com',
    timezone: 'America/Denver', 
    preferences: {
      default_privacy: 'private',
      calendar_sync: 'google',
      notifications_enabled: true
    }
  },
  
  // Metamour (partner's partner) with friendship boundary
  casey: {
    id: 'casey-metamour',
    phone: '+14155552005', 
    display_name: 'Casey Williams',
    email: 'casey.w@testpoly.com',
    timezone: 'America/Chicago',
    preferences: {
      default_privacy: 'visible',
      calendar_sync: 'apple',
      notifications_enabled: true
    }
  }
});

// Complex relationship network representing real polyamory dynamics
const createRelationshipNetwork = (personas: any) => [
  // Alex's relationships (the main user we'll test from)
  {
    user_id: personas.alex.id,
    partner_id: personas.jordan.id,
    relationship_type: 'primary',
    default_privacy_level: 'visible',
    can_view_schedule: true,
    can_create_events: true,
    established_date: '2020-03-15'
  },
  {
    user_id: personas.alex.id,
    partner_id: personas.sam.id, 
    relationship_type: 'secondary',
    default_privacy_level: 'semi_private',
    can_view_schedule: true,
    can_create_events: false,
    established_date: '2022-08-22'
  },
  {
    user_id: personas.alex.id,
    partner_id: personas.riley.id,
    relationship_type: 'casual',
    default_privacy_level: 'private',
    can_view_schedule: false,
    can_create_events: false,
    established_date: '2024-01-10'
  },
  {
    user_id: personas.alex.id,
    partner_id: personas.casey.id,
    relationship_type: 'friendship',
    default_privacy_level: 'visible',
    can_view_schedule: true,
    can_create_events: true,
    established_date: '2021-11-30',
    notes: 'Jordan\'s other partner - metamour relationship'
  },
  
  // Reciprocal relationships
  {
    user_id: personas.jordan.id,
    partner_id: personas.alex.id,
    relationship_type: 'primary',
    default_privacy_level: 'visible',
    can_view_schedule: true,
    can_create_events: true
  },
  {
    user_id: personas.jordan.id,
    partner_id: personas.casey.id,
    relationship_type: 'secondary',
    default_privacy_level: 'visible',
    can_view_schedule: true, 
    can_create_events: true
  },
  
  // Additional network connections
  {
    user_id: personas.sam.id,
    partner_id: personas.alex.id,
    relationship_type: 'secondary',
    default_privacy_level: 'semi_private',
    can_view_schedule: false, // Sam prefers more privacy
    can_create_events: false
  },
  {
    user_id: personas.casey.id,
    partner_id: personas.jordan.id,
    relationship_type: 'primary',
    default_privacy_level: 'visible',
    can_view_schedule: true,
    can_create_events: true  
  },
  {
    user_id: personas.casey.id,
    partner_id: personas.alex.id,
    relationship_type: 'friendship',
    default_privacy_level: 'semi_private',
    can_view_schedule: true,
    can_create_events: false,
    notes: 'Metamour relationship - friend zone'
  }
];

describe('🎯 AHA MOMENT 1: Account Creation & Calendar Sync', () => {
  let supabase: any;
  let personas: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    personas = createTestPersonas();
    await testHelpers.setupTestEnvironment(supabase);
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
  });

  it('✨ CRITICAL AHA MOMENT: User creates account and syncs Google Calendar seamlessly', async () => {
    const alex = personas.alex;
    
    // Step 1: User signs up
    const { data: authResult, error: authError } = await supabase.auth.signUp({
      phone: alex.phone,
      password: 'SecurePassword123!',
    });
    
    expect(authError).toBeNull();
    expect(authResult.user).toBeDefined();
    
    // Step 2: Complete user profile creation
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authResult.user!.id,
        phone_number: alex.phone,
        email: alex.email,
        display_name: alex.display_name,
        timezone: alex.timezone,
        subscription_tier: 'free',
        onboarding_completed: false
      });
    
    expect(profileError).toBeNull();
    
    // Step 3: Simulate Google Calendar OAuth success
    const googleAuthData = {
      user_id: authResult.user!.id,
      provider: 'google',
      access_token: 'mock-google-access-token',
      refresh_token: 'mock-google-refresh-token', 
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      calendar_id: 'alex.chen@gmail.com',
      sync_enabled: true
    };
    
    const { error: calendarError } = await supabase
      .from('calendar_integrations')
      .insert(googleAuthData);
      
    expect(calendarError).toBeNull();
    
    // Step 4: Import existing Google Calendar events (simulated)
    const existingGoogleEvents = [
      {
        user_id: authResult.user!.id,
        title: 'Work Meeting',
        start_time: '2024-02-15T09:00:00Z',
        end_time: '2024-02-15T10:00:00Z',
        privacy_level: 'private',
        external_id: 'google-event-123',
        source: 'google_calendar'
      },
      {
        user_id: authResult.user!.id,
        title: 'Lunch with Friends',
        start_time: '2024-02-15T12:00:00Z', 
        end_time: '2024-02-15T13:00:00Z',
        privacy_level: 'visible',
        external_id: 'google-event-456',
        source: 'google_calendar'
      }
    ];
    
    for (const event of existingGoogleEvents) {
      const { error: eventError } = await supabase
        .from('events')
        .insert(event);
      expect(eventError).toBeNull();
    }
    
    // Step 5: Mark onboarding as completed
    const { error: onboardingError } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', authResult.user!.id);
      
    expect(onboardingError).toBeNull();
    
    // VERIFICATION: User should now see their imported calendar
    const { data: userEvents, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', authResult.user!.id);
      
    expect(eventsError).toBeNull();
    expect(userEvents).toHaveLength(2);
    expect(userEvents.some(e => e.title === 'Work Meeting')).toBe(true);
    expect(userEvents.some(e => e.title === 'Lunch with Friends')).toBe(true);
    
    // CRITICAL: Privacy levels should be preserved from import
    const workMeeting = userEvents.find(e => e.title === 'Work Meeting');
    expect(workMeeting.privacy_level).toBe('private');
    
    console.log('✅ AHA MOMENT 1: Account creation and calendar sync successful');
  });
  
  it('✨ Apple Calendar sync works equally well', async () => {
    const jordan = personas.jordan;
    
    // Create account
    const { data: authResult } = await supabase.auth.signUp({
      phone: jordan.phone,
      password: 'AnotherSecurePassword123!',
    });
    
    await supabase.from('users').insert({
      id: authResult.user!.id,
      phone_number: jordan.phone,
      email: jordan.email,
      display_name: jordan.display_name,
      timezone: jordan.timezone,
      subscription_tier: 'free'
    });
    
    // Simulate CalDAV/Apple Calendar setup
    const appleCalendarData = {
      user_id: authResult.user!.id,
      provider: 'apple',
      caldav_url: 'https://caldav.icloud.com/123456/calendars/',
      username: jordan.email,
      app_password: 'mock-app-specific-password',
      sync_enabled: true,
      last_sync: new Date().toISOString()
    };
    
    const { error: appleSetupError } = await supabase
      .from('calendar_integrations')
      .insert(appleCalendarData);
      
    expect(appleSetupError).toBeNull();
    
    console.log('✅ Apple Calendar integration setup successful');
  });
});

describe('🎯 AHA MOMENT 2: Friend Invitation & Connection Setup', () => {
  let supabase: any;
  let personas: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    personas = createTestPersonas();
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    
    // Set up Alex as the primary user who will invite others
    await testHelpers.createTestUser(supabase, personas.alex);
    await testHelpers.authenticateAs(supabase, personas.alex);
  });

  it('✨ CRITICAL AHA MOMENT: Invite friend and set up relationship with custom permissions', async () => {
    const alex = personas.alex;
    const jordan = personas.jordan;
    
    // Step 1: Alex sends invitation to Jordan
    const invitationData = {
      inviter_id: alex.id,
      invitee_email: jordan.email,
      invitee_phone: jordan.phone,
      suggested_relationship_type: 'primary',
      suggested_privacy_level: 'visible',
      personal_message: 'Hey Jordan! Let\'s coordinate our schedules better with this new app I found.',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert(invitationData)
      .select()
      .single();
      
    expect(inviteError).toBeNull();
    expect(invitation).toBeDefined();
    expect(invitation.status).toBe('pending');
    
    // Step 2: Jordan receives email and creates account (simulated)
    await testHelpers.createTestUser(supabase, jordan);
    
    // Step 3: Jordan accepts invitation and sets up relationship
    await testHelpers.authenticateAs(supabase, jordan);
    
    const { error: acceptError } = await supabase
      .from('invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);
    
    expect(acceptError).toBeNull();
    
    // Step 4: Create reciprocal relationships with specific permissions
    const alexJordanRelationship = {
      user_id: alex.id,
      partner_id: jordan.id,
      relationship_type: 'primary',
      default_privacy_level: 'visible',
      can_view_schedule: true,
      can_create_events: true,
      can_edit_shared_events: true,
      notification_preferences: {
        event_invitations: true,
        schedule_changes: true,
        conflict_alerts: true
      }
    };
    
    const jordanAlexRelationship = {
      user_id: jordan.id,
      partner_id: alex.id,
      relationship_type: 'primary',
      default_privacy_level: 'visible',
      can_view_schedule: true,
      can_create_events: true,
      can_edit_shared_events: true,
      notification_preferences: {
        event_invitations: true,
        schedule_changes: true,
        conflict_alerts: true
      }
    };
    
    const { error: rel1Error } = await supabase
      .from('relationships')
      .insert(alexJordanRelationship);
    const { error: rel2Error } = await supabase
      .from('relationships')
      .insert(jordanAlexRelationship);
      
    expect(rel1Error).toBeNull();
    expect(rel2Error).toBeNull();
    
    // VERIFICATION: Both users should now see each other in their relationships
    await testHelpers.authenticateAs(supabase, alex);
    const { data: alexRelationships } = await supabase
      .from('relationships')
      .select('*, partner:users!relationships_partner_id_fkey(*)')
      .eq('user_id', alex.id);
      
    expect(alexRelationships).toHaveLength(1);
    expect(alexRelationships[0].partner.display_name).toBe(jordan.display_name);
    expect(alexRelationships[0].relationship_type).toBe('primary');
    
    await testHelpers.authenticateAs(supabase, jordan);
    const { data: jordanRelationships } = await supabase
      .from('relationships')
      .select('*, partner:users!relationships_partner_id_fkey(*)')
      .eq('user_id', jordan.id);
      
    expect(jordanRelationships).toHaveLength(1);
    expect(jordanRelationships[0].partner.display_name).toBe(alex.display_name);
    
    console.log('✅ AHA MOMENT 2: Friend invitation and relationship setup successful');
  });
  
  it('✨ Different relationship types get different default permissions', async () => {
    // Alex invites Sam as secondary partner
    await testHelpers.createTestUser(supabase, personas.sam);
    
    const secondaryRelationship = {
      user_id: personas.alex.id,
      partner_id: personas.sam.id,
      relationship_type: 'secondary',
      default_privacy_level: 'semi_private', // Different from primary
      can_view_schedule: true,
      can_create_events: false, // Limited permissions
      can_edit_shared_events: false
    };
    
    const { error: relError } = await supabase
      .from('relationships')
      .insert(secondaryRelationship);
    expect(relError).toBeNull();
    
    // Alex invites Riley as casual connection  
    await testHelpers.createTestUser(supabase, personas.riley);
    
    const casualRelationship = {
      user_id: personas.alex.id,
      partner_id: personas.riley.id,
      relationship_type: 'casual',
      default_privacy_level: 'private', // Most restrictive
      can_view_schedule: false,
      can_create_events: false,
      can_edit_shared_events: false
    };
    
    const { error: casualError } = await supabase
      .from('relationships')
      .insert(casualRelationship);
    expect(casualError).toBeNull();
    
    // Verify different permission levels exist
    const { data: relationships } = await supabase
      .from('relationships')
      .select('relationship_type, default_privacy_level, can_view_schedule')
      .eq('user_id', personas.alex.id);
      
    expect(relationships).toHaveLength(2);
    
    const secondaryRel = relationships.find(r => r.relationship_type === 'secondary');
    const casualRel = relationships.find(r => r.relationship_type === 'casual');
    
    expect(secondaryRel.default_privacy_level).toBe('semi_private');
    expect(secondaryRel.can_view_schedule).toBe(true);
    
    expect(casualRel.default_privacy_level).toBe('private');
    expect(casualRel.can_view_schedule).toBe(false);
    
    console.log('✅ Different relationship types configured with appropriate permissions');
  });
});

describe('🎯 AHA MOMENT 3: Multi-Partner Event Creation', () => {
  let supabase: any;
  let personas: any;
  let relationships: any[];
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    personas = createTestPersonas();
    relationships = createRelationshipNetwork(personas);
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    
    // Set up full relationship network
    for (const persona of Object.values(personas)) {
      await testHelpers.createTestUser(supabase, persona);
    }
    
    for (const relationship of relationships) {
      await testHelpers.createTestRelationship(supabase, relationship);
    }
    
    await testHelpers.authenticateAs(supabase, personas.alex);
  });

  it('✨ CRITICAL AHA MOMENT: Create event involving 3+ partners with different privacy levels', async () => {
    // Alex wants to organize a group dinner involving Jordan, Sam, and Casey
    const groupEvent = {
      user_id: personas.alex.id,
      title: 'Polycule Dinner at Olive Garden',
      description: 'Monthly group dinner to catch up and coordinate calendars. Family-style Italian food!',
      start_time: '2024-02-20T18:30:00Z',
      end_time: '2024-02-20T21:00:00Z',
      location: 'Olive Garden - Downtown Location',
      privacy_level: 'visible', // Default level
      event_type: 'group_social',
      requires_rsvp: true,
      max_attendees: 6
    };
    
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(groupEvent)
      .select()
      .single();
      
    expect(eventError).toBeNull();
    expect(event).toBeDefined();
    
    // Add attendees with different visibility permissions
    const eventAttendees = [
      {
        event_id: event.id,
        user_id: personas.jordan.id,
        invited_by: personas.alex.id,
        permission_level: 'full', // Primary partner sees everything
        rsvp_status: 'pending',
        can_invite_others: true
      },
      {
        event_id: event.id,
        user_id: personas.sam.id,
        invited_by: personas.alex.id,
        permission_level: 'title_only', // Secondary partner, limited info
        rsvp_status: 'pending',
        can_invite_others: false
      },
      {
        event_id: event.id,
        user_id: personas.casey.id,
        invited_by: personas.alex.id,
        permission_level: 'visible', // Metamour friend, good relationship
        rsvp_status: 'pending',
        can_invite_others: false
      }
    ];
    
    for (const attendee of eventAttendees) {
      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert(attendee);
      expect(attendeeError).toBeNull();
    }
    
    // Set specific privacy overrides for this event
    const privacySettings = [
      {
        event_id: event.id,
        user_id: personas.jordan.id,
        permission_level: 'full'
      },
      {
        event_id: event.id,
        user_id: personas.sam.id,
        permission_level: 'title_only'
      },
      {
        event_id: event.id,
        user_id: personas.casey.id,
        permission_level: 'visible'
      },
      {
        event_id: event.id,
        user_id: personas.riley.id,
        permission_level: 'none' // Casual partner doesn't see this event
      }
    ];
    
    for (const setting of privacySettings) {
      const { error: privacyError } = await supabase
        .from('event_privacy')
        .insert(setting);
      expect(privacyError).toBeNull();
    }
    
    // VERIFICATION: Check that conflict detection works across all attendees
    const conflictCheckData = {
      event_start: '2024-02-20T18:00:00Z',
      event_end: '2024-02-20T22:00:00Z',
      partner_ids: [personas.jordan.id, personas.sam.id, personas.casey.id],
      exclude_event_id: event.id
    };
    
    const conflictResponse = await fetch('/api/events/check-conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conflictCheckData)
    });
    
    const conflictResult = await conflictResponse.json();
    expect(conflictResult.success).toBe(true);
    // Should show no conflicts since this is a new event
    expect(conflictResult.has_conflicts).toBe(false);
    
    console.log('✅ AHA MOMENT 3: Multi-partner event creation successful');
  });
  
  it('✨ Event creation with existing conflicts shows smart warnings', async () => {
    // Sam already has a private therapy session scheduled
    const conflictingEvent = {
      user_id: personas.sam.id,
      title: 'Weekly Therapy Session',
      start_time: '2024-02-20T19:00:00Z',
      end_time: '2024-02-20T20:00:00Z',
      privacy_level: 'private',
      recurring: true,
      recurrence_pattern: 'weekly'
    };
    
    await testHelpers.authenticateAs(supabase, personas.sam);
    const { error: conflictEventError } = await supabase
      .from('events')
      .insert(conflictingEvent);
    expect(conflictEventError).toBeNull();
    
    // Alex tries to create overlapping group event
    await testHelpers.authenticateAs(supabase, personas.alex);
    
    const overlappingEvent = {
      event_start: '2024-02-20T18:30:00Z',
      event_end: '2024-02-20T21:00:00Z',
      partner_ids: [personas.jordan.id, personas.sam.id] // Sam is busy!
    };
    
    const conflictResponse = await fetch('/api/events/check-conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overlappingEvent)
    });
    
    const result = await conflictResponse.json();
    
    expect(result.has_conflicts).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    
    const samConflict = result.conflicts[0];
    expect(samConflict.partner_id).toBe(personas.sam.id);
    expect(samConflict.conflicting_events).toHaveLength(1);
    
    // Should show generic "Private Event" title, not therapy details
    expect(samConflict.conflicting_events[0].title).toBe('Private Event');
    expect(samConflict.conflicting_events[0].description).toBeNull();
    
    console.log('✅ Conflict detection preserves privacy while showing helpful warnings');
  });
});

describe('🎯 AHA MOMENT 4: Multi-Perspective Event Visibility', () => {
  let supabase: any;
  let personas: any;
  let sharedEvent: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    personas = createTestPersonas();
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    
    // Set up full network
    for (const persona of Object.values(personas)) {
      await testHelpers.createTestUser(supabase, persona);
    }
    
    const relationships = createRelationshipNetwork(personas);
    for (const relationship of relationships) {
      await testHelpers.createTestRelationship(supabase, relationship);
    }
    
    // Create a shared event with complex privacy settings
    await testHelpers.authenticateAs(supabase, personas.alex);
    
    const eventData = {
      user_id: personas.alex.id,
      title: 'Alex\'s Birthday Celebration',
      description: 'Surprise party details and gift coordination - please don\'t spoil the surprise!',
      start_time: '2024-03-15T19:00:00Z',
      end_time: '2024-03-15T23:00:00Z',
      location: 'Secret Rooftop Venue - Downtown',
      privacy_level: 'visible'
    };
    
    const { data: event } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();
      
    sharedEvent = event;
    
    // Set different privacy levels for each relationship
    const privacyOverrides = [
      {
        event_id: event.id,
        user_id: personas.jordan.id,
        permission_level: 'full' // Primary partner - full access
      },
      {
        event_id: event.id,
        user_id: personas.sam.id,
        permission_level: 'title_and_time' // Secondary - basic details only
      },
      {
        event_id: event.id,
        user_id: personas.casey.id,
        permission_level: 'visible' // Metamour friend - most details
      },
      {
        event_id: event.id,
        user_id: personas.riley.id,
        permission_level: 'none' // Casual - hidden completely
      }
    ];
    
    for (const override of privacyOverrides) {
      await supabase.from('event_privacy').insert(override);
    }
  });

  it('✨ CRITICAL AHA MOMENT: Each partner sees event differently based on permissions', async () => {
    const eventId = sharedEvent.id;
    
    // Test Jordan's view (primary partner - should see everything)
    await testHelpers.authenticateAs(supabase, personas.jordan);
    const { data: jordanView } = await supabase
      .from('events_with_privacy')
      .select('*')
      .eq('id', eventId);
    
    expect(jordanView).toHaveLength(1);
    expect(jordanView[0].title).toBe('Alex\'s Birthday Celebration');
    expect(jordanView[0].description).toContain('Surprise party details');
    expect(jordanView[0].location).toBe('Secret Rooftop Venue - Downtown');
    console.log('✅ Jordan (primary) sees full event details');
    
    // Test Sam's view (secondary partner - title and time only)
    await testHelpers.authenticateAs(supabase, personas.sam);
    const { data: samView } = await supabase
      .from('events_with_privacy')
      .select('*')
      .eq('id', eventId);
    
    expect(samView).toHaveLength(1);
    expect(samView[0].title).toBe('Alex\'s Birthday Celebration');
    expect(samView[0].description).toBeNull(); // Hidden
    expect(samView[0].location).toBeNull(); // Hidden
    console.log('✅ Sam (secondary) sees limited event details');
    
    // Test Casey's view (metamour friend - visible details)
    await testHelpers.authenticateAs(supabase, personas.casey);
    const { data: caseyView } = await supabase
      .from('events_with_privacy')
      .select('*')
      .eq('id', eventId);
    
    expect(caseyView).toHaveLength(1);
    expect(caseyView[0].title).toBe('Alex\'s Birthday Celebration');
    expect(caseyView[0].description).toContain('Surprise party'); // Should see some details
    expect(caseyView[0].location).toBeTruthy(); // Should see location
    console.log('✅ Casey (metamour) sees appropriate event details');
    
    // Test Riley's view (casual partner - should see nothing)
    await testHelpers.authenticateAs(supabase, personas.riley);
    const { data: rileyView } = await supabase
      .from('events_with_privacy')
      .select('*')
      .eq('id', eventId);
    
    expect(rileyView).toHaveLength(0); // Event completely hidden
    console.log('✅ Riley (casual) sees no event details');
  });
  
  it('✨ Calendar views show appropriate level of detail per relationship', async () => {
    // Test full calendar month view from each perspective
    const monthStart = '2024-03-01T00:00:00Z';
    const monthEnd = '2024-03-31T23:59:59Z';
    
    // Jordan's calendar view (should show Alex's events based on their relationship)
    await testHelpers.authenticateAs(supabase, personas.jordan);
    const { data: jordanCalendar } = await supabase
      .from('events_with_privacy')
      .select('*')
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd);
    
    // Should include Alex's birthday event with full details
    const jordanBirthdayEvent = jordanCalendar?.find(e => e.title === 'Alex\'s Birthday Celebration');
    expect(jordanBirthdayEvent).toBeDefined();
    expect(jordanBirthdayEvent.description).toBeTruthy(); // Full access
    
    // Sam's calendar view (should show limited details)
    await testHelpers.authenticateAs(supabase, personas.sam);
    const { data: samCalendar } = await supabase
      .from('events_with_privacy')
      .select('*')
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd);
    
    const samBirthdayEvent = samCalendar?.find(e => e.title === 'Alex\'s Birthday Celebration');
    expect(samBirthdayEvent).toBeDefined();
    expect(samBirthdayEvent.description).toBeNull(); // Limited access
    
    // Riley's calendar view (should not show event at all)
    await testHelpers.authenticateAs(supabase, personas.riley);
    const { data: rileyCalendar } = await supabase
      .from('events_with_privacy')
      .select('*')
      .gte('start_time', monthStart)
      .lte('start_time', monthEnd);
    
    const rileyBirthdayEvent = rileyCalendar?.find(e => e.title === 'Alex\'s Birthday Celebration');
    expect(rileyBirthdayEvent).toBeUndefined(); // No access
    
    console.log('✅ Calendar views correctly apply privacy filtering');
  });
  
  it('✨ Privacy perspective toggle shows how events appear to each partner', async () => {
    // Alex checks how the event appears from Sam's perspective
    await testHelpers.authenticateAs(supabase, personas.alex);
    
    const perspectiveData = {
      event_id: sharedEvent.id,
      viewing_as: personas.sam.id
    };
    
    const perspectiveResponse = await fetch('/api/events/privacy-perspective', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perspectiveData)
    });
    
    const perspectiveResult = await perspectiveResponse.json();
    
    expect(perspectiveResult.success).toBe(true);
    expect(perspectiveResult.event_preview).toBeDefined();
    expect(perspectiveResult.event_preview.title).toBe('Alex\'s Birthday Celebration');
    expect(perspectiveResult.event_preview.description).toBeNull(); // As Sam would see it
    expect(perspectiveResult.event_preview.location).toBeNull(); // Hidden from Sam
    
    // Alex checks how it appears from Riley's perspective (should be hidden)
    const rileyPerspectiveData = {
      event_id: sharedEvent.id,
      viewing_as: personas.riley.id
    };
    
    const rileyPerspectiveResponse = await fetch('/api/events/privacy-perspective', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rileyPerspectiveData)
    });
    
    const rileyResult = await rileyPerspectiveResponse.json();
    
    expect(rileyResult.success).toBe(true);
    expect(rileyResult.event_preview).toBeNull(); // Completely hidden from Riley
    expect(rileyResult.message).toContain('This event is not visible');
    
    console.log('✅ Privacy perspective toggle working correctly');
  });
});

describe('🔍 Advanced Multi-Relationship Scenarios', () => {
  let supabase: any;
  let personas: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    personas = createTestPersonas();
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    
    for (const persona of Object.values(personas)) {
      await testHelpers.createTestUser(supabase, persona);
    }
    
    const relationships = createRelationshipNetwork(personas);
    for (const relationship of relationships) {
      await testHelpers.createTestRelationship(supabase, relationship);
    }
  });

  it('🌐 Complex metamour relationships with indirect privacy', async () => {
    // Jordan creates an event that affects Casey (their other partner)
    // Alex (metamour to Casey through Jordan) should see limited info
    
    await testHelpers.authenticateAs(supabase, personas.jordan);
    
    const jordanCaseyEvent = {
      user_id: personas.jordan.id,
      title: 'Anniversary Dinner with Casey',
      description: 'Celebrating 2 years together at our special place',
      start_time: '2024-02-14T19:00:00Z',
      end_time: '2024-02-14T22:00:00Z',
      privacy_level: 'semi_private',
      location: 'Romantic Restaurant'
    };
    
    const { data: event } = await supabase
      .from('events')
      .insert(jordanCaseyEvent)
      .select()
      .single();
    
    // Set specific privacy for metamour Alex
    await supabase
      .from('event_privacy')
      .insert({
        event_id: event.id,
        user_id: personas.alex.id,
        permission_level: 'title_only' // Metamour sees title but no details
      });
    
    // Alex should see the event exists but with limited info (scheduling awareness)
    await testHelpers.authenticateAs(supabase, personas.alex);
    const { data: alexView } = await supabase
      .from('events_with_privacy')
      .select('*')
      .eq('id', event.id);
    
    expect(alexView).toHaveLength(1);
    expect(alexView[0].title).toBe('Anniversary Dinner with Casey');
    expect(alexView[0].description).toBeNull(); // Private details hidden
    expect(alexView[0].location).toBeNull(); // Location hidden
    
    console.log('✅ Metamour privacy boundaries working correctly');
  });
  
  it('📅 Recurring events with complex privacy across relationships', async () => {
    // Alex has weekly therapy (private) that creates recurring conflicts
    await testHelpers.authenticateAs(supabase, personas.alex);
    
    const recurringTherapy = {
      user_id: personas.alex.id,
      title: 'Weekly Therapy Session',
      start_time: '2024-02-07T15:00:00Z',
      end_time: '2024-02-07T16:00:00Z',
      privacy_level: 'private',
      recurring: true,
      recurrence_pattern: 'RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=12', // 12 weeks
      recurrence_exceptions: ['2024-02-21T15:00:00Z'] // Skip one week
    };
    
    const { data: therapyEvent } = await supabase
      .from('events')
      .insert(recurringTherapy)
      .select()
      .single();
    
    // Jordan tries to plan regular weekly dates at the same time
    const conflictingDate = {
      event_start: '2024-02-14T14:30:00Z', // Next week, overlapping
      event_end: '2024-02-14T17:00:00Z',
      partner_ids: [personas.alex.id]
    };
    
    const conflictResponse = await fetch('/api/events/check-conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conflictingDate)
    });
    
    const result = await conflictResponse.json();
    
    expect(result.has_conflicts).toBe(true);
    expect(result.conflicts[0].conflicting_events[0].title).toBe('Private Event');
    
    // But should suggest the exception week as an alternative
    expect(result.smart_suggestions?.alternative_slots).toBeDefined();
    const alternatives = result.smart_suggestions.alternative_slots;
    const exceptionWeek = alternatives.find((alt: any) => 
      alt.start_time.includes('2024-02-21')
    );
    expect(exceptionWeek).toBeDefined();
    
    console.log('✅ Recurring events with privacy and exceptions working');
  });
  
  it('🎭 Permission changes affect event visibility in real-time', async () => {
    // Create event as Alex
    await testHelpers.authenticateAs(supabase, personas.alex);
    
    const { data: event } = await supabase
      .from('events')
      .insert({
        user_id: personas.alex.id,
        title: 'Relationship Status Discussion',
        description: 'Important conversation about our relationship boundaries',
        start_time: '2024-02-10T14:00:00Z',
        end_time: '2024-02-10T16:00:00Z',
        privacy_level: 'visible'
      })
      .select()
      .single();
    
    // Initially Sam can see it (semi-private relationship)
    await testHelpers.authenticateAs(supabase, personas.sam);
    let { data: samView } = await supabase
      .from('events_with_privacy')
      .select('*')
      .eq('id', event.id);
    
    expect(samView).toHaveLength(1);
    expect(samView[0].title).toBe('Relationship Status Discussion');
    
    // Alex decides this is too personal and changes Sam's permission
    await testHelpers.authenticateAs(supabase, personas.alex);
    await supabase
      .from('event_privacy')
      .insert({
        event_id: event.id,
        user_id: personas.sam.id,
        permission_level: 'none'
      });
    
    // Sam should immediately lose access
    await testHelpers.authenticateAs(supabase, personas.sam);
    ({ data: samView } = await supabase
      .from('events_with_privacy')
      .select('*')
      .eq('id', event.id));
    
    expect(samView).toHaveLength(0); // No longer visible
    
    console.log('✅ Real-time permission changes working correctly');
  });
});
