#!/usr/bin/env node

/**
 * Supabase Email Configuration Script
 * 
 * This script configures Supabase to enable email confirmations and
 * sets up proper email templates for production use.
 */

require('dotenv').config({ path: '.env.local' });

const https = require('https');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.INVITATION_FROM_EMAIL;
const FROM_NAME = process.env.INVITATION_FROM_NAME;

// Dynamic app URL detection
let APP_URL = 'https://calendar-app-01.vercel.app';
if (process.env.VERCEL_URL) {
  APP_URL = `https://${process.env.VERCEL_URL}`;
} else if (process.env.NODE_ENV === 'development') {
  APP_URL = 'http://localhost:3000';
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!RESEND_API_KEY || !FROM_EMAIL) {
  console.error('❌ Missing email configuration variables:');
  console.error('   RESEND_API_KEY');
  console.error('   INVITATION_FROM_EMAIL');
  console.error('');
  console.error('💡 These are required for SMTP email delivery.');
  console.error('   Without them, signup emails won\'t be sent.');
  process.exit(1);
}

/**
 * Make authenticated request to Supabase Management API
 */
function makeManagementRequest(path, method = 'GET', data = null) {
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    throw new Error('Invalid Supabase URL format');
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/config/auth${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
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
          resolve({ 
            status: res.statusCode, 
            data: response,
            headers: res.headers
          });
        } catch (error) {
          resolve({ 
            status: res.statusCode, 
            data: body,
            headers: res.headers
          });
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
 * Get current auth configuration
 */
async function getCurrentConfig() {
  console.log('🔍 Getting current auth configuration...');
  
  try {
    const response = await makeManagementRequest('');
    
    if (response.status === 200) {
      console.log('✅ Successfully retrieved auth config');
      return response.data;
    } else {
      console.log('⚠️  Could not retrieve auth config:', response.status);
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting auth config:', error.message);
    return null;
  }
}

/**
 * Update auth configuration for email confirmations
 */
async function updateAuthConfig() {
  console.log('🔧 Updating auth configuration...');
  console.log(`📧 SMTP: smtp.resend.com using API key: ${RESEND_API_KEY.substring(0, 10)}...`);
  console.log(`📨 From: ${FROM_NAME} <${FROM_EMAIL}>`);
  
  const authConfig = {
    SITE_URL: APP_URL,
    URI_ALLOW_LIST: [
      APP_URL,
      `${APP_URL}/auth/callback`,
      `${APP_URL}/auth/signin`,
      `${APP_URL}/dashboard`,
      'http://localhost:3000',
      'http://localhost:3000/auth/callback'
    ].join(','),
    ENABLE_SIGNUP: true,
    ENABLE_CONFIRMATIONS: true,
    ENABLE_EMAIL_CONFIRMATIONS: true,
    ENABLE_EMAIL_CHANGE_CONFIRMATIONS: true,
    MAILER_AUTOCONFIRM: false,
    MAILER_SECURE_EMAIL_CHANGE_ENABLED: true,
    MAILER_OTP_EXP: 86400, // 24 hours
    JWT_EXP: 3600, // 1 hour
    REFRESH_TOKEN_ROTATION_ENABLED: true,
    SECURITY_REFRESH_TOKEN_REUSE_INTERVAL: 10,
    EXTERNAL_EMAIL_ENABLED: true,
    EXTERNAL_ANONYMOUS_USERS_ENABLED: false,
    
    // SMTP Configuration for Resend
    SMTP_ADMIN_EMAIL: FROM_EMAIL,
    SMTP_HOST: 'smtp.resend.com',
    SMTP_PORT: 587,
    SMTP_USER: 'resend',
    SMTP_PASS: RESEND_API_KEY,
    SMTP_SENDER_NAME: FROM_NAME,
    
    // Email templates
    MAILER_SUBJECTS_CONFIRMATION: 'Confirm Your PolyHarmony Account',
    MAILER_SUBJECTS_INVITE: 'You Have Been Invited to PolyHarmony',
    MAILER_SUBJECTS_MAGIC_LINK: 'Your PolyHarmony Magic Link',
    MAILER_SUBJECTS_RECOVERY: 'Reset Your PolyHarmony Password',
    MAILER_SUBJECTS_EMAIL_CHANGE: 'Confirm Your New Email Address',
    
    // Custom email templates with proper styling
    MAILER_TEMPLATES_CONFIRMATION: `
      <h2>Welcome to PolyHarmony!</h2>
      <p>Thank you for signing up. Please click the link below to confirm your email address:</p>
      <p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Email Address</a></p>
      <p>If you didn't create an account with us, you can safely ignore this email.</p>
      <p>Best regards,<br>The PolyHarmony Team</p>
    `,
    
    MAILER_TEMPLATES_RECOVERY: `
      <h2>Reset Your Password</h2>
      <p>We received a request to reset your PolyHarmony password. Click the link below to create a new password:</p>
      <p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
      <p>Best regards,<br>The PolyHarmony Team</p>
    `,
    
    MAILER_TEMPLATES_MAGIC_LINK: `
      <h2>Your PolyHarmony Sign In Link</h2>
      <p>Click the link below to sign in to your account:</p>
      <p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Sign In</a></p>
      <p>If you didn't request this link, you can safely ignore this email.</p>
      <p>Best regards,<br>The PolyHarmony Team</p>
    `,
    
    MAILER_TEMPLATES_EMAIL_CHANGE: `
      <h2>Confirm Your New Email Address</h2>
      <p>Please click the link below to confirm your new email address:</p>
      <p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm New Email</a></p>
      <p>If you didn't request this change, please contact support immediately.</p>
      <p>Best regards,<br>The PolyHarmony Team</p>
    `
  };

  try {
    const response = await makeManagementRequest('', 'PATCH', authConfig);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Auth configuration updated successfully');
      return true;
    } else {
      console.error('❌ Failed to update auth config:', response.status);
      console.error('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error updating auth config:', error.message);
    return false;
  }
}

/**
 * Test email confirmation flow
 */
async function testEmailFlow() {
  console.log('🧪 Testing email confirmation setup...');
  
  // Create a test client to verify the configuration
  const { createClient } = require('@supabase/supabase-js');
  const testClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Attempt signup (should require email confirmation)
    const { data, error } = await testClient.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.log('⚠️  Test signup error (this may be expected):', error.message);
    } else if (data.user && !data.user.email_confirmed_at) {
      console.log('✅ Email confirmation flow is working correctly');
      console.log('   User created but email not confirmed yet');
      
      // Clean up test user
      const { createClient: createAdminClient } = require('@supabase/supabase-js');
      const adminClient = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await adminClient.auth.admin.deleteUser(data.user.id);
      console.log('🧹 Test user cleaned up');
      
      return true;
    } else {
      console.log('⚠️  Unexpected test result - email may be auto-confirmed');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing email flow:', error.message);
    return false;
  }
}

/**
 * Main configuration function
 */
async function main() {
  console.log('🚀 Configuring Supabase for email confirmations...\n');
  console.log(`📧 App URL: ${APP_URL}`);
  console.log(`🔗 Callback URL: ${APP_URL}/auth/callback\n`);

  // Step 1: Get current config
  const currentConfig = await getCurrentConfig();
  
  if (currentConfig) {
    console.log('Current email confirmation settings:');
    console.log(`  ENABLE_CONFIRMATIONS: ${currentConfig.ENABLE_CONFIRMATIONS}`);
    console.log(`  MAILER_AUTOCONFIRM: ${currentConfig.MAILER_AUTOCONFIRM}\n`);
  }

  // Step 2: Update configuration
  const updateSuccess = await updateAuthConfig();
  
  if (!updateSuccess) {
    console.log('\n❌ Configuration failed. Please check your credentials and try again.');
    process.exit(1);
  }

  // Step 3: Test the setup
  await testEmailFlow();

  console.log('\n✅ Configuration complete!');
  console.log('\n📝 What happens now:');
  console.log('1. New user signups will require email confirmation');
  console.log('2. Users will receive styled confirmation emails');
  console.log('3. Email confirmation is handled by /auth/callback route');
  console.log('4. Test with your 4 developer email addresses\n');
  
  console.log('🔧 Developer test emails should be:');
  console.log('   - Your primary development email');
  console.log('   - 3 additional test email addresses');
  console.log('   - All will receive proper confirmation emails\n');
  
  console.log('🎯 Next steps:');
  console.log('1. Test signup flow with one of your developer emails');
  console.log('2. Check that confirmation emails are received');
  console.log('3. Verify the auth callback route works correctly');
  console.log('4. Document the working configuration');
}

// Run the configuration
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Configuration failed:', error);
    process.exit(1);
  });
}

module.exports = { 
  getCurrentConfig, 
  updateAuthConfig, 
  testEmailFlow 
};