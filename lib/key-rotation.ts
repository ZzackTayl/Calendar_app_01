/**
 * Key Rotation System
 * 
 * Manages encryption key versioning, rotation, and migration of encrypted data.
 * Supports gradual migration and maintains backward compatibility.
 */

import crypto from 'crypto';
import { encrypt, decrypt } from './encryption';

export interface KeyVersion {
  version: number;
  key: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'rotating' | 'deprecated' | 'retired';
}

export interface EncryptedWithVersion {
  version: number;
  data: string;
}

export interface KeyRotationConfig {
  rotationIntervalDays: number;
  deprecationPeriodDays: number;
  maxKeyVersions: number;
}

const DEFAULT_CONFIG: KeyRotationConfig = {
  rotationIntervalDays: 90,
  deprecationPeriodDays: 30,
  maxKeyVersions: 5
};

/**
 * Key Rotation Manager
 * 
 * Handles key versioning, rotation, and migration of encrypted data
 */
export class KeyRotationManager {
  private config: KeyRotationConfig;
  private keyVersions: Map<number, KeyVersion> = new Map();
  private currentVersion: number = 1;

  constructor(config: Partial<KeyRotationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with existing keys or generate first key
   */
  async initialize(existingKeys?: KeyVersion[]): Promise<void> {
    if (existingKeys && existingKeys.length > 0) {
      // Load existing keys
      for (const key of existingKeys) {
        this.keyVersions.set(key.version, key);
      }
      // Find the current active key
      const activeKey = existingKeys.find(k => k.status === 'active');
      if (activeKey) {
        this.currentVersion = activeKey.version;
      }
    } else {
      // Generate initial key
      await this.generateNewKey();
    }
  }

  /**
   * Generate a new encryption key
   */
  private async generateNewKey(): Promise<KeyVersion> {
    const key = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.config.rotationIntervalDays);

    const keyVersion: KeyVersion = {
      version: this.currentVersion,
      key,
      createdAt: now,
      expiresAt,
      status: 'active'
    };

    this.keyVersions.set(this.currentVersion, keyVersion);
    return keyVersion;
  }

  /**
   * Rotate to a new encryption key
   */
  async rotateKey(): Promise<KeyVersion> {
    // Mark current key as rotating
    const currentKey = this.keyVersions.get(this.currentVersion);
    if (currentKey) {
      currentKey.status = 'rotating';
    }

    // Generate new key
    this.currentVersion++;
    const newKey = await this.generateNewKey();

    // Schedule deprecation of old keys
    this.scheduleKeyDeprecation();

    return newKey;
  }

  /**
   * Schedule deprecation of old keys
   */
  private scheduleKeyDeprecation(): void {
    const now = new Date();
    const deprecationDate = new Date(now);
    deprecationDate.setDate(deprecationDate.getDate() - this.config.deprecationPeriodDays);

    for (const [version, key] of this.keyVersions) {
      if (key.status === 'rotating' && key.createdAt < deprecationDate) {
        key.status = 'deprecated';
      }
      
      // Retire very old keys
      const retirementDate = new Date(now);
      retirementDate.setDate(retirementDate.getDate() - (this.config.deprecationPeriodDays * 2));
      if (key.status === 'deprecated' && key.createdAt < retirementDate) {
        key.status = 'retired';
      }
    }

    // Remove retired keys if we exceed max versions
    if (this.keyVersions.size > this.config.maxKeyVersions) {
      const sortedKeys = Array.from(this.keyVersions.entries())
        .sort((a, b) => a[0] - b[0]);
      
      while (sortedKeys.length > this.config.maxKeyVersions) {
        const [version, key] = sortedKeys.shift()!;
        if (key.status === 'retired') {
          this.keyVersions.delete(version);
        }
      }
    }
  }

  /**
   * Encrypt data with current key version
   */
  async encryptWithVersion(plaintext: string): Promise<EncryptedWithVersion> {
    const currentKey = this.keyVersions.get(this.currentVersion);
    if (!currentKey) {
      throw new Error('No active encryption key available');
    }

    // Temporarily set the encryption key environment variable
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = currentKey.key;

    try {
      const encryptedData = await encrypt(plaintext);
      return {
        version: this.currentVersion,
        data: encryptedData
      };
    } finally {
      // Restore original key
      if (originalKey) {
        process.env.ENCRYPTION_KEY = originalKey;
      } else {
        delete process.env.ENCRYPTION_KEY;
      }
    }
  }

  /**
   * Decrypt data with appropriate key version
   */
  async decryptWithVersion(encrypted: EncryptedWithVersion): Promise<string> {
    const key = this.keyVersions.get(encrypted.version);
    if (!key) {
      throw new Error(`Encryption key version ${encrypted.version} not found`);
    }

    if (key.status === 'retired') {
      throw new Error(`Encryption key version ${encrypted.version} has been retired`);
    }

    // Temporarily set the encryption key environment variable
    const originalKey = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = key.key;

    try {
      return await decrypt(encrypted.data);
    } finally {
      // Restore original key
      if (originalKey) {
        process.env.ENCRYPTION_KEY = originalKey;
      } else {
        delete process.env.ENCRYPTION_KEY;
      }
    }
  }

  /**
   * Re-encrypt data with the current key version
   */
  async reencrypt(encrypted: EncryptedWithVersion): Promise<EncryptedWithVersion> {
    if (encrypted.version === this.currentVersion) {
      // Already using current version
      return encrypted;
    }

    // Decrypt with old version
    const plaintext = await this.decryptWithVersion(encrypted);
    
    // Encrypt with new version
    return await this.encryptWithVersion(plaintext);
  }

  /**
   * Get all key versions (for persistence)
   */
  getAllKeys(): KeyVersion[] {
    return Array.from(this.keyVersions.values());
  }

  /**
   * Get current key version
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Check if a key rotation is needed
   */
  needsRotation(): boolean {
    const currentKey = this.keyVersions.get(this.currentVersion);
    if (!currentKey) return true;

    const now = new Date();
    return now > currentKey.expiresAt;
  }

  /**
   * Get key status report
   */
  getKeyStatus(): {
    currentVersion: number;
    totalKeys: number;
    activeKeys: number;
    rotatingKeys: number;
    deprecatedKeys: number;
    retiredKeys: number;
    nextRotation: Date | null;
  } {
    const statusCount = {
      active: 0,
      rotating: 0,
      deprecated: 0,
      retired: 0
    };

    let nextRotation: Date | null = null;

    for (const key of this.keyVersions.values()) {
      statusCount[key.status]++;
      if (key.status === 'active') {
        nextRotation = key.expiresAt;
      }
    }

    return {
      currentVersion: this.currentVersion,
      totalKeys: this.keyVersions.size,
      activeKeys: statusCount.active,
      rotatingKeys: statusCount.rotating,
      deprecatedKeys: statusCount.deprecated,
      retiredKeys: statusCount.retired,
      nextRotation
    };
  }

  /**
   * Serialize encrypted data with version
   */
  static serialize(encrypted: EncryptedWithVersion): string {
    return `v${encrypted.version}:${encrypted.data}`;
  }

  /**
   * Deserialize encrypted data with version
   */
  static deserialize(serialized: string): EncryptedWithVersion {
    const match = serialized.match(/^v(\d+):(.+)$/);
    if (!match) {
      // Assume version 1 for backward compatibility
      return { version: 1, data: serialized };
    }
    
    return {
      version: parseInt(match[1], 10),
      data: match[2]
    };
  }
}

/**
 * Global key rotation manager instance
 */
let globalManager: KeyRotationManager | null = null;

/**
 * Get or create the global key rotation manager
 */
export function getKeyRotationManager(config?: Partial<KeyRotationConfig>): KeyRotationManager {
  if (!globalManager) {
    globalManager = new KeyRotationManager(config);
  }
  return globalManager;
}

/**
 * Helper function to encrypt with version
 */
export async function encryptWithRotation(plaintext: string): Promise<string> {
  const manager = getKeyRotationManager();
  const encrypted = await manager.encryptWithVersion(plaintext);
  return KeyRotationManager.serialize(encrypted);
}

/**
 * Helper function to decrypt with version
 */
export async function decryptWithRotation(serialized: string): Promise<string> {
  const manager = getKeyRotationManager();
  const encrypted = KeyRotationManager.deserialize(serialized);
  return await manager.decryptWithVersion(encrypted);
}

/**
 * Check if data needs re-encryption
 */
export function needsReencryption(serialized: string): boolean {
  const manager = getKeyRotationManager();
  const encrypted = KeyRotationManager.deserialize(serialized);
  return encrypted.version !== manager.getCurrentVersion();
}
