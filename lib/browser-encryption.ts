/**
 * Browser-safe encryption utilities using Web Crypto API
 * 
 * Provides encryption/decryption for browser storage with proper key derivation
 * from a user-specific seed (like user ID or session ID).
 * 
 * Security Features:
 * - Production-grade PBKDF2 parameters (600k+ iterations)
 * - Argon2 support for browsers that support it (future)
 * - Configurable security levels
 * - Salt generation and validation
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_LENGTH = 32;
// AES-GCM recommends a 12-byte nonce (IV)

// Security level-based PBKDF2 iterations
const PBKDF2_ITERATIONS = {
  development: 100000,   // 100k - minimum acceptable for dev
  testing: 200000,       // 200k - testing environment
  production: 600000,    // 600k - OWASP recommendation for production
  high_security: 1000000 // 1M - high security applications
} as const;

type SecurityLevel = keyof typeof PBKDF2_ITERATIONS;

// Get security level from environment or default to production
const getSecurityLevel = (): SecurityLevel => {
  const envLevel = (process.env.NEXT_PUBLIC_SECURITY_LEVEL || 'production') as SecurityLevel;
  return PBKDF2_ITERATIONS[envLevel] ? envLevel : 'production';
};

const CURRENT_ITERATIONS = PBKDF2_ITERATIONS[getSecurityLevel()];

/**
 * Derives an encryption key from a password/seed using PBKDF2 with production-grade parameters
 * 
 * @param seed - The password or seed string
 * @param salt - Salt for key derivation
 * @param iterations - Custom iteration count (optional)
 * @param hash - Hash algorithm (optional, defaults to SHA-512)
 */
export async function deriveKey(
  seed: string, 
  salt: Uint8Array | ArrayBufferView,
  iterations?: number,
  hash: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-512'
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const seedKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(seed),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const actualIterations = iterations || CURRENT_ITERATIONS;
  
  // Log security level for monitoring
  if (actualIterations < 500000) {
    console.warn(`[BROWSER_ENCRYPTION] Using ${actualIterations} PBKDF2 iterations. Consider increasing for production.`);
  }

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: actualIterations,
      hash
    },
    seedKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Key derivation metadata for storage and verification
 */
export interface KeyDerivationMetadata {
  algorithm: 'PBKDF2' | 'Argon2id';
  iterations?: number;
  hash?: string;
  salt: string;
  securityLevel: SecurityLevel;
  derivedAt: string;
  ivLength?: number;
}

/**
 * Enhanced encrypted data format with metadata
 */
export interface EncryptedBrowserData {
  encryptedData: string;
  metadata: KeyDerivationMetadata;
  version: number;
}

/**
 * Encrypts data for browser storage using Web Crypto API with enhanced security
 * 
 * @param plaintext - Data to encrypt
 * @param seed - Seed for key derivation
 * @param options - Optional security parameters
 */
export async function encryptForBrowser(
  plaintext: string,
  seed: string,
  options?: {
    iterations?: number;
    hash?: 'SHA-256' | 'SHA-384' | 'SHA-512';
    includeMetadata?: boolean;
  }
): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from seed with custom parameters
    const iterations = options?.iterations || CURRENT_ITERATIONS;
    const hash = options?.hash || 'SHA-512';
    const key = await deriveKey(seed, salt, iterations, hash);
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    if (options?.includeMetadata) {
      // Return enhanced format with metadata
      const metadata: KeyDerivationMetadata = {
        algorithm: 'PBKDF2',
        iterations,
        hash,
        salt: Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join(''),
        securityLevel: getSecurityLevel(),
        derivedAt: new Date().toISOString(),
        ivLength: iv.byteLength
      };

      const result: EncryptedBrowserData = {
        encryptedData: btoa(String.fromCharCode(
          ...iv,
          ...new Uint8Array(encrypted)
        )),
        metadata,
        version: 2
      };

      return JSON.stringify(result);
    } else {
      // Legacy format for backward compatibility
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      return btoa(String.fromCharCode(...combined));
    }
  } catch (error) {
    console.error('[BROWSER_ENCRYPTION] Encryption failed:', error);
    throw new Error('Failed to encrypt data for browser storage');
  }
}

/**
 * Decrypts data from browser storage using Web Crypto API
 * Supports both legacy and enhanced formats with metadata
 * 
 * @param encryptedData - Encrypted data string (legacy format or JSON with metadata)
 * @param seed - Seed for key derivation
 */
export async function decryptFromBrowser(
  encryptedData: string,
  seed: string
): Promise<string> {
  try {
    // Check if this is the enhanced format (JSON) or legacy format
    if (encryptedData.startsWith('{')) {
      // Enhanced format with metadata
      const data: EncryptedBrowserData = JSON.parse(encryptedData);
      
      if (data.version !== 2) {
        throw new Error(`Unsupported data version: ${data.version}`);
      }

      // Extract parameters from metadata
      const salt = new Uint8Array(data.metadata.salt.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      const encryptedBytes = new Uint8Array(
        atob(data.encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      const ivLength = (data.metadata as any).ivLength ?? 12;
      const iv = encryptedBytes.slice(0, ivLength);
      const encrypted = encryptedBytes.slice(ivLength);
      
      // Derive key with metadata parameters
      const key = await deriveKey(
        seed, 
        salt, 
        data.metadata.iterations,
        data.metadata.hash as 'SHA-256' | 'SHA-384' | 'SHA-512'
      );
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } else {
      // Legacy format - convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, SALT_LENGTH);
      const ivLengthLegacy = 12;
      const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + ivLengthLegacy);
      const encrypted = combined.slice(SALT_LENGTH + ivLengthLegacy);
      
      // Derive key from seed (using legacy parameters)
      const key = await deriveKey(seed, salt, 100000, 'SHA-256'); // Legacy defaults
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    }
  } catch (error) {
    console.error('[BROWSER_ENCRYPTION] Decryption failed:', error);
    throw new Error('Failed to decrypt data from browser storage');
  }
}

/**
 * Generates a unique seed for a user session
 * This should be stored in memory only, not in persistent storage
 */
export function generateSessionSeed(userId: string, sessionId: string): string {
  // Combine user ID and session ID to create a unique seed
  // This ensures each user session has its own encryption key
  return `${userId}:${sessionId}:${Date.now()}`;
}

/**
 * Validates if a string is properly encrypted browser data
 * Supports both legacy and enhanced formats
 */
export function isValidBrowserEncrypted(data: string): boolean {
  if (!data) return false;
  
  try {
    if (data.startsWith('{')) {
      // Enhanced format - validate JSON structure
      const parsed: EncryptedBrowserData = JSON.parse(data);
      return Boolean(
        parsed.version === 2 &&
        parsed.encryptedData &&
        parsed.metadata &&
        parsed.metadata.algorithm &&
        parsed.metadata.salt &&
        parsed.metadata.securityLevel
      );
    } else {
      // Legacy format - try to decode base64
      const decoded = atob(data);
      // Check minimum length (salt + iv + at least some encrypted data)
      return decoded.length >= SALT_LENGTH + 12 + 16;
    }
  } catch {
    return false;
  }
}

/**
 * Gets the security level information from encrypted data
 */
export function getEncryptionMetadata(encryptedData: string): KeyDerivationMetadata | null {
  try {
    if (encryptedData.startsWith('{')) {
      const data: EncryptedBrowserData = JSON.parse(encryptedData);
      return data.metadata;
    }
  } catch {
    // Fall through to return null
  }
  return null;
}

/**
 * Encrypts data with enhanced security and metadata
 */
export async function encryptForBrowserSecure(
  plaintext: string,
  seed: string,
  customIterations?: number
): Promise<string> {
  return encryptForBrowser(plaintext, seed, {
    iterations: customIterations,
    includeMetadata: true
  });
}

/**
 * Benchmarks key derivation performance
 */
export async function benchmarkKeyDerivation(): Promise<{
  securityLevel: SecurityLevel;
  iterations: number;
  timeMs: number;
}> {
  const securityLevel = getSecurityLevel();
  const iterations = CURRENT_ITERATIONS;
  const testSeed = 'benchmark-test-seed';
  const testSalt = new Uint8Array(32);
  crypto.getRandomValues(testSalt);
  
  const startTime = performance.now();
  await deriveKey(testSeed, testSalt, iterations);
  const endTime = performance.now();
  
  return {
    securityLevel,
    iterations,
    timeMs: endTime - startTime
  };
}
