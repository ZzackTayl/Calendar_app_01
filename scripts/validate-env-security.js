#!/usr/bin/env node

/**
 * Environment Security Validation Script
 */

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'ENCRYPTION_KEY'
];

const errors = [];
const warnings = [];

// Check required variables
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    errors.push(`Missing required variable: ${varName}`);
  }
});

// Check encryption key format
if (process.env.ENCRYPTION_KEY) {
  if (process.env.ENCRYPTION_KEY.length !== 64 || !/^[0-9a-fA-F]+$/.test(process.env.ENCRYPTION_KEY)) {
    errors.push('ENCRYPTION_KEY must be a 64-character hexadecimal string');
  }
}

// Check production settings
if (process.env.NODE_ENV === 'production') {
  if (process.env.ENABLE_DEMO_MODE === 'true') {
    errors.push('Demo mode must not be enabled in production');
  }
  
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://')) {
    errors.push('NEXTAUTH_URL must use HTTPS in production');
  }
}

if (errors.length > 0) {
  console.error('Environment security validation failed:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('Environment security warnings:');
  warnings.forEach(warning => console.warn(`- ${warning}`));
}

console.log('Environment security validation passed');
