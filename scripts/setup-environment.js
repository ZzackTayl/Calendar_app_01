#!/usr/bin/env node

/**
 * Environment Setup Helper Script - SECURITY HARDENED VERSION
 * 
 * SECURITY IMPROVEMENTS:
 * ✅ NEVER ships live keys - only safe placeholders and templates
 * ✅ Validates existing files for live keys and protects them from overwrite
 * ✅ Uses separate safe templates for .env.local and .env.test
 * ✅ Prevents accidental exposure of sensitive data in interactive mode
 * ✅ Includes comprehensive security validation before writing files
 * ✅ Provides clear warnings and instructions for safe key management
 * 
 * TEMPLATES:
 * - .env.local: Uses REPLACE_WITH_YOUR_* placeholders for development
 * - .env.test: Uses SAMPLE_* placeholders for testing
 * 
 * SECURITY FEATURES:
 * - Live key detection using pattern matching
 * - File protection when live keys are detected
 * - Safe placeholder generation
 * - Clear security warnings and instructions
 * - No real keys ever written to files
 * 
 * USAGE:
 * - node scripts/setup-environment.js --dev         # Safe development setup
 * - node scripts/setup-environment.js --test        # Safe test environment setup  
 * - node scripts/setup-environment.js --interactive # Safe interactive setup
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// SECURITY CONSTANTS - Never use real keys in templates
const SECURITY_WARNING = '⚠️  SECURITY WARNING: This script NEVER ships live keys!';
const PLACEHOLDER_PREFIX = 'REPLACE_WITH_YOUR_';
const SAMPLE_PREFIX = 'SAMPLE_';

// Safe environment templates - NO REAL KEYS EVER
const ENV_TEMPLATES = {
  local: {
    NODE_ENV: 'development',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXTAUTH_SECRET: `${PLACEHOLDER_PREFIX}NEXTAUTH_SECRET`,
    ENCRYPTION_KEY: `${PLACEHOLDER_PREFIX}ENCRYPTION_KEY`,
    NEXT_PUBLIC_SUPABASE_URL: `${PLACEHOLDER_PREFIX}SUPABASE_URL`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: `${PLACEHOLDER_PREFIX}SUPABASE_ANON_KEY`,
    SUPABASE_SERVICE_ROLE_KEY: `${PLACEHOLDER_PREFIX}SUPABASE_SERVICE_ROLE_KEY`,
    SENDGRID_API_KEY: `${PLACEHOLDER_PREFIX}SENDGRID_API_KEY`,
    RESEND_API_KEY: `${PLACEHOLDER_PREFIX}RESEND_API_KEY`
  },
  test: {
    NODE_ENV: 'test',
    NEXTAUTH_URL: 'https://test.example.com',
    NEXTAUTH_SECRET: 'test-secret-key-that-is-at-least-32-characters-long',
    ENCRYPTION_KEY: `${SAMPLE_PREFIX}ENCRYPTION_KEY_64_CHARS_LONG`,
    NEXT_PUBLIC_SUPABASE_URL: `${SAMPLE_PREFIX}SUPABASE_URL`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: `${SAMPLE_PREFIX}SUPABASE_ANON_KEY`,
    SUPABASE_SERVICE_ROLE_KEY: `${SAMPLE_PREFIX}SUPABASE_SERVICE_ROLE_KEY`,
    SENDGRID_API_KEY: `${SAMPLE_PREFIX}SENDGRID_API_KEY`,
    RESEND_API_KEY: `${SAMPLE_PREFIX}RESEND_API_KEY`
  }
};

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
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
 * SECURITY VALIDATION - Ensure no live keys are ever written
 */
function validateNoLiveKeys(envVars) {
  const dangerousPatterns = [
    /^eyJ[A-Za-z0-9+/=]+$/, // JWT tokens
    /^sk_[A-Za-z0-9]+$/, // Stripe keys
    /^pk_[A-Za-z0-9]+$/, // Stripe keys
    /^[A-Za-z0-9]{32,}$/, // Generic long keys
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/, // Real Supabase URLs
  ];
  
  const violations = [];
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      dangerousPatterns.forEach(pattern => {
        if (pattern.test(value) && !value.includes(PLACEHOLDER_PREFIX) && !value.includes(SAMPLE_PREFIX)) {
          violations.push(`${key} appears to contain a live key: ${value.substring(0, 20)}...`);
        }
      });
    }
  });
  
  if (violations.length > 0) {
    logError('SECURITY VIOLATION DETECTED:');
    violations.forEach(violation => logError(violation));
    throw new Error('Script prevented writing live keys to environment files');
  }
}

/**
 * Check if environment file exists and is safe to modify
 */
function checkExistingEnvFile(envFile) {
  if (!fs.existsSync(envFile)) {
    return { exists: false, isSafe: true, content: {} };
  }
  
  const content = fs.readFileSync(envFile, 'utf8');
  const env = {};
  let hasLiveKeys = false;
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        env[key] = value;
        
        // Check for live keys in existing file
        if (value && !value.includes(PLACEHOLDER_PREFIX) && !value.includes(SAMPLE_PREFIX)) {
          const dangerousPatterns = [
            /^eyJ[A-Za-z0-9+/=]+$/,
            /^sk_[A-Za-z0-9]+$/,
            /^pk_[A-Za-z0-9]+$/,
            /^[A-Za-z0-9]{32,}$/,
            /^https:\/\/[a-z0-9-]+\.supabase\.co$/
          ];
          
          if (dangerousPatterns.some(pattern => pattern.test(value))) {
            hasLiveKeys = true;
          }
        }
      }
    }
  });
  
  return { 
    exists: true, 
    isSafe: !hasLiveKeys, 
    content: env,
    hasLiveKeys 
  };
}

/**
 * Create readline interface
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask user a question
 */
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Generate secure encryption key
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate secure NextAuth secret
 */
function generateNextAuthSecret() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * SAFE: Read existing environment variables (replaces old unsafe function)
 */
function readExistingEnvSafe(envFile) {
  const fileCheck = checkExistingEnvFile(envFile);
  return fileCheck.content;
}

/**
 * SAFE: Write environment file with security validation
 */
function writeEnvFileSafe(envFile, variables) {
  // SECURITY CHECK: Validate no live keys
  validateNoLiveKeys(variables);
  
  // Add security header comment
  const header = `# Environment Configuration
# Generated by setup-environment.js (SAFE VERSION)
# ${SECURITY_WARNING}
# 
# IMPORTANT: Replace all placeholder values with your actual keys
# Never commit real keys to version control
#
`;
  
  const content = header + Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
  
  fs.writeFileSync(envFile, content);
  logSuccess(`Environment file written safely to ${envFile}`);
}

/**
 * SAFE: Interactive environment setup (never exposes live keys)
 */
async function setupEnvironmentInteractiveSafe() {
  logSection('SAFE Interactive Environment Setup');
  
  log(SECURITY_WARNING, 'red');
  log('This script will NEVER expose or write live keys to files.', 'yellow');
  log('All sensitive values will be replaced with safe placeholders.\n', 'yellow');
  
  const rl = createReadlineInterface();
  
  try {
    // Check existing files for live keys
    const envFiles = ['.env.local', '.env.test'];
    let hasLiveKeys = false;
    
    for (const envFile of envFiles) {
      const fileCheck = checkExistingEnvFile(envFile);
      if (fileCheck.hasLiveKeys) {
        logWarning(`Found live keys in ${envFile} - these will be preserved`);
        hasLiveKeys = true;
      }
    }
    
    if (hasLiveKeys) {
      logInfo('Existing files contain live keys - they will be preserved and not overwritten');
    }
    
    // Ask user which environment to setup
    const envType = await askQuestion(rl, 'Which environment? (local/test): ');
    
    if (envType !== 'local' && envType !== 'test') {
      logError('Invalid environment type. Use "local" or "test"');
      return;
    }
    
    const envFile = envType === 'local' ? '.env.local' : '.env.test';
    const template = ENV_TEMPLATES[envType];
    
    // Check if file exists and has live keys
    const fileCheck = checkExistingEnvFile(envFile);
    
    if (fileCheck.hasLiveKeys) {
      logWarning(`File ${envFile} contains live keys and will not be overwritten`);
      logInfo('To update this file safely, manually replace the placeholder values');
      return;
    }
    
    // Use safe template (no real keys generated)
    const newEnv = { ...template };
    
    // Write safe template
    writeEnvFileSafe(envFile, newEnv);
    
    logSuccess(`Safe ${envType} environment template created in ${envFile}`);
    logInfo('Next steps:');
    log('1. Replace all placeholder values with your actual keys', 'white');
    log('2. Never commit real keys to version control', 'white');
    log('3. Use environment-specific values for each deployment', 'white');

  } finally {
    rl.close();
  }
}

/**
 * SAFE: Setup environment for development (never writes live keys)
 */
function setupDevelopmentEnvironmentSafe() {
  logSection('SAFE Development Environment Setup');
  
  log(SECURITY_WARNING, 'red');
  log('Creating safe development environment template...\n', 'yellow');
  
  const envFile = '.env.local';
  const fileCheck = checkExistingEnvFile(envFile);
  
  if (fileCheck.hasLiveKeys) {
    logWarning(`File ${envFile} contains live keys and will not be overwritten`);
    logInfo('To update this file safely, manually replace the placeholder values');
    return;
  }
  
  // Use safe template (no real keys generated)
  const devEnv = { ...ENV_TEMPLATES.local };
  
  // Preserve any existing safe values
  Object.entries(fileCheck.content).forEach(([key, value]) => {
    if (value && (value.includes(PLACEHOLDER_PREFIX) || value.includes(SAMPLE_PREFIX))) {
      devEnv[key] = value;
    }
  });

  writeEnvFileSafe(envFile, devEnv);
  
  logSuccess(`Safe development environment template created in ${envFile}`);
  logInfo('Next steps:');
  log('1. Replace REPLACE_WITH_YOUR_* values with your actual keys', 'white');
  log('2. Never commit real keys to version control', 'white');
  log('3. Use different keys for each environment', 'white');
}

/**
 * SAFE: Setup environment for testing (never writes live keys)
 */
function setupTestEnvironmentSafe() {
  logSection('SAFE Test Environment Setup');
  
  log(SECURITY_WARNING, 'red');
  log('Creating safe test environment template...\n', 'yellow');
  
  const envFile = '.env.test';
  const fileCheck = checkExistingEnvFile(envFile);
  
  if (fileCheck.hasLiveKeys) {
    logWarning(`File ${envFile} contains live keys and will not be overwritten`);
    logInfo('To update this file safely, manually replace the placeholder values');
    return;
  }
  
  // Use safe template - NO REAL KEYS EVER
  const testEnv = { ...ENV_TEMPLATES.test };
  
  // Preserve any existing safe values
  Object.entries(fileCheck.content).forEach(([key, value]) => {
    if (value && (value.includes(PLACEHOLDER_PREFIX) || value.includes(SAMPLE_PREFIX))) {
      testEnv[key] = value;
    }
  });

  writeEnvFileSafe(envFile, testEnv);
  
  logSuccess(`Safe test environment template created in ${envFile}`);
  logInfo('Next steps:');
  log('1. Replace SAMPLE_* values with your test environment keys', 'white');
  log('2. Use a separate Supabase project for testing', 'white');
  log('3. Never use production keys in test environment', 'white');
}

/**
 * SAFE: Main setup function (uses only safe versions)
 */
async function main() {
  log('🔧 SAFE Environment Setup Helper', 'bright');
  log(SECURITY_WARNING, 'red');
  log('This script NEVER ships live keys - only safe placeholders and templates.\n', 'white');

  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    await setupEnvironmentInteractiveSafe();
  } else if (args.includes('--dev') || args.includes('-d')) {
    setupDevelopmentEnvironmentSafe();
  } else if (args.includes('--test') || args.includes('-t')) {
    setupTestEnvironmentSafe();
  } else {
    log('Usage:', 'yellow');
    log('  node scripts/setup-environment.js --interactive  # Safe interactive setup', 'white');
    log('  node scripts/setup-environment.js --dev         # Safe development setup', 'white');
    log('  node scripts/setup-environment.js --test        # Safe test environment setup', 'white');
    log('', 'white');
    log('Options:', 'yellow');
    log('  -i, --interactive    Safe interactive environment setup', 'white');
    log('  -d, --dev           Safe development environment setup', 'white');
    log('  -t, --test          Safe test environment setup', 'white');
    log('', 'white');
    log('Security Features:', 'yellow');
    log('  ✅ Never writes live keys to files', 'green');
    log('  ✅ Uses safe placeholders and templates', 'green');
    log('  ✅ Validates existing files for live keys', 'green');
    log('  ✅ Preserves existing live keys when found', 'green');
    
    // Default to development setup
    logInfo('No option specified, running safe development setup...');
    setupDevelopmentEnvironmentSafe();
  }
}

// Run the setup
if (require.main === module) {
  main().catch(error => {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  // Safe versions only
  setupEnvironmentInteractiveSafe,
  setupDevelopmentEnvironmentSafe,
  setupTestEnvironmentSafe,
  generateEncryptionKey,
  generateNextAuthSecret,
  validateNoLiveKeys,
  checkExistingEnvFile,
  writeEnvFileSafe,
  ENV_TEMPLATES
};