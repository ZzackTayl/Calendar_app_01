# Key Escrow System - Usage Guide

This guide provides comprehensive documentation and examples for using the key escrow and hierarchical key derivation system in the Calendar App.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Demo Mode](#demo-mode)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Overview

The key escrow system provides secure, hierarchical key management with the following features:

- **Hierarchical Key Derivation**: Multi-tier key generation from master keys to field-specific keys
- **Multiple Escrow Methods**: Password-based, security questions, social recovery, and backup codes
- **Privacy-Aware Sharing**: Selective data sharing based on relationship privacy levels
- **Demo Mode Support**: Full functionality using localStorage for testing and development
- **Audit Logging**: Comprehensive tracking of all key operations

## Quick Start

### Production Setup

```typescript
import { initializeAuthKeyIntegration } from '@/lib/keys/auth-integration';
import { createSupabaseClient } from '@/lib/supabase/client';

// Initialize the key management system
const supabaseClient = createSupabaseClient();
const authKeyManager = await initializeAuthKeyIntegration(supabaseClient, {
  enableKeyEscrowOnSignup: true,
  enableHierarchicalKeys: true,
  requirePasswordEscrow: true
});
```

### Demo Mode Setup

```typescript
import { getDemoKeyManagement, DemoHelpers } from '@/lib/keys/demo-key-management';

// Set up demo environment
const { users, relationships, message } = await DemoHelpers.setupDemoEnvironment();
console.log(message);

// Demonstrate the key system
const { steps, success } = await DemoHelpers.demonstrateKeySystem();
steps.forEach(step => console.log(step));
```

## Core Concepts

### Key Hierarchy

The system uses a 5-level hierarchical key structure:

1. **Master Keys**: Root keys for the entire application
2. **User Master Keys**: Derived from master keys, unique per user
3. **Domain Keys**: Based on privacy levels (private, relationship, visible, public)
4. **Entity Keys**: For specific entities (events, users, relationships, groups)
5. **Field Keys**: For specific data fields (description, location, notes, etc.)

### Privacy Levels

The system supports 4 privacy levels that map to key domains:

- `private` → Personal Key (PK) - Private data, user-only access
- `busy_only` → Relationship Key (RK) - Semi-private, relationship-based access
- `details` → Visible Key (VK) - Detailed sharing with trusted partners
- `public` → No encryption needed

### Escrow Methods

Four escrow methods are supported for key recovery:

1. **Password-based**: Uses user password for key encryption key derivation
2. **Security Questions**: Threshold-based recovery using multiple questions
3. **Social Recovery**: Multi-signature approach with trusted relationships
4. **Backup Codes**: One-time use recovery codes

## API Reference

### Core Services

#### KeyDerivation

```typescript
import { KeyDerivation, MasterKeyConfig } from '@/lib/keys/key-derivation';

// Initialize key derivation
const config: MasterKeyConfig = {
  applicationMasterKey: "64-char-hex-string",
  recoveryMasterKey: "64-char-hex-string",
  keyRotationInterval: 86400 // 24 hours
};

const keyDerivation = KeyDerivation.initialize(config, false);

// Derive keys
const { key, metadata } = keyDerivation.deriveCompleteKey({
  userId: "user-id",
  domain: KeyDomain.PERSONAL,
  entityType: EntityType.EVENT,
  entityId: "event-id",
  fieldType: FieldType.DESCRIPTION
});
```

#### KeyEscrowService

```typescript
import { KeyEscrowService, EscrowMethod } from '@/lib/keys/key-escrow';

const keyEscrow = KeyEscrowService.initialize();

// Create password-based escrow
const escrowRecord = await keyEscrow.createPasswordEscrow(
  userId,
  userMasterKey,
  password
);

// Recover with password
const result = await keyEscrow.recoverWithPassword(userId, password);
if (result.success) {
  console.log('Key recovery successful');
}
```

#### KeyManagementService

```typescript
import { KeyManagementService, EnhancedKeyManagementConfig } from '@/lib/keys/key-management-service';

const config: EnhancedKeyManagementConfig = {
  masterKeys: masterKeyConfig,
  enableEscrow: true,
  enableHierarchicalDerivation: true,
  enableAuditLogging: true,
  isDemoMode: false
};

const keyService = new KeyManagementService(supabaseClient, config);

// Setup user key escrow
const result = await keyService.setupUserKeyEscrow(
  userId,
  EscrowMethod.PASSWORD,
  { password: userPassword }
);
```

### Helper Functions

#### KeyDerivationHelpers

```typescript
import { KeyDerivationHelpers, FieldType } from '@/lib/keys/key-derivation';

// Derive event key
const { key, metadata } = KeyDerivationHelpers.deriveEventKey(
  userId,
  eventId,
  'private',
  FieldType.DESCRIPTION
);

// Derive user data key
const { key, metadata } = KeyDerivationHelpers.deriveUserDataKey(
  userId,
  FieldType.PHONE
);
```

## Usage Examples

### Example 1: Setting Up Key Escrow for New User

```typescript
async function setupNewUserKeyEscrow(user: User, password: string) {
  try {
    // Get the key management service
    const authKeyManager = getAuthKeyIntegration();
    const keyService = authKeyManager?.getKeyManagementService();
    
    if (!keyService) {
      throw new Error('Key management service not available');
    }

    // Setup password-based escrow
    const passwordEscrow = await keyService.setupUserKeyEscrow(
      user.id,
      EscrowMethod.PASSWORD,
      { password },
      {
        userAgent: navigator.userAgent,
        ipAddress: 'client-ip',
        sessionId: crypto.randomUUID()
      }
    );

    if (!passwordEscrow.success) {
      throw new Error(passwordEscrow.error);
    }

    // Setup backup codes
    const backupEscrow = await keyService.setupUserKeyEscrow(
      user.id,
      EscrowMethod.BACKUP_CODES,
      { backupCodeCount: 10 }
    );

    if (backupEscrow.success && backupEscrow.backupCodes) {
      // Securely deliver backup codes to user
      await deliverBackupCodes(user.email, backupEscrow.backupCodes);
    }

    console.log('Key escrow setup completed successfully');
  } catch (error) {
    console.error('Failed to setup key escrow:', error);
    throw error;
  }
}
```

### Example 2: Encrypting and Sharing Calendar Event

```typescript
async function createEncryptedEvent(
  userId: string,
  eventData: {
    title: string;
    description: string;
    location: string;
    notes?: string;
  },
  privacyLevel: 'private' | 'busy_only' | 'details',
  sharedWithUserIds?: string[]
) {
  try {
    const keyService = getKeyManagementService();
    const eventId = crypto.randomUUID();

    // Encrypt event data using enhanced encryption
    const encryptedData = await keyService.encryptEventDataEnhanced(
      userId,
      eventId,
      eventData,
      privacyLevel
    );

    // Store in database
    const { data, error } = await supabase
      .from('events')
      .insert({
        id: eventId,
        user_id: userId,
        title: eventData.title, // Title might not be encrypted depending on privacy level
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        privacy_level: privacyLevel,
        ...encryptedData
      })
      .single();

    if (error) throw error;

    // Set up key sharing if specified
    if (sharedWithUserIds && sharedWithUserIds.length > 0) {
      const privacyKeySharing = getPrivacyKeySharing();
      
      for (const recipientId of sharedWithUserIds) {
        await privacyKeySharing.requestKeyAccess(
          recipientId,
          userId,
          EntityType.EVENT,
          eventId,
          mapStringToPrivacyLevel(privacyLevel),
          'Shared calendar event',
          {
            canRead: true,
            canWrite: false,
            canShare: false,
            canRevoke: false
          }
        );
      }
    }

    return { eventId, encryptedData };
  } catch (error) {
    console.error('Failed to create encrypted event:', error);
    throw error;
  }
}
```

### Example 3: Recovering User Keys

```typescript
async function recoverUserKeys(
  userId: string,
  recoveryMethod: 'password' | 'backup_code' | 'security_questions',
  recoveryData: {
    password?: string;
    backupCode?: string;
    securityAnswers?: Array<{ questionId: string; answer: string }>;
  }
) {
  try {
    const keyService = getKeyManagementService();
    
    let result;
    switch (recoveryMethod) {
      case 'password':
        if (!recoveryData.password) {
          throw new Error('Password is required for password recovery');
        }
        result = await keyService.recoverUserKeys(
          userId,
          EscrowMethod.PASSWORD,
          { password: recoveryData.password }
        );
        break;

      case 'backup_code':
        if (!recoveryData.backupCode) {
          throw new Error('Backup code is required for backup code recovery');
        }
        result = await keyService.recoverUserKeys(
          userId,
          EscrowMethod.BACKUP_CODES,
          { backupCode: recoveryData.backupCode }
        );
        break;

      case 'security_questions':
        if (!recoveryData.securityAnswers) {
          throw new Error('Security answers are required');
        }
        result = await keyService.recoverUserKeys(
          userId,
          EscrowMethod.SECURITY_QUESTIONS,
          { securityAnswers: recoveryData.securityAnswers }
        );
        break;

      default:
        throw new Error('Unsupported recovery method');
    }

    if (result.success) {
      console.log('Key recovery successful');
      // Optionally rotate keys after recovery
      await keyService.rotateUserKeysEnhanced(userId);
    } else {
      console.error('Key recovery failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Key recovery error:', error);
    throw error;
  }
}
```

### Example 4: Privacy-Aware Key Sharing

```typescript
async function requestAndApproveKeySharing(
  requesterId: string,
  ownerId: string,
  eventId: string,
  privacyLevel: PrivacyLevel
) {
  try {
    const privacyKeySharing = getPrivacyKeySharing();

    // Requester asks for access
    const requestResult = await privacyKeySharing.requestKeyAccess(
      requesterId,
      ownerId,
      EntityType.EVENT,
      eventId,
      privacyLevel,
      'I need access to view this event for coordination',
      {
        canRead: true,
        canWrite: false,
        canShare: false,
        canRevoke: false
      }
    );

    if (!requestResult.success) {
      throw new Error(requestResult.error);
    }

    console.log(`Access requested, request ID: ${requestResult.requestId}`);

    // Owner approves the request
    const approvalResult = await privacyKeySharing.approveKeyAccess(
      ownerId,
      requestResult.requestId!
    );

    if (approvalResult.success) {
      console.log(`Access approved, key ID: ${approvalResult.keyId}`);
      
      // Requester can now decrypt the event
      const decryptResult = await privacyKeySharing.decryptWithAccess(
        requesterId,
        encryptedEventData,
        {
          entityType: EntityType.EVENT,
          entityId: eventId,
          privacyLevel
        }
      );

      if (decryptResult.success) {
        console.log('Event decrypted successfully:', decryptResult.decryptedData);
      }
    } else {
      console.error('Failed to approve access:', approvalResult.error);
    }
  } catch (error) {
    console.error('Key sharing error:', error);
  }
}
```

## Demo Mode

Demo mode provides a complete key management experience using localStorage:

### Setting Up Demo Environment

```typescript
import { DemoHelpers } from '@/lib/keys/demo-key-management';

// Clear any existing demo data
DemoHelpers.clearAllDemoData();

// Set up complete demo environment
const { users, relationships, message } = await DemoHelpers.setupDemoEnvironment();
console.log(message);

// Run full demonstration
const { steps, success } = await DemoHelpers.demonstrateKeySystem();
steps.forEach(step => console.log(step));

if (success) {
  console.log('Demo completed successfully!');
} else {
  console.log('Demo failed - check the steps above');
}
```

### Demo User Management

```typescript
import { getDemoKeyManagement } from '@/lib/keys/demo-key-management';

const demoManager = getDemoKeyManagement();

// Create demo users
const alice = await demoManager.createDemoUser('alice@demo.com', 'secure-password-123');
const bob = await demoManager.createDemoUser('bob@demo.com', 'another-password-456');

// Authenticate demo user
const authenticatedUser = await demoManager.authenticateDemoUser('alice@demo.com', 'secure-password-123');

if (authenticatedUser) {
  console.log('Demo user authenticated:', authenticatedUser.email);
} else {
  console.log('Authentication failed');
}

// Create relationship
const relationship = await demoManager.createDemoRelationship(
  alice.id,
  'bob@demo.com',
  'details' // Full details sharing
);

// Export demo data for production migration
const exportedData = demoManager.exportDemoData(alice.id);
console.log('Demo data exported:', exportedData);
```

## Security Considerations

### Key Management Best Practices

1. **Master Key Security**:
   ```typescript
   // Use environment variables for master keys
   const masterKeys: MasterKeyConfig = {
     applicationMasterKey: process.env.APP_MASTER_KEY!, // 64-char hex
     recoveryMasterKey: process.env.RECOVERY_MASTER_KEY!, // 64-char hex
     keyRotationInterval: 86400 // 24 hours
   };
   
   // Validate keys before use
   if (!KeyDerivation.validateMasterKeyConfig(masterKeys)) {
     throw new Error('Invalid master key configuration');
   }
   ```

2. **Key Rotation**:
   ```typescript
   // Rotate keys periodically
   const keyService = getKeyManagementService();
   await keyService.rotateUserKeysEnhanced(userId);
   ```

3. **Audit Logging**:
   ```typescript
   // Monitor key operations
   const auditLogs = keyService.getKeyAuditLog(userId, 50);
   auditLogs.forEach(log => {
     if (!log.success) {
       console.warn('Failed key operation:', log);
     }
   });
   ```

### Privacy Protection

1. **Privacy Level Validation**:
   ```typescript
   function validatePrivacyLevel(level: string): PrivacyLevel {
     const validLevels = ['private', 'busy_only', 'details', 'public'];
     if (!validLevels.includes(level)) {
       throw new Error(`Invalid privacy level: ${level}`);
     }
     return level as PrivacyLevel;
   }
   ```

2. **Relationship Verification**:
   ```typescript
   async function verifyRelationshipAccess(userId: string, partnerId: string) {
     const { data: relationship } = await supabase
       .from('relationships')
       .select('*')
       .or(`and(user_id.eq.${userId},partner_id.eq.${partnerId}),and(user_id.eq.${partnerId},partner_id.eq.${userId})`)
       .single();
     
     return !!relationship;
   }
   ```

## Troubleshooting

### Common Issues

1. **Key Derivation Fails**:
   ```typescript
   try {
     const { key } = KeyDerivation.getInstance().deriveCompleteKey(context);
   } catch (error) {
     console.error('Key derivation failed:', error);
     // Check if KeyDerivation is initialized
     // Verify master key configuration
     // Ensure all required parameters are provided
   }
   ```

2. **Escrow Setup Fails**:
   ```typescript
   const result = await keyService.setupUserKeyEscrow(userId, method, data);
   if (!result.success) {
     console.error('Escrow setup failed:', result.error);
     // Check password strength requirements
     // Verify user exists
     // Ensure method-specific data is provided
   }
   ```

3. **Key Recovery Fails**:
   ```typescript
   const recovery = await keyService.recoverUserKeys(userId, method, data);
   if (!recovery.success) {
     console.error('Recovery failed:', recovery.error);
     // Check rate limits
     // Verify recovery data
     // Ensure escrow record exists
   }
   ```

4. **Demo Mode Issues**:
   ```typescript
   // Clear corrupted demo data
   DemoHelpers.clearAllDemoData();
   
   // Check localStorage availability
   if (typeof Storage === 'undefined') {
     console.error('localStorage not available for demo mode');
   }
   
   // Verify demo initialization
   const demoManager = getDemoKeyManagement();
   await demoManager.initialize();
   ```

### Debug Logging

Enable verbose logging for debugging:

```typescript
// In development, enable debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('[KEY_ESCROW_DEBUG] Enabled debug logging');
  
  // Monitor key operations
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (args[0]?.includes('[KEY_ESCROW]') || args[0]?.includes('[DEMO_KEY_MGMT]')) {
      originalConsoleLog('[DEBUG]', new Date().toISOString(), ...args);
    } else {
      originalConsoleLog(...args);
    }
  };
}
```

### Performance Monitoring

Monitor key derivation performance:

```typescript
async function monitorKeyPerformance() {
  const start = performance.now();
  
  const { key } = KeyDerivation.getInstance().deriveCompleteKey(context);
  
  const end = performance.now();
  const duration = end - start;
  
  if (duration > 100) { // Alert if key derivation takes > 100ms
    console.warn(`Slow key derivation: ${duration}ms`);
  }
  
  return { key, duration };
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { KeyDerivation, KeyEscrowService } from '@/lib/keys';

describe('Key Management System', () => {
  it('should derive keys correctly', async () => {
    const config = generateTestMasterKeyConfig();
    const keyDerivation = KeyDerivation.initialize(config, true);
    
    const { key, metadata } = keyDerivation.deriveCompleteKey({
      userId: 'test-user',
      domain: KeyDomain.PERSONAL,
      entityType: EntityType.EVENT,
      entityId: 'test-event',
      fieldType: FieldType.DESCRIPTION
    });
    
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32); // 256 bits
    expect(metadata.keyId).toContain('test-user');
  });
  
  it('should handle escrow correctly', async () => {
    const keyEscrow = KeyEscrowService.initialize(true);
    const userMasterKey = Buffer.from('test-key'.repeat(8), 'utf8');
    
    const escrowRecord = await keyEscrow.createPasswordEscrow(
      'test-user',
      userMasterKey,
      'test-password-123'
    );
    
    expect(escrowRecord.method).toBe(EscrowMethod.PASSWORD);
    expect(escrowRecord.userId).toBe('test-user');
  });
});
```

For more comprehensive testing examples, see the test files in the `__tests__/` directory.

---

## Support

For additional support or questions about the key escrow system:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [API reference](#api-reference)
3. Run the demo mode to understand expected behavior
4. Consult the architecture documentation in `docs/KEY_ESCROW_ARCHITECTURE.md`

The key escrow system is designed to be secure, performant, and easy to use. Follow the examples and best practices in this guide to integrate it successfully into your application.
