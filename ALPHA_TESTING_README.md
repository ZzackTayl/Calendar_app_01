# Alpha Testing Setup

This directory contains all the necessary files and scripts to set up and run alpha testing for the PolyHarmony Calendar App invitation and group functionality.

## Files Included

1. `ALPHA_TESTING_GUIDE.md` - Detailed step-by-step testing instructions
2. `ALPHA_TEST_RESULTS_TEMPLATE.md` - Template for documenting test results
3. `scripts/prepare-alpha-test.js` - Script to prepare the testing environment
4. `scripts/cleanup-alpha-test.js` - Script to clean up test data after testing
5. `ALPHA_TESTING_README.md` - This file

## Setup Instructions

1. Ensure your staging environment is deployed and accessible
2. Configure email service for sending invitations
3. Set the required environment variables:
   ```
   NEXT_PUBLIC_APP_URL=https://your-staging-domain.com
   INVITATION_FROM_EMAIL=invites@yourdomain.com
   INVITATION_FROM_NAME="PolyHarmony Test"
   ```
4. Run the preparation script:
   ```bash
   npm run alpha:test:prepare
   ```

## Testing Workflow

Follow the detailed steps in `ALPHA_TESTING_GUIDE.md` which includes:

1. Engineer 1 invites Engineer 2
2. Engineer 2 accepts and registers
3. Engineer 2 signs in and accepts the invite
4. Engineer 2 sets permissions for Engineer 1
5. Engineer 1 accesses the group to verify
6. Engineer 2 invites Engineer 3
7. Engineer 3 signs up, sets permissions, and creates an event

## Cleanup

After testing is complete, clean up test data with:
```bash
npm run alpha:test:cleanup
```

## Documentation

Use `ALPHA_TEST_RESULTS_TEMPLATE.md` to document your test results, issues encountered, and feedback.

## Support

For issues with the testing setup, contact the development team.