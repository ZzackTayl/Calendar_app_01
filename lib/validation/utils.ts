/**
 * Validation Utilities
 * 
 * Helper functions for input validation, error handling and type checking.
 */
import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Validates data against a schema and returns the validated data
 * or throws a ValidationError with descriptive field errors
 * 
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated data (typed)
 * @throws ValidationError if validation fails
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    const result = schema.parse(data);
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      
      // Extract field-specific error messages
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        fieldErrors[path] = err.message;
      });
      
      throw new ValidationError('Validation failed', fieldErrors);
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Safe validation that doesn't throw - returns success/errors
 * 
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Object with success flag, data (if valid) and errors (if invalid)
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        fieldErrors[path] = err.message;
      });
      
      return {
        success: false,
        errors: fieldErrors,
      };
    }
    
    return {
      success: false,
      errors: { _general: 'An unexpected error occurred during validation' },
    };
  }
}

/**
 * Creates a validator function for a specific schema
 * 
 * @param schema Zod schema
 * @returns Validator function that validates and returns typed data
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => validateData(schema, data);
}

/**
 * Validates individual fields
 * Useful for inline validation without submitting the whole form
 * 
 * @param schema Zod schema that contains the field
 * @param fieldName Name of the field to validate
 * @param value Value to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  fieldName: string,
  value: unknown
): string | undefined {
  const fieldSchema = z.object({ [fieldName]: schema.shape[fieldName as keyof typeof schema.shape] });
  const result = fieldSchema.safeParse({ [fieldName]: value });
  
  if (!result.success) {
    const error = result.error.errors.find((err) => err.path[0] === fieldName);
    return error?.message;
  }
  
  return undefined;
}

/**
 * Validate date ranges between start and end date
 * 
 * @param startDate Start date as string or Date
 * @param endDate End date as string or Date
 * @returns true if valid, error message if invalid
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date
): true | string {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  
  if (isNaN(start.getTime())) {
    return 'Invalid start date';
  }
  
  if (isNaN(end.getTime())) {
    return 'Invalid end date';
  }
  
  if (end <= start) {
    return 'End date must be after start date';
  }
  
  return true;
}

/**
 * Email validation
 * 
 * @param email Email to validate
 * @returns true if valid, false if invalid
 */
export function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
}

/**
 * Phone number validation (basic)
 * 
 * @param phone Phone number to validate
 * @returns true if valid, false if invalid
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+\d{1,3})?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
  return phoneRegex.test(phone);
}

/**
 * Color hex validation
 * 
 * @param color Color hex to validate
 * @returns true if valid, false if invalid
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  return hexRegex.test(color);
}
