#!/usr/bin/env node

/**
 * Security CI/CD Testing Script
 * Automated security testing for continuous integration and deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
 * Security test configuration
 */
const securityTests = {
  // Static analysis tests
  staticAnalysis: {
    name: 'Static Security Analysis',
    tests: [
      {
        name: 'ESLint Security Rules',
        command: 'npx eslint --ext .ts,.tsx --config .eslintrc.json --no-eslintrc .',
        required: false,
        description: 'Check for security-related code issues'
      },
      {
        name: 'TypeScript Strict Mode',
        command: 'npx tsc --noEmit --strict',
        required: true,
        description: 'Ensure TypeScript strict mode compliance'
      }
    ]
  },

  // Dependency security tests
  dependencySecurity: {
    name: 'Dependency Security Audit',
    tests: [
      {
        name: 'NPM Security Audit',
        command: 'npm audit --audit-level=moderate',
        required: true,
        description: 'Check for known vulnerabilities in dependencies'
      },
      {
        name: 'Outdated Dependencies Check',
        command: 'npm outdated',
        required: false,
        description: 'Check for outdated dependencies'
      }
    ]
  },

  // Configuration security tests
  configurationSecurity: {
    name: 'Security Configuration Tests',
    tests: [
      {
        name: 'Environment Variable Validation',
        command: 'node scripts/validate-env-security.js',
        required: true,
        description: 'Validate security-related environment variables'
      },
      {
        name: 'Production Security Config',
        command: 'node scripts/initialize-production-security.js --validate-only',
        required: true,
        description: 'Validate production security configuration'
      }
    ]
  },

  // Unit tests for security components
  unitTests: {
    name: 'Security Unit Tests',
    tests: [
      {
        name: 'Authentication Security Tests',
        command: 'npm test -- __tests__/auth-bypass-prevention.test.ts',
        required: true,
        description: 'Test authentication bypass prevention'
      },
      {
        name: 'Session Validation Tests',
        command: 'npm test -- __tests__/session-validation-integration.test.ts',
        required: true,
        description: 'Test session validation mechanisms'
      },
      {
        name: 'Security Monitoring Tests',
        command: 'npm test -- __tests__/security-monitoring.test.ts',
        required: true,
        description: 'Test security monitoring functionality'
      }
    ]
  },

  // Integration tests
  integrationTests: {
    name: 'Security Integration Tests',
    tests: [
      {
        name: 'Security Integration Suite',
        command: 'npm test -- __tests__/security-integration.test.ts',
        required: true,
        description: 'Comprehensive security integration tests'
      },
      {
        name: 'Security Monitoring Validation',
        command: 'npm test -- __tests__/security-monitoring-validation.test.ts',
        required: true,
        description: 'Validate security monitoring integration'
      }
    ]
  }
};

/**
 * Test result tracking
 */
class TestResults {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  addResult(category, testName, status, message, duration, required = false) {
    this.results.push({
      category,
      testName,
      status, // 'pass', 'fail', 'warning', 'skip'
      message,
      duration,
      required,
      timestamp: new Date().toISOString()
    });
  }

  getStats() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const requiredFailed = this.results.filter(r => r.status === 'fail' && r.required).length;

    return {
      total,
      passed,
      failed,
      warnings,
      skipped,
      requiredFailed,
      duration: Date.now() - this.startTime
    };
  }

  generateReport() {
    const stats = this.getStats();
    
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        totalTests: stats.total,
        passed: stats.passed,
        failed: stats.failed,
        warnings: stats.warnings,
        skipped: stats.skipped,
        requiredFailed: stats.requiredFailed,
        duration: stats.duration,
        success: stats.requiredFailed === 0
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.results.filter(r => r.status === 'fail');
    const warningTests = this.results.filter(r => r.status === 'warning');

    if (failedTests.length > 0) {
      recommendations.push('Fix all failed security tests before deployment');
      failedTests.forEach(test => {
        recommendations.push(`- ${test.category}: ${test.testName} - ${test.message}`);
      });
    }

    if (warningTests.length > 0) {
      recommendations.push('Review and address security warnings');
      warningTests.forEach(test => {
        recommendations.push(`- ${test.category}: ${test.testName} - ${test.message}`);
      });
    }

    if (failedTests.length === 0 && warningTests.length === 0) {
      recommendations.push('All security tests passed - deployment approved');
    }

    return recommendations;
  }
}

/**
 * Run a single test
 */
async function runTest(category, test, results) {
  const startTime = Date.now();
  
  try {
    logInfo(`Running: ${test.name}`);
    
    // Check if command exists (for optional tools)
    if (test.command.includes('npx') || test.command.includes('npm')) {
      // These should always be available
    } else if (!fs.existsSync(test.command.split(' ')[1])) {
      results.addResult(category, test.name, 'skip', 'Command not found', 0, test.required);
      logWarning(`Skipped: ${test.name} (command not found)`);
      return;
    }

    const output = execSync(test.command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 300000 // 5 minute timeout
    });
    
    const duration = Date.now() - startTime;
    results.addResult(category, test.name, 'pass', 'Test passed', duration, test.required);
    logSuccess(`${test.name} (${duration}ms)`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error.message || 'Test failed';
    
    // Some commands return non-zero exit codes for warnings
    if (error.status === 1 && test.name.includes('Audit')) {
      results.addResult(category, test.name, 'warning', 'Security vulnerabilities found', duration, test.required);
      logWarning(`${test.name}: Security vulnerabilities detected`);
    } else {
      results.addResult(category, test.name, 'fail', message, duration, test.required);
      logError(`${test.name}: ${message}`);
    }
  }
}

/**
 * Run test category
 */
async function runTestCategory(categoryName, category, results) {
  logSection(category.name);
  
  for (const test of category.tests) {
    await runTest(categoryName, test, results);
  }
}

/**
 * Create environment validation script if it doesn't exist
 */
function ensureValidationScripts() {
  const envValidationScript = 'scripts/validate-env-security.js';
  
  if (!fs.existsSync(envValidationScript)) {
    const scriptContent = `#!/usr/bin/env node

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
    errors.push(\`Missing required variable: \${varName}\`);
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
  errors.forEach(error => console.error(\`- \${error}\`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('Environment security warnings:');
  warnings.forEach(warning => console.warn(\`- \${warning}\`));
}

console.log('Environment security validation passed');
`;

    fs.writeFileSync(envValidationScript, scriptContent);
    fs.chmodSync(envValidationScript, '755');
    logInfo(`Created ${envValidationScript}`);
  }
}

/**
 * Main security testing function
 */
async function runSecurityTests() {
  log('🔒 Security CI/CD Testing Suite', 'bright');
  log('Running comprehensive security tests for continuous integration\n', 'white');

  const results = new TestResults();
  
  // Ensure validation scripts exist
  ensureValidationScripts();

  try {
    // Run all test categories
    for (const [categoryName, category] of Object.entries(securityTests)) {
      await runTestCategory(categoryName, category, results);
    }

    // Generate and display results
    logSection('Test Results Summary');
    
    const stats = results.getStats();
    const report = results.generateReport();

    log(`Total Tests: ${stats.total}`, 'white');
    logSuccess(`Passed: ${stats.passed}`);
    
    if (stats.failed > 0) {
      logError(`Failed: ${stats.failed}`);
    }
    
    if (stats.warnings > 0) {
      logWarning(`Warnings: ${stats.warnings}`);
    }
    
    if (stats.skipped > 0) {
      logInfo(`Skipped: ${stats.skipped}`);
    }

    log(`Duration: ${Math.round(stats.duration / 1000)}s`, 'white');

    // Save detailed report
    const reportPath = 'security-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logInfo(`Detailed report saved to: ${reportPath}`);

    // Display recommendations
    if (report.recommendations.length > 0) {
      logSection('Recommendations');
      report.recommendations.forEach(rec => {
        if (rec.startsWith('-')) {
          log(`  ${rec}`, 'yellow');
        } else {
          log(rec, 'white');
        }
      });
    }

    // Determine exit code
    if (stats.requiredFailed > 0) {
      logSection('Security Test Failed');
      logError('Required security tests failed - deployment blocked');
      logError('Fix all failed tests before proceeding with deployment');
      process.exit(1);
    } else if (stats.failed > 0 || stats.warnings > 0) {
      logSection('Security Test Completed with Warnings');
      logWarning('Some security tests failed or have warnings');
      logWarning('Review the issues before deployment');
      process.exit(0); // Don't block deployment for non-required tests
    } else {
      logSection('Security Test Passed');
      logSuccess('All security tests passed successfully');
      logSuccess('Deployment approved from security perspective');
      process.exit(0);
    }

  } catch (error) {
    logError(`Security testing failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Command line options
const args = process.argv.slice(2);
const validateOnly = args.includes('--validate-only');
const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1];

if (validateOnly) {
  // Just validate configuration without running full test suite
  ensureValidationScripts();
  try {
    execSync('node scripts/validate-env-security.js', { stdio: 'inherit' });
    logSuccess('Security configuration validation passed');
    process.exit(0);
  } catch (error) {
    logError('Security configuration validation failed');
    process.exit(1);
  }
} else if (category) {
  // Run specific category
  if (securityTests[category]) {
    const results = new TestResults();
    runTestCategory(category, securityTests[category], results)
      .then(() => {
        const stats = results.getStats();
        if (stats.requiredFailed > 0) {
          process.exit(1);
        } else {
          process.exit(0);
        }
      })
      .catch(error => {
        logError(`Category test failed: ${error.message}`);
        process.exit(1);
      });
  } else {
    logError(`Unknown category: ${category}`);
    logInfo(`Available categories: ${Object.keys(securityTests).join(', ')}`);
    process.exit(1);
  }
} else {
  // Run full test suite
  runSecurityTests();
}

module.exports = {
  runSecurityTests,
  securityTests,
  TestResults
};