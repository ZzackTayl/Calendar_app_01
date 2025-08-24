# Invitation System Deployment

This document provides instructions for deploying the invitation system to your Supabase database.

## Prerequisites

1. Access to your Supabase project dashboard
2. Supabase project URL and service role key (found in .env.local)

## Deployment Steps

### Option 1: Apply Full Migration (Recommended)

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `supabase/migrations/20250824000001_invitation_system.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration

### Option 2: Apply Individual Table Creations

If the full migration is too large, you can apply the tables individually:

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Execute the following SQL statements in order:

```sql
-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'cancelled'
);

-- Create invitation type enum
CREATE TYPE invitation_type AS ENUM (
    'friend_request',
    'group_invitation',
    'relationship_invitation'
);

-- Create connection setup status enum
CREATE TYPE connection_setup_status AS ENUM (
    'pending',
    'completed',
    'skipped'
);

-- Create group invitation status enum
CREATE TYPE group_invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'cancelled'
);

-- Create group member role enum
CREATE TYPE group_member_role AS ENUM (
    'creator',
    'admin',
    'member'
);
```

Then create each table individually, starting with the ones that don't have foreign key dependencies.

## Verification

After applying the migration, verify that the tables were created:

1. In the Supabase dashboard, go to Table Editor
2. You should see the following new tables:
   - `invitations`
   - `invitation_tokens`
   - `group_invitations`
   - `group_invitation_tokens`
   - `connection_setups`
   - `group_members`
   - `group_member_permissions`
   - `invitation_notification_preferences`

3. Run the invitation system test:
   ```bash
   npm run alpha:test:invitation
   ```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Ensure you're using the service role key, not the anon key
   - Check that your Supabase project has the necessary permissions

2. **Duplicate Object Errors**
   - These are usually harmless and indicate the objects already exist
   - The migration includes `IF NOT EXISTS` clauses to handle this

3. **Foreign Key Constraint Errors**
   - Make sure you're creating tables in the correct order
   - Tables with foreign key references should be created after their dependencies

### Manual Verification Queries

You can run these queries in the Supabase SQL Editor to verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'invitations',
    'invitation_tokens',
    'group_invitations',
    'group_invitation_tokens',
    'connection_setups',
    'group_members',
    'group_member_permissions',
    'invitation_notification_preferences'
);
```

## Post-Deployment Steps

1. Update your environment variables if needed:
   ```
   INVITATION_FROM_EMAIL=invites@yourdomain.com
   INVITATION_FROM_NAME="Your App Name"
   ```

2. Configure your email service provider (SendGrid, Resend, AWS SES, etc.)

3. Test the invitation system:
   ```bash
   npm run alpha:test:invitation
   ```

4. Proceed with alpha testing as outlined in ALPHA_TESTING_GUIDE.md