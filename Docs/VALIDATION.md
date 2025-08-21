# Validation Framework

This document outlines the validation framework implemented for the Calendar application to ensure data integrity and provide immediate feedback to users.

## Overview

The validation framework is designed around these core principles:

1. **Fail Fast** - Validate inputs immediately and throw specific errors with clear messages
2. **Type Safety** - Leverage TypeScript and Zod for runtime type validation
3. **Consistency** - Standardized error handling across the application
4. **Reusability** - Sharable validation schemas and utilities
5. **Testability** - Easy to test validation rules and error handling

## Components

### 1. Validation Library (`/lib/validation/`)

- **schemas.ts** - Zod schemas for all core entities (Events, Relationships, Users, etc.)
- **errors.ts** - Custom error classes for different types of validation failures
- **utils.ts** - Utility functions for validation operations
- **index.ts** - Central export point

### 2. Validation Hooks (`/hooks/`)

- **use-validation.ts** - Custom React hook for form validation
- **use-zod-form.ts** - Integration with react-hook-form and Zod

### 3. Error Components (`/components/ui/form/`)

- **FormError** - Displays field-level validation errors
- **FormControl** - Wraps form inputs with error handling
- **ErrorAlert** - Displays form-level or global errors
- **FormSubmitButton** - Button with loading state for form submissions

### 4. Tests (`/tests/`)

- **validation.test.ts** - Tests for schemas and validation utilities
- **hooks.test.ts** - Tests for validation hooks
- **setup.ts** - Test environment setup

## Usage Examples

### Basic Schema Validation

```typescript
import { EventSchema } from '@/lib/validation/schemas';

// Validate event data
try {
  const validatedData = EventSchema.parse({
    title: 'Team Meeting',
    start_time: '2023-12-10T10:00:00Z',
    end_time: '2023-12-10T11:00:00Z',
    privacy_level: 'public',
  });
  
  // Data is valid, proceed with operation
  saveEvent(validatedData);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation errors
    console.error('Invalid data:', error.flatten());
  }
}
```

### Form Validation with React Hook Form

```tsx
import { useZodForm } from '@/hooks/use-zod-form';
import { EventSchema } from '@/lib/validation/schemas';
import { FormControl, FormSubmitButton } from '@/components/ui/form';

function EventForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useZodForm({
    schema: EventSchema,
    defaultValues: { /* initial values */ },
  });
  
  const onSubmit = (data) => {
    // Data is already validated by Zod
    saveEvent(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl
        name="title"
        label="Event Title"
        error={errors.title?.message}
        required
      >
        <Input {...register('title')} />
      </FormControl>
      
      {/* Other fields */}
      
      <FormSubmitButton 
        isSubmitting={isSubmitting}
        loadingText="Creating Event..."
      >
        Create Event
      </FormSubmitButton>
    </form>
  );
}
```

### Manual Validation with Custom Hook

```tsx
import { useValidation } from '@/hooks/use-validation';
import { EventSchema } from '@/lib/validation/schemas';

function EventForm() {
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting
  } = useValidation(EventSchema, {
    initialValues: { /* initial values */ },
    onSuccess: (data) => saveEvent(data),
  });
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Best Practices

1. **Always validate inputs** - Never assume data is valid
2. **Descriptive error messages** - Help users understand how to fix issues
3. **Early validation** - Validate as early as possible (e.g., on field blur)
4. **Show errors at the right level** - Field errors near fields, form errors at the top
5. **Prevent submission of invalid data** - Disable submit buttons for invalid forms
6. **Test validation rules** - Ensure validation logic works as expected

## Testing

Run validation tests with:

```bash
npm test
```

Watch mode (for development):

```bash
npm run test:watch
```

Coverage report:

```bash
npm run test:coverage
```
