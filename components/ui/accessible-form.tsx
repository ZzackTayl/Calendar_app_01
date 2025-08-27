'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AccessibleFormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
  autoComplete?: string;
}

export function AccessibleFormField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className,
  description,
  autoComplete,
}: AccessibleFormFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('space-y-2', className)}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={cn(
          'w-full h-12 px-4 py-3 text-base border rounded-xl',
          'bg-card/60 backdrop-blur-sm',
          'focus:ring-2 focus:ring-primary focus:border-primary',
          'focus:bg-card/80 transition-all duration-300',
          'placeholder:text-muted-foreground/70',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-destructive focus:ring-destructive' : 'border-border',
          'sm:h-10 sm:py-2 sm:text-sm'
        )}
        aria-describedby={[
          error && errorId,
          description && descriptionId
        ].filter(Boolean).join(' ') || undefined}
      />
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-destructive" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

interface AccessibleTextareaProps {
  id: string;
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
  rows?: number;
}

export function AccessibleTextarea({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className,
  description,
  rows = 4,
}: AccessibleTextareaProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('space-y-2', className)}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        className={cn(
          'w-full px-4 py-3 text-base border rounded-xl resize-none',
          'bg-card/60 backdrop-blur-sm',
          'focus:ring-2 focus:ring-primary focus:border-primary',
          'focus:bg-card/80 transition-all duration-300',
          'placeholder:text-muted-foreground/70',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-destructive focus:ring-destructive' : 'border-border',
          'sm:text-sm'
        )}
        aria-describedby={[
          error && errorId,
          description && descriptionId
        ].filter(Boolean).join(' ') || undefined}
      />
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-destructive" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

interface AccessibleSelectProps {
  id: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export function AccessibleSelect({
  id,
  label,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  className,
  description,
  options,
  placeholder,
}: AccessibleSelectProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('space-y-2', className)}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-1" aria-label="required">*</span>}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <select
        id={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        className={cn(
          'w-full h-12 px-4 py-3 text-base border rounded-xl',
          'bg-card/60 backdrop-blur-sm',
          'focus:ring-2 focus:ring-primary focus:border-primary',
          'focus:bg-card/80 transition-all duration-300',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-destructive focus:ring-destructive' : 'border-border',
          'sm:h-10 sm:py-2 sm:text-sm'
        )}
        aria-describedby={[
          error && errorId,
          description && descriptionId
        ].filter(Boolean).join(' ') || undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-destructive" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

interface AccessibleCheckboxProps {
  id: string;
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  description?: string;
}

export function AccessibleCheckbox({
  id,
  label,
  checked,
  onChange,
  error,
  disabled = false,
  className,
  description,
}: AccessibleCheckboxProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start space-x-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className={cn(
            'mt-1 h-4 w-4 rounded border border-border',
            'focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-destructive focus:ring-destructive' : 'border-border'
          )}
          aria-describedby={[
            error && errorId,
            description && descriptionId
          ].filter(Boolean).join(' ') || undefined}
        />
        <div className="flex-1">
          <label 
            htmlFor={id} 
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {label}
          </label>
          
          {description && (
            <p id={descriptionId} className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-destructive ml-7" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
