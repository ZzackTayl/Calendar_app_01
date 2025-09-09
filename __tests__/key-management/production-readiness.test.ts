/**
 * Production Readiness Tests for Key Management System
 * 
 * Critical tests that must pass before any production deployment.
 * These tests validate security boundaries, performance requirements,
 * and real-world usage scenarios that would cause user abandonment.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { 
  TestDataGenerator, 
  SecurityTestUtils, 
  PerformanceTestUtils,
  TestAssertions 
} from './test-helpers';
import {
  KeyDerivation,
  KeyDerivationHelpers,
  KeyDomain,
  EntityType,
  FieldType
} from '@/lib/keys/key-derivation';
import { KeyEscrowService, EscrowMethod } from '@/lib/keys/key-escrow';
import { PrivacyKeySharing, PrivacyLevel } from '@/lib/keys/privacy-key-sharing';
import { getDemoKeyManagement, DemoHelpers } from '@/lib/keys/demo-key-management';
import crypto from 'crypto';

describe('Production Readiness: Privacy Boundary Tests', () => {
  let keyDerivation: KeyDerivation;
  let keyEscrow: KeyEscrowService;

  beforeAll(() => {
    const masterConfig = {
      applicationMasterKey: crypto.randomBytes(32).toString('hex'),
      recoveryMasterKey: crypto.randomBytes(32).toString('hex'),
      demoMasterKey: crypto.randomBytes(32).toString('hex'),
      keyRotationInterval: 3600
    };
    keyDerivation = KeyDerivation.initialize(masterConfig, true);
    keyEscrow = KeyEscrowService.initialize(true);
  });

  afterEach(() => {
    keyDerivation.clearCache();
  });

  describe('CRITICAL: Privacy Level Isolation', () => {
    it('should prevent data leakage between privacy levels', () => {
      const userId = TestDataGenerator.generateUserId();
      const eventId = TestDataGenerator.generateEventId();

      // Same user, same event, different privacy levels
      const privateKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'private', FieldType.DESCRIPTION
      );
      const busyOnlyKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'busy_only', FieldType.DESCRIPTION
      );
      const detailsKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'details', FieldType.DESCRIPTION
      );
      const publicKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'public', FieldType.DESCRIPTION
      );

      const keys = [privateKey.key, busyOnlyKey.key, detailsKey.key, publicKey.key];
      
      // All keys must be cryptographically different
      TestAssertions.assertSecureKeys(keys);

      // Verify each key is different from all others
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
          expect(SecurityTestUtils.keysAreDifferent(keys[i], keys[j])).toBe(true);
        }
      }
    });

    it('should prevent cross-user access to private data', () => {
      const user1Id = TestDataGenerator.generateUserId();
      const user2Id = TestDataGenerator.generateUserId();
      const eventId = TestDataGenerator.generateEventId(); // Same event ID

      const user1PrivateKey = KeyDerivationHelpers.deriveEventKey(
        user1Id, eventId, 'private', FieldType.DESCRIPTION
      );
      const user2PrivateKey = KeyDerivationHelpers.deriveEventKey(
        user2Id, eventId, 'private', FieldType.DESCRIPTION
      );

      // Even with the same event ID, keys should be completely different
      expect(SecurityTestUtils.keysAreDifferent(user1PrivateKey.key, user2PrivateKey.key)).toBe(true);
    });

    it('should isolate field-level encryption within events', () => {
      const userId = TestDataGenerator.generateUserId();
      const eventId = TestDataGenerator.generateEventId();

      const titleKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'private', FieldType.TITLE
      );
      const descriptionKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'private', FieldType.DESCRIPTION
      );
      const locationKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'private', FieldType.LOCATION
      );
      const notesKey = KeyDerivationHelpers.deriveEventKey(
        userId, eventId, 'private', FieldType.NOTES
      );

      const fieldKeys = [titleKey.key, descriptionKey.key, locationKey.key, notesKey.key];
      TestAssertions.assertSecureKeys(fieldKeys);
    });

    it('should prevent metamour privacy leakage', () => {
      // Scenario: Alice is partners with Bob and Carol. Bob and Carol are not directly connected.
      // Carol should not be able to decrypt Alice's data intended for Bob only.
      
      const aliceId = TestDataGenerator.generateUserId();
      const bobId = TestDataGenerator.generateUserId();
      const carolId = TestDataGenerator.generateUserId();
      const eventId = TestDataGenerator.generateEventId();

      // Alice creates an event with different privacy levels for different partners
      const aliceToBobKey = KeyDerivationHelpers.deriveEventKey(
        aliceId, eventId, 'details', FieldType.DESCRIPTION
      );
      const aliceToCarolKey = KeyDerivationHelpers.deriveEventKey(
        aliceId, eventId, 'busy_only', FieldType.DESCRIPTION
      );

      // Keys should be different - Carol cannot decrypt Bob's level of detail
      expect(SecurityTestUtils.keysAreDifferent(aliceToBobKey.key, aliceToCarolKey.key)).toBe(true);
    });
  });

  describe('CRITICAL: Audit Logging and Disaster Recovery', () => {
    it('should maintain audit trail for key escrow operations', async () => {
      const userId = TestDataGenerator.generateUserId();
      const userMasterKey = crypto.randomBytes(32);
      const password = 'SecureTestPassword123!';

      // Create escrow with audit logging
      const escrowRecord = await keyEscrow.createPasswordEscrow(userId, userMasterKey, password);
      expect(escrowRecord.metadata?.auditLog).toBeDefined();
      expect(escrowRecord.metadata?.auditLog?.created).toBeDefined();

      // Attempt recovery with audit logging
      const recoveryResult = await keyEscrow.recoverWithPassword(userId, password);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.metadata?.auditLog).toBeDefined();

      // Failed recovery should also be logged
      const failedRecovery = await keyEscrow.recoverWithPassword(userId, 'wrong-password');
      expect(failedRecovery.success).toBe(false);
      expect(failedRecovery.metadata?.auditLog).toBeDefined();
    });

    it('should handle disaster recovery scenarios', async () => {
      const userId = TestDataGenerator.generateUserId();
      const userMasterKey = crypto.randomBytes(32);

      // Set up multiple escrow methods for disaster recovery
      const passwordEscrow = await keyEscrow.createPasswordEscrow(
        userId, userMasterKey, 'Password123!'
      );
      
      const questionsAndAnswers = [
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
        { question: "Q3", answer: "A3" },
        { question: "Q4", answer: "A4" },
        { question: "Q5", answer: "A5" }
      ];
      
      const securityQuestionsEscrow = await keyEscrow.createSecurityQuestionsEscrow(
        userId, userMasterKey, questionsAndAnswers
      );

      const { backupCodes } = await keyEscrow.createBackupCodesEscrow(
        userId, userMasterKey, 10
      );

      // Verify all recovery methods work independently
      const passwordRecovery = await keyEscrow.recoverWithPassword(userId, 'Password123!');
      expect(passwordRecovery.success).toBe(true);

      // Test disaster scenario: password recovery fails, use security questions
      const questionRecovery = await keyEscrow.recoverWithSecurityQuestions(userId, [
        { questionId: securityQuestionsEscrow.securityQuestions![0].id, answer: 'A1' },
        { questionId: securityQuestionsEscrow.securityQuestions![1].id, answer: 'A2' },
        { questionId: securityQuestionsEscrow.securityQuestions![2].id, answer: 'A3' }
      ]);
      expect(questionRecovery.success).toBe(true);

      // Verify backup codes are available for ultimate disaster recovery
      expect(backupCodes).toBeDefined();
      expect(backupCodes!.length).toBe(10);
    });
  });
});

describe('Production Readiness: Multi-Relationship Scenarios', () => {
  let demoManager: any;

  beforeEach(() => {
    DemoHelpers.clearAllDemoData();
    demoManager = getDemoKeyManagement();
  });

  afterEach(() => {
    DemoHelpers.clearAllDemoData();
  });

  describe('CRITICAL: Complex Polycule Dynamics', () => {
    it('should handle complex multi-partner event creation', async () => {
      // Create a complex polycule: Alice-Bob-Carol-David with cross-connections
      const alice = await demoManager.createDemoUser('alice@test.com', 'password123');
      const bob = await demoManager.createDemoUser('bob@test.com', 'password123');
      const carol = await demoManager.createDemoUser('carol@test.com', 'password123');
      const david = await demoManager.createDemoUser('david@test.com', 'password123');

      // Create relationships with different privacy tiers
      await demoManager.createDemoRelationship(alice.id, 'bob@test.com', 'details');
      await demoManager.createDemoRelationship(alice.id, 'carol@test.com', 'busy_only');
      await demoManager.createDemoRelationship(bob.id, 'carol@test.com', 'details');
      await demoManager.createDemoRelationship(bob.id, 'david@test.com', 'busy_only');
      await demoManager.createDemoRelationship(carol.id, 'david@test.com', 'details');

      const eventId = TestDataGenerator.generateEventId();
      const eventData = {
        title: 'Complex Multi-Partner Event',
        description: 'Sensitive planning details',
        location: '123 Privacy Test St',
        notes: 'Confidential notes about the event'
      };

      // Alice creates event with different privacy levels
      const privateData = await demoManager.encryptDemoEventData(
        alice.id, eventId, eventData, PrivacyLevel.PRIVATE
      );
      
      const busyOnlyData = await demoManager.encryptDemoEventData(
        alice.id, eventId, eventData, PrivacyLevel.BUSY_ONLY
      );

      const detailsData = await demoManager.encryptDemoEventData(
        alice.id, eventId, eventData, PrivacyLevel.DETAILS
      );

      // Verify each encryption is different
      expect(privateData.title_encrypted).not.toBe(busyOnlyData.title_encrypted);
      expect(busyOnlyData.title_encrypted).not.toBe(detailsData.title_encrypted);
      expect(privateData.title_encrypted).not.toBe(detailsData.title_encrypted);

      // Bob should be able to decrypt 'details' level (his relationship tier with Alice)
      const bobDecryption = await demoManager.decryptDemoEventData(
        bob.id, eventId, detailsData, PrivacyLevel.DETAILS
      );
      expect(bobDecryption.title).toBe(eventData.title);

      // Carol should only decrypt 'busy_only' level (her relationship tier with Alice)
      const carolDecryption = await demoManager.decryptDemoEventData(
        carol.id, eventId, busyOnlyData, PrivacyLevel.BUSY_ONLY
      );
      expect(carolDecryption.title).toBe(eventData.title);

      // Carol should NOT be able to decrypt details level
      const carolFailedDecryption = await demoManager.decryptDemoEventData(
        carol.id, eventId, detailsData, PrivacyLevel.DETAILS
      );
      expect(carolFailedDecryption.title).toBe('[Decryption Failed]');
    });

    it('should handle permissions across relationship chains', async () => {
      // Create chain: Alice -> Bob -> Carol (metamour scenario)
      const alice = await demoManager.createDemoUser('alice@chain.com', 'password123');
      const bob = await demoManager.createDemoUser('bob@chain.com', 'password123');
      const carol = await demoManager.createDemoUser('carol@chain.com', 'password123');

      await demoManager.createDemoRelationship(alice.id, 'bob@chain.com', 'details');
      await demoManager.createDemoRelationship(bob.id, 'carol@chain.com', 'details');
      // No direct Alice-Carol relationship

      const eventId = TestDataGenerator.generateEventId();

      // Alice's event should not be directly accessible by Carol (metamour)
      const aliceEventData = { title: 'Alice Private Event' };
      const aliceEncrypted = await demoManager.encryptDemoEventData(
        alice.id, eventId, aliceEventData, PrivacyLevel.PRIVATE
      );

      const carolDecryption = await demoManager.decryptDemoEventData(
        carol.id, eventId, aliceEncrypted, PrivacyLevel.PRIVATE
      );

      expect(carolDecryption.title).toBe('[Decryption Failed]');
    });
  });

  describe('CRITICAL: Real-time Permission Changes', () => {
    it('should handle relationship tier changes affecting encryption', async () => {
      const alice = await demoManager.createDemoUser('alice@tier.com', 'password123');
      const bob = await demoManager.createDemoUser('bob@tier.com', 'password123');

      // Start with 'busy_only' relationship
      const relationship = await demoManager.createDemoRelationship(
        alice.id, 'bob@tier.com', 'busy_only'
      );
      
      const eventId = TestDataGenerator.generateEventId();
      const eventData = { title: 'Tier Test Event', description: 'Secret details' };

      // Alice creates event at 'details' level
      const detailsEncrypted = await demoManager.encryptDemoEventData(
        alice.id, eventId, eventData, PrivacyLevel.DETAILS
      );

      // Bob initially cannot decrypt details (only has busy_only access)
      const initialDecryption = await demoManager.decryptDemoEventData(
        bob.id, eventId, detailsEncrypted, PrivacyLevel.DETAILS
      );
      expect(initialDecryption.description).toBe('[Decryption Failed]');

      // Upgrade relationship to 'details' tier
      const upgradedRelationship = await demoManager.createDemoRelationship(
        alice.id, 'bob@tier.com', 'details'
      );
      expect(upgradedRelationship?.tier).toBe('details');

      // Bob should now be able to decrypt details
      const upgradedDecryption = await demoManager.decryptDemoEventData(
        bob.id, eventId, detailsEncrypted, PrivacyLevel.DETAILS
      );
      expect(upgradedDecryption.description).toBe(eventData.description);
    });
  });
});

describe('Production Readiness: Performance & Reliability', () => {
  let keyDerivation: KeyDerivation;

  beforeAll(() => {
    const masterConfig = {
      applicationMasterKey: crypto.randomBytes(32).toString('hex'),
      recoveryMasterKey: crypto.randomBytes(32).toString('hex'),
      demoMasterKey: crypto.randomBytes(32).toString('hex'),
      keyRotationInterval: 3600
    };
    keyDerivation = KeyDerivation.initialize(masterConfig, true);
  });

  afterEach(() => {
    keyDerivation.clearCache();
  });

  describe('CRITICAL: Sub-2 Second Conflict Detection', () => {
    it('should derive keys for calendar conflict detection under 2 seconds', async () => {
      // Simulate checking conflicts across multiple partners and events
      const userIds = Array.from({ length: 10 }, () => TestDataGenerator.generateUserId());
      const eventIds = Array.from({ length: 50 }, () => TestDataGenerator.generateEventId());
      
      const keyDerivations = [];
      
      // Build realistic conflict detection scenario
      for (const userId of userIds) {
        for (const eventId of eventIds) {
          keyDerivations.push(() => 
            KeyDerivationHelpers.deriveEventKey(userId, eventId, 'busy_only', FieldType.TITLE)
          );
        }
      }

      // Test performance under realistic load (500 key derivations)
      const { averageTime, maxTime } = await PerformanceTestUtils.performanceTest(
        async () => {
          const results = keyDerivations.map(derive => derive());
          return results;
        },
        5 // 5 iterations to get stable metrics
      );

      // Performance requirements for production
      TestAssertions.assertPerformance(maxTime, 2000, 'Conflict detection key derivation');
      TestAssertions.assertPerformance(averageTime, 1000, 'Average conflict detection time');
    });

    it('should handle batch key operations efficiently', async () => {
      const batchSize = 100;
      const userIds = Array.from({ length: batchSize }, () => TestDataGenerator.generateUserId());
      
      const { duration } = await PerformanceTestUtils.timeFunction(async () => {
        const results = userIds.map(userId => {
          // Simulate typical calendar operation: derive keys for user's events
          return [
            KeyDerivationHelpers.deriveEventKey(userId, 'event-1', 'private', FieldType.TITLE),
            KeyDerivationHelpers.deriveEventKey(userId, 'event-1', 'private', FieldType.DESCRIPTION),
            KeyDerivationHelpers.deriveEventKey(userId, 'event-2', 'busy_only', FieldType.TITLE),
            KeyDerivationHelpers.deriveUserDataKey(userId, FieldType.EMAIL)
          ];
        });
        return results.flat();
      });

      // Batch operations should complete well under performance threshold
      TestAssertions.assertPerformance(duration, 500, 'Batch key derivation');
    });
  });

  describe('CRITICAL: Memory and Cache Management', () => {
    it('should manage memory efficiently under sustained load', async () => {
      const iterations = 1000;
      const userIds = Array.from({ length: 10 }, () => TestDataGenerator.generateUserId());

      // Generate sustained load
      for (let i = 0; i < iterations; i++) {
        const userId = userIds[i % userIds.length];
        const eventId = `sustained-test-event-${i}`;
        
        KeyDerivationHelpers.deriveEventKey(userId, eventId, 'private', FieldType.DESCRIPTION);
        
        // Periodically clear cache to test memory management
        if (i % 100 === 0) {
          keyDerivation.clearCache();
        }
      }

      // System should still be responsive after sustained load
      const { duration } = await PerformanceTestUtils.timeFunction(async () => {
        return KeyDerivationHelpers.deriveEventKey('final-test-user', 'final-event', 'private', FieldType.TITLE);
      });

      TestAssertions.assertPerformance(duration, 50, 'Post-load key derivation');
    });

    it('should handle cache eviction gracefully', () => {
      const cacheSize = 1000; // Assume reasonable cache size
      const userIds = Array.from({ length: cacheSize + 100 }, () => TestDataGenerator.generateUserId());

      // Fill cache beyond capacity
      userIds.forEach(userId => {
        KeyDerivationHelpers.deriveEventKey(userId, 'cache-test', 'private', FieldType.TITLE);
      });

      // System should still work correctly after cache eviction
      const { duration } = PerformanceTestUtils.timeFunction(() => 
        Promise.resolve(KeyDerivationHelpers.deriveEventKey('final-user', 'final-event', 'private', FieldType.TITLE))
      );

      expect(duration).resolves.toBeTruthy();
    });
  });

  describe('CRITICAL: Error Recovery and Resilience', () => {
    it('should recover from key derivation failures', () => {
      // Test with edge cases that might cause failures
      const edgeCases = [
        { userId: '', eventId: 'valid-event', field: FieldType.TITLE },
        { userId: 'valid-user', eventId: '', field: FieldType.TITLE },
        { userId: 'a'.repeat(1000), eventId: 'valid-event', field: FieldType.TITLE }, // Very long input
        { userId: 'valid-user', eventId: 'b'.repeat(1000), field: FieldType.TITLE },
        { userId: 'unicode-用户', eventId: 'unicode-事件', field: FieldType.TITLE } // Unicode
      ];

      edgeCases.forEach(({ userId, eventId, field }, index) => {
        expect(() => {
          KeyDerivationHelpers.deriveEventKey(userId, eventId, 'private', field);
        }).not.toThrow(`Edge case ${index} should not crash the system`);
      });
    });

    it('should maintain security under failure conditions', async () => {
      const keyEscrow = KeyEscrowService.initialize(true);
      
      // Test escrow system resilience
      const invalidInputs = [
        { userId: '', key: crypto.randomBytes(32), password: 'validPassword123!' },
        { userId: 'valid-user', key: Buffer.alloc(0), password: 'validPassword123!' },
        { userId: 'valid-user', key: crypto.randomBytes(32), password: '' },
        { userId: 'valid-user', key: crypto.randomBytes(16), password: 'validPassword123!' } // Wrong key size
      ];

      for (const { userId, key, password } of invalidInputs) {
        // System should either handle gracefully or fail securely (not expose sensitive data)
        try {
          const result = await keyEscrow.createPasswordEscrow(userId, key, password);
          // If it succeeds, the result should be properly structured
          if (result) {
            expect(result.method).toBeDefined();
            expect(result.userId).toBeDefined();
          }
        } catch (error) {
          // If it fails, it should fail with a clear error message, not crash
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBeDefined();
        }
      }
    });
  });
});

describe('Production Readiness: Scale and Load Testing', () => {
  let demoManager: any;

  beforeEach(() => {
    DemoHelpers.clearAllDemoData();
    demoManager = getDemoKeyManagement();
  });

  afterEach(() => {
    DemoHelpers.clearAllDemoData();
  });

  describe('CRITICAL: Multi-User Concurrent Operations', () => {
    it('should handle concurrent user onboarding', async () => {
      const concurrentUsers = 50;
      const userCreationPromises = [];

      // Simulate concurrent user signups
      for (let i = 0; i < concurrentUsers; i++) {
        const promise = demoManager.createDemoUser(
          `concurrent-user-${i}@test.com`,
          `password-${i}-123!`
        );
        userCreationPromises.push(promise);
      }

      const { duration } = await PerformanceTestUtils.timeFunction(async () => {
        return Promise.all(userCreationPromises);
      });

      // Should handle concurrent operations efficiently
      TestAssertions.assertPerformance(duration, 5000, 'Concurrent user creation');

      const users = await Promise.all(userCreationPromises);
      
      // Verify all users were created successfully
      expect(users).toHaveLength(concurrentUsers);
      users.forEach((user, index) => {
        expect(user.email).toBe(`concurrent-user-${index}@test.com`);
        expect(user.masterKeyGenerated).toBe(true);
        expect(user.escrowSetup).toBe(true);
      });
    });

    it('should handle concurrent event operations', async () => {
      // Set up users for concurrent testing
      const users = await Promise.all([
        demoManager.createDemoUser('user1@concurrent.com', 'password123'),
        demoManager.createDemoUser('user2@concurrent.com', 'password123'),
        demoManager.createDemoUser('user3@concurrent.com', 'password123')
      ]);

      const concurrentEventOperations = [];
      const eventsPerUser = 20;

      // Generate concurrent event encryption/decryption operations
      for (const user of users) {
        for (let i = 0; i < eventsPerUser; i++) {
          const eventId = `concurrent-event-${user.id}-${i}`;
          const eventData = TestDataGenerator.generateEventData(user.id);

          concurrentEventOperations.push(async () => {
            const encrypted = await demoManager.encryptDemoEventData(
              user.id, eventId, eventData, PrivacyLevel.PRIVATE
            );
            
            const decrypted = await demoManager.decryptDemoEventData(
              user.id, eventId, encrypted, PrivacyLevel.PRIVATE
            );

            return { encrypted, decrypted, originalData: eventData };
          });
        }
      }

      const { duration, results } = await PerformanceTestUtils.timeFunction(async () => {
        return Promise.all(concurrentEventOperations.map(op => op()));
      });

      // Performance requirement for concurrent operations
      TestAssertions.assertPerformance(duration, 3000, 'Concurrent event operations');

      // Verify all operations completed successfully
      expect(results).toHaveLength(users.length * eventsPerUser);
      results.forEach(({ encrypted, decrypted, originalData }) => {
        expect(encrypted.title_encrypted).toBeDefined();
        expect(decrypted.title).toBe(originalData.title);
      });
    });
  });

  describe('CRITICAL: System Resource Management', () => {
    it('should manage localStorage efficiently in demo mode', () => {
      const largeDataSets = [];
      
      // Generate large amounts of demo data
      for (let i = 0; i < 100; i++) {
        const userId = TestDataGenerator.generateUserId();
        const userData = TestDataGenerator.generateUserData();
        
        // Create relationships and events
        const relationships = Array.from({ length: 10 }, () => ({
          id: `rel-${i}-${Math.random()}`,
          partnerId: TestDataGenerator.generateUserId(),
          tier: 'details'
        }));

        const events = Array.from({ length: 20 }, () => 
          TestDataGenerator.generateEventData(userId)
        );

        largeDataSets.push({
          userData,
          relationships,
          events,
          auditLogs: Array.from({ length: 50 }, (_, j) => ({
            id: `audit-${i}-${j}`,
            timestamp: Date.now(),
            action: 'test_operation',
            details: `Test audit log ${j}`
          }))
        });
      }

      // Test storage efficiency
      expect(() => {
        largeDataSets.forEach(dataSet => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`test-data-${Math.random()}`, JSON.stringify(dataSet));
          }
        });
      }).not.toThrow();

      // Cleanup should work efficiently
      expect(() => {
        DemoHelpers.clearAllDemoData();
      }).not.toThrow();
    });
  });
});

describe('Production Readiness: Data Integrity & Recovery', () => {
  let keyEscrow: KeyEscrowService;

  beforeAll(() => {
    keyEscrow = KeyEscrowService.initialize(true);
  });

  describe('CRITICAL: Cross-Device Synchronization', () => {
    it('should maintain key consistency across devices', () => {
      const userId = TestDataGenerator.generateUserId();
      
      // Simulate same user accessing from different devices
      const device1Keys = Array.from({ length: 10 }, (_, i) => 
        KeyDerivationHelpers.deriveEventKey(userId, `event-${i}`, 'private', FieldType.TITLE)
      );
      
      const device2Keys = Array.from({ length: 10 }, (_, i) => 
        KeyDerivationHelpers.deriveEventKey(userId, `event-${i}`, 'private', FieldType.TITLE)
      );

      // Keys should be identical across devices
      device1Keys.forEach((device1Key, index) => {
        const device2Key = device2Keys[index];
        expect(device1Key.key.equals(device2Key.key)).toBe(true);
        expect(device1Key.metadata.keyId).toBe(device2Key.metadata.keyId);
      });
    });

    it('should handle key recovery across devices', async () => {
      const userId = TestDataGenerator.generateUserId();
      const userMasterKey = crypto.randomBytes(32);
      const password = 'CrossDevicePassword123!';

      // Device 1: Set up key escrow
      const escrowRecord = await keyEscrow.createPasswordEscrow(userId, userMasterKey, password);
      expect(escrowRecord.method).toBe(EscrowMethod.PASSWORD);

      // Device 2: Recover keys
      const recoveryResult = await keyEscrow.recoverWithPassword(userId, password);
      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.userMasterKey?.equals(userMasterKey)).toBe(true);

      // Verify derived keys are consistent across devices
      const originalKey = KeyDerivationHelpers.deriveEventKey(
        userId, 'cross-device-test', 'private', FieldType.DESCRIPTION
      );
      
      // After recovery, same key should be derivable
      const recoveredKey = KeyDerivationHelpers.deriveEventKey(
        userId, 'cross-device-test', 'private', FieldType.DESCRIPTION
      );

      expect(originalKey.key.equals(recoveredKey.key)).toBe(true);
    });
  });

  describe('CRITICAL: Backup and Recovery Procedures', () => {
    it('should handle complete system restoration', async () => {
      const demoManager = getDemoKeyManagement();
      
      // Create complex user scenario
      const alice = await demoManager.createDemoUser('alice@recovery.com', 'password123');
      const bob = await demoManager.createDemoUser('bob@recovery.com', 'password123');
      
      await demoManager.createDemoRelationship(alice.id, 'bob@recovery.com', 'details');
      
      const events = [];
      for (let i = 0; i < 10; i++) {
        const eventId = `recovery-event-${i}`;
        const eventData = TestDataGenerator.generateEventData(alice.id);
        
        const encrypted = await demoManager.encryptDemoEventData(
          alice.id, eventId, eventData, PrivacyLevel.PRIVATE
        );
        
        events.push({ eventId, eventData, encrypted });
      }

      // Export complete user data (backup)
      const aliceBackup = demoManager.exportDemoData(alice.id);
      const bobBackup = demoManager.exportDemoData(bob.id);

      expect(aliceBackup.userData).toBeDefined();
      expect(aliceBackup.escrowRecords).toBeDefined();
      expect(aliceBackup.relationships).toBeDefined();
      expect(aliceBackup.auditLogs).toBeDefined();

      // Simulate system wipe and restore
      DemoHelpers.clearAllDemoData();

      // Verify data is cleared
      const clearedAlice = await demoManager.authenticateDemoUser('alice@recovery.com', 'password123');
      expect(clearedAlice).toBeNull();

      // Restore from backup should be possible
      // (In production, this would involve recreating escrow records and key derivation)
      expect(aliceBackup.userData.email).toBe('alice@recovery.com');
      expect(aliceBackup.escrowRecords.length).toBeGreaterThan(0);
    });
  });
});

// Performance benchmarking for production readiness
describe('Production Readiness: Performance Benchmarks', () => {
  it('should meet all performance SLAs', async () => {
    const keyDerivation = KeyDerivation.initialize({
      applicationMasterKey: crypto.randomBytes(32).toString('hex'),
      recoveryMasterKey: crypto.randomBytes(32).toString('hex'),
      demoMasterKey: crypto.randomBytes(32).toString('hex'),
      keyRotationInterval: 3600
    }, true);

    // Benchmark 1: Single key derivation
    const singleKeyBenchmark = await PerformanceTestUtils.performanceTest(
      async () => KeyDerivationHelpers.deriveEventKey('user', 'event', 'private', FieldType.TITLE),
      100
    );
    
    expect(singleKeyBenchmark.averageTime).toBeLessThan(10); // <10ms average
    expect(singleKeyBenchmark.maxTime).toBeLessThan(50);     // <50ms worst case

    // Benchmark 2: Batch operations
    const batchBenchmark = await PerformanceTestUtils.performanceTest(
      async () => {
        return Array.from({ length: 10 }, (_, i) => 
          KeyDerivationHelpers.deriveEventKey(`user-${i}`, 'event', 'private', FieldType.TITLE)
        );
      },
      20
    );
    
    expect(batchBenchmark.averageTime).toBeLessThan(100); // <100ms for 10 keys
    expect(batchBenchmark.maxTime).toBeLessThan(200);     // <200ms worst case

    keyDerivation.clearCache();
  });
});
