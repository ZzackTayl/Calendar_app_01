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
  className
}: MobileFormFieldProps) {
  return (
    <div className={cn("mobile-form-field", className)}>
      <Label htmlFor={name} className="mobile-form-label">
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
          "mobile-form-input",
          error && "border-destructive focus:border-destructive focus:ring-destructive"
        )}
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
    <form onSubmit={onSubmit} className={cn("mobile-form", className)}>
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
    <div className={cn("mobile-button-group pt-6", className)}>
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
  className
}: MobileFormButtonProps) {
  const variantClasses = {
    primary: "mobile-button-primary",
    secondary: "mobile-button-secondary",
    outline: "mobile-button-outline",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive"
  };

  return (
    <Button
      type={type}
      variant={variant === 'outline' ? 'outline' : variant === 'destructive' ? 'destructive' : 'default'}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "mobile-button mobile-full-width",
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
  className
}: MobileTextareaProps) {
  return (
    <div className={cn("mobile-form-field", className)}>
      <Label htmlFor={name} className="mobile-form-label">
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
          "mobile-form-input resize-none",
          error && "border-destructive focus:border-destructive focus:ring-destructive"
        )}
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
  className
}: MobileSelectProps) {
  return (
    <div className={cn("mobile-form-field", className)}>
      <Label htmlFor={name} className="mobile-form-label">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "mobile-form-input",
          error && "border-destructive focus:border-destructive focus:ring-destructive"
        )}
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
      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}
