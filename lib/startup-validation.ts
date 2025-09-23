/**
 * Centralized Startup Validation System
 *
 * This module provides a centralized validation function that runs all critical
 * startup checks to ensure the application is properly configured and ready to run.
 *
 * It consolidates environment validation, security configuration validation,
 * and database connectivity checks into a single, reliable startup process.
 */

import { initializeEnvironment } from './config/env-validation';
import { getRuntimeConfig } from './runtime-config';
import { createAdminClient } from './supabase/server';

/**
 * Validates security configuration based on the current runtime profile
 */
export function validateSecurityConfig(): void {
  console.log('Validating security configuration...');

  const config = getRuntimeConfig();

  // Validate that required security settings are properly configured
  if (!config.security.csrfMode) {
    throw new Error('CSRF mode not configured');
  }

  if (!config.security.rateLimits) {
    throw new Error('Rate limiting configuration missing');
  }

  if (!config.security.session) {
    throw new Error('Session configuration missing');
  }

  if (!config.security.features) {
    throw new Error('Security features configuration missing');
  }

  // Validate environment-specific security requirements
  if (config.environment.isProd) {
    if (config.security.csrfMode === 'disabled') {
      throw new Error('CSRF cannot be disabled in production');
    }

    if (!config.security.features.enableDetailedAuditLogging) {
      throw new Error('Detailed audit logging must be enabled in production');
    }
  }

  console.log(`✅ Security configuration validated for profile: ${config.profile}`);
}

/**
 * Validates database connectivity by performing a simple test query
 */
export async function validateDatabaseConnection(): Promise<void> {
  console.log('Validating database connection...');

  try {
    const supabase = createAdminClient();

    // Perform a simple connectivity test using a portable SELECT 1 query
    const { data, error } = await supabase
      .from('').select('1 as test')
      .single();

    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('Database connection test returned no data');
    }

    console.log('✅ Database connection validated');
  } catch (error) {
    console.error('❌ Database validation failed:', error);
    throw error;
  }
}

/**
 * Centralized application startup validation
 *
 * This function should be called at application startup to ensure all
 * critical systems are properly configured and operational.
 *
 * It runs all validation checks in the correct order:
 * 1. Environment variables
 * 2. Security configuration
 * 3. Database connectivity
 */
export async function validateApplicationStartup(): Promise<void> {
  console.log('🚀 Starting application startup validation...');

  try {
    // Step 1: Validate environment variables
    console.log('1/3 Validating environment variables...');
    initializeEnvironment();

    // Step 2: Validate security configuration
    console.log('2/3 Validating security configuration...');
    validateSecurityConfig();

    // Step 3: Validate database connection
    console.log('3/3 Validating database connection...');
    await validateDatabaseConnection();

    console.log('✅ Application startup validation complete');

  } catch (error) {
    console.error('❌ Application startup validation failed:', error);
    throw error;
  }
}

// Export individual validation functions for testing or manual validation
export { initializeEnvironment };