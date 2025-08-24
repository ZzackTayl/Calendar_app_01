#!/usr/bin/env node

/**
 * Environment Variables Setup Script
 * 
 * This script helps set up the necessary environment variables
 * for the invitation system to work properly.
 */

const fs = require('fs');
const path = require('path');

function setupEnvVariables() {
  console.log('Setting up environment variables for invitation system...\n');
  
  // Check if .env.local exists
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
    console.log('✓ Found existing .env.local file');
  } else {
    console.log('ℹ️  No existing .env.local file found');
  }
  
  // Required environment variables
  const requiredVars = [
    {
      key: 'INVITATION_FROM_EMAIL',
      description: 'Email address used as the "from" address for invitations',
      example: 'invites@yourdomain.com'
    },
    {
      key: 'INVITATION_FROM_NAME',
      description: 'Name used as the "from" name for invitations',
      example: '"PolyHarmony Test"'
    }
  ];
  
  // Optional email service variables
  const emailServiceOptions = [
    {
      name: 'SendGrid',
      vars: [
        { key: 'SENDGRID_API_KEY', description: 'SendGrid API key', example: 'SG.xxxxxx' }
      ]
    },
    {
      name: 'Resend',
      vars: [
        { key: 'RESEND_API_KEY', description: 'Resend API key', example: 're_xxxxxx' }
      ]
    },
    {
      name: 'AWS SES',
      vars: [
        { key: 'AWS_ACCESS_KEY_ID', description: 'AWS Access Key ID', example: 'AKIAxxxxxx' },
        { key: 'AWS_SECRET_ACCESS_KEY', description: 'AWS Secret Access Key', example: 'xxxxxx' },
        { key: 'AWS_REGION', description: 'AWS Region (optional)', example: 'us-east-1' }
      ]
    },
    {
      name: 'SMTP',
      vars: [
        { key: 'SMTP_HOST', description: 'SMTP Host', example: 'smtp.yourdomain.com' },
        { key: 'SMTP_PORT', description: 'SMTP Port', example: '587' },
        { key: 'SMTP_USER', description: 'SMTP Username', example: 'your_username' },
        { key: 'SMTP_PASS', description: 'SMTP Password', example: 'your_password' }
      ]
    }
  ];
  
  console.log('\nRequired Environment Variables:');
  console.log('===============================');
  
  requiredVars.forEach((envVar, index) => {
    console.log(`${index + 1}. ${envVar.key}`);
    console.log(`   Description: ${envVar.description}`);
    console.log(`   Example: ${envVar.example}`);
    console.log('');
  });
  
  console.log('\nOptional Email Service Configuration:');
  console.log('====================================');
  
  emailServiceOptions.forEach((service, serviceIndex) => {
    console.log(`${serviceIndex + 1}. ${service.name}:`);
    service.vars.forEach((envVar, varIndex) => {
      console.log(`   ${String.fromCharCode(97 + varIndex)}. ${envVar.key}`);
      console.log(`      Description: ${envVar.description}`);
      console.log(`      Example: ${envVar.example}`);
    });
    console.log('');
  });
  
  console.log('\nInstructions:');
  console.log('=============');
  console.log('1. Add the required environment variables to your .env.local file');
  console.log('2. Choose one email service provider and add its variables');
  console.log('3. For testing, you can use the ConsoleEmailProvider by not setting any email service variables');
  console.log('4. The ConsoleEmailProvider will log invitation emails to the console instead of sending them');
  
  console.log('\nExample .env.local additions:');
  console.log('============================');
  console.log('# Invitation System Configuration');
  console.log('INVITATION_FROM_EMAIL=invites@yourdomain.com');
  console.log('INVITATION_FROM_NAME="PolyHarmony Test"');
  console.log('');
  console.log('# Choose one email service:');
  console.log('# SENDGRID_API_KEY=your_sendgrid_api_key');
  console.log('# RESEND_API_KEY=your_resend_api_key');
  console.log('# AWS_ACCESS_KEY_ID=your_aws_access_key');
  console.log('# AWS_SECRET_ACCESS_KEY=your_aws_secret_key');
  console.log('# SMTP_HOST=smtp.yourdomain.com');
  console.log('# SMTP_PORT=587');
  console.log('# SMTP_USER=your_smtp_user');
  console.log('# SMTP_PASS=your_smtp_password');
  
  console.log('\nFor development/testing, you can skip email service configuration');
  console.log('and the system will use the ConsoleEmailProvider which logs emails to the console.');
}

// Run the setup script
if (require.main === module) {
  setupEnvVariables();
}

module.exports = { setupEnvVariables };