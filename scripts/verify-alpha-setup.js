#!/usr/bin/env node

/**
 * Alpha Testing Setup Verification Script
 * 
 * This script verifies that all components of the alpha testing setup
 * are properly configured and ready for testing.
 */

require('dotenv').config({ path: '.env.local' });

async function verifyAlphaSetup() {
  console.log('🔍 Verifying Alpha Testing Setup...\\n');
  
  let allChecksPassed = true;
  
  // Check 1: Environment Variables
  console.log('1. Environment Variables Check');
  console.log('==============================');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INVITATION_FROM_EMAIL',
    'INVITATION_FROM_NAME'
  ];
  
  let envVarsCheckPassed = true;
  
  requiredEnvVars.forEach((envVar, index) => {
    const value = process.env[envVar];
    if (value) {
      console.log(`  ✓ ${envVar}: SET`);
    } else {
      console.log(`  ✗ ${envVar}: MISSING`);
      envVarsCheckPassed = false;
      allChecksPassed = false;
    }
  });
  
  console.log(`  Status: ${envVarsCheckPassed ? '✅ PASSED' : '❌ FAILED'}\\n`);
  
  // Check 2: Email Configuration
  console.log('2. Email System Check');
  console.log('====================');
  
  const emailProviders = [
    {
      name: 'SendGrid',
      envVars: ['SENDGRID_API_KEY']
    },
    {
      name: 'Resend',
      envVars: ['RESEND_API_KEY']
    },
    {
      name: 'AWS SES',
      envVars: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    },
    {
      name: 'SMTP',
      envVars: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
    }
  ];
  
  let emailProviderConfigured = false;
  
  for (const provider of emailProviders) {
    const allVarsSet = provider.envVars.every(envVar => process.env[envVar]);
    
    if (allVarsSet) {
      console.log(`  ✓ ${provider.name}: Configured`);
      emailProviderConfigured = true;
    }
  }
  
  if (!emailProviderConfigured) {
    console.log('  ℹ️  No email service provider configured (using ConsoleEmailProvider for testing)');
  }
  
  console.log(`  Status: ✅ PASSED\\n`);
  
  // Check 3: Required Files
  console.log('3. Required Files Check');
  console.log('======================');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'ALPHA_TESTING_GUIDE.md',
    'ALPHA_TEST_RESULTS_TEMPLATE.md',
    'INVITATION_SYSTEM_DEPLOYMENT.md',
    'scripts/prepare-alpha-test.js',
    'scripts/cleanup-alpha-test.js',
    'scripts/test-invitation-system.js',
    'scripts/test-email-system.js',
    'scripts/setup-env-variables.js',
    'supabase/migrations/20250824000001_invitation_system.sql'
  ];
  
  let filesCheckPassed = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${file}: EXISTS`);
    } else {
      console.log(`  ✗ ${file}: MISSING`);
      filesCheckPassed = false;
      allChecksPassed = false;
    }
  }
  
  console.log(`  Status: ${filesCheckPassed ? '✅ PASSED' : '❌ FAILED'}\\n`);
  
  // Check 4: Package.json Scripts
  console.log('4. Package.json Scripts Check');
  console.log('============================');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredScripts = [
    'alpha:test:prepare',
    'alpha:test:cleanup',
    'alpha:test:invitation',
    'alpha:test:email',
    'alpha:apply:migration',
    'alpha:setup:env'
  ];
  
  let scriptsCheckPassed = true;
  
  for (const script of requiredScripts) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✓ ${script}: CONFIGURED`);
    } else {
      console.log(`  ✗ ${script}: MISSING`);
      scriptsCheckPassed = false;
      allChecksPassed = false;
    }
  }
  
  console.log(`  Status: ${scriptsCheckPassed ? '✅ PASSED' : '❌ FAILED'}\\n`);
  
  // Final Summary
  console.log('=== SETUP VERIFICATION COMPLETE ===');
  
  if (allChecksPassed) {
    console.log('🎉 All checks passed! Your alpha testing setup is ready.');
    console.log('\\nNext steps:');
    console.log('1. Apply the database migration if not already done');
    console.log('2. Deploy your application to a staging environment');
    console.log('3. Run the preparation script: npm run alpha:test:prepare');
    console.log('4. Begin alpha testing following ALPHA_TESTING_GUIDE.md');
  } else {
    console.log('⚠️  Some checks failed. Please address the issues above.');
    console.log('\\nSee ALPHA_TESTING_SETUP_SUMMARY.md for detailed setup instructions.');
  }
}

// Run the verification script
if (require.main === module) {
  verifyAlphaSetup();
}

module.exports = { verifyAlphaSetup };