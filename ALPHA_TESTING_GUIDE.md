# Alpha Testing Guide

This guide walks through the complete workflow for alpha testing the invitation and group functionality of the PolyHarmony Calendar App.

## Overview

We'll be testing with 4 different engineers following this workflow:
1. Engineer 1 invites Engineer 2
2. Engineer 2 accepts and registers
3. Engineer 2 signs in and accepts the invite
4. Engineer 2 sets permissions for Engineer 1
5. Engineer 1 accesses the group to verify
6. Engineer 2 invites Engineer 3
7. Engineer 3 signs up, sets permissions, and creates an event

## Prerequisites

Before starting, ensure:
- The application is deployed to a staging environment
- Email service is configured for sending invitations
- Database is properly initialized with all schema tables
- At least 3 test email accounts are available

## Test Setup

### 1. Create Test Accounts

First, we need to create accounts for our test engineers:

1. Engineer 1: `engineer1@test.com`
2. Engineer 2: `engineer2@test.com`
3. Engineer 3: `engineer3@test.com`
4. Engineer 4: `engineer4@test.com`

### 2. Environment Variables

Ensure these environment variables are set:
```
NEXT_PUBLIC_APP_URL=https://your-staging-domain.com
INVITATION_FROM_EMAIL=invites@yourdomain.com
INVITATION_FROM_NAME="PolyHarmony Test"
```

## Testing Workflow

### Phase 1: Initial Invitation Flow

#### Step 1: Engineer 1 Invites Engineer 2

1. Engineer 1 signs in to the application
2. Engineer 1 navigates to the Groups section
3. Engineer 1 creates a new group called "Alpha Test Group"
4. Engineer 1 invites Engineer 2 by email (`engineer2@test.com`)
5. Engineer 1 should receive confirmation that the invitation was sent
6. Engineer 2 should receive an email invitation

#### Step 2: Engineer 2 Accepts and Registers

1. Engineer 2 clicks the invitation link in the email
2. Engineer 2 is directed to the invitation acceptance page
3. Engineer 2 clicks "Sign Up & Accept"
4. Engineer 2 completes the registration form with:
   - Email: `engineer2@test.com`
   - Password: [secure password]
   - Full name: "Engineer Two"
5. Engineer 2 receives email confirmation and verifies their account
6. Engineer 2 signs in to the application

#### Step 3: Engineer 2 Accepts the Invitation

1. Engineer 2 should be automatically redirected to accept the invitation
2. If not, Engineer 2 can navigate to the Groups section
3. Engineer 2 should see the pending invitation
4. Engineer 2 accepts the invitation
5. Engineer 2 sets their privacy permissions for the group
6. Engineer 2 should now see the group in their dashboard

### Phase 2: Group Management and Permissions

#### Step 4: Engineer 2 Sets Permissions for Engineer 1

1. Engineer 2 navigates to the "Alpha Test Group"
2. Engineer 2 goes to the group members section
3. Engineer 2 finds Engineer 1 in the member list
4. Engineer 2 sets appropriate privacy permissions for Engineer 1:
   - Full Access: Can see all event details
   - Limited Access: Can see that Engineer 2 is busy but with limited details
   - Busy Only: Can only see time blocks
   - Hidden: Cannot see any information
5. Engineer 2 saves the permission settings

#### Step 5: Engineer 1 Verifies Group Access

1. Engineer 1 signs in to the application
2. Engineer 1 navigates to the Groups section
3. Engineer 1 should see "Alpha Test Group" with Engineer 2 as a member
4. Engineer 1 can view Engineer 2's events according to the permissions set
5. Engineer 1 can modify group settings if they have appropriate permissions

### Phase 3: Extended Group Invitation

#### Step 6: Engineer 2 Invites Engineer 3

1. Engineer 2 navigates to the "Alpha Test Group"
2. Engineer 2 goes to the group members section
3. Engineer 2 clicks "Invite Members"
4. Engineer 2 enters Engineer 3's email (`engineer3@test.com`)
5. Engineer 2 adds a personal message (optional)
6. Engineer 2 sends the invitation
7. Engineer 3 should receive an email invitation

#### Step 7: Engineer 3 Registration and Event Creation

1. Engineer 3 clicks the invitation link in the email
2. Engineer 3 is directed to the invitation acceptance page
3. Engineer 3 clicks "Sign Up & Accept"
4. Engineer 3 completes the registration form with:
   - Email: `engineer3@test.com`
   - Password: [secure password]
   - Full name: "Engineer Three"
5. Engineer 3 receives email confirmation and verifies their account
6. Engineer 3 signs in to the application
7. Engineer 3 accepts the group invitation
8. Engineer 3 sets their privacy permissions for the group
9. Engineer 3 navigates to the Calendar section
10. Engineer 3 creates a new event:
    - Title: "Alpha Test Event"
    - Date: 3 days from now
    - Time: 2:00 PM - 3:00 PM
    - Location: "Virtual Meeting Room"
    - Privacy: Set appropriately for group members
    - Associated with the group
11. Engineer 3 saves the event

### Phase 4: Verification

#### Verification by All Engineers

Each engineer should verify they can see:
1. The group and its members
2. Events according to their permission levels
3. Proper notifications and updates

## Troubleshooting

### Common Issues

1. **Invitation Email Not Received**
   - Check spam/junk folders
   - Verify email service configuration
   - Check invitation status in database

2. **Permission Issues**
   - Ensure group membership is confirmed
   - Check privacy settings in group member permissions
   - Verify relationship connections

3. **Event Visibility Problems**
   - Confirm event privacy settings
   - Check group membership permissions
   - Verify event dates and recurrence settings

### Database Queries for Debugging

```sql
-- Check pending invitations
SELECT * FROM invitations WHERE status = 'pending';

-- Check group memberships
SELECT * FROM relationship_group_members WHERE group_id = '[GROUP_ID]';

-- Check group member permissions
SELECT * FROM group_member_permissions WHERE group_id = '[GROUP_ID]';

-- Check events
SELECT * FROM events WHERE owner_id = '[USER_ID]' LIMIT 10;
```

## Success Criteria

The test is successful if:
1. All invitation flows work correctly
2. Users can register through invitation links
3. Group memberships are properly established
4. Privacy permissions are correctly enforced
5. Events are visible according to permission settings
6. All engineers can collaborate effectively within the group

## Additional Testing Scenarios

After completing the main workflow, consider testing these additional scenarios:

1. **Declining Invitations**: Engineer 4 receives an invitation but declines it
2. **Permission Changes**: Engineer 1 changes Engineer 2's permissions after initial setup
3. **Group Removal**: Engineer 1 removes Engineer 2 from the group
4. **Event Sharing**: Engineer 2 shares an event with specific group members only
5. **Recurrence Conflicts**: Engineer 3 creates a recurring event that conflicts with existing events

## Feedback Collection

Collect feedback on:
1. User experience of the invitation flow
2. Clarity of permission settings
3. Performance of group operations
4. Any errors or unexpected behaviors
5. Suggestions for improvement

Document all findings in the test results report.