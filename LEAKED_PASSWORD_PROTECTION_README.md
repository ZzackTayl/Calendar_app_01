# 🔒 Supabase Leaked Password Protection

This document explains how to enable and verify Supabase's HaveIBeenPwned password breach protection feature.

## 🛡️ What is Leaked Password Protection?

Supabase Auth includes built-in protection against compromised passwords by checking them against the HaveIBeenPwned.org database. This prevents users from signing up or signing in with passwords that have been found in data breaches.

**Key Benefits:**
- ✅ Prevents use of passwords from 500+ data breaches
- ✅ Automatic server-side validation during signup/signin
- ✅ No additional API calls or client-side processing required
- ✅ Works alongside existing password strength requirements

## 🚀 How to Enable

### Option 1: Automated Script (Recommended)

Run the provided script to enable leaked password protection:

```bash
# Make sure your environment variables are set
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_URL="https://your-project.supabase.co"

# Run the enable script
node enable-leaked-password-protection.js
```

### Option 2: Manual Configuration

1. **Go to your Supabase Dashboard**
2. **Navigate to:** Authentication → Settings
3. **Enable:** "Enable password breach protection"
4. **Save** the configuration

### Option 3: Using Existing Setup Scripts

The leaked password protection has been added to existing configuration scripts:

- `setup-supabase-auth.js` - Includes the setting during initial auth setup
- `configure-supabase-email.js` - Includes the setting during email configuration

## 🧪 Testing the Feature

Use the test script to verify the feature is working:

```bash
node test-leaked-password-protection.js
```

**Expected Results:**
- ❌ `password123` should be **REJECTED** (known compromised password)
- ✅ `Str0ngP@ssw0rd2024!` should be **ACCEPTED** (strong, unique password)

## 📋 Configuration Details

### Supabase Setting
```json
{
  "security_password_hibp_enabled": true
}
```

### What This Enables
- **Signup Protection:** New users cannot use compromised passwords
- **Signin Protection:** Existing users cannot change to compromised passwords
- **Password Reset:** Reset passwords are also checked against breaches
- **Multi-Factor:** Works with all authentication methods

## 🔧 Integration with Existing Code

The application already includes:

### Client-Side Breach Checking
```typescript
import { checkPasswordBreach } from '@/lib/security/password-breach-check';

// Real-time feedback during password entry
const result = await checkPasswordBreach(password);
if (result.isBreached) {
  // Show warning to user
}
```

### Enhanced Password Validation
```typescript
import { validatePasswordSecurity } from '@/lib/auth/password-utils';

// Comprehensive validation including breach detection
const validation = await validatePasswordSecurity(password);
```

## 📊 Monitoring and Logs

### Supabase Dashboard
- **Authentication Logs:** View rejected attempts due to compromised passwords
- **Security Events:** Monitor breach protection activations

### Application Logs
```bash
# Look for these log entries
"Password rejected: found in data breach"
"HaveIBeenPwned check failed: service unavailable"
```

## 🚨 Troubleshooting

### Common Issues

**1. Password Still Accepted**
- Verify the setting is enabled in Supabase dashboard
- Check if the user was created before enabling the feature
- Ensure the service role key has proper permissions

**2. All Passwords Rejected**
- Check if minimum password length is set too high
- Verify password strength requirements aren't too strict
- Ensure breach service is accessible

**3. Service Unavailable Errors**
- HaveIBeenPwned.org API may be temporarily down
- Check network connectivity
- Verify firewall/proxy settings

### Debug Commands
```bash
# Check current auth settings
node -e "
const https = require('https');
const req = https.request({
  hostname: 'your-project.supabase.co',
  path: '/rest/v1/auth/v1/settings',
  headers: { 'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
}).end();
"
```

## 🔄 Migration from Existing Users

### For Existing Applications

1. **Enable the feature** using the script above
2. **Test thoroughly** with the test script
3. **Monitor authentication logs** for any issues
4. **Update documentation** for users about password requirements

### Password Change Requirements

Once enabled, users:
- ✅ Can sign in with existing passwords (even if compromised)
- ❌ Cannot change passwords to compromised ones
- ✅ Must use strong, unique passwords for new accounts

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/password-security)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/Key)
- [Password Security Best Practices](https://supabase.com/docs/guides/auth/auth-best-practices)

## 🛠️ Maintenance

### Regular Tasks
- ✅ Monitor authentication success rates
- ✅ Review security logs for breach attempts
- ✅ Test the feature periodically
- ✅ Keep Supabase version updated

### Emergency Procedures
If the feature causes issues:
1. **Temporarily disable** in Supabase dashboard
2. **Investigate** the root cause
3. **Test thoroughly** before re-enabling
4. **Communicate** with affected users

---

**Security Note:** This feature significantly improves password security but should be used alongside other security measures like MFA, strong password policies, and regular security audits.
