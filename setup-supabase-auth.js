#!/usr/bin/env node

/**
 * Supabase Authentication Setup Script
 * 
 * This script configures your Supabase project to enable email/password authentication.
 * Run this script to set up the necessary authentication settings.
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
async function checkAuthSettings() {
  console.log('🔍 Checking current authentication settings...');
  
  try {
    const response = await makeRequest('/auth/v1/settings');
    console.log('Current auth settings:', response);
    return response;
  } catch (error) {
    console.error('Error checking auth settings:', error.message);
    return null;
  }
}

/**
 * Update auth settings to enable email/password auth
 */
async function updateAuthSettings() {
  console.log('🔧 Updating authentication settings...');
  
  const authSettings = {
    site_url: 'https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app',
    additional_redirect_urls: [
      'https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app/auth/callback',
      'http://localhost:3000/auth/callback' // For local development
    ],
    jwt_expiry: 3600,
    enable_signup: true,
    enable_confirmations: true, // Enable email confirmations for production security
    enable_email_change_confirmations: true,
    enable_phone_confirmations: false,
    enable_phone_change_confirmations: false,
    enable_reauthentication_confirmations: true,
    mailer_autoconfirm: false, // Require email confirmation for security
    sms_autoconfirm: false,
    sms_max_frequency: 60,
    sms_otp_expiry: 60,
    sms_template: 'Your code is {{ .Code }}',
    sms_provider: 'twilio',
    mfa_enabled: false,
    saml_enabled: false,
    captcha_enabled: false,
    captcha_provider: 'turnstile',
    captcha_site_key: '',
    captcha_secret_key: '',
    security_password_hibp_enabled: true, // Enable HaveIBeenPwned password breach protection
    hook_enabled: false,
    hook_url: '',
    hook_secret: '',
    hook_events: [],
    hook_async: false,
    hook_retry_limit: 3,
    hook_timeout_ms: 1000,
    hook_headers: {},
    external_apple_enabled: false,
    external_apple_client_id: '',
    external_apple_secret: '',
    external_apple_additional_client_ids: [],
    external_azure_enabled: false,
    external_azure_client_id: '',
    external_azure_secret: '',
    external_azure_url: '',
    external_bitbucket_enabled: false,
    external_bitbucket_client_id: '',
    external_bitbucket_secret: '',
    external_discord_enabled: false,
    external_discord_client_id: '',
    external_discord_secret: '',
    external_facebook_enabled: false,
    external_facebook_client_id: '',
    external_facebook_secret: '',
    external_figma_enabled: false,
    external_figma_client_id: '',
    external_figma_secret: '',
    external_github_enabled: false,
    external_github_client_id: '',
    external_github_secret: '',
    external_gitlab_enabled: false,
    external_gitlab_client_id: '',
    external_gitlab_secret: '',
    external_gitlab_url: '',
    external_google_enabled: false,
    external_google_client_id: '',
    external_google_secret: '',
    external_google_additional_client_ids: [],
    external_kakao_enabled: false,
    external_kakao_client_id: '',
    external_kakao_secret: '',
    external_keycloak_enabled: false,
    external_keycloak_client_id: '',
    external_keycloak_secret: '',
    external_keycloak_url: '',
    external_linkedin_enabled: false,
    external_linkedin_client_id: '',
    external_linkedin_secret: '',
    external_notion_enabled: false,
    external_notion_client_id: '',
    external_notion_secret: '',
    external_slack_enabled: false,
    external_slack_client_id: '',
    external_slack_secret: '',
    external_spotify_enabled: false,
    external_spotify_client_id: '',
    external_spotify_secret: '',
    external_twitch_enabled: false,
    external_twitch_client_id: '',
    external_twitch_secret: '',
    external_twitter_enabled: false,
    external_twitter_client_id: '',
    external_twitter_secret: '',
    external_workos_enabled: false,
    external_workos_client_id: '',
    external_workos_secret: '',
    external_workos_url: '',
    external_zoom_enabled: false,
    external_zoom_client_id: '',
    external_zoom_secret: ''
  };

  try {
    const response = await makeRequest('/auth/v1/settings', 'PUT', authSettings);
    console.log('✅ Auth settings updated:', response);
    return response;
  } catch (error) {
    console.error('❌ Error updating auth settings:', error.message);
    return null;
  }
}

/**
 * Test authentication by creating a test user
 */
async function testAuth() {
  console.log('🧪 Testing authentication...');
  
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    email_confirm: true
  };

  try {
    const response = await makeRequest('/auth/v1/signup', 'POST', testUser);
    console.log('Test signup response:', response);
    return response;
  } catch (error) {
    console.error('Error testing auth:', error.message);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Setting up Supabase Authentication...\n');
  
  // Check current settings
  await checkAuthSettings();
  
  // Update settings
  await updateAuthSettings();
  
  // Test authentication
  await testAuth();
  
  console.log('\n✅ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Try signing up with a new account');
  console.log('2. Try signing in with the account you created');
  console.log('3. Check the browser console for any remaining errors');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkAuthSettings, updateAuthSettings, testAuth };
