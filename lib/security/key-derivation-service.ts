/**
 * Production-Grade Key Derivation Service
 * 
 * Provides secure key stretching and derivation using modern cryptographic algorithms:
 * - Argon2id (recommended) - Winner of Password Hashing Competition
 * - scrypt - Alternative with good security properties
 * - PBKDF2 - Fallback for compatibility
 * 
 * Security Features:
 * - Configurable parameters based on environment
 * - Salt generation and validation
 * - Timing attack resistance
 * - Memory-hard algorithms for GPU resistance
 * - Comprehensive error handling and logging
 */

import * as crypto from 'crypto';
import { z } from 'zod';

// Dynamic import for Argon2 to avoid Vercel build issues
let argon2: any = null;
let argon2Available = false;
let argon2InitAttempted = false;

// Initialize Argon2 if available (only in Node.js runtime, not during build)
const initializeArgon2 = async () => {
  if (argon2InitAttempted) return argon2;
  argon2InitAttempted = true;
  
  try {
    // Only attempt import in Node.js runtime environment
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'development') {
      // Use eval to avoid webpack bundling the import
      const importFunc = new Function('moduleName', 'return import(moduleName)');
      const argon2Module = await importFunc('@node-rs/argon2');
      argon2 = {
        hash: argon2Module.hash,
        verify: argon2Module.verify
      };
      argon2Available = true;
      console.log('[KEY_DERIVATION] Argon2 initialized successfully');
    } else {
      console.log('[KEY_DERIVATION] Skipping Argon2 in development/browser environment');
    }
  } catch (error) {
    console.warn('[KEY_DERIVATION] Argon2 not available, using PBKDF2 fallback');
    argon2Available = false;
  }
  
  return argon2;
};

// Key derivation algorithms
export enum KeyDerivationAlgorithm {
  ARGON2ID = 'argon2id',
  SCRYPT = 'scrypt',
  PBKDF2 = 'pbkdf2'
}

// Environment-based security levels
export enum SecurityLevel {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  PRODUCTION = 'production',
  HIGH_SECURITY = 'high_security'
}

// Argon2 parameters by security level
const ARGON2_PARAMS = {
  [SecurityLevel.DEVELOPMENT]: {
    memoryCost: 4096,     // 4 MB
    timeCost: 3,          // 3 iterations
    parallelism: 1        // 1 thread
  },
  [SecurityLevel.TESTING]: {
    memoryCost: 8192,     // 8 MB
    timeCost: 3,          // 3 iterations
    parallelism: 1        // 1 thread
  },
  [SecurityLevel.PRODUCTION]: {
    memoryCost: 65536,    // 64 MB
    timeCost: 4,          // 4 iterations
    parallelism: 2        // 2 threads
  },
  [SecurityLevel.HIGH_SECURITY]: {
    memoryCost: 131072,   // 128 MB
    timeCost: 6,          // 6 iterations
    parallelism: 4        // 4 threads
  }
};

// scrypt parameters by security level
const SCRYPT_PARAMS = {
  [SecurityLevel.DEVELOPMENT]: {
    cost: 16384,          // N = 2^14
    blockSize: 8,         // r = 8
    parallelism: 1        // p = 1
  },
  [SecurityLevel.TESTING]: {
    cost: 32768,          // N = 2^15
    blockSize: 8,         // r = 8
    parallelism: 1        // p = 1
  },
  [SecurityLevel.PRODUCTION]: {
    cost: 131072,         // N = 2^17
    blockSize: 8,         // r = 8
    parallelism: 2        // p = 2
  },
  [SecurityLevel.HIGH_SECURITY]: {
    cost: 524288,         // N = 2^19
    blockSize: 8,         // r = 8
    parallelism: 4        // p = 4
  }
};

// PBKDF2 iterations by security level - configurable via environment
const getPBKDF2Iterations = (level: SecurityLevel): number => {
  const envVar = process.env.PBKDF2_ITERATIONS;
  if (envVar) {
    const parsed = parseInt(envVar, 10);
    if (isNaN(parsed) || parsed < 10000) {
      console.warn(`[KEY_DERIVATION] Invalid PBKDF2_ITERATIONS: ${envVar}, using default for ${level}`);
    } else {
      return parsed;
    }
  }

  switch (level) {
    case SecurityLevel.DEVELOPMENT: return 100000;
    case SecurityLevel.TESTING: return 50000;
    case SecurityLevel.PRODUCTION: return 600000;
    case SecurityLevel.HIGH_SECURITY: return 1000000;
    default: return 600000;
  }
};

// Configuration schema
const keyDerivationConfigSchema = z.object({
  algorithm: z.nativeEnum(KeyDerivationAlgorithm),
  securityLevel: z.nativeEnum(SecurityLevel),
  saltLength: z.number().min(16).max(64).default(32),
  keyLength: z.number().min(32).max(64).default(32)
});

export interface KeyDerivationConfig {
  algorithm: KeyDerivationAlgorithm;
  securityLevel: SecurityLevel;
  saltLength?: number;
  keyLength?: number;
}

export interface DerivedKeyResult {
  derivedKey: Buffer;
  salt: Buffer;
  algorithm: KeyDerivationAlgorithm;
  parameters: Record<string, any>;
  derivedAt: string;
}

export interface KeyDerivationMetadata {
  algorithm: KeyDerivationAlgorithm;
  salt: string; // hex encoded
  parameters: Record<string, any>;
  derivedAt: string;
}

export class KeyDerivationService {
  private config: Required<KeyDerivationConfig>;

  constructor(config: KeyDerivationConfig) {
    this.config = keyDerivationConfigSchema.parse({
      ...config,
      saltLength: config.saltLength ?? 32,
      keyLength: config.keyLength ?? 32
    }) as Required<KeyDerivationConfig>;

    this.logSecurityLevel();
  }

  /**
   * Derives a cryptographic key from a password/seed with secure parameters
   */
  async deriveKey(
    password: string,
    salt?: Buffer,
    customParams?: Record<string, any>
  ): Promise<DerivedKeyResult> {
    if (typeof password !== 'string') {
      throw new Error('Password cannot be empty');
    }

    if (password.trim().length === 0) {
      throw new Error('Password cannot be empty');
    }

    // Generate salt if not provided
    const actualSalt = salt ?? crypto.randomBytes(this.config.saltLength);
    
    let derivedKey: Buffer;
    let parameters: Record<string, any>;

    try {
      switch (this.config.algorithm) {
        case KeyDerivationAlgorithm.ARGON2ID:
          // Try Argon2, fall back to PBKDF2 if not available
          await initializeArgon2();
          if (argon2Available) {
            const result = await this.deriveWithArgon2(password, actualSalt, customParams);
            derivedKey = result.key;
            parameters = result.params;
          } else {
            console.warn('[KEY_DERIVATION] Argon2 unavailable, falling back to PBKDF2');
            const pbkdf2Result = await this.deriveWithPbkdf2(password, actualSalt, customParams);
            derivedKey = pbkdf2Result.key;
            parameters = { ...pbkdf2Result.params, fallbackFrom: 'argon2id' };
          }
          break;

        case KeyDerivationAlgorithm.SCRYPT:
          const scryptResult = await this.deriveWithScrypt(password, actualSalt, customParams);
          derivedKey = scryptResult.key;
          parameters = scryptResult.params;
          break;

        case KeyDerivationAlgorithm.PBKDF2:
          const pbkdf2Result = await this.deriveWithPbkdf2(password, actualSalt, customParams);
          derivedKey = pbkdf2Result.key;
          parameters = pbkdf2Result.params;
          break;

        default:
          throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
      }

      return {
        derivedKey,
        salt: actualSalt,
        algorithm: this.config.algorithm,
        parameters,
        derivedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[KEY_DERIVATION] Key derivation failed:', error);
      throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Derives a key and returns it as a hex string (for compatibility with existing encryption)
   */
  async deriveKeyHex(
    password: string,
    salt?: Buffer,
    customParams?: Record<string, any>
  ): Promise<{ key: string; metadata: KeyDerivationMetadata }> {
    const result = await this.deriveKey(password, salt, customParams);
    
    return {
      key: result.derivedKey.toString('hex'),
      metadata: {
        algorithm: result.algorithm,
        salt: result.salt.toString('hex'),
        parameters: result.parameters,
        derivedAt: result.derivedAt
      }
    };
  }

  /**
   * Verifies a password against a previously derived key
   */
  async verifyKey(
    password: string,
    metadata: KeyDerivationMetadata,
    expectedKey: string
  ): Promise<boolean> {
    try {
      // For Argon2, use built-in verification if available
      if (metadata.algorithm === KeyDerivationAlgorithm.ARGON2ID && metadata.parameters.hash) {
        await initializeArgon2();
        if (argon2Available && argon2.verify) {
          return await argon2.verify(metadata.parameters.hash, password);
        }
      }

      // For other algorithms, derive and compare
      const salt = Buffer.from(metadata.salt, 'hex');
      const result = await this.deriveKey(password, salt, metadata.parameters);
      
      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        result.derivedKey,
        Buffer.from(expectedKey, 'hex')
      );
    } catch (error) {
      console.error('[KEY_DERIVATION] Key verification failed:', error);
      return false;
    }
  }

  /**
   * Derives key using Argon2id (recommended)
   */
  private async deriveWithArgon2(
    password: string,
    salt: Buffer,
    customParams?: Record<string, any>
  ): Promise<{ key: Buffer; params: Record<string, any> }> {
    if (!argon2 || !argon2Available) {
      throw new Error('Argon2 is not available');
    }

    const params = {
      ...ARGON2_PARAMS[this.config.securityLevel],
      ...customParams
    };

    // Generate Argon2id hash
    const hash = await argon2.hash(password, {
      salt,
      memoryCost: params.memoryCost,
      timeCost: params.timeCost,
      parallelism: params.parallelism,
      outputLen: this.config.keyLength
    });

    // Extract the key from the hash
    const hashBuffer = Buffer.from(hash.split('$').pop()!, 'base64');
    
    return {
      key: hashBuffer.subarray(0, this.config.keyLength),
      params: {
        ...params,
        hash // Store full hash for verification
      }
    };
  }

  /**
   * Derives key using scrypt
   */
  private async deriveWithScrypt(
    password: string,
    salt: Buffer,
    customParams?: Record<string, any>
  ): Promise<{ key: Buffer; params: Record<string, any> }> {
    const params = {
      ...SCRYPT_PARAMS[this.config.securityLevel],
      ...customParams
    };

    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        this.config.keyLength,
        {
          cost: params.cost,
          blockSize: params.blockSize,
          parallelization: params.parallelism
        },
        (err, derivedKey) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              key: derivedKey,
              params
            });
          }
        }
      );
    });
  }

  /**
   * Derives key using PBKDF2 (fallback)
   */
  private async deriveWithPbkdf2(
    password: string,
    salt: Buffer,
    customParams?: Record<string, any>
  ): Promise<{ key: Buffer; params: Record<string, any> }> {
    const iterations = customParams?.iterations ?? getPBKDF2Iterations(this.config.securityLevel);
    const digest = customParams?.digest ?? 'sha512';

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        iterations,
        this.config.keyLength,
        digest,
        (err, derivedKey) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              key: derivedKey,
              params: { iterations, digest }
            });
          }
        }
      );
    });
  }

  /**
   * Gets the current security level parameters
   */
  getSecurityParameters(): Record<string, any> {
    switch (this.config.algorithm) {
      case KeyDerivationAlgorithm.ARGON2ID:
        return ARGON2_PARAMS[this.config.securityLevel];
      case KeyDerivationAlgorithm.SCRYPT:
        return SCRYPT_PARAMS[this.config.securityLevel];
      case KeyDerivationAlgorithm.PBKDF2:
        return { iterations: getPBKDF2Iterations(this.config.securityLevel) };
      default:
        return {};
    }
  }

  /**
   * Estimates the time cost of key derivation (for performance planning)
   */
  async benchmarkDerivation(samplePassword?: string): Promise<{
    timeMs: number;
    algorithm: KeyDerivationAlgorithm;
    securityLevel: SecurityLevel;
    parameters: Record<string, any>;
  }> {
    // Generate random password if none provided to avoid hardcoded values
    const password = samplePassword || crypto.randomBytes(16).toString('hex');
    const startTime = process.hrtime.bigint();

    await this.deriveKey(password);

    const endTime = process.hrtime.bigint();
    const timeMs = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    return {
      timeMs,
      algorithm: this.config.algorithm,
      securityLevel: this.config.securityLevel,
      parameters: this.getSecurityParameters()
    };
  }

  /**
   * Creates a service instance with recommended production settings
   */
  static createProductionService(): KeyDerivationService {
    return new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.PRODUCTION
    });
  }

  /**
   * Creates a service instance for development/testing
   */
  static createDevelopmentService(): KeyDerivationService {
    return new KeyDerivationService({
      algorithm: KeyDerivationAlgorithm.ARGON2ID,
      securityLevel: SecurityLevel.DEVELOPMENT
    });
  }

  /**
   * Logs current security configuration
   */
  private logSecurityLevel(): void {
    const params = this.getSecurityParameters();
    console.log(`[KEY_DERIVATION] Initialized with ${this.config.algorithm} at ${this.config.securityLevel} security level:`, params);
    
    if (this.config.securityLevel === SecurityLevel.DEVELOPMENT) {
      console.warn('[KEY_DERIVATION] WARNING: Using development security parameters. Not suitable for production!');
    } else if (this.config.securityLevel === SecurityLevel.TESTING) {
      console.info('[KEY_DERIVATION] Using testing security parameters - suitable for test environments');
    }
  }
}

/**
 * Default service instance based on environment
 */
export const getKeyDerivationService = (): KeyDerivationService => {
  const nodeEnv = process.env.NODE_ENV;
  let defaultSecurityLevel: SecurityLevel;
  
  switch (nodeEnv) {
    case 'production':
      defaultSecurityLevel = SecurityLevel.PRODUCTION;
      break;
    case 'test':
      defaultSecurityLevel = SecurityLevel.TESTING;
      break;
    case 'development':
    default:
      defaultSecurityLevel = SecurityLevel.DEVELOPMENT;
      break;
  }

  const securityLevel = process.env.SECURITY_LEVEL as SecurityLevel || defaultSecurityLevel;
  const algorithm = process.env.KEY_DERIVATION_ALGORITHM as KeyDerivationAlgorithm || 
    KeyDerivationAlgorithm.ARGON2ID;

  return new KeyDerivationService({
    algorithm,
    securityLevel
  });
};

