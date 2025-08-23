/**
 * ErrorAlert Component
 * 
 * Displays form-level or global errors with a prominent visual style.
 * Used for displaying validation failures, server errors, or other critical issues.
 */
import React from 'react';
import { XCircle, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorAlertProps {
  /**
   * Title for the error (optional)
   */
  title?: string;
  
  /**
   * Error message to display
   */
  message: string | string[];
  
  /**
   * Error severity level
   */
  severity?: ErrorSeverity;
  
  /**
   * Whether to display the error as a list (for multiple errors)
   */
  asList?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Callback when the error is dismissed (if dismissible)
   */
  onDismiss?: () => void;
}

/**
 * ErrorAlert - Displays prominent form or application errors
 * 
 * @example
 * <ErrorAlert 
 *   title="Submission Failed" 
 *   message="Please fix the following errors before continuing." 
 *   severity="error" 
 * />
 * 
 * // With multiple error messages
 * <ErrorAlert 
 *   message={["Invalid email", "Password too short"]} 
 *   asList={true}
 * />
 */
export const ErrorAlert = React.forwardRef<HTMLDivElement, ErrorAlertProps>(
  ({ title, message, severity = 'error', asList = false, className, onDismiss }, ref) => {
    const messages = Array.isArray(message) ? message : [message];
    
    const Icon = {
      error: XCircle,
      warning: AlertTriangle,
      info: Info
    }[severity];
    
    const variantClass = {
      error: 'destructive',
      warning: 'warning',
      info: 'info'
    }[severity];
    
    const defaultTitle = {
      error: 'Error',
      warning: 'Warning',
      info: 'Information'
    }[severity];
    
    return (
      <Alert 
        ref={ref}
        variant={variantClass as any}
        className={cn(
          "border border-opacity-20 mb-6", 
          className
        )}
      >
        <Icon className="h-4 w-4 mt-0.5" />
        
        <div className="w-full">
          {(title || defaultTitle) && (
            <div className="font-semibold mb-1">
              {title || defaultTitle}
            </div>
          )}
          
          <AlertDescription>
            {asList && messages.length > 1 ? (
              <ul className="list-disc list-inside">
                {messages.map((msg, index) => (
                  <li key={index} className="my-1">{msg}</li>
                ))}
              </ul>
            ) : (
              <span>{messages[0]}</span>
            )}
          </AlertDescription>
        </div>
        
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Dismiss error"
          >
            <span className="sr-only">Dismiss</span>
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </Alert>
    );
  }
);

ErrorAlert.displayName = 'ErrorAlert';

export default ErrorAlert;
