/**
 * Validation Framework Tests
 * 
 * This file contains tests for the validation library, schemas,
 * and validation utilities.
 */

import { describe, it, expect, vi } from 'vitest';
import { 
  EventSchema, 
  RelationshipSchema, 
  SignInSchema,
  UserSchema
} from '../../lib/validation/schemas';
import { validateData, safeValidate, validateField } from '../../lib/validation/utils';
import { ValidationError } from '../../lib/validation/errors';

describe('Validation Schemas', () => {
  describe('EventSchema', () => {
    it('should validate valid event data', () => {
      const validEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Team Meeting',
        description: 'Weekly team sync',
        start_time: '2023-12-10T10:00:00Z',
        end_time: '2023-12-10T11:00:00Z',
        location: 'Conference Room A',
        privacy_level: 'visible' as const,
      };
      
      const result = EventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should reject events with empty title', () => {
      const invalidEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: '',
        description: 'Weekly team sync',
        start_time: '2023-12-10T10:00:00Z',
        end_time: '2023-12-10T11:00:00Z',
        privacy_level: 'visible' as const,
      };
      
      const result = EventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.title).toBeDefined();
        expect(errors.title?.[0]).toContain('required');
      }
    });

    it('should reject events with end time before start time', () => {
      const invalidEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Invalid Timespan',
        start_time: '2023-12-10T11:00:00Z', // Later
        end_time: '2023-12-10T10:00:00Z',   // Earlier
        privacy_level: 'visible' as const,
      };
      
      const result = EventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.end_time).toBeDefined();
        expect(errors.end_time?.[0]).toContain('after start time');
      }
    });
  });

  describe('RelationshipSchema', () => {
    it('should validate valid relationship data', () => {
      const validRelationship = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        partner_name: 'Alex Johnson',
        relationship_type: 'primary' as const,
      };
      
      const result = RelationshipSchema.safeParse(validRelationship);
      expect(result.success).toBe(true);
    });

    it('should reject relationships with empty partner name', () => {
      const invalidRelationship = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        partner_name: '',
        relationship_type: 'primary' as const,
      };
      
      const result = RelationshipSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.partner_name).toBeDefined();
      }
    });

    it('should reject relationships with invalid type', () => {
      const invalidRelationship = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        partner_name: 'Alex Johnson',
        relationship_type: 'invalid-type' as any,
      };
      
      const result = RelationshipSchema.safeParse(invalidRelationship);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.relationship_type).toBeDefined();
      }
    });
  });

  describe('SignInSchema', () => {
    it('should validate valid signin data', () => {
      const validSignIn = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const result = SignInSchema.safeParse(validSignIn);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidSignIn = {
        email: 'not-an-email',
        password: 'password123',
      };
      
      const result = SignInSchema.safeParse(invalidSignIn);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.email).toBeDefined();
      }
    });

    it('should reject short passwords', () => {
      const invalidSignIn = {
        email: 'test@example.com',
        password: 'short',
      };
      
      const result = SignInSchema.safeParse(invalidSignIn);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.password).toBeDefined();
      }
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateData', () => {
    it('should return validated data for valid input', () => {
      const validEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Team Meeting',
        start_time: '2023-12-10T10:00:00Z',
        end_time: '2023-12-10T11:00:00Z',
        privacy_level: 'visible' as const,
      };
      
      const result = validateData(EventSchema, validEvent);
      expect(result).toEqual(expect.objectContaining(validEvent));
    });

    it('should throw ValidationError for invalid input', () => {
      const invalidEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: '', // Invalid: Empty title
        start_time: '2023-12-10T10:00:00Z',
        end_time: '2023-12-10T11:00:00Z',
        privacy_level: 'visible' as const,
      };
      
      expect(() => validateData(EventSchema, invalidEvent))
        .toThrow(ValidationError);
    });

    it('should include field errors in the thrown error', () => {
      const invalidEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: '', // Invalid: Empty title
        start_time: '2023-12-10T10:00:00Z',
        end_time: '2023-12-10T11:00:00Z',
        privacy_level: 'visible' as const,
      };
      
      try {
        validateData(EventSchema, invalidEvent);
        expect.fail('Should have thrown an error');
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.fieldErrors).toHaveProperty('title');
        } else {
          expect.fail('Should have thrown a ValidationError');
        }
      }
    });
  });

  describe('safeValidate', () => {
    it('should return success and data for valid input', () => {
      const validEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Team Meeting',
        start_time: '2023-12-10T10:00:00Z',
        end_time: '2023-12-10T11:00:00Z',
        privacy_level: 'visible' as const,
      };
      
      const result = safeValidate(EventSchema, validEvent);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining(validEvent));
    });

    it('should return success=false and errors for invalid input', () => {
      const invalidEvent = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        title: '', // Invalid: Empty title
        start_time: '2023-12-10T10:00:00Z',
        end_time: '2023-12-10T11:00:00Z',
        privacy_level: 'visible' as const,
      };
      
      const result = safeValidate(EventSchema, invalidEvent);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('title');
    });
  });

  describe('validateField', () => {
    it('should return undefined for valid field value', () => {
      const result = validateField(UserSchema, 'email', 'test@example.com');
      expect(result).toBeUndefined();
    });

    it('should return error message for invalid field value', () => {
      const result = validateField(UserSchema, 'email', 'not-an-email');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
