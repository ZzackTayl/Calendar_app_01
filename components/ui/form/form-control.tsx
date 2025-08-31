/**
 * FormControl Component
 * 
 * Wraps form inputs with labels and error messages for consistent styling and behavior.
 * Provides accessibility features and visual error states.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import FormError from './form-error';

interface FormControlProps {
  /**
   * Form field name (used for IDs and accessibility)
   */
  name: string;
  
  /**
   * Label text
   */
  label?: string;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Helper text to display below the input
   */
  helperText?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  
  /**
   * Additional CSS classes for the label
   */
  labelClassName?: string;
  
  /**
   * The form input element
   */
  children: React.ReactElement;
}

/**
 * FormControl - Wraps form inputs with labels and error messages
 * 
 * @example
 * <FormControl
 *   name="email"
 *   label="Email Address"
 *   error={errors.email}
 *   required
 * >
 *   <Input {...register('email')} />
 * </FormControl>
 */
export const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ name, label, error, helperText, required, disabled, className, labelClassName, children }, ref) => {
    const id = `field-${name}`;
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-description` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
    
    const childWithProps = React.cloneElement(children, {
      id,
      name,
      'aria-invalid': error ? 'true' : undefined,
      'aria-describedby': describedBy,
      'aria-required': required ? 'true' : undefined,
      disabled,
      ...children.props as any,
    });

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {label && (
          <Label
            htmlFor={id}
            className={cn(
              required && "after:content-['*'] after:ml-0.5 after:text-destructive",
              disabled && "opacity-70 cursor-not-allowed",
              error && "text-destructive",
              labelClassName
            )}
          >
            {label}
          </Label>
        )}
        {childWithProps}
        {helperText && !error && (
          <p id={helperId} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
        {error && <FormError id={errorId} message={error} />}
      </div>
    );
  }
);

FormControl.displayName = 'FormControl';

export default FormControl;
