# Enhanced Database Schema

This document describes the enhanced database schema implemented to support the full feature set outlined in the Project_MVP.md requirements.

## Schema Overview

The enhanced schema extends the base MVP schema with additional tables and fields to support:

1. **Contact Management**: External contacts for invitations and sharing
2. **Enhanced Privacy Controls**: Granular permission settings for events
3. **Event Attachments**: Files associated with events
4. **Event Templates**: Reusable event configurations
5. **Reminders**: Notification system for upcoming events
6. **Time Zone Management**: Proper handling of events across time zones
7. **Recurring Events**: Support for repeating event patterns
8. **Custom Holidays**: User-defined holidays and observances

## New Tables

### 1. User Profiles - ❌ **DOES NOT EXIST**
> **⚠️ CRITICAL**: This table does NOT exist in your actual database!
>
> **All user profile data is stored in the `users` table directly.**

**✅ CORRECT - Single users table contains EVERYTHING:**

```sql
users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'
)
```

### 2. Contacts

Stores external contacts that aren't necessarily app users:

```sql
contacts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,           -- Owner
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  color TEXT
)
```

### 3. Contact Group Members

Maps contacts to relationship groups:

```sql
contact_group_members (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL,          -- FK to relationship_groups
  contact_id UUID NOT NULL,        -- FK to contacts
)
```

### 4. Event Attachments

Stores files associated with events:

```sql
event_attachments (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL,          -- FK to events
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL
)
```

### 5. Event Permissions

Stores granular privacy settings for events:

```sql
event_permissions (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL,          -- FK to events
  relationship_id UUID,            -- FK to relationships (one of the three)
  contact_id UUID,                 -- FK to contacts (one of the three)
  group_id UUID,                   -- FK to relationship_groups (one of the three)
  permission_level TEXT NOT NULL,  -- 'full_access', 'limited_access', 'busy_only', 'hidden'
  custom_title TEXT,               -- For custom display
  custom_description TEXT          -- For custom display
)
```

### 6. Event Templates

Stores reusable event configurations:

```sql
event_templates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL,       -- in minutes
  location TEXT,
  color TEXT,
  privacy_level TEXT,
  relationship_id UUID,
  visible_to_relationships UUID[],
  visible_to_contacts UUID[],
  visible_to_groups UUID[]
)
```

### 7. Reminders

Stores notification reminders for events:

```sql
reminders (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reminder_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,              -- 'notification', 'email', 'sms'
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ
)
```

### 8. Custom Holidays

Stores user-defined holidays:

```sql
custom_holidays (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT TRUE,  -- Occurs yearly
  color TEXT
)
```

## Enhanced Existing Tables

### Events Table

Added new fields:

- `time_zone` - Event time zone
- `is_all_day` - Whether it's an all-day event
- `recurrence_rule` - iCalendar-style recurrence rule
- `recurrence_exception_dates` - Exceptions to recurring events
- `status` - Event status (confirmed, tentative, cancelled)
- `color` - Event color
- `visible_to_contacts` - Contact IDs with access
- `visible_to_groups` - Group IDs with access

### Relationships Table

Added new fields:

- `default_privacy_level` - Default privacy for new events

### Relationship Groups Table

Added new fields:

- `color` - Group color for visual identification

## Migration and Data Integrity

The schema includes:

1. **Safe Migrations**: ALTER TABLE statements that won't affect existing data
2. **Data Migration**: A function to migrate existing visibility settings to the new permission model
3. **Integrity Checks**: Constraints to ensure data validity
4. **Indexing**: Optimized indexes for common query patterns

## TypeScript Types

Enhanced types have been added to `/lib/supabase/enhanced-types.ts` to provide full TypeScript support for the new schema.

## Validation

Comprehensive validation schemas have been added to `/lib/validation/enhanced-schemas.ts` using Zod to ensure data integrity at the application level.

## Deployment

To deploy this schema:

1. Run the migration script:
   ```
   node scripts/deploy-enhanced-schema.js
   ```

2. The script will:
   - Create a backup of the current database
   - Apply the migration
   - Verify that all tables were created successfully

## Next Steps

1. **Update API Endpoints**: Modify existing endpoints to handle the enhanced schema
2. **Create New API Endpoints**: Implement endpoints for new entities (contacts, templates, etc.)
3. **Update UI Components**: Enhance UI to leverage the new data model
