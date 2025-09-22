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

import React, { useState, useCallback, useRef } from 'react';
import { z } from 'zod';
import { ValidationError } from '../lib/validation/errors';
import { validateData, safeValidate } from '../lib/validation/utils';

interface ValidationOptions<T> {
  initialValues?: Partial<T>;
  onSuccess?: (data: T) => void | Promise<void>;
  onError?: (error: ValidationError) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

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

  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touchedRef = useRef(touched);
  touchedRef.current = touched;

  const valuesRef = useRef(values);
  valuesRef.current = values;

  const fieldErrorsRef = useRef(fieldErrors);
  fieldErrorsRef.current = fieldErrors;

  const resetForm = useCallback((newValues: Partial<T> = initialValues) => {
    setValues(newValues);
    setFieldErrors({});
    setIsValid(false);
    setTouched({});
  }, [initialValues]);

  const validateField = useCallback(async (name: string, value: any) => {
    const partialSchema = z.object({
      [name]: (schema as any).shape[name as keyof z.infer<typeof schema>],
    });
    const result = await partialSchema.safeParseAsync({ [name]: value });
    if (!result.success) {
      const error = result.error.issues.find(err => err.path[0] === name);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [name]: error.message }));
        return false;
      }
    } else {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
      return true;
    }
    return true;
  }, [schema]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const inputValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setValues(prev => ({ ...prev, [name]: inputValue }));
    setTouched(prev => ({ ...prev, [name]: true }));
    if (validateOnChange && touchedRef.current[name]) {
      validateField(name, inputValue);
    }
  }, [validateOnChange, validateField]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    if (validateOnBlur) {
      validateField(name, value);
    }
  }, [validateOnBlur, validateField]);

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touchedRef.current[name] && (validateOnChange || validateOnBlur)) {
      validateField(name, value);
    }
  }, [validateOnChange, validateOnBlur, validateField]);

  const validateForm = useCallback(async () => {
    try {
      const result = await safeValidate(schema, values);
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

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsSubmitting(true);
    try {
      const validData = await validateForm();
      if (validData) {
        if (onSuccess) {
          await onSuccess(validData);
        }
      } else {
        if (onError) {
          const result = await safeValidate(schema, values);
          if (!result.success) {
            onError(new ValidationError("Validation failed", result.errors));
          }
        }
      }
    } catch (error) {
        if (onError) {
            if (error instanceof ValidationError) {
                onError(error);
            }
        }
    } 
    finally {
      setIsSubmitting(false);
    }
  }, [validateForm, onSuccess, onError, schema, values]);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const setError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  const getFieldProps = useCallback((name: string) => ({
    name,
    id: name,
    value: valuesRef.current[name as keyof typeof valuesRef.current] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': fieldErrorsRef.current[name] ? 'true' : 'false',
    'aria-describedby': fieldErrorsRef.current[name] ? `${name}-error` : undefined,
  }), [handleChange, handleBlur]);

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

export function useFieldValidation<T>(
  schema: z.ZodSchema<T>,
  fieldName: keyof T
) {
  const [value, setValue] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const validate = useCallback(async (fieldValue: any) => {
    const partialSchema = z.object({ [fieldName as string]: (schema as any).shape[fieldName] });
    const result = await partialSchema.safeParseAsync({ [fieldName as string]: fieldValue });
    if (!result.success) {
      const fieldError = result.error.issues.find(err => err.path[0] === fieldName);
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

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | any) => {
    const newValue = e?.target?.value ?? e;
    setValue(newValue);
    await validate(newValue);
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
