/**
 * Test Setup File
 * 
 * This file is run before all tests to set up the testing environment.
 */

import { vi, expect, beforeAll, afterAll } from 'vitest';

// Explicitly define globals for TypeScript
declare global {
  interface Window {
    fetch: typeof fetch;
  }
  
  // Add fail function for better test assertion error messages
  function fail(message?: string): never;
}

// Define fail function
global.fail = (message?: string) => {
  throw new Error(message || 'Test failed');
};

beforeAll(() => {
  // Setup global mocks if needed
  // For example, mocking global.fetch for API calls
  global.fetch = vi.fn();
  
  // Log the start of tests
  console.log('🧪 Starting tests');
});

afterAll(() => {
  // Clean up any resources
  vi.resetAllMocks();
  
  // Log the end of tests
  console.log('✅ Tests completed');
});

// Add custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});
