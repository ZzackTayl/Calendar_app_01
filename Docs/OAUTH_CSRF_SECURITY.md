# OAuth and CSRF Security Implementation

This document outlines the comprehensive security fixes implemented to prevent OAuth CSRF attacks and Cross-Site Request Forgery (CSRF) attacks in the PolyHarmony Calendar application.

## 🔒 Security Vulnerabilities Fixed

### Critical Vulnerabilities Addressed:
1. **OAuth CSRF Vulnerability**: Google OAuth flow was missing state parameter validation
2. **Apple OAuth CSRF Vulnerability**: No CSRF protection for credential storage operations
3. **API CSRF Vulnerability**: Event creation, updating, and deletion endpoints lacked CSRF protection
4. **Missing Centralized Security**: No unified CSRF middleware for consistent protection

## 🛡️ Security Implementation

### 1. OAuth State Parameter Protection

**Files:** `/lib/security/oauth-state.ts`

#### Google OAuth Flow (Fixed):
- **Before**: No state parameter validation
- **After**: Cryptographically secure state generation and validation
- **Security Features**:
  - 256-bit cryptographically secure state tokens
  - 128-bit nonce for additional entropy
  - 10-minute expiration window
  - One-time use tokens (automatically deleted after validation)
  - Database-backed storage with RLS policies

#### Apple OAuth Flow (Enhanced):
- **Before**: Basic credential storage without CSRF protection
- **After**: Full CSRF token validation for all credential operations
- **Security Features**:
  - CSRF token validation before storing credentials
  - Encrypted credential storage (existing AES-256-GCM encryption preserved)
  - Enhanced error handling with security-focused messages

### 2. CSRF Protection Middleware

**Files:** `/lib/security/csrf.ts`, `/lib/client/csrf-client.ts`

#### Server-Side Protection:
```typescript
// Validates CSRF tokens for all state-changing operations
export async function validateCSRFProtection(request: NextRequest): Promise<{
  valid: boolean;
  user: any;
  error?: string;
}>
```

#### Client-Side Integration:
```typescript
// Automatically includes CSRF tokens in requests
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response>
```

#### Security Features:
- **256-bit CSRF tokens** with cryptographic randomness
- **1-hour token expiration** with automatic cleanup
- **Automatic token refresh** on client-side
- **Header-based token transmission** (X-CSRF-Token)
- **Database-backed validation** with RLS policies
- **Graceful error handling** with retry logic

### 3. Protected API Endpoints

#### Event API Protection:
- `POST /api/events` - Event creation protected
- `PUT /api/events/[id]` - Event updates protected  
- `DELETE /api/events/[id]` - Event deletion protected
- `POST /api/auth/apple` - Apple credential storage protected

#### Google OAuth API Protection:
- `GET /api/auth/google` - State generation and storage
- `POST /api/auth/google` - State validation before token exchange

## 📊 Database Schema Changes

**Migration:** `supabase/migrations/20250830061228_security_tables.sql`

### New Tables:

#### `csrf_tokens`
```sql
CREATE TABLE csrf_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

#### `oauth_states`  
```sql
CREATE TABLE oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  nonce TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Security Features:
- **Row Level Security (RLS)** enabled on both tables
- **User isolation** - Users can only access their own tokens/states
- **Automatic cleanup** function for expired tokens
- **Indexed columns** for performance
- **Cascade deletion** when users are deleted

## 🔧 Implementation Details

### 1. Token Generation
```typescript
// Cryptographically secure random generation
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 256 bits
}

function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex'); // 256 bits
}
```

### 2. Validation Flow
```typescript
// CSRF validation for state-changing operations
const csrfValidation = await validateCSRFProtection(request);
if (!csrfValidation.valid) {
  return NextResponse.json({ 
    error: 'CSRF validation failed',
    details: csrfValidation.error 
  }, { status: 403 });
}
```

### 3. OAuth State Validation
```typescript
// Google OAuth callback validation
const stateValidation = await validateOAuthState(state, user.id, 'google');
if (!stateValidation.valid) {
  return NextResponse.json({ 
    error: 'Invalid or expired state parameter',
    details: 'OAuth state validation failed. Please try again.'
  }, { status: 400 });
}
```

## 🧪 Security Testing

**Test Suite:** `tests/security/oauth-csrf-security.test.ts`

### Test Coverage:
- ✅ Cryptographic token generation (entropy, uniqueness)
- ✅ Token collision resistance (10,000 token test)
- ✅ Proper expiration handling
- ✅ OAuth callback validation
- ✅ Input sanitization and validation
- ✅ Error handling and edge cases

### Security Metrics:
- **Token Entropy**: 256 bits (cryptographically secure)
- **Collision Probability**: < 1 in 2^128 (negligible)
- **Token Expiration**: 1 hour (CSRF), 10 minutes (OAuth states)
- **Test Coverage**: 15 comprehensive security tests

## 🚀 Usage Guide

### For Frontend Developers:

#### 1. Using CSRF-Protected Requests:
```typescript
import { fetchWithCSRF } from '@/lib/client/csrf-client';

// Automatically includes CSRF token for POST requests
const response = await fetchWithCSRF('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(eventData)
});
```

#### 2. Manual CSRF Token Usage:
```typescript
import { getCSRFHeaders } from '@/lib/client/csrf-client';

const headers = await getCSRFHeaders();
// Returns: { 'X-CSRF-Token': 'abc123...' }
```

### For Backend Developers:

#### 1. Protecting API Routes:
```typescript
import { validateCSRFProtection } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // Add CSRF protection to state-changing operations
  const csrfValidation = await validateCSRFProtection(request);
  if (!csrfValidation.valid) {
    return NextResponse.json({ 
      error: 'CSRF validation failed',
      details: csrfValidation.error 
    }, { status: 403 });
  }
  
  const user = csrfValidation.user;
  // Continue with authenticated user...
}
```

#### 2. OAuth State Management:
```typescript
import { createOAuthStateData, storeOAuthState, validateOAuthState } from '@/lib/security/oauth-state';

// Generate state for OAuth flow
const stateData = createOAuthStateData(user.id, 'google');
await storeOAuthState(stateData);

// Validate state in callback
const validation = await validateOAuthState(state, user.id, 'google');
```

## 🔍 Security Monitoring

### Recommended Monitoring:
1. **Failed CSRF validations** - Monitor 403 responses with CSRF errors
2. **Expired token cleanup** - Track token cleanup frequency
3. **OAuth state violations** - Monitor invalid state parameter attempts
4. **Token generation errors** - Alert on cryptographic failures

### Security Logs:
- CSRF validation failures are logged with user context
- OAuth state validation failures are logged with attempt details
- Token generation errors are logged for monitoring

## 🛠️ Maintenance

### Automated Cleanup:
```sql
-- Function runs automatically to clean expired tokens
SELECT cleanup_expired_security_tokens();
```

### Manual Cleanup:
```typescript
import { cleanupExpiredCSRFTokens, cleanupExpiredOAuthStates } from '@/lib/security/csrf';

// Can be called manually or via cron job
await cleanupExpiredCSRFTokens();
await cleanupExpiredOAuthStates();
```

## ⚠️ Security Considerations

### Production Requirements:
1. **HTTPS Only**: All OAuth and CSRF operations require HTTPS
2. **Environment Variables**: Ensure `ENCRYPTION_KEY` is properly configured
3. **Database Security**: RLS policies must be enabled
4. **Rate Limiting**: Consider rate limiting token generation endpoints
5. **Monitoring**: Set up alerts for security validation failures

### Security Headers:
Consider implementing additional security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff` 
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` with appropriate directives

## 📝 Compliance

This implementation addresses:
- **OWASP Top 10**: CSRF protection, secure authentication flows
- **OAuth 2.0 Security Best Practices**: State parameter validation
- **NIST Guidelines**: Cryptographic token generation
- **GDPR Compliance**: User data protection in tokens (hashed/encrypted)

---

## 🔄 Migration Steps

### 1. Database Migration:
```bash
npx supabase migration up
```

### 2. Environment Setup:
Ensure `ENCRYPTION_KEY` is configured (existing requirement)

### 3. Client Updates:
Update frontend code to use `fetchWithCSRF` for protected operations

### 4. Testing:
Run security test suite:
```bash
npm test tests/security/oauth-csrf-security.test.ts
```

---

**Last Updated**: August 30, 2025  
**Security Level**: Production-Ready  
**Compliance**: OWASP, OAuth 2.0, GDPR Ready