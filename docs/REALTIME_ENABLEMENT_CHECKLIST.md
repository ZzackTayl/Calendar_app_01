# Realtime Subscriptions Enablement Checklist

**Project:** MyOrbit Calendar App
**Status:** Code Complete ✅ | Awaiting Dashboard Configuration ⚠️
**Date:** October 21, 2024

---

## Pre-Enablement Verification (Engineer Tasks)

- [x] Reviewed current codebase and identified gap
- [x] Found events & contacts subscriptions already implemented
- [x] Added availability_signals subscription method
- [x] Added signal_shares subscription method
- [x] Added 8 new callback properties for signals & shares
- [x] Updated main.dart to activate all 4 subscriptions
- [x] Added comprehensive logging for diagnostics
- [x] Verified no Dart compilation errors
- [x] Confirmed code follows existing patterns
- [x] Verified RLS policies are correctly configured
- [x] Confirmed REPLICA IDENTITY FULL set on all tables
- [x] Reviewed SQL migration file (005_realtime.sql)
- [x] Created setup documentation

---

## Supabase Dashboard Configuration (Your Action Items)

### Phase 1: Access Supabase Dashboard

**Steps:**
1. [ ] Go to https://supabase.com
2. [ ] Log in with your account
3. [ ] Select your MyOrbit project
4. [ ] In left sidebar, click **Database**
5. [ ] Look for **Replication** or **Publications** option

**Expected:** You'll see a table listing all your database tables

---

### Phase 2: Enable Realtime for Table 1 - EVENTS

**Steps:**
1. [ ] Scroll to find the row for **public.events**
2. [ ] Locate the "Realtime" toggle/checkbox
3. [ ] Click to toggle it **ON** (should turn green or show checkmark)
4. [ ] Wait for confirmation message (usually appears below the row)
5. [ ] Confirm no error messages appear

**Expected result:** 
```
✓ Realtime enabled for events
```

**Why:** Enables live updates for calendar events created/modified/deleted by the user

---

### Phase 3: Enable Realtime for Table 2 - CONTACTS

**Steps:**
1. [ ] Scroll to find the row for **public.contacts**
2. [ ] Toggle Realtime to **ON**
3. [ ] Wait for confirmation
4. [ ] Check for any error messages

**Expected result:** 
```
✓ Realtime enabled for contacts
```

**Why:** Enables live updates when contacts are added or updated

---

### Phase 4: Enable Realtime for Table 3 - AVAILABILITY_SIGNALS

**Steps:**
1. [ ] Scroll to find the row for **public.availability_signals**
2. [ ] Toggle Realtime to **ON**
3. [ ] Wait for confirmation
4. [ ] Verify no errors

**Expected result:**
```
✓ Realtime enabled for availability_signals
```

**Why:** Enables live "I'm Available" signal notifications to partners

**Note:** This is the NEW feature - make sure table name exactly matches

---

### Phase 5: Enable Realtime for Table 4 - SIGNAL_SHARES

**Steps:**
1. [ ] Scroll to find the row for **public.signal_shares**
2. [ ] Toggle Realtime to **ON**
3. [ ] Wait for confirmation
4. [ ] Check status

**Expected result:**
```
✓ Realtime enabled for signal_shares
```

**Why:** Enables live notifications when signals are shared with partners

**Note:** This is the NEW feature - critical for sharing functionality

---

### Phase 6: Verification in Dashboard

After enabling all 4, verify:

1. [ ] Return to the Replication/Publications view
2. [ ] Confirm all 4 tables show Realtime as **ON/Enabled**
3. [ ] No error messages in dashboard
4. [ ] No warning triangles or alert icons
5. [ ] Dashboard shows successful configuration

**Screenshot checklist:**
- [ ] Take screenshot showing all 4 tables enabled
- [ ] Store for documentation

---

## Post-Enablement Verification (Engineering)

### Step 1: Verify App Initialization

**Steps:**
1. [ ] Delete app from emulator/device or clear app data
2. [ ] Run app fresh: `flutter run`
3. [ ] Watch the console output during app startup
4. [ ] Look for the realtime initialization sequence

**Expected console output:**
```
🔄 User authenticated, setting up real-time sync...
✅ Events subscription active
✅ Contacts subscription active
✅ Signals subscription active
✅ Shares subscription active
```

**If you see this:** ✅ **Realtime is working!**

**If you don't see all 4 messages:**
- [ ] Check for errors like "Realtime subscription error"
- [ ] Verify all 4 toggles are ON in Supabase Dashboard
- [ ] Wait 30 seconds and try again (sometimes takes time to propagate)
- [ ] Check internet connection is stable

---

### Step 2: Real-Time Event Test

**Test Setup:**
- [ ] Have two devices/emulators running app (or two browser tabs)
- [ ] Both logged in (can be same user or different users)
- [ ] One set as "Device A", other as "Device B"

**Test Procedure:**

1. [ ] On Device A: Navigate to Calendar screen
2. [ ] On Device B: Open calendar in another device/tab
3. [ ] On Device A: Create a new event
   - Tap "Create Event" button
   - Fill in event details
   - Save event
4. [ ] On Device B: **WITHOUT REFRESHING** - event should appear within 2-3 seconds
5. [ ] Record time it took for event to appear

**Expected:** Event appears automatically within 2-3 seconds

**If successful:** ✅ Events realtime working!

---

### Step 3: Real-Time Contact Test

**Test Procedure:**

1. [ ] On Device A: Go to People/Groups screen
2. [ ] On Device B: Open People/Groups in separate device
3. [ ] On Device A: Add a new contact
   - Tap "Add Contact"
   - Enter contact details
   - Save
4. [ ] On Device B: **WITHOUT REFRESHING** - contact should appear within 2-3 seconds

**Expected:** Contact appears automatically

**If successful:** ✅ Contacts realtime working!

---

### Step 4: Real-Time Signal Test (NEW Feature)

**Test Procedure:**

1. [ ] On Device A: Go to Availability/Signals screen
2. [ ] On Device B: Open Signals screen
3. [ ] On Device A: Create a new availability signal
   - Tap "Create Signal" or similar button
   - Set availability type (available/busy/etc)
   - Save
4. [ ] On Device B: **WITHOUT REFRESHING** - signal should appear within 2-3 seconds

**Expected:** Signal appears automatically

**If successful:** ✅ Signals realtime working!

---

### Step 5: Real-Time Share Test (NEW Feature)

**Test Procedure (requires 2 different users):**

1. [ ] On Device A: Log in as User 1
2. [ ] On Device B: Log in as User 2 (different account)
3. [ ] On Device A: Create an availability signal
4. [ ] On Device A: Share that signal with User 2
5. [ ] On Device B: **WITHOUT REFRESHING** - shared signal should appear in a few seconds

**Expected:** Shared signal appears automatically on Device B

**If successful:** ✅ Shares realtime working!

---

### Step 6: Full Integration Test

**Comprehensive Test:**
1. [ ] Create event on Device A → Appears on Device B ✓
2. [ ] Create contact on Device A → Appears on Device B ✓
3. [ ] Create signal on Device A → Appears on Device B ✓
4. [ ] Share signal from Device A → Appears on Device B ✓
5. [ ] Update event on Device A → Updates on Device B ✓
6. [ ] Delete contact on Device A → Removed on Device B ✓

**All checks passing?** ✅ **Production Ready!**

---

## Troubleshooting During Testing

### Issue: "Realtime subscription error: ..." in console

**Diagnostic Steps:**
1. [ ] Check Supabase Dashboard - are all 4 toggles ON?
2. [ ] Wait 5 minutes and try again (sometimes takes time to enable)
3. [ ] Check your internet connection is stable
4. [ ] Try refreshing app (kill and restart)

**Fix:** Usually just re-checking dashboard toggles and waiting

---

### Issue: Changes not appearing in real-time

**Diagnostic Steps:**
1. [ ] Confirm subscription says "active" in console
2. [ ] Manually make change (create event, etc)
3. [ ] Check that the change actually saved to database
4. [ ] Try manual refresh to confirm data is correct
5. [ ] Check RLS policies aren't blocking access

**Possible causes:**
- [ ] Change didn't actually save to database
- [ ] RLS policy blocking visibility
- [ ] WebSocket disconnected
- [ ] Table realtime not actually enabled in dashboard

---

### Issue: WebSocket connection keeps dropping

**Diagnostic Steps:**
1. [ ] Check internet connection stability
2. [ ] Check if on free tier (has connection limits)
3. [ ] Check for firewall/VPN blocking WebSocket
4. [ ] Check Supabase status page for outages

**On free tier:** Connection limits are lower - may need to upgrade to Pro tier

---

## Performance Expectations

### Typical Latency (by Supabase Tier)

| Scenario | Free Tier | Pro Tier | Enterprise |
|----------|-----------|----------|-----------|
| Same network | 500ms - 2s | 100-500ms | <100ms |
| Different network | 1-5s | 500ms-2s | 200-500ms |
| Mobile 4G | 2-8s | 1-3s | 500ms-2s |

**Note:** Latency depends on physical location, network quality, and load

---

## Monitoring Post-Launch

### Daily Checks (First Week)

- [ ] Monitor app console for subscription errors
- [ ] Check that data syncs within expected latency
- [ ] Verify no unexpected disconnections

### Weekly Checks

- [ ] Review Supabase dashboard for any alerts
- [ ] Check subscription error logs
- [ ] Monitor user reports of sync issues

### Monthly Review

- [ ] Analyze realtime subscription performance
- [ ] Check database metrics for replication load
- [ ] Plan for scaling if needed

---

## Rollback Plan (If Issues)

**If realtime creates problems:**

1. [ ] Toggle OFF all 4 tables in Supabase Dashboard
2. [ ] Revert code changes: `git revert <commit-hash>`
3. [ ] App will still work with sync queue and periodic refresh
4. [ ] Users won't see real-time updates, but all data will still sync

**Expected downtime:** 5 minutes to toggle off + redeploy app

---

## Sign-Off

**Implementation Status:**
- Code Implementation: ✅ Complete
- Dashboard Configuration: ⏳ Awaiting your action
- Documentation: ✅ Complete
- Testing Plan: ✅ Ready

**Next Steps:**
1. Enable 4 tables in Supabase Dashboard (5 minutes)
2. Run app and verify console messages (2 minutes)
3. Perform quick manual tests (5 minutes)
4. **Total time: ~12 minutes**

**You're ready to go! 🚀**

---

## Contact & Support

**Questions about implementation?**
- See: `docs/REALTIME_IMPLEMENTATION_SUMMARY.md`
- See: `docs/REALTIME_SUBSCRIPTIONS_SETUP.md`
- Check: `supabase/schema/005_realtime.sql`

**Having issues?**
- Check troubleshooting section above
- Review Supabase status: https://supabase.io/status
- Check Flutter console logs: `flutter run -v`
