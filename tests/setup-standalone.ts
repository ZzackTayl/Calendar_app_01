/**
 * Standalone Test Setup
 * 
 * Minimal setup for tests that need to verify real implementations
 * without mocking. Used for cryptographic and security-critical tests.
 */

import { beforeAll, afterAll } from 'vitest';

// Set minimal test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.KEY_DERIVATION_SECRET = 'test-derivation-secret-for-standalone-tests';

beforeAll(() => {
  console.log('🔐 Standalone test setup - using real implementations');
});

afterAll(() => {
  console.log('🔐 Standalone test completed');
});
