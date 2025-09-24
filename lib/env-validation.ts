/**
 * Environment Variable Validation Utility
 * Provides safe access to environment variables with validation and graceful error handling
 */

export interface EnvValidationOptions {
  required?: boolean;
  defaultValue?: string;
  validate?: (value: string) => boolean;
  errorMessage?: string;
}

/**
 * Safely get an environment variable with validation
 */
export function getEnvVar(
  key: string,
  options: EnvValidationOptions = {}
): string | undefined {
  const {
    required = false,
    defaultValue,
    validate,
    errorMessage
  } = options;

  const value = process.env[key];

  // If value is missing and not required, return default or undefined
  if (!value) {
    if (required) {
      const message = errorMessage || `Required environment variable "${key}" is not set`;
      throw new Error(message);
    }
    return defaultValue;
  }

  // Validate the value if validator provided
  if (validate && !validate(value)) {
    const message = errorMessage || `Environment variable "${key}" has invalid value: ${value}`;
    throw new Error(message);
  }

  return value;
}

/**
 * Get a required environment variable (throws if missing)
 */
export function getRequiredEnvVar(key: string, errorMessage?: string): string {
  return getEnvVar(key, { required: true, errorMessage })!;
}

/**
 * Get environment variable with URL validation
 */
export function getUrlEnvVar(
  key: string,
  options: Omit<EnvValidationOptions, 'validate'> = {}
): string | undefined {
  return getEnvVar(key, {
    ...options,
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    errorMessage: `Environment variable "${key}" must be a valid URL`
  });
}

/**
 * Get environment variable with email validation
 */
export function getEmailEnvVar(
  key: string,
  options: Omit<EnvValidationOptions, 'validate'> = {}
): string | undefined {
  return getEnvVar(key, {
    ...options,
    validate: (value) => {
      // More comprehensive email validation
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      return emailRegex.test(value);
    },
    errorMessage: `Environment variable "${key}" must be a valid email address`
  });
}

/**
 * Get environment variable with hex string validation (for encryption keys)
 */
export function getHexEnvVar(
  key: string,
  expectedLength?: number,
  options: Omit<EnvValidationOptions, 'validate'> = {}
): string | undefined {
  return getEnvVar(key, {
    ...options,
    validate: (value) => {
      if (!/^[0-9a-fA-F]+$/.test(value)) return false;
      if (expectedLength && value.length !== expectedLength) return false;
      return true;
    },
    errorMessage: expectedLength
      ? `Environment variable "${key}" must be a ${expectedLength}-character hexadecimal string`
      : `Environment variable "${key}" must be a hexadecimal string`
  });
}

/**
 * Validate critical environment variables on startup with graceful fallback
 */
export function validateCriticalEnvironment(): void {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Supabase configuration - Critical but with fallback in development
  try {
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL is required for database connectivity');
    getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required for client authentication');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      warnings.push(`Supabase configuration: ${error instanceof Error ? error.message : 'Configuration error'} (continuing in development mode)`);
    } else {
      issues.push(error instanceof Error ? error.message : 'Supabase configuration error');
    }
  }

  // Encryption key validation - Critical for security
  try {
    getHexEnvVar('ENCRYPTION_KEY', 64, { required: true });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      warnings.push(`Encryption key: ${error instanceof Error ? error.message : 'Validation error'} (using fallback in development)`);
    } else {
      issues.push(error instanceof Error ? error.message : 'Encryption key validation error');
    }
  }

  // Email configuration (at least one provider should be configured) - Warning only
  const hasEmailProvider = !!(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  );

  if (!hasEmailProvider) {
    if (process.env.NODE_ENV === 'production') {
      issues.push('No email provider configured. At least one of RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_* variables must be set');
    } else {
      warnings.push('No email provider configured. Email functionality will be disabled');
    }
  }

  // URL validation for app URLs - Warning only in development
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      getUrlEnvVar('NEXT_PUBLIC_APP_URL', { required: true });
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        issues.push(error instanceof Error ? error.message : 'App URL validation error');
      } else {
        warnings.push(`App URL validation: ${error instanceof Error ? error.message : 'Validation error'}`);
      }
    }
  }

  // Log warnings but don't fail
  if (warnings.length > 0) {
    console.warn('⚠️ Environment validation warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Only throw error if there are critical issues in production
  if (issues.length > 0) {
    console.error('🚨 Critical environment validation issues:');
    issues.forEach(issue => console.error(`  - ${issue}`));

    // In production, always fail on critical issues
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed with ${issues.length} critical issue(s)`);
    }

    // In development, log but continue
    console.warn('🚨 Development mode: Continuing despite critical issues (not recommended for production)');
  }
}

/**
 * Get environment info for debugging (safe, no sensitive data)
 */
export function getEnvironmentInfo(): Record<string, any> {
  return {
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
    hasEmailProvider: !!(
      process.env.RESEND_API_KEY ||
      process.env.SENDGRID_API_KEY ||
      process.env.SMTP_HOST
    ),
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    vercelEnv: process.env.VERCEL_ENV,
    buildTime: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  };
}
