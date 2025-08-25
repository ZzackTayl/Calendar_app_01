# Onboarding Backend Implementation

This document describes the comprehensive backend implementation for the onboarding flow data collection and user profile completion system in the PolyHarmony application.

## Overview

The onboarding backend provides secure, compliant, and comprehensive data collection during the user onboarding process, including:

- User preference collection and storage
- Profile completion tracking
- Calendar integration setup
- Beta testing consent management
- Email preference configuration
- Privacy-compliant analytics tracking

## Database Schema

### Core Tables

#### `user_onboarding`
Stores primary onboarding data and completion status.

```sql
CREATE TABLE user_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    onboarding_step INTEGER DEFAULT 0,
    relationship_style TEXT, -- 'polyamorous', 'relationship_anarchy', 'swinging', 'other'
    custom_relationship_style TEXT,
    primary_use_case TEXT, -- 'schedule_coordination', 'privacy_management', 'communication', 'all'
    default_privacy_preference TEXT DEFAULT 'limited_access',
    allow_partner_calendar_sync BOOLEAN DEFAULT FALSE,
    email_notifications_onboarding BOOLEAN DEFAULT TRUE,
    calendar_reminders_onboarding BOOLEAN DEFAULT TRUE,
    partner_request_notifications BOOLEAN DEFAULT TRUE,
    beta_testing_consent BOOLEAN DEFAULT FALSE,
    beta_feedback_consent BOOLEAN DEFAULT FALSE,
    anonymous_usage_analytics BOOLEAN DEFAULT FALSE,
    wants_google_calendar_sync BOOLEAN DEFAULT FALSE,
    wants_apple_calendar_sync BOOLEAN DEFAULT FALSE,
    wants_outlook_calendar_sync BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_email_preferences`
Detailed email notification preferences.

```sql
CREATE TABLE user_email_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    welcome_emails BOOLEAN DEFAULT TRUE,
    event_reminders BOOLEAN DEFAULT TRUE,
    partner_requests BOOLEAN DEFAULT TRUE,
    schedule_conflicts BOOLEAN DEFAULT TRUE,
    app_updates BOOLEAN DEFAULT TRUE,
    product_updates BOOLEAN DEFAULT FALSE,
    feature_announcements BOOLEAN DEFAULT FALSE,
    community_updates BOOLEAN DEFAULT FALSE,
    research_participation BOOLEAN DEFAULT FALSE,
    reminder_frequency TEXT DEFAULT 'daily',
    digest_frequency TEXT DEFAULT 'weekly',
    email_delivery_time TIME DEFAULT '09:00:00',
    timezone_for_emails TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `calendar_integration_setup`
OAuth setup preferences and status tracking.

```sql
CREATE TABLE calendar_integration_setup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    google_calendar_requested BOOLEAN DEFAULT FALSE,
    google_calendar_setup_completed BOOLEAN DEFAULT FALSE,
    google_calendar_setup_completed_at TIMESTAMPTZ,
    apple_calendar_requested BOOLEAN DEFAULT FALSE,
    apple_calendar_setup_completed BOOLEAN DEFAULT FALSE,
    apple_calendar_setup_completed_at TIMESTAMPTZ,
    outlook_calendar_requested BOOLEAN DEFAULT FALSE,
    outlook_calendar_setup_completed BOOLEAN DEFAULT FALSE,
    outlook_calendar_setup_completed_at TIMESTAMPTZ,
    setup_status TEXT DEFAULT 'pending',
    setup_error_message TEXT,
    setup_retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `beta_testing_consent`
Comprehensive beta testing consent and contact preferences.

```sql
CREATE TABLE beta_testing_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    general_beta_consent BOOLEAN DEFAULT FALSE,
    crash_reporting_consent BOOLEAN DEFAULT FALSE,
    feature_usage_tracking BOOLEAN DEFAULT FALSE,
    feedback_surveys_consent BOOLEAN DEFAULT FALSE,
    user_interviews_consent BOOLEAN DEFAULT FALSE,
    contact_email TEXT,
    contact_phone TEXT,
    preferred_contact_method TEXT DEFAULT 'email',
    available_weekdays BOOLEAN DEFAULT TRUE,
    available_weekends BOOLEAN DEFAULT FALSE,
    available_evenings BOOLEAN DEFAULT TRUE,
    timezone_for_contact TEXT DEFAULT 'UTC',
    consented_at TIMESTAMPTZ DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `onboarding_analytics`
Privacy-compliant analytics for onboarding flow improvement.

```sql
CREATE TABLE onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    step_name TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    time_spent_seconds INTEGER,
    action_taken TEXT, -- 'completed', 'skipped', 'abandoned', 'error'
    error_message TEXT,
    user_agent TEXT,
    ip_address INET,
    variant_id TEXT, -- For A/B testing
    cohort_id TEXT, -- For cohort analysis
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enhanced User Profiles

The existing `user_profiles` table has been enhanced with onboarding-specific fields:

```sql
ALTER TABLE user_profiles 
ADD COLUMN preferred_pronouns TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN relationship_preferences JSONB,
ADD COLUMN calendar_color_scheme TEXT DEFAULT 'default',
ADD COLUMN onboarding_source TEXT,
ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN newsletter_consent BOOLEAN DEFAULT FALSE;
```

## API Endpoints

### 1. Onboarding Data Management

#### `GET /api/onboarding`
Retrieve current onboarding status and data.

**Response:**
```json
{
  "success": true,
  "data": {
    "completion_status": {
      "onboarding_completed": false,
      "onboarding_step": 2,
      "missing_steps": ["relationship_style", "primary_use_case"]
    },
    "onboarding_data": { /* UserOnboarding object */ },
    "profile_data": { /* EnhancedUserProfile object */ },
    "email_preferences": { /* UserEmailPreferences object */ },
    "calendar_setup": { /* CalendarIntegrationSetup object */ },
    "beta_consent": { /* BetaTestingConsent object */ }
  }
}
```

#### `POST /api/onboarding`
Submit onboarding data (partial updates supported).

**Request:**
```json
{
  "onboarding_data": {
    "onboarding_step": 3,
    "relationship_style": "polyamorous",
    "primary_use_case": "schedule_coordination",
    "wants_google_calendar_sync": true
  },
  "profile_data": {
    "preferred_pronouns": "they/them",
    "bio": "Polyamorous individual focused on ethical non-monogamy"
  },
  "email_preferences": {
    "reminder_frequency": "daily",
    "digest_frequency": "weekly"
  },
  "step_name": "preferences_setup",
  "step_number": 3,
  "time_spent": 45
}
```

#### `PATCH /api/onboarding`
Update specific onboarding fields.

**Request:**
```json
{
  "field": "relationship_style",
  "value": "relationship_anarchy",
  "step_name": "relationship_setup",
  "step_number": 2
}
```

### 2. Onboarding Completion

#### `POST /api/onboarding/complete`
Mark onboarding as completed.

**Request:**
```json
{
  "force_complete": false,
  "skip_validation": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "data": { /* Updated onboarding record */ },
  "next_steps": {
    "calendar_integration": true,
    "dashboard_redirect": true
  }
}
```

#### `GET /api/onboarding/complete`
Check if onboarding can be completed.

**Response:**
```json
{
  "success": true,
  "data": {
    "can_complete": false,
    "is_completed": false,
    "current_step": 2,
    "missing_steps": ["relationship_style", "primary_use_case"],
    "completion_requirements": {
      "relationship_style": "Required",
      "primary_use_case": "Required",
      "custom_relationship_style": "Required if relationship_style is 'other'"
    }
  }
}
```

### 3. Calendar Integration Setup

#### `POST /api/calendar/oauth/setup`
Initialize OAuth setup for calendar integration.

**Request:**
```json
{
  "provider": "google",
  "action": "initialize",
  "redirect_uri": "https://app.polyharmony.com/oauth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google calendar integration initialized",
  "oauth_url": "https://accounts.google.com/o/oauth2/auth?...",
  "provider": "google",
  "callback_url": "https://app.polyharmony.com/oauth/callback",
  "expires_in": 300
}
```

#### `GET /api/calendar/oauth/setup`
Get calendar integration setup status.

**Response:**
```json
{
  "success": true,
  "data": {
    "setup_status": { /* CalendarIntegrationSetup object */ },
    "available_providers": ["google", "apple", "outlook"],
    "provider_capabilities": {
      "google": {
        "name": "Google Calendar",
        "supports_read": true,
        "supports_write": true,
        "supports_sync": true
      }
    }
  }
}
```

#### `DELETE /api/calendar/oauth/setup?provider=google`
Remove calendar integration setup.

## Database Helper Functions

### `create_default_onboarding_record(user_id UUID)`
Creates default onboarding records for new users.

```sql
SELECT create_default_onboarding_record('123e4567-e89b-12d3-a456-426614174000');
```

### `get_onboarding_completion_status(user_id UUID)`
Returns completion status and missing steps.

```sql
SELECT * FROM get_onboarding_completion_status('123e4567-e89b-12d3-a456-426614174000');
```

## Validation and Security

### Input Validation
- All API endpoints use Zod schemas for comprehensive input validation
- Custom validation rules for conditional requirements (e.g., custom relationship style when "other" is selected)
- Sanitization of user input to prevent injection attacks

### Privacy and Compliance
- GDPR-compliant data handling with explicit consent tracking
- HIPAA-aware data anonymization for analytics
- Audit trails for all data modifications
- Secure storage of sensitive preference data

### Authentication and Authorization
- All endpoints require authenticated users
- User data isolation (users can only access their own data)
- Rate limiting on sensitive endpoints
- Input validation to prevent data manipulation

## Analytics and Monitoring

### Onboarding Flow Analytics
- Step completion tracking with timing data
- Error tracking for debugging and improvement
- A/B testing support with variant and cohort tracking
- Privacy-compliant IP and user agent logging

### Performance Monitoring
- Database query optimization with proper indexing
- Connection pooling for scalability
- Async operations for better performance
- Background processing for analytics data

## Integration Points

### Frontend Coordination
- Comprehensive TypeScript types for frontend integration
- Real-time validation feedback
- Progressive data collection support
- Step-by-step completion tracking

### Email System Integration
- Integration with existing invitation email system
- Consent-based email preference enforcement
- Timezone-aware email delivery
- Template-based welcome and confirmation emails

### Calendar Integration Preparation
- OAuth flow initialization for Google, Apple, and Outlook
- Token storage preparation in existing schema
- Error handling and retry logic for failed setups
- Integration status tracking and reporting

## Environment Configuration

Required environment variables:

```env
# OAuth Provider Configuration
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
APPLE_CALENDAR_CLIENT_ID=your_apple_client_id
OUTLOOK_CALENDAR_CLIENT_ID=your_outlook_client_id

# Database Configuration (existing)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage Examples

### 1. Complete Onboarding Flow

```typescript
// Initialize onboarding data
const response = await fetch('/api/onboarding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    onboarding_data: {
      relationship_style: 'polyamorous',
      primary_use_case: 'all',
      wants_google_calendar_sync: true,
      beta_testing_consent: true
    },
    profile_data: {
      preferred_pronouns: 'they/them',
      calendar_color_scheme: 'default'
    },
    email_preferences: {
      reminder_frequency: 'daily',
      product_updates: true
    },
    beta_consent: {
      general_beta_consent: true,
      contact_email: 'user@example.com',
      preferred_contact_method: 'email'
    }
  })
});

// Complete onboarding
const completion = await fetch('/api/onboarding/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ force_complete: false })
});
```

### 2. Calendar Integration Setup

```typescript
// Initialize Google Calendar integration
const oauthSetup = await fetch('/api/calendar/oauth/setup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    action: 'initialize'
  })
});

const { oauth_url } = await oauthSetup.json();
window.location.href = oauth_url; // Redirect to OAuth flow
```

## Migration Instructions

1. **Run the migration:**
   ```bash
   supabase migration up --file 20250825000001_onboarding_data_collection.sql
   ```

2. **Update environment variables** with OAuth provider credentials

3. **Test the API endpoints** using the provided examples

4. **Update frontend** to use the new onboarding types and validation schemas

## Future Enhancements

1. **Advanced Analytics**
   - Funnel analysis for onboarding completion rates
   - Cohort analysis for user retention
   - A/B testing framework integration

2. **Enhanced Privacy Controls**
   - Granular consent management
   - Data export functionality
   - Automated data retention policies

3. **Calendar Integration Expansion**
   - CalDAV support for generic calendar systems
   - Bidirectional sync capabilities
   - Custom calendar provider support

4. **Mobile Optimization**
   - Mobile-specific onboarding flows
   - Push notification consent management
   - Device-specific preference storage

This implementation provides a solid foundation for collecting comprehensive onboarding data while maintaining privacy compliance and security best practices.