# Email System Testing Guide

## Overview

This document provides comprehensive testing procedures for the email system in your calendar application. It covers both Supabase Auth emails and custom invitation emails, ensuring end-to-end functionality.

## Quick Start

### Prerequisites

1. **Environment Setup**: Ensure all required environment variables are configured
2. **Test Email Accounts**: Set up test email addresses (use temp email services for automation)
3. **Supabase Configuration**: Verify Supabase Dashboard settings are correct
4. **Email Providers**: Configure at least one email service provider

### Running Tests

```bash
# Run comprehensive validation
npm run validate-email-system

# Run with real email sending (use carefully)
npm run validate-email-system -- --live-test

# Run E2E tests with Playwright
npm run test:e2e -- tests/email/e2e-email-tests.spec.ts

# Run security and performance tests
npm run test -- tests/email/rate-limiting-security.test.ts
```

## Test Categories

### 1. Configuration Validation

**Purpose**: Verify all email services are properly configured

**Test Script**: `scripts/validate-email-system.js`

**What It Tests**:
- ✅ Environment variables are set correctly
- ✅ Supabase Auth configuration
- ✅ Email provider connectivity (Resend, SendGrid, SMTP)
- ✅ Security settings validation
- ✅ Integration between services

**Expected Results**:
```
EMAIL SYSTEM VALIDATION REPORT
Generated: 2024-01-15T10:30:00.000Z

OVERALL RESULTS:
✅ Passed: 15
❌ Failed: 0 
⚠️  Warnings: 2
📊 Success Rate: 88.2%

COMPONENT STATUS:
- Supabase Auth: completed
- Email Providers: completed
- Invitation System: completed
- Security: completed
- Integration: completed
- Performance: completed
```

### 2. End-to-End Email Flows

**Purpose**: Test complete user journeys involving emails

**Test Script**: `tests/email/e2e-email-tests.spec.ts`

#### Supabase Auth Email Flow
```
1. User signs up with email
2. Supabase sends confirmation email
3. User clicks confirmation link
4. System redirects to dashboard
5. User is successfully authenticated
```

#### Individual Invitation Flow
```
1. Authenticated user sends invitation
2. Invitation email is delivered
3. Recipient clicks invitation link
4. System shows invitation details
5. Recipient accepts invitation
6. Connection is established
```

#### Group Invitation Flow
```
1. User creates group
2. User sends group invitation
3. Recipient receives group invitation email
4. Recipient joins group via email link
5. Group membership is confirmed
```

#### Invitation with Signup Flow
```
1. Existing user sends invitation to new user
2. New user clicks invitation link
3. System redirects to signup with invitation context
4. New user completes signup
5. System sends email verification
6. User verifies email
7. System processes both verification AND invitation
8. User lands on dashboard with invitation accepted
```

### 3. Security and Performance Testing

**Purpose**: Validate security measures and system performance under load

**Test Script**: `tests/email/rate-limiting-security.test.ts`

#### Rate Limiting Tests
- ✅ Per-user invitation limits enforced
- ✅ Rate limits reset after time window
- ✅ Separate rate limits per user
- ✅ Bulk sending respects rate limits

#### Security Validation
- ✅ Token generation uses cryptographic randomness
- ✅ Token expiration is enforced
- ✅ Token reuse is prevented
- ✅ Email header injection prevention
- ✅ XSS prevention in email content
- ✅ URL validation for invitation links

#### Performance Testing
- ✅ Concurrent email sending
- ✅ Bulk invitation processing
- ✅ Error recovery mechanisms
- ✅ Load testing under sustained traffic

### 4. Mobile Compatibility

**Purpose**: Ensure emails work correctly on mobile devices

#### Mobile Email Rendering
- ✅ Responsive design works on small screens
- ✅ Touch-friendly buttons (minimum 44px)
- ✅ Readable text without zooming
- ✅ Images scale properly

#### Deep Linking
- ✅ Universal links work on iOS
- ✅ App links work on Android
- ✅ Fallback to web version when app not installed
- ✅ Proper meta tags for app store linking

## Manual Testing Procedures

### 1. Developer Email Test (Quick Verification)

**Time Required**: 5 minutes

**Steps**:
1. Use one of your 4 developer test emails
2. Sign up for a new account
3. Check email for confirmation link
4. Click confirmation link
5. Verify redirect to dashboard
6. Sign out and sign back in

**Success Criteria**:
- ✅ Confirmation email received within 30 seconds
- ✅ Confirmation link works and redirects properly
- ✅ User can sign in after confirmation
- ✅ No errors in browser console

### 2. Full Invitation Flow Test

**Time Required**: 10 minutes

**Steps**:
1. Sign in as existing user
2. Navigate to invitation sending page
3. Send invitation to test email address
4. Check email for invitation
5. Open invitation link in incognito/private browser
6. Follow invitation acceptance process
7. Verify connection established

**Success Criteria**:
- ✅ Invitation email received with proper formatting
- ✅ Invitation link opens correctly
- ✅ Acceptance process works smoothly
- ✅ Both users can see the connection

### 3. Mobile Testing

**Time Required**: 15 minutes

**Setup**: Use physical mobile device or browser dev tools mobile emulation

**Steps**:
1. Send test invitation email
2. Open email on mobile device
3. Verify email renders correctly
4. Tap invitation button
5. Check that link opens properly
6. Test app deep linking (if applicable)

**Success Criteria**:
- ✅ Email is readable without horizontal scrolling
- ✅ Buttons are easily tappable
- ✅ Links open in appropriate app/browser
- ✅ No layout issues or broken images

## Automated Testing Schedule

### Continuous Integration (CI/CD)

**Triggers**:
- Every pull request
- Nightly builds
- Before deployments

**Tests Run**:
- Configuration validation (no real emails)
- Unit tests for email service
- Security vulnerability checks
- Performance benchmarks

### Production Monitoring

**Frequency**: Real-time + Daily reports

**Metrics Tracked**:
- Email delivery success rate
- Average delivery time
- Provider uptime
- Error rates by type
- User conversion funnel

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Emails Not Sending

**Symptoms**:
- No emails received
- Console shows "using ConsoleEmailProvider"

**Diagnosis**:
```bash
node scripts/validate-email-system.js
```

**Solutions**:
- Check environment variables are set
- Verify email provider API keys
- Ensure from address is verified with provider
- Check rate limits haven't been exceeded

#### 2. Supabase Auth Emails Not Working

**Symptoms**:
- Signup process hangs on "check your email"
- Confirmation links don't work

**Diagnosis**:
- Check Supabase Dashboard → Authentication → Settings
- Verify email confirmations are enabled
- Check redirect URLs are configured

**Solutions**:
1. **Enable Email Confirmations**:
   - Dashboard → Authentication → Settings
   - Set "Enable email confirmations" to `true`
   - Set "Mailer autoconfirm" to `false`

2. **Configure Redirect URLs**:
   ```
   Site URL: https://your-domain.com
   Redirect URLs:
   - https://your-domain.com/auth/callback
   - https://your-domain.com/auth/signin
   - https://your-domain.com/dashboard
   ```

3. **Check Email Templates**:
   - Dashboard → Authentication → Email Templates
   - Verify "Confirm signup" template is configured
   - Test with "Send test email"

#### 3. Invitation Links Not Working

**Symptoms**:
- Links lead to 404 or error pages
- Invitations show as "invalid" or "expired"

**Solutions**:
- Verify base URL configuration
- Check token generation and validation
- Ensure database has invitation records
- Check expiration logic

#### 4. Mobile Links Not Working

**Symptoms**:
- Links don't open app on mobile
- Poor mobile email rendering

**Solutions**:
- Add universal link configuration
- Test with actual mobile devices
- Verify meta tags for app store links
- Check responsive CSS in email templates

#### 5. Rate Limiting Issues

**Symptoms**:
- "Too many requests" errors
- Users can't send invitations

**Solutions**:
- Check rate limit configuration
- Implement user feedback for limits
- Consider increasing limits for trusted users
- Monitor for abuse patterns

## Performance Benchmarks

### Expected Performance Metrics

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Email Delivery Time | < 5 seconds | < 30 seconds | > 60 seconds |
| Signup Confirmation | < 10 seconds | < 60 seconds | > 120 seconds |
| Invitation Send | < 3 seconds | < 10 seconds | > 30 seconds |
| Bulk Invitations (10) | < 15 seconds | < 60 seconds | > 120 seconds |
| Success Rate | > 99% | > 95% | < 95% |
| Provider Uptime | > 99.9% | > 99% | < 99% |

### Load Testing Results

**Concurrent Users**: 50  
**Duration**: 30 seconds  
**Actions**: Sending invitations  

**Expected Results**:
- ✅ All invitations sent successfully
- ✅ Average response time < 2 seconds
- ✅ No memory leaks or crashes
- ✅ Error rate < 1%

## Security Checklist

### Pre-Production Security Review

- [ ] **Email Headers**: No injection vulnerabilities
- [ ] **Token Security**: Cryptographically secure generation
- [ ] **Input Validation**: All email addresses validated
- [ ] **XSS Prevention**: Email content properly escaped
- [ ] **CSRF Protection**: API endpoints protected
- [ ] **Rate Limiting**: Proper limits implemented
- [ ] **URL Validation**: Invitation links restricted to allowed domains
- [ ] **Token Expiration**: Proper expiry logic implemented
- [ ] **Audit Logging**: Email events properly logged
- [ ] **Environment Variables**: Sensitive data not exposed

### Ongoing Security Monitoring

- Monitor for unusual email patterns
- Track failed authentication attempts
- Alert on rate limit breaches
- Log all invitation activities
- Monitor for spam/abuse reports

## Success Criteria Summary

The email system is considered ready for production when:

### ✅ Configuration
- All required environment variables set
- At least one email provider configured and working
- Supabase Auth properly configured
- All validation tests pass

### ✅ Functionality  
- Signup email verification works end-to-end
- Individual invitations work correctly
- Group invitations work correctly
- Invitation + signup flow works seamlessly
- Mobile compatibility verified

### ✅ Performance
- Email delivery within target times
- System handles expected load
- Proper error handling and recovery
- Monitoring and alerting operational

### ✅ Security
- All security tests pass
- Rate limiting properly enforced
- Input validation working
- No known vulnerabilities

### ✅ User Experience
- Emails render correctly across devices
- Clear error messages for users
- Smooth user flows from email to app
- Proper feedback for all actions

## Getting Help

### Resources
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Resend Documentation](https://resend.com/docs)
- [SendGrid Documentation](https://sendgrid.com/docs/)

### Debugging Tools
- `scripts/validate-email-system.js` - Comprehensive validation
- `lib/monitoring/email-monitoring.ts` - Real-time monitoring
- Browser developer tools for client-side debugging
- Supabase Dashboard logs for auth issues

### Support Contacts
- Primary Developer: [Your Email]
- Backup Developer: [Backup Email] 
- Infrastructure Team: [Infra Email]

Remember to test in a staging environment before deploying to production!