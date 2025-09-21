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
  ENCRYPTION_KEY: z.string().length(64, {
    message: "ENCRYPTION_KEY must be exactly 64 characters (32 bytes in hex)"
  }).regex(/^[0-9a-fA-F]{64}$/, {
    message: "ENCRYPTION_KEY must be a valid 64-character hexadecimal string"
  }).optional(),
  
  // Session Configuration
  NEXTAUTH_SECRET: z.string().min(32, {
    message: "NEXTAUTH_SECRET must be at least 32 characters"
  }).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // Email Configuration (Optional - multiple providers supported)
  // Resend Provider
  RESEND_API_KEY: z.string().regex(/^re_[a-zA-Z0-9_]{20,}$/, {
    message: "RESEND_API_KEY must be a valid Resend API key starting with 're_'"
  }).optional(),
  
  // SendGrid Provider
  SENDGRID_API_KEY: z.string().regex(/^SG\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}$/, {
    message: "SENDGRID_API_KEY must be a valid SendGrid API key starting with 'SG.'"
  }).optional(),
  
  // AWS SES Provider
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  
  // Generic SMTP Provider
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // Email Sender Configuration
  INVITATION_FROM_EMAIL: z.string().email({
    message: "INVITATION_FROM_EMAIL must be a valid email address"
  }).optional(),
  INVITATION_FROM_NAME: z.string().min(1, {
    message: "INVITATION_FROM_NAME must not be empty"
  }).optional(),
  
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

function shouldApplyLocalFallbacks(env: Environment): boolean {
  if (process.env.SKIP_ENV_VALIDATION === 'false') {
    return false;
  }

  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return true;
  }

  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isVercel = Boolean(process.env.VERCEL);
  const isNetlify = process.env.NETLIFY === 'true';

  if (isCI || isVercel || isNetlify) {
    return false;
  }

  return env === 'development' || env === 'test' || env === 'production';
}

function applyLocalFallbacks(env: Environment, warnings: string[]): void {
  if (!shouldApplyLocalFallbacks(env)) {
    return;
  }

  const fallbackValues: Record<string, string> = {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dev-anon-key',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    NEXTAUTH_SECRET: 'development-nextauth-secret-key-please-override',
  };

  const applied: string[] = [];

  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    warnings.push('Environment validation skipped via SKIP_ENV_VALIDATION - using local fallbacks.');
  }

  for (const [key, value] of Object.entries(fallbackValues)) {
    if (!process.env[key]) {
      process.env[key] = value;
      applied.push(key);
    }
  }

  if (applied.length > 0) {
    warnings.push(`Applied local fallback values for: ${applied.join(', ')}`);
  }
}

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
      'ENCRYPTION_KEY'
    ],
    optional: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEXTAUTH_SECRET', 'NEXT_PUBLIC_APP_URL']
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
 * Validate email provider configuration
 */
function validateEmailProviderConfiguration(): { errors: string[]; warnings: string[]; detectedProvider: string | null } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let detectedProvider: string | null = null;
  
  const providers = {
    resend: !!process.env.RESEND_API_KEY,
    sendgrid: !!process.env.SENDGRID_API_KEY,
    aws_ses: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    smtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
  };
  
  const activeProviders = Object.entries(providers).filter(([_, active]) => active).map(([name]) => name);
  
  if (activeProviders.length === 0) {
    warnings.push('No email provider configured - invitation emails will use console logging only');
    detectedProvider = 'console';
  } else if (activeProviders.length > 1) {
    warnings.push(`Multiple email providers configured: ${activeProviders.join(', ')}. Priority: Resend > SendGrid > AWS SES > SMTP`);
    detectedProvider = activeProviders.includes('resend') ? 'resend' : 
                     activeProviders.includes('sendgrid') ? 'sendgrid' :
                     activeProviders.includes('aws_ses') ? 'aws_ses' : 'smtp';
  } else {
    detectedProvider = activeProviders[0];
  }
  
  // Validate email sender configuration if any provider is active
  if (detectedProvider !== 'console') {
    if (!process.env.INVITATION_FROM_EMAIL) {
      errors.push('INVITATION_FROM_EMAIL is required when email provider is configured');
    } else {
      // Validate email domain for certain providers
      const fromEmail = process.env.INVITATION_FROM_EMAIL;
      if (detectedProvider === 'resend' && !fromEmail.match(/@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/)) {
        warnings.push('INVITATION_FROM_EMAIL should use a verified domain for Resend');
      }
      if (detectedProvider === 'sendgrid' && fromEmail.includes('localhost')) {
        errors.push('SendGrid requires a valid domain - localhost emails are not allowed');
      }
    }
    
    if (!process.env.INVITATION_FROM_NAME) {
      warnings.push('INVITATION_FROM_NAME not configured - will use default sender name');
    }
  }
  
  // Validate Supabase SMTP configuration consistency
  if (detectedProvider === 'resend' && process.env.RESEND_API_KEY) {
    // Check if Supabase config.toml is set up to use the same Resend key
    warnings.push('Ensure Supabase config.toml [auth.email.smtp] uses the same RESEND_API_KEY for consistent email delivery');
  }
  
  return { errors, warnings, detectedProvider };
}

/**
 * Validate environment variables based on current environment
 */
export function validateEnvironment(): ValidationResult {
  const env = (process.env.NODE_ENV as Environment) || 'development';
  const errors: string[] = [];
  const warnings: string[] = [];

  const rules = environmentRules[env];
  if (!rules) {
    errors.push(`Unsupported NODE_ENV value: ${env}`);
  }

  applyLocalFallbacks(env, warnings);

  // Parse with zod schema
  const parseResult = envSchema.safeParse(process.env);
  
  if (!parseResult.success) {
    parseResult.error.issues.forEach(issue => {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    });
  }
  
  // Check environment-specific required variables
  if (rules) {
    rules.required.forEach(key => {
      if (!process.env[key]) {
        errors.push(`${key} is required for ${env} environment`);
      }
    });
  }
  
  // Validate email provider configuration
  const emailValidation = validateEmailProviderConfiguration();
  errors.push(...emailValidation.errors);
  warnings.push(...emailValidation.warnings);
  
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
  
  // Add detected email provider to data if successful
  let validatedData = parseResult.success ? parseResult.data : undefined;
  if (validatedData && emailValidation.detectedProvider) {
    validatedData = { ...validatedData, DETECTED_EMAIL_PROVIDER: emailValidation.detectedProvider } as any;
  }
  
  return {
    success: errors.length === 0,
    data: validatedData,
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
      // Detected provider (from validation)
      provider: (validatedEnv as any).DETECTED_EMAIL_PROVIDER || 'console',
      
      // Provider-specific configurations
      resend: {
        apiKey: validatedEnv.RESEND_API_KEY,
      },
      sendgrid: {
        apiKey: validatedEnv.SENDGRID_API_KEY,
      },
      awsSes: {
        accessKeyId: validatedEnv.AWS_ACCESS_KEY_ID,
        secretAccessKey: validatedEnv.AWS_SECRET_ACCESS_KEY,
        region: validatedEnv.AWS_REGION,
      },
      smtp: {
        host: validatedEnv.SMTP_HOST,
        port: validatedEnv.SMTP_PORT,
        user: validatedEnv.SMTP_USER,
        password: validatedEnv.SMTP_PASSWORD,
      },
      
      // Sender configuration
      sender: {
        email: validatedEnv.INVITATION_FROM_EMAIL || 'noreply@polyharmony.app',
        name: validatedEnv.INVITATION_FROM_NAME || 'PolyHarmony',
      },
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
