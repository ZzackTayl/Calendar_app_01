/**
 * FormError Component
 * 
 * Displays validation errors for form fields with accessibility features.
 * Can be used for both field-specific errors and form-level errors.
 */
import React from 'react';
import { XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormErrorProps {
  /**
   * Error message to display
   */
  message?: string;
  
  /**
   * ID for accessibility (should match input's aria-describedby)
   */
  id?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether this is a critical error that should be emphasized
   */
  isCritical?: boolean;
}

/**
 * FormError Component - Displays validation errors for form fields
 * 
 * @example
 * <FormError message={errors.email} id="email-error" />
 */
export const FormError = React.forwardRef<HTMLDivElement, FormErrorProps>(
  ({ message, id, className, isCritical = false }, ref) => {
    if (!message) return null;
    
    return (
      <div 
        ref={ref}
        id={id} 
        className={cn(
          "text-sm flex items-center gap-2 mt-1.5",
          isCritical ? "text-destructive font-medium" : "text-muted-foreground",
          className
        )}
        role="alert"
      >
        {isCritical && <XCircle className="h-4 w-4" />}
        <span>{message}</span>
      </div>
    );
  }
);

FormError.displayName = "FormError";

export default FormError;
