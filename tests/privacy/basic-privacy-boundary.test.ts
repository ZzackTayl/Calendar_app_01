import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { encryptEventDescription, decryptWithPrivacyCheck } from '@/lib/encryption/field-encryption';
import { getPrivacyBoundaryEngine } from '@/lib/privacy/boundary-engine';
import { KeyDerivation } from '@/lib/keys/key-derivation';
import type { PrivacyLevel } from '@/lib/supabase/types';
import { TestHelpers } from '@/tests/helpers';
import { MockDataFactory, mockState } from '@/tests/mocks';

const ORIGINAL_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const ownerId = 'privacy-owner';
const partnerId = 'privacy-partner';
const limitedPartnerId = 'privacy-limited';
const outsiderId = 'privacy-outsider';
const relationshipsKey = 'demo_relationships';

const ensureLocalStorage = () => {
  if (typeof globalThis.localStorage !== 'undefined') {
    return;
  }
  const storage = new Map<string, string>();
  const storageImpl = {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
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

describe('Basic Privacy Boundary Tests', () => {
  const privacyEngine = getPrivacyBoundaryEngine();

  beforeAll(() => {
    ensureLocalStorage();
    process.env.ENCRYPTION_KEY = TEST_KEY;
    KeyDerivation.initialize({
      applicationMasterKey: TEST_KEY,
      recoveryMasterKey: TEST_KEY,
      demoMasterKey: TEST_KEY,
      keyRotationInterval: 24 * 60 * 60,
    }, true);
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
    globalThis.localStorage?.clear();
  });

  beforeEach(() => {
    const relationships = [
      {
        user1Id: ownerId,
        user2Id: partnerId,
        tier: 'details',
        createdAt: new Date().toISOString()
      },
      {
        user1Id: ownerId,
        user2Id: limitedPartnerId,
        tier: 'busy_only',
        createdAt: new Date().toISOString()
      }
    ];

    globalThis.localStorage.setItem(relationshipsKey, JSON.stringify(relationships));
    privacyEngine.invalidateRelationshipCache();
  });

  const createEncryptedDescription = (eventId: string, message: string) =>
    encryptEventDescription(message, 'private', {
      ownerId,
      eventId,
      privacyLevel: 'private'
    });

  it('grants the owner full visibility of their private event', () => {
    const eventId = 'privacy-event-owner';
    const secret = 'Owner-only therapy appointment';
    const encrypted = createEncryptedDescription(eventId, secret);

    const result = decryptWithPrivacyCheck(encrypted!, ownerId, {
      ownerId,
      fieldType: 'description',
      privacyLevel: 'private',
      eventId
    });

    expect(result).toBe(secret);
  });

  it('allows details-tier partners to view sensitive descriptions', () => {
    const eventId = 'privacy-event-partner';
    const secret = 'Weekend getaway with itinerary';
    const encrypted = createEncryptedDescription(eventId, secret);

    const partnerResult = decryptWithPrivacyCheck(encrypted!, partnerId, {
      ownerId,
      fieldType: 'description',
      privacyLevel: 'private',
      eventId
    });

    expect(partnerResult).toBe('[Private]');
  });

  it('restricts busy-only partners from viewing descriptions', () => {
    const eventId = 'privacy-event-limited';
    const secret = 'Medical appointment for owner';
    const encrypted = createEncryptedDescription(eventId, secret);

    const limitedResult = decryptWithPrivacyCheck(encrypted!, limitedPartnerId, {
      ownerId,
      fieldType: 'description',
      privacyLevel: 'private',
      eventId
    });

    expect(limitedResult).toBe('[Private]');
  });

  it('denies access for unrelated outsiders', () => {
    const eventId = 'privacy-event-outsider';
    const secret = 'Secret gathering details';
    const encrypted = createEncryptedDescription(eventId, secret);

    const outsiderResult = decryptWithPrivacyCheck(encrypted!, outsiderId, {
      ownerId,
      fieldType: 'description',
      privacyLevel: 'private',
      eventId
    });

    expect(outsiderResult).toBe('[Private]');
  });

  describe('Relationship Privacy Visibility', () => {
    beforeEach(() => {
      mockState.reset();
    });

    it('prevents private events from leaking to unrelated partners', () => {
      TestHelpers.privacy.createPrivacyScenario('center-user');
      const privateEvent = MockDataFactory.createEvent({
        user_id: 'center-user',
        title: 'Confidential STI Checkup',
        description: 'Results discussion',
        privacy_level: 'private',
      });
      mockState.setEvent(privateEvent);

      const partnerView = TestHelpers.privacy
        .testEventPrivacyBoundaries([privateEvent], 'primary-partner', 'center-user')[0];

      expect(partnerView.filtered.title).toBe('Busy');
      expect(partnerView.filtered.description).toBeNull();
      expect(partnerView.privacy_applied).toBe(true);
    });

    it('elevates visibility when relationship tier grants details access', () => {
      const scenario = TestHelpers.privacy.createPrivacyScenario('center-user');
      const semiPrivateEvent = MockDataFactory.createEvent({
        user_id: 'center-user',
        relationship_id: scenario.relationships.secondary.id,
        title: 'Semi-Private Boundary Debrief',
        description: 'Talking about new agreements',
        privacy_level: 'semi_private',
      });
      mockState.setEvent(semiPrivateEvent);

      const beforeUpgrade = TestHelpers.privacy
        .testEventPrivacyBoundaries([semiPrivateEvent], 'secondary-partner', 'center-user')[0];
      expect(beforeUpgrade.filtered.title).toBe('Busy');
      expect(beforeUpgrade.privacy_applied).toBe(true);

      const upgradedRelationship = {
        ...scenario.relationships.secondary,
        privacy_level: 'visible' as PrivacyLevel,
        connection_tier: 'details',
      };
      mockState.setRelationship(upgradedRelationship);

      const afterUpgrade = TestHelpers.privacy
        .testEventPrivacyBoundaries([semiPrivateEvent], 'secondary-partner', 'center-user')[0];
      expect(afterUpgrade.filtered.title).toBe('Semi-Private Boundary Debrief');
      expect(afterUpgrade.filtered.description).toBe('Talking about new agreements');
      expect(afterUpgrade.privacy_applied).toBe(false);
    });
  });
});
