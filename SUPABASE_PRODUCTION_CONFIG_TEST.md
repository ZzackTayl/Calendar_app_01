# SUPABASE PRODUCTION CONFIGURATION TEST PLAN

## Pre-Configuration Diagnostic Tests

### Test 1: Current Production Settings Audit
**Objective**: Document current Supabase Dashboard settings before changes

**Steps**:
1. Navigate to: https://supabase.com/dashboard/project/mqmtsiqalclkfeursrsa/auth/settings
2. Screenshot and document current settings:
   - [ ] Enable signup status
   - [ ] Confirm email before allowing login
   - [ ] Enable email confirmations
   - [ ] Double confirm email changes
   - [ ] SMTP settings (host, port, credentials)
   - [ ] Site URL and redirect URLs

**Expected Findings**: Email confirmations likely disabled, SMTP not configured

### Test 2: Email Flow Diagnostic
**Command**: `node test-email-verification.js`

**Expected Results**:
- If emails auto-confirm: Dashboard email confirmation is disabled ❌
- If rate-limited: System working but misconfigured ⚠️
- If signup fails: Credentials or permissions issue ❌

### Test 3: SMTP Connectivity Test
**Command**: `node configure-supabase-email.js --test-only`

**Checks**:
- [ ] Resend API key validity
- [ ] SMTP credentials access
- [ ] Service role permissions
- [ ] Management API connectivity

## Configuration Implementation Plan

### Step 1: Dashboard Configuration (CRITICAL)
**URL**: https://supabase.com/dashboard/project/mqmtsiqalclkfeursrsa/auth/settings

**Required Settings**:
```
Authentication Settings:
✅ Enable signup: ON
✅ Confirm email before allowing login: ON  [CRITICAL]
✅ Enable email confirmations: ON           [CRITICAL]
✅ Double confirm email changes: ON
✅ Secure password change: ON

SMTP Settings:
✅ Enable Custom SMTP: ON                   [CRITICAL]
Host: smtp.resend.com
Port: 587
Username: resend
Password: re_4ETbnTcY_AZt3ZtGPHFjatzajZNjEJudE
From Email: zacks@anthropologica.tech
From Name: PolyHarmony Productions Test

URL Configuration:
Site URL: [Your production domain]
Redirect URLs:
- https://[your-domain]/auth/callback
- http://localhost:3000/auth/callback
```

### Step 2: Automated Configuration Backup
**Command**: `node configure-supabase-email.js --backup-first`

**Purpose**: Attempt automated configuration with Management API

### Step 3: Template Configuration
Navigate to: Authentication → Email Templates

**Custom Templates**:
- Confirmation: Use `/supabase/templates/confirmation.html`
- Recovery: Use `/supabase/templates/recovery.html`
- Magic Link: Use `/supabase/templates/magic_link.html`

## Post-Configuration Validation

### Test 4: Email Delivery Verification
**Real Email Test**:
1. Use personal email for signup
2. Check inbox AND spam folder
3. Verify email arrives within 5 minutes
4. Test confirmation link functionality

### Test 5: Integration Validation
**Command**: `node test-integration-flow.js`

**Validates**:
- [ ] Signup → Email sent → Email received → Confirmation works
- [ ] Sign-in blocked for unverified users
- [ ] Middleware properly handles unverified users
- [ ] Invitation system uses same SMTP settings

### Test 6: Security Verification
**Command**: `node scripts/test-email-verification.js`

**Verifies**:
- [ ] Unverified users cannot access protected routes
- [ ] Email verification enforcement working
- [ ] No security bypasses

## Rollback Plan

### If Configuration Fails:
1. **Dashboard Rollback**: Revert settings via screenshot documentation
2. **Management API Rollback**: Use backup configuration file
3. **Emergency Access**: Temporarily disable email confirmation for critical access
4. **Alternative SMTP**: Switch to SendGrid or AWS SES if Resend fails

### If Emails Still Don't Send:
1. **Domain Verification**: Check Resend domain settings
2. **API Key Rotation**: Generate new Resend API key  
3. **Alternative Provider**: Switch to SendGrid backup configuration
4. **Debug Mode**: Enable detailed SMTP logging in Supabase

## Success Criteria

### Phase 1 Success:
- [ ] Production dashboard matches local config.toml settings
- [ ] SMTP configuration active in dashboard
- [ ] Test emails successfully delivered
- [ ] Email confirmation flow completes end-to-end

### Phase 2 Success:
- [ ] Invitation system emails work
- [ ] Both auth and invitation emails use same SMTP
- [ ] No configuration conflicts between systems
- [ ] Performance meets SLA requirements

## Risk Mitigation

### High Risk Items:
1. **Production Impact**: Changes affect live users
   - **Mitigation**: Test in staging first, off-hours deployment
   
2. **Email Deliverability**: Resend domain reputation
   - **Mitigation**: Verify domain status, warm-up plan
   
3. **Authentication Lockout**: Misconfiguration could lock out users
   - **Mitigation**: Keep admin access, rollback plan ready

### Medium Risk Items:
1. **SMTP Rate Limits**: Resend API limits
   - **Mitigation**: Monitor usage, upgrade plan if needed
   
2. **Template Rendering**: Custom templates may break
   - **Mitigation**: Test thoroughly, fallback to default templates

## Monitoring & Validation

### Real-time Monitoring:
- Supabase Dashboard → Logs → Auth logs
- Resend Dashboard → Email delivery stats
- Application logs → Authentication errors

### Success Metrics:
- Email delivery rate > 95%
- Confirmation completion rate > 80%
- Authentication error rate < 2%
- Time-to-delivery < 5 minutes

## Emergency Contacts & Resources

**Supabase Support**: Available if Management API fails
**Resend Support**: For SMTP delivery issues  
**Backup Email Provider**: SendGrid credentials ready
**Team Notification**: Slack/email for critical issues