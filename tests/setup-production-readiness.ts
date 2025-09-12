/**
 * Production Readiness Test Setup Configuration
 * 
 * This file configures the test environment specifically for production readiness tests with:
 * - Minimal mocking to allow real crypto operations
 * - Real key derivation and encryption functions  
 * - Isolated test environment for security validation
 * - No mocking of core crypto functions
 */

import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';

// Make React globally available for JSX
global.React = React;

// Mock environment variables for production readiness testing
process.env.NODE_ENV = 'test';
process.env.TEST_TYPE = 'production_readiness';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock_anon_key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'mock_anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_role_key';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.KEY_DERIVATION_SECRET = 'production-test-derivation-secret-for-crypto-validation';

// ===================================================================
// MINIMAL MOCKING SETUP - ALLOW REAL CRYPTO
// ===================================================================

// Only mock external services that are not core to crypto validation
vi.mock('@supabase/supabase-js', () => {
  const createMockClient = () => ({
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => Promise.resolve({ data: null, error: null }),
          limit: (count: number) => Promise.resolve({ data: [], error: null })
        }),
        or: (condition: string) => ({
          single: () => Promise.resolve({ data: null, error: null })
        }),
        in: (column: string, values: any[]) => Promise.resolve({ data: [], error: null })
      }),
      insert: (data: any) => Promise.resolve({ 
        data: Array.isArray(data) ? data : [data], 
        error: null 
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => Promise.resolve({ 
          data: null, 
          error: null 
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => Promise.resolve({ 
          data: null, 
          error: null 
        })
      })
    }),
    auth: {
      getUser: () => Promise.resolve({ 
        data: { user: null }, 
        error: null 
      }),
      signUp: () => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: null 
      }),
      signInWithPassword: () => Promise.resolve({ 
        data: { user: null, session: null }, 
        error: null 
      }),
      signOut: () => Promise.resolve({ error: null })
    },
    realtime: {
      channel: () => ({
        on: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      })
    }
  });

  return {
    createClient: vi.fn(createMockClient),
    createBrowserClient: vi.fn(createMockClient),
    createServerClient: vi.fn(createMockClient),
  };
});

// Mock localStorage for demo key management
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock Next.js modules minimally
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    toString: vi.fn(() => ''),
  })),
  usePathname: vi.fn(() => '/'),
  useParams: vi.fn(() => ({})),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock jest to avoid conflicts in vitest environment  
global.jest = undefined;

// ===================================================================
// DO NOT MOCK CRYPTO - ALLOW REAL OPERATIONS
// ===================================================================
// Note: We specifically DO NOT mock the 'crypto' module here
// This allows real cryptographic operations for security validation

// ===================================================================
// TEST LIFECYCLE HOOKS
// ===================================================================

beforeAll(async () => {
  console.log('🔒 Starting production readiness test suite with real crypto');
  
  // Set up global fetch mock
  vi.stubGlobal('fetch', vi.fn());
  
  // Mock window object for browser-specific tests
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
  });

  // Mock performance for Node.js environment
  if (typeof performance === 'undefined') {
    global.performance = {
      now: () => Date.now(),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn(() => []),
      getEntriesByType: vi.fn(() => []),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
    } as any;
  }
});

afterAll(async () => {
  console.log('🔒 Production readiness test suite completed');
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Clear localStorage between tests
  localStorageMock.clear();
  
  // Clear any fetch mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllTimers();
});

console.log('🔒 Production readiness test setup completed - real crypto enabled');