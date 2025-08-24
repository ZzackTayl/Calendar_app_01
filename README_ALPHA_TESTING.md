# Alpha Testing Setup for PolyHarmony Calendar App

This repository contains all the necessary components and documentation to set up and run alpha testing for the invitation and group functionality of the PolyHarmony Calendar App.

## Overview

The alpha testing setup includes:
- Complete testing workflow for multi-engineer collaboration
- Database migration for invitation system
- Email system configuration (with fallback to console logging)
- Comprehensive documentation and scripts

## Prerequisites

Before beginning, ensure you have:
- Node.js (version 18 or higher)
- npm or yarn package manager
- Supabase account with project created
- Access to Supabase project dashboard

## Quick Start

1. **Verify Setup**
   ```bash
   npm run alpha:test:verify
   ```

2. **Apply Database Migration**
   - Open your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy contents of `supabase/migrations/20250824000001_invitation_system.sql`
   - Execute in SQL Editor

3. **Deploy Application**
   Deploy your application to a staging environment

4. **Run Preparation Script**
   ```bash
   npm run alpha:test:prepare
   ```

5. **Begin Testing**
   Follow the steps in `ALPHA_TESTING_GUIDE.md`

## Key Components

### Documentation
- `ALPHA_TESTING_GUIDE.md` - Detailed step-by-step testing instructions
- `ALPHA_TEST_RESULTS_TEMPLATE.md` - Template for documenting test results
- `INVITATION_SYSTEM_DEPLOYMENT.md` - Database migration instructions
- `ALPHA_TESTING_SETUP_SUMMARY.md` - Complete setup overview
- `ALPHA_TESTING_CHECKLIST.md` - Pre-testing checklist

### Scripts
- `scripts/prepare-alpha-test.js` - Environment preparation
- `scripts/cleanup-alpha-test.js` - Test data cleanup
- `scripts/test-invitation-system.js` - Invitation system verification
- `scripts/test-email-system.js` - Email system verification
- `scripts/verify-alpha-setup.js` - Complete setup verification
- `scripts/setup-env-variables.js` - Environment variables helper
- `scripts/apply-invitation-migration.js` - Migration application helper

### Email System
The email system supports multiple providers:
- SendGrid
- Resend
- AWS SES
- SMTP
- ConsoleEmailProvider (fallback for testing)

### Database Migration
The invitation system requires specific database tables:
- `invitations`
- `invitation_tokens`
- `group_invitations`
- `group_invitation_tokens`
- `connection_setups`
- `group_members`
- `group_member_permissions`
- `invitation_notification_preferences`

## Testing Workflow

The alpha testing follows this workflow with 4 engineers:

1. **Engineer 1** invites **Engineer 2**
2. **Engineer 2** accepts and registers
3. **Engineer 2** signs in and accepts the invite
4. **Engineer 2** sets permissions for **Engineer 1**
5. **Engineer 1** accesses the group to verify
6. **Engineer 2** invites **Engineer 3**
7. **Engineer 3** signs up, sets permissions, and creates an event

## Package.json Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `alpha:test:verify` | Verify complete setup | `npm run alpha:test:verify` |
| `alpha:test:prepare` | Prepare testing environment | `npm run alpha:test:prepare` |
| `alpha:test:cleanup` | Clean up test data | `npm run alpha:test:cleanup` |
| `alpha:test:invitation` | Test invitation system | `npm run alpha:test:invitation` |
| `alpha:test:email` | Test email system | `npm run alpha:test:email` |
| `alpha:setup:env` | Setup environment variables helper | `npm run alpha:setup:env` |
| `alpha:apply:migration` | Migration application helper | `npm run alpha:apply:migration` |

## Environment Variables

Required environment variables:
```
INVITATION_FROM_EMAIL=invites@yourdomain.com
INVITATION_FROM_NAME="PolyHarmony Test"
```

Optional email service configuration (choose one):
```
# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# Resend
RESEND_API_KEY=your_resend_api_key

# AWS SES
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# SMTP
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Success Criteria

The alpha test is successful if:
1. All invitation flows work correctly
2. Users can register through invitation links
3. Group memberships are properly established
4. Privacy permissions are correctly enforced
5. Events are visible according to permission settings
6. All engineers can collaborate effectively within the group

## Troubleshooting

If you encounter issues:

1. **Database Tables Missing**: Apply the migration as described in `INVITATION_SYSTEM_DEPLOYMENT.md`

2. **Email Not Sending**: 
   - Verify email service configuration
   - Check environment variables
   - Test with ConsoleEmailProvider

3. **Permission Issues**: 
   - Ensure group membership is confirmed
   - Check privacy settings in group member permissions

4. **API Errors**:
   - Verify the application is running
   - Check Supabase configuration
   - Review console logs for detailed error messages

## Support

For issues with the testing setup:
1. Run `npm run alpha:test:verify` to check your setup
2. Review the documentation files created for this process
3. Contact the development team for assistance

## Next Steps

After successful alpha testing:
1. Review and address any issues documented
2. Plan beta testing with a larger group
3. Prepare for production deployment
4. Set up monitoring and analytics