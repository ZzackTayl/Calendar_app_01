# Developer Account Setup Guide - Real User Accounts

## ✅ Supabase Auth is LIVE and Working!

Your remote developers can now create **real user accounts** that will:
- ✅ Register with email/password
- ✅ Login to the application
- ✅ Create relationships and events
- ✅ Save data to the shared Supabase database
- ✅ See their data persist across sessions

## 🚀 Quick Start for Remote Developers

### Step 1: Deploy Staging Environment
```bash
# Run this to deploy your app
./deploy-staging.sh
```

### Step 2: Create Developer Accounts
Each developer should:

1. **Visit the deployed URL** (output from deploy script)
2. **Click "Sign Up"** on the homepage
3. **Fill out registration form**:
   - Email: Use their real email or `dev-[name]@example.com`
   - Password: Minimum 8 characters
   - Full name: Their actual name
4. **Check email** for confirmation (check spam folder)
5. **Click confirmation link** in email
6. **Sign in** with their new credentials

### Step 3: Test Full Functionality
After signing in, developers should test:

1. **Create a relationship**:
   - Go to Relationships → Add Relationship
   - Fill in partner details
   - Choose relationship type and color

2. **Create an event**:
   - Go to Calendar → Create Event
   - Link to the relationship they just created
   - Add title, description, and time

3. **Verify persistence**:
   - Refresh the page
   - Log out and log back in
   - Confirm their data is still there

## 📋 Test Accounts for Quick Verification

**Pre-created test accounts** (for immediate testing):

**Test Account 1**:
- Email: `dev-test-1@example.com`
- Password: `DevTest123!`

**Test Account 2**:
- Email: `dev-test-2@example.com`
- Password: `DevTest123!`

## 🔧 Developer Workflow

### Local Development Setup
```bash
# 1. Clone repository
git clone [your-repo-url]
cd calendar-app-01

# 2. Install dependencies
npm install

# 3. Copy environment (already configured)
cp .env.local.example .env.local

# 4. Start development
npm run dev

# 5. Visit http://localhost:3000
# 6. Create account and start testing
```

### Database Access Verification
Run this to verify everything is working:
```bash
node test-user-journey-simple.js
```

## 🎯 What Developers Will Experience

1. **Real Account Creation**: Each developer creates their own account
2. **Shared Database**: All accounts use the same Supabase instance
3. **Persistent Data**: Relationships and events are saved permanently
4. **Real-time Sync**: Changes appear across all sessions
5. **Full CRUD**: Create, read, update, delete relationships and events

## 📧 Email Configuration

**Current Setup**: Email confirmation is enabled
- Developers will receive confirmation emails
- Check spam folders if emails don't appear
- Confirmation links expire after 24 hours

**For Testing**: You can disable email confirmation in Supabase dashboard:
1. Go to https://app.supabase.com
2. Select your project
3. Go to Authentication → Providers → Email
4. Toggle "Confirm email" to OFF (for staging only)

## 🔍 Troubleshooting

**"Email not received"**:
- Check spam/junk folders
- Use real email addresses
- Wait 2-3 minutes for delivery

**"Can't create relationships"**:
- Ensure user is logged in
- Check browser console for errors
- Verify database schema is applied

**"Data not persisting"**:
- Confirm user is logged in
- Check network tab for API errors
- Verify Supabase connection

## 🚀 Next Steps for Team Lead

1. **Deploy staging**: `./deploy-staging.sh`
2. **Share this guide** with remote developers
3. **Create your own account** to test the flow
4. **Share the staging URL** with your team
5. **Monitor usage** via Supabase dashboard

## 📊 Monitoring

Track developer activity:
- **Supabase Dashboard**: https://app.supabase.com → Your project → Authentication
- **User Management**: View registered users and their activity
- **Database**: Monitor table usage and performance

Your remote developers are now ready to create real accounts and start using the application with full Supabase integration!