/**
 * Authentication Integration for Key Escrow System
 * 
 * Integrates the key escrow and hierarchical key derivation system with
 * the existing Supabase Auth and middleware security infrastructure.
 * Provides seamless key management during authentication flows.
 */

import { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { KeyManagementService, EnhancedKeyManagementConfig } from './key-management-service';
import { KeyDerivation, MasterKeyConfig } from './key-derivation';
import { KeyEscrowService, EscrowMethod } from './key-escrow';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiting';

// Authentication integration configuration
export interface AuthKeyIntegrationConfig {
  enableKeyEscrowOnSignup: boolean;
  enableHierarchicalKeys: boolean;
  defaultEscrowMethods: EscrowMethod[];
  requirePasswordEscrow: boolean;
  enableDemoMode: boolean;
  masterKeyConfig?: MasterKeyConfig;
}

// Authentication event types for key management
export enum AuthEvent {
  SIGNUP = 'signup',
  SIGNIN = 'signin',
  SIGNOUT = 'signout',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_VERIFIED = 'email_verified',
  ACCOUNT_RECOVERY = 'account_recovery'
}

// Key management during authentication
export interface AuthKeyManager {
  onSignup(user: User, password?: string): Promise<void>;
  onSignin(user: User, request?: NextRequest): Promise<void>;
  onSignout(user: User): Promise<void>;
  onPasswordChange(user: User, newPassword: string): Promise<void>;
  onEmailVerified(user: User): Promise<void>;
  onAccountRecovery(user: User): Promise<void>;
}

/**
 * Authentication integration service for key management
 */
export class AuthenticationKeyIntegration implements AuthKeyManager {
  private keyManagementService: KeyManagementService | null = null;
  private config: AuthKeyIntegrationConfig;
  private isInitialized = false;

  constructor(config: AuthKeyIntegrationConfig) {
    this.config = config;
  }

  /**
   * Initialize the authentication key integration
   */
  async initialize(supabaseClient: any): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Generate master keys if not provided
      let masterKeys = this.config.masterKeyConfig;
      if (!masterKeys) {
        masterKeys = this.generateDefaultMasterKeys();
      }

      // Initialize key management service with enhanced features
      const keyManagementConfig: EnhancedKeyManagementConfig = {
        masterKeys,
        enableEscrow: this.config.enableKeyEscrowOnSignup,
        enableHierarchicalDerivation: this.config.enableHierarchicalKeys,
        enableAuditLogging: true,
        isDemoMode: this.config.enableDemoMode
      };

      this.keyManagementService = new KeyManagementService(supabaseClient, keyManagementConfig);
      this.isInitialized = true;

      console.log('[AUTH_KEY_INTEGRATION] Key management system initialized');
    } catch (error) {
      console.error('[AUTH_KEY_INTEGRATION] Failed to initialize:', error);
      throw new Error('Failed to initialize authentication key integration');
    }
  }

  /**
   * Handle key management during user signup
   */
  async onSignup(user: User, password?: string): Promise<void> {
    if (!this.isInitialized || !this.keyManagementService) {
      console.warn('[AUTH_KEY_INTEGRATION] Service not initialized, skipping signup key setup');
      return;
    }

    try {
      console.log(`[AUTH_KEY_INTEGRATION] Setting up keys for new user: ${user.id}`);

      // Check if password-based escrow is required and available
      if (this.config.requirePasswordEscrow) {
        if (!password) {
          console.warn('[AUTH_KEY_INTEGRATION] Password required for escrow but not provided');
          // Don't throw error during signup - user can set up escrow later
          return;
        }

        // Set up password-based key escrow
        const escrowResult = await this.keyManagementService.setupUserKeyEscrow(
          user.id,
          EscrowMethod.PASSWORD,
          { password },
          {
            userAgent: 'signup-flow',
            ipAddress: 'unknown',
            sessionId: crypto.randomUUID()
          }
        );

        if (!escrowResult.success) {
          console.error('[AUTH_KEY_INTEGRATION] Failed to setup password escrow:', escrowResult.error);
          // Don't throw error - allow signup to continue
        } else {
          console.log(`[AUTH_KEY_INTEGRATION] Password escrow setup successful for user: ${user.id}`);
        }
      }

      // Set up additional default escrow methods
      for (const method of this.config.defaultEscrowMethods) {
        if (method === EscrowMethod.PASSWORD && password) {
          continue; // Already handled above
        }

        if (method === EscrowMethod.BACKUP_CODES) {
          const backupResult = await this.keyManagementService.setupUserKeyEscrow(
            user.id,
            EscrowMethod.BACKUP_CODES,
            { backupCodeCount: 10 },
            {
              userAgent: 'signup-flow',
              ipAddress: 'unknown',
              sessionId: crypto.randomUUID()
            }
          );

          if (backupResult.success && backupResult.backupCodes) {
            console.log(`[AUTH_KEY_INTEGRATION] Generated ${backupResult.backupCodes.length} backup codes for user: ${user.id}`);
            // In a real implementation, you'd securely deliver these codes to the user
          }
        }
      }

    } catch (error) {
      console.error('[AUTH_KEY_INTEGRATION] Error during signup key setup:', error);
      // Don't throw error - allow signup to continue even if key setup fails
    }
  }

  /**
   * Handle key management during user signin
   */
  async onSignin(user: User, request?: NextRequest): Promise<void> {
    if (!this.isInitialized || !this.keyManagementService) {
      return;
    }

    try {
      // Check rate limits for signin
      if (request) {
        const clientIP = this.getClientIP(request);
        const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.AUTH_ATTEMPTS);
        
        if (rateLimit.isLimited) {
          console.warn(`[AUTH_KEY_INTEGRATION] Rate limit exceeded for signin: ${clientIP}`);
          return;
        }
      }

      // Pre-derive common keys to improve performance
      if (this.config.enableHierarchicalKeys) {
        const keyDerivation = KeyDerivation.getInstance();
        
        // Pre-derive user master key (will be cached)
        keyDerivation.deriveUserMasterKey(user.id);
        
        console.log(`[AUTH_KEY_INTEGRATION] Pre-derived keys for user signin: ${user.id}`);
      }

      console.log(`[AUTH_KEY_INTEGRATION] Signin key management completed for user: ${user.id}`);
    } catch (error) {
      console.error('[AUTH_KEY_INTEGRATION] Error during signin key management:', error);
    }
  }

  /**
   * Handle key management during user signout
   */
  async onSignout(user: User): Promise<void> {
    if (!this.isInitialized || !this.keyManagementService) {
      return;
    }

    try {
      // Clear all cached keys for security
      this.keyManagementService.clearUserMasterKeyCache(user.id);
      
      if (this.config.enableHierarchicalKeys) {
        const keyDerivation = KeyDerivation.getInstance();
        keyDerivation.clearCache(user.id);
      }

      console.log(`[AUTH_KEY_INTEGRATION] Cleared cached keys for user signout: ${user.id}`);
    } catch (error) {
      console.error('[AUTH_KEY_INTEGRATION] Error during signout key management:', error);
    }
  }

  /**
   * Handle key management when user changes password
   */
  async onPasswordChange(user: User, newPassword: string): Promise<void> {
    if (!this.isInitialized || !this.keyManagementService) {
      return;
    }

    try {
      // Update password-based escrow with new password
      const escrowResult = await this.keyManagementService.setupUserKeyEscrow(
        user.id,
        EscrowMethod.PASSWORD,
        { password: newPassword },
        {
          userAgent: 'password-change',
          ipAddress: 'unknown',
          sessionId: crypto.randomUUID()
        }
      );

      if (escrowResult.success) {
        console.log(`[AUTH_KEY_INTEGRATION] Updated password escrow for user: ${user.id}`);
      } else {
        console.error('[AUTH_KEY_INTEGRATION] Failed to update password escrow:', escrowResult.error);
      }

      // Clear cached keys to force re-derivation
      this.keyManagementService.clearUserMasterKeyCache(user.id);
      if (this.config.enableHierarchicalKeys) {
        const keyDerivation = KeyDerivation.getInstance();
        keyDerivation.clearCache(user.id);
      }

    } catch (error) {
      console.error('[AUTH_KEY_INTEGRATION] Error during password change key management:', error);
    }
  }

  /**
   * Handle key management when email is verified
   */
  async onEmailVerified(user: User): Promise<void> {
    if (!this.isInitialized || !this.keyManagementService) {
      return;
    }

    try {
      // Email verification might enable additional key features
      console.log(`[AUTH_KEY_INTEGRATION] Email verified for user: ${user.id}`);
      
      // Could trigger additional escrow setup or key rotation here
    } catch (error) {
      console.error('[AUTH_KEY_INTEGRATION] Error during email verification key management:', error);
    }
  }

  /**
   * Handle key management during account recovery
   */
  async onAccountRecovery(user: User): Promise<void> {
    if (!this.isInitialized || !this.keyManagementService) {
      return;
    }

    try {
      // Clear all cached keys during recovery for security
      this.keyManagementService.clearUserMasterKeyCache(user.id);
      if (this.config.enableHierarchicalKeys) {
        const keyDerivation = KeyDerivation.getInstance();
        keyDerivation.clearCache(user.id);
      }

      console.log(`[AUTH_KEY_INTEGRATION] Account recovery key management completed for user: ${user.id}`);
    } catch (error) {
      console.error('[AUTH_KEY_INTEGRATION] Error during account recovery key management:', error);
    }
  }

  /**
   * Gets the key management service instance
   */
  getKeyManagementService(): KeyManagementService | null {
    return this.keyManagementService;
  }

  /**
   * Checks if the integration is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.keyManagementService !== null;
  }

  /**
   * Generates default master keys for development/demo
   */
  private generateDefaultMasterKeys(): MasterKeyConfig {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      console.warn('[AUTH_KEY_INTEGRATION] Generating development master keys - not suitable for production!');
    }

    return {
      applicationMasterKey: KeyDerivation.generateMasterKey(),
      recoveryMasterKey: KeyDerivation.generateMasterKey(),
      demoMasterKey: this.config.enableDemoMode ? KeyDerivation.generateMasterKey() : undefined,
      keyRotationInterval: isDevelopment ? 3600 : 86400 // 1 hour dev, 24 hours prod
    };
  }

  /**
   * Extracts client IP from request
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (cfIP) {
      return cfIP;
    }
    return request.ip || '127.0.0.1';
  }
}

/**
 * Middleware integration for automatic key management
 */
export class MiddlewareKeyIntegration {
  private authKeyManager: AuthenticationKeyIntegration;

  constructor(authKeyManager: AuthenticationKeyIntegration) {
    this.authKeyManager = authKeyManager;
  }

  /**
   * Process authentication events from middleware
   */
  async processAuthEvent(
    event: AuthEvent,
    user: User,
    request?: NextRequest,
    additionalData?: { password?: string }
  ): Promise<void> {
    if (!this.authKeyManager.isReady()) {
      console.warn('[MIDDLEWARE_KEY_INTEGRATION] Auth key manager not ready');
      return;
    }

    try {
      switch (event) {
        case AuthEvent.SIGNUP:
          await this.authKeyManager.onSignup(user, additionalData?.password);
          break;
        case AuthEvent.SIGNIN:
          await this.authKeyManager.onSignin(user, request);
          break;
        case AuthEvent.SIGNOUT:
          await this.authKeyManager.onSignout(user);
          break;
        case AuthEvent.PASSWORD_CHANGE:
          if (additionalData?.password) {
            await this.authKeyManager.onPasswordChange(user, additionalData.password);
          }
          break;
        case AuthEvent.EMAIL_VERIFIED:
          await this.authKeyManager.onEmailVerified(user);
          break;
        case AuthEvent.ACCOUNT_RECOVERY:
          await this.authKeyManager.onAccountRecovery(user);
          break;
        default:
          console.warn(`[MIDDLEWARE_KEY_INTEGRATION] Unknown auth event: ${event}`);
      }
    } catch (error) {
      console.error(`[MIDDLEWARE_KEY_INTEGRATION] Error processing ${event}:`, error);
    }
  }
}

/**
 * Default authentication key integration configuration
 */
export const createDefaultAuthKeyConfig = (): AuthKeyIntegrationConfig => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return {
    enableKeyEscrowOnSignup: !isDevelopment, // Only in production
    enableHierarchicalKeys: true,
    defaultEscrowMethods: isDevelopment ? [] : [EscrowMethod.BACKUP_CODES],
    requirePasswordEscrow: !isDevelopment, // Only in production
    enableDemoMode: isDevelopment,
    // masterKeyConfig will be auto-generated if not provided
  };
};

/**
 * Global instance management
 */
let globalAuthKeyIntegration: AuthenticationKeyIntegration | null = null;

/**
 * Initialize the global authentication key integration
 */
export const initializeAuthKeyIntegration = async (
  supabaseClient: any,
  config?: Partial<AuthKeyIntegrationConfig>
): Promise<AuthenticationKeyIntegration> => {
  if (globalAuthKeyIntegration) {
    return globalAuthKeyIntegration;
  }

  const fullConfig = {
    ...createDefaultAuthKeyConfig(),
    ...config
  };

  globalAuthKeyIntegration = new AuthenticationKeyIntegration(fullConfig);
  await globalAuthKeyIntegration.initialize(supabaseClient);

  return globalAuthKeyIntegration;
};

/**
 * Get the global authentication key integration instance
 */
export const getAuthKeyIntegration = (): AuthenticationKeyIntegration | null => {
  return globalAuthKeyIntegration;
};

/**
 * Helper functions for middleware integration
 */
export const MiddlewareHelpers = {
  /**
   * Creates middleware integration instance
   */
  createMiddlewareIntegration(authKeyManager: AuthenticationKeyIntegration): MiddlewareKeyIntegration {
    return new MiddlewareKeyIntegration(authKeyManager);
  },

  /**
   * Processes user authentication in middleware
   */
  async processUserAuth(
    user: User | null,
    request: NextRequest,
    event: AuthEvent,
    additionalData?: { password?: string }
  ): Promise<void> {
    const authKeyManager = getAuthKeyIntegration();
    if (!authKeyManager || !user) return;

    const middlewareIntegration = new MiddlewareKeyIntegration(authKeyManager);
    await middlewareIntegration.processAuthEvent(event, user, request, additionalData);
  },

  /**
   * Clears user keys on logout/security events
   */
  async clearUserKeys(userId: string): Promise<void> {
    const authKeyManager = getAuthKeyIntegration();
    if (!authKeyManager) return;

    const keyService = authKeyManager.getKeyManagementService();
    if (keyService) {
      keyService.clearUserMasterKeyCache(userId);
      if (KeyDerivation.getInstance) {
        try {
          KeyDerivation.getInstance().clearCache(userId);
        } catch {
          // KeyDerivation might not be initialized
        }
      }
    }
  }
};
