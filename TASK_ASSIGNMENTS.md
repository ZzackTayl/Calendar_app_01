# 🎯 MyOrbit Task Assignments - Quick Reference

**Date:** October 17, 2025  
**Goal:** Prepare codebase for backend integration  
**Timeline:** 2-3 days (parallel work)

---

## 👤 **MY TASK: Freezed Migration (Most Complex)**

**Duration:** 12-16 hours  
**Priority:** Critical  
**Branch:** `freezed-migration`

### What I'm Doing

Migrating all 11 domain models from manual implementation to Freezed code generation.

**Why this is complex:**
- 2,215 lines of boilerplate to refactor
- 26 JSON serialization call sites to update
- 34 test files to verify
- Highest risk of breaking changes

### Models to Migrate (in order)

1. ✅ user_profile.dart (warm-up)
2. ✅ user_calendar.dart
3. ✅ contact.dart (has nullable field workaround)
4. ✅ notification.dart
5. ✅ simple_recurrence.dart
6. ✅ recurrence_rule.dart
7. ✅ **event.dart** (most complex - 356 lines)
8. ✅ availability_signal.dart
9. ✅ signal_share.dart
10. ✅ signal_timeline_entry.dart
11. ✅ enums.dart (verify compatibility)

### Key Commands

```bash
# Setup
git checkout -b freezed-migration
flutter clean && flutter pub get

# After each model migration
flutter pub run build_runner build --delete-conflicting-outputs
flutter test test/domain/
git commit -m "feat: migrate [ModelName] to Freezed"

# Final validation
flutter test --coverage
flutter analyze
```

### What Success Looks Like

- ✅ 85% reduction in boilerplate code (2,215 → ~400 lines)
- ✅ All tests passing
- ✅ Zero linter errors
- ✅ Type-safe JSON serialization
- ✅ Perfect equality/hashCode

---

## 👨‍💻 **DEVELOPER 1: Fix Tests & Linter**

**Duration:** 2-4 hours  
**Priority:** High  
**Branch:** `fix-tests-and-linter`

### What You're Doing

Fix 2 failing widget tests and 1 linter error that are blocking CI/CD.

### Tasks

#### 1. Fix Linter Error (10 min)

**File:** `test/core/timezone_service_test.dart`  
**Line:** 2

```dart
// WRONG
import '../../lib/core/timezone_service.dart';

// CORRECT
import 'package:myorbit_calendar/core/timezone_service.dart';
```

#### 2. Fix Failing Widget Tests (2-3 hours)

**File:** `test/screens/signal_availability_flow_screen_test.dart`

**Problem:** UI text doesn't match test expectations

**Errors:**
- Test expects: "No connected partners yet"
- Test expects: "Select partners"  
  But UI shows: "Select connections"

**Your Decision:**

Run the test to see what UI actually renders:
```bash
flutter test test/screens/signal_availability_flow_screen_test.dart --reporter expanded
```

Then either:
- **Option A:** Fix the UI to match tests (if tests reflect correct UX)
- **Option B:** Update tests to match actual UI (if UI is correct)

**Recommendation:** Option A - tests usually reflect intended UX

### Key Commands

```bash
# Setup
git checkout -b fix-tests-and-linter

# Run specific test
flutter test test/screens/signal_availability_flow_screen_test.dart --reporter expanded

# Verify all tests pass
flutter test
flutter analyze

# Commit
git commit -m "fix: resolve failing widget tests and linter error"
git push origin fix-tests-and-linter
```

### What Success Looks Like

- ✅ All tests passing (flutter test)
- ✅ Zero linter errors (flutter analyze)
- ✅ Consistent UI/test expectations
- ✅ Clean PR ready for review

---

## 👨‍💻 **DEVELOPER 2: Complete Database Schema**

**Duration:** 6-8 hours  
**Priority:** Critical  
**Branch:** `complete-database-schema`

### What You're Doing

Complete the Supabase database schema with all 10 tables, helper functions, and realtime configuration.

**Current State:** 2/10 tables (profiles, contacts)  
**Target State:** 10/10 tables ✅

### Missing Tables

You need to create:

1. ❌ calendars
2. ❌ calendar_visibility
3. ❌ recurrence_rules
4. ❌ events
5. ❌ event_invites
6. ❌ availability_signals
7. ❌ signal_shares
8. ❌ Helper functions
9. ❌ Realtime configuration

### Files to Create

```
supabase/schema/
├── 001_profiles_contacts.sql         (✅ exists)
├── 002_calendars_events.sql          (❌ CREATE THIS)
├── 003_availability_signals.sql      (❌ CREATE THIS)
├── 004_functions.sql                 (❌ CREATE THIS)
├── 005_realtime.sql                  (❌ CREATE THIS)
├── 000_apply_all.sql                 (❌ CREATE THIS - master script)
├── README.md                         (❌ CREATE THIS - documentation)
├── test_schema.sql                   (❌ CREATE THIS - validation)
└── seed_data.sql                     (❌ CREATE THIS - sample data)
```

### Step-by-Step

1. **Study existing schema** (30 min)
   - Read `supabase/schema/001_profiles_contacts.sql`
   - Understand RLS policy patterns
   - Note field naming: `snake_case` in DB

2. **Create 002_calendars_events.sql** (1-2 hours)
   - calendars table
   - calendar_visibility table
   - recurrence_rules table
   - events table (⚠️ use `start_ts`, `end_ts`, `privacy_level`)
   - event_invites table
   - All RLS policies
   - All indexes
   - Triggers

3. **Create 003_availability_signals.sql** (1 hour)
   - availability_signals table
   - signal_shares table
   - RLS policies
   - Indexes

4. **Create 004_functions.sql** (1 hour)
   - get_events_for_range()
   - get_active_signals()
   - get_signals_shared_with_me()
   - check_event_conflicts()

5. **Create 005_realtime.sql** (30 min)
   - Enable realtime for tables

6. **Create documentation** (1 hour)
   - 000_apply_all.sql (master script)
   - README.md (comprehensive docs)
   - test_schema.sql (validation)

### Key Commands

```bash
# Setup
git checkout -b complete-database-schema

# Test locally (if using Supabase CLI)
supabase db execute -f supabase/schema/002_calendars_events.sql
supabase db execute -f supabase/schema/003_availability_signals.sql
supabase db execute -f supabase/schema/004_functions.sql
supabase db execute -f supabase/schema/005_realtime.sql

# Validate
supabase db execute -f supabase/schema/test_schema.sql

# Commit
git add supabase/schema/
git commit -m "feat: complete database schema with all tables"
git push origin complete-database-schema
```

### Important Notes

**⚠️ Field Naming:**
- Database uses `snake_case`: `start_ts`, `end_ts`, `privacy_level`, `invited_contact_ids`
- Dart uses `camelCase`: `start`, `end`, `privacyLevel`, `invitedPartnerIds`
- Mapping handled by `@JsonKey` annotations

**⚠️ RLS Required:**
- All tables MUST have RLS enabled
- Use same pattern as existing tables
- Users can only see their own data (or shared data)

**⚠️ See Full Spec:**
- Complete SQL for all tables is in `EXECUTION_PLAN.md`
- Copy/paste from there to ensure correctness

### What Success Looks Like

- ✅ All 10 tables created in Supabase
- ✅ RLS enabled and tested on all tables
- ✅ Helper functions working correctly
- ✅ Schema validation tests passing
- ✅ Comprehensive README documentation
- ✅ Clean PR ready for review

---

## 📅 **Timeline**

| Day | My Work | Developer 1 | Developer 2 |
|-----|---------|-------------|-------------|
| **Day 1** | Migrate 6 simple models | Fix linter & investigate tests | Study schema, create 002 |
| **Day 2** | Migrate 3 medium models | Fix tests, verify all pass | Create 003, 004, 005 |
| **Day 3** | Migrate CalendarEvent, validate | Create PR, review | Create docs, validate, PR |

## 🎯 **Success Metrics**

When all 3 tasks are complete:

- ✅ **All tests passing** - No failing tests, no linter errors
- ✅ **All domain models using Freezed** - 85% less boilerplate
- ✅ **Complete database schema** - All 10 tables with RLS
- ✅ **Ready for backend integration** - API can serialize/deserialize correctly

---

## 🆘 **Getting Help**

**Blocked on your task?** 
1. Check `EXECUTION_PLAN.md` for detailed steps
2. Post in Slack/Discord with:
   - What you're trying to do
   - What error you're seeing
   - What you've tried
3. Tag the team for quick help

**Need to coordinate?**
- Daily 15-min standup (morning)
- Async updates in Slack
- PR reviews when ready

---

## 📝 **Checklist Before Starting**

Each developer should:

- [ ] Read this entire document
- [ ] Read relevant section of `EXECUTION_PLAN.md`
- [ ] Pull latest `main` branch
- [ ] Create your feature branch
- [ ] Understand what you're building
- [ ] Know who to ask if blocked

---

## 🎉 **Let's Do This!**

You have clear tasks with detailed instructions. Work independently, communicate blockers early, and we'll have everything ready for backend integration in 2-3 days!

**Questions?** Check `EXECUTION_PLAN.md` or ask the team!

---

**Good luck! 🚀**

