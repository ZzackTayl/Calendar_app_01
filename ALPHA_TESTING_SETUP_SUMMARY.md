# Alpha Testing Setup Summary

This document summarizes the complete setup for alpha testing the PolyHarmony Calendar App invitation and group functionality.

## Overview

We have created a comprehensive testing framework that includes:
1. Detailed testing guide with step-by-step instructions
2. Test data preparation and cleanup scripts
3. Environment verification tools
4. Documentation for deployment and troubleshooting

## Files Created

### Testing Documentation
- `ALPHA_TESTING_GUIDE.md` - Complete step-by-step testing instructions
- `ALPHA_TEST_RESULTS_TEMPLATE.md` - Template for documenting test results
- `ALPHA_TESTING_README.md` - Quick start guide for testing

### Deployment Documentation
- `INVITATION_SYSTEM_DEPLOYMENT.md` - Instructions for deploying the invitation system
- `INVITATION_SYSTEM_SETUP.md` - Existing setup guide for the invitation system

### Scripts
- `scripts/prepare-alpha-test.js` - Environment preparation script
- `scripts/cleanup-alpha-test.js` - Test data cleanup script
- `scripts/test-invitation-system.js` - Invitation system verification script
- `scripts/apply-invitation-migration.js` - Migration application helper script

## Setup Process

### 1. Environment Preparation
```bash
npm run alpha:test:prepare
```

### 2. Deploy Invitation System
Follow the instructions in `INVITATION_SYSTEM_DEPLOYMENT.md` to apply the database migration.

### 3. Configure Email Service
Set up one of the supported email providers:
- SendGrid
- Resend
- AWS SES
- SMTP

Add the appropriate environment variables to your `.env.local` file:
```
INVITATION_FROM_EMAIL=invites@yourdomain.com
INVITATION_FROM_NAME="PolyHarmony Test"
SENDGRID_API_KEY=your_sendgrid_api_key
# OR
RESEND_API_KEY=your_resend_api_key
# OR
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# OR
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### 4. Verify Setup
```bash
npm run alpha:test:invitation
```

### 5. Begin Testing
Follow the detailed steps in `ALPHA_TESTING_GUIDE.md`:
1. Engineer 1 invites Engineer 2
2. Engineer 2 accepts and registers
3. Engineer 2 signs in and accepts the invite
4. Engineer 2 sets permissions for Engineer 1
5. Engineer 1 accesses the group to verify
6. Engineer 2 invites Engineer 3
7. Engineer 3 signs up, sets permissions, and creates an event

## Scripts Available

| Script | Purpose | Command |
|--------|---------|---------|
| `alpha:test:prepare` | Prepare testing environment | `npm run alpha:test:prepare` |
| `alpha:test:cleanup` | Clean up test data | `npm run alpha:test:cleanup` |
| `alpha:test:invitation` | Test invitation system | `npm run alpha:test:invitation` |
| `alpha:apply:migration` | Help apply migration | `npm run alpha:apply:migration` |

## Test Accounts

Use these test accounts during alpha testing:
- Engineer 1: `engineer1@test.com`
- Engineer 2: `engineer2@test.com`
- Engineer 3: `engineer3@test.com`
- Engineer 4: `engineer4@test.com`

Password for all accounts: `TestPass123!`

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
   - Test with a simple email sending script

3. **Permission Issues**: 
   - Ensure group membership is confirmed
   - Check privacy settings in group member permissions

4. **API Errors**:
   - Verify the application is running
   - Check Supabase configuration
   - Review console logs for detailed error messages

## Next Steps

1. Deploy the application to a staging environment
2. Apply the invitation system database migration
3. Configure email service for invitation notifications
4. Run the preparation script
5. Execute the alpha testing workflow
6. Document results using the test results template
7. Clean up test data after testing is complete

## Support

For issues with the testing setup, contact the development team or refer to the documentation files created for this process.