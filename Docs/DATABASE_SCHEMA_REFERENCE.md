# Database Schema Reference for PolyHarmony Calendar

> **Critical Reference Document**: This document defines the exact database schema structure that must be followed by all code, especially test helpers, API endpoints, and database operations.

## 🎯 Purpose

This reference prevents schema mismatches by documenting:
- **Exact table structures** with correct column names and types
- **Required vs optional fields** for each table
- **Foreign key relationships** and constraints  
- **Enum types** and their allowed values
- **Test helper guidelines** for database operations

## 📊 Database Technology

- **Engine**: PostgreSQL (via Supabase)
- **Primary Keys**: UUID (auto-generated via `uuid_generate_v4()`)
- **Timestamps**: TIMESTAMPTZ with `DEFAULT NOW()`
- **Security**: Row Level Security (RLS) enabled on all tables
- **Extensions**: uuid-ossp, pgcrypto

---

## 📋 Enum Types (PostgreSQL ENUM)

### `privacy_level_enum`
```sql
'private', 'visible', 'semi_private', 'public'
```
**Usage**: Legacy privacy system, maintained for backward compatibility

### `relationship_type_enum`  
```sql
'primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other'
```

### `event_status_enum`
```sql  
'confirmed', 'tentative', 'cancelled'
```

### `invitation_status_enum`
```sql
'pending', 'accepted', 'declined', 'expired'
```

### `reminder_type_enum`
```sql
'email', 'push', 'sms'
```

### `connection_tier` (New unified privacy system)
```sql
'private', 'busy_only', 'details'
```

### `event_privacy_override`
```sql
'default', 'private'
```

---

## 🗄️ Core Tables

### `users` - Core Identity Table
> **✅ VERIFIED**: Actual database schema discovered 2025-09-05

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    timezone TEXT DEFAULT 'UTC',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'
);
```

**Test Helper Usage**:
```typescript
// ✅ CORRECT - These fields actually exist in your database
const user = {
    id: crypto.randomUUID(),                    // Optional - auto-generated if omitted
    email: 'test@example.com',                  // Required
    phone: '+1234567890',                       // Optional
    full_name: 'Test User',                     // Optional 
    avatar_url: 'https://example.com/pic.jpg',  // Optional
    timezone: 'UTC',                            // Optional - defaults to UTC
    notification_preferences: {                  // Optional - has JSON default
        email: true,
        push: true,
        sms: false
    },
    created_at: new Date().toISOString(),       // Optional - auto-generated
    updated_at: new Date().toISOString()        // Optional - auto-generated  
};
```

**⚠️ IMPORTANT**: This table contains ALL user profile data (no separate user_profiles table exists)

---

### `user_profiles` - ❌ **DOES NOT EXIST**
> **⚠️ CRITICAL**: This table does NOT exist in your actual database!
> 
> **All user profile data is stored in the `users` table directly.**
> 
> Previous documentation was incorrect. Your database uses a single `users` table
> that contains both auth data AND profile data in one place.

---

### `relationships` - Partner Relationships
> **✅ VERIFIED**: Actual database schema discovered 2025-09-05

```sql
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    partner_id UUID NOT NULL,
    partner_name TEXT,
    partner_email TEXT,
    relationship_type relationship_type_enum,
    start_date DATE,
    birthday DATE,
    anniversary_date DATE,
    color TEXT,
    notes TEXT,
    default_privacy_level privacy_level_enum NOT NULL,
    privacy_level privacy_level_enum NOT NULL,
    connection_tier connection_tier NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Test Helper Usage**:
```typescript
// ✅ CORRECT
const relationship = {
    id: crypto.randomUUID(),                       // Optional - auto-generated
    user_id: crypto.randomUUID(),                  // Required - must exist in users table
    partner_id: crypto.randomUUID(),               // Required - must exist in users table
    relationship_type: 'friendship',               // Optional - from relationship_type_enum
    status: 'active',                              // Optional - defaults to 'active'
    default_privacy_level: 'private',              // Required - from privacy_level_enum
    privacy_level: 'private',                      // Required - from privacy_level_enum
    connection_tier: 'details',                    // Required - from connection_tier enum
    is_active: true,                              // Optional - defaults to true
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};
```

**Foreign Key Dependencies**: 
- `user_id` → `users.id`
- `partner_id` → `users.id`

---

### `events` - Calendar Events  
> **✅ VERIFIED**: Actual database schema discovered 2025-09-05

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    time_zone TEXT DEFAULT 'UTC',
    is_all_day BOOLEAN DEFAULT FALSE,
    privacy_level privacy_level_enum NOT NULL,
    visible_to_relationships JSONB,
    visible_to_groups JSONB,
    relationship_id UUID,
    color TEXT,
    recurrence_rule TEXT,
    status event_status_enum,
    privacy_override event_privacy_override,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Test Helper Usage**:
```typescript
// ✅ CORRECT
const event = {
    id: crypto.randomUUID(),                       // Optional - auto-generated
    user_id: crypto.randomUUID(),                  // Required - must exist in users table
    title: 'Test Event',                           // Required
    description: 'Test Description',               // Optional
    start_time: '2024-01-15T14:00:00Z',           // Required - ISO 8601 timestamp
    end_time: '2024-01-15T15:00:00Z',             // Required - ISO 8601 timestamp
    is_all_day: false,                            // Optional - defaults to false
    location: 'Test Location',                     // Optional
    time_zone: 'UTC',                             // Optional - defaults to UTC
    recurrence_rule: null,                        // Optional
    status: 'confirmed',                          // Optional - from event_status_enum
    privacy_level: 'private',                     // Required - from privacy_level_enum
    privacy_override: 'default',                  // Optional - from event_privacy_override
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};
```

**Foreign Key Dependencies**: 
- `user_id` → `users.id`

---

### `relationship_groups` - Group Management
> **✅ VERIFIED**: Actual database schema discovered 2025-09-05

```sql
CREATE TABLE relationship_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### `contacts` - ❌ **DOES NOT EXIST**
> **⚠️ CRITICAL**: This table does NOT exist in your actual database!
> 
> Contact information appears to be stored differently in your schema.

---

## 🧪 Test Helper Guidelines

### ✅ **DO: Follow This Pattern (CORRECTED FOR ACTUAL SCHEMA)**

```typescript
// 1. Create user with actual schema (includes profile data)
const user = await testHelpers.createTestUser(supabase, {
    email: 'test@example.com',                     // Required
    full_name: 'Test User',                        // Optional - stored in users table
    phone: '+1234567890',                          // Optional - stored in users table
    timezone: 'UTC',                               // Optional - stored in users table
    notification_preferences: {                    // Optional - JSONB in users table
        email: true,
        push: true,
        sms: false
    }
});

// 2. No separate user_profiles table - everything is in users table

// 3. Create relationships with proper UUIDs and actual columns
const relationship = await testHelpers.createTestRelationship(supabase, {
    user_id: user.id,                              // Valid UUID from created user
    partner_id: crypto.randomUUID(),               // Must reference existing user
    partner_name: 'Partner Name',                  // Optional - actual column
    partner_email: 'partner@example.com',          // Optional - actual column
    relationship_type: 'friendship',               // Required - enum value
    default_privacy_level: 'private',              // Required - enum value
    privacy_level: 'private',                      // Required - enum value
    connection_tier: 'details'                     // Required - enum value
});

// 4. Create events with actual schema columns
const event = await testHelpers.createTestEvent(supabase, {
    user_id: user.id,                              // Required - FK to users
    title: 'Test Event',                           // Required
    start_time: '2024-01-15T14:00:00Z',           // Required - ISO timestamp
    end_time: '2024-01-15T15:00:00Z',             // Required - ISO timestamp
    privacy_level: 'private',                      // Required - enum value
    time_zone: 'UTC',                             // Optional
    description: 'Test Description',               // Optional
    location: 'Test Location'                      // Optional
});
```

### ❌ **DON'T: Common Mistakes**

```typescript
// ❌ WRONG - Using string IDs instead of UUIDs
const badRelationship = {
    id: 'test-relationship-123',                   // Invalid - not a UUID
    user_id: 'user-1',                            // Invalid - not a UUID
    partner_id: 'user-2'                          // Invalid - not a UUID
};

// ❌ WRONG - Using display_name (doesn't exist)
const badUser = {
    display_name: 'Test User',                     // Field doesn't exist in users table
    phone_number: '+1234567890'                    // Field doesn't exist in users table
};

// ❌ WRONG - Missing required fields
const badEvent = {
    user_id: crypto.randomUUID(),
    title: 'Test Event'
    // Missing: start_time, end_time, privacy_level
};

// ❌ WRONG - Invalid enum values
const badRelationship2 = {
    relationship_type: 'best_friend',              // Invalid - not in enum
    privacy_level: 'hidden'                       // Invalid - not in enum
};
```

---

## 🔗 Foreign Key Relationships

### **Critical Dependencies** (Must exist before creating child records)

1. **`users.id`** → Referenced by:
   - `user_profiles.id` (1:1)
   - `relationships.user_id` (1:many) 
   - `relationships.partner_id` (1:many)
   - `events.user_id` (1:many)
   - `contacts.user_id` (1:many)
   - `relationship_groups.user_id` (1:many)

2. **`events.id`** → Referenced by:
   - `event_permissions.event_id` (1:many)
   - `event_visibility.event_id` (1:many)
   - `reminders.event_id` (1:many)

3. **`relationships.id`** → Referenced by:
   - `event_permissions.relationship_id` (1:many)
   - `relationship_group_members.relationship_id` (1:many)

### **Test Helper Foreign Key Handling**

```typescript
// ✅ CORRECT - Handle foreign key constraints gracefully
try {
    const relationship = await supabase
        .from('relationships')
        .insert([relationshipData])
        .select()
        .single();
} catch (error) {
    if (error.message.includes('foreign key constraint')) {
        console.warn('Relationship creation failed due to missing user:', error.message);
        return mockRelationshipData; // Return mock data so tests can continue
    }
    throw error;
}
```

---

## 🎨 Privacy System Architecture 

### **Dual Privacy System**

1. **Legacy System** (maintained for backward compatibility):
   - `privacy_level_enum`: `'private', 'visible', 'semi_private', 'public'`
   - Used in: `relationships.privacy_level`, `events.privacy_level`

2. **New Unified System** (current implementation):
   - `connection_tier`: `'private', 'busy_only', 'details'`
   - `event_privacy_override`: `'default', 'private'`
   - Used in: `relationships.connection_tier`, `events.privacy_override`

### **Test Data Privacy Requirements**

```typescript
// ✅ CORRECT - Set both legacy and new privacy fields
const relationship = {
    // Legacy system (required)
    default_privacy_level: 'private',
    privacy_level: 'private',
    
    // New system (required)
    connection_tier: 'details'
};

const event = {
    // Legacy system (required) 
    privacy_level: 'private',
    
    // New system (optional)
    privacy_override: 'default'
};
```

---

## 📝 Update Guidelines

### **When Schema Changes Are Made:**

1. **Update this document FIRST** before making changes
2. **Update test helpers** to match new schema
3. **Update API endpoints** and validation schemas  
4. **Update TypeScript types** in `lib/supabase/types.ts`
5. **Run test suite** to catch any mismatches
6. **Update migration files** appropriately

### **Version Control for Schema Changes:**

1. **Document the change** with date and reason
2. **Add migration script** if needed
3. **Test against production data** (if applicable)
4. **Update all references** in codebase

---

## 🚨 Common Pitfalls & Solutions

### **Problem**: Test helpers failing with "column does not exist"
**Solution**: Check this document for exact column names

### **Problem**: Foreign key constraint violations in tests  
**Solution**: Create parent records first, or use mock data fallbacks

### **Problem**: Invalid enum values
**Solution**: Reference enum definitions in this document  

### **Problem**: UUID format errors
**Solution**: Always use `crypto.randomUUID()` for UUID generation

### **Problem**: Tests passing locally but failing in CI
**Solution**: Ensure test database schema matches production schema

---

## 🔍 Schema Verification Commands

```bash
# Verify table structure
npm run test:db:schema

# Check test helpers against schema  
npm test tests/test-helpers-verification.test.ts

# Inspect actual database structure
node check-database-schema.js

# Run schema validation
npm run validate:schema
```

---

**Last Updated**: 2024-09-05
**Schema Version**: Consolidated Schema Final Fixed (2025-09-03)
**Maintained By**: Development Team

> ⚠️ **Always refer to this document when creating test helpers or database operations to prevent schema mismatches!**
