/**
 * FormSubmitButton Component
 * 
 * A submit button component for forms that handles loading states
 * and prevents double submissions.
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormSubmitButtonProps extends ButtonProps {
  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;
  
  /**
   * Loading text to display when isSubmitting is true
   */
  loadingText?: string;
  
  /**
   * Icon to display when not loading
   */
  icon?: React.ReactNode;
}

/**
 * FormSubmitButton - A submit button for forms with loading state
 * 
 * @example
 * <FormSubmitButton 
 *   isSubmitting={formState.isSubmitting} 
 *   loadingText="Creating Event..."
 * >
 *   Create Event
 * </FormSubmitButton>
 */
export const FormSubmitButton = React.forwardRef<HTMLButtonElement, FormSubmitButtonProps>(
  ({ children, className, isSubmitting, loadingText, disabled, icon, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type="submit"
        className={cn("relative", className)}
        disabled={isSubmitting || disabled}
        {...props}
      >
        {isSubmitting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        
        {!isSubmitting && icon && (
          <span className="mr-2">{icon}</span>
        )}
        
        {isSubmitting && loadingText ? loadingText : children}
      </Button>
    );
  }
);

FormSubmitButton.displayName = 'FormSubmitButton';

export default FormSubmitButton;
