/**
 * Test Helper Utilities for Key Management System
 * 
 * Provides utilities for setting up test environments, mocking dependencies,
 * and validating security boundaries across all key management tests.
 */

import crypto from 'crypto';
import { beforeAll, beforeEach, afterEach, afterAll } from 'vitest';

// Test environment setup
export interface TestEnvironment {
  isSetup: boolean;
  mockSupabase: any;
  mockRedis: any;
  testUserIds: string[];
  cleanup: () => Promise<void>;
}

let testEnvironment: TestEnvironment | null = null;

/**
 * Sets up a complete test environment with all necessary mocks
 */
export async function setupTestEnvironment(): Promise<TestEnvironment> {
  if (testEnvironment?.isSetup) {
    return testEnvironment;
  }

  const mockSupabase = createMockSupabaseClient();
  const mockRedis = createMockRedisClient();
  
  testEnvironment = {
    isSetup: true,
    mockSupabase,
    mockRedis,
    testUserIds: [],
    cleanup: async () => {
      // Clear all test data
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      testEnvironment!.testUserIds = [];
    }
  };

  return testEnvironment;
}

/**
 * Creates a mock Supabase client with common patterns
 */
export function createMockSupabaseClient() {
  return {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: null 
          }))
        })),
        or: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: null 
          }))
        })),
        in: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: jest.fn((data) => Promise.resolve({ 
        data: Array.isArray(data) ? data : [data], 
        error: null 
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: null 
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: null 
        }))
      }))
    })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: null }, 
        error: null 
      })),
      signUp: jest.fn(() => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: null 
      })),
      signInWithPassword: jest.fn(() => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: null 
      })),
      signOut: jest.fn(() => Promise.resolve({ error: null }))
    },
    realtime: {
      channel: jest.fn(() => ({
        on: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn()
      }))
    }
  };
}

/**
 * Creates a mock Redis client for caching tests
 */
export function createMockRedisClient() {
  const store = new Map<string, string>();
  
  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) || null)),
    set: jest.fn((key: string, value: string, options?: any) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      const deleted = store.delete(key);
      return Promise.resolve(deleted ? 1 : 0);
    }),
    expire: jest.fn(() => Promise.resolve(1)),
    exists: jest.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
    keys: jest.fn((pattern: string) => {
      const keys = Array.from(store.keys());
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Promise.resolve(keys.filter(k => regex.test(k)));
      }
      return Promise.resolve(keys.filter(k => k === pattern));
    }),
    flushall: jest.fn(() => {
      store.clear();
      return Promise.resolve('OK');
    })
  };
}

/**
 * Security test utilities
 */
export class SecurityTestUtils {
  /**
   * Validates that keys are cryptographically secure
   */
  static validateKeyEntropy(keys: Buffer[]): boolean {
    // Check for sufficient entropy
    const uniqueKeys = new Set(keys.map(k => k.toString('hex')));
    if (uniqueKeys.size !== keys.length) {
      return false;
    }

    // Check key distribution (simplified entropy check)
    for (const key of keys) {
      const bytes = Array.from(key);
      const zeroes = bytes.filter(b => b === 0).length;
      const ones = bytes.filter(b => b === 255).length;
      
      // Too many zeroes or ones indicates poor entropy
      if (zeroes > key.length * 0.1 || ones > key.length * 0.1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Tests that two keys are cryptographically different
   */
  static keysAreDifferent(key1: Buffer, key2: Buffer): boolean {
    if (key1.length !== key2.length) {
      return true;
    }

    let differences = 0;
    for (let i = 0; i < key1.length; i++) {
      if (key1[i] !== key2[i]) {
        differences++;
      }
    }

    // Keys should differ in at least 50% of bits for good security
    return differences >= (key1.length * 8 * 0.5);
  }

  /**
   * Validates password strength requirements
   */
  static validatePasswordStrength(password: string): {
    isStrong: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (password.length < 12) {
      issues.push('Password must be at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      issues.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      issues.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      issues.push('Password must contain at least one digit');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      issues.push('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /(.)\1{3,}/, // Repeated characters
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        issues.push('Password contains common weak patterns');
        break;
      }
    }

    return {
      isStrong: issues.length === 0,
      issues
    };
  }
}

/**
 * Performance test utilities
 */
export class PerformanceTestUtils {
  /**
   * Times a function execution
   */
  static async timeFunction<T>(fn: () => Promise<T>): Promise<{
    result: T;
    duration: number;
  }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    return { result, duration };
  }

  /**
   * Tests performance of multiple iterations
   */
  static async performanceTest<T>(
    fn: () => Promise<T>,
    iterations: number = 100
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: T[];
  }> {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.timeFunction(fn);
      times.push(duration);
      results.push(result);
    }

    return {
      averageTime: times.reduce((a, b) => a + b) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      results
    };
  }
}

/**
 * Data generation utilities for tests
 */
export class TestDataGenerator {
  private static userCounter = 0;
  private static eventCounter = 0;

  /**
   * Generates unique test user ID
   */
  static generateUserId(): string {
    return `test-user-${++this.userCounter}-${Date.now()}`;
  }

  /**
   * Generates unique test event ID
   */
  static generateEventId(): string {
    return `test-event-${++this.eventCounter}-${Date.now()}`;
  }

  /**
   * Generates test user data
   */
  static generateUserData() {
    const userId = this.generateUserId();
    return {
      id: userId,
      email: `${userId}@test.com`,
      name: `Test User ${this.userCounter}`,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Generates test event data
   */
  static generateEventData(userId: string) {
    return {
      id: this.generateEventId(),
      user_id: userId,
      title: `Test Event ${this.eventCounter}`,
      description: `Description for test event ${this.eventCounter}`,
      location: `Test Location ${this.eventCounter}`,
      notes: `Test notes ${this.eventCounter}`,
      start_time: new Date(Date.now() + Math.random() * 86400000).toISOString(),
      end_time: new Date(Date.now() + Math.random() * 86400000 + 3600000).toISOString(),
      privacy_level: ['private', 'busy_only', 'details', 'public'][Math.floor(Math.random() * 4)]
    };
  }

  /**
   * Generates test relationship data
   */
  static generateRelationshipData(userId1: string, userId2: string) {
    return {
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId1,
      partner_id: userId2,
      tier: ['busy_only', 'details', 'visible'][Math.floor(Math.random() * 3)],
      status: 'active',
      created_at: new Date().toISOString()
    };
  }

  /**
   * Resets counters (for test isolation)
   */
  static reset(): void {
    this.userCounter = 0;
    this.eventCounter = 0;
  }
}

/**
 * Encryption test utilities
 */
export class EncryptionTestUtils {
  /**
   * Validates that encrypted data is properly encrypted
   */
  static validateEncryption(plaintext: string, encrypted: string): boolean {
    // Basic checks
    if (encrypted === plaintext) return false;
    if (encrypted.length === 0) return false;
    
    // Should be hex encoded
    if (!/^[0-9a-f]+$/i.test(encrypted)) return false;
    
    // Should be significantly different from plaintext
    return true;
  }

  /**
   * Tests encryption/decryption round-trip
   */
  static testEncryptionRoundTrip(
    plaintext: string,
    encryptFn: (text: string) => Promise<string>,
    decryptFn: (encrypted: string) => Promise<string>
  ): Promise<boolean> {
    return encryptFn(plaintext)
      .then(encrypted => {
        if (!this.validateEncryption(plaintext, encrypted)) {
          return false;
        }
        return decryptFn(encrypted);
      })
      .then(decrypted => decrypted === plaintext)
      .catch(() => false);
  }
}

/**
 * Global test lifecycle hooks
 */
export function setupGlobalTestHooks() {
  beforeAll(async () => {
    // Global setup
    await setupTestEnvironment();
  });

  beforeEach(async () => {
    // Reset test data generator
    TestDataGenerator.reset();
    
    // Clear any cached data
    if (testEnvironment) {
      await testEnvironment.cleanup();
    }
  });

  afterEach(async () => {
    // Cleanup after each test
    if (testEnvironment) {
      await testEnvironment.cleanup();
    }
  });

  afterAll(async () => {
    // Global cleanup
    if (testEnvironment) {
      await testEnvironment.cleanup();
      testEnvironment = null;
    }
  });
}

/**
 * Assertion helpers for common test patterns
 */
export class TestAssertions {
  /**
   * Asserts that a function throws with a specific message
   */
  static async assertThrowsWithMessage(
    fn: () => Promise<any>,
    expectedMessage: string | RegExp
  ): Promise<void> {
    let threw = false;
    let actualMessage = '';

    try {
      await fn();
    } catch (error) {
      threw = true;
      actualMessage = error instanceof Error ? error.message : String(error);
    }

    if (!threw) {
      throw new Error('Expected function to throw, but it did not');
    }

    if (typeof expectedMessage === 'string') {
      if (!actualMessage.includes(expectedMessage)) {
        throw new Error(
          `Expected error message to contain "${expectedMessage}", but got "${actualMessage}"`
        );
      }
    } else {
      if (!expectedMessage.test(actualMessage)) {
        throw new Error(
          `Expected error message to match ${expectedMessage}, but got "${actualMessage}"`
        );
      }
    }
  }

  /**
   * Asserts that keys are cryptographically secure
   */
  static assertSecureKeys(keys: Buffer[]): void {
    if (!SecurityTestUtils.validateKeyEntropy(keys)) {
      throw new Error('Keys do not have sufficient entropy');
    }

    // Check that all keys are different
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (!SecurityTestUtils.keysAreDifferent(keys[i], keys[j])) {
          throw new Error(`Keys at indices ${i} and ${j} are too similar`);
        }
      }
    }
  }

  /**
   * Asserts performance requirements are met
   */
  static assertPerformance(
    actualTime: number,
    maxTime: number,
    operation: string
  ): void {
    if (actualTime > maxTime) {
      throw new Error(
        `${operation} took ${actualTime}ms, which exceeds the maximum of ${maxTime}ms`
      );
    }
  }
}

// Export all utilities as default
export default {
  setupTestEnvironment,
  createMockSupabaseClient,
  createMockRedisClient,
  SecurityTestUtils,
  PerformanceTestUtils,
  TestDataGenerator,
  EncryptionTestUtils,
  setupGlobalTestHooks,
  TestAssertions
};
