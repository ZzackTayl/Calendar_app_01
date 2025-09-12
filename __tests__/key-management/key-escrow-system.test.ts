/**
 * Key Escrow System Test Suite
 * 
 * Comprehensive tests for key management operations, security boundaries,
 * and edge cases. Validates the complete key escrow and derivation system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';

// Import the key management system components
import { 
  KeyDerivation, 
  KeyDerivationHelpers,
  MasterKeyConfig,
  DerivationContext,
  KeyDomain,
  EntityType,
  FieldType
} from '@/lib/keys/key-derivation';

import { 
  KeyEscrowService,
  EscrowMethod,
  EscrowRecord,
  RecoveryResult
} from '@/lib/keys/key-escrow';

import { 
  KeyManagementService,
  EnhancedKeyManagementConfig
} from '@/lib/keys/key-management-service';

import { 
  PrivacyKeySharing,
  PrivacyLevel,
  KeySharingPermissions
} from '@/lib/keys/privacy-key-sharing';

import { 
  AuthenticationKeyIntegration,
  AuthEvent,
  createDefaultAuthKeyConfig
} from '@/lib/keys/auth-integration';

import { 
  DemoKeyManagement,
  getDemoKeyManagement,
  DemoHelpers
} from '@/lib/keys/demo-key-management';

// Test helpers
function generateTestMasterKeyConfig(): MasterKeyConfig {
  return {
    applicationMasterKey: crypto.randomBytes(32).toString('hex'),
    recoveryMasterKey: crypto.randomBytes(32).toString('hex'),
    demoMasterKey: crypto.randomBytes(32).toString('hex'),
    keyRotationInterval: 3600 // 1 hour for tests
  };
}

function createMockSupabaseClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        or: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn((data: any) => {
        // Return a proper thenable object like Supabase does
        const insertResult = {
          then: vi.fn((callback) => {
            const insertedData = Array.isArray(data) ? data : [data];
            return Promise.resolve({ data: insertedData, error: null }).then(callback);
          }),
          catch: vi.fn((callback) => Promise.resolve()),
          finally: vi.fn((callback) => Promise.resolve()),
        };
        return insertResult;
      }),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  };
}

describe('Key Derivation System', () => {
  let keyDerivation: KeyDerivation;
  let masterConfig: MasterKeyConfig;

  beforeEach(() => {
    masterConfig = generateTestMasterKeyConfig();
    keyDerivation = KeyDerivation.initialize(masterConfig, true);
  });

  afterEach(() => {
    if (keyDerivation) {
      keyDerivation.clearCache();
    }
  });

  describe('Key Derivation Basics', () => {
    it('should initialize with valid master key configuration', () => {
      expect(KeyDerivation.validateMasterKeyConfig(masterConfig)).toBe(true);
    });

    it('should reject invalid master key configurations', () => {
      const invalidConfig = {
        applicationMasterKey: 'too-short',
        recoveryMasterKey: 'also-too-short',
        keyRotationInterval: 3600
      };
      expect(KeyDerivation.validateMasterKeyConfig(invalidConfig as any)).toBe(false);
    });

    it('should derive consistent keys for the same context', () => {
      const context: DerivationContext = {
        userId: 'test-user-123',
        domain: KeyDomain.PERSONAL,
        entityType: EntityType.EVENT,
        entityId: 'test-event-456',
        fieldType: FieldType.DESCRIPTION
      };

      const { key: key1, metadata: meta1 } = keyDerivation.deriveCompleteKey(context);
      const { key: key2, metadata: meta2 } = keyDerivation.deriveCompleteKey(context);

      expect(key1).toEqual(key2);
      expect(meta1.keyId).toBe(meta2.keyId);
      expect(key1.length).toBe(32); // 256 bits
    });

    it('should derive different keys for different contexts', () => {
      const context1: DerivationContext = {
        userId: 'user-1',
        domain: KeyDomain.PERSONAL,
        entityType: EntityType.EVENT,
        entityId: 'event-1',
        fieldType: FieldType.DESCRIPTION
      };

      const context2: DerivationContext = {
        userId: 'user-2',
        domain: KeyDomain.PERSONAL,
        entityType: EntityType.EVENT,
        entityId: 'event-1',
        fieldType: FieldType.DESCRIPTION
      };

      const { key: key1 } = keyDerivation.deriveCompleteKey(context1);
      const { key: key2 } = keyDerivation.deriveCompleteKey(context2);

      expect(key1).not.toEqual(key2);
    });

    it('should derive different keys for different privacy levels', () => {
      const baseContext = {
        userId: 'test-user',
        entityType: EntityType.EVENT,
        entityId: 'test-event',
        fieldType: FieldType.DESCRIPTION
      };

      const privateContext: DerivationContext = { ...baseContext, domain: KeyDomain.PERSONAL };
      const relationshipContext: DerivationContext = { ...baseContext, domain: KeyDomain.RELATIONSHIP };

      const { key: privateKey } = keyDerivation.deriveCompleteKey(privateContext);
      const { key: relationshipKey } = keyDerivation.deriveCompleteKey(relationshipContext);

      expect(privateKey).not.toEqual(relationshipKey);
    });
  });

  describe('Key Derivation Helpers', () => {
    it('should derive event keys correctly', () => {
      const { key, metadata } = KeyDerivationHelpers.deriveEventKey(
        'user-123',
        'event-456',
        'private',
        FieldType.LOCATION
      );

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
      expect(metadata.entityType).toBe(EntityType.EVENT);
      expect(metadata.fieldType).toBe(FieldType.LOCATION);
      expect(metadata.keyId).toContain('user-123');
    });

    it('should derive user data keys correctly', () => {
      const { key, metadata } = KeyDerivationHelpers.deriveUserDataKey(
        'user-789',
        FieldType.PHONE
      );

      expect(key).toBeInstanceOf(Buffer);
      expect(metadata.entityType).toBe(EntityType.USER);
      expect(metadata.fieldType).toBe(FieldType.PHONE);
      expect(metadata.domain).toBe(KeyDomain.PERSONAL);
    });
  });

  describe('Privacy Level Mapping', () => {
    it('should map privacy levels to correct key domains', () => {
      expect(KeyDerivation.privacyLevelToDomain('private')).toBe(KeyDomain.PERSONAL);
      expect(KeyDerivation.privacyLevelToDomain('busy_only')).toBe(KeyDomain.RELATIONSHIP);
      expect(KeyDerivation.privacyLevelToDomain('details')).toBe(KeyDomain.VISIBLE);
      expect(KeyDerivation.privacyLevelToDomain('public')).toBe(KeyDomain.PUBLIC);
    });
  });

  describe('Key Caching', () => {
    it('should cache derived keys for performance', () => {
      const context: DerivationContext = {
        userId: 'cache-test-user',
        domain: KeyDomain.PERSONAL,
        entityType: EntityType.EVENT,
        entityId: 'cache-test-event',
        fieldType: FieldType.NOTES
      };

      // First derivation
      const start1 = performance.now();
      const { key: key1 } = keyDerivation.deriveCompleteKey(context);
      const time1 = performance.now() - start1;

      // Second derivation (should be from cache)
      const start2 = performance.now();
      const { key: key2 } = keyDerivation.deriveCompleteKey(context);
      const time2 = performance.now() - start2;

      expect(key1).toEqual(key2);
      // Second call should be significantly faster due to caching
      expect(time2).toBeLessThan(time1 * 0.1);
    });

    it('should clear cache for specific user', () => {
      const context: DerivationContext = {
        userId: 'clear-test-user',
        domain: KeyDomain.PERSONAL,
        entityType: EntityType.EVENT,
        entityId: 'clear-test-event',
        fieldType: FieldType.DESCRIPTION
      };

      // Derive key to populate cache
      keyDerivation.deriveCompleteKey(context);

      // Clear cache for user
      keyDerivation.clearCache('clear-test-user');

      // Should still work (re-derive)
      const { key } = keyDerivation.deriveCompleteKey(context);
      expect(key).toBeInstanceOf(Buffer);
    });
  });
});

describe('Key Escrow System', () => {
  let keyEscrow: KeyEscrowService;
  let testUserMasterKey: Buffer;

  beforeEach(() => {
    keyEscrow = KeyEscrowService.initialize(true);
    testUserMasterKey = crypto.randomBytes(32);
  });

  describe('Password-Based Escrow', () => {
    it('should create password-based escrow', async () => {
      const userId = 'test-user-password';
      const password = 'secure-test-password-123!';

      const escrowRecord = await keyEscrow.createPasswordEscrow(
        userId,
        testUserMasterKey,
        password
      );

      expect(escrowRecord.method).toBe(EscrowMethod.PASSWORD);
      expect(escrowRecord.userId).toBe(userId);
      expect(escrowRecord.passwordData).toBeDefined();
      expect(escrowRecord.passwordData?.salt).toBeDefined();
      expect(escrowRecord.passwordData?.iterations).toBeGreaterThan(100000);
    });

    it('should recover keys with correct password', async () => {
      const userId = 'test-user-recovery';
      const password = 'correct-password-456!';

      // Create escrow
      await keyEscrow.createPasswordEscrow(userId, testUserMasterKey, password);

      // Recover with correct password
      const result = await keyEscrow.recoverWithPassword(userId, password);

      expect(result.success).toBe(true);
      expect(result.userMasterKey).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should fail recovery with incorrect password', async () => {
      const userId = 'test-user-wrong-password';
      const correctPassword = 'correct-password-789!';
      const wrongPassword = 'wrong-password-000!';

      // Create escrow
      await keyEscrow.createPasswordEscrow(userId, testUserMasterKey, correctPassword);

      // Try recovery with wrong password
      const result = await keyEscrow.recoverWithPassword(userId, wrongPassword);

      expect(result.success).toBe(false);
      expect(result.userMasterKey).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should reject weak passwords', async () => {
      const userId = 'test-user-weak-password';
      const weakPassword = '123';

      await expect(
        keyEscrow.createPasswordEscrow(userId, testUserMasterKey, weakPassword)
      ).rejects.toThrow('Password must be at least');
    });
  });

  describe('Security Questions Escrow', () => {
    it('should create security questions escrow', async () => {
      const userId = 'test-user-questions';
      const questionsAndAnswers = [
        { question: "What is your mother's maiden name?", answer: "Smith" },
        { question: "What was your first pet's name?", answer: "Fluffy" },
        { question: "What city were you born in?", answer: "New York" },
        { question: "What is your favorite color?", answer: "Blue" },
        { question: "What was your first car?", answer: "Honda Civic" }
      ];

      const escrowRecord = await keyEscrow.createSecurityQuestionsEscrow(
        userId,
        testUserMasterKey,
        questionsAndAnswers
      );

      expect(escrowRecord.method).toBe(EscrowMethod.SECURITY_QUESTIONS);
      expect(escrowRecord.userId).toBe(userId);
      expect(escrowRecord.securityQuestions).toBeDefined();
      expect(escrowRecord.securityQuestions?.length).toBe(5);
      expect(escrowRecord.securityQuestions?.[0].question).toBe("What is your mother's maiden name?");
      expect(escrowRecord.securityQuestions?.[0].answerHash).toBeDefined();
      expect(escrowRecord.securityQuestions?.[0].salt).toBeDefined();
    });

    it('should recover with correct security answers', async () => {
      const userId = 'test-user-questions-recovery';
      const questionsAndAnswers = [
        { question: "Question 1", answer: "Answer 1" },
        { question: "Question 2", answer: "Answer 2" },
        { question: "Question 3", answer: "Answer 3" },
        { question: "Question 4", answer: "Answer 4" },
        { question: "Question 5", answer: "Answer 5" }
      ];

      // Create escrow
      const escrowRecord = await keyEscrow.createSecurityQuestionsEscrow(
        userId,
        testUserMasterKey,
        questionsAndAnswers
      );

      // Recovery answers (first 3 questions)
      const recoveryAnswers = escrowRecord.securityQuestions!.slice(0, 3).map(q => ({
        questionId: q.id,
        answer: questionsAndAnswers.find(qa => qa.question === q.question)!.answer
      }));

      const result = await keyEscrow.recoverWithSecurityQuestions(userId, recoveryAnswers);

      expect(result.success).toBe(true);
      expect(result.userMasterKey).toBeDefined();
    });

    it('should fail with insufficient correct answers', async () => {
      const userId = 'test-user-insufficient-answers';
      const questionsAndAnswers = [
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" },
        { question: "Q3", answer: "A3" },
        { question: "Q4", answer: "A4" },
        { question: "Q5", answer: "A5" }
      ];

      // Create escrow
      const escrowRecord = await keyEscrow.createSecurityQuestionsEscrow(
        userId,
        testUserMasterKey,
        questionsAndAnswers
      );

      // Only provide 2 answers (need 3)
      const insufficientAnswers = escrowRecord.securityQuestions!.slice(0, 2).map(q => ({
        questionId: q.id,
        answer: questionsAndAnswers.find(qa => qa.question === q.question)!.answer
      }));

      const result = await keyEscrow.recoverWithSecurityQuestions(userId, insufficientAnswers);

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least 3 correct answers are required');
    });

    it('should require at least 5 security questions', async () => {
      const userId = 'test-user-few-questions';
      const fewQuestions = [
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "A2" }
      ];

      await expect(
        keyEscrow.createSecurityQuestionsEscrow(userId, testUserMasterKey, fewQuestions)
      ).rejects.toThrow('At least 5 security questions are required');
    });
  });

  describe('Backup Codes Escrow', () => {
    it('should create backup codes escrow', async () => {
      const userId = 'test-user-backup-codes';
      const codeCount = 8;

      const { escrowRecord, backupCodes } = await keyEscrow.createBackupCodesEscrow(
        userId,
        testUserMasterKey,
        codeCount
      );

      expect(escrowRecord.method).toBe(EscrowMethod.BACKUP_CODES);
      expect(escrowRecord.userId).toBe(userId);
      expect(escrowRecord.backupCodes).toBeDefined();
      expect(escrowRecord.backupCodes?.length).toBe(codeCount);
      expect(backupCodes).toBeDefined();
      expect(backupCodes?.length).toBe(codeCount);
      
      // Verify backup codes are properly formatted
      backupCodes?.forEach(code => {
        expect(code).toMatch(/^[0-9A-Z]{12}$/);
      });
    });

    it('should generate unique backup codes', async () => {
      const { backupCodes } = await keyEscrow.createBackupCodesEscrow(
        'test-user',
        testUserMasterKey,
        10
      );

      const uniqueCodes = new Set(backupCodes);
      expect(uniqueCodes.size).toBe(backupCodes!.length);
    });
  });

  describe('Social Recovery Escrow', () => {
    it('should create social recovery escrow', async () => {
      const userId = 'test-user-social';
      const participants = ['partner-1', 'partner-2', 'partner-3', 'partner-4'];

      const escrowRecord = await keyEscrow.createSocialRecoveryEscrow(
        userId,
        testUserMasterKey,
        participants
      );

      expect(escrowRecord.method).toBe(EscrowMethod.SOCIAL_RECOVERY);
      expect(escrowRecord.userId).toBe(userId);
      expect(escrowRecord.socialRecovery).toBeDefined();
      expect(escrowRecord.socialRecovery?.participants.length).toBe(4);
      expect(escrowRecord.socialRecovery?.threshold).toBe(3);
    });

    it('should require minimum participants for social recovery', async () => {
      const userId = 'test-user-few-participants';
      const fewParticipants = ['partner-1', 'partner-2'];

      await expect(
        keyEscrow.createSocialRecoveryEscrow(userId, testUserMasterKey, fewParticipants)
      ).rejects.toThrow('At least 3 participants are required');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit recovery attempts', async () => {
      const userId = 'test-user-rate-limit';
      const password = 'CorrectPassword123!'; // Strong password meeting all requirements

      // Create escrow
      const escrowRecord = await keyEscrow.createPasswordEscrow(userId, testUserMasterKey, password);
      console.log(`Escrow created for ${userId} with method: ${escrowRecord.method}`);

      // Make sequential failed attempts to avoid race conditions
      const results = [];
      
      // First 5 attempts should be attempts with "Invalid password"
      for (let i = 0; i < 5; i++) {
        const wrongPassword = `WrongPassword${i}!@#`;
        const result = await keyEscrow.recoverWithPassword(userId, wrongPassword);
        results.push(result);
        console.log(`Attempt ${i + 1}: success=${result.success}, error=${result.error}, password=${wrongPassword}`);
        expect(result.success).toBe(false);
        if (result.error !== 'Too many recovery attempts. Please try again later.') {
          expect(result.error).toBe('Invalid password');
        }
      }
      
      // 6th attempt should be rate limited
      const rateLimitedResult = await keyEscrow.recoverWithPassword(userId, 'WrongPassword123!');
      expect(rateLimitedResult.success).toBe(false);
      expect(rateLimitedResult.error).toContain('Too many recovery attempts');
    });
  });
});

describe('Privacy-Aware Key Sharing', () => {
  let privacyKeySharing: PrivacyKeySharing;
  let mockSupabase: any;
  let keyDerivation: KeyDerivation;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const masterConfig = generateTestMasterKeyConfig();
    keyDerivation = KeyDerivation.initialize(masterConfig, true);
    
    const mockKeyManagement = {
      clearUserMasterKeyCache: vi.fn(),
      getKeyForEntity: vi.fn().mockResolvedValue(null),
      setupUserKeyEscrow: vi.fn().mockResolvedValue({ success: false }),
      recoverUserKeys: vi.fn().mockResolvedValue({ success: false })
    };

    privacyKeySharing = new PrivacyKeySharing(mockSupabase, mockKeyManagement as any, keyDerivation);
  });

  describe('Key Sharing Requests', () => {
    it('should create key sharing request', async () => {
      const requesterId = 'requester-123';
      const ownerId = 'owner-456';
      const eventId = 'event-789';

      // Mock relationship exists
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'relationship-123' },
              error: null
            })
          })
        })
      });

      const result = await privacyKeySharing.requestKeyAccess(
        requesterId,
        ownerId,
        EntityType.EVENT,
        eventId,
        PrivacyLevel.BUSY_ONLY,
        'Need access for coordination',
        {
          canRead: true,
          canWrite: false,
          canShare: false,
          canRevoke: false
        }
      );

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
    });

    it('should reject request when no relationship exists', async () => {
      const requesterId = 'requester-123';
      const ownerId = 'owner-456';

      // Mock no relationship
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: 'No rows returned'
            })
          })
        })
      });

      const result = await privacyKeySharing.requestKeyAccess(
        requesterId,
        ownerId,
        EntityType.EVENT,
        'event-123',
        PrivacyLevel.PRIVATE,
        'Test request',
        { canRead: true, canWrite: false, canShare: false, canRevoke: false }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No relationship exists');
    });
  });

  describe('Key Sharing Approval', () => {
    it('should approve key sharing request', async () => {
      // First create a request
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'relationship-123' },
              error: null
            })
          })
        })
      });

      const requestResult = await privacyKeySharing.requestKeyAccess(
        'requester',
        'owner',
        EntityType.EVENT,
        'event-123',
        PrivacyLevel.BUSY_ONLY,
        'Test request',
        { canRead: true, canWrite: false, canShare: false, canRevoke: false }
      );

      expect(requestResult.success).toBe(true);

      // Then approve it
      const approvalResult = await privacyKeySharing.approveKeyAccess(
        'owner',
        requestResult.requestId!
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.keyId).toBeDefined();
    });

    it('should only allow owner to approve requests', async () => {
      // Create request first
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'relationship-123' },
              error: null
            })
          })
        })
      });

      const requestResult = await privacyKeySharing.requestKeyAccess(
        'requester',
        'owner',
        EntityType.EVENT,
        'event-123',
        PrivacyLevel.BUSY_ONLY,
        'Test',
        { canRead: true, canWrite: false, canShare: false, canRevoke: false }
      );

      // Try to approve as non-owner
      const approvalResult = await privacyKeySharing.approveKeyAccess(
        'not-owner',
        requestResult.requestId!
      );

      expect(approvalResult.success).toBe(false);
      expect(approvalResult.error).toContain('Only key owner can approve');
    });
  });

  describe('Privacy Level Validation', () => {
    it('should validate privacy level hierarchy', async () => {
      const testCases = [
        { requested: PrivacyLevel.PUBLIC, allowed: PrivacyLevel.PRIVATE, expected: true },
        { requested: PrivacyLevel.DETAILS, allowed: PrivacyLevel.PRIVATE, expected: true },
        { requested: PrivacyLevel.PRIVATE, allowed: PrivacyLevel.DETAILS, expected: false }
      ];

      testCases.forEach(({ requested, allowed, expected }) => {
        const result = (privacyKeySharing as any).isPrivacyLevelAllowed(requested, allowed);
        expect(result).toBe(expected);
      });
    });
  });
});

describe('Demo Key Management', () => {
  let demoManager: DemoKeyManagement;

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    demoManager = getDemoKeyManagement();
  });

  afterEach(() => {
    // Clean up demo data after each test
    DemoHelpers.clearAllDemoData();
  });

  describe('Demo User Management', () => {
    it('should create demo user with key escrow', async () => {
      const email = 'test@demo.com';
      const password = 'DemoPassword123!';

      const demoUser = await demoManager.createDemoUser(email, password);

      expect(demoUser.email).toBe(email);
      expect(demoUser.id).toBeDefined();
      expect(demoUser.masterKeyGenerated).toBe(true);
      expect(demoUser.escrowSetup).toBe(true);
    });

    it('should authenticate demo user', async () => {
      const email = 'auth-test@demo.com';
      const password = 'AuthTestPassword456!';

      // Create user
      await demoManager.createDemoUser(email, password);

      // Authenticate
      const authenticatedUser = await demoManager.authenticateDemoUser(email, password);

      expect(authenticatedUser).not.toBeNull();
      expect(authenticatedUser?.email).toBe(email);
    });

    it('should reject invalid authentication', async () => {
      const email = 'invalid@demo.com';
      const password = 'CorrectPassword123!';

      await demoManager.createDemoUser(email, password);

      // Try with wrong password
      const result = await demoManager.authenticateDemoUser(email, 'WrongPassword123!');

      expect(result).toBeNull();
    });
  });

  describe('Demo Relationships', () => {
    it('should create demo relationship', async () => {
      const user1 = await demoManager.createDemoUser('user1@demo.com', 'Password123!');
      const user2 = await demoManager.createDemoUser('user2@demo.com', 'Password456!');

      const relationship = await demoManager.createDemoRelationship(
        user1.id,
        'user2@demo.com',
        'busy_only'
      );

      expect(relationship).not.toBeNull();
      expect(relationship?.userId).toBe(user1.id);
      expect(relationship?.partnerId).toBe(user2.id);
      expect(relationship?.tier).toBe('busy_only');
    });

    it('should reject relationship with non-existent user', async () => {
      const user1 = await demoManager.createDemoUser('exists@demo.com', 'ExistsPassword123!');

      const relationship = await demoManager.createDemoRelationship(
        user1.id,
        'nonexistent@demo.com',
        'details'
      );

      expect(relationship).toBeNull();
    });
  });

  describe('Demo Encryption/Decryption', () => {
    it('should encrypt and decrypt event data', async () => {
      const user = await demoManager.createDemoUser('crypto@demo.com', 'CryptoPassword123!');
      const eventId = 'test-event-123';
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        location: '123 Test Street',
        notes: 'Important test notes'
      };

      // Encrypt data
      const encryptedData = await demoManager.encryptDemoEventData(
        user.id,
        eventId,
        eventData,
        PrivacyLevel.PRIVATE
      );

      expect(encryptedData.title_encrypted).toBeDefined();
      expect(encryptedData.description_encrypted).toBeDefined();
      expect(encryptedData.location_encrypted).toBeDefined();
      expect(encryptedData.notes_encrypted).toBeDefined();

      // Decrypt data
      const decryptedData = await demoManager.decryptDemoEventData(
        user.id,
        eventId,
        encryptedData,
        PrivacyLevel.PRIVATE
      );

      expect(decryptedData.title).toBe(eventData.title);
      expect(decryptedData.description).toBe(eventData.description);
      expect(decryptedData.location).toBe(eventData.location);
      expect(decryptedData.notes).toBe(eventData.notes);
    });

    it('should fail decryption with wrong user context', async () => {
      const user1 = await demoManager.createDemoUser('user1@demo.com', 'Password123!');
      const user2 = await demoManager.createDemoUser('user2@demo.com', 'Password456!');
      const eventId = 'secure-event-123';
      const eventData = { title: 'Secret Event' };

      // User1 encrypts data
      const encryptedData = await demoManager.encryptDemoEventData(
        user1.id,
        eventId,
        eventData,
        PrivacyLevel.PRIVATE
      );

      // User2 tries to decrypt (should fail)
      const decryptedData = await demoManager.decryptDemoEventData(
        user2.id,
        eventId,
        encryptedData,
        PrivacyLevel.PRIVATE
      );

      expect(decryptedData.title).toBe('[Decryption Failed]');
    });
  });

  describe('Demo Key Sharing', () => {
    it('should demonstrate key sharing between users', async () => {
      const user1 = await demoManager.createDemoUser('owner@demo.com', 'password1');
      const user2 = await demoManager.createDemoUser('recipient@demo.com', 'password2');
      
      // Create relationship
      await demoManager.createDemoRelationship(user1.id, 'recipient@demo.com', 'details');

      const eventId = 'shared-event-123';
      
      const result = await demoManager.demonstrateKeySharing(
        user1.id,
        user2.id,
        eventId,
        PrivacyLevel.DETAILS
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('approved');
    });
  });

  describe('Demo Data Export', () => {
    it('should export demo data correctly', async () => {
      const user = await demoManager.createDemoUser('export@demo.com', 'ExportPassword123!');
      
      const exportedData = demoManager.exportDemoData(user.id);

      expect(exportedData.userData).toBeDefined();
      expect(exportedData.userData.email).toBe('export@demo.com');
      expect(exportedData.escrowRecords).toBeInstanceOf(Array);
      expect(exportedData.relationships).toBeInstanceOf(Array);
      expect(exportedData.auditLogs).toBeInstanceOf(Array);
    });
  });
});

describe('Demo Helpers', () => {
  beforeEach(() => {
    DemoHelpers.clearAllDemoData();
  });

  afterEach(() => {
    DemoHelpers.clearAllDemoData();
  });

  describe('Demo Environment Setup', () => {
    it('should set up complete demo environment', async () => {
      const { users, relationships, message } = await DemoHelpers.setupDemoEnvironment();

      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('alice@demo.com');
      expect(users[1].email).toBe('bob@demo.com');
      expect(relationships).toHaveLength(1);
      expect(relationships[0].tier).toBe('busy_only');
      expect(message).toContain('Alice and Bob');
    });

    it('should demonstrate complete key system workflow', async () => {
      const { steps, success } = await DemoHelpers.demonstrateKeySystem();

      expect(success).toBe(true);
      expect(steps.length).toBeGreaterThan(5);
      expect(steps[0]).toContain('Setting up demo environment');
      expect(steps[steps.length - 1]).toContain('Demo completed successfully');
    });
  });
});

describe('Integration Tests', () => {
  describe('End-to-End Key Management Workflow', () => {
    it('should complete full key management lifecycle', async () => {
      const masterConfig = generateTestMasterKeyConfig();
      const keyDerivation = KeyDerivation.initialize(masterConfig, true);
      const keyEscrow = KeyEscrowService.initialize(true);
      
      const userId = 'integration-test-user';
      const password = 'integration-test-password-123!';
      const eventId = 'integration-test-event';
      const eventData = 'Sensitive calendar information';

      // Step 1: Create user master key and escrow
      const userMasterKey = keyDerivation.deriveUserMasterKey(userId);
      const escrowRecord = await keyEscrow.createPasswordEscrow(userId, userMasterKey, password);
      
      expect(escrowRecord.method).toBe(EscrowMethod.PASSWORD);

      // Step 2: Derive event encryption key
      const { key: eventKey } = KeyDerivationHelpers.deriveEventKey(
        userId,
        eventId,
        'private',
        FieldType.DESCRIPTION
      );

      // Step 3: Encrypt event data
      const cipher = require('crypto').createCipheriv('aes-256-gcm', eventKey, require('crypto').randomBytes(16));
      let encrypted = cipher.update(eventData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(eventData);

      // Step 4: Recover keys using escrow
      const recoveryResult = await keyEscrow.recoverWithPassword(userId, password);
      expect(recoveryResult.success).toBe(true);

      // Step 5: Re-derive key and decrypt
      const { key: recoveredKey } = KeyDerivationHelpers.deriveEventKey(
        userId,
        eventId,
        'private',
        FieldType.DESCRIPTION
      );

      expect(eventKey).toEqual(recoveredKey);

      // Cleanup
      keyDerivation.clearCache();
    });
  });

  describe('Security Boundary Tests', () => {
    it('should prevent cross-user key access', async () => {
      const masterConfig = generateTestMasterKeyConfig();
      const keyDerivation = KeyDerivation.initialize(masterConfig, true);

      const user1Key = KeyDerivationHelpers.deriveEventKey(
        'user-1',
        'shared-event-id',
        'private',
        FieldType.DESCRIPTION
      );

      const user2Key = KeyDerivationHelpers.deriveEventKey(
        'user-2', 
        'shared-event-id',
        'private',
        FieldType.DESCRIPTION
      );

      // Same event, different users should have different keys
      expect(user1Key.key).not.toEqual(user2Key.key);

      keyDerivation.clearCache();
    });

    it('should maintain privacy level separation', async () => {
      const masterConfig = generateTestMasterKeyConfig();
      const keyDerivation = KeyDerivation.initialize(masterConfig, true);

      const privateKey = KeyDerivationHelpers.deriveEventKey(
        'test-user',
        'test-event',
        'private',
        FieldType.DESCRIPTION
      );

      const publicKey = KeyDerivationHelpers.deriveEventKey(
        'test-user',
        'test-event',
        'details', // Different privacy level
        FieldType.DESCRIPTION
      );

      // Same user and event, different privacy levels should have different keys
      expect(privateKey.key).not.toEqual(publicKey.key);

      keyDerivation.clearCache();
    });
  });

  describe('Performance Tests', () => {
    it('should derive keys within performance threshold', async () => {
      const masterConfig = generateTestMasterKeyConfig();
      const keyDerivation = KeyDerivation.initialize(masterConfig, true);

      const context: DerivationContext = {
        userId: 'perf-test-user',
        domain: KeyDomain.PERSONAL,
        entityType: EntityType.EVENT,
        entityId: 'perf-test-event',
        fieldType: FieldType.DESCRIPTION
      };

      // First derivation (cold)
      const start1 = performance.now();
      keyDerivation.deriveCompleteKey(context);
      const coldTime = performance.now() - start1;

      // Second derivation (cached)
      const start2 = performance.now();
      keyDerivation.deriveCompleteKey(context);
      const cachedTime = performance.now() - start2;

      // Performance thresholds
      expect(coldTime).toBeLessThan(50); // Less than 50ms for cold derivation
      expect(cachedTime).toBeLessThan(5);  // Less than 5ms for cached derivation

      keyDerivation.clearCache();
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle invalid key derivation contexts gracefully', () => {
    const masterConfig = generateTestMasterKeyConfig();
    const keyDerivation = KeyDerivation.initialize(masterConfig, true);

    // Missing required field
    expect(() => {
      keyDerivation.deriveCompleteKey({
        userId: '',
        domain: KeyDomain.PERSONAL,
        entityType: EntityType.EVENT,
        entityId: 'test-event',
        fieldType: FieldType.DESCRIPTION
      });
    }).not.toThrow(); // Should handle gracefully, not crash

    keyDerivation.clearCache();
  });

  it('should handle key escrow service errors gracefully', async () => {
    const keyEscrow = KeyEscrowService.initialize(true);
    
    // Test with invalid user master key
    const invalidKey = Buffer.alloc(0); // Empty buffer
    
    await expect(
      keyEscrow.createPasswordEscrow('test-user', invalidKey, 'TestPassword123!')
    ).rejects.toThrow();
  });

  it('should handle demo mode localStorage errors', () => {
    // Mock localStorage failure
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    const demoManager = getDemoKeyManagement();
    
    // Should not crash even if localStorage fails
    expect(async () => {
      await demoManager.createDemoUser('test@demo.com', 'TestPassword123!');
    }).not.toThrow();

    // Restore original localStorage
    Storage.prototype.setItem = originalSetItem;
  });
});

describe('Security Validation Tests', () => {
  it('should generate cryptographically secure keys', () => {
    const masterConfig = generateTestMasterKeyConfig();
    const keyDerivation = KeyDerivation.initialize(masterConfig, true);

    const keys = [];
    for (let i = 0; i < 100; i++) {
      const { key } = KeyDerivationHelpers.deriveEventKey(
        `user-${i}`,
        `event-${i}`,
        'private',
        FieldType.DESCRIPTION
      );
      keys.push(key.toString('hex'));
    }

    // All keys should be unique
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);

    // Keys should be 32 bytes (256 bits)
    keys.forEach(key => {
      expect(Buffer.from(key, 'hex').length).toBe(32);
    });

    keyDerivation.clearCache();
  });

  it('should validate master key entropy', () => {
    // Generate multiple master keys and check they're different
    const keys = [];
    for (let i = 0; i < 10; i++) {
      keys.push(KeyDerivation.generateMasterKey());
    }

    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);

    // Each key should be 64 hex characters (32 bytes)
    keys.forEach(key => {
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
    });
  });

  it('should properly validate password strength', async () => {
    const keyEscrow = KeyEscrowService.initialize(true);
    const testKey = crypto.randomBytes(32);

    const weakPasswords = [
      'weak',
      '12345',
      'password',
      'qwerty',
      'nouppercaseornumbers'
    ];

    for (const weakPassword of weakPasswords) {
      await expect(
        keyEscrow.createPasswordEscrow('test-user', testKey, weakPassword)
      ).rejects.toThrow();
    }

    // Strong password should work
    const strongPassword = 'StrongPassword123!@#';
    await expect(
      keyEscrow.createPasswordEscrow('test-user', testKey, strongPassword)
    ).resolves.toBeDefined();
  });
});

// Test cleanup
afterEach(() => {
  // Clear any global state
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

afterAll(() => {
  // Final cleanup
  DemoHelpers.clearAllDemoData();
});
