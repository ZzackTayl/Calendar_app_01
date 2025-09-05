#!/usr/bin/env node

/**
 * Simple Environment Validation Script
 * Lightweight validation for CI/CD environments
 */

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Simple environment validation
 */
function validateEnvironment() {
  log('🔍 Simple Environment Validation');
  log('================================');

  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isTest = process.env.NODE_ENV === 'test';
  const isProduction = process.env.NODE_ENV === 'production';

  logInfo(`Environment: ${process.env.NODE_ENV || 'unknown'}`);
  logInfo(`CI Environment: ${isCI ? 'Yes' : 'No'}`);

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY'
  ];

  const optionalVars = [
    'NEXTAUTH_URL',
    'SENDGRID_API_KEY',
    'RESEND_API_KEY'
  ];

  let errors = 0;
  let warnings = 0;

  log('\nRequired Variables:');
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName}: Configured`);
    } else {
      if (isCI || isTest) {
        logWarning(`${varName}: Missing (expected in CI/test)`);
        warnings++;
      } else {
        logError(`${varName}: Missing`);
        errors++;
      }
    }
  }

  log('\nOptional Variables:');
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      logSuccess(`${varName}: Configured`);
    } else {
      logInfo(`${varName}: Not configured`);
    }
  }

  // Validate encryption key format if present
  if (process.env.ENCRYPTION_KEY) {
    const key = process.env.ENCRYPTION_KEY;
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      logSuccess('ENCRYPTION_KEY: Valid format');
    } else {
      logError('ENCRYPTION_KEY: Invalid format (must be 64-character hex)');
      errors++;
    }
  }

  // Production-specific checks
  if (isProduction) {
    log('\nProduction Checks:');
    
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://')) {
      logError('NEXTAUTH_URL: Must use HTTPS in production');
      errors++;
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
      logError('NEXT_PUBLIC_SUPABASE_URL: Must use HTTPS in production');
      errors++;
    }

    if (process.env.ENABLE_DEMO_MODE === 'true') {
      logError('ENABLE_DEMO_MODE: Must not be enabled in production');
      errors++;
    }
  }

  // Summary
  log('\n' + '='.repeat(40));
  log('Validation Summary');
  log('='.repeat(40));

  if (errors === 0 && warnings === 0) {
    logSuccess('All validation checks passed!');
  } else if (errors === 0) {
    logWarning(`Validation completed with ${warnings} warnings`);
    if (isCI || isTest) {
      logInfo('Warnings are acceptable in CI/test environments');
    }
  } else {
    logError(`Validation failed with ${errors} errors and ${warnings} warnings`);
  }

  // Exit codes
  if (errors > 0 && !isCI && !isTest) {
    log('\n❌ Environment validation failed');
    log('Please fix the errors above before proceeding');
    process.exit(1);
  } else if (errors > 0) {
    log('\n⚠️ Environment validation completed with errors');
    log('Errors are expected in CI/test environments');
    process.exit(0);
  } else {
    log('\n✅ Environment validation passed');
    process.exit(0);
  }
}

// Run validation
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };