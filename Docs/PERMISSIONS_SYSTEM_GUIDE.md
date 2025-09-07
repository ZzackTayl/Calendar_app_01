# PolyHarmony Calendar Permissions System Guide

> **Document Created**: 2025-09-07  
> **Author**: Lead Developer & DB Specialist Analysis  
> **Purpose**: Document the permissions enforcement system with certainty levels

## Overview

The PolyHarmony Calendar uses a sophisticated dual-layer permission system that combines base privacy levels with explicit permission overrides. This document maps out how permissions are enforced across the system.

## Certainty Level Key
- 🟢 **HIGH (90-100%)**: Confirmed by code analysis and database schema
- 🟡 **MEDIUM (70-89%)**: Strong evidence from patterns and partial code
- 🔴 **LOW (<70%)**: Inferred from naming/structure, needs verification

---

## Core Permission Architecture

### 1. Base Privacy System 🟢 HIGH CERTAINTY

The foundation uses two privacy systems running in parallel:

#### Legacy Privacy System (Maintained for Backward Compatibility)
**Table**: `events.privacy_level`, `relationships.privacy_level`  
**Enum Values**: `'private'`, `'visible'`, `'semi_private'`, `'public'`  
**Certainty**: 🟢 HIGH - Found in schema and migration files

#### New Unified Privacy System  
**Tables**: `relationships.connection_tier`, `events.privacy_override`  
**Connection Tiers**: `'private'`, `'busy_only'`, `'details'`  
**Privacy Override**: `'default'`, `'private'`  
**Certainty**: 🟢 HIGH - Active in current codebase

---

## Permission Tables

### 2. Event Permissions Table 🟢 HIGH CERTAINTY

**Table Name**: `event_permissions`  
**Purpose**: Granular control over who can access specific events

```sql
CREATE TABLE event_permissions (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,           -- Which event
    relationship_id UUID,             -- Specific partner access
    contact_id UUID,                  -- Specific contact access
    group_id UUID,                    -- Group-based access
    permission_level TEXT NOT NULL,   -- Level of access granted
    custom_title TEXT,                -- Override event title for this viewer
    custom_description TEXT,          -- Override description for this viewer
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

**How It Works**:
- When an event is marked as `private`, entries are added here to grant access
- `permission_level: 'private_override'` allows viewing private events
- Can specify custom title/description per viewer (privacy feature)
- One of `relationship_id`, `contact_id`, or `group_id` must be set

**Connected To**:
- `events` table via `event_id`
- `relationships` table via `relationship_id`
- `contacts` table via `contact_id`
- `relationship_groups` table via `group_id`

---

### 3. Event Visibility Table 🟡 MEDIUM CERTAINTY

**Table Name**: `event_visibility`  
**Purpose**: Controls visibility levels for events (likely determines HOW MUCH is visible)

```sql
CREATE TABLE event_visibility (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    relationship_id UUID,
    contact_id UUID,
    group_id UUID,
    visibility_level TEXT NOT NULL,   -- What level of detail is visible
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

**How It Likely Works**:
- Appears to work in conjunction with `event_permissions`
- While `event_permissions` grants access, this controls detail level
- May override the default `connection_tier` visibility rules
- Not actively used in the API code analyzed (might be future feature)

**Certainty Note**: 🟡 Table exists but usage pattern unclear from current code

---

### 4. Relationship Groups 🟢 HIGH CERTAINTY

**Table Name**: `relationship_groups`  
**Purpose**: Bundle multiple relationships for easier permission management

```sql
CREATE TABLE relationship_groups (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,              -- e.g., "Close Family", "Friends"
    description TEXT,
    user_id UUID NOT NULL,           -- Owner of the group
    color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

**Connected Via**: `relationship_group_members` table links relationships to groups

---

## Permission Enforcement Flow 🟢 HIGH CERTAINTY

Based on code analysis from `/app/api/events/[id]/route.ts`:

### 1. Event Creation/Update Flow

```typescript
// When setting event to private:
if (privacy_level === 'private') {
    // Clear existing permissions
    DELETE FROM event_permissions WHERE event_id = ?
    
    // Add explicit permissions for selected relationships/groups
    INSERT INTO event_permissions (
        event_id,
        relationship_id/group_id,
        permission_level: 'private_override'
    )
}
// When setting to non-private (busy_only/details):
else {
    // Clear all explicit permissions
    DELETE FROM event_permissions WHERE event_id = ?
    // Rely on connection_tier for access control
}
```

### 2. Event Viewing Flow 🟡 MEDIUM CERTAINTY

**Inferred Logic** (needs verification):

```sql
-- Step 1: Can user see the event at all?
IF event.user_id = viewer.id THEN
    -- Owner always sees their own events
    RETURN full_access
    
ELSEIF event.privacy_level = 'private' THEN
    -- Check explicit permissions
    IF EXISTS(SELECT 1 FROM event_permissions 
              WHERE event_id = ? AND 
              (relationship_id IN (viewer's relationships) OR
               group_id IN (viewer's groups))) THEN
        RETURN granted_access
    ELSE
        RETURN no_access
    END IF
    
ELSE
    -- Check connection tier from relationships
    SELECT connection_tier FROM relationships 
    WHERE (user_id = event.owner AND partner_id = viewer) 
       OR (partner_id = event.owner AND user_id = viewer)
    
    IF connection_tier = 'details' THEN
        RETURN full_details
    ELSEIF connection_tier = 'busy_only' THEN
        RETURN busy_status_only
    ELSE
        RETURN no_access
    END IF
END IF
```

---

## Row Level Security (RLS) Implementation 🟢 HIGH CERTAINTY

From `/docs/RLS_IMPLEMENTATION_GUIDE.md`:

### Helper Functions
- `can_view_user_calendar(viewer_id, calendar_owner_id)` - Determines calendar access
- `can_view_event_details(event_id, viewer_id)` - Controls event detail visibility

### Key RLS Policies

**Events Table RLS**:
```sql
-- Users see their own events
auth.uid() = user_id

-- OR events shared via relationships/permissions
OR can_view_event_details(events.id, auth.uid())
```

---

## Permission Hierarchy 🟢 HIGH CERTAINTY

1. **Event Owner**: Always full access to their own events
2. **Private Events**: Only visible to owner + explicit permissions in `event_permissions`
3. **Non-Private Events**: Visibility based on `connection_tier`:
   - `details`: Full event information
   - `busy_only`: Only time blocks, no details
   - `private`: No access to calendar
4. **Group Permissions**: Inherit from group membership
5. **Manual Overrides**: `event_permissions` entries override default rules

---

## Data Flow Relationships

### Primary Permission Paths 🟢 HIGH CERTAINTY

```
User → Creates Event
     → Sets privacy_level/privacy_override
     → IF private: Creates event_permissions entries
     → ELSE: Relies on relationships.connection_tier

Viewer → Requests Event
       → Check if owner
       → Check event_permissions (if private)
       → Check relationships.connection_tier (if not private)
       → Return appropriate detail level
```

### Table Relationships 🟢 HIGH CERTAINTY

```
users
  ├── relationships (user_id, partner_id)
  │   └── connection_tier determines default access
  ├── events (user_id)
  │   ├── privacy_level/privacy_override
  │   ├── event_permissions
  │   └── event_visibility
  └── relationship_groups (user_id)
      └── relationship_group_members
          └── Links to relationships
```

---

## Uncertainty Areas & Investigation Needed

### 1. Event Visibility Table Usage 🔴 LOW CERTAINTY
- Table exists but no clear usage in current API code
- May be for future features or UI-level filtering
- **Action**: Search for `event_visibility` usage in frontend code

### 2. Contact-Based Permissions 🟡 MEDIUM CERTAINTY  
- `event_permissions.contact_id` exists but contact management unclear
- How do contacts differ from relationships?
- **Action**: Investigate contact system implementation

### 3. Permission Level Values 🟡 MEDIUM CERTAINTY
- Only found `'private_override'` in code
- What other `permission_level` values exist?
- **Action**: Check for enum definitions or validation schemas

### 4. Custom Title/Description Usage 🔴 LOW CERTAINTY
- Fields exist in `event_permissions` but not used in API
- Privacy feature for showing different content to different viewers?
- **Action**: Search frontend for custom field usage

---

## Best Practices for Permission Checks

### Backend (Verified) 🟢 HIGH CERTAINTY
1. Always check `user_id = auth.uid()` first (owner access)
2. For private events, query `event_permissions` table
3. For non-private, use relationship `connection_tier`
4. Use RLS policies as baseline security

### Frontend (Inferred) 🟡 MEDIUM CERTAINTY
1. Pre-filter events based on permissions before display
2. Show different UI elements based on `connection_tier`
3. Handle `busy_only` by hiding event details
4. Respect custom titles/descriptions if provided

---

## Security Considerations 🟢 HIGH CERTAINTY

1. **Bidirectional Relationships**: Both users in a relationship can modify it
2. **Cascade Deletes**: Deleting events removes all permissions
3. **Group Permissions**: Removing user from group revokes access
4. **Privacy Override**: Explicitly marking event private overrides all connection tiers
5. **Audit Logging**: `permission_audit_logs` table tracks changes

---

## Recommended Next Steps

1. **Verify Event Visibility Table**: Understand its role in the system
2. **Document Permission Levels**: Create enum or constants for all valid values
3. **Test Permission Scenarios**: Create test cases for each permission path
4. **Frontend Integration**: Document how UI respects these permissions
5. **Performance Optimization**: Index foreign keys in permission tables

---

## Appendix: Quick Reference

### Check User's Access to Event
```sql
-- Simplified permission check
SELECT 
    CASE 
        WHEN e.user_id = :viewer_id THEN 'owner'
        WHEN e.privacy_level = 'private' AND ep.id IS NOT NULL THEN 'granted'
        WHEN r.connection_tier = 'details' THEN 'full'
        WHEN r.connection_tier = 'busy_only' THEN 'busy'
        ELSE 'none'
    END as access_level
FROM events e
LEFT JOIN event_permissions ep ON e.id = ep.event_id 
    AND (ep.relationship_id IN (SELECT id FROM relationships WHERE partner_id = :viewer_id)
         OR ep.group_id IN (SELECT group_id FROM relationship_group_members rgm 
                           JOIN relationships r ON rgm.relationship_id = r.id 
                           WHERE r.partner_id = :viewer_id))
LEFT JOIN relationships r ON (r.user_id = e.user_id AND r.partner_id = :viewer_id)
                          OR (r.partner_id = e.user_id AND r.user_id = :viewer_id)
WHERE e.id = :event_id;
```

This query demonstrates the permission check hierarchy in practice.
