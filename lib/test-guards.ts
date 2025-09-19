/// <reference types="vitest" />

/**
 * Test Guard Utility Functions
 * Provides environment-based conditional execution guards for test isolation
 * Integrates with existing vitest.config.ts test type detection
 */

export type TestType = 'unit' | 'integration' | 'contract';

/**
 * Gets the current test type from environment variables
 */
export function getTestType(): TestType {
  const testType = process.env.TEST_TYPE;

  if (testType === 'integration') return 'integration';
  if (testType === 'contract') return 'contract';
  return 'unit';
}

/**
 * Checks if the current test environment matches the required type
 */
export function isTestType(requiredType: TestType): boolean {
  return getTestType() === requiredType;
}

/**
 * Guard function that skips tests if they don't match the current test type
 * Usage: guardTest('integration', () => { describe('Integration Tests', ...) })
 */
export function guardTest(requiredType: TestType, testFn: () => void): void {
  if (isTestType(requiredType)) {
    testFn();
  } else {
    // Skip the entire test suite if it doesn't match the current test type (when running under a test runner)
    const g = globalThis as any;
    if (g?.describe?.skip) {
      g.describe.skip(`${requiredType} tests (skipped in ${getTestType()} mode)`, () => {});
    }
  }
}

/**
 * Guard function that skips tests if they match the excluded type
 * Usage: guardTestExclude('unit', () => { describe('Heavy Integration Tests', ...) })
 */
export function guardTestExclude(excludedType: TestType, testFn: () => void): void {
  if (!isTestType(excludedType)) {
    testFn();
  } else {
    const g = globalThis as any;
    if (g?.describe?.skip) {
      g.describe.skip(`Tests excluded from ${excludedType} mode`, () => {});
    }
  }
}

/**
 * Conditional test runner for multiple test types
 * Usage: guardTestTypes(['integration', 'contract'], () => { describe('Heavy Tests', ...) })
 */
export function guardTestTypes(allowedTypes: TestType[], testFn: () => void): void {
  const currentType = getTestType();

  if (allowedTypes.includes(currentType)) {
    testFn();
  } else {
    const g = globalThis as any;
    if (g?.describe?.skip) {
      g.describe.skip(`Tests for ${allowedTypes.join('/')} only (current: ${currentType})`, () => {});
    }
  }
}

/**
 * Runtime environment checks for test isolation
 */
export const testEnvironment = {
  isUnit: () => isTestType('unit'),
  isIntegration: () => isTestType('integration'),
  isContract: () => isTestType('contract'),

  // Helper to check if heavy operations are allowed
  allowsHeavyOperations: () => !isTestType('unit'),

  // Helper to check if database operations are allowed
  allowsDatabaseOperations: () => isTestType('integration') || isTestType('contract'),

  // Helper to check if external API calls are allowed
  allowsExternalAPICalls: () => isTestType('integration') || isTestType('contract'),

  // Helper to check if Redis operations are allowed
  allowsRedisOperations: () => isTestType('integration') || isTestType('contract'),
};

/**
 * Performance-optimized guard that immediately returns if test should be skipped
 * Use this for expensive setup operations
 */
export function shouldRunTest(requiredType: TestType): boolean {
  return isTestType(requiredType);
}

/**
 * Guard for conditional test setup/teardown
 * Usage: guardSetup('integration', async () => { await setupDatabase() })
 */
export async function guardSetup(requiredType: TestType, setupFn: () => Promise<void> | void): Promise<void> {
  if (isTestType(requiredType)) {
    await setupFn();
  }
}

/**
 * Debug helper to log current test environment (only in development)
 */
export function logTestEnvironment(): void {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TESTS === 'true') {
    console.log(`[Test Guard] Running in ${getTestType()} mode`);
    console.log(`[Test Guard] Environment flags:`, {
      unit: testEnvironment.isUnit(),
      integration: testEnvironment.isIntegration(),
      contract: testEnvironment.isContract(),
      allowsHeavyOps: testEnvironment.allowsHeavyOperations(),
      allowsDB: testEnvironment.allowsDatabaseOperations(),
      allowsAPI: testEnvironment.allowsExternalAPICalls(),
      allowsRedis: testEnvironment.allowsRedisOperations(),
    });
  }
}