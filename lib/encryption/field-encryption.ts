/**
 * Field-Specific Encryption Utilities
 * 
 * Provides specialized encryption/decryption functions for each type of 
 * sensitive data in the PolyHarmony Calendar application.
 * 
 * Security Features:
 * - AES-256-GCM encryption for all sensitive fields
 * - Type-safe encryption/decryption with validation
 * - Null-safe operations
 * - Format preservation where possible
 * - Audit logging for security events
 */

import { encryptSync, decryptSync, encryptTokenSync, decryptTokenSync, isEncrypted } from '@/lib/encryption';
import { z } from 'zod';

// Validation schemas for different data types
const phoneNumberSchema = z.string().regex(/^[\d\s\-\+\(\)\.]+$/, 'Invalid phone number format');
const eventDescriptionSchema = z.string().min(0).max(10000);
const locationSchema = z.string().min(0).max(1000);
const privateNotesSchema = z.string().min(0).max(5000);

// Type definitions for encrypted fields
export interface EncryptedField<T = string> {
  encrypted: string;
  metadata?: {
    encryptedAt: string;
    encryptedBy?: string;
    version?: number;
  };
  _decrypted?: T; // Cached decrypted value (never persisted)
}

/**
 * Encrypts a phone number with validation
 * Phone numbers are PII and must be protected
 */
export function encryptPhoneNumber(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) return null;
  
  try {
    // Validate phone number format
    phoneNumberSchema.parse(phoneNumber);
    
    // Remove formatting for consistent encryption
    const normalized = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
    
    // Encrypt the normalized phone number
    return encryptSync(normalized);
  } catch (error) {
    console.error('[ENCRYPTION] Failed to encrypt phone number:', error);
    throw new Error('Phone number encryption failed');
  }
}

/**
 * Decrypts a phone number and restores formatting
 */
export function decryptPhoneNumber(encryptedPhone: string | null | undefined): string | null {
  if (!encryptedPhone) return null;
  
  try {
    const decrypted = decryptSync(encryptedPhone);
    
    // Restore formatting for US numbers
    if (decrypted.length === 10 && decrypted[0] !== '+') {
      return `(${decrypted.slice(0, 3)}) ${decrypted.slice(3, 6)}-${decrypted.slice(6)}`;
    }
    
    // Return as-is for international numbers
    return decrypted;
  } catch (error) {
    console.error('[ENCRYPTION] Failed to decrypt phone number:', error);
    throw new Error('Phone number decryption failed');
  }
}

/**
 * Encrypts event descriptions with privacy level awareness
 * Only encrypts if the event is marked as private
 */
export function encryptEventDescription(
  description: string | null | undefined,
  privacyLevel: 'private' | 'visible' | 'semi_private' | 'public'
): string | null {
  if (!description) return null;
  
  // Only encrypt private event descriptions
  if (privacyLevel !== 'private') {
    return description; // Return unencrypted for non-private events
  }
  
  try {
    // Validate description
    eventDescriptionSchema.parse(description);
    
    // Encrypt the description
    return encryptSync(description);
  } catch (error) {
    console.error('[ENCRYPTION] Failed to encrypt event description:', error);
    throw new Error('Event description encryption failed');
  }
}

/**
 * Decrypts event descriptions
 */
export function decryptEventDescription(
  description: string | null | undefined,
  privacyLevel: 'private' | 'visible' | 'semi_private' | 'public'
): string | null {
  if (!description) return null;
  
  // Check if the description is encrypted
  if (!isEncrypted(description)) {
    return description; // Return as-is if not encrypted
  }
  
  try {
    return decryptSync(description);
  } catch (error) {
    console.error('[ENCRYPTION] Failed to decrypt event description:', error);
    // Return a safe fallback for UI display
    return privacyLevel === 'private' ? '[Private Event]' : description;
  }
}

/**
 * Encrypts location data with validation
 * Locations can contain sensitive personal information
 */
export function encryptLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  
  try {
    // Validate location
    locationSchema.parse(location);
    
    // Check if location contains sensitive keywords
    const sensitiveKeywords = [
      'home', 'apartment', 'apt', 'unit', 'residence',
      'doctor', 'clinic', 'hospital', 'medical',
      'therapy', 'counseling', 'psychiatrist',
      'lawyer', 'attorney', 'court'
    ];
    
    const containsSensitive = sensitiveKeywords.some(keyword => 
      location.toLowerCase().includes(keyword)
    );
    
    // Always encrypt if sensitive, otherwise encrypt if it looks like an address
    if (containsSensitive || /\d{1,5}\s+\w+/.test(location)) {
      return encryptSync(location);
    }
    
    // Return unencrypted for generic locations like "Coffee Shop" or "Park"
    return location;
  } catch (error) {
    console.error('[ENCRYPTION] Failed to encrypt location:', error);
    throw new Error('Location encryption failed');
  }
}

/**
 * Decrypts location data
 */
export function decryptLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  
  if (!isEncrypted(location)) {
    return location;
  }
  
  try {
    return decryptSync(location);
  } catch (error) {
    console.error('[ENCRYPTION] Failed to decrypt location:', error);
    return '[Private Location]'; // Safe fallback
  }
}

/**
 * Encrypts private relationship notes
 * These contain the most sensitive personal information
 */
export function encryptPrivateNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  
  try {
    // Validate notes
    privateNotesSchema.parse(notes);
    
    // Always encrypt private notes
    return encryptSync(notes);
  } catch (error) {
    console.error('[ENCRYPTION] Failed to encrypt private notes:', error);
    throw new Error('Private notes encryption failed');
  }
}

/**
 * Decrypts private relationship notes
 */
export function decryptPrivateNotes(encryptedNotes: string | null | undefined): string | null {
  if (!encryptedNotes) return null;
  
  try {
    return decryptSync(encryptedNotes);
  } catch (error) {
    console.error('[ENCRYPTION] Failed to decrypt private notes:', error);
    throw new Error('Private notes decryption failed');
  }
}

/**
 * Batch encrypts multiple fields for an entity
 * Useful for encrypting all sensitive fields before saving
 */
export function encryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  fieldsToEncrypt: Array<{
    field: keyof T;
    encryptor: (value: any, ...args: any[]) => string | null;
    args?: any[];
  }>
): T {
  const encrypted = { ...data };
  
  for (const { field, encryptor, args = [] } of fieldsToEncrypt) {
    if (data[field] !== undefined && data[field] !== null) {
      encrypted[field] = encryptor(data[field], ...args) as T[keyof T];
    }
  }
  
  return encrypted;
}

/**
 * Batch decrypts multiple fields for an entity
 * Useful for decrypting all sensitive fields after retrieval
 */
export function decryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  fieldsToDecrypt: Array<{
    field: keyof T;
    decryptor: (value: any, ...args: any[]) => string | null;
    args?: any[];
  }>
): T {
  const decrypted = { ...data };
  
  for (const { field, decryptor, args = [] } of fieldsToDecrypt) {
    if (data[field] !== undefined && data[field] !== null) {
      try {
        decrypted[field] = decryptor(data[field], ...args) as T[keyof T];
      } catch (error) {
        console.error(`[ENCRYPTION] Failed to decrypt field ${String(field)}:`, error);
        // Keep the encrypted value if decryption fails
      }
    }
  }
  
  return decrypted;
}

/**
 * Creates an encrypted field object with metadata
 * Useful for audit trails and versioning
 */
export function createEncryptedField<T = string>(
  value: T | null | undefined,
  encryptor: (value: T) => string | null,
  userId?: string
): EncryptedField<T> | null {
  if (!value) return null;
  
  const encrypted = encryptor(value);
  if (!encrypted) return null;
  
  return {
    encrypted,
    metadata: {
      encryptedAt: new Date().toISOString(),
      encryptedBy: userId,
      version: 1
    }
  };
}

/**
 * Checks if any fields in an object are encrypted
 * Useful for determining if decryption is needed
 */
export function hasEncryptedFields(
  data: Record<string, any>,
  fields: string[]
): boolean {
  return fields.some(field => {
    const value = data[field];
    return value && typeof value === 'string' && isEncrypted(value);
  });
}

/**
 * Security helper to ensure sensitive data is never logged
 * Replaces sensitive fields with [REDACTED] for safe logging
 */
export function redactSensitiveFields<T extends Record<string, any>>(
  data: T,
  sensitiveFields: Array<keyof T>
): T {
  const redacted = { ...data };
  
  for (const field of sensitiveFields) {
    if (redacted[field] !== undefined && redacted[field] !== null) {
      redacted[field] = '[REDACTED]' as T[keyof T];
    }
  }
  
  return redacted;
}

// Export all encryption functions for easy access
export const fieldEncryption = {
  phone: {
    encrypt: encryptPhoneNumber,
    decrypt: decryptPhoneNumber
  },
  eventDescription: {
    encrypt: encryptEventDescription,
    decrypt: decryptEventDescription
  },
  location: {
    encrypt: encryptLocation,
    decrypt: decryptLocation
  },
  privateNotes: {
    encrypt: encryptPrivateNotes,
    decrypt: decryptPrivateNotes
  },
  oauth: {
    encrypt: encryptTokenSync,
    decrypt: decryptTokenSync
  }
};
