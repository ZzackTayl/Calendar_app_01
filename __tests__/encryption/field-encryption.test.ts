/**
 * Tests for Field-Specific Encryption Utilities
 * 
 * Validates that all sensitive field types are properly encrypted/decrypted
 * with appropriate validation and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encryptPhoneNumber,
  decryptPhoneNumber,
  encryptEventDescription,
  decryptEventDescription,
  encryptLocation,
  decryptLocation,
  encryptPrivateNotes,
  decryptPrivateNotes,
  encryptSensitiveFields,
  decryptSensitiveFields,
  createEncryptedField,
  hasEncryptedFields,
  redactSensitiveFields,
  fieldEncryption
} from '@/lib/encryption/field-encryption';

import { decrypt } from '@/lib/encryption';

// Mock the base encryption module
vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
  decrypt: vi.fn((value: string) => value.replace('encrypted:', '')),
  encryptToken: vi.fn((value: string) => `token_encrypted:${value}`),
  decryptToken: vi.fn((value: string) => value.replace('token_encrypted:', '')),
  isEncrypted: vi.fn((value: string) => value?.startsWith('encrypted:') || value?.startsWith('token_encrypted:'))
}));

describe('Field-Specific Encryption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('Phone Number Encryption', () => {
    it('should encrypt and decrypt US phone numbers with formatting', () => {
      const phoneNumbers = [
        { input: '5551234567', formatted: '(555) 123-4567' },
        { input: '(555) 123-4567', formatted: '(555) 123-4567' },
        { input: '555-123-4567', formatted: '(555) 123-4567' },
        { input: '555.123.4567', formatted: '(555) 123-4567' }
      ];

      phoneNumbers.forEach(({ input, formatted }) => {
        const encrypted = encryptPhoneNumber(input);
        // Should normalize to just digits
        expect(encrypted).toContain('encrypted:');
        
        const decrypted = decryptPhoneNumber(encrypted);
        expect(decrypted).toBe(formatted);
      });
    });

    it('should handle international phone numbers', () => {
      const internationalNumbers = [
        '+1-555-123-4567',
        '+44 20 7946 0958',
        '+81 3-1234-5678'
      ];

      internationalNumbers.forEach(phone => {
        const encrypted = encryptPhoneNumber(phone);
        expect(encrypted).toContain('encrypted:');
        
        const decrypted = decryptPhoneNumber(encrypted);
        // Should return normalized version without formatting
        expect(decrypted).not.toContain(' ');
        expect(decrypted).not.toContain('-');
      });
    });

    it('should handle null and empty values', () => {
      expect(encryptPhoneNumber(null)).toBe(null);
      expect(encryptPhoneNumber(undefined)).toBe(null);
      expect(encryptPhoneNumber('')).toBe(null);
      
      expect(decryptPhoneNumber(null)).toBe(null);
      expect(decryptPhoneNumber(undefined)).toBe(null);
      expect(decryptPhoneNumber('')).toBe(null);
    });

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = [
        'not a phone',
        'abc123',
        '###-###-####',
        '<script>alert("xss")</script>'
      ];

      invalidNumbers.forEach(invalid => {
        expect(() => encryptPhoneNumber(invalid)).toThrow('Phone number encryption failed');
      });
    });
  });

  describe('Event Description Encryption', () => {
    it('should only encrypt private event descriptions', () => {
      const description = 'Doctor appointment for STI testing';

      // Should encrypt for private events
      const privateEncrypted = encryptEventDescription(description, 'private');
      expect(privateEncrypted).toBe('encrypted:Doctor appointment for STI testing');

      // Should NOT encrypt for other privacy levels
      expect(encryptEventDescription(description, 'visible')).toBe(description);
      expect(encryptEventDescription(description, 'semi_private')).toBe(description);
      expect(encryptEventDescription(description, 'public')).toBe(description);
    });

    it('should decrypt event descriptions with fallback for errors', () => {
      const encrypted = 'encrypted:Therapy session';
      const unencrypted = 'Coffee with friends';

      // Should decrypt encrypted descriptions
      expect(decryptEventDescription(encrypted, 'private')).toBe('Therapy session');

      // Should return as-is if not encrypted
      expect(decryptEventDescription(unencrypted, 'visible')).toBe(unencrypted);

      // Should provide safe fallback on decryption error
      vi.mocked(decrypt).mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });
      expect(decryptEventDescription(encrypted, 'private')).toBe('[Private Event]');
    });

    it('should handle long descriptions', () => {
      const longDescription = 'A'.repeat(5000);
      const encrypted = encryptEventDescription(longDescription, 'private');
      expect(encrypted).toContain('encrypted:');
      expect(decryptEventDescription(encrypted, 'private')).toBe(longDescription);
    });

    it('should reject descriptions over 10000 characters', () => {
      const tooLong = 'A'.repeat(10001);
      expect(() => encryptEventDescription(tooLong, 'private')).toThrow();
    });
  });

  describe('Location Encryption', () => {
    it('should encrypt sensitive locations', () => {
      const sensitiveLocations = [
        '123 Main St, Apt 4B',
        'Home',
        "Dr. Smith's Medical Clinic",
        'Therapy Center on 5th Ave',
        'Attorney Johnson Law Office',
        '456 Hospital Drive'
      ];

      sensitiveLocations.forEach(location => {
        const encrypted = encryptLocation(location);
        expect(encrypted).toContain('encrypted:');
        expect(decryptLocation(encrypted)).toBe(location);
      });
    });

    it('should not encrypt generic locations', () => {
      const genericLocations = [
        'Coffee Shop',
        'Central Park',
        'Downtown',
        'Beach',
        'Restaurant'
      ];

      genericLocations.forEach(location => {
        const result = encryptLocation(location);
        expect(result).toBe(location); // Should return unencrypted
      });
    });

    it('should detect addresses by pattern', () => {
      const addresses = [
        '123 Oak Street',
        '456 Elm Ave',
        '789 Pine Blvd'
      ];

      addresses.forEach(address => {
        const encrypted = encryptLocation(address);
        expect(encrypted).toContain('encrypted:');
      });
    });

    it('should provide fallback for decryption errors', () => {
      vi.mocked(decrypt).mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });
      
      expect(decryptLocation('encrypted:sensitive')).toBe('[Private Location]');
    });
  });

  describe('Private Notes Encryption', () => {
    it('should always encrypt private notes', () => {
      const notes = [
        'Partner has anxiety about public displays',
        'Prefers quiet dates, sensitive to loud noises',
        'Boundary: no overnight stays when kids are home',
        'Working through jealousy issues in therapy'
      ];

      notes.forEach(note => {
        const encrypted = encryptPrivateNotes(note);
        expect(encrypted).toBe(`encrypted:${note}`);
        expect(decryptPrivateNotes(encrypted)).toBe(note);
      });
    });

    it('should handle multi-line notes', () => {
      const multiLineNote = `First line
Second line
Third line with special chars: !@#$%^&*()`;

      const encrypted = encryptPrivateNotes(multiLineNote);
      expect(encrypted).toContain('encrypted:');
      expect(decryptPrivateNotes(encrypted)).toBe(multiLineNote);
    });

    it('should enforce length limits', () => {
      const validNote = 'A'.repeat(5000);
      expect(() => encryptPrivateNotes(validNote)).not.toThrow();

      const tooLong = 'A'.repeat(5001);
      expect(() => encryptPrivateNotes(tooLong)).toThrow();
    });

    it('should throw on decryption failure', () => {
      vi.mocked(decrypt).mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      expect(() => decryptPrivateNotes('encrypted:notes')).toThrow('Private notes decryption failed');
    });
  });

  describe('Batch Operations', () => {
    it('should encrypt multiple fields at once', () => {
      const event = {
        id: '123',
        title: 'Medical Appointment',
        description: 'HIV medication consultation',
        location: '789 Medical Center',
        attendeePhone: '555-123-4567',
        privacyLevel: 'private' as const
      };

      const encrypted = encryptSensitiveFields(event, [
        { field: 'description', encryptor: encryptEventDescription, args: ['private'] },
        { field: 'location', encryptor: encryptLocation },
        { field: 'attendeePhone', encryptor: encryptPhoneNumber }
      ]);

      expect(encrypted.id).toBe('123');
      expect(encrypted.title).toBe('Medical Appointment');
      expect(encrypted.description).toContain('encrypted:');
      expect(encrypted.location).toContain('encrypted:');
      expect(encrypted.attendeePhone).toContain('encrypted:');
    });

    it('should decrypt multiple fields at once', () => {
      const encryptedData = {
        id: '123',
        description: 'encrypted:Therapy session',
        location: 'encrypted:123 Medical Plaza',
        phone: 'encrypted:5551234567'
      };

      const decrypted = decryptSensitiveFields(encryptedData, [
        { field: 'description', decryptor: decryptEventDescription, args: ['private'] },
        { field: 'location', decryptor: decryptLocation },
        { field: 'phone', decryptor: decryptPhoneNumber }
      ]);

      expect(decrypted.id).toBe('123');
      expect(decrypted.description).toBe('Therapy session');
      expect(decrypted.location).toBe('123 Medical Plaza');
      expect(decrypted.phone).toBe('(555) 123-4567');
    });

    it('should handle partial decryption failures gracefully', () => {
      const encryptedData = {
        field1: 'encrypted:value1',
        field2: 'encrypted:value2',
        field3: 'encrypted:value3'
      };

      // Mock decrypt to fail on second call
      vi.mocked(decrypt)
        .mockImplementationOnce((value) => value.replace('encrypted:', ''))
        .mockImplementationOnce(() => { throw new Error('Decryption failed'); })
        .mockImplementationOnce((value) => value.replace('encrypted:', ''));

      const result = decryptSensitiveFields(encryptedData, [
        { field: 'field1', decryptor: (v) => decrypt(v) },
        { field: 'field2', decryptor: (v) => decrypt(v) },
        { field: 'field3', decryptor: (v) => decrypt(v) }
      ]);

      expect(result.field1).toBe('value1');
      expect(result.field2).toBe('encrypted:value2'); // Kept encrypted due to error
      expect(result.field3).toBe('value3');
    });
  });

  describe('Encrypted Field Metadata', () => {
    it('should create encrypted field with metadata', () => {
      const userId = 'user-123';
      const phoneNumber = '555-123-4567';

      const field = createEncryptedField(phoneNumber, encryptPhoneNumber, userId);

      expect(field).toBeDefined();
      expect(field?.encrypted).toContain('encrypted:');
      expect(field?.metadata?.encryptedBy).toBe(userId);
      expect(field?.metadata?.version).toBe(1);
      expect(field?.metadata?.encryptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return null for null values', () => {
      expect(createEncryptedField(null, encryptPhoneNumber)).toBe(null);
      expect(createEncryptedField(undefined, encryptPhoneNumber)).toBe(null);
    });
  });

  describe('Encryption Detection', () => {
    it('should detect encrypted fields in objects', () => {
      const dataWithEncryption = {
        id: '123',
        name: 'John Doe',
        phone: 'encrypted:5551234567',
        email: 'john@example.com',
        notes: 'encrypted:private info'
      };

      expect(hasEncryptedFields(dataWithEncryption, ['phone', 'notes'])).toBe(true);
      expect(hasEncryptedFields(dataWithEncryption, ['name', 'email'])).toBe(false);
      expect(hasEncryptedFields(dataWithEncryption, ['nonexistent'])).toBe(false);
    });
  });

  describe('Security Helpers', () => {
    it('should redact sensitive fields for logging', () => {
      const sensitiveData = {
        id: '123',
        name: 'John Doe',
        phone: '555-123-4567',
        ssn: '123-45-6789',
        notes: 'Private medical information'
      };

      const redacted = redactSensitiveFields(sensitiveData, ['phone', 'ssn', 'notes']);

      expect(redacted.id).toBe('123');
      expect(redacted.name).toBe('John Doe');
      expect(redacted.phone).toBe('[REDACTED]');
      expect(redacted.ssn).toBe('[REDACTED]');
      expect(redacted.notes).toBe('[REDACTED]');
    });

    it('should handle null/undefined fields in redaction', () => {
      const data = {
        id: '123',
        phone: null,
        notes: undefined
      };

      const redacted = redactSensitiveFields(data, ['phone', 'notes']);
      expect(redacted.phone).toBe(null);
      expect(redacted.notes).toBe(undefined);
    });
  });

  describe('Field Encryption Export', () => {
    it('should provide convenient access to all encryption functions', () => {
      expect(fieldEncryption.phone.encrypt).toBe(encryptPhoneNumber);
      expect(fieldEncryption.phone.decrypt).toBe(decryptPhoneNumber);
      expect(fieldEncryption.eventDescription.encrypt).toBe(encryptEventDescription);
      expect(fieldEncryption.eventDescription.decrypt).toBe(decryptEventDescription);
      expect(fieldEncryption.location.encrypt).toBe(encryptLocation);
      expect(fieldEncryption.location.decrypt).toBe(decryptLocation);
      expect(fieldEncryption.privateNotes.encrypt).toBe(encryptPrivateNotes);
      expect(fieldEncryption.privateNotes.decrypt).toBe(decryptPrivateNotes);
    });
  });
});
