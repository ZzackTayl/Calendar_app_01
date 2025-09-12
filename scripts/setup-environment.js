#!/usr/bin/env node

/**
 * Environment Setup Helper Script
 * Helps users set up required environment variables for security
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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
 * Check if .env file exists
 */
function checkEnvFile() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      return file;
    }
  }
  return null;
}

/**
 * Read existing environment variables
 */
function readExistingEnv(envFile) {
  if (!envFile || !fs.existsSync(envFile)) {
    return {};
  }

  const content = fs.readFileSync(envFile, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key] = valueParts.join('=');
      }
    }
  });
  
  return env;
}

/**
 * Write environment file
 */
function writeEnvFile(envFile, variables) {
  const content = Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envFile, content + '\n');
}

/**
 * Setup environment variables interactively
 */
async function setupEnvironmentInteractive() {
  logSection('Interactive Environment Setup');
  
  const rl = createReadlineInterface();
  const existingEnvFile = checkEnvFile();
  const existingEnv = readExistingEnv(existingEnvFile);
  const newEnv = { ...existingEnv };

  try {
    log('This script will help you set up the required environment variables for security.', 'white');
    log('Press Enter to keep existing values or type new values.\n', 'yellow');

    // Supabase configuration
    logInfo('Supabase Configuration:');
    
    const supabaseUrl = await askQuestion(rl, 
      `Supabase URL ${existingEnv.NEXT_PUBLIC_SUPABASE_URL ? `(current: ${existingEnv.NEXT_PUBLIC_SUPABASE_URL})` : ''}: `
    );
    if (supabaseUrl) newEnv.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;

    const supabaseAnonKey = await askQuestion(rl, 
      `Supabase Anon Key ${existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '(current: ****)' : ''}: `
    );
    if (supabaseAnonKey) newEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;

    const supabaseServiceKey = await askQuestion(rl, 
      `Supabase Service Role Key ${existingEnv.SUPABASE_SERVICE_ROLE_KEY ? '(current: ****)' : ''}: `
    );
    if (supabaseServiceKey) newEnv.SUPABASE_SERVICE_ROLE_KEY = supabaseServiceKey;

    // NextAuth configuration
    logInfo('\nNextAuth Configuration:');
    
    const nextAuthUrl = await askQuestion(rl, 
      `NextAuth URL ${existingEnv.NEXTAUTH_URL ? `(current: ${existingEnv.NEXTAUTH_URL})` : '(e.g., http://localhost:3000)'}: `
    );
    if (nextAuthUrl) newEnv.NEXTAUTH_URL = nextAuthUrl;

    const generateSecret = await askQuestion(rl, 
      `Generate new NextAuth secret? ${existingEnv.NEXTAUTH_SECRET ? '(current exists)' : ''} (y/N): `
    );
    if (generateSecret.toLowerCase() === 'y' || !existingEnv.NEXTAUTH_SECRET) {
      newEnv.NEXTAUTH_SECRET = generateNextAuthSecret();
      logSuccess('Generated new NextAuth secret');
    }

    // Encryption key
    logInfo('\nEncryption Configuration:');
    
    const generateEncryption = await askQuestion(rl, 
      `Generate new encryption key? ${existingEnv.ENCRYPTION_KEY ? '(current exists)' : ''} (y/N): `
    );
    if (generateEncryption.toLowerCase() === 'y' || !existingEnv.ENCRYPTION_KEY) {
      newEnv.ENCRYPTION_KEY = generateEncryptionKey();
      logSuccess('Generated new encryption key');
    }

    // Email configuration (optional)
    logInfo('\nEmail Configuration (Optional):');
    
    const emailProvider = await askQuestion(rl, 
      'Email provider (sendgrid/resend/skip): '
    );
    
    if (emailProvider === 'sendgrid') {
      const sendgridKey = await askQuestion(rl, 'SendGrid API Key: ');
      if (sendgridKey) newEnv.SENDGRID_API_KEY = sendgridKey;
    } else if (emailProvider === 'resend') {
      const resendKey = await askQuestion(rl, 'Resend API Key: ');
      if (resendKey) newEnv.RESEND_API_KEY = resendKey;
    }

    // Write environment file
    const envFile = existingEnvFile || '.env.local';
    writeEnvFile(envFile, newEnv);
    
    logSuccess(`Environment variables saved to ${envFile}`);
    
    // Validate the configuration
    logInfo('\nValidating configuration...');
    
    // Set environment variables for validation
    Object.entries(newEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    const { validateEnvironmentVariables } = require('./initialize-production-security');
    const validation = validateEnvironmentVariables();
    
    if (validation.errors.length === 0) {
      logSuccess('All required environment variables are configured!');
    } else {
      logWarning('Some required variables are still missing:');
      validation.errors.forEach(error => logError(error));
    }

  } finally {
    rl.close();
  }
}

/**
 * Setup environment for development
 */
function setupDevelopmentEnvironment() {
  logSection('Development Environment Setup');
  
  const envFile = '.env.local';
  const existingEnv = readExistingEnv(envFile);
  
  const devEnv = {
    ...existingEnv,
    NODE_ENV: 'development',
    NEXTAUTH_URL: existingEnv.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: existingEnv.NEXTAUTH_SECRET || generateNextAuthSecret(),
    ENCRYPTION_KEY: existingEnv.ENCRYPTION_KEY || generateEncryptionKey()
  };

  // Only add Supabase vars if not already present
  if (!existingEnv.NEXT_PUBLIC_SUPABASE_URL) {
    logWarning('Supabase URL not configured - you will need to add this manually');
    devEnv.NEXT_PUBLIC_SUPABASE_URL = 'your-supabase-url';
  }
  
  if (!existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    logWarning('Supabase Anon Key not configured - you will need to add this manually');
    devEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-supabase-anon-key';
  }
  
  if (!existingEnv.SUPABASE_SERVICE_ROLE_KEY) {
    logWarning('Supabase Service Role Key not configured - you will need to add this manually');
    devEnv.SUPABASE_SERVICE_ROLE_KEY = 'your-supabase-service-role-key';
  }

  writeEnvFile(envFile, devEnv);
  
  logSuccess(`Development environment configured in ${envFile}`);
  logInfo('Generated secure keys for NextAuth and encryption');
  logWarning('Remember to update Supabase configuration with your actual values');
}

/**
 * Setup environment for testing
 */
function setupTestEnvironment() {
  logSection('Test Environment Setup');
  
  const envFile = '.env.test';
  
  const testEnv = {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://lkkmhmeywoczjskqvljh.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra21obWV5d29jempza3F2bGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDA0NDAsImV4cCI6MjA3Mjg3NjQ0MH0.VE1FLNQbehFnL7i88i2j1JAvu2EcJtS8bfhTcHmGfxA',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxra21obWV5d29jempza3F2bGpoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMDQ0MCwiZXhwIjoyMDcyODc2NDQwfQ.5s8f7z3QnGOq7WMIxw6NgVYjZ-7tSlF7IvzjRoM6A_Y',
    NEXTAUTH_SECRET: 'test-secret-key-that-is-at-least-32-characters-long',
    NEXTAUTH_URL: 'https://test.example.com',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  };

  writeEnvFile(envFile, testEnv);
  
  logSuccess(`Test environment configured in ${envFile}`);
}

/**
 * Main setup function
 */
async function main() {
  log('🔧 Environment Setup Helper', 'bright');
  log('This script helps you configure environment variables for security.\n', 'white');

  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    await setupEnvironmentInteractive();
  } else if (args.includes('--dev') || args.includes('-d')) {
    setupDevelopmentEnvironment();
  } else if (args.includes('--test') || args.includes('-t')) {
    setupTestEnvironment();
  } else {
    log('Usage:', 'yellow');
    log('  node scripts/setup-environment.js --interactive  # Interactive setup', 'white');
    log('  node scripts/setup-environment.js --dev         # Quick development setup', 'white');
    log('  node scripts/setup-environment.js --test        # Test environment setup', 'white');
    log('', 'white');
    log('Options:', 'yellow');
    log('  -i, --interactive    Interactive environment setup', 'white');
    log('  -d, --dev           Quick development environment setup', 'white');
    log('  -t, --test          Test environment setup', 'white');
    
    // Default to development setup
    logInfo('No option specified, running development setup...');
    setupDevelopmentEnvironment();
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
  setupEnvironmentInteractive,
  setupDevelopmentEnvironment,
  setupTestEnvironment,
  generateEncryptionKey,
  generateNextAuthSecret
};