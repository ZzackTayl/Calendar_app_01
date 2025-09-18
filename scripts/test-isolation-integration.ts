#!/usr/bin/env node

/**
 * Cross-User Isolation Integration Test Script
 *
 * This script validates that the cross-user isolation fixes work correctly
 * with the authentication and encryption systems.
 */

import {
  runCrossUserIsolationTests,
  testEncryptionIsolation,
  testAttackScenarios,
  generateSecurityReport
} from '../lib/security/cross-user-isolation-test';

// Test configuration
const TEST_CONFIG = {
  userId1: '550e8400-e29b-41d4-a716-446655440001', // Sample UUID
  userId2: '550e8400-e29b-41d4-a716-446655440002', // Sample UUID
  groupId: '550e8400-e29b-41d4-a716-446655440003',  // Sample UUID
  eventId: '550e8400-e29b-41d4-a716-446655440004',  // Sample UUID
  relationshipId: '550e8400-e29b-41d4-a716-446655440005' // Sample UUID
};

async function runIntegrationTests() {
  console.log('🔒 Starting Cross-User Isolation Integration Tests...\n');

  try {
    // Run main test suite
    console.log('📋 Running main isolation test suite...');
    const mainResults = await runCrossUserIsolationTests(
      TEST_CONFIG.userId1,
      TEST_CONFIG.userId2,
      TEST_CONFIG.groupId,
      TEST_CONFIG.eventId
    );

    // Test encryption isolation
    console.log('🔐 Testing encryption isolation...');
    const encryptionResult = await testEncryptionIsolation(
      TEST_CONFIG.userId1,
      TEST_CONFIG.userId2
    );

    // Test attack scenarios
    console.log('🛡️  Testing attack scenarios...');
    const attackResults = await testAttackScenarios(
      TEST_CONFIG.userId1,
      TEST_CONFIG.userId2,
      {
        eventId: TEST_CONFIG.eventId,
        groupId: TEST_CONFIG.groupId,
        relationshipId: TEST_CONFIG.relationshipId
      }
    );

    // Combine all results
    const allResults = {
      ...mainResults,
      results: [
        ...mainResults.results,
        encryptionResult,
        ...attackResults
      ]
    };

    // Recalculate summary
    const totalPassed = allResults.results.filter(r => r.passed).length;
    const totalFailed = allResults.results.length - totalPassed;

    allResults.summary = {
      total: allResults.results.length,
      passed: totalPassed,
      failed: totalFailed
    };

    allResults.overallResult = totalFailed === 0 ? 'PASS' : 'FAIL';

    // Generate and display report
    const report = generateSecurityReport(allResults);
    console.log(report);

    // Exit with appropriate code
    process.exit(allResults.overallResult === 'PASS' ? 0 : 1);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runIntegrationTests();
}

export { runIntegrationTests };