import crypto from 'crypto';
import { getKeyDerivationService } from '@/lib/security/key-derivation-service';
import { getKeyErrorHandler, createKeyErrorWrapper } from '@/lib/keys/key-error-handler';

const ALGORITHM = 'aes-256-gcm';

// Support for derived keys
export interface EncryptionOptions {
  useKeyDerivation?: boolean;
  salt?: string; // hex encoded
  keyDerivationMetadata?: {
    algorithm: string;
    parameters: Record<string, any>;
  };
}

// Validate encryption key at runtime with enhanced error handling
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    const error = new Error('ENCRYPTION_KEY must be a 64-character hex string');
    
    // Try to handle the error if error handler is available
    try {
      const errorHandler = getKeyErrorHandler();
      // Note: This is async but we're in a sync function
      // Real handling would need to be done at a higher level
      console.warn('[ENCRYPTION] Key validation failed, check error handler for recovery options');
    } catch {
      // Error handler not initialized, continue with original behavior
    }
    
    throw error;
  }
  return key;
};

// Enhanced version with async error handling
const getEncryptionKeyWithRecovery = async (): Promise<string> => {
  try {
    return getEncryptionKey();
  } catch (error) {
    try {
      const errorHandler = getKeyErrorHandler();
      const recovery = await errorHandler.handleEnvironmentKeyError(error as Error);
      
      if (recovery.success && !recovery.fallbackMode) {
        // Key was recovered/regenerated, try again
        return getEncryptionKey();
      }
      
      if (recovery.fallbackMode) {
        console.warn('[ENCRYPTION] Using fallback mode due to key error:', recovery.warning);
        // Return a temporary key for demo mode
        return '0'.repeat(64);
      }
    } catch (handlerError) {
      console.error('[ENCRYPTION] Error handler failed:', handlerError);
    }
    
    throw error;
  }
};

// Get or derive encryption key
const getOrDeriveKey = async (options?: EncryptionOptions): Promise<string> => {
  if (options?.useKeyDerivation && options.salt && options.keyDerivationMetadata) {
    // Use derived key
    const keyDerivationService = getKeyDerivationService();
    const baseKey = getEncryptionKey();
    
    const result = await keyDerivationService.deriveKeyHex(
      baseKey,
      Buffer.from(options.salt, 'hex'),
      options.keyDerivationMetadata.parameters
    );
    
    return result.key;
  }
  
  // Use direct key
  return getEncryptionKey();
};

/**
 * Encrypts sensitive data using AES-256-GCM (synchronous version for backward compatibility)
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export const encrypt = (text: string): string => {
  if (text === null || text === undefined) {
    throw new Error('Cannot encrypt null or undefined value');
  }
  
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  if (!iv) {
    throw new Error('Failed to generate IV');
  }
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return legacy format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Encrypts sensitive data using AES-256-GCM with optional key derivation (async version)
 * @param text - The text to encrypt
 * @param options - Optional encryption parameters including key derivation
 * @returns Encrypted string in format: iv:authTag:encryptedData or enhanced format with metadata
 */
export const encryptAsync = async (text: string, options?: EncryptionOptions): Promise<string> => {
  const encryptionKey = await getOrDeriveKey(options);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  if (options?.useKeyDerivation && options.salt && options.keyDerivationMetadata) {
    // Return enhanced format with key derivation metadata
    const result = {
      version: 2,
      algorithm: ALGORITHM,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedData: encrypted,
      keyDerivation: {
        salt: options.salt,
        algorithm: options.keyDerivationMetadata.algorithm,
        parameters: options.keyDerivationMetadata.parameters
      }
    };
    return JSON.stringify(result);
  }
  
  // Return legacy format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};


/**
 * Decrypts data encrypted with the encrypt function (synchronous version for backward compatibility)
 * @param encryptedData - The encrypted string in legacy format (iv:authTag:encryptedData)
 * @returns Decrypted text
 */
export const decrypt = (encryptedData: string): string => {
  if (encryptedData === null || encryptedData === undefined) {
    throw new Error('Cannot decrypt null or undefined value');
  }
  
  // Legacy format: iv:authTag:encryptedData
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }
  
  const encryptionKey = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Decrypts data encrypted with the encrypt function (async version)
 * Supports both legacy format and enhanced format with key derivation
 * @param encryptedData - The encrypted string (legacy or enhanced JSON format)
 * @param baseKey - Optional base key for key derivation (if not using environment key)
 * @returns Decrypted text
 */
export const decryptAsync = async (encryptedData: string, baseKey?: string): Promise<string> => {
  try {
    // Check if this is the enhanced JSON format
    if (encryptedData.startsWith('{')) {
      const data = JSON.parse(encryptedData);
      
      if (data.version === 2 && data.keyDerivation) {
        // Enhanced format with key derivation
        const keyDerivationService = getKeyDerivationService();
        const keySource = baseKey || getEncryptionKey();
        
        const result = await keyDerivationService.deriveKeyHex(
          keySource,
          Buffer.from(data.keyDerivation.salt, 'hex'),
          data.keyDerivation.parameters
        );
        
        const encryptionKey = result.key;
        const iv = Buffer.from(data.iv, 'hex');
        const authTag = Buffer.from(data.authTag, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(data.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      }
    }
    
    // Legacy format: iv:authTag:encryptedData
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    
    const encryptionKey = baseKey || getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[ENCRYPTION] Decryption failed:', error);
    throw new Error('Decryption failed');
  }
};


/**
 * Safely encrypts a token, handling null/undefined values (synchronous version)
 * @param token - The token to encrypt (can be null/undefined)
 * @returns Encrypted token or null if input was null/undefined
 */
export const encryptToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  try {
    return encrypt(token);
  } catch (error) {
    console.error('Failed to encrypt token:', error);
    throw new Error('Token encryption failed');
  }
};

/**
 * Safely encrypts a token, handling null/undefined values (async version)
 * @param token - The token to encrypt (can be null/undefined)
 * @param options - Optional encryption parameters
 * @returns Encrypted token or null if input was null/undefined
 */
export const encryptTokenAsync = async (token: string | null | undefined, options?: EncryptionOptions): Promise<string | null> => {
  if (!token) return null;
  try {
    return await encryptAsync(token, options);
  } catch (error) {
    console.error('Failed to encrypt token:', error);
    throw new Error('Token encryption failed');
  }
};


/**
 * Safely decrypts a token, handling null/undefined values (synchronous version)
 * @param encryptedToken - The encrypted token (can be null/undefined)
 * @returns Decrypted token or null if input was null/undefined
 */
export const decryptToken = (encryptedToken: string | null | undefined): string | null => {
  if (!encryptedToken) return null;
  try {
    return decrypt(encryptedToken);
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    throw new Error('Token decryption failed');
  }
};

/**
 * Safely decrypts a token, handling null/undefined values (async version)
 * @param encryptedToken - The encrypted token (can be null/undefined)
 * @param baseKey - Optional base key for key derivation
 * @returns Decrypted token or null if input was null/undefined
 */
export const decryptTokenAsync = async (encryptedToken: string | null | undefined, baseKey?: string): Promise<string | null> => {
  if (!encryptedToken) return null;
  try {
    return await decryptAsync(encryptedToken, baseKey);
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    throw new Error('Token decryption failed');
  }
};


/**
 * Checks if a string appears to be encrypted (has the expected format)
 * Supports both legacy and enhanced formats
 * @param data - The string to check
 * @returns True if the string appears to be encrypted
 */
export const isEncrypted = (data: string | null | undefined): boolean => {
  if (!data) return false;
  
  // Check enhanced JSON format
  if (data.startsWith('{')) {
    try {
      const parsed = JSON.parse(data);
      return (
        parsed.version === 2 &&
        parsed.algorithm &&
        parsed.iv &&
        parsed.authTag &&
        parsed.encryptedData
      );
    } catch {
      return false;
    }
  }
  
  // Check legacy format: iv:authTag:encryptedData
  const parts = data.split(':');
  return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part));
};

/**
 * Creates encryption options for key derivation
 */
export const createKeyDerivationOptions = async (
  salt?: string
): Promise<EncryptionOptions> => {
  try {
    const keyDerivationService = getKeyDerivationService();
    const actualSalt = salt || crypto.randomBytes(32).toString('hex');
    
    return {
      useKeyDerivation: true,
      salt: actualSalt,
      keyDerivationMetadata: {
        algorithm: 'argon2id',
        parameters: keyDerivationService.getSecurityParameters()
      }
    };
  } catch (error) {
    console.error('[ENCRYPTION] Failed to create key derivation options:', error);
    throw new Error('Key derivation setup failed');
  }
};

/**
 * Encrypts with automatic key derivation
 */
export const encryptWithKeyDerivation = async (text: string, salt?: string): Promise<string> => {
  const options = await createKeyDerivationOptions(salt);
  return await encryptAsync(text, options);
};

/**
 * Enhanced encryption with comprehensive error handling
 */
export const encryptWithRecovery = async (
  text: string, 
  options?: EncryptionOptions
): Promise<string> => {
  try {
    let errorWrapper: any;
    try {
      errorWrapper = createKeyErrorWrapper();
    } catch {
      // Fallback wrapper when KeyErrorHandler is not initialized
      errorWrapper = {
        safeEncrypt: async (op: () => Promise<string>, fallback?: () => Promise<string>) => {
          try { return await op(); } catch (e) { if (fallback) return await fallback(); throw e; }
        }
      };
    }
    return await errorWrapper.safeEncrypt(
      async () => encryptAsync(text, options),
      // Fallback: try without key derivation
      options?.useKeyDerivation ? async () => encrypt(text) : undefined
    );
  } catch (error) {
    console.error('[ENCRYPTION] Enhanced encryption failed:', error);
    throw new Error('Encryption failed with recovery attempts');
  }
};

/**
 * Enhanced decryption with comprehensive error handling
 */
export const decryptWithRecovery = async (
  encryptedData: string,
  baseKey?: string
): Promise<string> => {
  try {
    let errorWrapper: any;
    try {
      errorWrapper = createKeyErrorWrapper();
    } catch {
      // Fallback wrapper when KeyErrorHandler is not initialized
      errorWrapper = {
        safeDecrypt: async (op: () => Promise<string>, fallback?: () => Promise<string>) => {
          try { return await op(); } catch (e) { if (fallback) return await fallback(); throw e; }
        }
      };
    }
    return await errorWrapper.safeDecrypt(
      async () => decryptAsync(encryptedData, baseKey),
      // Fallback: try with different format parsing
      async () => {
        // If JSON format fails, try legacy format
        if (encryptedData.startsWith('{')) {
          throw new Error('JSON format parsing failed, no legacy fallback');
        }
        return decrypt(encryptedData);
      }
    );
  } catch (error) {
    console.error('[ENCRYPTION] Enhanced decryption failed:', error);
    throw new Error('Decryption failed with recovery attempts');
  }
};

/**
 * Safe token encryption with graceful degradation
 */
export const encryptTokenWithRecovery = async (
  token: string | null | undefined,
  options?: EncryptionOptions
): Promise<string | null> => {
  if (!token) return null;
  
  try {
    return await encryptWithRecovery(token, options);
  } catch (error) {
    console.warn('[ENCRYPTION] Token encryption failed, attempting graceful degradation:', error);
    
    // In development, return unencrypted with warning
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ENCRYPTION] WARNING: Storing token unencrypted in development mode');
      return `UNENCRYPTED:${token}`;
    }
    
    throw error;
  }
};

/**
 * Safe token decryption with graceful degradation
 */
export const decryptTokenWithRecovery = async (
  encryptedToken: string | null | undefined,
  baseKey?: string
): Promise<string | null> => {
  if (!encryptedToken) return null;
  
  // Handle unencrypted tokens from development mode
  if (encryptedToken.startsWith('UNENCRYPTED:')) {
    console.warn('[ENCRYPTION] WARNING: Processing unencrypted token from development mode');
    return encryptedToken.replace('UNENCRYPTED:', '');
  }
  
  try {
    return await decryptWithRecovery(encryptedToken, baseKey);
  } catch (error) {
    console.error('[ENCRYPTION] Token decryption failed:', error);
    return null; // Graceful degradation - return null instead of throwing
  }
};

/**
 * Validates encrypted data format with recovery suggestions
 */
export const validateEncryptedData = (data: string): {
  valid: boolean;
  format: 'legacy' | 'enhanced' | 'unknown';
  issues: string[];
  recoverable: boolean;
} => {
  const issues: string[] = [];
  let format: 'legacy' | 'enhanced' | 'unknown' = 'unknown';
  let recoverable = false;
  
  try {
    if (data.startsWith('{')) {
      // Enhanced JSON format
      const parsed = JSON.parse(data);
      format = 'enhanced';
      
      if (!parsed.version) issues.push('Missing version field');
      if (!parsed.algorithm) issues.push('Missing algorithm field');
      if (!parsed.iv) issues.push('Missing IV field');
      if (!parsed.authTag) issues.push('Missing auth tag field');
      if (!parsed.encryptedData) issues.push('Missing encrypted data field');
      
      recoverable = issues.length === 0;
    } else {
      // Legacy format
      const parts = data.split(':');
      format = 'legacy';
      
      if (parts.length !== 3) {
        issues.push('Invalid legacy format - expected 3 parts');
      } else {
        const [iv, authTag, encrypted] = parts;
        if (!/^[0-9a-f]+$/i.test(iv)) issues.push('Invalid IV format');
        if (!/^[0-9a-f]+$/i.test(authTag)) issues.push('Invalid auth tag format');
        if (!/^[0-9a-f]+$/i.test(encrypted)) issues.push('Invalid encrypted data format');
      }
      
      recoverable = issues.length === 0;
    }
  } catch (parseError) {
    issues.push('JSON parsing failed');
    recoverable = false;
  }
  
  return {
    valid: issues.length === 0,
    format,
    issues,
    recoverable
  };
};
