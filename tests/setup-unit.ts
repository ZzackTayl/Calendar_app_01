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
import { initializeTestSecrets } from '@/config/testing/test-secrets';

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

initializeTestSecrets();

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
  'KEY_DERIVATION_SECRET',
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required unit test environment variable: ${key}`);
  }
});

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

// Mock the direct supabase-js import as well
vi.mock('@supabase/supabase-js', () => {
  const mockClient = createMockSupabaseClient();
  return {
    createClient: vi.fn(() => mockClient),
    createBrowserClient: vi.fn(() => mockClient),
    createServerClient: vi.fn(() => mockClient),
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

// Simplify Popover for unit tests so content renders inline when "open"
vi.mock('@/components/ui/popover', () => {
  const PopoverContext = React.createContext({
    open: false,
    setOpen: (next: boolean) => {
      /* noop */
    },
  });

  const Popover: React.FC<{ open?: boolean; onOpenChange?: (open: boolean) => void }> = ({ open, onOpenChange, children }) => {
    const [internalOpen, setInternalOpen] = React.useState(open ?? false);

    const contextValue = React.useMemo(
      () => ({
        open: open ?? internalOpen,
        setOpen: (next: boolean) => {
          if (onOpenChange) {
            onOpenChange(next);
          } else {
            setInternalOpen(next);
          }
        },
      }),
      [open, internalOpen, onOpenChange]
    );

    return React.createElement(PopoverContext.Provider, { value: contextValue }, children);
  };

  const PopoverTrigger: React.FC<{ asChild?: boolean; children: React.ReactElement }> = ({ asChild, children }) => {
    const { open, setOpen } = React.useContext(PopoverContext);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(event);
      setOpen(!open);
    };

    if (asChild) {
      return React.cloneElement(children, {
        onClick: handleClick,
        'aria-expanded': open,
      });
    }

    return React.createElement('button', { type: 'button', onClick: handleClick, 'aria-expanded': open }, children);
  };

  const PopoverContent: React.FC<React.ComponentProps<'div'>> = ({ children, ...props }) => {
    const { open } = React.useContext(PopoverContext);
    if (!open) return null;
    return React.createElement('div', { role: 'presentation', ...props }, children);
  };

  return {
    Popover,
    PopoverTrigger,
    PopoverContent,
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

// Mock encryption services (do NOT mock the encryption modules globally to allow module-specific tests to control behavior)
const mockEncryption = createMockEncryption();
const mockFieldEncryption = createMockFieldEncryption();

// If a specific test needs mocks, it should vi.mock('@/lib/encryption', ...) within the test.
// We intentionally avoid global mocking here to keep encryption unit tests valid.

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

// Mock Privacy Boundary Engine
vi.mock('@/lib/privacy/boundary-engine', () => ({
  getPrivacyBoundaryEngine: vi.fn(() => ({
    getEffectivePrivacyLevel: vi.fn((viewerId: string, ownerId: string, basePrivacy: string) => {
      // Simple mock logic for testing
      if (viewerId === ownerId) {
        return {
          canView: true,
          canViewDetails: true,
          effectivePrivacyLevel: basePrivacy,
          reason: 'Owner access',
          enforcementRules: ['OWNER_FULL_ACCESS']
        };
      }
      
      // Check demo relationships from localStorage
      let relationshipTier = 'none';
      if (typeof localStorage !== 'undefined') {
        try {
          const relationships = JSON.parse(localStorage.getItem('demo_key_mgmt_demo_relationships') || '[]');
          const relationship = relationships.find((rel: any) => 
            (rel.user1Id === viewerId && rel.user2Id === ownerId) ||
            (rel.user1Id === ownerId && rel.user2Id === viewerId)
          );
          if (relationship) {
            relationshipTier = relationship.tier;
          }
        } catch (e) {
          // Ignore localStorage errors in tests
        }
      }
      
      // Apply privacy access matrix
      if (basePrivacy === 'private') {
        return {
          canView: false,
          canViewDetails: false,
          effectivePrivacyLevel: 'private',
          reason: 'Private content - owner only',
          enforcementRules: ['OWNER_ONLY_ACCESS']
        };
      }
      
      // For other privacy levels, check relationship tier
      if (relationshipTier === 'details') {
        return {
          canView: true,
          canViewDetails: basePrivacy === 'details' || basePrivacy === 'visible' || basePrivacy === 'public',
          effectivePrivacyLevel: basePrivacy,
          reason: `Details tier relationship allows ${basePrivacy} access`,
          enforcementRules: ['DETAILS_TIER_ACCESS']
        };
      }
      
      if (relationshipTier === 'busy_only') {
        if (basePrivacy === 'details') {
          // Downgrade details to busy_only for busy_only tier relationships
          return {
            canView: true,
            canViewDetails: false,
            effectivePrivacyLevel: 'busy_only',
            reason: 'Details privacy downgraded to busy_only for relationship tier',
            enforcementRules: ['PRIVACY_DOWNGRADE_APPLIED']
          };
        }
        
        return {
          canView: true,
          canViewDetails: false,
          effectivePrivacyLevel: basePrivacy,
          reason: `Busy_only tier allows ${basePrivacy} access`,
          enforcementRules: ['BUSY_ONLY_TIER_ACCESS']
        };
      }
      
      // No relationship - only public content
      if (basePrivacy === 'public') {
        return {
          canView: true,
          canViewDetails: true,
          effectivePrivacyLevel: 'public',
          reason: 'Public content available to all',
          enforcementRules: ['PUBLIC_ACCESS']
        };
      }
      
      // Default deny for no relationship
      return {
        canView: false,
        canViewDetails: false,
        effectivePrivacyLevel: 'private',
        reason: 'No relationship - access denied',
        enforcementRules: ['NO_RELATIONSHIP_BLOCK']
      };
    }),
    
    canAccessField: vi.fn((viewerId: string, ownerId: string, fieldType: string, privacyLevel: string) => {
      if (viewerId === ownerId) return true;
      if (fieldType === 'notes') return false; // Notes are always owner-only
      if (privacyLevel === 'private') return false; // Private content is owner-only
      
      // Check relationship tier for other privacy levels
      let relationshipTier = 'none';
      if (typeof localStorage !== 'undefined') {
        try {
          const relationships = JSON.parse(localStorage.getItem('demo_key_mgmt_demo_relationships') || '[]');
          const relationship = relationships.find((rel: any) => 
            (rel.user1Id === viewerId && rel.user2Id === ownerId) ||
            (rel.user1Id === ownerId && rel.user2Id === viewerId)
          );
          if (relationship) {
            relationshipTier = relationship.tier;
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
      
      // Field-level access rules
      if (fieldType === 'description' || fieldType === 'location') {
        // High sensitivity fields require details tier for private/semi_private content
        if (privacyLevel === 'semi_private') {
          return relationshipTier === 'details';
        }
        return relationshipTier === 'details' || relationshipTier === 'busy_only';
      }
      
      if (fieldType === 'title') {
        // Lower sensitivity - allow for busy_only and up
        return relationshipTier !== 'none';
      }
      
      return relationshipTier !== 'none';
    }),
    
    analyzeRelationshipPath: vi.fn((fromUserId: string, toUserId: string) => ({
      fromUserId,
      toUserId,
      directRelationship: fromUserId !== toUserId ? { tier: 'details', established: new Date() } : null
    })),
    
    invalidateRelationshipCache: vi.fn()
  })),
  
  PrivacyBoundaryEngine: vi.fn(),
  RelationshipChainAnalyzer: vi.fn()
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
