import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
/**
 * Utility function for conditionally merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a style object with CSS custom properties
 * This allows for dynamic values without using inline styles directly
 */
export function createCssVars(vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [`--${key}`]: value,
    }),
    {}
  ) as React.CSSProperties
}

/**
 * Validates an input against validation rules
 * @param value The value to validate
 * @param rules An array of validation rules
 * @returns Error message or undefined if valid
 */
export function validateInput(
  value: any,
  rules: Array<(val: any) => string | undefined>
): string | undefined {
  for (const rule of rules) {
    const error = rule(value)
    if (error) return error
  }
  return undefined
}

/**
 * Common validation rules for reuse
 */
export const ValidationRules = {
  required: (message = "This field is required") => (value: any) =>
    value === undefined || value === null || value === ""
      ? message
      : undefined,

  minLength: (min: number, message?: string) => (value: string) =>
    value && value.length < min
      ? message || `Must be at least ${min} characters`
      : undefined,

  maxLength: (max: number, message?: string) => (value: string) =>
    value && value.length > max
      ? message || `Cannot exceed ${max} characters`
      : undefined,

  email: (message = "Please enter a valid email address") => (value: string) =>
    value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
      ? message
      : undefined,

  pattern: (pattern: RegExp, message: string) => (value: string) =>
    value && !pattern.test(value) ? message : undefined,
}

/**
 * Format bytes to a human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}