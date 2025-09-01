import { NextRequest, NextResponse } from 'next/server';
import { validateEnvironment, getEnvironmentConfig } from '@/lib/config/env-validation';
import { createInvitationEmailService } from '@/lib/email/invitation-service';

/**
 * Email Configuration Test API Endpoint
 * 
 * Tests and validates the complete email system configuration
 * including environment variables, provider connections, and service integration.
 */

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

interface EmailConfigTestReport {
  overall: {
    success: boolean;
    timestamp: string;
    environment: string;
  };
  tests: TestResult[];
  recommendations: string[];
}

/**
 * Test environment variable validation
 */
async function testEnvironmentValidation(): Promise<TestResult> {
  try {
    const validationResult = validateEnvironment();
    
    if (validationResult.success) {
      const config = getEnvironmentConfig();
      return {
        name: 'Environment Validation',
        success: true,
        message: 'Environment variables validated successfully',
        details: {
          emailProvider: config.email.provider,
          senderEmail: config.email.sender.email,
          senderName: config.email.sender.name,
          warnings: validationResult.warnings || []
        }
      };
    } else {
      return {
        name: 'Environment Validation',
        success: false,
        message: 'Environment validation failed',
        error: validationResult.errors?.join('; ') || 'Unknown validation error',
        details: {
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      };
    }
  } catch (error) {
    return {
      name: 'Environment Validation',
      success: false,
      message: 'Environment validation threw an error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test email service creation
 */
async function testEmailServiceCreation(): Promise<TestResult> {
  try {
    const emailService = createInvitationEmailService();
    
    return {
      name: 'Email Service Creation',
      success: true,
      message: 'Email service created successfully',
      details: {
        serviceType: 'InvitationEmailService',
        providerDetected: true
      }
    };
  } catch (error) {
    return {
      name: 'Email Service Creation',
      success: false,
      message: 'Failed to create email service',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test provider-specific connections
 */
async function testProviderConnection(): Promise<TestResult> {
  try {
    const config = getEnvironmentConfig();
    const provider = config.email.provider;
    
    switch (provider) {
      case 'resend':
        return await testResendProvider(config.email.resend.apiKey);
      case 'sendgrid':
        return await testSendGridProvider(config.email.sendgrid.apiKey);
      case 'aws_ses':
        return await testAWSProvider(config.email.awsSes);
      case 'smtp':
        return await testSMTPProvider(config.email.smtp);
      case 'console':
        return {
          name: 'Provider Connection',
          success: true,
          message: 'Console provider - no connection test needed',
          details: { provider: 'console' }
        };
      default:
        return {
          name: 'Provider Connection',
          success: false,
          message: `Unknown email provider: ${provider}`,
          error: `Provider '${provider}' is not supported`
        };
    }
  } catch (error) {
    return {
      name: 'Provider Connection',
      success: false,
      message: 'Provider connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test Resend provider
 */
async function testResendProvider(apiKey?: string): Promise<TestResult> {
  if (!apiKey) {
    return {
      name: 'Provider Connection (Resend)',
      success: false,
      message: 'Resend API key not configured',
      error: 'RESEND_API_KEY environment variable is missing'
    };
  }
  
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    
    // Test API key by listing domains
    const { data, error } = await resend.domains.list();
    
    if (error) {
      return {
        name: 'Provider Connection (Resend)',
        success: false,
        message: 'Resend API connection failed',
        error: error.message,
        details: { apiKeyPrefix: apiKey.substring(0, 8) + '...' }
      };
    }
    
    return {
      name: 'Provider Connection (Resend)',
      success: true,
      message: 'Resend connection successful',
      details: {
        apiKeyPrefix: apiKey.substring(0, 8) + '...',
        domainsCount: Array.isArray(data) ? data.length : 0
      }
    };
  } catch (error) {
    return {
      name: 'Provider Connection (Resend)',
      success: false,
      message: 'Resend provider test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test SendGrid provider
 */
async function testSendGridProvider(apiKey?: string): Promise<TestResult> {
  if (!apiKey) {
    return {
      name: 'Provider Connection (SendGrid)',
      success: false,
      message: 'SendGrid API key not configured',
      error: 'SENDGRID_API_KEY environment variable is missing'
    };
  }
  
  // SendGrid doesn't have a simple test endpoint, so we validate the key format
  return {
    name: 'Provider Connection (SendGrid)',
    success: true,
    message: 'SendGrid API key configured (connection will be tested on first send)',
    details: {
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      formatValid: apiKey.startsWith('SG.')
    }
  };
}

/**
 * Test AWS SES provider
 */
async function testAWSProvider(awsConfig: any): Promise<TestResult> {
  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
    return {
      name: 'Provider Connection (AWS SES)',
      success: false,
      message: 'AWS credentials not configured',
      error: 'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required'
    };
  }
  
  try {
    const { SESClient, GetIdentityVerificationAttributesCommand } = await import('@aws-sdk/client-ses');
    
    const sesClient = new SESClient({
      region: awsConfig.region || 'us-east-1',
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey
      }
    });
    
    // Test connection
    const command = new GetIdentityVerificationAttributesCommand({ Identities: [] });
    await sesClient.send(command);
    
    return {
      name: 'Provider Connection (AWS SES)',
      success: true,
      message: 'AWS SES connection successful',
      details: {
        region: awsConfig.region || 'us-east-1',
        accessKeyPrefix: awsConfig.accessKeyId.substring(0, 8) + '...'
      }
    };
  } catch (error) {
    return {
      name: 'Provider Connection (AWS SES)',
      success: false,
      message: 'AWS SES connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test SMTP provider
 */
async function testSMTPProvider(smtpConfig: any): Promise<TestResult> {
  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
    return {
      name: 'Provider Connection (SMTP)',
      success: false,
      message: 'SMTP configuration incomplete',
      error: 'SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required'
    };
  }
  
  try {
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: false,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });
    
    // Test SMTP connection
    await transporter.verify();
    
    return {
      name: 'Provider Connection (SMTP)',
      success: true,
      message: 'SMTP connection successful',
      details: {
        host: smtpConfig.host,
        port: smtpConfig.port || 587,
        user: smtpConfig.user
      }
    };
  } catch (error) {
    return {
      name: 'Provider Connection (SMTP)',
      success: false,
      message: 'SMTP connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test Supabase configuration consistency
 */
async function testSupabaseConsistency(): Promise<TestResult> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
    
    if (!fs.existsSync(configPath)) {
      return {
        name: 'Supabase Configuration Consistency',
        success: true,
        message: 'Supabase config.toml not found - consistency check skipped',
        details: { configExists: false }
      };
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = getEnvironmentConfig();
    
    // Check SMTP configuration
    const smtpEnabled = configContent.includes('[auth.email.smtp]') && configContent.includes('enabled = true');
    const usesResend = configContent.includes('host = "smtp.resend.com"');
    const hasResendKey = configContent.includes('pass = "env(RESEND_API_KEY)"');
    
    const isConsistent = config.email.provider === 'resend' && usesResend && hasResendKey;
    
    return {
      name: 'Supabase Configuration Consistency',
      success: isConsistent || config.email.provider === 'console',
      message: isConsistent 
        ? 'Supabase email configuration is consistent with invitation system'
        : 'Supabase email configuration may not match invitation system',
      details: {
        invitationProvider: config.email.provider,
        supabaseSmtpEnabled: smtpEnabled,
        supabaseUsesResend: usesResend,
        supabaseHasResendKey: hasResendKey,
        consistent: isConsistent
      }
    };
  } catch (error) {
    return {
      name: 'Supabase Configuration Consistency',
      success: false,
      message: 'Failed to check Supabase configuration consistency',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(tests: TestResult[]): string[] {
  const recommendations: string[] = [];
  
  const failedTests = tests.filter(test => !test.success);
  
  if (failedTests.some(test => test.name === 'Environment Validation')) {
    recommendations.push('Fix environment variable validation errors before proceeding');
    recommendations.push('Ensure all required email provider credentials are properly configured');
  }
  
  if (failedTests.some(test => test.name.includes('Provider Connection'))) {
    recommendations.push('Verify email provider credentials and network connectivity');
    recommendations.push('Check that API keys have necessary permissions');
  }
  
  if (failedTests.some(test => test.name === 'Email Service Creation')) {
    recommendations.push('Debug email service initialization - check provider imports');
  }
  
  const consistencyTest = tests.find(test => test.name === 'Supabase Configuration Consistency');
  if (consistencyTest && !consistencyTest.success) {
    recommendations.push('Update Supabase config.toml to use the same email provider');
    recommendations.push('Run: node scripts/configure-supabase-email.js');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All tests passed! You can now test actual email sending');
    recommendations.push('Test signup email verification with a real email address');
    recommendations.push('Verify invitation emails are working correctly');
  }
  
  return recommendations;
}

/**
 * Main test handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 Running email configuration tests...');
    
    // Run all tests
    const tests: TestResult[] = [
      await testEnvironmentValidation(),
      await testEmailServiceCreation(),
      await testProviderConnection(),
      await testSupabaseConsistency()
    ];
    
    const overallSuccess = tests.every(test => test.success);
    const recommendations = generateRecommendations(tests);
    
    const report: EmailConfigTestReport = {
      overall: {
        success: overallSuccess,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      tests,
      recommendations
    };
    
    console.log(`📊 Email configuration test completed: ${overallSuccess ? 'PASS' : 'FAIL'}`);
    
    return NextResponse.json(report, {
      status: overallSuccess ? 200 : 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('❌ Email configuration test error:', error);
    
    return NextResponse.json({
      overall: {
        success: false,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      tests: [],
      recommendations: ['Fix critical system error before testing email configuration'],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}