# Firestore Security Rules Documentation

This document explains the security model and access control patterns implemented in `firestore.rules` to protect user data and prevent unauthorized access.

---

## 🔒 Security Principles

### 1. **Zero Trust by Default**
All paths are **denied by default** unless explicitly allowed. The final rule in the file denies all access to undeclared paths.

### 2. **User Data Isolation**
Users can only access their own data. The `request.auth.uid` is strictly validated against document ownership fields (`owner_uid`, `user_id`, etc.).

### 3. **Shared Resource Access**
Resources can be explicitly shared with specific users through:
- `shared_with` arrays
- `invited_partner_ids` arrays
- Explicit permission fields

### 4. **Owner Immutability**
Once set, the `owner_uid` field **cannot be changed** through client writes. This prevents ownership takeover attacks.

### 5. **Admin Override**
System administrators with custom claims can perform operations for support and debugging.

---

## 📁 Collection Structure & Access Patterns

### Users Collection: `users/{userId}`

**Purpose:** Store user profiles, settings, and private data

**Access Rules:**
- ✅ **Read:** User can read their own profile OR is admin
- ✅ **Create:** User can create their own profile (must match `userId`)
- ✅ **Update:** User can update their own profile (cannot change ownership)
- ✅ **Delete:** User can delete their own profile OR is admin

**Data Validation:**
- Must have `email` field
- Email must be a string

**Example:**
```javascript
// ✅ ALLOWED: User reads their own profile
get /users/abc123 (where auth.uid = abc123)

// ❌ DENIED: User tries to read another user's profile
get /users/xyz789 (where auth.uid = abc123)
```

#### User Subcollections

All subcollections under `users/{userId}` are **private to the user**:

| Subcollection | Purpose | Access |
|--------------|---------|---------|
| `settings/` | User preferences | User only |
| `preferences/` | App configuration | User only |
| `notifications/` | User notifications | User read/write, Admin create |
| `reminders/` | Event reminders | User only |
| `contacts/` | Contact list | User only |
| `sms_conversations/` | SMS messages (PII) | User only |
| `sms_queue/` | Outbound SMS queue | User only |
| `email_jobs/` | Email delivery jobs | User read, User/Admin write |
| `export_requests/` | Data export requests | User only |

---

### Calendars Collection: `calendars/{calendarId}`

**Purpose:** Store calendar metadata and sharing settings

**Access Rules:**
- ✅ **Read:** Owner OR shared_with user OR viewer OR admin
- ✅ **Create:** Authenticated user (must set self as owner)
- ✅ **Update:** Owner only (cannot change ownership) OR admin
- ✅ **Delete:** Owner only OR admin

**Sharing Mechanism:**
Calendars can be shared using:
- `shared_with` array - Full access users
- `viewers` array - Read-only users

**Example:**
```javascript
// ✅ ALLOWED: Calendar owner shares with user
calendar.owner_uid = "user123"
calendar.shared_with = ["user456", "user789"]

// User456 can now read this calendar

// ❌ DENIED: User456 cannot update the calendar
// (only owner can update)
```

#### Calendar Events: `calendars/{calendarId}/events/{eventId}`

**Purpose:** Store calendar events

**Access Rules:**
- ✅ **Read:** Event owner OR calendar owner OR invited participant OR calendar shared_with user OR admin
- ✅ **Create:** Calendar owner only (must set self as event owner, must match calendar_id)
- ✅ **Update:** Event owner OR calendar owner (cannot change owner) OR admin
- ✅ **Delete:** Event owner OR calendar owner OR admin

**Multi-Layer Security:**
1. Event ownership check (`owner_uid`)
2. Calendar ownership check (must own calendar to create events)
3. Participant validation (`invited_partner_ids`)
4. Calendar sharing inheritance

**Example:**
```javascript
// ✅ ALLOWED: Create event in owned calendar
calendar.owner_uid = "user123"
event.owner_uid = "user123"
event.calendar_id = "cal_abc"

// ✅ ALLOWED: Invited participant reads event
event.invited_partner_ids = ["user456"]
// User456 can read this event

// ❌ DENIED: Create event in someone else's calendar
calendar.owner_uid = "user789"
event.owner_uid = "user123" // Different user
```

---

### Signals Collection: `signals/{signalId}`

**Purpose:** Store availability signals (busy/available/flexible)

**Access Rules:**
- ✅ **Read:** Owner OR shared_with user OR admin
- ✅ **Create:** Authenticated user (must set self as owner and user_id)
- ✅ **Update:** Owner only (cannot change ownership) OR admin
- ✅ **Delete:** Owner only OR admin

#### Signal Shares: `signals/{signalId}/shares/{shareId}`

**Purpose:** Define who can see a specific signal

**Access Rules:**
- ✅ **Read:** Signal owner OR recipient (shared_with_uid) OR admin
- ✅ **Create:** Signal owner only
- ✅ **Update:** Signal owner only (cannot change ownership) OR admin
- ✅ **Delete:** Signal owner only OR admin

**Security Note:**
Signal shares require **two checks**:
1. Parent signal ownership
2. Share recipient validation

**Example:**
```javascript
// ✅ ALLOWED: Share signal with contact
signal.owner_uid = "user123"
share.owner_uid = "user123"
share.shared_with_uid = "user456"

// User456 can now read this signal
// BUT only through the share document, not direct signal access
```

---

### Shared Events Collection: `shared_events/{sharedEventId}`

**Purpose:** Events explicitly shared between users

**Access Rules:**
- ✅ **Read:** Owner OR user in shared_with_ids OR admin
- ✅ **Create:** Authenticated user (must set self as owner)
- ✅ **Update:** Owner (full update) OR shared_with user (RSVP only) OR admin
- ✅ **Delete:** Owner only OR admin

**Limited Update Pattern:**
Non-owners can only update specific fields:
- `rsvp_status` - Accept/decline invitation
- `updated_at` - Timestamp

**Example:**
```javascript
// ✅ ALLOWED: Guest updates RSVP
event.owner_uid = "user123"
event.shared_with_ids = ["user456"]

// User456 can update:
update.rsvp_status = "accepted"
update.updated_at = now

// ❌ DENIED: Guest tries to change event time
update.start_time = "2024-01-01" // Not allowed for guests
```

---

### Contact Invitations Collection: `contact_invitations/{invitationId}`

**Purpose:** Manage contact requests between users

**Access Rules:**
- ✅ **Read:** Sender OR recipient (by uid, email, or phone) OR admin
- ✅ **Create:** Authenticated user (must be sender)
- ✅ **Update:** Sender (full) OR recipient (status only) OR admin
- ✅ **Delete:** Sender only OR admin

**Recipient Matching:**
Recipients can be identified by:
- `recipient_uid` - Direct user ID match
- `recipient_email` - Match against auth token email
- `recipient_phone` - Match against auth token phone number

**Limited Update for Recipients:**
Recipients can only update:
- `status` - Accept/reject invitation
- `responded_at` - Response timestamp
- `updated_at` - General timestamp

**Example:**
```javascript
// ✅ ALLOWED: Send invitation
invitation.sender_uid = "user123"
invitation.recipient_email = "friend@example.com"

// ✅ ALLOWED: Recipient accepts (when they sign up)
// User with email "friend@example.com" can update:
update.status = "accepted"
update.responded_at = now

// ❌ DENIED: Recipient tries to change sender
update.sender_uid = "hacker456" // Not allowed
```

---

## 🛡️ Security Features Implemented

### 1. Owner Immutability Protection

The `ownerUnchanged()` helper prevents ownership transfer attacks:

```javascript
function ownerUnchanged() {
  return !('owner_uid' in request.resource.data) ||
         resource.data.owner_uid == request.resource.data.owner_uid;
}
```

**What it does:**
- ✅ Allows updates that don't include `owner_uid`
- ✅ Allows updates where `owner_uid` stays the same
- ❌ Blocks updates that try to change `owner_uid`

### 2. Nested Resource Permission Checks

Calendar events validate both event AND calendar ownership:

```javascript
allow create: if isAuthenticated() && (
  // Must own the calendar
  get(/databases/$(database)/documents/calendars/$(calendarId)).data.owner_uid == request.auth.uid &&
  // Must set self as event owner
  isIncomingOwner() &&
  // Must match calendar ID
  request.resource.data.calendar_id == calendarId
);
```

### 3. Granular Update Permissions

Shared events allow guests to update RSVP without full write access:

```javascript
// Allow invited users to update their RSVP status
(request.auth.uid in resource.data.shared_with_ids &&
 request.resource.data.diff(resource.data).affectedKeys()
   .hasOnly(['rsvp_status', 'updated_at']))
```

### 4. Multi-Factor Access Validation

Users can access calendars through multiple paths:
- Direct ownership
- Shared access (`shared_with` array)
- Viewer access (`viewers` array)
- Event participant (`invited_partner_ids`)

### 5. PII Protection

Sensitive data like SMS conversations are strictly isolated:

```javascript
match /sms_conversations/{conversationId} {
  allow read, write: if isOwner(userId);
}
```

---

## 🧪 Testing Security Rules

### Local Testing with Firebase Emulator

```bash
# Start Firestore emulator
firebase emulators:start --only firestore

# Run security rules tests
npm run test:rules
```

### Manual Security Tests

#### Test 1: User Isolation
```javascript
// User A creates a profile
set /users/userA { email: "a@test.com", owner_uid: "userA" }

// User B tries to read User A's profile
get /users/userA (as userB)
// Expected: DENIED
```

#### Test 2: Calendar Sharing
```javascript
// User A creates calendar
set /calendars/cal1 { owner_uid: "userA", shared_with: ["userB"] }

// User B reads shared calendar
get /calendars/cal1 (as userB)
// Expected: ALLOWED

// User B tries to update calendar
update /calendars/cal1 { title: "Hacked" } (as userB)
// Expected: DENIED (only owner can update)
```

#### Test 3: Event Access Through Invitation
```javascript
// User A creates event and invites User B
set /calendars/cal1/events/evt1 {
  owner_uid: "userA",
  calendar_id: "cal1",
  invited_partner_ids: ["userB"]
}

// User B reads invited event
get /calendars/cal1/events/evt1 (as userB)
// Expected: ALLOWED

// User B tries to delete event
delete /calendars/cal1/events/evt1 (as userB)
// Expected: DENIED
```

#### Test 4: Ownership Takeover Prevention
```javascript
// User A owns document
set /users/userA { owner_uid: "userA" }

// User A tries to change ownership
update /users/userA { owner_uid: "userB" } (as userA)
// Expected: DENIED
```

---

## 🚨 Common Security Mistakes to Avoid

### ❌ Don't Trust Client-Provided UIDs

**Bad:**
```javascript
allow write: if request.resource.data.owner_uid == request.auth.uid;
```

**Good:**
```javascript
allow write: if isIncomingOwner() &&
                request.resource.data.owner_uid == request.auth.uid;
```

### ❌ Don't Allow Unrestricted Updates

**Bad:**
```javascript
allow update: if isAuthenticated();
```

**Good:**
```javascript
allow update: if isResourceOwner() && ownerUnchanged();
```

### ❌ Don't Forget Subcollection Security

**Bad:**
```javascript
match /users/{userId} {
  allow read: if isOwner(userId);
  // Missing rules for subcollections!
}
```

**Good:**
```javascript
match /users/{userId} {
  allow read: if isOwner(userId);

  match /contacts/{contactId} {
    allow read, write: if isOwner(userId);
  }
}
```

### ❌ Don't Allow Array Manipulation Without Validation

**Bad:**
```javascript
allow update: if request.auth.uid in resource.data.shared_with;
```

**Good:**
```javascript
allow update: if request.auth.uid in resource.data.shared_with &&
                 request.resource.data.diff(resource.data).affectedKeys()
                   .hasOnly(['rsvp_status', 'updated_at']);
```

---

## 📊 Audit & Compliance

### Audit Logs Collection

```javascript
match /audit_logs/{logId} {
  allow read: if isAdmin();
  allow write: if false; // Only Cloud Functions can write
}
```

**Purpose:** Track security-relevant events for compliance and debugging

**Access:** Admin-only read, Cloud Functions-only write

**Events to Log:**
- User authentication attempts
- Permission changes (calendar sharing, etc.)
- Access to sensitive data (PII, financial data)
- Failed authorization attempts
- Data exports

---

## 🔄 Deployment

### Deploy Rules to Firebase

```bash
# Deploy to dev environment
firebase deploy --only firestore:rules --project myorbit-dev

# Deploy to staging
firebase deploy --only firestore:rules --project myorbit-staging

# Deploy to production (requires review)
firebase deploy --only firestore:rules --project myorbit-prod
```

### Pre-Deployment Checklist

- [ ] Rules tested in emulator
- [ ] All collections have explicit rules
- [ ] Owner immutability verified
- [ ] Shared resource access tested
- [ ] PII protection validated
- [ ] Admin overrides documented
- [ ] Audit logging configured

---

## 📚 Related Documentation

- [Firebase Security Rules Reference](https://firebase.google.com/docs/rules)
- [Firestore Data Model](docs/MIGRATION_TO_FIREBASE_AND_BLOC.md)
- [Production Readiness Checklist](docs/status/PRODUCTION_READINESS_CHECKLIST.md)

---

## ⚠️ Important Security Notes

1. **Never trust client data** - Always validate ownership server-side
2. **Owner fields are immutable** - Once set, they cannot be changed via client
3. **Admin claims are powerful** - Only grant to trusted accounts
4. **Test before deploying** - Use Firebase emulator for rule testing
5. **Monitor failed attempts** - Set up alerts for repeated authorization failures
6. **Regular security audits** - Review rules quarterly or after major changes
7. **Principle of least privilege** - Grant minimum necessary permissions

---

## 🆘 Emergency Procedures

### If Unauthorized Access is Detected

1. **Immediately:** Lock down affected collection
   ```javascript
   match /compromised_collection/{doc} {
     allow read, write: if false;
   }
   ```

2. **Deploy emergency rules:**
   ```bash
   firebase deploy --only firestore:rules --project myorbit-prod
   ```

3. **Audit access logs** to identify affected data

4. **Notify affected users** per data breach protocols

5. **Review and fix** the security vulnerability

6. **Restore access** with corrected rules

---

**Last Updated:** 2025-10-29
**Rules Version:** 2
**Compliance:** GDPR, CCPA Ready
