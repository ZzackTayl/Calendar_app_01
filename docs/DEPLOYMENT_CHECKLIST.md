# 🚀 Vercel Deployment Checklist

## Pre-Deployment Verification ✅
- [x] Build successful (`npm run build`)
- [x] TypeScript compilation clean
- [x] ESLint passing
- [x] PWA configuration validated
- [x] Authentication system tested
- [x] Core API endpoints verified

## Vercel Environment Variables Required

### 🔐 Supabase Configuration (Required)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 🔑 Security Keys (Required)
```
NEXTAUTH_SECRET=your-nextauth-secret
ENCRYPTION_KEY=your-64-character-hex-encryption-key
```

### 📧 Email Configuration (Choose One)
```
# Option 1: Resend (Recommended)
RESEND_API_KEY=your-resend-api-key

# Option 2: SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key

# Option 3: AWS SES
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

### 📱 App Configuration
```
INVITATION_FROM_EMAIL=invites@your-domain.com
INVITATION_FROM_NAME=Your App Name
NEXT_PUBLIC_WEB_APP_URL=https://your-vercel-domain.vercel.app
```

## Deployment Commands

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Option 2: Git Integration
1. Push to your main branch
2. Vercel will auto-deploy if connected to GitHub

## Post-Deployment Verification

After deployment, run these tests against your live URL:

```bash
# Update test scripts to use production URL
export PRODUCTION_URL="https://your-app.vercel.app"

# Test PWA functionality
npm run validate:pwa

# Test authentication
npm run test:account-deletion

# Test calendar integrations
npm run test:calendar

# Full Phase 3 validation
npm run validate
```

## 🔍 Post-Deployment Checks

1. **PWA Installation**
   - Visit: `https://your-app.vercel.app/manifest.json`
   - Visit: `https://your-app.vercel.app/sw.js`
   - Test PWA installation in browser

2. **Authentication Flow**
   - Test sign up
   - Test sign in
   - Test password reset

3. **Core Features**
   - Create an event
   - Create a contact
   - Test calendar view

4. **Security Headers**
   - Check CSP headers
   - Verify HTTPS enforcement
   - Test CSRF protection

## 🚨 Troubleshooting

### Common Issues:
1. **Build Failures**: Check environment variables
2. **Database Errors**: Verify Supabase configuration
3. **Email Issues**: Confirm email provider setup
4. **PWA Issues**: Check manifest.json and sw.js accessibility

### Debug Commands:
```bash
# Check deployment logs
vercel logs your-deployment-url

# Test specific endpoints
curl -I https://your-app.vercel.app/api/health
curl -I https://your-app.vercel.app/manifest.json
```