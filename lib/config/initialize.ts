/**
 * Configuration Initialization Module
 * 
 * This module provides a centralized initialization system for all configuration
 * and security systems. It should be called at application startup to ensure
 * proper validation and setup.
 */

import { initializeEnvironment } from './env-validation';
import { initializeSecretsManager } from './secrets-manager';

/**
 * Initialize all configuration systems
 * Call this once at application startup
 */
export async function initializeConfiguration(): Promise<void> {
  console.log('🔧 Initializing application configuration...');
  
  try {
    // Step 1: Initialize environment validation
    console.log('1/2 Validating environment variables...');
    initializeEnvironment();
    
    // Step 2: Initialize secrets management
    console.log('2/2 Initializing secrets manager...');
    initializeSecretsManager();
    
    console.log('✅ Configuration initialization complete');
    
  } catch (error) {
    console.error('❌ Configuration initialization failed:', error);
    throw error;
  }
}

/**
 * Configuration health check
 * Can be used for runtime monitoring
 */
export function checkConfigurationHealth(): {
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message?: string }>;
} {
  const checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message?: string }> = [];
  
  try {
    // Check environment validation
    const { validateEnvironment } = require('./env-validation');
    const envResult = validateEnvironment();
    
    if (envResult.success) {
      checks.push({ name: 'Environment Variables', status: 'pass' });
      
      if (envResult.warnings && envResult.warnings.length > 0) {
        checks.push({ 
          name: 'Environment Warnings', 
          status: 'warn', 
          message: `${envResult.warnings.length} warnings found`
        });
      }
    } else {
      checks.push({ 
        name: 'Environment Variables', 
        status: 'fail', 
        message: `${envResult.errors?.length || 0} errors found`
      });
    }
    
    // Check secrets management
    const { secrets } = require('./secrets-manager');
    const audit = secrets.auditSecrets();
    
    if (audit.missing.length === 0 && audit.securityIssues.length === 0) {
      checks.push({ name: 'Secrets Management', status: 'pass' });
    } else if (audit.missing.length > 0) {
      checks.push({ 
        name: 'Secrets Management', 
        status: 'fail', 
        message: `${audit.missing.length} missing secrets`
      });
    } else {
      checks.push({ 
        name: 'Secrets Management', 
        status: 'warn', 
        message: `${audit.securityIssues.length} security issues`
      });
    }
    
    if (audit.needsRotation.length > 0) {
      checks.push({ 
        name: 'Secret Rotation', 
        status: 'warn', 
        message: `${audit.needsRotation.length} secrets need rotation`
      });
    } else {
      checks.push({ name: 'Secret Rotation', status: 'pass' });
    }
    
  } catch (error) {
    checks.push({ 
      name: 'Configuration System', 
      status: 'fail', 
      message: `System error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
  
  // Determine overall status
  const hasFailures = checks.some(check => check.status === 'fail');
  const hasWarnings = checks.some(check => check.status === 'warn');
  
  let status: 'healthy' | 'warning' | 'error';
  if (hasFailures) {
    status = 'error';
  } else if (hasWarnings) {
    status = 'warning';
  } else {
    status = 'healthy';
  }
  
  return { status, checks };
}

/**
 * Safe configuration getter that handles initialization
 */
export function getSafeConfig(): Record<string, any> {
  try {
    const { config } = require('./env-validation');
    const { secrets } = require('./secrets-manager');
    
    return {
      environment: config,
      secrets: secrets.getSafeConfig()
    };
  } catch (error) {
    console.warn('Configuration not yet initialized, returning minimal config');
    return {
      environment: { env: process.env.NODE_ENV || 'development' },
      secrets: {}
    };
  }
}

// Auto-initialize in non-test environments
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  // Only initialize on server-side, not in browser
  initializeConfiguration().catch(error => {
    console.error('Failed to initialize configuration:', error);
    // Don't exit process in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}