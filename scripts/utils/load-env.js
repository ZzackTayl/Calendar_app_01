#!/usr/bin/env node

/**
 * Reusable environment loader for scripts
 * Prioritizes .env.local over .env for local development
 * Ensures consistent environment loading across all scripts
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvironment(options = {}) {
  const { silent = false, required = true } = options;
  
  // Determine environment files to check
  const localEnv = path.resolve(process.cwd(), '.env.local');
  const fallbackEnv = path.resolve(process.cwd(), '.env');
  const testEnv = process.env.TEST_ENV_FILE
    ? path.resolve(process.cwd(), process.env.TEST_ENV_FILE)
    : path.resolve(process.cwd(), 'config/testing/.env.testing.generated');
  
  // Check NODE_ENV for test environment
  const isTest = process.env.NODE_ENV === 'test';
  
  let loaded = false;
  let envFile = null;
  
  // Priority order: .env.test (if testing) > .env.local > .env
  if (isTest && fs.existsSync(testEnv)) {
    dotenv.config({ path: testEnv });
    envFile = path.relative(process.cwd(), testEnv);
    loaded = true;
  } else if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
    envFile = '.env.local';
    loaded = true;
  } else if (fs.existsSync(fallbackEnv)) {
    dotenv.config({ path: fallbackEnv });
    envFile = '.env';
    loaded = true;
  }
  
  // Handle loading results
  if (loaded) {
    if (!silent) {
      console.log(`✓ Loaded environment from ${envFile}`);
    }
  } else if (required) {
    console.error('❌ No environment file found (.env.local, .env, or config/testing/.env.testing.generated)');
    console.error('Please create a .env.local file with your configuration.');
    console.error('Generate a test bundle with: npm run prepare:test-env -- --out config/testing/.env.testing.generated');
    console.error('Or copy .env.example as a starting point:');
    console.error('  cp .env.example .env.local');
    process.exit(1);
  } else if (!silent) {
    console.warn('⚠️ No environment file found, using system environment variables');
  }
  
  // Validate critical environment variables
  const criticalVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = criticalVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0 && required) {
    console.error('❌ Missing critical environment variables:');
    missingVars.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error('\nPlease ensure these are set in your .env.local file');
    process.exit(1);
  }
  
  return { loaded, envFile };
}

// Export for use in other scripts
module.exports = { loadEnvironment };

// If run directly, just load the environment
if (require.main === module) {
  loadEnvironment();
}
