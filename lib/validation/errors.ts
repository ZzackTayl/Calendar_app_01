/**
 * Custom error classes for validation
 * 
 * These error classes provide structured error information
 * that can be easily handled and displayed to users.
 */

/**
 * ValidationError class - For form validation errors
 * 
 * @example
 * try {
 *   const result = validateForm(data);
 * } catch (err) {
 *   if (err instanceof ValidationError) {
 *     // Access field-specific errors
 *     console.log(err.fieldErrors);
 *   }
 * }
 */
export class ValidationError extends Error {
  public fieldErrors: Record<string, string>;
  public code: string;
  
  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
    this.code = 'VALIDATION_ERROR';
    
    // Ensure instanceof works correctly in transpiled JS
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * AuthError class - For authentication-related errors
 */
export class AuthError extends Error {
  public code: string;
  public status?: number;
  
  constructor(message: string, code = 'AUTH_ERROR', status?: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
    
    // Ensure instanceof works correctly in transpiled JS
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * DatabaseError class - For database-related errors
 */
export class DatabaseError extends Error {
  public code: string;
  public details?: any;
  
  constructor(message: string, code = 'DB_ERROR', details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
    
    // Ensure instanceof works correctly in transpiled JS
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * TimeZoneError class - For timezone-related errors
 */
export class TimeZoneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeZoneError';
    
    // Ensure instanceof works correctly in transpiled JS
    Object.setPrototypeOf(this, TimeZoneError.prototype);
  }
}

/**
 * Error type guard functions
 */
export const isValidationError = (err: any): err is ValidationError => {
  return err instanceof ValidationError;
};

export const isAuthError = (err: any): err is AuthError => {
  return err instanceof AuthError;
};

export const isDatabaseError = (err: any): err is DatabaseError => {
  return err instanceof DatabaseError;
};
