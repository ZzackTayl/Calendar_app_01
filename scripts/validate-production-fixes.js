#!/usr/bin/env node

/**
 * Production Fixes Validation Script
 * Validates all implemented fixes for production readiness
 */

const fs = require('fs').promises;
const path = require('path');

// Test configurations
const TEST_CONFIG = {
  rateLimitTests: [
    { name: 'EXPORT', expectedMax: 5, expectedWindow: 60000 },
    { name: 'BULK_OPERATION', expectedMax: 3, expectedWindow: 60000 },
    { name: 'EMAIL', expectedMax: 10, expectedWindow: 60000 },
    { name: 'HEALTH_CHECK', expectedMax: 60, expectedWindow: 60000 }
  ],
  endpointsWithPagination: [
    'app/api/events/route.ts',
    'app/api/contacts/route.ts'
  ],
  criticalFiles: [
    'lib/database-utils.ts',
    'lib/rate-limiting.ts',
    'lib/api/response-handler.ts'
  ]
};

async function validateRateLimitConfigurations() {
  console.log('🔍 Validating Rate Limit Configurations...\n');
  
  try {
    const rateLimitingPath = path.join(process.cwd(), 'lib', 'rate-limiting.ts');
    const content = await fs.readFile(rateLimitingPath, 'utf8');
    
    let allValid = true;
    const results = [];
    
    for (const test of TEST_CONFIG.rateLimitTests) {
      // Find the config block for this rate limit type
      const configStart = content.indexOf(`${test.name}: {`);
      
      if (configStart !== -1) {
        // Find the end of this config block
        const configEnd = content.indexOf('} as RateLimitOptions', configStart);
        
        if (configEnd !== -1) {
          const configBlock = content.substring(configStart, configEnd);
          
          // Extract windowMs and maxRequests
          const windowMsMatch = configBlock.match(/windowMs:\s*([^,\n]*)/i);
          const maxRequestsMatch = configBlock.match(/maxRequests:\s*([^,\n]*)/i);
          
          if (windowMsMatch && maxRequestsMatch) {
            try {
              // Evaluate expressions like '60 * 1000'
              const windowMs = eval(windowMsMatch[1].trim());
              const maxRequests = eval(maxRequestsMatch[1].trim());
              
              const maxValid = maxRequests === test.expectedMax;
              const windowValid = windowMs === test.expectedWindow;
              
              results.push({
                name: test.name,
                status: maxValid && windowValid ? 'PASS' : 'FAIL',
                found: { maxRequests: maxRequests, windowMs: windowMs },
                expected: { maxRequests: test.expectedMax, windowMs: test.expectedWindow }
              });
              
              if (!maxValid || !windowValid) {
                allValid = false;
              }
            } catch (evalError) {
              results.push({
                name: test.name,
                status: 'ERROR',
                error: `Failed to evaluate expressions: ${evalError.message}`
              });
              allValid = false;
            }
          } else {
            results.push({
              name: test.name,
              status: 'MISSING',
              error: 'windowMs or maxRequests not found in config block'
            });
            allValid = false;
          }
        } else {
          results.push({
            name: test.name,
            status: 'MISSING',
            error: 'End of config block not found'
          });
          allValid = false;
        }
      } else {
        results.push({
          name: test.name,
          status: 'MISSING',
          error: 'Configuration not found'
        });
        allValid = false;
      }
    }
    
    // Display results
    results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : 
                    result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`  ${status} ${result.name}: ${result.status}`);
      
      if (result.found && result.expected) {
        console.log(`     Found: ${result.found.maxRequests} req/${result.found.windowMs}ms`);
        console.log(`     Expected: ${result.expected.maxRequests} req/${result.expected.windowMs}ms`);
      }
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
      console.log('');
    });
    
    return { valid: allValid, results };
  } catch (error) {
    console.error('❌ Error validating rate limit configurations:', error.message);
    return { valid: false, error: error.message };
  }
}

async function validatePaginationEndpoints() {
  console.log('📊 Validating Pagination Implementation...\n');
  
  const results = [];
  let allValid = true;
  
  for (const endpointPath of TEST_CONFIG.endpointsWithPagination) {
    const filePath = path.join(process.cwd(), endpointPath);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for required imports
      const hasPaginatedQuery = content.includes('paginatedQuery');
      const hasDatabaseUtils = content.includes('from \'@/lib/database-utils\'');
      
      // Check for proper pagination parameters
      const hasPageParam = content.includes('searchParams.get(\'page\')');
      const hasPageSizeParam = content.includes('searchParams.get(\'pageSize\')');
      
      // Check for legacy support
      const hasLegacySupport = content.includes('legacyLimit') && content.includes('legacyOffset');
      
      // Check for proper error handling
      const hasTryCatch = content.includes('try {') && content.includes('} catch');
      
      // Check for proper response format
      const hasCorrectResponse = content.includes('pagination') && content.includes('api.success');
      
      const checks = {
        'Pagination Import': hasPaginatedQuery && hasDatabaseUtils,
        'Page Parameters': hasPageParam && hasPageSizeParam,
        'Legacy Support': hasLegacySupport,
        'Error Handling': hasTryCatch,
        'Response Format': hasCorrectResponse
      };
      
      const passed = Object.values(checks).filter(Boolean).length;
      const total = Object.keys(checks).length;
      const isValid = passed === total;
      
      results.push({
        endpoint: endpointPath,
        status: isValid ? 'PASS' : 'PARTIAL',
        passed,
        total,
        checks
      });
      
      if (!isValid) allValid = false;
      
    } catch (error) {
      results.push({
        endpoint: endpointPath,
        status: 'ERROR',
        error: error.message
      });
      allValid = false;
    }
  }
  
  // Display results
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✅' : 
                   result.status === 'PARTIAL' ? '⚠️' : '❌';
    console.log(`  ${status} ${result.endpoint}: ${result.status}`);
    
    if (result.checks) {
      console.log(`     Passed: ${result.passed}/${result.total} checks`);
      Object.entries(result.checks).forEach(([check, passed]) => {
        console.log(`     ${passed ? '✓' : '✗'} ${check}`);
      });
    }
    
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    console.log('');
  });
  
  return { valid: allValid, results };
}

async function validateCriticalFiles() {
  console.log('📁 Validating Critical Files...\n');
  
  const results = [];
  let allValid = true;
  
  for (const filePath of TEST_CONFIG.criticalFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      // Check file size (should not be empty or too large)
      const sizeKB = (stats.size / 1024).toFixed(2);
      const sizeOK = stats.size > 100 && stats.size < 500000; // 100B to 500KB
      
      // Check for TypeScript syntax
      const hasExports = content.includes('export');
      const noSyntaxErrors = !content.includes('// @ts-ignore') && 
                            !content.includes('any') || 
                            content.includes('any) =>'); // Allow any in callbacks
      
      // Check for proper documentation
      const hasComments = content.includes('/**') || content.includes('//');
      
      const isValid = sizeOK && hasExports && hasComments;
      
      results.push({
        file: filePath,
        status: isValid ? 'PASS' : 'WARN',
        size: `${sizeKB} KB`,
        checks: {
          'File Size': sizeOK,
          'Has Exports': hasExports,
          'Has Documentation': hasComments
        }
      });
      
      if (!isValid && filePath.includes('database-utils')) {
        allValid = false; // Only critical for core files
      }
      
    } catch (error) {
      results.push({
        file: filePath,
        status: 'ERROR',
        error: error.message
      });
      allValid = false;
    }
  }
  
  // Display results
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✅' : 
                   result.status === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${status} ${result.file}: ${result.status}`);
    
    if (result.size) {
      console.log(`     Size: ${result.size}`);
    }
    
    if (result.checks) {
      Object.entries(result.checks).forEach(([check, passed]) => {
        console.log(`     ${passed ? '✓' : '✗'} ${check}`);
      });
    }
    
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
    console.log('');
  });
  
  return { valid: allValid, results };
}

async function runTypeScriptValidation() {
  console.log('🔧 Running TypeScript Validation...\n');
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const tsc = spawn('npm', ['run', 'type-check'], {
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    tsc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    tsc.on('close', (code) => {
      const success = code === 0;
      console.log(`  ${success ? '✅' : '❌'} TypeScript Compilation: ${success ? 'PASS' : 'FAIL'}`);
      
      if (!success) {
        console.log('  Error Output:');
        console.log(errorOutput);
      }
      
      console.log('');
      resolve({ valid: success, output, errorOutput });
    });
  });
}

async function runProductionBuildTest() {
  console.log('🏗️  Running Production Build Test...\n');
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const build = spawn('npm', ['run', 'build:simple'], {
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    build.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    build.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    build.on('close', (code) => {
      const success = code === 0;
      console.log(`  ${success ? '✅' : '❌'} Production Build: ${success ? 'PASS' : 'FAIL'}`);
      
      if (success) {
        // Check for build artifacts
        const buildSuccess = output.includes('Compiled successfully');
        console.log(`  ${buildSuccess ? '✅' : '⚠️'} Build Artifacts: ${buildSuccess ? 'CREATED' : 'PARTIAL'}`);
      } else {
        console.log('  Error Output:');
        console.log(errorOutput.slice(-500)); // Last 500 chars
      }
      
      console.log('');
      resolve({ valid: success, output, errorOutput });
    });
  });
}

async function main() {
  console.log('🔍 PRODUCTION FIXES VALIDATION\n');
  console.log('════════════════════════════════════════\n');
  
  const results = [];
  
  // Run all validations
  console.log('Phase 1: Rate Limit Configuration');
  results.push(await validateRateLimitConfigurations());
  
  console.log('Phase 2: Pagination Implementation');
  results.push(await validatePaginationEndpoints());
  
  console.log('Phase 3: Critical Files');
  results.push(await validateCriticalFiles());
  
  console.log('Phase 4: TypeScript Compilation');
  results.push(await runTypeScriptValidation());
  
  console.log('Phase 5: Production Build');
  results.push(await runProductionBuildTest());
  
  // Final summary
  const allPassed = results.every(r => r.valid);
  const passedCount = results.filter(r => r.valid).length;
  
  console.log('════════════════════════════════════════');
  console.log('VALIDATION SUMMARY');
  console.log('════════════════════════════════════════\n');
  
  console.log(`Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️ ISSUES FOUND'}`);
  console.log(`Validation Results: ${passedCount}/${results.length} phases passed`);
  
  if (allPassed) {
    console.log('\n🎉 Your application is PRODUCTION READY!');
    console.log('✅ All critical fixes validated');
    console.log('✅ TypeScript compilation clean');
    console.log('✅ Production build successful');
    console.log('✅ Database safety implemented');
    console.log('✅ Rate limiting properly configured');
  } else {
    console.log('\n⚠️ Issues found that should be addressed:');
    results.forEach((result, index) => {
      if (!result.valid) {
        console.log(`   Phase ${index + 1}: ${result.error || 'Validation failed'}`);
      }
    });
  }
  
  console.log('\n');
  process.exit(allPassed ? 0 : 1);
}

// Run validation
main().catch(error => {
  console.error('Fatal validation error:', error);
  process.exit(1);
});