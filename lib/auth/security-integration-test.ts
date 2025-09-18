/**
 * Security Integration Test Suite
 *
 * Validates that all authentication security fixes work together properly
 * and don't break existing security systems.
 */

import { validateSession } from './session-validation';
import { validateToken } from './enhanced-token-validation';
import { performSecurityCheck } from './session-security';
import { validateProductionEnvironment } from '../security/env-validator';
import { getProductionSecurityConfig } from '../security/production-config';

export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
  securityScore: number; // 0-100
}

export interface SecurityTestSuite {
  results: SecurityTestResult[];
  overallScore: number;
  criticalIssues: string[];
  warnings: string[];
  passed: boolean;
}

/**
 * Run comprehensive security integration tests
 */
export async function runSecurityIntegrationTests(): Promise<SecurityTestSuite> {
  const results: SecurityTestResult[] = [];
  const criticalIssues: string[] = [];
  const warnings: string[] = [];

  console.log('🔒 Starting security integration tests...');

  // Test 1: Environment Security Validation
  results.push(await testEnvironmentSecurity());

  // Test 2: Production Configuration
  results.push(await testProductionConfig());

  // Test 3: Authentication Bypass Prevention
  results.push(await testAuthBypassPrevention());

  // Test 4: Session Encryption
  results.push(await testSessionEncryption());

  // Test 5: Token Validation
  results.push(await testTokenValidation());

  // Test 6: Session Security Integration
  results.push(await testSessionSecurityIntegration());

  // Test 7: Cross-System Validation
  results.push(await testCrossSystemValidation());

  // Calculate overall security score
  const totalScore = results.reduce((sum, result) => sum + result.securityScore, 0);
  const overallScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

  // Collect critical issues and warnings
  results.forEach(result => {
    if (!result.passed) {
      if (result.securityScore <= 30) {
        criticalIssues.push(`${result.testName}: ${result.error}`);
      } else {
        warnings.push(`${result.testName}: ${result.error}`);
      }
    }
  });

  const passed = criticalIssues.length === 0 && overallScore >= 80;

  console.log(`🔒 Security integration tests completed. Score: ${overallScore}/100, Passed: ${passed}`);

  return {
    results,
    overallScore,
    criticalIssues,
    warnings,
    passed
  };
}

/**
 * Test environment security validation
 */
async function testEnvironmentSecurity(): Promise<SecurityTestResult> {
  try {
    const validation = validateProductionEnvironment();

    if (validation.criticalIssues.length > 0) {
      return {
        testName: 'Environment Security',
        passed: false,
        error: `Critical issues: ${validation.criticalIssues.join(', ')}`,
        details: validation,
        securityScore: 0
      };
    }

    if (validation.errors.length > 0) {
      return {
        testName: 'Environment Security',
        passed: false,
        error: `Errors: ${validation.errors.join(', ')}`,
        details: validation,
        securityScore: 40
      };
    }

    const score = validation.warnings.length > 0 ? 85 : 100;

    return {
      testName: 'Environment Security',
      passed: true,
      details: validation,
      securityScore: score
    };
  } catch (error) {
    return {
      testName: 'Environment Security',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      securityScore: 0
    };
  }
}

/**
 * Test production configuration security
 */
async function testProductionConfig(): Promise<SecurityTestResult> {
  try {
    const config = getProductionSecurityConfig();
    let score = 100;
    const issues: string[] = [];

    // Check critical security settings
    if (!config.environment.enforceProduction && process.env.NODE_ENV === 'production') {
      issues.push('Production enforcement disabled in production');
      score -= 50;
    }

    if (!config.environment.requireHttps && process.env.NODE_ENV === 'production') {
      issues.push('HTTPS not required in production');
      score -= 30;
    }

    if (config.demoMode.allowInProduction) {
      issues.push('Demo mode allowed in production');
      score -= 40;
    }

    if (!config.rateLimiting.enabled && process.env.NODE_ENV === 'production') {
      issues.push('Rate limiting disabled in production');
      score -= 20;
    }

    const passed = score >= 70;

    return {
      testName: 'Production Configuration',
      passed,
      error: issues.length > 0 ? issues.join(', ') : undefined,
      details: { score, issues },
      securityScore: Math.max(0, score)
    };
  } catch (error) {
    return {
      testName: 'Production Configuration',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      securityScore: 0
    };
  }
}

/**
 * Test authentication bypass prevention
 */
async function testAuthBypassPrevention(): Promise<SecurityTestResult> {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const devAuthBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

    if (isProduction && devAuthBypass) {
      return {
        testName: 'Auth Bypass Prevention',
        passed: false,
        error: 'Authentication bypass enabled in production environment',
        securityScore: 0
      };
    }

    // Test that bypass logic is properly contained
    if (devAuthBypass && !isProduction) {
      return {
        testName: 'Auth Bypass Prevention',
        passed: true,
        details: { environment: 'development', bypassEnabled: true },
        securityScore: 90 // Slight deduction for having bypass enabled even in dev
      };
    }

    return {
      testName: 'Auth Bypass Prevention',
      passed: true,
      details: { environment: process.env.NODE_ENV, bypassDisabled: true },
      securityScore: 100
    };
  } catch (error) {
    return {
      testName: 'Auth Bypass Prevention',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      securityScore: 0
    };
  }
}

/**
 * Test session encryption functionality
 */
async function testSessionEncryption(): Promise<SecurityTestResult> {
  try {
    // Test browser encryption functionality
    const { encryptForBrowserSecure, decryptFromBrowser, isValidBrowserEncrypted } =
      await import('../browser-encryption');

    const testData = 'test-session-data-' + Date.now();
    const testSeed = 'test-seed-' + Math.random().toString(36);

    // Test encryption
    const encrypted = await encryptForBrowserSecure(testData, testSeed);

    if (!encrypted || typeof encrypted !== 'string') {
      return {
        testName: 'Session Encryption',
        passed: false,
        error: 'Encryption failed to produce valid output',
        securityScore: 0
      };
    }

    // Test encryption format validation
    if (!isValidBrowserEncrypted(encrypted)) {
      return {
        testName: 'Session Encryption',
        passed: false,
        error: 'Encrypted data format validation failed',
        securityScore: 20
      };
    }

    // Test decryption
    const decrypted = await decryptFromBrowser(encrypted, testSeed);

    if (decrypted !== testData) {
      return {
        testName: 'Session Encryption',
        passed: false,
        error: 'Decryption does not match original data',
        securityScore: 30
      };
    }

    // Test wrong seed (should fail)
    try {
      await decryptFromBrowser(encrypted, 'wrong-seed');
      return {
        testName: 'Session Encryption',
        passed: false,
        error: 'Decryption with wrong seed should fail but succeeded',
        securityScore: 40
      };
    } catch (expectedError) {
      // This is expected behavior
    }

    return {
      testName: 'Session Encryption',
      passed: true,
      details: { encryptionWorking: true, formatValid: true, decryptionWorking: true },
      securityScore: 100
    };
  } catch (error) {
    return {
      testName: 'Session Encryption',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      securityScore: 0
    };
  }
}

/**
 * Test token validation functionality
 */
async function testTokenValidation(): Promise<SecurityTestResult> {
  try {
    // Test with various token formats
    const testCases = [
      {
        description: 'Null token',
        token: null,
        shouldPass: false
      },
      {
        description: 'Empty token',
        token: '',
        shouldPass: false
      },
      {
        description: 'Malformed token (not JWT)',
        token: 'not-a-jwt-token',
        shouldPass: false
      },
      {
        description: 'Malformed JWT (wrong parts)',
        token: 'header.payload',
        shouldPass: false
      },
      {
        description: 'JWT with invalid base64',
        token: 'invalid-base64.invalid-base64.invalid-base64',
        shouldPass: false
      }
    ];

    let passedTests = 0;
    const failedTests: string[] = [];

    for (const testCase of testCases) {
      try {
        const result = await validateToken(testCase.token as any, {
          validateSignature: false,
          checkReplayAttacks: false
        });

        const actuallyPassed = result.isValid;
        if (actuallyPassed === testCase.shouldPass) {
          passedTests++;
        } else {
          failedTests.push(`${testCase.description}: expected ${testCase.shouldPass}, got ${actuallyPassed}`);
        }
      } catch (error) {
        if (!testCase.shouldPass) {
          passedTests++; // Error is expected for invalid tokens
        } else {
          failedTests.push(`${testCase.description}: unexpected error`);
        }
      }
    }

    const score = Math.round((passedTests / testCases.length) * 100);
    const passed = failedTests.length === 0;

    return {
      testName: 'Token Validation',
      passed,
      error: failedTests.length > 0 ? failedTests.join('; ') : undefined,
      details: { passedTests, totalTests: testCases.length, failedTests },
      securityScore: score
    };
  } catch (error) {
    return {
      testName: 'Token Validation',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      securityScore: 0
    };
  }
}

/**
 * Test session security integration
 */
async function testSessionSecurityIntegration(): Promise<SecurityTestResult> {
  try {
    // Mock user for testing
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      aud: 'authenticated',
      role: 'authenticated'
    } as any;

    // Test security check with valid user
    const securityResult = await performSecurityCheck('test-user-123', mockUser, mockUser);

    if (securityResult.action === 'terminate') {
      return {
        testName: 'Session Security Integration',
        passed: false,
        error: 'Security check terminated valid session',
        details: securityResult,
        securityScore: 30
      };
    }

    // Test with mismatched users (should detect)
    const mismatchedUser = { ...mockUser, id: 'different-user-456' };
    const mismatchResult = await performSecurityCheck('test-user-123', mismatchedUser, mockUser);

    if (mismatchResult.action !== 'terminate') {
      return {
        testName: 'Session Security Integration',
        passed: false,
        error: 'Security check failed to detect user mismatch',
        details: mismatchResult,
        securityScore: 20
      };
    }

    return {
      testName: 'Session Security Integration',
      passed: true,
      details: { validUserResult: securityResult, mismatchResult },
      securityScore: 100
    };
  } catch (error) {
    return {
      testName: 'Session Security Integration',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      securityScore: 0
    };
  }
}

/**
 * Test cross-system validation
 */
async function testCrossSystemValidation(): Promise<SecurityTestResult> {
  try {
    // Test that session validation works
    const sessionResult = await validateSession(undefined, {
      requireEmailVerification: false,
      allowRefresh: false
    });

    // This should not crash the system even if no session exists
    if (sessionResult.validationMetadata.securityLevel === 'compromised') {
      return {
        testName: 'Cross-System Validation',
        passed: false,
        error: 'Session validation detected compromised security',
        details: sessionResult,
        securityScore: 20
      };
    }

    // Test that all systems can work together without conflicts
    let systemsWorkingTogether = true;
    const testErrors: string[] = [];

    try {
      // Test environment validation
      validateProductionEnvironment();
    } catch (error) {
      systemsWorkingTogether = false;
      testErrors.push('Environment validation failed');
    }

    try {
      // Test production config
      getProductionSecurityConfig();
    } catch (error) {
      systemsWorkingTogether = false;
      testErrors.push('Production config failed');
    }

    const score = systemsWorkingTogether ? 100 : 60;

    return {
      testName: 'Cross-System Validation',
      passed: systemsWorkingTogether,
      error: testErrors.length > 0 ? testErrors.join(', ') : undefined,
      details: { sessionResult, testErrors },
      securityScore: score
    };
  } catch (error) {
    return {
      testName: 'Cross-System Validation',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      securityScore: 0
    };
  }
}

/**
 * Generate security test report
 */
export function generateSecurityReport(testSuite: SecurityTestSuite): string {
  const report = [];

  report.push('='.repeat(60));
  report.push('🔒 SECURITY INTEGRATION TEST REPORT');
  report.push('='.repeat(60));
  report.push('');

  report.push(`Overall Status: ${testSuite.passed ? '✅ PASSED' : '❌ FAILED'}`);
  report.push(`Security Score: ${testSuite.overallScore}/100`);
  report.push('');

  if (testSuite.criticalIssues.length > 0) {
    report.push('🚨 CRITICAL ISSUES:');
    testSuite.criticalIssues.forEach(issue => {
      report.push(`  - ${issue}`);
    });
    report.push('');
  }

  if (testSuite.warnings.length > 0) {
    report.push('⚠️ WARNINGS:');
    testSuite.warnings.forEach(warning => {
      report.push(`  - ${warning}`);
    });
    report.push('');
  }

  report.push('📊 TEST RESULTS:');
  testSuite.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const score = `(${result.securityScore}/100)`;
    report.push(`  ${status} ${result.testName} ${score}`);
    if (result.error) {
      report.push(`      Error: ${result.error}`);
    }
  });

  report.push('');
  report.push('='.repeat(60));

  return report.join('\n');
}

/**
 * Run security tests and log results (for development)
 */
export async function runAndLogSecurityTests(): Promise<boolean> {
  try {
    const testSuite = await runSecurityIntegrationTests();
    const report = generateSecurityReport(testSuite);

    console.log(report);

    return testSuite.passed;
  } catch (error) {
    console.error('❌ Failed to run security integration tests:', error);
    return false;
  }
}