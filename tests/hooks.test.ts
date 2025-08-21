/**
 * Validation Hooks Tests
 * 
 * This file contains tests for the validation hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useValidation, useFieldValidation } from '../hooks/use-validation';
import { useZodForm } from '../hooks/use-zod-form';
import { EventSchema } from '../lib/validation/schemas';

describe('Validation Hooks', () => {
  describe('useValidation', () => {
    const mockOnSuccess = vi.fn();
    const mockOnError = vi.fn();
    
    const validData = {
      title: 'Team Meeting',
      start_time: '2023-12-10T10:00:00Z',
      end_time: '2023-12-10T11:00:00Z',
      privacy_level: 'public' as const,
    };
    
    const invalidData = {
      title: '', // Invalid: Empty title
      start_time: '2023-12-10T10:00:00Z',
      end_time: '2023-12-10T11:00:00Z',
      privacy_level: 'public' as const,
    };
    
    beforeEach(() => {
      mockOnSuccess.mockReset();
      mockOnError.mockReset();
    });
    
    it('should initialize with default values', () => {
      const { result } = renderHook(() => 
        useValidation(EventSchema, { initialValues: validData })
      );
      
      expect(result.current.values).toEqual(validData);
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });
    
    it('should handle form submission with valid data', async () => {
      const { result } = renderHook(() => 
        useValidation(EventSchema, { 
          initialValues: validData,
          onSuccess: mockOnSuccess
        })
      );
      
      await act(async () => {
        await result.current.handleSubmit();
      });
      
      expect(mockOnSuccess).toHaveBeenCalledWith(validData);
      expect(result.current.errors).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
    
    it('should handle form submission with invalid data', async () => {
      const { result } = renderHook(() => 
        useValidation(EventSchema, { 
          initialValues: invalidData,
          onError: mockOnError
        })
      );
      
      await act(async () => {
        await result.current.handleSubmit();
      });
      
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
      expect(result.current.errors).toHaveProperty('title');
      expect(result.current.isValid).toBe(false);
    });
    
    it('should validate individual fields', () => {
      const { result } = renderHook(() => 
        useValidation(EventSchema)
      );
      
      act(() => {
        result.current.setFieldValue('title', '');
        result.current.validateField('title', '');
      });
      
      expect(result.current.errors).toHaveProperty('title');
      
      act(() => {
        result.current.setFieldValue('title', 'Valid Title');
        result.current.validateField('title', 'Valid Title');
      });
      
      expect(result.current.errors.title).toBeUndefined();
    });
    
    it('should reset form state', () => {
      const { result } = renderHook(() => 
        useValidation(EventSchema, { initialValues: validData })
      );
      
      act(() => {
        result.current.setFieldValue('title', 'New Title');
        result.current.setError('customField', 'Custom error');
      });
      
      expect(result.current.values.title).toBe('New Title');
      expect(result.current.errors.customField).toBe('Custom error');
      
      act(() => {
        result.current.resetForm();
      });
      
      expect(result.current.values).toEqual(validData);
      expect(result.current.errors).toEqual({});
    });
  });
  
  describe('useFieldValidation', () => {
    it('should validate a single field', () => {
      const { result } = renderHook(() => 
        useFieldValidation(EventSchema, 'title' as keyof any)
      );
      
      act(() => {
        result.current.handleChange('');
      });
      
      expect(result.current.error).toBeTruthy();
      expect(result.current.isValid).toBe(false);
      
      act(() => {
        result.current.handleChange('Valid Title');
      });
      
      expect(result.current.error).toBeNull();
      expect(result.current.isValid).toBe(true);
    });
  });
});

// Add basic test for useZodForm
describe('useZodForm', () => {
  it('should use zod resolver with react-hook-form', () => {
    const { result } = renderHook(() => 
      useZodForm({
        schema: EventSchema,
        defaultValues: {
          title: 'Meeting',
          start_time: '2023-12-10T10:00:00Z',
          end_time: '2023-12-10T11:00:00Z',
          privacy_level: 'public' as const,
        }
      })
    );
    
    // Check that the form was initialized with the default values
    expect(result.current.getValues()).toEqual({
      title: 'Meeting',
      start_time: '2023-12-10T10:00:00Z',
      end_time: '2023-12-10T11:00:00Z',
      privacy_level: 'public',
    });
    
    // Check that the resolver function was set
    expect(result.current.formState.isValid).toBeDefined();
  });
});
