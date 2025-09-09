# Key Escrow and Derivation System Architecture

## Overview

The key escrow system provides secure key management with hierarchical key derivation that integrates with the existing 4-level privacy system and dual-mode architecture.

## Key Hierarchy Design

### 1. Master Keys (Root Level)
- **Application Master Key (AMK)**: Single root key for the entire application
- **Recovery Master Key (RMK)**: Backup key for disaster recovery scenarios
- **Demo Master Key (DMK)**: Separate key for demo mode operations

### 2. User Master Keys (UMK)
- Derived from AMK using HKDF with user ID as info parameter
- Used as the root for all user-specific key derivations
- Stored in encrypted escrow with password-based key derivation

### 3. Domain Keys (Layer 2)
Derived from UMK for specific privacy domains:
- **Personal Key (PK)**: For private data (privacy level: private)
- **Relationship Key (RK)**: For semi-private data (privacy level: busy_only) 
- **Visible Key (VK)**: For visible data (privacy level: details)
- **Public Key (PUK)**: For public data (no encryption needed)

### 4. Entity Keys (Layer 3)
Derived from domain keys for specific entities:
- **Event Keys**: For individual calendar events
- **User Data Keys**: For personal information
- **Relationship Keys**: For relationship-specific data
- **Group Keys**: For group/polycule data

### 5. Field Keys (Layer 4)
Derived from entity keys for specific data fields:
- **Description Key**: For event descriptions
- **Location Key**: For event locations
- **Notes Key**: For private notes
- **Contact Key**: For contact information

## Key Derivation Functions

### HKDF-Based Derivation
```
Domain_Key = HKDF(User_Master_Key, salt="domain_type", info="user_id:domain")
Entity_Key = HKDF(Domain_Key, salt="entity_type", info="entity_id:field_type")
Field_Key = HKDF(Entity_Key, salt="field_type", info="field_name:timestamp")
```

### Privacy Level Integration
```
Privacy Level -> Domain Key Mapping:
- Private (private) -> Personal Key (PK)
- Semi-Private (busy_only) -> Relationship Key (RK)  
- Visible (details) -> Visible Key (VK)
- Public -> No encryption (plaintext)
```

## Key Escrow Mechanisms

### 1. Password-Based Escrow
- User password derives key encryption key (KEK)
- KEK encrypts user master key for storage
- Supports key recovery with password

### 2. Recovery Questions Escrow  
- Multiple security questions create recovery keys
- Threshold-based recovery (need 3 out of 5 questions)
- Each answer contributes to recovery key derivation

### 3. Social Recovery Escrow
- Trusted relationships can participate in key recovery
- Multi-signature approach with relationship partners
- Requires consent from multiple trusted users

### 4. Backup Codes Escrow
- One-time use recovery codes
- Generated during initial setup
- Can restore access to generate new keys

## Security Properties

### Confidentiality
- AES-256-GCM encryption for all key material
- Separate keys for different privacy levels
- Forward secrecy through key rotation

### Integrity
- HMAC authentication for all key operations
- Tamper-evident key storage
- Audit logging for all key access

### Availability
- Multiple escrow mechanisms prevent single points of failure
- Automatic key backup to secure storage
- Cross-device synchronization support

### Privacy Enforcement
- Keys are compartmentalized by privacy level
- No key can decrypt data above its privacy level
- Relationship-aware key sharing

## Demo Mode Implementation

### Local Storage Keys
- All keys stored in browser localStorage
- Same hierarchy as production but local-only
- No server-side escrow in demo mode

### Migration Support
- Demo data can be migrated to production
- Keys re-derived using production system
- Seamless upgrade path for users

## Performance Optimizations

### Key Caching
- Derived keys cached in memory for session
- Automatic cache invalidation on logout
- Secure cache with time-based expiration

### Batch Operations
- Multiple key derivations batched together
- Parallel processing for independent operations
- Sub-2 second response time maintained

### Pre-computation
- Common keys pre-derived during login
- Background key generation for future use
- Predictive key derivation based on usage patterns

## Integration Points

### Existing Systems
- **Middleware**: Integrates with auth validation
- **Rate Limiting**: Key operations respect existing limits
- **Monitoring**: Key access logged via existing system
- **Privacy Utils**: Uses existing privacy level mappings

### Database Schema
- New `user_keys` table for key escrow data
- `key_audit_log` table for security monitoring
- Integration with existing `users` and `relationships` tables

### APIs
- RESTful endpoints for key operations
- Real-time key synchronization via Supabase
- Secure key sharing APIs for relationships

## Compliance and Auditing

### Audit Trail
- All key operations logged with timestamps
- User consent tracking for key sharing
- Privacy boundary validation logs

### Compliance Features
- GDPR-compliant key deletion
- Data portability for key export
- Right to be forgotten implementation

### Security Monitoring
- Anomaly detection for key access patterns
- Real-time alerts for suspicious activity
- Integration with existing security infrastructure

## Disaster Recovery

### Key Recovery Scenarios
1. **Password Loss**: Security questions or backup codes
2. **Device Loss**: Cloud escrow with password recovery
3. **Account Compromise**: Emergency key rotation
4. **Data Breach**: Master key rotation with re-encryption

### Recovery Procedures
- Automated detection of compromise scenarios
- Step-by-step recovery guides for users
- Administrative override capabilities for support

## Future Enhancements

### Hardware Security Modules (HSM)
- Integration with cloud HSM for master keys
- Hardware-backed key derivation
- Enhanced tamper resistance

### Post-Quantum Cryptography
- Migration path to quantum-resistant algorithms
- Hybrid classical/post-quantum approach
- Future-proofing for cryptographic advances

### Multi-Tenant Key Isolation
- Organization-level key hierarchies
- Cross-tenant key sharing controls
- Enterprise key management features
