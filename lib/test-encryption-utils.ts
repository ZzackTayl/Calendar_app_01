/**
 * Secure Test Encryption Utilities
 *
 * Provides secure encryption key management for test environments
 * without hardcoded keys or credentials.
 */

/**
 * Get secure test encryption key from environment or generate one
 */
export function getTestEncryptionKey(): string {
  const envKey = process.env.TEST_ENCRYPTION_KEY;

  if (envKey) {
    // Validate the key format (64-character hex)
    if (!/^[0-9a-f]{64}$/i.test(envKey)) {
      throw new Error('TEST_ENCRYPTION_KEY must be a 64-character hex string');
    }
    return envKey;
  }

  // For unit tests where environment setup might not be complete,
  // generate a secure test key (but log a warning)
  if (process.env.TEST_TYPE === 'unit') {
    console.warn('⚠️  Using generated test encryption key. Set TEST_ENCRYPTION_KEY for consistent testing.');
    return require('crypto').randomBytes(32).toString('hex');
  }

  throw new Error('TEST_ENCRYPTION_KEY environment variable is required for encryption tests');
}

/**
 * Get secure test user password from environment
 */
export function getTestUserPassword(): string {
  const password = process.env.TEST_USER_PASSWORD;

  if (!password) {
    throw new Error('TEST_USER_PASSWORD environment variable is required');
  }

  return password;
}

/**
 * Validate that no hardcoded credentials are being used
 */
export function validateNoHardcodedCredentials(value: string): void {
  const hardcodedPatterns = [
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'TestPassword123!',
    'SecurePass123!',
    'password123',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  ];

  for (const pattern of hardcodedPatterns) {
    if (value.includes(pattern)) {
      throw new Error(`Hardcoded credential detected: ${pattern.substring(0, 20)}...`);
    }
  }
}

/**
 * Generate secure test data with proper randomization
 */
export function generateSecureTestData(): {
  email: string;
  password: string;
  encryptionKey: string;
} {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);

  return {
    email: `test-${timestamp}-${random}@example.com`,
    password: getTestUserPassword(),
    encryptionKey: getTestEncryptionKey(),
  };
}

/**
 * Security assertion helper for tests
 */
export function assertSecureTestEnvironment(): void {
  if (!process.env.TEST_TYPE) {
    throw new Error('TEST_TYPE environment variable must be set');
  }

  if (!process.env.TEST_ENCRYPTION_KEY) {
    throw new Error('TEST_ENCRYPTION_KEY environment variable must be set');
  }

  if (!process.env.TEST_USER_PASSWORD) {
    throw new Error('TEST_USER_PASSWORD environment variable must be set');
  }

  // Validate key formats
  validateNoHardcodedCredentials(process.env.TEST_ENCRYPTION_KEY);
  validateNoHardcodedCredentials(process.env.TEST_USER_PASSWORD);
}