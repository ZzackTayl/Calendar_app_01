/**
 * Test Guard Validation Tests
 *
 * These tests validate that the test guard system works correctly
 * by testing the guards themselves in different modes.
 */

import { describe, it, expect } from 'vitest';
import {
  getTestType,
  isTestType,
  guardTest,
  guardTestTypes,
  testEnvironment,
  shouldRunTest
} from '@/lib/test-guards';

describe('Test Guards System Validation', () => {
  describe('Environment Detection', () => {
    it('should detect test type from environment', () => {
      const testType = getTestType();
      expect(['unit', 'integration', 'contract']).toContain(testType);
    });

    it('should report correct test type flags', () => {
      const testType = getTestType();

      if (testType === 'unit') {
        expect(testEnvironment.isUnit()).toBe(true);
        expect(testEnvironment.isIntegration()).toBe(false);
        expect(testEnvironment.isContract()).toBe(false);
        expect(testEnvironment.allowsHeavyOperations()).toBe(false);
        expect(testEnvironment.allowsDatabaseOperations()).toBe(false);
        expect(testEnvironment.allowsExternalAPICalls()).toBe(false);
      } else if (testType === 'integration') {
        expect(testEnvironment.isUnit()).toBe(false);
        expect(testEnvironment.isIntegration()).toBe(true);
        expect(testEnvironment.isContract()).toBe(false);
        expect(testEnvironment.allowsHeavyOperations()).toBe(true);
        expect(testEnvironment.allowsDatabaseOperations()).toBe(true);
        expect(testEnvironment.allowsExternalAPICalls()).toBe(true);
      } else if (testType === 'contract') {
        expect(testEnvironment.isUnit()).toBe(false);
        expect(testEnvironment.isIntegration()).toBe(false);
        expect(testEnvironment.isContract()).toBe(true);
        expect(testEnvironment.allowsHeavyOperations()).toBe(true);
        expect(testEnvironment.allowsDatabaseOperations()).toBe(true);
        expect(testEnvironment.allowsExternalAPICalls()).toBe(true);
      }
    });

    it('should correctly identify if test should run', () => {
      const testType = getTestType();

      expect(shouldRunTest(testType)).toBe(true);

      if (testType === 'unit') {
        expect(shouldRunTest('integration')).toBe(false);
        expect(shouldRunTest('contract')).toBe(false);
      } else if (testType === 'integration') {
        expect(shouldRunTest('unit')).toBe(false);
        expect(shouldRunTest('contract')).toBe(false);
      } else if (testType === 'contract') {
        expect(shouldRunTest('unit')).toBe(false);
        expect(shouldRunTest('integration')).toBe(false);
      }
    });
  });

  describe('Guard Behavior Validation', () => {
    it('should run tests for current environment type', () => {
      const testType = getTestType();
      let testRan = false;

      guardTest(testType, () => {
        testRan = true;
      });

      expect(testRan).toBe(true);
    });

    it('should skip tests for different environment types', () => {
      const testType = getTestType();
      const otherTypes = ['unit', 'integration', 'contract'].filter(t => t !== testType);

      otherTypes.forEach(otherType => {
        let testRan = false;

        guardTest(otherType as any, () => {
          testRan = true;
        });

        expect(testRan).toBe(false);
      });
    });

    it('should run multi-type guards when current type is included', () => {
      const testType = getTestType();
      let testRan = false;

      guardTestTypes([testType as any], () => {
        testRan = true;
      });

      expect(testRan).toBe(true);
    });

    it('should skip multi-type guards when current type is not included', () => {
      const testType = getTestType();
      const otherTypes = ['unit', 'integration', 'contract'].filter(t => t !== testType);

      if (otherTypes.length > 0) {
        let testRan = false;

        guardTestTypes(otherTypes as any[], () => {
          testRan = true;
        });

        expect(testRan).toBe(false);
      }
    });
  });
});

// Unit-only tests (should only run in unit mode)
guardTest('unit', () => {
  describe('Unit-Only Tests', () => {
    it('should only run in unit mode', () => {
      expect(getTestType()).toBe('unit');
    });
  });
});

// Integration-only tests (should only run in integration mode)
guardTest('integration', () => {
  describe('Integration-Only Tests', () => {
    it('should only run in integration mode', () => {
      expect(getTestType()).toBe('integration');
    });
  });
});

// Contract-only tests (should only run in contract mode)
guardTest('contract', () => {
  describe('Contract-Only Tests', () => {
    it('should only run in contract mode', () => {
      expect(getTestType()).toBe('contract');
    });
  });
});

// Multi-mode tests (should run in integration OR contract modes)
guardTestTypes(['integration', 'contract'], () => {
  describe('Heavy Operation Tests', () => {
    it('should run in integration or contract modes', () => {
      const testType = getTestType();
      expect(['integration', 'contract']).toContain(testType);
    });
  });
});