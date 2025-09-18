/**
 * Production Environment Security Validator
 * Validates and enforces secure environment variable configuration
 */

export interface SecurityConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
}

/**
 * Validate production environment security configuration
 */
export function validateProductionEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  const config = getSecurityConfig();

  // CRITICAL: Check for authentication bypass
  const devAuthBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS;
  if (devAuthBypass === 'true') {
    if (config.isProduction) {
      criticalIssues.push('CRITICAL: Authentication bypass enabled in production');
    } else {
      warnings.push('Authentication bypass enabled in non-production environment');
    }
  }

  // CRITICAL: Validate encryption key security
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    if (config.isProduction) {
      criticalIssues.push('CRITICAL: Missing encryption key in production');
    } else {
      warnings.push('Missing encryption key - calendar integrations disabled');
    }
  } else {
    // Validate encryption key format and strength
    if (encryptionKey.length !== 64) {
      criticalIssues.push('CRITICAL: Encryption key must be 64 characters');
    }
    if (!/^[0-9a-fA-F]+$/.test(encryptionKey)) {
      criticalIssues.push('CRITICAL: Encryption key must be hexadecimal');
    }
    // Check for weak keys (all same character, sequential patterns)
    if (/^(.)\1*$/.test(encryptionKey)) {
      criticalIssues.push('CRITICAL: Encryption key is too weak (repeated characters)');
    }
  }

  // Validate required production environment variables
  if (config.isProduction) {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ENCRYPTION_KEY'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        criticalIssues.push(`CRITICAL: Missing required environment variable: ${varName}`);
      }
    });

    // Validate HTTPS URLs in production
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      criticalIssues.push('CRITICAL: Supabase URL must use HTTPS in production');
    }

    // Check for demo mode in production
    if (process.env.ENABLE_DEMO_MODE === 'true') {
      criticalIssues.push('CRITICAL: Demo mode must be disabled in production');
    }

    // Validate JWT secrets
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      criticalIssues.push('CRITICAL: JWT secret must be at least 32 characters');
    }

    // Validate NextAuth secret
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (!nextAuthSecret || nextAuthSecret.length < 32) {
      criticalIssues.push('CRITICAL: NEXTAUTH_SECRET must be at least 32 characters');
    }

    // Validate database connection security
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl && !databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      warnings.push('Database URL should use PostgreSQL protocol');
    }

    // Check for rate limiting configuration
    if (!process.env.RATE_LIMIT_ENABLED || process.env.RATE_LIMIT_ENABLED !== 'true') {
      warnings.push('Rate limiting should be enabled in production');
    }
  }

  // Check for insecure debugging flags
  const debugFlags = [
    'DEBUG',
    'NODE_DEBUG',
    'NEXT_PUBLIC_DEBUG',
    'ENABLE_SOURCE_MAPS'
  ];

  debugFlags.forEach(flag => {
    if (process.env[flag] && config.isProduction) {
      warnings.push(`Debug flag ${flag} enabled in production`);
    }
  });

  // Validate CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins === '*' && config.isProduction) {
    criticalIssues.push('CRITICAL: Wildcard CORS origins not allowed in production');
  }

  return {
    isValid: criticalIssues.length === 0 && errors.length === 0,
    errors,
    warnings,
    criticalIssues
  };
}

/**
 * Get current security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isStaging: ['staging', 'test'].includes(nodeEnv)
  };
}

/**
 * Enforce security policies at application startup
 */
export function enforceSecurityPolicies(): void {
  const validation = validateProductionEnvironment();
  const config = getSecurityConfig();

  // Log validation results
  if (validation.criticalIssues.length > 0) {
    console.error('🚨 CRITICAL SECURITY ISSUES DETECTED:', validation.criticalIssues);

    // In production, exit immediately on critical security issues
    if (config.isProduction) {
      console.error('❌ SECURITY: Terminating application due to critical security configuration errors');
      process.exit(1);
    }
  }

  if (validation.errors.length > 0) {
    console.error('❌ SECURITY ERRORS:', validation.errors);

    if (config.isProduction) {
      console.error('❌ SECURITY: Terminating application due to security configuration errors');
      process.exit(1);
    }
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ SECURITY WARNINGS:', validation.warnings);
  }

  console.log(`✅ SECURITY: Environment validation completed for ${config.isProduction ? 'production' : config.isStaging ? 'staging' : 'development'}`);
}

/**
 * Runtime security monitoring
 */
export function initializeSecurityMonitoring(): void {
  const config = getSecurityConfig();

  // Monitor for runtime environment variable changes
  setInterval(() => {
    const validation = validateProductionEnvironment();

    if (validation.criticalIssues.length > 0) {
      console.error('🚨 RUNTIME SECURITY ALERT: Critical issues detected during runtime check');

      // In production, this could trigger alerts/notifications
      if (config.isProduction) {
        // Send security alert to monitoring system
        notifySecurityTeam(validation.criticalIssues);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

/**
 * Send security alerts to monitoring system
 */
function notifySecurityTeam(issues: string[]): void {
  // Implementation would send to monitoring/alerting system
  console.error('🚨 SECURITY TEAM NOTIFICATION:', {
    timestamp: new Date().toISOString(),
    issues,
    environment: process.env.NODE_ENV,
    severity: 'CRITICAL'
  });
}

/**
 * Sanitize environment variables for logging (mask sensitive values)
 */
export function sanitizeEnvForLogging(): Record<string, string> {
  const sensitiveKeys = [
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
    'PASSWORD',
    'SECRET',
    'KEY',
    'TOKEN',
    'PRIVATE'
  ];

  const sanitized: Record<string, string> = {};

  Object.keys(process.env).forEach(key => {
    const value = process.env[key];
    if (!value) return;

    const isSensitive = sensitiveKeys.some(sensitiveKey =>
      key.toUpperCase().includes(sensitiveKey)
    );

    if (isSensitive) {
      sanitized[key] = `***${value.slice(-4)}`; // Show only last 4 characters
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Validate environment variable format and strength
 */
export function validateEnvironmentVariableStrength(key: string, value: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  // Check for common weak patterns
  const weakPatterns = [
    /^password$/i,
    /^123456/,
    /^admin$/i,
    /^test$/i,
    /^dev$/i,
    /^default$/i,
    /^changeme$/i
  ];

  if (weakPatterns.some(pattern => pattern.test(value))) {
    criticalIssues.push(`CRITICAL: ${key} contains weak/common value`);
  }

  // Check length requirements for specific key types
  if (key.includes('SECRET') || key.includes('KEY')) {
    if (value.length < 32) {
      criticalIssues.push(`CRITICAL: ${key} must be at least 32 characters`);
    }
    if (value.length < 64) {
      warnings.push(`${key} should be at least 64 characters for better security`);
    }
  }

  // Check for proper entropy in secrets
  if (key.includes('SECRET') || key.includes('KEY')) {
    const uniqueChars = new Set(value).size;
    if (uniqueChars < 10) {
      warnings.push(`${key} has low character diversity`);
    }
  }

  return {
    isValid: criticalIssues.length === 0 && errors.length === 0,
    errors,
    warnings,
    criticalIssues
  };
}

/**
 * Check for environment variable leaks in public build
 */
export function detectEnvironmentLeaks(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  // Check for sensitive env vars that might be exposed to client
  const publicEnvVars = Object.keys(process.env)
    .filter(key => key.startsWith('NEXT_PUBLIC_'));

  const sensitivePatterns = [
    'SECRET',
    'KEY',
    'PASSWORD',
    'TOKEN',
    'PRIVATE'
  ];

  publicEnvVars.forEach(key => {
    if (sensitivePatterns.some(pattern => key.toUpperCase().includes(pattern))) {
      criticalIssues.push(`CRITICAL: Sensitive value may be exposed in public env var: ${key}`);
    }
  });

  return {
    isValid: criticalIssues.length === 0 && errors.length === 0,
    errors,
    warnings,
    criticalIssues
  };
}