'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Button } from './button';
import { Label } from './label';

interface MobileFormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'date' | 'time' | 'datetime-local';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MobileFormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required,
  disabled,
  className,
}: MobileFormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={name}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          error ? 'text-destructive' : 'text-foreground'
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        className={cn(
          'h-12 text-base px-4 py-3 rounded-xl',
          'bg-card/60 border border-border/50',
          'focus:ring-2 focus:ring-primary focus:border-primary focus:bg-card/80',
          'placeholder:text-muted-foreground/70',
          'transition-all duration-300',
          error && 'border-destructive focus:border-destructive focus:ring-destructive'
        )}
        style={{ fontSize: '16px' }} // Prevent iOS zoom
      />
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

interface MobileFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export function MobileForm({ children, onSubmit, className }: MobileFormProps) {
  return (
    <form onSubmit={onSubmit} className={cn('space-y-6', className)}>
      {children}
    </form>
  );
}

interface MobileFormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFormActions({ children, className }: MobileFormActionsProps) {
  return (
    <div className={cn('pt-6 flex flex-col sm:flex-row gap-3', className)}>
      {children}
    </div>
  );
}

interface MobileFormButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function MobileFormButton({
  children,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled,
  loading,
  className,
}: MobileFormButtonProps) {
  const variantClasses = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
    outline:
      'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-ring',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
  };

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'w-full h-12 px-6 py-3 text-base font-medium rounded-xl',
        'flex items-center justify-center',
        'transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2',
        'transform hover:scale-[1.02] active:scale-[0.98]',
        variantClasses[variant],
        className
      )}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          Loading...
        </div>
      ) : (
        children
      )}
    </Button>
  );
}

// Mobile-optimized textarea
interface MobileTextareaProps {
  label: string;
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export function MobileTextarea({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  required,
  disabled,
  rows = 4,
  className,
}: MobileTextareaProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={name}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          error ? 'text-destructive' : 'text-foreground'
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        rows={rows}
        className={cn(
          'w-full text-base px-4 py-3 rounded-xl resize-none',
          'bg-card/60 border border-border/50',
          'focus:ring-2 focus:ring-primary focus:border-primary focus:bg-card/80',
          'placeholder:text-muted-foreground/70',
          'transition-all duration-300',
          error && 'border-destructive focus:border-destructive focus:ring-destructive'
        )}
        style={{ fontSize: '16px' }} // Prevent iOS zoom
      />
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

// Mobile-optimized select
interface MobileSelectOption {
  value: string;
  label: string;
}

interface MobileSelectProps {
  label: string;
  name: string;
  options: MobileSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MobileSelect({
  label,
  name,
  options,
  value,
  onChange,
  error,
  required,
  disabled,
  placeholder,
  className,
}: MobileSelectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={name}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          error ? 'text-destructive' : 'text-foreground'
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          required={required}
          disabled={disabled}
          aria-label={label}
          className={cn(
            'appearance-none w-full h-12 text-base px-4 py-3 rounded-xl',
            'bg-card/60 border border-border/50',
            'focus:ring-2 focus:ring-primary focus:border-primary focus:bg-card/80',
            'placeholder:text-muted-foreground/70',
            'transition-all duration-300',
            'pr-8', // for the arrow
            error && 'border-destructive focus:border-destructive focus:ring-destructive'
          )}
          style={{ fontSize: '16px' }} // Prevent iOS zoom
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
