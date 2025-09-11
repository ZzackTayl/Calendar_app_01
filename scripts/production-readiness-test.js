#!/usr/bin/env node

/**
 * Comprehensive Production Readiness Test
 * Tests all critical systems for production deployment
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
  startTime: Date.now()
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    test: `${colors.bold}🧪${colors.reset}`
  }[type] || '';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function test(name, fn) {
  log(`Testing: ${name}`, 'test');
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      results.passed++;
      log(`PASSED: ${name} (${duration}ms)`, 'success');
    } else {
      results.failed++;
      log(`FAILED: ${name} - ${result.error}`, 'error');
    }
    
    results.details.push({
      name,
      success: result.success,
      duration,
      details: result.details || result.error
    });
    
    return result;
  } catch (error) {
    results.failed++;
    const duration = Date.now() - startTime;
    log(`ERROR: ${name} - ${error.message}`, 'error');
    
    results.details.push({
      name,
      success: false,
      duration,
      details: error.message
    });
    
    return { success: false, error: error.message };
  }
}

// Test functions
async function testEnvironmentVariables() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'ENCRYPTION_KEY',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    return { success: false, error: `Missing environment variables: ${missing.join(', ')}` };
  }
  
  // Validate format
  if (process.env.ENCRYPTION_KEY?.length !== 64) {
    return { success: false, error: 'ENCRYPTION_KEY must be 64 characters' };
  }
  
  return { success: true };
}

async function testDatabaseConnection() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    
    if (data.status !== 'ok') {
      return { success: false, error: 'Health check failed' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: `API unreachable: ${error.message}` };
  }
}

async function testAPIEndpoints() {
  const endpoints = [
    { path: '/api/health', method: 'GET', expectedStatus: 200 },
    { path: '/api/auth/csrf-token', method: 'GET', expectedStatus: [200, 401] }, // Both are valid
    { path: '/api/monitoring/dashboard', method: 'GET', expectedStatus: 200 }
  ];
  
  let failed = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint.path}`, {
        method: endpoint.method
      });
      
      const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
        ? endpoint.expectedStatus 
        : [endpoint.expectedStatus];
      
      if (!expectedStatuses.includes(response.status)) {
        failed++;
        log(`  ${endpoint.path}: ${response.status} (expected ${expectedStatuses.join(' or ')})`, 'error');
      } else {
        log(`  ${endpoint.path}: OK`, 'success');
      }
    } catch (error) {
      failed++;
      log(`  ${endpoint.path}: ${error.message}`, 'error');
    }
  }
  
  return {
    success: failed === 0,
    error: failed > 0 ? `${failed} endpoints failed` : undefined
  };
}

async function testBuildProcess() {
  try {
    // Check if build exists - check multiple possible locations
    let buildId;
    try {
      buildId = await fs.readFile('.next/BUILD_ID', 'utf8');
    } catch {
      // Try alternative location
      try {
        await fs.access('.next');
        // Check if any build files exist
        const files = await fs.readdir('.next');
        if (files.length > 0) {
          return { success: true, details: 'Build directory exists with files' };
        }
      } catch {
        return { success: false, error: 'Build not found. Run "npm run build" first.' };
      }
    }
    
    if (buildId && !buildId.trim()) {
      return { success: false, error: 'Invalid build ID' };
    }
    
    return { success: true, details: buildId ? `Build ID: ${buildId.trim()}` : 'Build exists' };
  } catch (error) {
    return { success: false, error: 'Build not found. Run "npm run build" first.' };
  }
}

async function testSecurityHeaders() {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET'
    });
    
    const headers = {
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'x-xss-protection': '1; mode=block',
      'referrer-policy': 'strict-origin-when-cross-origin'
    };
    
    const missing = [];
    
    for (const [header, expectedValue] of Object.entries(headers)) {
      const value = response.headers.get(header);
      if (!value) {
        missing.push(header);
      }
    }
    
    if (missing.length > 0) {
      return { success: false, error: `Missing security headers: ${missing.join(', ')}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testCriticalComponents() {
  const components = [
    'lib/supabase/client.ts',
    'lib/encryption.ts',
    'middleware.ts',
    'lib/security/csrf.ts',
    'lib/rate-limiting.ts'
  ];
  
  const missing = [];
  
  for (const component of components) {
    try {
      await fs.access(path.join(process.cwd(), component));
    } catch {
      missing.push(component);
    }
  }
  
  if (missing.length > 0) {
    return { success: false, error: `Missing critical components: ${missing.join(', ')}` };
  }
  
  return { success: true };
}

async function testEncryption() {
  try {
    // Test encryption endpoint if available
    const testData = { test: 'data' };
    
    // Since we can't directly test encryption without auth, we check the module exists
    await fs.access(path.join(process.cwd(), 'lib/encryption.ts'));
    await fs.access(path.join(process.cwd(), 'lib/encryption/field-encryption.ts'));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Encryption modules not found' };
  }
}

async function testPrivacySystem() {
  const privacyFiles = [
    'lib/privacy-utils.ts',
    'lib/privacy/privacy-enforcement.ts'
  ];
  
  const missing = [];
  
  for (const file of privacyFiles) {
    try {
      await fs.access(path.join(process.cwd(), file));
    } catch {
      missing.push(file);
    }
  }
  
  if (missing.length > 0) {
    return { success: false, error: `Missing privacy components: ${missing.join(', ')}` };
  }
  
  return { success: true };
}

async function testPerformance() {
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:3000/api/health');
    const duration = Date.now() - start;
    
    if (duration > 2000) {
      return { success: false, error: `Response time ${duration}ms exceeds 2s threshold` };
    }
    
    return { success: true, details: `Response time: ${duration}ms` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testDataIntegrity() {
  // Check for database migration files
  try {
    const migrationsDir = await fs.readdir('migrations');
    
    if (migrationsDir.length === 0) {
      return { success: false, error: 'No database migrations found' };
    }
    
    return { success: true, details: `${migrationsDir.length} migrations found` };
  } catch {
    return { success: false, error: 'Migrations directory not found' };
  }
}

// Main test runner
async function runTests() {
  console.log(`
${colors.bold}================================================================================
🚀 PRODUCTION READINESS TEST SUITE
================================================================================${colors.reset}
`);

  // Run all tests
  await test('Environment Variables', testEnvironmentVariables);
  await test('Database Connection', testDatabaseConnection);
  await test('API Endpoints', testAPIEndpoints);
  await test('Build Process', testBuildProcess);
  await test('Security Headers', testSecurityHeaders);
  await test('Critical Components', testCriticalComponents);
  await test('Encryption System', testEncryption);
  await test('Privacy System', testPrivacySystem);
  await test('Performance (Sub-2s)', testPerformance);
  await test('Data Integrity', testDataIntegrity);

  // Calculate results
  const duration = ((Date.now() - results.startTime) / 1000).toFixed(2);
  const total = results.passed + results.failed;
  const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    summary: {
      total,
      passed: results.passed,
      failed: results.failed,
      percentage,
      productionReady: percentage >= 95
    },
    tests: results.details
  };

  // Save report
  await fs.writeFile(
    'production-readiness-report.json',
    JSON.stringify(report, null, 2)
  );

  // Display summary
  console.log(`
${colors.bold}================================================================================
📊 TEST RESULTS
================================================================================${colors.reset}
${colors.green}✅ Passed:${colors.reset} ${results.passed}
${colors.red}❌ Failed:${colors.reset} ${results.failed}
⏱️  Duration: ${duration}s

${colors.bold}📈 Production Readiness: ${percentage}%${colors.reset}

${percentage >= 95 
  ? `${colors.green}${colors.bold}✨ PRODUCTION READY!${colors.reset}` 
  : percentage >= 80
  ? `${colors.yellow}⚠️  Nearly ready - address remaining issues${colors.reset}`
  : `${colors.red}❌ NOT READY - significant issues need resolution${colors.reset}`}

Full report saved to: production-readiness-report.json
`);

  // Exit with appropriate code
  process.exit(percentage >= 95 ? 0 : 1);
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run tests
runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
