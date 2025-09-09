# Encryption and Permission Architecture

## Overview

PolyHarmony Calendar implements a sophisticated encryption and permission system designed specifically for polyamorous relationships. This document explains the architecture, implementation details, and rationale behind our security model.

## Core Principles

1. **Privacy by Default**: All user-generated content is encrypted at rest
2. **Flexible Permissions**: Three-layer permission system allows granular control
3. **User-Centric Design**: Users control their data and who can see it
4. **Performance Balance**: Strategic encryption to maintain usability

## What Gets Encrypted

### Always Encrypted
- ✅ Event descriptions and details
- ✅ Event locations
- ✅ Attached documents/photos
- ✅ Relationship notes
- ✅ Phone numbers
- ✅ User profile data
- ✅ Relationship types
- ✅ Privacy level settings

### Not Encrypted (for functionality)
- ❌ Event titles (enables search and calendar view)
- ❌ Basic timestamps (enables scheduling)
- ❌ User IDs (enables relationship mapping)

## Three-Layer Permission Architecture

### Layer 1: Relationship/Group Permissions (Base Layer)

This layer establishes default visibility rules based on relationship types or group membership.

**Examples:**
- "Primary partners can see all my events with full details"
- "Secondary partners can see events but no location details"
- "Metamours can only see that I'm busy"

**Key Points:**
- Users set these once per relationship/group
- Most events inherit these permissions automatically
- Reduces repetitive permission setting

### Layer 2: Event-Level Permissions (Override Layer)

Individual events can override the base relationship permissions for enhanced privacy.

**Examples:**
- Therapy appointment: "Even primary partners only see 'busy'"
- Surprise party: "Hide from specific partner"
- Medical appointment: "Private - nobody sees details"

**Key Points:**
- Overrides apply only to specific events
- Other events continue following base permissions
- Provides contextual privacy control

### Layer 3: Invitation Permissions (Ultimate Override)

Direct invitations grant access regardless of other permission layers.

**Examples:**
- Inviting a metamour to a group dinner (they see full details)
- Adding someone to a private event (bypasses privacy settings)
- Sharing specific event with limited-access partner

**Key Points:**
- Invitations are person-specific (not group-transferable)
- Provides ultimate control over individual event sharing
- Intuitive social behavior (invited = can see details)

## Key Management Architecture

### Relationship Keys
- Generated when relationship is established
- Shared between the two users in the relationship
- Used for all events shared via relationship permissions
- Stored encrypted in database

### Group Keys
- Generated when group is created
- Shared among all group members
- Used for events visible to the group
- Updated when members join/leave

### Event-Specific Keys
- Generated only when privacy overrides are set
- Unique per event
- Distributed based on Layer 2 and Layer 3 permissions
- Enable fine-grained access control

### Key Distribution Logic

```
When User B attempts to access User A's event:

1. Check Invitation (Layer 3)
   └─ Yes: Use invitation-specific key → Grant access
   └─ No: Continue to step 2

2. Check Event Override (Layer 2)
   └─ Override exists: Use event-specific key or deny
   └─ No override: Continue to step 3

3. Check Relationship/Group (Layer 1)
   └─ Has permission: Use relationship/group key → Grant access
   └─ No permission: Deny access
```

## Mutual Exclusivity Rule

**Critical Design Decision**: A user can be EITHER in a group OR have a solo relationship with another user, never both.

**Rationale:**
- Prevents permission conflicts
- Simplifies permission resolution
- Makes user intent clear
- Reduces security vulnerabilities

**Implementation:**
- Database constraints prevent dual connections
- UI enforces choice during connection setup
- Migration tools handle existing data

## Implementation Details

### Encryption Algorithm
- **Server-side**: AES-256-GCM for data at rest
- **Client-side**: AES-256-GCM for sensitive fields
- **Key derivation**: PBKDF2 with 100,000 iterations
- **Transport**: TLS 1.3 for all data transmission

### Database Schema Considerations

```sql
-- Encrypted fields use TEXT type to store base64 encoded data
-- Original field names preserved for clarity
-- _encrypted suffix indicates encrypted storage

events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,                    -- Not encrypted (for search)
  description_encrypted TEXT,             -- Encrypted
  location_encrypted TEXT,                -- Encrypted
  start_time TIMESTAMPTZ NOT NULL,        -- Not encrypted (for scheduling)
  end_time TIMESTAMPTZ NOT NULL,          -- Not encrypted (for scheduling)
  -- ... other fields
)

-- Key storage table
encryption_keys (
  id UUID PRIMARY KEY,
  key_type TEXT NOT NULL,                 -- 'relationship', 'group', 'event'
  key_owner_id UUID NOT NULL,
  encrypted_key TEXT NOT NULL,            -- The actual key, encrypted
  metadata JSONB,                         -- Additional key info
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Key access table (who can use which keys)
key_access (
  id UUID PRIMARY KEY,
  key_id UUID REFERENCES encryption_keys(id),
  user_id UUID REFERENCES users(id),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                 -- Optional expiration
  access_reason TEXT                      -- 'relationship', 'group', 'invitation'
)
```

### API Design Patterns

```typescript
// Encryption happens automatically in API routes
POST /api/events
{
  title: "Date Night",                    // Stored unencrypted
  description: "Dinner at favorite spot", // Automatically encrypted
  location: "123 Main St",               // Automatically encrypted
  privacy_level: "private"
}

// Decryption based on permissions
GET /api/events/[id]
Response varies by permission:
- Full access: All fields decrypted
- Busy only: Limited fields, others null
- No access: 404 Not Found
```

### Security Considerations

1. **Key Rotation**: Implement periodic key rotation for long-term security
2. **Key Escrow**: Consider user-controlled key backup for account recovery
3. **Audit Logging**: Track all key access and permission changes
4. **Rate Limiting**: Prevent brute-force decryption attempts
5. **Memory Security**: Clear decrypted data from memory after use

## Performance Optimizations

1. **Selective Encryption**: Only encrypt sensitive fields
2. **Key Caching**: Cache decrypted keys in memory (with TTL)
3. **Batch Operations**: Encrypt/decrypt multiple fields together
4. **Async Processing**: Use background jobs for large operations
5. **Database Indexes**: Maintain indexes on unencrypted search fields

## Future Considerations

1. **Hardware Security Modules (HSM)**: For production key storage
2. **Multi-device Sync**: End-to-end encryption across devices
3. **Group Key Rotation**: Efficient key updates for large groups
4. **Compliance**: GDPR/CCPA right to deletion with encrypted data
5. **Quantum Resistance**: Plan for post-quantum cryptography

## Developer Guidelines

### When Adding New Features

1. **Identify Sensitive Data**: Any user-generated content is sensitive
2. **Choose Encryption Strategy**: 
   - User-specific: Use user's key
   - Relationship-based: Use relationship key
   - Group-based: Use group key
   - Special privacy: Generate event-specific key
3. **Update Permissions**: Ensure three-layer system is respected
4. **Test Thoroughly**: Include encryption in all test scenarios
5. **Document Changes**: Update this document with new patterns

### Common Pitfalls to Avoid

1. **Never log decrypted data**
2. **Don't cache decrypted data in browser storage**
3. **Always validate permissions before decryption**
4. **Don't transmit keys in URLs or logs**
5. **Remember the mutual exclusivity rule**

## Testing Strategies

### Unit Tests
- Key generation and validation
- Encryption/decryption functions
- Permission resolution logic

### Integration Tests
- Three-layer permission scenarios
- Key distribution workflows
- API endpoint encryption behavior

### Security Tests
- Penetration testing
- Key leakage detection
- Permission bypass attempts

## Conclusion

This encryption and permission architecture provides a robust foundation for protecting user privacy while maintaining the flexibility needed for polyamorous relationship management. The three-layer system mirrors real-world social dynamics while ensuring data security.

For implementation details, see the corresponding code in:
- `/lib/encryption/` - Core encryption utilities
- `/lib/permissions/` - Permission resolution logic
- `/lib/keys/` - Key management services
- `/app/api/` - API route implementations
