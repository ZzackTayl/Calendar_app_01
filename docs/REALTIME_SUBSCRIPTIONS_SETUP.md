# Realtime Subscriptions Setup Guide

## Overview

This document provides step-by-step instructions for enabling realtime subscriptions in your Supabase dashboard. The Flutter code is already implemented and ready - you just need to enable the database tables for realtime access.

## What Has Been Done

✅ **Code Implementation Complete**
- Realtime subscription methods added to `RealtimeSyncService`
- Event subscriptions: `subscribeToEvents()` ✓
- Contact subscriptions: `subscribeToContacts()` ✓
- Signal subscriptions: `subscribeToSignals()` ✓ (NEW)
- Share subscriptions: `subscribeToShares()` ✓ (NEW)
- All subscription callbacks properly configured
- Main app initialization updated to activate all subscriptions

✅ **Database Schema Ready**
- All tables configured with Row Level Security (RLS)
- Replica identity set to FULL for all tables (required for DELETE operations)
- Publications created in SQL (`005_realtime.sql`)

## Tables Requiring Realtime Enablement

You must enable realtime for these 4 tables in the Supabase Dashboard:

1. **public.events** - User calendar events
2. **public.contacts** - User contacts
3. **public.availability_signals** - Availability signals (NEW)
4. **public.signal_shares** - Signal share records (NEW)

---

## Step-by-Step: Enable Realtime via Supabase Dashboard

### Preliminary: Navigate to Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in and select your MyOrbit project
3. In the left sidebar, click **Database** → **Replication** (or **Publications**)

### Enable Realtime for Each Table

#### Table 1: events

1. In the **Replication** or **Publications** section, you'll see a table listing your project's tables
2. Find the row for **public.events**
3. Toggle the **Realtime** switch to **ON** (or check the checkbox)
4. Confirm any prompts
5. You should see a confirmation message like "Realtime enabled for events"

**What this does:**
- Enables PostgreSQL WAL (Write-Ahead Logging) monitoring for the events table
- Allows Flutter clients to subscribe to INSERT, UPDATE, and DELETE changes on events
- Only affects rows the user has access to (via RLS)

#### Table 2: contacts

1. Find the row for **public.contacts**
2. Toggle the **Realtime** switch to **ON**
3. Confirm

**What this does:**
- Enables realtime updates for contact changes
- Allows immediate notification when contacts are added, updated, or deleted

#### Table 3: availability_signals

1. Find the row for **public.availability_signals**
2. Toggle the **Realtime** switch to **ON**
3. Confirm

**What this does:**
- Enables realtime for availability signal changes
- Partners receive live updates when signals are created, modified, or expire
- Critical for the "I'm Available" feature

#### Table 4: signal_shares

1. Find the row for **public.signal_shares**
2. Toggle the **Realtime** switch to **ON**
3. Confirm

**What this does:**
- Enables realtime for signal share events
- Users are notified in real-time when signals are shared with them
- Updates to share status (active → revoked, etc.) propagate instantly

---

## Verification: Confirm Realtime is Enabled

### In Supabase Dashboard

1. Navigate back to **Database** → **Replication**
2. You should see all 4 tables with realtime enabled (checkmark or toggle ON)
3. No errors or warnings should be displayed

### In Your Flutter App

After enabling in the dashboard:

1. Run the Flutter app: `flutter run`
2. Observe the console logs during app startup
3. You should see:
   ```
   🔄 User authenticated, setting up real-time sync...
   ✅ Events subscription active
   ✅ Contacts subscription active
   ✅ Signals subscription active
   ✅ Shares subscription active
   ```

4. If subscriptions fail, check for errors in the console (look for "Realtime subscription error")

### Manual Testing

1. Open your app on two devices/emulators (or two browser tabs for web)
2. Log in as different users (or the same user)
3. On Device A: Create a calendar event
4. On Device B: The event should appear in real-time within the calendar
5. Repeat for contacts, signals, and shares

---

## Troubleshooting

### "Realtime subscription error" in Console

**Possible causes:**

1. **Table not enabled in dashboard**
   - Solution: Re-check that the table toggle is ON in Supabase Dashboard
   - Wait a few minutes for changes to propagate

2. **RLS policy blocking access**
   - Check that authenticated users have SELECT permission on the table
   - Verify RLS policies are correctly configured (they should be in the schema files)

3. **Column name mismatch**
   - PostgreSQL is case-sensitive; table names should be lowercase
   - Check the filter column names match exactly (e.g., `owner_id`)

### Changes Not Appearing in Real-Time

1. Verify the subscription is active (check console logs)
2. Confirm the data change is actually happening in the database
3. Check RLS policies - the user may not have permission to see the data
4. Try refreshing the app - sometimes timing can delay propagation

### High Realtime Connection Latency

1. This is normal on the free tier - subscriptions can be slower
2. Consider upgrading to Supabase paid tier for production
3. Ensure app has stable internet connection

---

## Code Reference: How Subscriptions Work

### Event Example

```dart
// In RealtimeSyncService
subscribeToEvents() {
  _client
    .from('events')
    .onPostgresChanges(
      event: PostgresChangeEvent.all,  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'events',
      filter: PostgresChangeFilter(
        column: 'owner_id',
        value: userId,  // Only listen to own events
      ),
      callback: (payload) {
        // Handle INSERT, UPDATE, DELETE
        if (onEventInserted != null) await onEventInserted!(payload.newRecord);
      },
    )
    .subscribe();
}
```

### When Realtime is Enabled in Dashboard

1. Supabase PostgreSQL publishes changes to a WebSocket
2. Flutter client receives the change notification
3. `RealtimeSyncService` routes it to the appropriate callback
4. UI providers (in `event_providers.dart`, `contact_providers.dart`, etc.) update state
5. Widgets rebuild with new data automatically

---

## Additional Notes

### Why Both Subscriptions and Sync Queue?

- **Realtime Subscriptions**: Live updates for immediate UI responsiveness
- **Sync Queue**: Fallback for offline changes, retry logic, and conflict resolution
- Together they provide both **real-time sync** and **reliable offline-first sync**

### Performance Considerations

- Realtime subscriptions consume WebSocket connections
- Each user typically has 4 active channels (events, contacts, signals, shares)
- Scale this appropriately based on your user count

### Security

- All subscriptions are filtered by RLS policies
- Users can only see/receive updates for data they have access to
- No sensitive data is exposed through realtime channels

---

## Testing Checklist

Before deploying to production, verify:

- [ ] All 4 tables have realtime enabled in Supabase Dashboard
- [ ] App starts without realtime subscription errors
- [ ] Creating an event on Device A appears on Device B within 2-3 seconds
- [ ] Creating a contact on Device A appears on Device B within 2-3 seconds
- [ ] Creating a signal on Device A appears on Device B within 2-3 seconds
- [ ] Sharing a signal with a partner updates in real-time
- [ ] Deleting records triggers DELETE callbacks
- [ ] Updating records triggers UPDATE callbacks
- [ ] App handles network disconnections gracefully

---

## Support & Debugging

If you encounter issues:

1. **Check Supabase Status**: https://supabase.io/status
2. **Review Logs**: Enable verbose logging in Flutter with `flutter run -v`
3. **Database Logs**: Check Supabase Dashboard → Logs for database errors
4. **RLS Policies**: Review the schema files to ensure policies allow access

For more information, see:
- Supabase Realtime Docs: https://supabase.io/docs/guides/realtime
- Flutter Supabase Docs: https://pub.dev/packages/supabase_flutter
- Project Schema: `/supabase/schema/005_realtime.sql`
