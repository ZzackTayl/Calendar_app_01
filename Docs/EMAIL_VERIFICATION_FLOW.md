# Email Verification Flow Documentation

## Overview
This document outlines the complete email verification flow in the PolyHarmony Calendar application, ensuring users verify their email addresses before accessing protected features.

## User Journey

### 1. Sign Up Process
When a user signs up:
1. They fill out the registration form at `/auth/signup`
2. Upon successful registration:
   - A confirmation email is sent via Supabase Auth
   - User sees a success message for 2 seconds
   - They are automatically redirected to `/auth/confirm-email`
   - Any pending invitations are stored in localStorage for later processing

### 2. Email Confirmation Page (`/auth/confirm-email`)
This page serves users who have registered but not yet verified their email:

#### Features:
- **Email Display**: Shows the email address where confirmation was sent
- **Clear Instructions**: Guides users to check their inbox and spam folder
- **Resend Functionality**: Allows users to request a new confirmation email
- **Rate Limiting**: Prevents abuse with:
  - Maximum 3 attempts per 5-minute window
  - Exponential backoff: 60s, 120s, 300s wait times
  - Visual countdown timer
  - LocalStorage persistence of rate limit state
- **Sign Out Option**: Users can sign out to use a different email

#### Access Control:
- **Unauthenticated users**: Shown "Access Required" message with sign-in button
- **Verified users**: Automatically redirected to dashboard
- **Unverified users**: Can access this page and resend confirmation emails

### 3. Middleware Protection
The middleware (`middleware.ts`) enforces email verification:

#### Route Classification:
- **Public Routes**: `/`, `/privacy`, `/terms`, `/support` - No verification required
- **Auth Routes**: `/auth/*` - Accessible without verification
- **Protected Routes**: All other routes require email verification
- **Sensitive Routes**: `/settings`, `/sharing` - Require full verification

#### Security Policy:
For unverified users:
- Attempting to access protected routes → Redirected to `/auth/confirm-email`
- Accessing auth or public routes → Allowed
- Session validation includes email verification status check

### 4. Client-Side Protection
The `useEmailVerification` hook provides additional protection:
- Monitors user's verification status
- Automatically redirects unverified users from protected routes
- Provides verification status to components

### 5. Email Verification Callback
When user clicks the confirmation link in their email:
1. They are directed to `/auth/callback` with verification tokens
2. Supabase processes the verification
3. User's `email_confirmed_at` field is updated
4. User is redirected based on:
   - Pending invitations → `/invitations/accept?token=...`
   - Stored redirect URL → Original destination
   - Default → `/dashboard`

## Technical Implementation

### Rate Limiting
Implemented at multiple levels:
1. **Server-side** (`/api/auth/resend-confirmation`):
   - In-memory store tracks attempts per email/IP combination
   - Returns appropriate HTTP status codes (429 for rate limit)
   - Provides wait time information to client

2. **Client-side** (`/auth/confirm-email`):
   - LocalStorage persists rate limit state
   - Countdown timer shows remaining wait time
   - Disables resend button during cooldown
   - Clears state after 5-minute window

### Security Considerations
1. **Session Validation**: All requests validate user session integrity
2. **CSRF Protection**: Middleware includes CSRF token validation
3. **IP Tracking**: Rate limiting considers both email and IP address
4. **Audit Logging**: All authentication attempts are logged
5. **Error Handling**: Graceful fallbacks for network/server errors

### Error States
The system handles various error scenarios:
- **Network Errors**: "Network error. Please check your connection"
- **Rate Limit Exceeded**: Shows remaining wait time
- **Email Not Found**: "Email address not found. Please sign up first"
- **Already Verified**: Redirects to dashboard
- **Server Errors**: Generic error message with retry option

## Testing
Comprehensive test coverage includes:
- Access control for different user states
- Resend functionality with various responses
- Rate limiting enforcement and persistence
- UI state changes and countdown timers
- LocalStorage state management
- Error handling scenarios

## Best Practices
1. **Clear Communication**: Always show users what's happening and what they need to do
2. **Persistent State**: Rate limit state survives page refreshes
3. **Security First**: Multiple layers of protection against abuse
4. **User Experience**: Smooth transitions and helpful error messages
5. **Accessibility**: All interactive elements are keyboard accessible

## Future Enhancements
Potential improvements:
1. Email delivery status tracking
2. Alternative verification methods (SMS, authenticator app)
3. Custom email templates with branding
4. Analytics on verification completion rates
5. A/B testing different messaging approaches
