#!/usr/bin/env node
/**
 * Deployment Readiness Validator for PolyHarmony Calendar
 * Validates that all tests pass and quality gates are met before deployment
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  reportPath: 'reports/comprehensive/summary.json',
  qualityGates: {
    minCoverage: 90,
    maxVulnerabilities: 0,
    maxFailedTests: 0
  }
};

// Read and validate test summary
function validateDeploymentReadiness() {
  console.log('🔍 Validating deployment readiness...');

  if (!fs.existsSync(config.reportPath)) {
    console.error('❌ Comprehensive test report not found');
    return false;
  }

  const summary = JSON.parse(fs.readFileSync(config.reportPath, 'utf8'));

  let isReady = true;
  const failures = [];

  // Check overall test success
  if (!summary.success) {
    failures.push('Overall test suite failed');
    isReady = false;
  }

  // Check failed tests
  if (summary.failedTests > config.qualityGates.maxFailedTests) {
    failures.push(`${summary.failedTests} tests failed (max allowed: ${config.qualityGates.maxFailedTests})`);
    isReady = false;
  }

  // Check quality gates
  summary.qualityGates?.forEach(gate => {
    if (!gate.passed) {
      failures.push(`Quality gate failed: ${gate.name} - ${gate.value} (threshold: ${gate.threshold})`);
      isReady = false;
    }
  });

  // Check security vulnerabilities
  if (summary.testSuites.security?.vulnerabilities > config.qualityGates.maxVulnerabilities) {
    failures.push(`${summary.testSuites.security.vulnerabilities} security vulnerabilities found`);
    isReady = false;
  }

  // Report results
  if (isReady) {
    console.log('✅ Deployment readiness validated successfully!');
    console.log('🚀 Ready for deployment');
  } else {
    console.log('❌ Deployment readiness validation failed:');
    failures.forEach(failure => console.log(`   - ${failure}`));
  }

  return isReady;
}

// Main execution
function main() {
  const isReady = validateDeploymentReadiness();
  process.exit(isReady ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateDeploymentReadiness };