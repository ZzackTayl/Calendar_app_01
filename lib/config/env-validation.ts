/**
 * Secure Environment Variable Validation Service
 * 
 * Provides type-safe environment variable validation with security considerations.
 * Handles different environments (development, staging, production) and validates
 * required configurations at startup.
 */

import { z } from 'zod';

/**
 * Environment types supported by the application
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Schema for validating required environment variables
 */
const envSchema = z.object({
  // Node.js Environment
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  
  // Application Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
  
  // Supabase Configuration (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL"
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"
  }),
  
  // Supabase Service Role (Optional - for server-side operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Google Calendar API (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  
  // Security Configuration
  ENCRYPTION_KEY: z.string().min(32, {
    message: "ENCRYPTION_KEY must be at least 32 characters for security"
  }).optional(),
  
  // Session Configuration
  NEXTAUTH_SECRET: z.string().min(32, {
    message: "NEXTAUTH_SECRET must be at least 32 characters"
  }).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Email Configuration (Optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // Feature Flags
  FEATURE_GOOGLE_CALENDAR: z.string().transform((val) => val === 'true').default('false'),
  FEATURE_EMAIL_NOTIFICATIONS: z.string().transform((val) => val === 'true').default('false'),
  
  // Development Settings
  NEXT_TELEMETRY_DISABLED: z.string().optional(),
  ANALYZE: z.string().optional(),
});

/**
 * Validated environment variables type
 */
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Environment-specific validation rules
 */
const environmentRules = {
  development: {
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    optional: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'ENCRYPTION_KEY']
  },
  staging: {
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'ENCRYPTION_KEY'],
    optional: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXTAUTH_SECRET']
  },
  production: {
    required: [
      'NEXT_PUBLIC_SUPABASE_URL', 
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'ENCRYPTION_KEY',
      'NEXTAUTH_SECRET',
      'NEXT_PUBLIC_APP_URL'
    ],
    optional: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
  },
  test: {
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    optional: []
  }
};

/**
 * Validation result interface
 */
interface ValidationResult {
  success: boolean;
  data?: ValidatedEnv;
  errors?: string[];
  warnings?: string[];
}

/**
 * Validate environment variables based on current environment
 */
export function validateEnvironment(): ValidationResult {
  const env = process.env.NODE_ENV as Environment || 'development';
  const rules = environmentRules[env];
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Parse with zod schema
  const parseResult = envSchema.safeParse(process.env);
  
  if (!parseResult.success) {
    parseResult.error.issues.forEach(issue => {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    });
  }
  
  // Check environment-specific required variables
  rules.required.forEach(key => {
    if (!process.env[key]) {
      errors.push(`${key} is required for ${env} environment`);
    }
  });
  
  // Check for sensitive data in development
  if (env === 'development') {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY detected in development - ensure it\'s not committed');
    }
  }
  
  // Validate URL formats for critical services
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL does not appear to be a valid Supabase URL');
  }
  
  return {
    success: errors.length === 0,
    data: parseResult.success ? parseResult.data : undefined,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Get validated environment configuration
 * Throws an error if validation fails
 */
export function getValidatedEnv(): ValidatedEnv {
  const result = validateEnvironment();
  
  if (!result.success) {
    const errorMessage = `Environment validation failed:\n${result.errors?.join('\n')}`;
    throw new Error(errorMessage);
  }
  
  if (result.warnings && result.warnings.length > 0) {
    console.warn('Environment warnings:', result.warnings.join('\n'));
  }
  
  return result.data!;
}

/**
 * Check if running in secure environment (production/staging)
 */
export function isSecureEnvironment(): boolean {
  const env = process.env.NODE_ENV as Environment;
  return env === 'production' || env === 'staging';
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const validatedEnv = getValidatedEnv();
  
  return {
    env: validatedEnv.NODE_ENV,
    isDevelopment: validatedEnv.NODE_ENV === 'development',
    isProduction: validatedEnv.NODE_ENV === 'production',
    isStaging: validatedEnv.NODE_ENV === 'staging',
    isTest: validatedEnv.NODE_ENV === 'test',
    isSecure: isSecureEnvironment(),
    
    // Application URLs
    appUrl: validatedEnv.NEXT_PUBLIC_APP_URL,
    port: validatedEnv.PORT,
    
    // Supabase Configuration
    supabase: {
      url: validatedEnv.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: validatedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: validatedEnv.SUPABASE_SERVICE_ROLE_KEY,
    },
    
    // Google Calendar
    google: {
      clientId: validatedEnv.GOOGLE_CLIENT_ID,
      clientSecret: validatedEnv.GOOGLE_CLIENT_SECRET,
      redirectUri: validatedEnv.GOOGLE_REDIRECT_URI,
    },
    
    // Security
    security: {
      encryptionKey: validatedEnv.ENCRYPTION_KEY,
      nextAuthSecret: validatedEnv.NEXTAUTH_SECRET,
      nextAuthUrl: validatedEnv.NEXTAUTH_URL,
    },
    
    // Email Configuration
    email: {
      host: validatedEnv.SMTP_HOST,
      port: validatedEnv.SMTP_PORT,
      user: validatedEnv.SMTP_USER,
      password: validatedEnv.SMTP_PASSWORD,
    },
    
    // Feature Flags
    features: {
      googleCalendar: validatedEnv.FEATURE_GOOGLE_CALENDAR,
      emailNotifications: validatedEnv.FEATURE_EMAIL_NOTIFICATIONS,
    }
  };
}

/**
 * Initialize and validate environment on startup
 * Call this at application startup to ensure valid configuration
 */
export function initializeEnvironment(): void {
  console.log('Initializing environment configuration...');
  
  try {
    const result = validateEnvironment();
    
    if (!result.success) {
      console.error('❌ Environment validation failed:');
      result.errors?.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.warn('⚠️  Environment warnings:');
      result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    const config = getEnvironmentConfig();
    console.log(`✅ Environment validated successfully (${config.env})`);
    
    // Log important configuration (without sensitive data)
    console.log('Configuration loaded:');
    console.log(`  - Environment: ${config.env}`);
    console.log(`  - Port: ${config.port}`);
    console.log(`  - Supabase URL: ${config.supabase.url ? '✓' : '✗'}`);
    console.log(`  - Google Calendar: ${config.features.googleCalendar ? '✓' : '✗'}`);
    console.log(`  - Email Notifications: ${config.features.emailNotifications ? '✓' : '✗'}`);
    
  } catch (error) {
    console.error('❌ Failed to initialize environment:', error);
    process.exit(1);
  }
}

// Export singleton instance
export const env = getValidatedEnv();
export const config = getEnvironmentConfig();