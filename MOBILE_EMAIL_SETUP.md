# Mobile Email Service Configuration Guide

This guide covers the complete setup of email services for mobile compatibility in the PolyHarmony application, including Android and iOS deep linking support.

## Overview

The PolyHarmony email system is designed to work seamlessly across:
- **Web browsers** (desktop and mobile)
- **Native mobile apps** (iOS and Android via React Native/Expo)
- **Email clients** (Gmail, Apple Mail, Outlook, etc.)

## Features

✅ **Mobile-optimized HTML templates** with responsive design  
✅ **Multiple email provider support** (SendGrid, Resend, AWS SES, SMTP)  
✅ **Universal deep linking** (works on web and mobile)  
✅ **App Store integration** (download prompts in emails)  
✅ **Smart link generation** (detects mobile vs desktop)  
✅ **Offline invitation handling** (stores invitations locally)  
✅ **Enhanced error handling** and retry mechanisms  

## 1. Environment Configuration

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# Choose ONE email service provider:

# Option 1: SendGrid (Recommended for production)
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here

# Option 2: Resend (Modern alternative)
RESEND_API_KEY=re_your-resend-api-key-here

# Option 3: AWS SES (Enterprise solution)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# Option 4: SMTP (Generic provider)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Email sender configuration
INVITATION_FROM_EMAIL=invites@your-domain.com
INVITATION_FROM_NAME=Your App Name

# Mobile deep links configuration
NEXT_PUBLIC_APP_SCHEME=polyharmony
NEXT_PUBLIC_MOBILE_APP_URL=polyharmony://
NEXT_PUBLIC_WEB_APP_URL=https://your-domain.com
```

## 2. Email Provider Setup

### SendGrid Setup

1. **Create SendGrid Account**
   - Go to [SendGrid.com](https://sendgrid.com)
   - Create account and verify email

2. **Generate API Key**
   ```bash
   # In SendGrid dashboard:
   Settings → API Keys → Create API Key
   # Choose "Full Access" for production
   ```

3. **Verify Domain** (Production)
   ```bash
   # In SendGrid dashboard:
   Settings → Sender Authentication → Domain Authentication
   ```

### Resend Setup

1. **Create Resend Account**
   - Go to [Resend.com](https://resend.com)
   - Create account

2. **Generate API Key**
   ```bash
   # In Resend dashboard:
   API Keys → Create API Key
   ```

3. **Add Domain** (Production)
   ```bash
   # In Resend dashboard:
   Domains → Add Domain
   ```

### AWS SES Setup

1. **Configure AWS Credentials**
   ```bash
   # Create IAM user with SES permissions
   aws iam create-user --user-name ses-sender
   aws iam attach-user-policy --user-name ses-sender --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess
   aws iam create-access-key --user-name ses-sender
   ```

2. **Verify Domain/Email**
   ```bash
   # In AWS SES Console:
   Verified identities → Create identity
   ```

## 3. Mobile App Configuration

### iOS Configuration (Expo/React Native)

The mobile app is configured in `/mobile/PolyHarmony/app.json`:

```json
{
  "expo": {
    "scheme": "polyharmony",
    "ios": {
      "bundleIdentifier": "com.polyharmony.app",
      "associatedDomains": [
        "applinks:polyharmony.app",
        "applinks:app.polyharmony.app",
        "applinks:invite.polyharmony.app"
      ],
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLName": "polyharmony",
            "CFBundleURLSchemes": ["polyharmony"]
          }
        ]
      }
    }
  }
}
```

### Android Configuration

```json
{
  "expo": {
    "android": {
      "package": "com.polyharmony.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "polyharmony.app",
              "pathPrefix": "/invitation"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        },
        {
          "action": "VIEW",
          "data": [{ "scheme": "polyharmony" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### Universal Links Setup

1. **iOS Universal Links**
   - Add `apple-app-site-association` file to your web server
   - Configure associated domains in iOS app

2. **Android App Links**
   - Add `assetlinks.json` file to `/.well-known/` on your website
   - Configure intent filters in Android app

Example `apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.polyharmony.app",
        "paths": ["/invitation/*", "/invite/*"]
      }
    ]
  }
}
```

## 4. Mobile App Integration

### Installation

```bash
cd mobile/PolyHarmony
npm install @react-native-async-storage/async-storage
expo install expo-linking
```

### Usage in React Native

```typescript
import { invitationService } from '../services/InvitationService';
import InvitationHandler from '../components/InvitationHandler';

// Initialize deep linking listener
useEffect(() => {
  const cleanup = invitationService.initializeDeepLinkListener(
    (invitation) => {
      // Handle received invitation
      setCurrentInvitation(invitation);
    }
  );
  
  return cleanup;
}, []);

// Render invitation handler
<InvitationHandler
  invitation={currentInvitation}
  userToken={userToken}
  onAccepted={(result) => {
    // Handle acceptance
    navigation.navigate('Dashboard');
  }}
  onDeclined={(result) => {
    // Handle decline
    setCurrentInvitation(null);
  }}
  onError={(error) => {
    Alert.alert('Error', error);
  }}
/>
```

## 5. Testing

### Test Email Service

```bash
# Run the email service test
npm run alpha:test:email
```

### Test Invitation System

```bash
# Test the invitation system
npm run alpha:test:invitation
```

### Manual Testing Steps

1. **Send Test Invitation**
   - Create invitation through web interface
   - Check email delivery
   - Verify mobile-responsive design

2. **Test Deep Links**
   - Click email link on mobile device
   - Verify app opens (if installed)
   - Verify web fallback works

3. **Test Acceptance Flow**
   - Accept invitation from mobile app
   - Accept invitation from web browser
   - Test expired invitation handling

## 6. Troubleshooting

### Common Issues

**Email not sending:**
```bash
# Check email provider configuration
npm run alpha:test:email

# Verify environment variables
echo $SENDGRID_API_KEY
```

**Deep links not working:**
```bash
# iOS: Check associated domains configuration
# Android: Verify intent filters and domain verification
# Test with adb: adb shell am start -W -a android.intent.action.VIEW -d "https://yourapp.com/invitation/test"
```

**Mobile app not opening:**
```bash
# iOS: Verify app is installed and scheme is registered
# Android: Check app is installed and intent filters are correct
# Test custom scheme: polyharmony://invitation/token
```

### Debug Commands

```bash
# Check email service status
npm run alpha:test:verify

# View email logs
npm run monitoring:check

# Test mobile app linking
npx expo start --dev-client
```

## 7. Production Deployment

### Pre-deployment Checklist

- [ ] Email provider configured and verified
- [ ] Domain verification complete
- [ ] Universal links configured
- [ ] App store listings created
- [ ] SSL certificates installed
- [ ] Environment variables set in production

### Domain Configuration

1. **DNS Records** (for email delivery)
   ```
   # SPF Record
   TXT: "v=spf1 include:sendgrid.net ~all"
   
   # DKIM Records (provided by email service)
   CNAME: em1234._domainkey → em1234.dkim.sendgrid.net
   
   # DMARC Record
   TXT: "_dmarc" → "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
   ```

2. **Universal Links Files**
   ```bash
   # Place on your web server:
   https://yourdomain.com/.well-known/apple-app-site-association
   https://yourdomain.com/.well-known/assetlinks.json
   ```

### Security Considerations

- Use environment-specific API keys
- Implement rate limiting for invitation creation
- Validate all email addresses
- Use secure token generation
- Monitor for suspicious activity

## 8. Monitoring & Analytics

### Email Analytics

- Open rates by device type
- Click-through rates for mobile vs desktop
- Conversion rates (invitation acceptance)
- Bounce and spam rates

### Mobile Analytics

- Deep link click rates
- App installation conversion
- Invitation acceptance in app vs web
- User retention after invitation

### Health Checks

```bash
# Automated monitoring
npm run monitoring:start

# Manual health check
curl -X GET https://yourapp.com/api/health
```

## Support

For additional support:
- Check the main README.md
- Review API documentation
- Contact development team
- Check monitoring dashboard for real-time status

---

**Last Updated:** January 2025  
**Version:** 1.0.0