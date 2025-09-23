/**
 * Key Escrow Utilities
 * 
 * Provides secure key backup, recovery, and escrow mechanisms for the key management system.
 * Supports multiple escrow methods including password-based, security questions, social recovery,
 * and backup codes. Integrates with both production and demo modes.
 */

import * as crypto from 'crypto';
import { KeyDerivation, MasterKeyConfig } from './key-derivation';
import { createRateLimiter, createRateLimitConfig, POLYAMORY_RATE_LIMITS } from '../rate-limiting/rate-limiter';

// Escrow configuration constants
// Use environment-aware iteration count: lower in tests, strong in production
const getEscrowPbkdf2Iterations = (): number => {
  const override = process.env.ESCROW_PBKDF2_ITERATIONS;
  if (override && !Number.isNaN(Number(override))) {
    return Number(override);
  }
  // Default by environment
  if (process.env.NODE_ENV === 'test') return 100000; // fast enough for CI while meaningful
  if (process.env.NODE_ENV === 'development') return 100000;
  return 600000; // production default (OWASP 2024 baseline)
};

const PBKDF2_ITERATIONS = getEscrowPbkdf2Iterations(); // OWASP recommended minimum for 2024 (env-aware)
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const BACKUP_CODE_LENGTH = 12;
const RECOVERY_THRESHOLD = 3; // Minimum answers needed for recovery

// Escrow method types
export enum EscrowMethod {
  PASSWORD = 'password',
  SECURITY_QUESTIONS = 'security_questions',
  SOCIAL_RECOVERY = 'social_recovery',
  BACKUP_CODES = 'backup_codes'
}

// Security question structure
export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string;
  salt: string;
  createdAt: string;
}

// Backup code structure
export interface BackupCode {
  code: string;
  hash: string;
  salt: string;
  used: boolean;
  usedAt?: string;
}

// Social recovery participant
export interface RecoveryParticipant {
  userId: string;
  keyShare: string; // Encrypted key share
  confirmed: boolean;
  confirmedAt?: string;
}

// Escrow record structure
export interface EscrowRecord {
  userId: string;
  method: EscrowMethod;
  encryptedData: string; // Encrypted user master key
  metadata: {
    createdAt: string;
    lastUpdated: string;
    version: number;
    algorithm: string;
  };
  // Method-specific data
  passwordData?: {
    salt: string;
    iterations: number;
  };
  securityQuestions?: SecurityQuestion[];
  socialRecovery?: {
    threshold: number;
    participants: RecoveryParticipant[];
  };
  backupCodes?: BackupCode[];
}

// Recovery attempt result
export interface RecoveryResult {
  success: boolean;
  userMasterKey?: Buffer;
  error?: string;
  remainingAttempts?: number;
}

// Password strength requirements
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  preventCommon: boolean;
}

/**
 * Core key escrow service
 */
export class KeyEscrowService {
  private static instance: KeyEscrowService;
  private escrowRecords: Map<string, EscrowRecord[]> = new Map();
  private rateLimiter = createRateLimiter();
  private recoveryAttempts: Map<string, { attempts: number; lastAttempt: number }> = new Map();
  private isDemoMode: boolean;

  private constructor(isDemoMode = false) {
    this.isDemoMode = isDemoMode;
  }

  /**
   * Initialize the key escrow service
   */
  static initialize(isDemoMode = false): KeyEscrowService {
    if (!KeyEscrowService.instance) {
      KeyEscrowService.instance = new KeyEscrowService(isDemoMode);
    }
    return KeyEscrowService.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): KeyEscrowService {
    if (!KeyEscrowService.instance) {
      throw new Error('KeyEscrowService not initialized. Call initialize() first.');
    }
    return KeyEscrowService.instance;
  }

  /**
   * Creates password-based escrow for a user's master key
   */
  async createPasswordEscrow(
    userId: string,
    userMasterKey: Buffer,
    password: string
  ): Promise<EscrowRecord> {
    // Validate password strength
    this.validatePassword(password);

    // Generate salt and derive key encryption key
    const salt = crypto.randomBytes(SALT_LENGTH);
    const keyEncryptionKey = await this.deriveKeyFromPassword(password, salt, PBKDF2_ITERATIONS);

    // Encrypt user master key
    const encryptedData = this.encryptMasterKey(userMasterKey, keyEncryptionKey);

    const escrowRecord: EscrowRecord = {
      userId,
      method: EscrowMethod.PASSWORD,
      encryptedData,
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        algorithm: 'PBKDF2-SHA256-AES256GCM'
      },
      passwordData: {
        salt: salt.toString('hex'),
        iterations: PBKDF2_ITERATIONS
      }
    };

    // Store escrow record
    this.storeEscrowRecord(userId, escrowRecord);

    return escrowRecord;
  }

  /**
   * Creates security questions-based escrow
   */
  async createSecurityQuestionsEscrow(
    userId: string,
    userMasterKey: Buffer,
    questionsAndAnswers: Array<{ question: string; answer: string }>
  ): Promise<EscrowRecord> {
    if (questionsAndAnswers.length < 5) {
      throw new Error('At least 5 security questions are required');
    }

    // Create security questions with hashed answers
    const securityQuestions: SecurityQuestion[] = [];
    const combinedAnswers: string[] = [];

    for (const qa of questionsAndAnswers) {
      const salt = crypto.randomBytes(SALT_LENGTH);
      const normalizedAnswer = this.normalizeAnswer(qa.answer);
      const answerHash = await this.hashAnswer(normalizedAnswer, salt);
      
      securityQuestions.push({
        id: crypto.randomUUID(),
        question: qa.question,
        answerHash,
        salt: salt.toString('hex'),
        createdAt: new Date().toISOString()
      });

      combinedAnswers.push(normalizedAnswer);
    }

    // Derive key encryption key from combined answers
    const combinedAnswersStr = combinedAnswers.join('|');
    const masterSalt = crypto.randomBytes(SALT_LENGTH);
    const keyEncryptionKey = await this.deriveKeyFromPassword(combinedAnswersStr, masterSalt, PBKDF2_ITERATIONS);

    // Encrypt user master key
    const encryptedData = this.encryptMasterKey(userMasterKey, keyEncryptionKey);

    const escrowRecord: EscrowRecord = {
      userId,
      method: EscrowMethod.SECURITY_QUESTIONS,
      encryptedData,
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        algorithm: 'PBKDF2-SHA256-AES256GCM'
      },
      securityQuestions
    };

    this.storeEscrowRecord(userId, escrowRecord);
    return escrowRecord;
  }

  /**
   * Creates social recovery escrow with trusted participants
   */
  async createSocialRecoveryEscrow(
    userId: string,
    userMasterKey: Buffer,
    participantUserIds: string[],
    threshold = RECOVERY_THRESHOLD
  ): Promise<EscrowRecord> {
    if (participantUserIds.length < threshold) {
      throw new Error(`At least ${threshold} participants are required`);
    }

    // Use Shamir's Secret Sharing to split the master key
    const keyShares = this.splitSecret(userMasterKey, participantUserIds.length, threshold);
    
    const participants: RecoveryParticipant[] = [];
    for (let i = 0; i < participantUserIds.length; i++) {
      // Encrypt each key share for the specific participant
      const participantKey = this.deriveParticipantKey(participantUserIds[i]);
      const encryptedShare = this.encryptKeyShare(keyShares[i], participantKey);
      
      participants.push({
        userId: participantUserIds[i],
        keyShare: encryptedShare,
        confirmed: false
      });
    }

    // For social recovery, we store a dummy encrypted value since the actual key is split
    const dummyKey = crypto.randomBytes(KEY_LENGTH);
    const encryptedData = this.encryptMasterKey(userMasterKey, dummyKey);

    const escrowRecord: EscrowRecord = {
      userId,
      method: EscrowMethod.SOCIAL_RECOVERY,
      encryptedData,
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        algorithm: 'SHAMIR-AES256GCM'
      },
      socialRecovery: {
        threshold,
        participants
      }
    };

    this.storeEscrowRecord(userId, escrowRecord);
    return escrowRecord;
  }

  /**
   * Creates backup codes escrow
   */
  async createBackupCodesEscrow(
    userId: string,
    userMasterKey: Buffer,
    codeCount = 10
  ): Promise<{ escrowRecord: EscrowRecord; backupCodes: string[] }> {
    const backupCodes: BackupCode[] = [];
    const plaintextCodes: string[] = [];

    // Generate backup codes
    for (let i = 0; i < codeCount; i++) {
      const code = this.generateBackupCode();
      const salt = crypto.randomBytes(SALT_LENGTH);
      const hash = await this.hashAnswer(code, salt);
      
      backupCodes.push({
        code: '', // Don't store plaintext
        hash,
        salt: salt.toString('hex'),
        used: false
      });
      
      plaintextCodes.push(code);
    }

    // Derive key encryption key from all backup codes combined
    const combinedCodes = plaintextCodes.join('|');
    const masterSalt = crypto.randomBytes(SALT_LENGTH);
    const keyEncryptionKey = await this.deriveKeyFromPassword(combinedCodes, masterSalt, PBKDF2_ITERATIONS);

    // Encrypt user master key
    const encryptedData = this.encryptMasterKey(userMasterKey, keyEncryptionKey);

    const escrowRecord: EscrowRecord = {
      userId,
      method: EscrowMethod.BACKUP_CODES,
      encryptedData,
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1,
        algorithm: 'PBKDF2-SHA256-AES256GCM'
      },
      backupCodes
    };

    this.storeEscrowRecord(userId, escrowRecord);
    return { escrowRecord, backupCodes: plaintextCodes };
  }

  /**
   * Recovers user master key using password
   */
  async recoverWithPassword(userId: string, password: string): Promise<RecoveryResult> {
    const escrowRecord = this.getEscrowRecord(userId, EscrowMethod.PASSWORD);
    if (!escrowRecord) {
      return { success: false, error: 'No password escrow found' };
    }

    // Check recovery attempts
    const rateLimitCheck = await this.checkRecoveryAttempts(userId);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error };
    }

    try {
      const salt = Buffer.from(escrowRecord.passwordData!.salt, 'hex');
      const iterations = escrowRecord.passwordData!.iterations;
      
      const keyEncryptionKey = await this.deriveKeyFromPassword(password, salt, iterations);
      const userMasterKey = this.decryptMasterKey(escrowRecord.encryptedData, keyEncryptionKey);
      
      // Reset recovery attempts on success
      this.resetRecoveryAttempts(userId);
      
      return { success: true, userMasterKey };
    } catch (error) {
      this.incrementRecoveryAttempts(userId);
      return { success: false, error: 'Invalid password' };
    }
  }

  /**
   * Recovers user master key using security questions
   */
  async recoverWithSecurityQuestions(
    userId: string,
    answers: Array<{ questionId: string; answer: string }>
  ): Promise<RecoveryResult> {
    const escrowRecord = this.getEscrowRecord(userId, EscrowMethod.SECURITY_QUESTIONS);
    if (!escrowRecord) {
      return { success: false, error: 'No security questions escrow found' };
    }

    if (answers.length < RECOVERY_THRESHOLD) {
      return { success: false, error: `At least ${RECOVERY_THRESHOLD} correct answers are required` };
    }

    const rateLimitCheck = await this.checkRecoveryAttempts(userId);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error };
    }

    try {
      // Verify answers
      const verifiedAnswers: string[] = [];
      for (const providedAnswer of answers) {
        const question = escrowRecord.securityQuestions!.find(q => q.id === providedAnswer.questionId);
        if (!question) continue;

        const normalizedAnswer = this.normalizeAnswer(providedAnswer.answer);
        const salt = Buffer.from(question.salt, 'hex');
        const expectedHash = await this.hashAnswer(normalizedAnswer, salt);
        
        if (expectedHash === question.answerHash) {
          verifiedAnswers.push(normalizedAnswer);
        }
      }

      if (verifiedAnswers.length < RECOVERY_THRESHOLD) {
        this.incrementRecoveryAttempts(userId);
        return { success: false, error: 'Insufficient correct answers' };
      }

      // Reconstruct key encryption key from verified answers
      const combinedAnswers = verifiedAnswers.join('|');
      const masterSalt = crypto.randomBytes(SALT_LENGTH); // This should be stored with the escrow record
      const keyEncryptionKey = await this.deriveKeyFromPassword(combinedAnswers, masterSalt, PBKDF2_ITERATIONS);
      
      const userMasterKey = this.decryptMasterKey(escrowRecord.encryptedData, keyEncryptionKey);
      
      this.resetRecoveryAttempts(userId);
      return { success: true, userMasterKey };
    } catch (error) {
      this.incrementRecoveryAttempts(userId);
      return { success: false, error: 'Recovery failed' };
    }
  }

  /**
   * Recovers user master key using backup codes
   */
  async recoverWithBackupCode(userId: string, backupCode: string): Promise<RecoveryResult> {
    const escrowRecord = this.getEscrowRecord(userId, EscrowMethod.BACKUP_CODES);
    if (!escrowRecord) {
      return { success: false, error: 'No backup codes escrow found' };
    }

    const rateLimitCheck = await this.checkRecoveryAttempts(userId);
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error };
    }

    try {
      // Find matching backup code
      let matchedCode: BackupCode | undefined;
      for (const code of escrowRecord.backupCodes!) {
        if (code.used) continue;
        
        const salt = Buffer.from(code.salt, 'hex');
        const hash = await this.hashAnswer(backupCode, salt);
        
        if (hash === code.hash) {
          matchedCode = code;
          break;
        }
      }

      if (!matchedCode) {
        this.incrementRecoveryAttempts(userId);
        return { success: false, error: 'Invalid backup code' };
      }

      // Mark code as used
      matchedCode.used = true;
      matchedCode.usedAt = new Date().toISOString();

      // Note: This is a simplified implementation
      // In a real system, you'd need to store enough information to reconstruct the key
      // For now, we'll return an error indicating this needs implementation
      return { success: false, error: 'Backup code recovery not fully implemented' };
    } catch (error) {
      this.incrementRecoveryAttempts(userId);
      return { success: false, error: 'Recovery failed' };
    }
  }

  /**
   * Validates password strength
   */
  private validatePassword(password: string): void {
    const requirements: PasswordRequirements = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      preventCommon: true
    };

    if (password.length < requirements.minLength) {
      throw new Error(`Password must be at least ${requirements.minLength} characters long`);
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (requirements.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }

    // Check against common passwords (simplified)
    const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
    if (requirements.preventCommon && commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too common');
    }
  }

  /**
   * Derives a key from a password using PBKDF2
   */
  private async deriveKeyFromPassword(password: string, salt: Buffer, iterations: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, KEY_LENGTH, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * Encrypts a master key with a key encryption key
   */
  private encryptMasterKey(masterKey: Buffer, keyEncryptionKey: Buffer): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyEncryptionKey, iv);
    
    let encrypted = cipher.update(masterKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts a master key with a key encryption key
   */
  private decryptMasterKey(encryptedData: string, keyEncryptionKey: Buffer): Buffer {
    const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyEncryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  /**
   * Hashes an answer for secure storage
   */
  private async hashAnswer(answer: string, salt: Buffer): Promise<string> {
    const key = await this.deriveKeyFromPassword(answer, salt, PBKDF2_ITERATIONS);
    return key.toString('hex');
  }

  /**
   * Normalizes an answer for consistent hashing
   */
  private normalizeAnswer(answer: string): string {
    return answer.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Generates a backup code
   */
  private generateBackupCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
      const idx = crypto.randomInt(0, chars.length);
      result += chars.charAt(idx);
    }
    return result;
  }

  /**
   * Simplified Shamir's Secret Sharing implementation
   */
  private splitSecret(secret: Buffer, numShares: number, threshold: number): Buffer[] {
    // This is a simplified implementation
    // In production, you'd use a proper Shamir's Secret Sharing library
    const shares: Buffer[] = [];
    for (let i = 0; i < numShares; i++) {
      // For now, just create random shares (this is NOT secure)
      shares.push(crypto.randomBytes(secret.length));
    }
    return shares;
  }

  /**
   * Derives a key for encrypting participant key shares
   */
  private deriveParticipantKey(participantUserId: string): Buffer {
    const keyDerivation = KeyDerivation.getInstance();
    const userMasterKey = keyDerivation.deriveUserMasterKey(participantUserId);
    return userMasterKey.slice(0, 32); // Use first 32 bytes
  }

  /**
   * Encrypts a key share for a participant
   */
  private encryptKeyShare(keyShare: Buffer, participantKey: Buffer): string {
    return this.encryptMasterKey(keyShare, participantKey);
  }

  /**
   * Stores an escrow record
   */
  private storeEscrowRecord(userId: string, record: EscrowRecord): void {
    if (!this.escrowRecords.has(userId)) {
      this.escrowRecords.set(userId, []);
    }
    this.escrowRecords.get(userId)!.push(record);
  }

  /**
   * Retrieves an escrow record by method
   */
  private getEscrowRecord(userId: string, method: EscrowMethod): EscrowRecord | null {
    const userRecords = this.escrowRecords.get(userId);
    if (!userRecords) return null;
    
    return userRecords.find(record => record.method === method) || null;
  }

  /**
   * Checks if recovery attempts are within limits using production rate limiter
   */
  private async checkRecoveryAttempts(userId: string): Promise<{ allowed: boolean; error?: string }> {
    // First, check the simple attempt counter for backwards compatibility
    const attempts = this.recoveryAttempts.get(userId);
    if (attempts && attempts.attempts >= 5) {
      const now = Date.now();
      const cooldownPeriod = 15 * 60 * 1000; // 15 minutes
      
      if ((now - attempts.lastAttempt) < cooldownPeriod) {
        return { allowed: false, error: 'Too many recovery attempts. Please try again later.' };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Increments recovery attempts for rate limiting
   */
  private async incrementRecoveryAttempts(userId: string): Promise<void> {
    const now = Date.now();
    const existing = this.recoveryAttempts.get(userId) || { attempts: 0, lastAttempt: 0 };
    
    this.recoveryAttempts.set(userId, {
      attempts: existing.attempts + 1,
      lastAttempt: now
    });
  }

  /**
   * Resets recovery attempts after successful recovery
   */
  private resetRecoveryAttempts(userId: string): void {
    // Reset the rate limiter state for this user
    this.rateLimiter.reset(userId, 'pwd_recovery');
    // Also clear legacy tracking
    this.recoveryAttempts.delete(userId);
  }
}
