# PolyHarmony Calendar App - Database Schema Reference

## Overview
This document serves as a reference for the PolyHarmony Calendar App database schema, documenting the tables, relationships, and constraints that define the data model.

## Database Technology
- PostgreSQL (via Supabase)
- Custom enum types for controlled vocabularies
- Row Level Security (RLS) for data protection
- UUID primary keys for all entities
- Timestamps for audit trails

## Enum Types

### Privacy Level Enum
Defines the levels of privacy that can be applied to various entities:
- `private` - Only owner can see full details
- `visible` - Connections can see full details
- `semi_private` - Connections see "busy" status only
- `public` - Public visibility

### Relationship Type Enum
Defines the types of relationships that can be established:
- `primary` - Primary partner
- `secondary` - Secondary partner
- `nesting` - Nesting partner (living together)
- `long_distance` - Long-distance relationship
- `casual` - Casual relationship
- `friendship` - Friendship connection
- `other` - Other type of relationship

### Event Status Enum
Defines the status of events:
- `confirmed` - Event is confirmed
- `tentative` - Event is tentative
- `cancelled` - Event is cancelled

### Invitation Status Enum
Defines the status of invitations:
- `pending` - Invitation is pending acceptance
- `accepted` - Invitation has been accepted
- `declined` - Invitation has been declined
- `expired` - Invitation has expired
- `cancelled` - Invitation has been cancelled

## Core Tables

### Users Table
Stores user account information.

**Columns:**
- `id` (UUID, PK) - Unique user identifier
- `email` (TEXT, UNIQUE) - User's email address
- `phone_number` (TEXT, UNIQUE) - User's phone number
- `full_name` (TEXT) - User's full name
- `display_name` (TEXT) - User's display name
- `avatar_url` (TEXT) - URL to user's avatar image
- `time_zone` (TEXT) - User's default time zone
- `default_privacy_level` (privacy_level_enum) - Default privacy level for new items
- `is_active` (BOOLEAN) - Whether the user account is active
- `subscription_tier` (TEXT) - User's subscription tier (free, premium, enterprise)
- `profile_data` (JSONB) - Additional profile data in JSON format
- `public_key` (TEXT) - User's public encryption key
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Relationships Table
Stores relationship information between users.

**Columns:**
- `id` (UUID, PK) - Unique relationship identifier
- `user_id` (UUID, FK) - User who owns this relationship record
- `partner_id` (UUID, FK) - Partner user (if they have an account)
- `partner_email` (TEXT) - Partner's email (if no account)
- `partner_name` (TEXT) - Partner's name
- `group_id` (UUID, FK) - Group this relationship belongs to
- `relationship_type` (relationship_type_enum) - Type of relationship
- `default_privacy_level` (privacy_level_enum) - Default privacy for events with this relationship
- `start_date` (DATE) - Relationship start date
- `birthday` (DATE) - Partner's birthday
- `anniversary_date` (DATE) - Relationship anniversary date
- `color` (TEXT) - Color for UI representation
- `notes` (TEXT) - Notes about the relationship
- `relationship_details` (JSONB) - Additional relationship details
- `is_active` (BOOLEAN) - Whether the relationship is active
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Events Table
Stores calendar events.

**Columns:**
- `id` (UUID, PK) - Unique event identifier
- `user_id` (UUID, FK) - User who owns this event
- `title` (TEXT) - Event title
- `description` (TEXT) - Event description
- `start_time` (TIMESTAMPTZ) - Event start time
- `end_time` (TIMESTAMPTZ) - Event end time
- `location` (TEXT) - Event location
- `time_zone` (TEXT) - Event time zone
- `is_all_day` (BOOLEAN) - Whether this is an all-day event
- `privacy_level` (privacy_level_enum) - Event privacy level
- `relationship_id` (UUID, FK) - Associated relationship
- `color` (TEXT) - Event color for UI
- `status` (event_status_enum) - Event status
- `recurrence_rule` (TEXT) - Recurrence rule (iCal format)
- `event_data` (JSONB) - Additional event data
- `google_calendar_id` (TEXT) - Google Calendar ID (if synced)
- `google_event_id` (TEXT) - Google Event ID (if synced)
- `caldav_uid` (TEXT) - CalDAV UID (if synced)
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Relationship Groups Table
Stores groups of relationships for organizational purposes.

**Columns:**
- `id` (UUID, PK) - Unique group identifier
- `user_id` (UUID, FK) - User who owns this group
- `group_name` (TEXT) - Group name
- `description` (TEXT) - Group description
- `color` (TEXT) - Group color for UI
- `is_active` (BOOLEAN) - Whether the group is active
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Contacts Table
Stores contact information.

**Columns:**
- `id` (UUID, PK) - Unique contact identifier
- `user_id` (UUID, FK) - User who owns this contact
- `first_name` (TEXT) - Contact's first name
- `last_name` (TEXT) - Contact's last name
- `email` (TEXT) - Contact's email
- `phone_number` (TEXT) - Contact's phone number
- `company` (TEXT) - Contact's company
- `job_title` (TEXT) - Contact's job title
- `avatar_url` (TEXT) - URL to contact's avatar
- `notes` (TEXT) - Notes about the contact
- `is_favorite` (BOOLEAN) - Whether this is a favorite contact
- `contact_data` (JSONB) - Additional contact data
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

## Permission and Sharing Tables

### Event Permissions Table
Stores granular permissions for events.

**Columns:**
- `id` (UUID, PK) - Unique permission identifier
- `event_id` (UUID, FK) - Event this permission applies to
- `relationship_id` (UUID, FK) - Relationship this permission applies to (mutually exclusive with group_id)
- `group_id` (UUID, FK) - Group this permission applies to (mutually exclusive with relationship_id)
- `permission_level` (privacy_level_enum) - Permission level
- `can_see_details` (BOOLEAN) - Whether details can be seen
- `can_see_location` (BOOLEAN) - Whether location can be seen
- `can_see_description` (BOOLEAN) - Whether description can be seen
- `can_edit` (BOOLEAN) - Whether editing is allowed
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

### Calendar Integrations Table
Stores calendar integration information.

**Columns:**
- `id` (UUID, PK) - Unique integration identifier
- `user_id` (UUID, FK) - User this integration belongs to
- `provider` (TEXT) - Calendar provider (google, apple, outlook, caldav)
- `account_email` (TEXT) - Account email for the integration
- `access_token_encrypted` (TEXT) - Encrypted access token
- `refresh_token_encrypted` (TEXT) - Encrypted refresh token
- `token_expires_at` (TIMESTAMPTZ) - Token expiration time
- `calendar_id` (TEXT) - Calendar ID
- `calendar_name` (TEXT) - Calendar name
- `is_active` (BOOLEAN) - Whether integration is active
- `sync_enabled` (BOOLEAN) - Whether sync is enabled
- `last_sync_at` (TIMESTAMPTZ) - Last sync timestamp
- `sync_error` (TEXT) - Sync error message
- `integration_data` (JSONB) - Additional integration data
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Calendar Shares Table
Stores calendar sharing information.

**Columns:**
- `id` (UUID, PK) - Unique share identifier
- `owner_user_id` (UUID, FK) - User who owns the calendar
- `shared_with_user_id` (UUID, FK) - User the calendar is shared with
- `permission_level` (privacy_level_enum) - Permission level for shared calendar
- `can_edit_events` (BOOLEAN) - Whether editing events is allowed
- `share_token` (TEXT) - Share token for access
- `expires_at` (TIMESTAMPTZ) - Share expiration time
- `is_active` (BOOLEAN) - Whether share is active
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

## Invitation System Tables

### Invitations Table
Stores invitation information.

**Columns:**
- `id` (UUID, PK) - Unique invitation identifier
- `sender_id` (UUID, FK) - User who sent the invitation
- `recipient_email` (TEXT) - Recipient's email
- `recipient_phone` (TEXT) - Recipient's phone number
- `invitation_type` (TEXT) - Type of invitation (relationship, group, calendar_share)
- `message` (TEXT) - Invitation message
- `status` (invitation_status_enum) - Invitation status
- `expires_at` (TIMESTAMPTZ) - Expiration time
- `accepted_at` (TIMESTAMPTZ) - Acceptance time
- `declined_at` (TIMESTAMPTZ) - Decline time
- `recipient_user_id` (UUID, FK) - Recipient user (if they have an account)
- `invitation_data` (JSONB) - Additional invitation data
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Invitation Tokens Table
Stores secure tokens for invitation access.

**Columns:**
- `id` (UUID, PK) - Unique token identifier
- `invitation_id` (UUID, FK, UNIQUE) - Associated invitation
- `token_hash` (TEXT, UNIQUE) - Hashed token value
- `expires_at` (TIMESTAMPTZ) - Token expiration time
- `used_at` (TIMESTAMPTZ) - Token usage time
- `used_by_ip` (INET) - IP address that used the token
- `used_by_user_agent` (TEXT) - User agent that used the token
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

## User Preference and Settings Tables

### User Preferences Table
Stores user preference settings.

**Columns:**
- `id` (UUID, PK) - Unique preference identifier
- `user_id` (UUID, FK, UNIQUE) - User these preferences belong to
- `email_notifications` (BOOLEAN) - Whether email notifications are enabled
- `push_notifications` (BOOLEAN) - Whether push notifications are enabled
- `sms_notifications` (BOOLEAN) - Whether SMS notifications are enabled
- `default_event_duration` (INTEGER) - Default event duration in minutes
- `calendar_view_default` (TEXT) - Default calendar view
- `color_scheme` (TEXT) - Color scheme preference
- `language` (TEXT) - Language preference
- `notification_settings` (JSONB) - Detailed notification settings
- `privacy_settings` (JSONB) - Detailed privacy settings
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Contact Tags Table
Stores tags for organizing contacts.

**Columns:**
- `id` (UUID, PK) - Unique tag identifier
- `user_id` (UUID, FK) - User who owns this tag
- `name` (TEXT) - Tag name
- `color` (TEXT) - Tag color for UI
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

### Contact Tag Relationships Table
Stores many-to-many relationships between contacts and tags.

**Columns:**
- `id` (UUID, PK) - Unique relationship identifier
- `contact_id` (UUID, FK) - Contact
- `tag_id` (UUID, FK) - Tag
- `created_at` (TIMESTAMPTZ) - Record creation timestamp

## Notification and Reminder Tables

### Reminders Table
Stores event reminders.

**Columns:**
- `id` (UUID, PK) - Unique reminder identifier
- `event_id` (UUID, FK) - Event this reminder is for
- `user_id` (UUID, FK) - User this reminder is for
- `reminder_time` (TIMESTAMPTZ) - Time to send reminder
- `reminder_type` (TEXT) - Type of reminder (notification, email, sms)
- `is_sent` (BOOLEAN) - Whether reminder has been sent
- `sent_at` (TIMESTAMPTZ) - Time reminder was sent
- `reminder_data` (JSONB) - Additional reminder data
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Record last update timestamp

## Audit and Security Tables

### Permission Audit Logs Table
Stores audit logs for permission changes.

**Columns:**
- `id` (UUID, PK) - Unique log identifier
- `user_id` (UUID) - User who made the change
- `action_type` (TEXT) - Type of action (update, grant, revoke)
- `resource_type` (TEXT) - Type of resource (relationship, group, event)
- `resource_id` (UUID) - Resource identifier
- `previous_level` (TEXT) - Previous permission level
- `new_level` (TEXT) - New permission level
- `target_id` (UUID) - Target of the permission (user or group)
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `ip_address` (TEXT) - IP address of the request
- `user_agent` (TEXT) - User agent of the request

## Key Relationships

### User Relationships
- Users → Relationships (one-to-many)
- Users → Events (one-to-many)
- Users → Contacts (one-to-many)
- Users → Relationship Groups (one-to-many)
- Users → Invitations (one-to-many, as sender)
- Users → Calendar Integrations (one-to-many)
- Users → Calendar Shares (one-to-many, as owner)
- Users → User Preferences (one-to-one)
- Users → Contact Tags (one-to-many)
- Users → Reminders (one-to-many)

### Relationship Relationships
- Relationships → Events (one-to-many)
- Relationships → Relationship Groups (many-to-one)
- Relationships → Event Permissions (one-to-many)
- Relationships → Contact Tag Relationships (one-to-many)

### Event Relationships
- Events → Relationships (many-to-one)
- Events → Event Permissions (one-to-many)
- Events → Reminders (one-to-many)

### Group Relationships
- Relationship Groups → Relationships (one-to-many)
- Relationship Groups → Event Permissions (one-to-many)

### Contact Relationships
- Contacts → Contact Tag Relationships (one-to-many)

### Invitation Relationships
- Invitations → Invitation Tokens (one-to-one)
- Invitations → Users (many-to-one, as recipient)

## Indexes for Performance

### Core Indexes
- `idx_events_user_time` - Events by user and time for calendar queries
- `idx_relationships_user_active` - Active relationships by user
- `idx_contacts_user_name` - Contacts by user and name
- `idx_contact_tags_user_name` - Contact tags by user and name

### Permission Indexes
- `idx_event_permissions_event_id` - Event permissions by event
- `idx_event_permissions_relationship_id` - Event permissions by relationship
- `idx_event_permissions_group_id` - Event permissions by group

### Invitation Indexes
- `idx_invitations_sender` - Invitations by sender
- `idx_invitations_recipient` - Invitations by recipient
- `idx_invitation_tokens_hash` - Invitation tokens by hash

## Row Level Security Policies

### Users Table
- Users can only view their own profile

### Relationships Table
- Users can manage their own relationships

### Events Table
- Users can manage their own events
- Users can view events with appropriate permissions

### Relationship Groups Table
- Users can manage their own groups

### Contacts Table
- Users can manage their own contacts

### Event Permissions Table
- Users can manage permissions for their own events

### Invitations Table
- Users can manage invitations they sent
- Users can view invitations sent to them

### Calendar Integrations Table
- Users can manage their own integrations

### Calendar Shares Table
- Users can manage shares they created
- Users can view calendars shared with them

### User Preferences Table
- Users can manage their own preferences

### Contact Tags Table
- Users can manage their own tags

### Contact Tag Relationships Table
- Users can manage relationships for their contacts

### Reminders Table
- Users can manage their own reminders

### Permission Audit Logs Table
- Users can only view their own audit logs

## Functions and Triggers

### get_effective_permission_level
Calculates the effective permission level for a user on an event, considering direct permissions, group permissions, and conflict resolution strategies.

### log_permission_change
Trigger function that logs permission changes to the audit log table.

### update_updated_at_column
Generic trigger function that updates the `updated_at` timestamp on record updates.

## Migration History

### Key Migrations
- `20250828130000_fix_schema_inconsistencies.sql` - Latest schema fixes and enhancements
- `30000000000000_phase3_enhancements/migration.sql` - Phase 3 feature enhancements

## Data Integrity Constraints

### Check Constraints
- Events: `end_time >= start_time`
- Contacts: Must have either name or contact information
- Contact Tags: Name must be between 1-100 characters
- Relationship Groups: Name must be between 1-100 characters
- Invitations: Must have either email or phone number
- Reminders: `reminder_time >= created_at`

### Foreign Key Constraints
- All foreign keys have appropriate ON DELETE behaviors (CASCADE, SET NULL)
- Referential integrity maintained across all related tables

## Security Considerations

### Encryption
- Access tokens stored encrypted
- Refresh tokens stored encrypted
- End-to-end encryption for sensitive data

### Access Control
- Row Level Security policies on all tables
- Granular permission controls
- Audit logging for permission changes

### Data Validation
- Enum types for controlled vocabularies
- Check constraints for data integrity
- JSONB fields for flexible but structured data

---

*Last Updated: August 29, 2025*
*Repository Inspector: Database Schema Reference v1.0*