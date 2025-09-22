#!/usr/bin/env node

/**
 * Enable Supabase Leaked Password Protection
 *
 * This script enables the HaveIBeenPwned password breach protection feature
 * in Supabase Auth to prevent users from using compromised passwords.
 */

const https = require('https');

// Your Supabase project configuration - SECURE ENVIRONMENT-BASED
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lkkmhmeywoczjskqvljh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

/**
 * Make a request to Supabase API
 */
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'lkkmhmeywoczjskqvljh.supabase.co',
      port: 443,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Check current auth settings
 */
async function checkCurrentSettings() {
  console.log('🔍 Checking current authentication settings...');

  try {
    const response = await makeRequest('/auth/v1/settings');
    if (response.status === 200) {
      const settings = response.data;
      console.log('✅ Current auth settings retrieved');
      console.log('🔒 Leaked Password Protection (security_password_hibp_enabled):',
        settings.security_password_hibp_enabled ? '✅ ENABLED' : '❌ DISABLED');
      return settings;
    } else {
      console.error('❌ Failed to retrieve current settings:', response);
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking current settings:', error.message);
    return null;
  }
}

/**
 * Enable leaked password protection
 */
async function enableLeakedPasswordProtection() {
  console.log('🔧 Enabling leaked password protection...');

  const authSettings = {
    security_password_hibp_enabled: true
  };

  try {
    const response = await makeRequest('/auth/v1/settings', 'PUT', authSettings);

    if (response.status === 200) {
      console.log('✅ Leaked password protection enabled successfully!');
      console.log('📋 Response:', response.data);
      return response.data;
    } else {
      console.error('❌ Failed to enable leaked password protection:', response);
      return null;
    }
  } catch (error) {
    console.error('❌ Error enabling leaked password protection:', error.message);
    return null;
  }
}

/**
 * Verify the setting was applied
 */
async function verifySetting() {
  console.log('🔍 Verifying leaked password protection setting...');

  try {
    const response = await makeRequest('/auth/v1/settings');
    if (response.status === 200) {
      const settings = response.data;
      const isEnabled = settings.security_password_hibp_enabled;

      if (isEnabled) {
        console.log('✅ SUCCESS: Leaked password protection is now ENABLED');
        console.log('🛡️  Users will now be prevented from using passwords found in data breaches');
      } else {
        console.error('❌ FAILED: Leaked password protection is still DISABLED');
      }

      return isEnabled;
    } else {
      console.error('❌ Failed to verify setting:', response);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying setting:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Enabling Supabase Leaked Password Protection...\n');

  // Check current settings
  const currentSettings = await checkCurrentSettings();
  if (!currentSettings) {
    console.error('❌ Could not retrieve current settings. Aborting.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Enable the feature
  const updateResult = await enableLeakedPasswordProtection();
  if (!updateResult) {
    console.error('❌ Failed to enable leaked password protection. Aborting.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Verify the setting
  const isVerified = await verifySetting();
  if (!isVerified) {
    console.error('❌ Verification failed. Please check manually.');
    process.exit(1);
  }

  console.log('\n✅ Setup complete!');
  console.log('\n📝 What this enables:');
  console.log('- Users cannot sign up with passwords found in data breaches');
  console.log('- Password reset requests will also be checked');
  console.log('- Enhanced security for all authentication flows');
  console.log('\n📚 For more information:');
  console.log('https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  checkCurrentSettings,
  enableLeakedPasswordProtection,
  verifySetting
};
