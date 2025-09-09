/**
 * TypeScript Type Definitions for Encrypted Fields
 * 
 * Provides type-safe interfaces for handling encrypted data throughout
 * the application, ensuring that sensitive fields are properly marked
 * and handled with appropriate encryption/decryption.
 */

import { z } from 'zod';

/**
 * Branded type for encrypted strings to prevent accidental usage
 * of encrypted data without decryption
 */
export type EncryptedString = string & { readonly __encrypted: unique symbol };

/**
 * Helper type to mark a field as potentially encrypted
 */
export type MaybeEncrypted<T> = T | EncryptedString;

/**
 * Interface for events with encrypted fields
 */
export interface EncryptedEvent {
  id: string;
  user_id: string;
  title: string;
  description?: MaybeEncrypted<string>;
  start_time: string;
  end_time: string;
  location?: MaybeEncrypted<string>;
  time_zone?: string;
  is_all_day?: boolean;
  privacy_level?: 'private' | 'visible' | 'semi_private' | 'public';
  privacy_override?: 'default' | 'private';
  relationship_id?: string | null;
  color?: string;
  recurrence_rule?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  // Metadata to track encryption status
  _encryption_metadata?: {
    description_encrypted: boolean;
    location_encrypted: boolean;
  };
}

/**
 * Interface for decrypted events (all fields guaranteed to be decrypted)
 */
export interface DecryptedEvent extends Omit<EncryptedEvent, 'description' | 'location' | '_encryption_metadata'> {
  description?: string;
  location?: string;
}

/**
 * Interface for user profiles with encrypted phone numbers
 */
export interface EncryptedUserProfile {
  id: string;
  email: string;
  phone?: MaybeEncrypted<string>;
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  notification_preferences?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  _encryption_metadata?: {
    phone_encrypted: boolean;
  };
}

/**
 * Interface for decrypted user profiles
 */
export interface DecryptedUserProfile extends Omit<EncryptedUserProfile, 'phone' | '_encryption_metadata'> {
  phone?: string;
}

/**
 * Interface for relationships with encrypted notes
 */
export interface EncryptedRelationship {
  id: string;
  user_id: string;
  partner_id: string;
  partner_name?: string;
  partner_email?: string;
  relationship_type?: string;
  start_date?: string;
  birthday?: string;
  anniversary_date?: string;
  color?: string;
  notes?: MaybeEncrypted<string>;
  default_privacy_level?: 'private' | 'visible' | 'semi_private' | 'public';
  privacy_level?: 'private' | 'visible' | 'semi_private' | 'public';
  connection_tier?: 'private' | 'busy_only' | 'details';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  _encryption_metadata?: {
    notes_encrypted: boolean;
  };
}

/**
 * Interface for decrypted relationships
 */
export interface DecryptedRelationship extends Omit<EncryptedRelationship, 'notes' | '_encryption_metadata'> {
  notes?: string;
}

/**
 * Type guard to check if a string is encrypted
 */
export function isEncryptedString(value: any): value is EncryptedString {
  return typeof value === 'string' && value.includes(':') && value.split(':').length === 3;
}

/**
 * Type guard to check if an event has encrypted fields
 */
export function hasEncryptedEventFields(event: EncryptedEvent): boolean {
  return !!(
    (event.description && isEncryptedString(event.description)) ||
    (event.location && isEncryptedString(event.location))
  );
}

/**
 * Type guard to check if a user profile has encrypted fields
 */
export function hasEncryptedProfileFields(profile: EncryptedUserProfile): boolean {
  return !!(profile.phone && isEncryptedString(profile.phone));
}

/**
 * Type guard to check if a relationship has encrypted fields
 */
export function hasEncryptedRelationshipFields(relationship: EncryptedRelationship): boolean {
  return !!(relationship.notes && isEncryptedString(relationship.notes));
}

/**
 * Zod schema for validating encrypted event data
 */
export const encryptedEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  location: z.string().optional(),
  time_zone: z.string().optional(),
  is_all_day: z.boolean().optional(),
  privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']).optional(),
  privacy_override: z.enum(['default', 'private']).optional(),
  relationship_id: z.string().uuid().optional().nullable(),
  color: z.string().optional(),
  recurrence_rule: z.string().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  _encryption_metadata: z.object({
    description_encrypted: z.boolean(),
    location_encrypted: z.boolean()
  }).optional()
});

/**
 * Zod schema for validating encrypted user profile data
 */
export const encryptedUserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().optional(),
  full_name: z.string().optional(),
  avatar_url: z.string().url().optional(),
  timezone: z.string().optional(),
  notification_preferences: z.record(z.any()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  _encryption_metadata: z.object({
    phone_encrypted: z.boolean()
  }).optional()
});

/**
 * Zod schema for validating encrypted relationship data
 */
export const encryptedRelationshipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  partner_id: z.string().uuid(),
  partner_name: z.string().optional(),
  partner_email: z.string().email().optional(),
  relationship_type: z.string().optional(),
  start_date: z.string().optional(),
  birthday: z.string().optional(),
  anniversary_date: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  default_privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']).optional(),
  privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']).optional(),
  connection_tier: z.enum(['private', 'busy_only', 'details']).optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  _encryption_metadata: z.object({
    notes_encrypted: z.boolean()
  }).optional()
});

/**
 * Type for encryption status tracking
 */
export interface EncryptionStatus {
  isEncrypted: boolean;
  encryptedFields: string[];
  lastEncrypted?: Date;
  encryptionVersion?: number;
}

/**
 * Generic type to add encryption metadata to any object
 */
export type WithEncryptionMetadata<T> = T & {
  _encryption?: EncryptionStatus;
};

/**
 * Utility type to mark specific fields as encrypted in an interface
 */
export type WithEncryptedFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: MaybeEncrypted<T[P]>;
};

/**
 * Utility type to ensure all encrypted fields are decrypted
 */
export type EnsureDecrypted<T> = T extends EncryptedEvent ? DecryptedEvent :
  T extends EncryptedUserProfile ? DecryptedUserProfile :
  T extends EncryptedRelationship ? DecryptedRelationship :
  T;

/**
 * Constants for field names that should be encrypted
 */
export const ENCRYPTED_EVENT_FIELDS = ['description', 'location'] as const;
export const ENCRYPTED_PROFILE_FIELDS = ['phone'] as const;
export const ENCRYPTED_RELATIONSHIP_FIELDS = ['notes'] as const;

/**
 * Type for field encryption configuration
 */
export interface FieldEncryptionConfig {
  field: string;
  condition?: (record: any) => boolean;
  encryptionType: 'always' | 'conditional';
}

/**
 * Configuration for which fields should be encrypted in each entity type
 */
export const ENCRYPTION_CONFIG: Record<string, FieldEncryptionConfig[]> = {
  events: [
    {
      field: 'description',
      condition: (event) => event.privacy_level === 'private',
      encryptionType: 'conditional'
    },
    {
      field: 'location',
      encryptionType: 'always'
    }
  ],
  users: [
    {
      field: 'phone',
      encryptionType: 'always'
    }
  ],
  relationships: [
    {
      field: 'notes',
      encryptionType: 'always'
    }
  ]
};
