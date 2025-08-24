# Alpha Testing Checklist

This checklist ensures you have everything set up correctly before beginning alpha testing of the invitation system.

## Prerequisites

- [ ] Node.js installed (version 18 or higher)
- [ ] npm or yarn package manager
- [ ] Supabase account with project created
- [ ] Access to Supabase project dashboard
- [ ] Test email accounts for Engineers 1-4

## Environment Setup

### 1. Environment Variables
- [ ] `INVITATION_FROM_EMAIL` set in `.env.local`
- [ ] `INVITATION_FROM_NAME` set in `.env.local`
- [ ] Optional: Configure email service provider (SendGrid, Resend, AWS SES, or SMTP)

### 2. Database Migration
- [ ] Apply invitation system migration to Supabase database:
  1. Open Supabase project dashboard
  2. Navigate to SQL Editor
  3. Copy contents of `supabase/migrations/20250824000001_invitation_system.sql`
  4. Execute in SQL Editor

### 3. Application Deployment
- [ ] Deploy application to staging environment
- [ ] Ensure application is accessible via web browser
- [ ] Verify Supabase integration is working

## Testing Preparation

### 1. Run Setup Scripts
```bash
npm run alpha:test:prepare
npm run alpha:test:invitation
npm run alpha:test:email
```

### 2. Verify System Status
- [ ] Invitation system test passes database check (after migration)
- [ ] Email system configured (or using ConsoleEmailProvider for testing)
- [ ] API routes accessible

## Alpha Testing Workflow

### Phase 1: Initial Invitation Flow
- [ ] Engineer 1 creates account
- [ ] Engineer 1 creates "Alpha Test Group"
- [ ] Engineer 1 invites Engineer 2
- [ ] Engineer 2 receives invitation email
- [ ] Engineer 2 clicks invitation link
- [ ] Engineer 2 completes registration
- [ ] Engineer 2 accepts invitation
- [ ] Engineer 2 sets permissions for Engineer 1

### Phase 2: Group Management
- [ ] Engineer 1 signs in and verifies group access
- [ ] Engineer 1 sees Engineer 2 as group member
- [ ] Engineer 1 can view Engineer 2's events according to permissions

### Phase 3: Extended Group Invitation
- [ ] Engineer 2 invites Engineer 3 to group
- [ ] Engineer 3 receives invitation email
- [ ] Engineer 3 clicks invitation link
- [ ] Engineer 3 completes registration
- [ ] Engineer 3 accepts invitation
- [ ] Engineer 3 sets permissions

### Phase 4: Event Creation
- [ ] Engineer 3 creates event for the group
- [ ] Event is visible to group members according to permissions
- [ ] All engineers can see the event

## Post-Testing

### 1. Document Results
- [ ] Complete `ALPHA_TEST_RESULTS_TEMPLATE.md`
- [ ] Record any issues encountered
- [ ] Note any feedback or suggestions

### 2. Clean Up Test Data
```bash
npm run alpha:test:cleanup
```

## Troubleshooting

### Common Issues

1. **Database Tables Missing**
   - Solution: Apply migration as described in `INVITATION_SYSTEM_DEPLOYMENT.md`

2. **Email Not Sending**
   - Solution: Configure email service provider or use ConsoleEmailProvider for testing

3. **Permission Issues**
   - Solution: Verify group membership and permission settings

4. **API Errors**
   - Solution: Check Supabase configuration and console logs

### Support Resources

- `ALPHA_TESTING_GUIDE.md` - Detailed testing instructions
- `INVITATION_SYSTEM_DEPLOYMENT.md` - Database migration instructions
- `INVITATION_SYSTEM_SETUP.md` - Email provider configuration
- `ALPHA_TEST_RESULTS_TEMPLATE.md` - Results documentation template

## Success Criteria

The alpha test is successful if:
- [ ] All invitation flows work correctly
- [ ] Users can register through invitation links
- [ ] Group memberships are properly established
- [ ] Privacy permissions are correctly enforced
- [ ] Events are visible according to permission settings
- [ ] All engineers can collaborate effectively within the group

## Next Steps

After successful alpha testing:
1. Review and address any issues documented
2. Plan beta testing with a larger group
3. Prepare for production deployment
4. Set up monitoring and analytics