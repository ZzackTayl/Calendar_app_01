import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Validate encryption key at runtime
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }
  return key;
};

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text - The text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export const encrypt = (text: string): string => {
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts data encrypted with the encrypt function
 * @param encryptedData - The encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted text
 */
export const decrypt = (encryptedData: string): string => {
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
 * Safely encrypts a token, handling null/undefined values
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
 * Safely decrypts a token, handling null/undefined values
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
 * Checks if a string appears to be encrypted (has the expected format)
 * @param data - The string to check
 * @returns True if the string appears to be encrypted
 */
export const isEncrypted = (data: string | null | undefined): boolean => {
  if (!data) return false;
  const parts = data.split(':');
  return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part));
};
