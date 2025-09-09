/**
 * Mock Data Factory for PolyHarmony Calendar Test Data Generation
 * 
 * This module provides factory functions to generate realistic test data for all
 * app entities. Supports:
 * 
 * - Deterministic data generation for reproducible tests
 * - Relationship networks and polycule dynamics  
 * - Privacy level scenarios
 * - Event conflicts and scheduling complexity
 * - Realistic user data with diversity considerations
 * - Complex encryption scenarios
 * 
 * Usage:
 * import { MockDataFactory } from '@/tests/mocks/data-factory';
 * const user = MockDataFactory.createUser({ email: 'test@example.com' });
 */

import type {
  User,
  Relationship,
  Event,
  RelationshipGroup,
  GroupMember,
  ConnectionTier,
  PrivacyLevel,
  PrivacyOverride,
  RelationshipType,
  EventStatus,
  InvitationStatus,
  Invitation,
  ConnectionSetup,
} from '@/lib/supabase/types';

// ===================================================================
// DETERMINISTIC ID GENERATION
// ===================================================================

let idCounter = 1;

function generateId(prefix = 'test'): string {
  return `${prefix}-${idCounter++}`;
}

function resetIdCounter(): void {
  idCounter = 1;
}

// ===================================================================
// BASE DATA GENERATORS
// ===================================================================

const SAMPLE_NAMES = [
  'Alex Rivera', 'Jordan Chen', 'Casey Thompson', 'Riley Martinez', 
  'Avery Johnson', 'Morgan Davis', 'Sage Williams', 'Dakota Brown',
  'Phoenix Lee', 'River Garcia', 'Skyler Wilson', 'Ember Rodriguez'
];

const SAMPLE_EMAILS = [
  'alex.rivera@example.com', 'jordan.chen@example.com', 'casey.thompson@example.com',
  'riley.martinez@example.com', 'avery.johnson@example.com', 'morgan.davis@example.com',
  'sage.williams@example.com', 'dakota.brown@example.com', 'phoenix.lee@example.com',
  'river.garcia@example.com', 'skyler.wilson@example.com', 'ember.rodriguez@example.com'
];

const RELATIONSHIP_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff6348'
];

const EVENT_LOCATIONS = [
  'Coffee Shop', 'Home', 'Park', 'Restaurant', 'Office',
  '123 Main St, Apt 4B', 'Dr. Smith Medical Clinic', 
  'Therapy Office - Downtown', 'Community Center', 'Library'
];

const PRIVATE_EVENT_DESCRIPTIONS = [
  'STI testing appointment',
  'Couples therapy session',
  'Medical consultation - private',
  'Personal therapy appointment',
  'Relationship check-in',
  'Mental health appointment',
  'Private medical procedure'
];

const PUBLIC_EVENT_DESCRIPTIONS = [
  'Team meeting',
  'Lunch with friends',
  'Workout session',
  'Movie night',
  'Dinner date',
  'Study session',
  'Coffee meetup'
];

// ===================================================================
// USER FACTORY
// ===================================================================

interface CreateUserOptions {
  id?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export function createUser(options: CreateUserOptions = {}): User {
  const id = options.id || generateId('user');
  const nameIndex = Math.abs(hashString(id)) % SAMPLE_NAMES.length;
  const emailIndex = Math.abs(hashString(id)) % SAMPLE_EMAILS.length;
  
  const now = new Date().toISOString();
  
  return {
    id,
    email: options.email || SAMPLE_EMAILS[emailIndex],
    phone: options.phone || generatePhoneNumber(id),
    full_name: options.full_name || SAMPLE_NAMES[nameIndex],
    avatar_url: options.avatar_url || `https://i.pravatar.cc/150?u=${id}`,
    created_at: options.created_at || now,
    updated_at: options.updated_at || now,
  };
}

// ===================================================================
// SESSION FACTORY
// ===================================================================

interface CreateSessionOptions {
  user?: User;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export function createSession(options: CreateSessionOptions = {}) {
  const user = options.user || createUser();
  const now = Math.floor(Date.now() / 1000);
  
  return {
    access_token: options.access_token || `access_token_${user.id}_${now}`,
    refresh_token: options.refresh_token || `refresh_token_${user.id}_${now}`,
    expires_at: options.expires_at || now + 3600, // 1 hour from now
    expires_in: 3600,
    token_type: 'bearer',
    user,
  };
}

// ===================================================================
// RELATIONSHIP FACTORY
// ===================================================================

interface CreateRelationshipOptions {
  id?: string;
  user_id?: string;
  partner_id?: string;
  partner_name?: string;
  partner_email?: string;
  relationship_type?: RelationshipType;
  privacy_level?: PrivacyLevel;
  connection_tier?: ConnectionTier;
  color?: string;
  start_date?: string;
  is_active?: boolean;
  notes?: string;
}

export function createRelationship(options: CreateRelationshipOptions = {}): Relationship {
  const id = options.id || generateId('relationship');
  const userId = options.user_id || 'test-user-1';
  const partnerId = options.partner_id || generateId('partner');
  
  const nameIndex = Math.abs(hashString(partnerId)) % SAMPLE_NAMES.length;
  const emailIndex = Math.abs(hashString(partnerId)) % SAMPLE_EMAILS.length;
  const colorIndex = Math.abs(hashString(id)) % RELATIONSHIP_COLORS.length;
  
  const now = new Date().toISOString();
  const startDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return {
    id,
    user_id: userId,
    partner_id: partnerId,
    partner_name: options.partner_name || SAMPLE_NAMES[nameIndex],
    partner_email: options.partner_email || SAMPLE_EMAILS[emailIndex],
    relationship_type: options.relationship_type || 'primary',
    privacy_level: options.privacy_level || 'visible',
    connection_tier: options.connection_tier || 'details',
    color: options.color || RELATIONSHIP_COLORS[colorIndex],
    start_date: options.start_date || startDate,
    is_active: options.is_active !== undefined ? options.is_active : true,
    notes: options.notes,
    created_at: now,
    updated_at: now,
  };
}

// ===================================================================
// EVENT FACTORY
// ===================================================================

interface CreateEventOptions {
  id?: string;
  user_id?: string;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  privacy_level?: PrivacyLevel;
  privacy_override?: PrivacyOverride;
  status?: EventStatus;
  relationship_id?: string;
  color?: string;
  is_all_day?: boolean;
  recurrence_rule?: string;
}

export function createEvent(options: CreateEventOptions = {}): Event {
  const id = options.id || generateId('event');
  const userId = options.user_id || 'test-user-1';
  
  // Generate realistic start time (next 30 days, business hours mostly)
  const startTime = options.start_time || generateRealisticStartTime();
  const endTime = options.end_time || generateEndTime(startTime, 60); // Default 1 hour duration
  
  const privacyLevel = options.privacy_level || (Math.random() > 0.7 ? 'private' : 'visible');
  const isPrivate = privacyLevel === 'private';
  
  const descriptions = isPrivate ? PRIVATE_EVENT_DESCRIPTIONS : PUBLIC_EVENT_DESCRIPTIONS;
  const descIndex = Math.abs(hashString(id)) % descriptions.length;
  const locationIndex = Math.abs(hashString(id + 'location')) % EVENT_LOCATIONS.length;
  
  const now = new Date().toISOString();
  
  return {
    id,
    user_id: userId,
    title: options.title || (isPrivate ? 'Private Appointment' : 'Meeting'),
    description: options.description || descriptions[descIndex],
    start_time: startTime,
    end_time: endTime,
    location: options.location || EVENT_LOCATIONS[locationIndex],
    privacy_level: privacyLevel,
    privacy_override: options.privacy_override || 'default',
    status: options.status || 'confirmed',
    relationship_id: options.relationship_id,
    color: options.color || RELATIONSHIP_COLORS[Math.abs(hashString(id)) % RELATIONSHIP_COLORS.length],
    is_all_day: options.is_all_day || false,
    recurrence_rule: options.recurrence_rule,
    created_at: now,
    updated_at: now,
    time_zone: 'America/Los_Angeles',
    visible_to_relationships: [],
    visible_to_groups: [],
  };
}

// ===================================================================
// RELATIONSHIP GROUP FACTORY
// ===================================================================

interface CreateRelationshipGroupOptions {
  id?: string;
  user_id?: string;
  group_name?: string;
  description?: string;
  color?: string;
}

export function createRelationshipGroup(options: CreateRelationshipGroupOptions = {}): RelationshipGroup {
  const id = options.id || generateId('group');
  const userId = options.user_id || 'test-user-1';
  
  const groupNames = ['Close Partners', 'Casual Friends', 'Professional Network', 'Family Circle', 'Poly Network'];
  const nameIndex = Math.abs(hashString(id)) % groupNames.length;
  const colorIndex = Math.abs(hashString(id)) % RELATIONSHIP_COLORS.length;
  
  const now = new Date().toISOString();
  
  return {
    id,
    user_id: userId,
    group_name: options.group_name || groupNames[nameIndex],
    description: options.description || `A group for ${groupNames[nameIndex].toLowerCase()}`,
    color: options.color || RELATIONSHIP_COLORS[colorIndex],
    created_at: now,
    updated_at: now,
  };
}

// ===================================================================
// INVITATION FACTORY
// ===================================================================

interface CreateInvitationOptions {
  id?: string;
  sender_id?: string;
  recipient_email?: string;
  recipient_phone?: string;
  message?: string;
  status?: InvitationStatus;
  invitation_type?: 'friend_request' | 'group_invitation' | 'relationship_invitation';
}

export function createInvitation(options: CreateInvitationOptions = {}): Invitation {
  const id = options.id || generateId('invitation');
  const senderId = options.sender_id || 'test-user-1';
  
  const emailIndex = Math.abs(hashString(id)) % SAMPLE_EMAILS.length;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  
  return {
    id,
    sender_id: senderId,
    recipient_email: options.recipient_email || SAMPLE_EMAILS[emailIndex],
    recipient_phone: options.recipient_phone,
    message: options.message || 'Would you like to connect on PolyHarmony?',
    status: options.status || 'pending',
    invitation_type: options.invitation_type || 'friend_request',
    expires_at: expiresAt,
    created_at: now,
    updated_at: now,
  };
}

// ===================================================================
// COMPLEX SCENARIO FACTORIES
// ===================================================================

/**
 * Creates a realistic polycule network with multiple interconnected relationships
 */
export function createPolyculeNetwork(centerUserId: string, networkSize: number = 5): {
  users: User[];
  relationships: Relationship[];
  events: Event[];
  groups: RelationshipGroup[];
} {
  const users: User[] = [];
  const relationships: Relationship[] = [];
  const events: Event[] = [];
  const groups: RelationshipGroup[] = [];
  
  // Create center user if not exists
  const centerUser = createUser({ id: centerUserId });
  users.push(centerUser);
  
  // Create network users
  for (let i = 0; i < networkSize; i++) {
    const networkUser = createUser({ id: generateId('network-user') });
    users.push(networkUser);
    
    // Create relationship from center to network user
    const relationship = createRelationship({
      user_id: centerUserId,
      partner_id: networkUser.id,
      partner_name: networkUser.full_name,
      partner_email: networkUser.email,
      relationship_type: i < 2 ? 'primary' : i < 4 ? 'secondary' : 'casual',
      privacy_level: i < 3 ? 'visible' : 'semi_private',
    });
    relationships.push(relationship);
    
    // Create some events for each relationship
    for (let j = 0; j < 3; j++) {
      const event = createEvent({
        user_id: networkUser.id,
        relationship_id: relationship.id,
        privacy_level: Math.random() > 0.5 ? 'visible' : 'private',
      });
      events.push(event);
    }
    
    // Create some interconnections (metamour relationships)
    if (i > 0 && Math.random() > 0.6) {
      const previousUser = users[i];
      const metamourRelationship = createRelationship({
        user_id: previousUser.id,
        partner_id: networkUser.id,
        partner_name: networkUser.full_name,
        partner_email: networkUser.email,
        relationship_type: 'friendship',
        privacy_level: 'semi_private',
      });
      relationships.push(metamourRelationship);
    }
  }
  
  // Create relationship groups
  const primaryGroup = createRelationshipGroup({
    user_id: centerUserId,
    group_name: 'Primary Partners',
    description: 'My closest romantic relationships',
  });
  groups.push(primaryGroup);
  
  const casualGroup = createRelationshipGroup({
    user_id: centerUserId,
    group_name: 'Casual Connections',
    description: 'Friends and casual dating partners',
  });
  groups.push(casualGroup);
  
  return { users, relationships, events, groups };
}

/**
 * Creates events with specific conflict scenarios for testing
 */
export function createConflictingEvents(userIds: string[], baseTime: string): Event[] {
  const events: Event[] = [];
  const baseDate = new Date(baseTime);
  
  userIds.forEach((userId, index) => {
    // Create overlapping events
    const overlappingStart = new Date(baseDate.getTime() + index * 15 * 60 * 1000); // Stagger by 15 minutes
    const overlappingEnd = new Date(overlappingStart.getTime() + 90 * 60 * 1000); // 90 minute events
    
    const event = createEvent({
      user_id: userId,
      start_time: overlappingStart.toISOString(),
      end_time: overlappingEnd.toISOString(),
      title: `Meeting ${index + 1}`,
      privacy_level: index % 2 === 0 ? 'visible' : 'private',
    });
    
    events.push(event);
  });
  
  return events;
}

/**
 * Creates events with various privacy levels for testing privacy boundaries
 */
export function createPrivacyTestEvents(userId: string): Event[] {
  const privacyLevels: PrivacyLevel[] = ['private', 'visible', 'semi_private', 'public'];
  const events: Event[] = [];
  
  privacyLevels.forEach((privacyLevel, index) => {
    const startTime = new Date(Date.now() + index * 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + (index * 60 + 60) * 60 * 1000).toISOString();
    
    const event = createEvent({
      user_id: userId,
      privacy_level: privacyLevel,
      title: `${privacyLevel.charAt(0).toUpperCase() + privacyLevel.slice(1)} Event`,
      description: privacyLevel === 'private' ? 'This is sensitive information' : 'Regular event description',
      location: privacyLevel === 'private' ? '123 Private Lane, Apt 4B' : 'Coffee Shop',
      start_time: startTime,
      end_time: endTime,
    });
    
    events.push(event);
  });
  
  return events;
}

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

function generatePhoneNumber(seed: string): string {
  const hash = Math.abs(hashString(seed));
  const areaCode = 200 + (hash % 800); // 200-999
  const exchange = 200 + ((hash >> 8) % 800);
  const number = 1000 + ((hash >> 16) % 9000);
  return `(${areaCode}) ${exchange}-${number}`;
}

function generateRealisticStartTime(): string {
  const now = new Date();
  const futureDate = new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000); // Next 30 days
  
  // Bias towards business hours (8 AM - 6 PM)
  let hour = Math.random() > 0.7 ? Math.floor(Math.random() * 24) : Math.floor(Math.random() * 10) + 8;
  const minute = Math.floor(Math.random() / 0.25) * 15; // Round to 15-minute intervals
  
  futureDate.setHours(hour, minute, 0, 0);
  return futureDate.toISOString();
}

function generateEndTime(startTime: string, durationMinutes: number = 60): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return end.toISOString();
}

// ===================================================================
// EXPORT FACTORY CLASS
// ===================================================================

export class MockDataFactory {
  static createUser = createUser;
  static createSession = createSession;
  static createRelationship = createRelationship;
  static createEvent = createEvent;
  static createRelationshipGroup = createRelationshipGroup;
  static createInvitation = createInvitation;
  
  // Complex scenarios
  static createPolyculeNetwork = createPolyculeNetwork;
  static createConflictingEvents = createConflictingEvents;
  static createPrivacyTestEvents = createPrivacyTestEvents;
  
  // Utility
  static resetIdCounter = resetIdCounter;
  static generateId = generateId;
}

export default MockDataFactory;
