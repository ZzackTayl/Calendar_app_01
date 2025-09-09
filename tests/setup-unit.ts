/**
 * Unit Test Setup Configuration
 * 
 * This file configures the test environment specifically for unit tests with:
 * - Full mocking of external dependencies
 * - Fast execution times
 * - Isolated test environment
 * - No real database or network calls
 */

import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';

// Import our comprehensive mocking framework
import {
  createMockSupabaseClient,
  createMockAuth,
  createMockEncryption,
  createMockFieldEncryption,
  createMockPrivacyService,
  createMockConflictDetection,
  createMockEmailService,
  createMockRealtimeManager,
  mockState,
  MockDataFactory
} from './mocks';

// Make React globally available for JSX
global.React = React;

// Mock environment variables for unit testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock_anon_key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_role_key';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.KEY_DERIVATION_SECRET = 'test-derivation-secret-for-unit-tests';

// ===================================================================
// COMPREHENSIVE MOCKING SETUP
// ===================================================================

// Mock Supabase client - comprehensive mocking
vi.mock('@/lib/supabase/client', () => {
  const mockClient = createMockSupabaseClient();
  return {
    createClient: vi.fn(() => mockClient),
    createSupabaseClient: vi.fn(() => mockClient),
    supabase: mockClient,
  };
});

vi.mock('@/lib/supabase/server', () => {
  const mockClient = createMockSupabaseClient();
  return {
    createRouteHandlerClient: vi.fn(() => mockClient),
    createServerClient: vi.fn(() => mockClient),
    createServiceClient: vi.fn(() => mockClient),
  };
});

// Mock authentication services
vi.mock('@/lib/auth/session-manager', () => ({
  SessionManager: {
    getCurrentUser: vi.fn().mockImplementation(async () => {
      const user = mockState.getUser('test-user-1') || MockDataFactory.createUser({ id: 'test-user-1' });
      return { user, error: null };
    }),
    validateSession: vi.fn().mockResolvedValue({ valid: true, user: null }),
    refreshSession: vi.fn().mockResolvedValue({ success: true }),
    signOut: vi.fn().mockResolvedValue({ success: true }),
  }
}));

// Mock encryption services
const mockEncryption = createMockEncryption();
const mockFieldEncryption = createMockFieldEncryption();

vi.mock('@/lib/encryption', () => mockEncryption);
vi.mock('@/lib/encryption/field-encryption', () => mockFieldEncryption);
vi.mock('@/lib/browser-encryption', () => mockEncryption);

// Mock privacy services
const mockPrivacyService = createMockPrivacyService();
vi.mock('@/lib/privacy/privacy-enforcement', () => ({
  PrivacyEnforcement: mockPrivacyService,
  checkPrivacyPermission: mockPrivacyService.checkPrivacyPermission,
  filterEventsByPrivacy: mockPrivacyService.filterEventsByPrivacy,
}));

vi.mock('@/lib/permissions/permission-service', () => mockPrivacyService);
vi.mock('@/lib/privacy-utils', () => ({
  getPrivacyIcon: vi.fn((level: string) => ({ type: 'icon', level })),
  getPrivacyLabel: vi.fn((level: string) => level.charAt(0).toUpperCase() + level.slice(1)),
  getPrivacyDescription: vi.fn((level: string) => `Description for ${level}`),
  getPrivacyVariant: vi.fn(() => 'default'),
  mapLegacyToConnectionTier: vi.fn((level: string) => 'details'),
  mapLegacyToPrivacyOverride: vi.fn(() => 'default'),
}));

// Mock conflict detection
const mockConflictDetection = createMockConflictDetection();
vi.mock('@/lib/conflict-detection/enhanced-multi-partner-checker', () => ({
  EnhancedMultiPartnerChecker: class MockEnhancedMultiPartnerChecker {
    constructor() {}
    checkBatch = mockConflictDetection.checkBatch;
    checkSingle = mockConflictDetection.checkSingle;
  }
}));

vi.mock('@/lib/conflicts/conflict-detection', () => ({
  ConflictDetection: {
    checkBatch: mockConflictDetection.checkBatch,
    checkSingle: mockConflictDetection.checkSingle,
  }
}));

// Mock email services
const mockEmailService = createMockEmailService();
vi.mock('@/lib/email/invitation-service', () => ({
  InvitationEmailService: mockEmailService,
  sendInvitation: mockEmailService.sendInvitation,
  sendWelcomeEmail: mockEmailService.sendWelcomeEmail,
}));

// Mock email providers
vi.mock('@/lib/email/providers/aws-ses', () => mockEmailService);
vi.mock('@/lib/email/providers/sendgrid', () => mockEmailService);
vi.mock('@/lib/email/providers/resend', () => mockEmailService);
vi.mock('@/lib/email/providers/nodemailer', () => mockEmailService);

// Mock real-time services
const mockRealtimeManager = createMockRealtimeManager();
vi.mock('@/lib/realtime-manager', () => ({
  RealtimeManager: mockRealtimeManager,
  subscribe: mockRealtimeManager.subscribe,
  publish: mockRealtimeManager.publish,
}));

vi.mock('@/lib/supabase/realtime', () => ({
  RealtimeClient: mockRealtimeManager,
  createRealtimeClient: vi.fn(() => mockRealtimeManager),
}));

// Mock Next.js modules
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

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    entries: vi.fn(),
    values: vi.fn(),
  })),
}));

// Mock Node.js crypto for consistent test results
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomBytes: vi.fn((size: number) => Buffer.alloc(size, 'test')),
    randomUUID: actual.randomUUID,
    createHash: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hash'),
    })),
    createHmac: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn(() => 'mock-hmac'),
    })),
    timingSafeEqual: vi.fn(() => true),
    // Properly mock pbkdf2 for key derivation tests
    pbkdf2: vi.fn((password, salt, iterations, keylen, digest, callback) => {
      // Simulate async behavior
      setTimeout(() => {
        const derivedKey = Buffer.alloc(keylen, 'derived-key');
        callback(null, derivedKey);
      }, 0);
    }),
    // Properly mock scrypt for key derivation tests
    scrypt: vi.fn((password, salt, keylen, options, callback) => {
      setTimeout(() => {
        const derivedKey = Buffer.alloc(keylen, 'scrypt-key');
        callback(null, derivedKey);
      }, 0);
    }),
    // Keep cipher methods for encryption tests
    createCipheriv: actual.createCipheriv,
    createDecipheriv: actual.createDecipheriv,
    createCipherGCM: actual.createCipheriv, // GCM is a mode of createCipheriv
    createDecipherGCM: actual.createDecipheriv,
  };
});

// Mock external APIs and services
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
        getAccessToken: vi.fn().mockResolvedValue({ token: 'mock-token' }),
      })),
    },
    calendar: vi.fn(() => ({
      events: {
        list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        insert: vi.fn().mockResolvedValue({ data: { id: 'mock-event-id' } }),
        update: vi.fn().mockResolvedValue({ data: { id: 'mock-event-id' } }),
        delete: vi.fn().mockResolvedValue({}),
      },
    })),
  },
}));

// Mock Twilio for SMS
vi.mock('twilio', () => {
  return vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: 'mock-message-sid',
        status: 'delivered',
      }),
    },
  }));
});

// Mock @node-rs/argon2 for key derivation tests
vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(async (password, options) => {
    // Return a mock Argon2 hash format
    const salt = options.salt ? options.salt.toString('base64') : 'mocksalt';
    const hash = Buffer.alloc(options.outputLen || 32, 'argon2-hash').toString('base64');
    return `$argon2id$v=19$m=${options.memoryCost},t=${options.timeCost},p=${options.parallelism}$${salt}$${hash}`;
  }),
  verify: vi.fn(async (hash, password) => {
    // Simple mock verification - always return true for testing
    return true;
  })
}));

// ===================================================================
// TEST LIFECYCLE HOOKS
// ===================================================================

beforeAll(async () => {
  console.log('🧪 Starting unit test suite with comprehensive mocking');
  
  // Initialize mock state with default test user
  const testUser = MockDataFactory.createUser({ id: 'test-user-1', email: 'test@example.com' });
  mockState.setUser(testUser);
  
  // Set up any global test configuration
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
});

afterAll(async () => {
  console.log('🧪 Unit test suite completed');
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  
  // Reset mock state to clean slate
  mockState.reset();
  
  // Re-add default test user for consistency
  const testUser = MockDataFactory.createUser({ id: 'test-user-1', email: 'test@example.com' });
  mockState.setUser(testUser);
  
  // Reset ID counter for deterministic test data
  MockDataFactory.resetIdCounter();
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllTimers();
});

// ===================================================================
// TEST UTILITIES
// ===================================================================

// Global test utilities available in all unit tests
global.testUtils = {
  createTestUser: MockDataFactory.createUser,
  createTestRelationship: MockDataFactory.createRelationship,
  createTestEvent: MockDataFactory.createEvent,
  createTestScenario: MockDataFactory.createPolyculeNetwork,
  mockState,
  
  // Fast-forward timers utility
  advanceTime: (ms: number) => {
    vi.advanceTimersByTime(ms);
  },
  
  // Wait for async operations
  waitForAsync: () => new Promise(resolve => setTimeout(resolve, 0)),
};

console.log('🧪 Unit test setup completed - all external dependencies mocked');
