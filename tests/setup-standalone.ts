/**
 * Standalone Test Setup
 * 
 * Minimal setup for tests that need to verify real implementations
 * without mocking. Used for cryptographic and security-critical tests.
 */

import { beforeAll, afterAll } from 'vitest';
import { initializeTestSecrets } from '@/config/testing/test-secrets';

initializeTestSecrets();

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

['ENCRYPTION_KEY', 'KEY_DERIVATION_SECRET'].forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required standalone test environment variable: ${key}`);
  }
});

beforeAll(() => {
  console.log('🔐 Standalone test setup - using real implementations');
});

afterAll(() => {
  console.log('🔐 Standalone test completed');
});
