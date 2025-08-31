/**
 * Secrets Management System
 * 
 * Provides secure handling of sensitive configuration data with:
 * - Runtime validation of secrets
 * - Secure storage and retrieval patterns
 * - Environment-based access controls
 * - Encryption key management
 */

import { createHash, randomBytes } from 'crypto';
import { getValidatedEnv, isSecureEnvironment } from './env-validation';

/**
 * Secret classification levels
 */
export enum SecretLevel {
  PUBLIC = 'public',           // Safe to expose (e.g., public keys, URLs)
  INTERNAL = 'internal',       // Internal use only (e.g., database connections)
  CONFIDENTIAL = 'confidential', // High sensitivity (e.g., API keys)
  RESTRICTED = 'restricted'    // Highest security (e.g., encryption keys, service role keys)
}

/**
 * Secret metadata interface
 */
interface SecretMetadata {
  level: SecretLevel;
  description: string;
  required: boolean;
  environments: string[];
  rotationPeriod?: number; // Days
  lastRotated?: Date;
}

/**
 * Secret registry with metadata
 */
const SECRET_REGISTRY: Record<string, SecretMetadata> = {
  // Public secrets (safe to expose)
  NEXT_PUBLIC_SUPABASE_URL: {
    level: SecretLevel.PUBLIC,
    description: 'Supabase project URL',
    required: true,
    environments: ['development', 'staging', 'production']
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    level: SecretLevel.PUBLIC,
    description: 'Supabase anonymous key',
    required: true,
    environments: ['development', 'staging', 'production']
  },
  NEXT_PUBLIC_APP_URL: {
    level: SecretLevel.PUBLIC,
    description: 'Application public URL',
    required: false,
    environments: ['staging', 'production']
  },

  // Internal secrets
  GOOGLE_CLIENT_ID: {
    level: SecretLevel.INTERNAL,
    description: 'Google OAuth client ID',
    required: false,
    environments: ['development', 'staging', 'production']
  },

  // Confidential secrets
  GOOGLE_CLIENT_SECRET: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'Google OAuth client secret',
    required: false,
    environments: ['development', 'staging', 'production'],
    rotationPeriod: 90
  },
  NEXTAUTH_SECRET: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'NextAuth.js signing secret',
    required: true,
    environments: ['staging', 'production'],
    rotationPeriod: 30
  },
  SMTP_PASSWORD: {
    level: SecretLevel.CONFIDENTIAL,
    description: 'SMTP authentication password',
    required: false,
    environments: ['staging', 'production'],
    rotationPeriod: 60
  },

  // Restricted secrets (highest security)
  ENCRYPTION_KEY: {
    level: SecretLevel.RESTRICTED,
    description: 'Application encryption master key',
    required: true,
    environments: ['staging', 'production'],
    rotationPeriod: 90
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    level: SecretLevel.RESTRICTED,
    description: 'Supabase service role key (admin privileges)',
    required: false,
    environments: ['staging', 'production'],
    rotationPeriod: 30
  }
};

/**
 * Secrets Manager class
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private secrets: Map<string, string> = new Map();
  private env: ReturnType<typeof getValidatedEnv>;

  private constructor() {
    this.env = getValidatedEnv();
    this.loadSecrets();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  /**
   * Load secrets from environment
   */
  private loadSecrets(): void {
    Object.keys(SECRET_REGISTRY).forEach(key => {
      const value = process.env[key];
      if (value) {
        this.secrets.set(key, value);
      }
    });
  }

  /**
   * Get secret value with access control
   */
  public getSecret(key: string): string | null {
    const metadata = SECRET_REGISTRY[key];
    if (!metadata) {
      throw new Error(`Unknown secret: ${key}`);
    }

    // Check environment access
    if (!metadata.environments.includes(this.env.NODE_ENV)) {
      throw new Error(`Secret ${key} not available in ${this.env.NODE_ENV} environment`);
    }

    const value = this.secrets.get(key);
    
    // Check if required secret is missing
    if (metadata.required && !value) {
      throw new Error(`Required secret ${key} is not configured`);
    }

    return value || null;
  }

  /**
   * Check if secret exists
   */
  public hasSecret(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * Get secret metadata
   */
  public getSecretMetadata(key: string): SecretMetadata | null {
    return SECRET_REGISTRY[key] || null;
  }

  /**
   * List all configured secrets with metadata
   */
  public listSecrets(): Array<{key: string, metadata: SecretMetadata, configured: boolean}> {
    return Object.entries(SECRET_REGISTRY).map(([key, metadata]) => ({
      key,
      metadata,
      configured: this.secrets.has(key)
    }));
  }

  /**
   * Validate secret format and strength
   */
  public validateSecret(key: string, value: string): { valid: boolean, errors: string[] } {
    const errors: string[] = [];
    const metadata = SECRET_REGISTRY[key];

    if (!metadata) {
      errors.push('Unknown secret key');
      return { valid: false, errors };
    }

    // Validate based on secret type and level
    switch (key) {
      case 'ENCRYPTION_KEY':
        if (value.length < 32) {
          errors.push('Encryption key must be at least 32 characters');
        }
        break;
        
      case 'NEXTAUTH_SECRET':
        if (value.length < 32) {
          errors.push('NextAuth secret must be at least 32 characters');
        }
        break;
        
      case 'NEXT_PUBLIC_SUPABASE_URL':
        try {
          new URL(value);
          if (!value.includes('supabase.co')) {
            errors.push('Invalid Supabase URL format');
          }
        } catch {
          errors.push('Invalid URL format');
        }
        break;

      case 'GOOGLE_CLIENT_SECRET':
        if (value.length < 16) {
          errors.push('Google client secret appears to be invalid');
        }
        break;
    }

    // Check for common security issues
    if (metadata.level === SecretLevel.RESTRICTED || metadata.level === SecretLevel.CONFIDENTIAL) {
      if (value.includes(' ')) {
        errors.push('Secret should not contain spaces');
      }
      if (value.length < 16) {
        errors.push('Secret is too short for security requirements');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for secrets that need rotation
   */
  public getSecretsNeedingRotation(): string[] {
    const needsRotation: string[] = [];
    
    Object.entries(SECRET_REGISTRY).forEach(([key, metadata]) => {
      if (metadata.rotationPeriod && metadata.lastRotated) {
        const daysSinceRotation = Math.floor(
          (Date.now() - metadata.lastRotated.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceRotation >= metadata.rotationPeriod) {
          needsRotation.push(key);
        }
      }
    });
    
    return needsRotation;
  }

  /**
   * Generate secure random key for given purpose
   */
  public static generateSecureKey(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data for logging/comparison
   */
  public static hashSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex').substring(0, 8);
  }

  /**
   * Audit secrets configuration
   */
  public auditSecrets(): {
    configured: string[],
    missing: string[],
    needsRotation: string[],
    securityIssues: Array<{key: string, issues: string[]}>
  } {
    const configured: string[] = [];
    const missing: string[] = [];
    const securityIssues: Array<{key: string, issues: string[]}> = [];

    Object.entries(SECRET_REGISTRY).forEach(([key, metadata]) => {
      if (metadata.environments.includes(this.env.NODE_ENV)) {
        const value = this.secrets.get(key);
        
        if (value) {
          configured.push(key);
          
          // Validate secret
          const validation = this.validateSecret(key, value);
          if (!validation.valid) {
            securityIssues.push({
              key,
              issues: validation.errors
            });
          }
        } else if (metadata.required) {
          missing.push(key);
        }
      }
    });

    return {
      configured,
      missing,
      needsRotation: this.getSecretsNeedingRotation(),
      securityIssues
    };
  }

  /**
   * Get safe configuration object (without exposing secrets)
   */
  public getSafeConfig(): Record<string, any> {
    const config: Record<string, any> = {};
    
    Object.entries(SECRET_REGISTRY).forEach(([key, metadata]) => {
      const value = this.secrets.get(key);
      
      switch (metadata.level) {
        case SecretLevel.PUBLIC:
          config[key] = value || null;
          break;
        case SecretLevel.INTERNAL:
          config[key] = value ? '***configured***' : null;
          break;
        case SecretLevel.CONFIDENTIAL:
        case SecretLevel.RESTRICTED:
          config[key] = value ? '***hidden***' : null;
          break;
      }
    });
    
    return config;
  }
}

/**
 * Convenience functions
 */
export const secrets = SecretsManager.getInstance();

export function getSecret(key: string): string | null {
  return secrets.getSecret(key);
}

export function hasSecret(key: string): boolean {
  return secrets.hasSecret(key);
}

export function validateSecrets(): void {
  const audit = secrets.auditSecrets();
  
  if (audit.missing.length > 0) {
    throw new Error(`Missing required secrets: ${audit.missing.join(', ')}`);
  }
  
  if (audit.securityIssues.length > 0) {
    const issues = audit.securityIssues
      .map(({key, issues}) => `${key}: ${issues.join(', ')}`)
      .join('\n');
    throw new Error(`Secret validation failed:\n${issues}`);
  }
  
  // Warn about rotation needs in secure environments
  if (isSecureEnvironment() && audit.needsRotation.length > 0) {
    console.warn(`⚠️  Secrets needing rotation: ${audit.needsRotation.join(', ')}`);
  }
}

/**
 * Initialize secrets management
 */
export function initializeSecretsManager(): void {
  console.log('🔐 Initializing secrets manager...');
  
  try {
    validateSecrets();
    
    const audit = secrets.auditSecrets();
    console.log(`✅ Secrets validated: ${audit.configured.length} configured`);
    
    if (audit.needsRotation.length > 0) {
      console.warn(`⚠️  ${audit.needsRotation.length} secrets need rotation`);
    }
    
  } catch (error) {
    console.error('❌ Secrets validation failed:', error);
    process.exit(1);
  }
}