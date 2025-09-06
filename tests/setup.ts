/**
 * Test Setup File
 * 
 * This file is run before all tests to set up the testing environment.
 */

import { vi, expect, beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { config } from 'dotenv';
import React from 'react';

// Load test environment variables
config({ path: '.env.test' });

// Mock React globally
global.React = React;

// Mock jest functions for compatibility with jest-style tests
(global as any).jest = {
  mock: vi.mock,
  unmock: vi.unmock,  
  doMock: vi.doMock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  mocked: vi.mocked,
  fn: vi.fn,
  spyOn: vi.spyOn,
};

// Export MockedFunction type for compatibility
export type MockedFunction<T extends (...args: any[]) => any> = ReturnType<typeof vi.fn>;

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
  // Mock global.fetch for API calls
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      formData: () => Promise.resolve(new FormData()),
    }) as Promise<Response>
  );
  
  // Mock Next.js router
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/test-path',
    useSearchParams: () => new URLSearchParams(),
  }));

  // Mock Next.js headers
  vi.mock('next/headers', () => ({
    cookies: () => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    }),
    headers: () => ({
      get: vi.fn(),
      set: vi.fn(),
    }),
  }));

  // Mock auth context
  vi.mock('@/lib/auth-context', () => ({
    useAuth: () => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User'
      },
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  }));

  // Mock Supabase client with comprehensive query methods
  const createMockQueryBuilder = () => ({
    select: vi.fn(() => createMockQueryBuilder()),
    insert: vi.fn(() => createMockQueryBuilder()),
    update: vi.fn(() => createMockQueryBuilder()),
    delete: vi.fn(() => createMockQueryBuilder()),
    upsert: vi.fn(() => createMockQueryBuilder()),
    
    // Filter methods
    eq: vi.fn(() => createMockQueryBuilder()),
    neq: vi.fn(() => createMockQueryBuilder()),
    gt: vi.fn(() => createMockQueryBuilder()),
    gte: vi.fn(() => createMockQueryBuilder()),
    lt: vi.fn(() => createMockQueryBuilder()),
    lte: vi.fn(() => createMockQueryBuilder()),
    like: vi.fn(() => createMockQueryBuilder()),
    ilike: vi.fn(() => createMockQueryBuilder()),
    is: vi.fn(() => createMockQueryBuilder()),
    in: vi.fn(() => createMockQueryBuilder()),
    contains: vi.fn(() => createMockQueryBuilder()),
    containedBy: vi.fn(() => createMockQueryBuilder()),
    rangeGt: vi.fn(() => createMockQueryBuilder()),
    rangeGte: vi.fn(() => createMockQueryBuilder()),
    rangeLt: vi.fn(() => createMockQueryBuilder()),
    rangeLte: vi.fn(() => createMockQueryBuilder()),
    rangeAdjacent: vi.fn(() => createMockQueryBuilder()),
    overlaps: vi.fn(() => createMockQueryBuilder()),
    textSearch: vi.fn(() => createMockQueryBuilder()),
    match: vi.fn(() => createMockQueryBuilder()),
    not: vi.fn(() => createMockQueryBuilder()),
    or: vi.fn(() => createMockQueryBuilder()),
    filter: vi.fn(() => createMockQueryBuilder()),
    
    // Ordering and pagination
    order: vi.fn(() => createMockQueryBuilder()),
    limit: vi.fn(() => createMockQueryBuilder()),
    range: vi.fn(() => createMockQueryBuilder()),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    
    // Final execution methods
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
    abortSignal: vi.fn(() => createMockQueryBuilder()),
  });

  vi.mock('@/lib/supabase/client', () => ({
    createSupabaseClient: () => ({
      from: vi.fn(() => createMockQueryBuilder()),
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
      },
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    }),
  }));

  // Mock Supabase server
  vi.mock('@/lib/supabase/server', () => ({
    createRouteHandlerClient: () => ({
      from: vi.fn(() => createMockQueryBuilder()),
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      },
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    }),
  }));
  
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
