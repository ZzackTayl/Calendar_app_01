/**
 * useValidation Hook
 * 
 * A React hook that provides form validation capabilities using Zod schemas.
 * Features:
 * - Type-safe validation
 * - Immediate error feedback
 * - Field-specific error tracking
 * - Form submission handling
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { ValidationError } from '@/lib/validation/errors';
import { validateData, safeValidate } from '@/lib/validation/utils';

interface ValidationOptions<T> {
  /**
   * Initial form values
   */
  initialValues?: Partial<T>;
  
  /**
   * Callback when validation succeeds
   */
  onSuccess?: (data: T) => void | Promise<void>;
  
  /**
   * Callback when validation fails
   */
  onError?: (error: ValidationError) => void;
  
  /**
   * Whether to validate on field change (default: false)
   */
  validateOnChange?: boolean;
  
  /**
   * Whether to validate on field blur (default: true)
   */
  validateOnBlur?: boolean;
}

/**
 * Hook for form validation using Zod schemas
 */
export function useValidation<T>(
  schema: z.ZodSchema<T>,
  options: ValidationOptions<T> = {}
) {
  const {
    initialValues = {} as Partial<T>,
    onSuccess,
    onError,
    validateOnChange = false,
    validateOnBlur = true,
  } = options;
  
  // State for form values, errors, and meta information
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  /**
   * Reset the form to initial state or provided values
   */
  const resetForm = useCallback((newValues: Partial<T> = initialValues) => {
    setValues(newValues);
    setFieldErrors({});
    setIsValid(false);
    setTouched({});
  }, [initialValues]);
  
  /**
   * Validate an individual field
   */
  const validateField = useCallback((name: string, value: any) => {
    // Create a partial schema with just this field
    const partialSchema = z.object({ 
      [name]: schema.shape[name as keyof z.infer<typeof schema>]
    });
    
    const result = partialSchema.safeParse({ [name]: value });
    
    if (!result.success) {
      const error = result.error.errors.find(err => err.path[0] === name);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [name]: error.message }));
        return false;
      }
    } else {
      // Clear error for this field if it's valid
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
      return true;
    }
    
    return true;
  }, [schema]);
  
  /**
   * Handle field change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Handle different input types
    const inputValue = type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : value;
    
    setValues(prev => ({
      ...prev,
      [name]: inputValue,
    }));
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
    
    // Validate on change if enabled
    if (validateOnChange && touched[name]) {
      validateField(name, inputValue);
    }
  }, [validateOnChange, touched, validateField]);
  
  /**
   * Handle field blur
   */
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Mark as touched
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
    
    // Validate on blur if enabled
    if (validateOnBlur) {
      validateField(name, value);
    }
  }, [validateOnBlur, validateField]);
  
  /**
   * Set a specific field value programmatically
   */
  const setFieldValue = useCallback((name: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Validate if field was touched
    if (touched[name] && (validateOnChange || validateOnBlur)) {
      validateField(name, value);
    }
  }, [touched, validateOnChange, validateOnBlur, validateField]);
  
  /**
   * Validate all form values at once
   */
  const validateForm = useCallback(() => {
    try {
      const result = safeValidate(schema, values);
      
      if (result.success) {
        setFieldErrors({});
        setIsValid(true);
        return result.data as T;
      } else {
        setFieldErrors(result.errors || {});
        setIsValid(false);
        return null;
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.fieldErrors);
      }
      setIsValid(false);
      return null;
    }
  }, [schema, values]);
  
  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setIsSubmitting(true);
    
    try {
      const validData = validateData(schema, values);
      setIsValid(true);
      setFieldErrors({});
      
      if (onSuccess) {
        await onSuccess(validData);
      }
      
      return validData;
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldErrors(error.fieldErrors);
        setIsValid(false);
        
        if (onError) {
          onError(error);
        }
      } else {
        // Handle unexpected errors
        console.error('Unexpected validation error:', error);
      }
      
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, values, onSuccess, onError]);
  
  /**
   * Clear all form errors
   */
  const clearErrors = useCallback(() => {
    setFieldErrors({});
  }, []);
  
  /**
   * Set an error manually
   */
  const setError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message,
    }));
  }, []);
  
  /**
   * Get props for a form field
   */
  const getFieldProps = useCallback((name: string) => ({
    name,
    id: name,
    value: values[name as keyof typeof values] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': fieldErrors[name] ? 'true' : 'false',
    'aria-describedby': fieldErrors[name] ? `${name}-error` : undefined,
  }), [values, handleChange, handleBlur, fieldErrors]);
  
  return {
    values,
    errors: fieldErrors,
    touched,
    isValid,
    isSubmitting,
    setValues,
    setFieldValue,
    handleChange,
    handleBlur,
    handleSubmit,
    validateForm,
    validateField,
    resetForm,
    clearErrors,
    setError,
    getFieldProps,
  };
}

/**
 * Hook for validating a single field or value
 */
export function useFieldValidation<T>(
  schema: z.ZodSchema<T>,
  fieldName: keyof T
) {
  const [value, setValue] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  
  const validate = useCallback((fieldValue: any) => {
    // Create a partial schema with just this field
    const partialSchema = z.object({ [fieldName as string]: schema.shape[fieldName] });
    
    const result = partialSchema.safeParse({ [fieldName as string]: fieldValue });
    
    if (!result.success) {
      const fieldError = result.error.errors.find(err => err.path[0] === fieldName);
      if (fieldError) {
        setError(fieldError.message);
        setIsValid(false);
        return false;
      }
    } else {
      setError(null);
      setIsValid(true);
      return true;
    }
    
    return false;
  }, [schema, fieldName]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | any) => {
    const newValue = e?.target?.value ?? e;
    setValue(newValue);
    validate(newValue);
  }, [validate]);
  
  return {
    value,
    error,
    isValid,
    setValue,
    validate,
    handleChange,
  };
}

export default useValidation;
