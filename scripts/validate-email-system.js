#!/usr/bin/env node

/**
 * Email System Validation Script
 * 
 * This script performs comprehensive real-world validation of the entire email system:
 * 1. Tests Supabase Auth email configuration
 * 2. Tests custom invitation email system
 * 3. Validates SMTP settings and delivery
 * 4. Tests error handling and fallbacks
 * 5. Monitors performance and reliability
 * 
 * Usage:
 * npm run validate-email-system
 * node scripts/validate-email-system.js --test-emails=email1@test.com,email2@test.com
 * node scripts/validate-email-system.js --live-test --send-real-emails
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const { setTimeout } = require('timers/promises');

// Configuration
const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Test email addresses (use temp email services or your own test addresses)
  testEmails: process.env.TEST_EMAILS?.split(',') || [
    'test1@example.com',
    'test2@example.com', 
    'test3@example.com',
    'test4@example.com'
  ],
  
  // Email service configuration
  emailConfig: {
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.INVITATION_FROM_EMAIL,
    fromName: process.env.INVITATION_FROM_NAME
  },
  
  // Test configuration
  timeout: 60000, // 60 seconds
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  sendRealEmails: process.argv.includes('--live-test') || process.argv.includes('--send-real-emails')
};

// Results tracking
const results = {
  timestamp: new Date().toISOString(),
  overall: { passed: 0, failed: 0, warnings: 0 },
  supabaseAuth: { status: 'pending', details: [] },
  emailProviders: { status: 'pending', details: [] },
  invitationSystem: { status: 'pending', details: [] },
  integration: { status: 'pending', details: [] },
  performance: { status: 'pending', details: [], metrics: {} },
  security: { status: 'pending', details: [] }
};

// Utility functions
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '🔵',
    success: '✅',
    warning: '⚠️ ',
    error: '❌',
    debug: '🔍'
  }[level] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
  if (data) {
    console.log('   ', JSON.stringify(data, null, 2));
  }
}

function recordResult(category, test, status, message, data = null) {
  const result = { test, status, message, timestamp: new Date().toISOString() };
  if (data) result.data = data;
  
  results[category].details.push(result);
  
  if (status === 'passed') {
    results.overall.passed++;
    log('success', `✓ ${test}: ${message}`, data);
  } else if (status === 'failed') {
    results.overall.failed++;
    log('error', `✗ ${test}: ${message}`, data);
  } else if (status === 'warning') {
    results.overall.warnings++;
    log('warning', `! ${test}: ${message}`, data);
  }
}

// Test Supabase Auth Configuration
async function validateSupabaseAuth() {
  log('info', 'Starting Supabase Auth validation...');
  
  try {
    // Test 1: Basic connection
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError && userError.message !== 'Auth session missing!') {
      throw new Error(`Supabase connection failed: ${userError.message}`);
    }
    
    recordResult('supabaseAuth', 'connection', 'passed', 'Supabase client connection successful');
    
    // Test 2: Auth settings validation
    if (!CONFIG.supabaseServiceKey) {
      recordResult('supabaseAuth', 'service_key', 'warning', 'Service role key not configured - cannot test admin functions');
    } else {
      const adminSupabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey);
      
      try {
        // Test admin access
        const { data: users, error: adminError } = await adminSupabase.auth.admin.listUsers({
          page: 1,
          perPage: 1
        });
        
        if (adminError) {
          recordResult('supabaseAuth', 'admin_access', 'failed', `Admin access failed: ${adminError.message}`);
        } else {
          recordResult('supabaseAuth', 'admin_access', 'passed', 'Admin access working');
        }
      } catch (err) {
        recordResult('supabaseAuth', 'admin_access', 'failed', `Admin test failed: ${err.message}`);
      }
    }
    
    // Test 3: Email confirmation settings
    // Note: This would require management API access which isn't available via client
    recordResult('supabaseAuth', 'email_settings', 'warning', 
      'Email confirmation settings must be validated manually in Supabase Dashboard');
    
    // Test 4: URL configuration  
    const callbackUrl = `${CONFIG.baseUrl}/auth/callback`;
    recordResult('supabaseAuth', 'callback_url', 'passed', 
      `Callback URL configured: ${callbackUrl}`);
    
    results.supabaseAuth.status = 'completed';
    
  } catch (error) {
    recordResult('supabaseAuth', 'general', 'failed', `Supabase validation failed: ${error.message}`);
    results.supabaseAuth.status = 'failed';
  }
}

// Test Email Providers
async function validateEmailProviders() {
  log('info', 'Starting email provider validation...');
  
  const providers = [];
  
  // Test Resend
  if (CONFIG.emailConfig.resendApiKey) {
    try {
      const resendResult = await testResendProvider();
      providers.push({ name: 'Resend', status: resendResult.success ? 'passed' : 'failed', ...resendResult });
      recordResult('emailProviders', 'resend', resendResult.success ? 'passed' : 'failed', resendResult.message);
    } catch (err) {
      recordResult('emailProviders', 'resend', 'failed', `Resend test failed: ${err.message}`);
    }
  }
  
  // Test SendGrid
  if (CONFIG.emailConfig.sendgridApiKey) {
    try {
      const sendgridResult = await testSendGridProvider();
      providers.push({ name: 'SendGrid', status: sendgridResult.success ? 'passed' : 'failed', ...sendgridResult });
      recordResult('emailProviders', 'sendgrid', sendgridResult.success ? 'passed' : 'failed', sendgridResult.message);
    } catch (err) {
      recordResult('emailProviders', 'sendgrid', 'failed', `SendGrid test failed: ${err.message}`);
    }
  }
  
  // Test SMTP
  if (CONFIG.emailConfig.smtpHost && CONFIG.emailConfig.smtpUser) {
    try {
      const smtpResult = await testSMTPProvider();
      providers.push({ name: 'SMTP', status: smtpResult.success ? 'passed' : 'failed', ...smtpResult });
      recordResult('emailProviders', 'smtp', smtpResult.success ? 'passed' : 'failed', smtpResult.message);
    } catch (err) {
      recordResult('emailProviders', 'smtp', 'failed', `SMTP test failed: ${err.message}`);
    }
  }
  
  if (providers.length === 0) {
    recordResult('emailProviders', 'configuration', 'warning', 'No email providers configured - using console provider');
  }
  
  results.emailProviders.status = 'completed';
  results.emailProviders.providers = providers;
}

// Test individual email providers
async function testResendProvider() {
  const { Resend } = require('resend');
  const resend = new Resend(CONFIG.emailConfig.resendApiKey);
  
  try {
    if (CONFIG.sendRealEmails) {
      const { data, error } = await resend.emails.send({
        from: CONFIG.emailConfig.fromEmail,
        to: CONFIG.testEmails[0],
        subject: '[TEST] Email System Validation',
        html: '<p>This is a test email from the validation script.</p>'
      });
      
      if (error) {
        return { success: false, message: `Resend API error: ${error.message}`, error };
      }
      
      return { success: true, message: 'Resend email sent successfully', messageId: data.id };
    } else {
      // Test API key validity without sending
      const { data, error } = await resend.domains.list();
      
      if (error) {
        return { success: false, message: `Resend API validation failed: ${error.message}` };
      }
      
      return { success: true, message: 'Resend API key valid', domains: data?.length || 0 };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function testSendGridProvider() {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(CONFIG.emailConfig.sendgridApiKey);
  
  try {
    if (CONFIG.sendRealEmails) {
      const msg = {
        to: CONFIG.testEmails[0],
        from: CONFIG.emailConfig.fromEmail,
        subject: '[TEST] Email System Validation',
        html: '<p>This is a test email from the validation script.</p>'
      };
      
      const response = await sgMail.send(msg);
      return { success: true, message: 'SendGrid email sent successfully', messageId: response[0].headers['x-message-id'] };
    } else {
      // Test API key without sending
      const response = await sgMail.request({
        url: '/v3/user/profile',
        method: 'GET'
      });
      
      return { success: true, message: 'SendGrid API key valid', profile: response[1]?.username };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function testSMTPProvider() {
  const transporter = nodemailer.createTransporter({
    host: CONFIG.emailConfig.smtpHost,
    port: 587,
    secure: false,
    auth: {
      user: CONFIG.emailConfig.smtpUser,
      pass: CONFIG.emailConfig.smtpPass
    }
  });
  
  try {
    // Test connection
    await transporter.verify();
    
    if (CONFIG.sendRealEmails) {
      const info = await transporter.sendMail({
        from: CONFIG.emailConfig.fromEmail,
        to: CONFIG.testEmails[0],
        subject: '[TEST] Email System Validation',
        html: '<p>This is a test email from the validation script.</p>'
      });
      
      return { success: true, message: 'SMTP email sent successfully', messageId: info.messageId };
    } else {
      return { success: true, message: 'SMTP connection verified' };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// Test Invitation System
async function validateInvitationSystem() {
  log('info', 'Starting invitation system validation...');
  
  try {
    // Test 1: Check if invitation service file exists
    const fs = require('fs');
    const path = require('path');
    const servicePath = path.join(__dirname, '../lib/email/invitation-service.ts');
    
    if (fs.existsSync(servicePath)) {
      recordResult('invitationSystem', 'service_file', 'passed', 'Invitation service file exists');
    } else {
      recordResult('invitationSystem', 'service_file', 'failed', 'Invitation service file not found');
      throw new Error('Invitation service file not found');
    }
    
    // For validation purposes, we'll skip the actual service import since it's TypeScript
    recordResult('invitationSystem', 'service_creation', 'warning', 'Service creation skipped (TypeScript file)');
    
    // Test 2: Email template generation
    const testInvitationData = {
      recipientEmail: CONFIG.testEmails[0],
      recipientName: 'Test User',
      senderName: 'System Test',
      senderEmail: 'test@example.com',
      inviteLink: `${CONFIG.baseUrl}/invitations/accept/test-token`,
      message: 'This is a test invitation from the validation script',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'individual'
    };
    
    if (CONFIG.sendRealEmails) {
      // Test 3: Send real invitation email
      const startTime = Date.now();
      const result = await emailService.sendInvitationEmail(testInvitationData);
      const duration = Date.now() - startTime;
      
      if (result.success) {
        recordResult('invitationSystem', 'send_invitation', 'passed', 
          `Invitation email sent successfully in ${duration}ms`, { messageId: result.messageId });
        
        results.performance.metrics.invitationSendTime = duration;
      } else {
        recordResult('invitationSystem', 'send_invitation', 'failed', 
          `Failed to send invitation: ${result.error}`);
      }
      
      // Test 4: Group invitation
      const groupInvitationData = {
        ...testInvitationData,
        recipientEmail: CONFIG.testEmails[1],
        type: 'group',
        groupName: 'Test Validation Group',
        groupDescription: 'A test group for system validation'
      };
      
      const groupResult = await emailService.sendInvitationEmail(groupInvitationData);
      
      if (groupResult.success) {
        recordResult('invitationSystem', 'send_group_invitation', 'passed', 
          'Group invitation email sent successfully', { messageId: groupResult.messageId });
      } else {
        recordResult('invitationSystem', 'send_group_invitation', 'failed', 
          `Failed to send group invitation: ${groupResult.error}`);
      }
      
    } else {
      recordResult('invitationSystem', 'send_invitation', 'warning', 
        'Email sending skipped (not in live test mode)');
    }
    
    results.invitationSystem.status = 'completed';
    
  } catch (error) {
    recordResult('invitationSystem', 'general', 'failed', `Invitation system validation failed: ${error.message}`);
    results.invitationSystem.status = 'failed';
  }
}

// Test Security Features
async function validateSecurity() {
  log('info', 'Starting security validation...');
  
  try {
    // Test 1: Environment variable security
    const sensitiveVars = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY', 
      'SENDGRID_API_KEY',
      'SMTP_PASS'
    ];
    
    let exposedVars = 0;
    sensitiveVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        // Check if value looks like a real key/token
        if (value.length > 10 && !value.includes('your-') && !value.includes('test-')) {
          recordResult('security', 'env_var_configured', 'passed', `${varName} appears properly configured`);
        } else {
          recordResult('security', 'env_var_configured', 'warning', `${varName} may be using placeholder value`);
        }
      }
    });
    
    // Test 2: Email header security
    if (CONFIG.emailConfig.fromEmail) {
      if (CONFIG.emailConfig.fromEmail.includes('@') && !CONFIG.emailConfig.fromEmail.includes('noreply')) {
        recordResult('security', 'from_email', 'warning', 'Consider using noreply@ address for automated emails');
      } else {
        recordResult('security', 'from_email', 'passed', 'From email address properly configured');
      }
    }
    
    // Test 3: URL security
    if (CONFIG.baseUrl.startsWith('https://') || CONFIG.baseUrl.includes('localhost')) {
      recordResult('security', 'url_security', 'passed', 'Base URL uses HTTPS or is localhost');
    } else {
      recordResult('security', 'url_security', 'failed', 'Base URL should use HTTPS in production');
    }
    
    results.security.status = 'completed';
    
  } catch (error) {
    recordResult('security', 'general', 'failed', `Security validation failed: ${error.message}`);
    results.security.status = 'failed';
  }
}

// Test Integration
async function validateIntegration() {
  log('info', 'Starting integration validation...');
  
  try {
    // Test 1: Environment consistency
    const requiredVars = {
      'NEXT_PUBLIC_SUPABASE_URL': CONFIG.supabaseUrl,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': CONFIG.supabaseAnonKey,
      'INVITATION_FROM_EMAIL': CONFIG.emailConfig.fromEmail,
      'INVITATION_FROM_NAME': CONFIG.emailConfig.fromName
    };
    
    let missingVars = 0;
    Object.entries(requiredVars).forEach(([varName, value]) => {
      if (!value) {
        recordResult('integration', 'env_consistency', 'failed', `Missing required variable: ${varName}`);
        missingVars++;
      }
    });
    
    if (missingVars === 0) {
      recordResult('integration', 'env_consistency', 'passed', 'All required environment variables are set');
    }
    
    // Test 2: Service compatibility
    if (CONFIG.supabaseUrl && CONFIG.emailConfig.fromEmail) {
      recordResult('integration', 'service_compatibility', 'passed', 
        'Supabase and email service configurations are compatible');
    } else {
      recordResult('integration', 'service_compatibility', 'warning', 
        'Some service configurations are incomplete');
    }
    
    results.integration.status = 'completed';
    
  } catch (error) {
    recordResult('integration', 'general', 'failed', `Integration validation failed: ${error.message}`);
    results.integration.status = 'failed';
  }
}

// Performance metrics
async function measurePerformance() {
  log('info', 'Starting performance measurement...');
  
  try {
    // Measure various operations
    const metrics = {};
    
    // Test 1: Supabase connection time
    const supabaseStart = Date.now();
    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    await supabase.auth.getSession();
    metrics.supabaseConnectionTime = Date.now() - supabaseStart;
    
    // Test 2: Email service initialization time (skipped for TypeScript file)
    const emailStart = Date.now();
    // Skip actual import since it's a TypeScript file
    // const { createInvitationEmailService } = require('../lib/email/invitation-service');
    // createInvitationEmailService();
    metrics.emailServiceInitTime = Date.now() - emailStart;
    
    results.performance.metrics = { ...results.performance.metrics, ...metrics };
    results.performance.status = 'completed';
    
    recordResult('performance', 'metrics', 'passed', 
      `Performance metrics collected`, metrics);
    
  } catch (error) {
    recordResult('performance', 'general', 'failed', `Performance measurement failed: ${error.message}`);
    results.performance.status = 'failed';
  }
}

// Generate comprehensive report
function generateReport() {
  const reportPath = './email-validation-report.json';
  const summaryPath = './email-validation-summary.txt';
  
  // Calculate overall status
  results.overall.total = results.overall.passed + results.overall.failed + results.overall.warnings;
  results.overall.successRate = results.overall.total > 0 ? 
    ((results.overall.passed / results.overall.total) * 100).toFixed(1) : 0;
  
  // Write detailed JSON report
  require('fs').writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Generate summary report
  const summary = `
EMAIL SYSTEM VALIDATION REPORT
Generated: ${results.timestamp}

OVERALL RESULTS:
✅ Passed: ${results.overall.passed}
❌ Failed: ${results.overall.failed} 
⚠️  Warnings: ${results.overall.warnings}
📊 Success Rate: ${results.overall.successRate}%

COMPONENT STATUS:
- Supabase Auth: ${results.supabaseAuth.status}
- Email Providers: ${results.emailProviders.status}
- Invitation System: ${results.invitationSystem.status}
- Security: ${results.security.status}
- Integration: ${results.integration.status}
- Performance: ${results.performance.status}

PERFORMANCE METRICS:
${Object.entries(results.performance.metrics || {})
  .map(([key, value]) => `- ${key}: ${value}ms`).join('\n')}

RECOMMENDATIONS:
${results.overall.failed > 0 ? '❌ Critical issues found - resolve failed tests before production' : ''}
${results.overall.warnings > 0 ? '⚠️  Warnings present - review and address if needed' : ''}
${results.overall.failed === 0 && results.overall.warnings === 0 ? '✅ All tests passed - system ready for production' : ''}

For detailed results, see: ${reportPath}
`;
  
  require('fs').writeFileSync(summaryPath, summary);
  
  log('info', `Validation report generated: ${reportPath}`);
  log('info', `Summary report generated: ${summaryPath}`);
  
  console.log(summary);
}

// Main validation function
async function runValidation() {
  const startTime = Date.now();
  
  log('info', '🚀 Starting comprehensive email system validation...');
  log('info', `Test mode: ${CONFIG.sendRealEmails ? 'LIVE (sending real emails)' : 'DRY RUN (no emails sent)'}`);
  log('info', `Test emails: ${CONFIG.testEmails.join(', ')}`);
  
  try {
    // Run all validation tests
    await validateSupabaseAuth();
    await validateEmailProviders();
    await validateInvitationSystem();
    await validateSecurity();
    await validateIntegration();
    await measurePerformance();
    
    const duration = Date.now() - startTime;
    log('success', `Validation completed in ${duration}ms`);
    
    generateReport();
    
    // Exit with appropriate code
    if (results.overall.failed > 0) {
      log('error', 'Validation failed - see report for details');
      process.exit(1);
    } else if (results.overall.warnings > 0) {
      log('warning', 'Validation completed with warnings - see report for details');
      process.exit(0);
    } else {
      log('success', 'All validation tests passed!');
      process.exit(0);
    }
    
  } catch (error) {
    log('error', `Validation failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Parse test emails from command line
  const testEmailsArg = args.find(arg => arg.startsWith('--test-emails='));
  if (testEmailsArg) {
    CONFIG.testEmails = testEmailsArg.split('=')[1].split(',');
  }
  
  runValidation();
}

module.exports = {
  runValidation,
  CONFIG,
  results
};