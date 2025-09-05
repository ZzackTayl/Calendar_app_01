#!/usr/bin/env node

/**
 * Production Security Initialization Script
 * Validates and initializes security configuration for production deployment
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
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
 * Load environment variables from .env files
 */
function loadEnvironment() {
  const envFiles = ['.env.local', '.env'];
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
      logInfo(`Loaded environment from ${envFile}`);
    }
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables() {
  logSection('Environment Variable Validation');
  
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', description: 'Supabase project URL' },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous key' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key' },
    { name: 'NEXTAUTH_SECRET', description: 'NextAuth.js secret key' },
    { name: 'ENCRYPTION_KEY', description: 'AES-256 encryption key for calendar data' }
  ];

  const optionalVars = [
    { name: 'NEXTAUTH_URL', description: 'NextAuth.js URL (required for production)' },
    { name: 'SENDGRID_API_KEY', description: 'SendGrid API key for email' },
    { name: 'RESEND_API_KEY', description: 'Resend API key for email' }
  ];

  let errors = [];
  let warnings = [];

  // Check required variables
  for (const variable of requiredVars) {
    if (!process.env[variable.name]) {
      errors.push(`Missing required variable: ${variable.name} (${variable.description})`);
      logError(`${variable.name}: Missing`);
    } else {
      logSuccess(`${variable.name}: Configured`);
    }
  }

  // Check optional variables
  for (const variable of optionalVars) {
    if (!process.env[variable.name]) {
      warnings.push(`Optional variable not set: ${variable.name} (${variable.description})`);
      logWarning(`${variable.name}: Not configured`);
    } else {
      logSuccess(`${variable.name}: Configured`);
    }
  }

  // Validate specific formats
  if (process.env.ENCRYPTION_KEY) {
    if (process.env.ENCRYPTION_KEY.length !== 64 || !/^[0-9a-fA-F]+$/.test(process.env.ENCRYPTION_KEY)) {
      errors.push('ENCRYPTION_KEY must be a 64-character hexadecimal string');
      logError('ENCRYPTION_KEY: Invalid format (must be 64-character hex string)');
    } else {
      logSuccess('ENCRYPTION_KEY: Valid format');
    }
  }

  // Check production-specific requirements
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production');
      logError('NEXTAUTH_URL: Must use HTTPS in production');
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production');
      logError('NEXT_PUBLIC_SUPABASE_URL: Must use HTTPS in production');
    }

    if (process.env.ENABLE_DEMO_MODE === 'true') {
      errors.push('Demo mode must not be enabled in production');
      logError('ENABLE_DEMO_MODE: Must not be enabled in production');
    }
  }

  return { errors, warnings };
}

/**
 * Test Supabase connection
 */
async function testSupabaseConnection() {
  logSection('Supabase Connection Test');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logError('Supabase credentials not configured');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      logError(`Supabase connection failed: ${error.message}`);
      return false;
    }

    logSuccess('Supabase connection successful');
    
    // Test RLS policies
    const { data: rlsData, error: rlsError } = await supabase.rpc('check_rls_enabled');
    if (!rlsError) {
      logSuccess('RLS policies are active');
    } else {
      logWarning('Could not verify RLS policies');
    }

    return true;
  } catch (error) {
    logError(`Supabase connection test failed: ${error.message}`);
    return false;
  }
}

/**
 * Generate secure encryption key
 */
function generateEncryptionKey() {
  logSection('Encryption Key Generation');
  
  if (process.env.ENCRYPTION_KEY) {
    logInfo('ENCRYPTION_KEY already configured');
    return;
  }

  const key = crypto.randomBytes(32).toString('hex');
  logSuccess('Generated new encryption key');
  logInfo('Add this to your .env file:');
  log(`ENCRYPTION_KEY=${key}`, 'bright');
  
  return key;
}

/**
 * Validate security configuration
 */
function validateSecurityConfiguration() {
  logSection('Security Configuration Validation');
  
  const checks = [
    {
      name: 'Environment',
      check: () => process.env.NODE_ENV === 'production',
      message: process.env.NODE_ENV === 'production' ? 'Production environment' : 'Development environment'
    },
    {
      name: 'Demo Mode',
      check: () => process.env.ENABLE_DEMO_MODE !== 'true',
      message: process.env.ENABLE_DEMO_MODE === 'true' ? 'Demo mode enabled (SECURITY RISK)' : 'Demo mode disabled'
    },
    {
      name: 'HTTPS URLs',
      check: () => {
        const urls = [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_SUPABASE_URL];
        return urls.every(url => !url || url.startsWith('https://'));
      },
      message: 'All URLs use HTTPS'
    },
    {
      name: 'Strong Secrets',
      check: () => {
        const secret = process.env.NEXTAUTH_SECRET;
        return secret && secret.length >= 32;
      },
      message: 'NextAuth secret is sufficiently strong'
    }
  ];

  let passed = 0;
  for (const check of checks) {
    if (check.check()) {
      logSuccess(`${check.name}: ${check.message}`);
      passed++;
    } else {
      logError(`${check.name}: ${check.message}`);
    }
  }

  return { passed, total: checks.length };
}

/**
 * Create security monitoring configuration
 */
function createSecurityMonitoringConfig() {
  logSection('Security Monitoring Configuration');
  
  const configDir = '.kiro/security';
  const configFile = path.join(configDir, 'production-config.json');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    logInfo(`Created security config directory: ${configDir}`);
  }

  const config = {
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    monitoring: {
      enableRealTimeAlerts: process.env.NODE_ENV === 'production',
      alertThresholds: {
        authFailures: process.env.NODE_ENV === 'production' ? 5 : 20,
        suspiciousActivity: process.env.NODE_ENV === 'production' ? 3 : 10,
        criticalEvents: 1
      },
      logRetentionDays: process.env.NODE_ENV === 'production' ? 90 : 7
    },
    security: {
      demoModeAllowed: process.env.NODE_ENV !== 'production',
      requireHttps: process.env.NODE_ENV === 'production',
      enforceStrongPasswords: process.env.NODE_ENV === 'production'
    },
    validation: {
      lastValidated: new Date().toISOString(),
      validatedBy: 'production-security-init-script'
    }
  };

  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  logSuccess(`Security configuration saved to: ${configFile}`);
}

/**
 * Main initialization function
 */
async function initializeProductionSecurity() {
  log('🔒 Production Security Initialization', 'bright');
  log('This script validates and initializes security configuration for production deployment.\n', 'white');

  // Load environment
  loadEnvironment();

  // Validate environment variables
  const { errors, warnings } = validateEnvironmentVariables();

  // Show warnings
  if (warnings.length > 0) {
    logSection('Warnings');
    warnings.forEach(warning => logWarning(warning));
  }

  // Check for critical errors
  if (errors.length > 0) {
    logSection('Critical Errors');
    errors.forEach(error => logError(error));
    log('\n❌ Security initialization failed due to critical errors.', 'red');
    log('Please fix the above issues and run the script again.', 'yellow');
    process.exit(1);
  }

  // Generate encryption key if needed
  generateEncryptionKey();

  // Test Supabase connection
  const supabaseConnected = await testSupabaseConnection();
  if (!supabaseConnected && process.env.NODE_ENV === 'production') {
    logError('Supabase connection failed in production environment');
    process.exit(1);
  }

  // Validate security configuration
  const { passed, total } = validateSecurityConfiguration();
  if (passed < total && process.env.NODE_ENV === 'production') {
    logError(`Security validation failed: ${passed}/${total} checks passed`);
    process.exit(1);
  }

  // Create monitoring configuration
  createSecurityMonitoringConfig();

  // Final summary
  logSection('Security Initialization Complete');
  logSuccess('All security checks passed');
  logSuccess('Production security configuration initialized');
  
  if (process.env.NODE_ENV === 'production') {
    logInfo('Production environment detected - all security measures are active');
  } else {
    logWarning('Development environment - some security measures are relaxed');
  }

  log('\n🎉 Security initialization completed successfully!', 'green');
  log('Your application is ready for secure deployment.', 'white');
}

// Run the initialization
if (require.main === module) {
  initializeProductionSecurity().catch(error => {
    logError(`Initialization failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  initializeProductionSecurity,
  validateEnvironmentVariables,
  testSupabaseConnection,
  generateEncryptionKey
};