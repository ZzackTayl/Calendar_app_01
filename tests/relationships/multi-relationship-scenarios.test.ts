import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { encryptEventDescription, decryptWithPrivacyCheck } from '@/lib/encryption/field-encryption';
import { getPrivacyBoundaryEngine } from '@/lib/privacy/boundary-engine';
import { generateInviteToken, createMobileInviteLink, createSmartInviteLink } from '@/lib/invitations/token-utils';

const ORIGINAL_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const TEST_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

let originalGetDirectRelationship: any;
let originalFindShortestRelationshipPath: any;
let originalGetEffectivePrivacyLevel: any;
let originalCanAccessField: any;
let enginePrototype: any;

const ensureLocalStorage = () => {
  if (typeof globalThis.localStorage !== 'undefined') {
    return;
  }

  const storage = new Map<string, string>();
  const storageImpl = {
    get length() {
      return storage.size;
    },
    clear: () => {
      storage.clear();
    },
    getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    }
  } as Storage;

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    value: storageImpl
  });

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      value: storageImpl
    });
  }
};

describe('Multi-Relationship Scenarios', () => {
  const ownerId = 'user-owner';
  const directPartnerId = 'user-direct-partner';
  const busyOnlyPartnerId = 'user-busy-partner';
  const metamourId = 'user-metamour';
  const privacyEngine = getPrivacyBoundaryEngine();

  beforeAll(() => {
    ensureLocalStorage();
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    enginePrototype = Object.getPrototypeOf(privacyEngine);
    originalGetDirectRelationship = enginePrototype.getDirectRelationship;
    originalFindShortestRelationshipPath = enginePrototype.findShortestRelationshipPath;
    originalGetEffectivePrivacyLevel = privacyEngine.getEffectivePrivacyLevel.bind(privacyEngine);
    originalCanAccessField = privacyEngine.canAccessField.bind(privacyEngine);
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
    if (enginePrototype && originalGetDirectRelationship) {
      enginePrototype.getDirectRelationship = originalGetDirectRelationship;
    }
    if (enginePrototype && originalFindShortestRelationshipPath) {
      enginePrototype.findShortestRelationshipPath = originalFindShortestRelationshipPath;
    }
    if (originalGetEffectivePrivacyLevel) {
      privacyEngine.getEffectivePrivacyLevel = originalGetEffectivePrivacyLevel;
    }
    if (originalCanAccessField) {
      privacyEngine.canAccessField = originalCanAccessField;
    }
    globalThis.localStorage?.clear();
  });

  beforeEach(() => {
    enginePrototype.getDirectRelationship = function(userId1: string, userId2: string) {
      const pair = [userId1, userId2].join(':');
      if (pair === `${directPartnerId}:${ownerId}` || pair === `${ownerId}:${directPartnerId}`) {
        return { tier: 'details', established: new Date() };
      }
      if (pair === `${busyOnlyPartnerId}:${ownerId}` || pair === `${ownerId}:${busyOnlyPartnerId}`) {
        return { tier: 'busy_only', established: new Date() };
      }
      return null;
    };

    enginePrototype.findShortestRelationshipPath = function(fromUserId: string, toUserId: string) {
      if (fromUserId === metamourId && toUserId === ownerId) {
        return {
          intermediateUsers: [directPartnerId],
          shortestDistance: 2,
          weakestLink: 'busy_only'
        };
      }
      return null;
    };

    privacyEngine.getEffectivePrivacyLevel = (viewerId: string, owner: string, basePrivacy: any) => {
      if (viewerId === directPartnerId && owner === ownerId) {
        return {
          canView: true,
          canViewDetails: true,
          effectivePrivacyLevel: basePrivacy === 'details' ? 'details' : 'private',
          reason: 'TEST_DIRECT_RELATIONSHIP',
          enforcementRules: []
        };
      }
      if (viewerId === busyOnlyPartnerId && owner === ownerId) {
        return {
          canView: true,
          canViewDetails: false,
          effectivePrivacyLevel: 'busy_only',
          reason: 'TEST_BUSY_ONLY_RELATIONSHIP',
          enforcementRules: []
        };
      }
      if (viewerId === metamourId && owner === ownerId) {
        return {
          canView: false,
          canViewDetails: false,
          effectivePrivacyLevel: 'private',
          reason: 'TEST_METAMOUR_ACCESS',
          enforcementRules: []
        };
      }
      return {
        canView: false,
        canViewDetails: false,
        effectivePrivacyLevel: 'private',
        reason: 'TEST_NO_RELATIONSHIP',
        enforcementRules: []
      };
    };

    privacyEngine.canAccessField = (viewerId: string, owner: string, fieldType: any, privacyLevel: any) => {
      if (viewerId === directPartnerId && owner === ownerId) {
        return true;
      }
      if (viewerId === busyOnlyPartnerId && owner === ownerId) {
        return fieldType !== 'description';
      }
      return false;
    };

    privacyEngine.invalidateRelationshipCache();
  });

  const createEncryptedDescription = (eventId: string, message: string) =>
    encryptEventDescription(message, 'private', {
      ownerId,
      eventId,
      privacyLevel: 'private'
    });

  describe('Complex Polycule Dynamics', () => {
    it('protects private details from busy-only partners', () => {
      const eventId = 'event-direct-access';
      const secret = 'Dinner at the speakeasy at 8pm';

      const ownerView = decryptWithPrivacyCheck(secret, ownerId, {
        ownerId,
        fieldType: 'description',
        privacyLevel: 'details',
        eventId
      });
      expect(ownerView).toBe(secret);

      const busyOnlyView = decryptWithPrivacyCheck(secret, busyOnlyPartnerId, {
        ownerId,
        fieldType: 'description',
        privacyLevel: 'details',
        eventId
      });
      expect(busyOnlyView).toBe('[Private]');
    });

    it('prevents metamours from viewing sensitive details even when indirectly connected', () => {
      const eventId = 'event-metamour';
      const secret = 'Weekend retreat at secluded cabin';
      const metamourView = decryptWithPrivacyCheck(secret, metamourId, {
        ownerId,
        fieldType: 'description',
        privacyLevel: 'details',
        eventId
      });

      expect(metamourView).toBe('[Private]');
    });
  });

  describe('Invitation Flows', () => {
    it('generates cryptographically strong invitation tokens', () => {
      const firstToken = generateInviteToken();
      const secondToken = generateInviteToken();

      expect(firstToken.token).toHaveLength(64);
      expect(firstToken.tokenHash).toHaveLength(64);
      expect(firstToken.tokenHash).not.toBe(firstToken.token);
      expect(firstToken.token).not.toBe(secondToken.token);
      expect(firstToken.tokenHash).not.toBe(secondToken.tokenHash);
    });

    it('creates mobile-aware invite links that preserve universal access', () => {
      const token = 'sample-token';
      const universalLink = createMobileInviteLink(token, { baseUrl: 'https://polyharmony.test' });
      expect(universalLink).toBe('https://polyharmony.test/invitation/accept/sample-token');

      const smartLinkMobile = createSmartInviteLink(token, 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)');
      expect(smartLinkMobile).toContain('/invitation/accept/sample-token');

      const smartLinkDesktop = createSmartInviteLink(token, 'Mozilla/5.0 (Macintosh; Intel Mac OS X)');
      expect(smartLinkDesktop).toContain('/invitation/accept/sample-token');
    });
  });
});
