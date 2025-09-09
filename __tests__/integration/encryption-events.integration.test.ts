/**
 * Integration Test for Encryption in Events API
 * 
 * Tests the actual encryption/decryption flow in the events API
 * without mocking the encryption module
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  encryptEventDescription, 
  decryptEventDescription, 
  encryptLocation, 
  decryptLocation 
} from '@/lib/encryption/field-encryption';

describe('Events API Encryption Integration', () => {
  beforeAll(() => {
    // Set up encryption key for testing
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('Event Description Encryption', () => {
    it('should properly encrypt and decrypt private event descriptions', () => {
      const sensitiveDescription = 'Meeting with therapist to discuss relationship anxiety';
      
      // Test encryption for private event
      const encrypted = encryptEventDescription(sensitiveDescription, 'private');
      expect(encrypted).not.toBe(null);
      expect(encrypted).not.toContain('therapist');
      expect(encrypted).not.toContain('anxiety');
      expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
      
      // Test decryption
      const decrypted = decryptEventDescription(encrypted!, 'private');
      expect(decrypted).toBe(sensitiveDescription);
    });

    it('should not encrypt non-private event descriptions', () => {
      const publicDescription = 'Team meeting at office';
      
      // Test that public events are not encrypted
      const result = encryptEventDescription(publicDescription, 'public');
      expect(result).toBe(publicDescription);
      
      // Same for visible events
      const visibleResult = encryptEventDescription(publicDescription, 'visible');
      expect(visibleResult).toBe(publicDescription);
    });
  });

  describe('Location Encryption', () => {
    it('should encrypt sensitive locations', () => {
      const locations = [
        '123 Main St, Apt 4B, San Francisco, CA',
        'Dr. Smith Medical Clinic, Suite 200',
        'Home',
        'Therapist Office - 456 Wellness Center'
      ];

      locations.forEach(location => {
        const encrypted = encryptLocation(location);
        expect(encrypted).not.toBe(null);
        expect(encrypted).not.toContain('Main St');
        expect(encrypted).not.toContain('Medical');
        expect(encrypted).not.toContain('Therapist');
        expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
        
        const decrypted = decryptLocation(encrypted!);
        expect(decrypted).toBe(location);
      });
    });

    it('should not encrypt generic locations', () => {
      const genericLocations = [
        'Coffee Shop',
        'Park',
        'Restaurant',
        'Beach'
      ];

      genericLocations.forEach(location => {
        const result = encryptLocation(location);
        expect(result).toBe(location);
      });
    });
  });

  describe('End-to-End Event Encryption Flow', () => {
    it('should handle complete event encryption workflow', () => {
      // Simulate creating a private event
      const privateEvent = {
        title: 'Personal Appointment',
        description: 'STI testing at health clinic - bring insurance card',
        location: '789 Medical Plaza, Room 302',
        privacy_level: 'private' as const
      };

      // Encrypt sensitive fields
      const encryptedDescription = encryptEventDescription(privateEvent.description, privateEvent.privacy_level);
      const encryptedLocation = encryptLocation(privateEvent.location);

      // Verify encryption
      expect(encryptedDescription).not.toContain('STI');
      expect(encryptedDescription).not.toContain('clinic');
      expect(encryptedLocation).not.toContain('Medical Plaza');

      // Simulate retrieving and decrypting the event
      const decryptedDescription = decryptEventDescription(encryptedDescription!, privateEvent.privacy_level);
      const decryptedLocation = decryptLocation(encryptedLocation!);

      expect(decryptedDescription).toBe(privateEvent.description);
      expect(decryptedLocation).toBe(privateEvent.location);
    });

    it('should handle mixed privacy events correctly', () => {
      const events = [
        {
          title: 'Private Medical',
          description: 'HIV medication consultation',
          location: 'Health Center',
          privacy_level: 'private' as const
        },
        {
          title: 'Team Lunch',
          description: 'Monthly team gathering',
          location: 'Local Restaurant',
          privacy_level: 'public' as const
        }
      ];

      events.forEach(event => {
        const encryptedDesc = encryptEventDescription(event.description, event.privacy_level);
        const encryptedLoc = encryptLocation(event.location);

        if (event.privacy_level === 'private') {
          // Private events should have encrypted description
          expect(encryptedDesc).not.toBe(event.description);
          expect(encryptedDesc).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
        } else {
          // Public events should not encrypt description
          expect(encryptedDesc).toBe(event.description);
        }

        // Generic locations should not be encrypted
        if (event.location === 'Health Center' || event.location === 'Local Restaurant') {
          expect(encryptedLoc).toBe(event.location);
        }
      });
    });
  });
});
