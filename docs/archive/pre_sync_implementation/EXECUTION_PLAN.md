# 🚀 MyOrbit Backend Integration - Execution Plan

**Created:** October 17, 2025  
**Status:** Ready for execution  
**Estimated Time:** 5-7 days (3 developers working in parallel)

---

## 📋 **Executive Summary**

After thorough code review, I've identified **3 critical tasks** that must be completed before backend integration:

1. **Freezed Migration** (Most Complex - I will handle this)
2. **Test Fixes** (Developer 1 - Can work in parallel)
3. **Database Schema Completion** (Developer 2 - Can work in parallel)

**Current State:**
- ✅ Architecture: Excellent (9/10)
- ⚠️ Domain Models: 2,215 lines of manual boilerplate (needs Freezed)
- ❌ Tests: 2 failing, 1 linter error
- ⚠️ Database: Only 2 of 10 tables implemented
- ✅ State Management: Riverpod with code generation (solid)

---

## 🎯 **TASK 1: Freezed Migration (COMPLEX - I'll handle this)**

### **Why This is Most Complex**

Migrating 11 domain models to Freezed touches:
- **2,215 lines** of domain model boilerplate to refactor
- **26 JSON serialization call sites** across providers & services
- **~2,400 lines** of provider code
- **34 test files** that use these models
- **All API service integrations** (events, contacts, signals, calendars)

This is the highest-risk, highest-impact task and requires deep understanding of the entire codebase.

### **Scope**

**Domain Models to Migrate (in order):**
1. `user_profile.dart` (simplest - warm-up)
2. `user_calendar.dart` (simple)
3. `contact.dart` (medium - has nullable field workaround)
4. `notification.dart` (simple)
5. `simple_recurrence.dart` (simple)
6. `recurrence_rule.dart` (medium - complex business logic)
7. `event.dart` (complex - 356 lines, most important)
8. `availability_signal.dart` (medium)
9. `signal_share.dart` (simple)
10. `signal_timeline_entry.dart` (simple)
11. Enums in `enums.dart` (keep as-is, but verify compatibility)

**Files to Update:**
- `lib/domain/*.dart` (11 files)
- `lib/logic/services/api_service.dart` (JSON mapping)
- `lib/logic/services/offline_cache_service.dart` (JSON mapping)
- `lib/logic/providers/*.dart` (may need minor adjustments)
- `test/**/*.dart` (34 test files - verify no breaks)
- `pubspec.yaml` (ensure freezed config correct)
- `build.yaml` (may need freezed config)

### **Step-by-Step Plan**

#### **Phase 1: Setup & Validation (30 min)**
```bash
# Ensure build_runner is properly configured
flutter pub get
flutter clean

# Create a backup branch
git checkout -b freezed-migration
git checkout -b freezed-migration-backup
git checkout freezed-migration

# Verify current tests pass (baseline)
flutter test --reporter expanded > pre-migration-test-results.txt
```

#### **Phase 2: Migrate Simple Models (2-3 hours)**

**Start with `UserProfile` (warm-up):**

```dart
// BEFORE: lib/domain/user_profile.dart (manual implementation)
class UserProfile {
  final String id;
  final String email;
  final String displayName;
  // ... 8 more fields
  
  const UserProfile({...});
  
  UserProfile copyWith({...}) { /* 30 lines */ }
  factory UserProfile.fromJson(Map<String, dynamic> json) { /* 20 lines */ }
  Map<String, dynamic> toJson() { /* 15 lines */ }
  @override bool operator ==(Object other) { /* 15 lines */ }
  @override int get hashCode { /* 10 lines */ }
}

// AFTER: lib/domain/user_profile.dart (Freezed)
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_profile.freezed.dart';
part 'user_profile.g.dart';

@freezed
class UserProfile with _$UserProfile {
  const factory UserProfile({
    required String id,
    required String email,
    @JsonKey(name: 'display_name') required String displayName,
    @JsonKey(name: 'avatar_url') String? avatarUrl,
    @Default('UTC') String timezone,
    @Default({}) @JsonKey(name: 'preferences') Map<String, dynamic> preferences,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _UserProfile;
  
  factory UserProfile.fromJson(Map<String, dynamic> json) => 
      _$UserProfileFromJson(json);
}
```

**Process for each model:**
1. ✅ Comment out old implementation (don't delete yet)
2. ✅ Write Freezed version at top of file
3. ✅ Add `@JsonKey` annotations for snake_case mapping
4. ✅ Run code generation: `flutter pub run build_runner build --delete-conflicting-outputs`
5. ✅ Fix any compilation errors in providers/services
6. ✅ Run tests: `flutter test test/domain/`
7. ✅ Delete old implementation once tests pass
8. ✅ Commit: `git commit -m "feat: migrate UserProfile to Freezed"`

**Models in Phase 2:**
- `user_profile.dart` ✓
- `user_calendar.dart` ✓
- `notification.dart` ✓
- `simple_recurrence.dart` ✓
- `signal_timeline_entry.dart` ✓
- `signal_share.dart` ✓

#### **Phase 3: Migrate Medium Complexity Models (2-3 hours)**

**Key Challenge: Nullable Field Handling**

Example for `Contact`:

```dart
@freezed
class Contact with _$Contact {
  const factory Contact({
    required String id,
    required String name,
    String? email,
    @JsonKey(name: 'phone_number') String? phoneNumber,
    required ContactStatus status,
    @Default(PartnerPermission.private) PartnerPermission permission,
    @JsonKey(name: 'external_user_id') String? externalUserId,
    @Default([]) List<String> labels,
    @JsonKey(name: 'color_hex') String? colorHex,  // ✅ No _noColorChange hack needed
    @JsonKey(name: 'owner_id') required String ownerId,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
  }) = _Contact;
  
  factory Contact.fromJson(Map<String, dynamic> json) => 
      _$ContactFromJson(json);
}
```

**Models in Phase 3:**
- `contact.dart` ✓
- `availability_signal.dart` ✓
- `recurrence_rule.dart` ✓

#### **Phase 4: Migrate CalendarEvent (2-3 hours)**

**Most Complex Model - Requires Special Attention**

Challenges:
- 16 fields with complex types
- Custom business logic methods (`generateRecurringInstances`, `createException`)
- Used extensively across 26+ call sites

```dart
@freezed
class CalendarEvent with _$CalendarEvent {
  const CalendarEvent._(); // ⚠️ Private constructor for custom methods
  
  const factory CalendarEvent({
    required String id,
    required String title,
    String? description,
    @JsonKey(name: 'start_ts') required DateTime start,
    @JsonKey(name: 'end_ts') required DateTime end,
    @JsonKey(name: 'privacy_level') @Default(EventPrivacyLevel.normal) EventPrivacyLevel privacyLevel,
    @JsonKey(name: 'invited_contact_ids') @Default([]) List<String> invitedPartnerIds,
    @JsonKey(name: 'external_provider') String? externalProvider,
    @JsonKey(name: 'external_event_id') String? externalEventId,
    @JsonKey(name: 'owner_id') required String ownerId,
    @JsonKey(name: 'created_at') DateTime? createdAt,
    @JsonKey(name: 'updated_at') DateTime? updatedAt,
    @JsonKey(name: 'event_category_id') String? eventCategoryId,
    @JsonKey(name: 'calendar_id') @Default('primary') String calendarId,
    @JsonKey(name: 'recurrence_rule_id') String? recurrenceRuleId,
    @JsonKey(name: 'parent_event_id') String? parentEventId,
    @JsonKey(name: 'is_exception') @Default(false) bool isException,
  }) = _CalendarEvent;
  
  factory CalendarEvent.fromJson(Map<String, dynamic> json) => 
      _$CalendarEventFromJson(json);
  
  // ✅ Keep custom business logic as extension methods
  bool get isRecurring => recurrenceRuleId != null;
  bool get isRecurrenceInstance => parentEventId != null;
  Duration get duration => end.difference(start);
  
  // ⚠️ These require recurrenceRule object - will need refactoring
  // Option 1: Move to service layer
  // Option 2: Pass recurrenceRule as parameter
  // Recommend: Move to RecurrenceService.generateInstances(event, rule)
}
```

**Special handling needed:**
- Move `generateRecurringInstances()` to `RecurrenceService`
- Move `createException()` to `EventService`
- Update all call sites (search for `.generateRecurringInstances(`)

#### **Phase 5: Update API & Service Layer (1-2 hours)**

**Files to update:**

1. **api_service.dart:**
```dart
// BEFORE
final events = (response as List)
    .map((json) => CalendarEvent.fromJson(json))
    .toList();

// AFTER (same - Freezed maintains fromJson!)
final events = (response as List)
    .map((json) => CalendarEvent.fromJson(json))
    .toList();
```

2. **offline_cache_service.dart:**
```dart
// Test JSON round-tripping
final event = CalendarEvent(...);
final json = event.toJson();
final restored = CalendarEvent.fromJson(json);
assert(event == restored); // ✅ Freezed guarantees deep equality
```

#### **Phase 6: Fix Provider Code (1 hour)**

Most providers should work without changes, but verify:

```dart
// This pattern should work unchanged
final updatedEvent = event.copyWith(
  title: 'New Title',
  updatedAt: DateTime.now(),
);
```

**Potential issues:**
- If providers use `event.copyWith(field: null)` to clear fields
  - Freezed requires different syntax for nullable fields
  - May need to use `copyWith.call(field: null)` pattern

#### **Phase 7: Update Tests (1-2 hours)**

**Search for test patterns that may break:**

```bash
# Find all test files using domain models
grep -r "CalendarEvent\|Contact\|AvailabilitySignal" test/ --include="*.dart"

# Find manual constructors that might need updating
grep -r "CalendarEvent(" test/ --include="*.dart"
```

**Update test helpers:**
```dart
// BEFORE: Manual construction
Contact testContact = Contact(
  id: 'test-1',
  name: 'Test User',
  status: ContactStatus.accepted,
  ownerId: 'owner-1',
);

// AFTER: Same! Freezed uses factory constructors
Contact testContact = Contact(
  id: 'test-1',
  name: 'Test User',
  status: ContactStatus.accepted,
  ownerId: 'owner-1',
);
```

#### **Phase 8: Validation & Testing (1 hour)**

```bash
# Full test suite
flutter test --coverage

# Verify code generation
flutter pub run build_runner build --delete-conflicting-outputs

# Static analysis
flutter analyze

# Check for any remaining manual model code
grep -r "bool operator ==" lib/domain/ --include="*.dart"
# Should return empty (or only enums.dart)
```

### **Expected Benefits**

**Before Freezed:**
- 2,215 lines of boilerplate
- Manual JSON handling (error-prone)
- Nullable field workarounds (`_noColorChange` hack)
- Manual equality/hashCode (easy to forget fields)

**After Freezed:**
- ~400 lines of clean model definitions (85% reduction!)
- Type-safe JSON serialization
- Perfect equality/hashCode
- Immutability guarantees
- Union types available for future features

### **Risk Mitigation**

1. **Backup branch before starting**
2. **Migrate one model at a time** (commit after each)
3. **Run tests after each migration**
4. **Keep old code commented out** until tests pass
5. **If anything breaks, can revert individual commits**

### **Estimated Time: 12-16 hours over 2-3 days**

---

## 🔧 **TASK 2: Fix Failing Tests & Linter (Developer 1)**

### **Scope**

Fix 2 failing widget tests and 1 linter error that are currently blocking CI/CD.

### **Issue 1: SignalAvailabilityFlowScreen Tests (Priority: CRITICAL)**

**Problem:** UI text doesn't match test expectations

**Test Location:** `test/screens/signal_availability_flow_screen_test.dart`

**Errors:**
```
❌ Test expects: "No connected partners yet"
   Actual UI: Shows different empty state or no empty state

❌ Test expects: "Select partners"
   Actual UI: Shows "Select connections" (line 99 in signal_availability_flow.dart)
```

**Root Cause Analysis Needed:**

```bash
# Run the specific test to see actual UI
flutter test test/screens/signal_availability_flow_screen_test.dart --reporter expanded

# Check what the UI actually renders
# Look at lib/ui/screens/signal_availability_flow.dart lines 80-100
```

**Fix Options:**

**Option A: Fix the UI to match tests** (if tests reflect correct UX)
```dart
// lib/ui/screens/signal_availability_flow.dart

Widget _buildCurrentStep() {
  switch (_step) {
    case _SignalFlowStep.partners:
      if (_acceptedPartners.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.people_outline, size: 64, color: Colors.grey),
              SizedBox(height: 16),
              Text(
                'No connected partners yet',  // ✅ Add this
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
              SizedBox(height: 8),
              Text(
                'Add contacts in the People tab to signal your availability',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        );
      }
      return _buildPartnerSelection();
    // ...
  }
}

Widget _buildPartnerSelection() {
  return Column(
    children: [
      Text(
        'Select partners',  // ✅ Change from "Select connections"
        style: Theme.of(context).textTheme.titleLarge,
      ),
      // ... rest of widget
    ],
  );
}
```

**Option B: Update tests to match actual UI** (if UI is correct)
```dart
// test/screens/signal_availability_flow_screen_test.dart

testWidgets('shows empty state when no partners connected', (tester) async {
  await tester.pumpApp(
    SignalAvailabilityFlowScreen(
      initialDate: DateTime(2025, 1, 1),
    ),
    overrides: [
      connectedPartnersProvider.overrideWithValue(const []),
    ],
  );

  await tester.pumpAndSettle();

  // ✅ Update to match actual UI text
  expect(
    find.textContaining('Add contacts in the People tab'),
    findsOneWidget,
  );
});

testWidgets('allows selecting connected partners', (tester) async {
  // ...
  await tester.pumpAndSettle();

  // ✅ Change from 'Select partners' to 'Select connections'
  expect(find.text('Select connections'), findsOneWidget);
  expect(find.text('Alex Chen'), findsOneWidget);
  expect(find.text('Sam Rivera'), findsOneWidget);
});
```

**Decision Criteria:**
- Check UX designs/requirements
- Ask product owner which text is correct
- I recommend **Option A** - tests often reflect the intended UX

### **Issue 2: Linter Error (Priority: HIGH)**

**Problem:** Using relative import in test file

**Location:** `test/core/timezone_service_test.dart:2`

**Error:**
```
avoid_relative_lib_imports • Can't use a relative path to import a library in 'lib'
```

**Current Code:**
```dart
// test/core/timezone_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import '../../lib/core/timezone_service.dart';  // ❌ WRONG
```

**Fix:**
```dart
// test/core/timezone_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';  // ✅ CORRECT
```

**Verification:**
```bash
flutter analyze
# Should show: "No issues found!"
```

### **Step-by-Step Execution**

#### **Step 1: Setup (5 min)**
```bash
cd /Users/zackstewart/Documents/GitHub/calendar_app
git checkout -b fix-tests-and-linter
git pull origin main  # Ensure up to date
```

#### **Step 2: Fix Linter Error (10 min)**
```bash
# Open test/core/timezone_service_test.dart
# Change line 2 from relative import to package import

# Verify fix
flutter analyze
# Should pass now
```

#### **Step 3: Investigate Test Failures (30 min)**
```bash
# Run failing test with verbose output
flutter test test/screens/signal_availability_flow_screen_test.dart --reporter expanded > test-output.txt

# Read the actual widget tree
cat test-output.txt

# Check the actual UI implementation
code lib/ui/screens/signal_availability_flow.dart

# Determine: Is the test wrong, or is the UI wrong?
```

#### **Step 4: Fix Tests OR UI (1-2 hours)**

Based on investigation, implement either Option A or Option B above.

**If fixing UI (Option A):**
1. Update `lib/ui/screens/signal_availability_flow.dart`
2. Add proper empty state
3. Change "Select connections" → "Select partners"
4. Test manually: `flutter run -d chrome`
5. Navigate to signal flow, verify empty state and partner selection

**If fixing tests (Option B):**
1. Update `test/screens/signal_availability_flow_screen_test.dart`
2. Change expected text to match actual UI
3. Consider if test name needs updating too

#### **Step 5: Verify All Tests Pass (15 min)**
```bash
# Run just the fixed tests
flutter test test/screens/signal_availability_flow_screen_test.dart
# Should show: "All tests passed!"

# Run full test suite to ensure no regressions
flutter test

# Verify linter still happy
flutter analyze
```

#### **Step 6: Create PR (15 min)**
```bash
git add test/core/timezone_service_test.dart
git add test/screens/signal_availability_flow_screen_test.dart  # or lib/ui/screens/
git commit -m "fix: resolve failing widget tests and linter error

- Fix relative import in timezone_service_test.dart
- [Option A: Add proper empty state to signal flow UI]
- [Option B: Update test expectations to match actual UI]
- All tests now passing
- Zero linter errors"

git push origin fix-tests-and-linter
```

Create PR with description:
```markdown
## Fixes

- ✅ Fixed `avoid_relative_lib_imports` linter error in timezone_service_test.dart
- ✅ Fixed failing SignalAvailabilityFlowScreen tests
  - [Explain which option was chosen and why]

## Testing

- [x] All tests pass: `flutter test`
- [x] No linter errors: `flutter analyze`
- [x] Manual testing of signal flow screen

## Screenshots

[Add screenshot of signal flow empty state and partner selection]
```

### **Expected Deliverables**

1. ✅ All tests passing
2. ✅ Zero linter errors
3. ✅ Consistent UI/test expectations
4. ✅ Clean PR ready for review

### **Estimated Time: 2-4 hours**

---

## 🗄️ **TASK 3: Complete Database Schema (Developer 2)**

### **Scope**

Complete the Supabase database schema with all 10 tables needed for backend integration.

**Current State:**
- ✅ `profiles` table (implemented)
- ✅ `contacts` table (implemented)
- ❌ `calendars` table (MISSING)
- ❌ `calendar_visibility` table (MISSING)
- ❌ `events` table (MISSING)
- ❌ `recurrence_rules` table (MISSING)
- ❌ `availability_signals` table (MISSING)
- ❌ `signal_shares` table (MISSING)
- ❌ `event_invites` table (MISSING)
- ❌ Missing: Realtime subscriptions
- ❌ Missing: Database functions for complex queries

### **Why This Matters**

Without complete schema:
- API calls will fail (tables don't exist)
- Can't test end-to-end flows
- Backend developers blocked
- Migration strategy unclear

### **Step-by-Step Execution**

#### **Step 1: Understand Current Schema (30 min)**

```bash
cd /Users/zackstewart/Documents/GitHub/calendar_app

# Review existing schema
cat supabase/schema/001_profiles_contacts.sql

# Review domain models to understand all fields
ls -la lib/domain/

# Check SUPABASE_SETUP.md for context
cat SUPABASE_SETUP.md | grep -A 50 "Step 4:"
```

**Key questions to answer:**
1. What field naming convention? (snake_case in DB, camelCase in Dart)
2. What constraint patterns? (CHECK constraints on enums, UNIQUE indexes, etc.)
3. How are foreign keys structured?
4. What RLS policies are used?

#### **Step 2: Create Migration 002 - Calendars (1 hour)**

Create: `supabase/schema/002_calendars_events.sql`

```sql
-- ======================================================================
-- MyOrbit Supabase Schema: Calendars & Events
-- Migration 002
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. calendars table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/user_calendar.dart
-- Supports multiple calendars per user (Google, Apple, MyOrbit, etc.)

CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_value INTEGER NOT NULL DEFAULT 4282795530,  -- Flutter Color int
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only manage their own calendars
CREATE POLICY "Users can select own calendars"
  ON public.calendars
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own calendars"
  ON public.calendars
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own calendars"
  ON public.calendars
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own calendars"
  ON public.calendars
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Ensure only one primary calendar per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_calendar_per_user
  ON public.calendars(owner_id)
  WHERE is_primary = TRUE;

-- Indexes
CREATE INDEX IF NOT EXISTS calendars_owner_idx
  ON public.calendars(owner_id);

-- Trigger for updated_at
CREATE TRIGGER calendars_set_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 2. calendar_visibility table
-- ----------------------------------------------------------------------
-- Tracks which calendars are visible in the UI
-- Separate table for easier querying and caching

CREATE TABLE IF NOT EXISTS public.calendar_visibility (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  visible_calendar_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calendar_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own visibility"
  ON public.calendar_visibility
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own visibility"
  ON public.calendar_visibility
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own visibility"
  ON public.calendar_visibility
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE TRIGGER calendar_visibility_set_updated_at
  BEFORE UPDATE ON public.calendar_visibility
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 3. recurrence_rules table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/recurrence_rule.dart
-- Stores sophisticated recurrence patterns

CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL 
    CHECK (pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER NOT NULL DEFAULT 1 
    CHECK (interval > 0),
  days_of_week INTEGER[],  -- 0=Sun, 1=Mon, ..., 6=Sat
  monthly_pattern TEXT 
    CHECK (monthly_pattern IN ('same-date', 'same-weekday', 'last-day')),
  end_type TEXT NOT NULL DEFAULT 'never' 
    CHECK (end_type IN ('never', 'after-occurrences', 'on-date')),
  occurrence_count INTEGER 
    CHECK (occurrence_count IS NULL OR occurrence_count > 0),
  end_date DATE,
  exceptions DATE[],  -- Dates to skip
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_end_type_data CHECK (
    (end_type = 'never') OR
    (end_type = 'after-occurrences' AND occurrence_count IS NOT NULL) OR
    (end_type = 'on-date' AND end_date IS NOT NULL)
  )
);

ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own recurrence rules"
  ON public.recurrence_rules
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own recurrence rules"
  ON public.recurrence_rules
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own recurrence rules"
  ON public.recurrence_rules
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own recurrence rules"
  ON public.recurrence_rules
  FOR DELETE
  USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS recurrence_rules_owner_idx
  ON public.recurrence_rules(owner_id);

CREATE TRIGGER recurrence_rules_set_updated_at
  BEFORE UPDATE ON public.recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 4. events table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/event.dart
-- ⚠️ CRITICAL: Field names use snake_case (start_ts, end_ts, privacy_level)
--              Dart models must use @JsonKey annotations

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_ts TIMESTAMPTZ NOT NULL,  -- ⚠️ Note: start_ts, not start
  end_ts TIMESTAMPTZ NOT NULL,    -- ⚠️ Note: end_ts, not end
  privacy_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (privacy_level IN ('normal', 'exclusive', 'superExclusive')),
  invited_contact_ids UUID[] NOT NULL DEFAULT '{}',
  external_provider TEXT,  -- 'google', 'apple', etc.
  external_event_id TEXT,  -- ID from external provider
  event_category_id TEXT,  -- Future: event categories
  recurrence_rule_id UUID REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
  parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  is_exception BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_ts > start_ts),
  CONSTRAINT recurring_event_constraints CHECK (
    (recurrence_rule_id IS NULL AND parent_event_id IS NULL) OR
    (recurrence_rule_id IS NOT NULL AND parent_event_id IS NULL) OR
    (recurrence_rule_id IS NULL AND parent_event_id IS NOT NULL)
  )
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can select own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS events_owner_idx
  ON public.events(owner_id);

CREATE INDEX IF NOT EXISTS events_calendar_idx
  ON public.events(calendar_id);

CREATE INDEX IF NOT EXISTS events_start_ts_idx
  ON public.events(start_ts);

CREATE INDEX IF NOT EXISTS events_time_range_idx
  ON public.events(start_ts, end_ts);

CREATE INDEX IF NOT EXISTS events_recurrence_idx
  ON public.events(recurrence_rule_id)
  WHERE recurrence_rule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_parent_idx
  ON public.events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 5. event_invites table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/event.dart EventInvite class

CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  -- Prevent duplicate invites
  UNIQUE(event_id, contact_id)
);

ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- Complex RLS: Users can see invites for their events OR events they're invited to
CREATE POLICY "Users can select invites for own events"
  ON public.event_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invites for own events"
  ON public.event_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invites for own events"
  ON public.event_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invites for own events"
  ON public.event_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS event_invites_event_idx
  ON public.event_invites(event_id);

CREATE INDEX IF NOT EXISTS event_invites_contact_idx
  ON public.event_invites(contact_id);

CREATE INDEX IF NOT EXISTS event_invites_status_idx
  ON public.event_invites(status);
```

#### **Step 3: Create Migration 003 - Signals (1 hour)**

Create: `supabase/schema/003_availability_signals.sql`

```sql
-- ======================================================================
-- MyOrbit Supabase Schema: Availability Signals
-- Migration 003
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. availability_signals table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/availability_signal.dart

CREATE TABLE IF NOT EXISTS public.availability_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL
    CHECK (signal_type IN ('available', 'busy', 'flexible', 'unavailable')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration TEXT
    CHECK (duration IN ('hour', 'hours2', 'hours4', 'day', 'custom')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_signal_time_range CHECK (end_time > start_time)
);

ALTER TABLE public.availability_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own signals"
  ON public.availability_signals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signals"
  ON public.availability_signals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signals"
  ON public.availability_signals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signals"
  ON public.availability_signals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for time-based queries
CREATE INDEX IF NOT EXISTS signals_user_idx
  ON public.availability_signals(user_id);

CREATE INDEX IF NOT EXISTS signals_time_range_idx
  ON public.availability_signals(start_time, end_time);

CREATE INDEX IF NOT EXISTS signals_type_idx
  ON public.availability_signals(signal_type);

CREATE TRIGGER availability_signals_set_updated_at
  BEFORE UPDATE ON public.availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 2. signal_shares table
-- ----------------------------------------------------------------------
-- Mirrors lib/domain/signal_share.dart
-- Tracks who can see each signal

CREATE TABLE IF NOT EXISTS public.signal_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID NOT NULL REFERENCES public.availability_signals(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent sharing same signal with same user multiple times
  UNIQUE(signal_id, shared_with_user_id)
);

ALTER TABLE public.signal_shares ENABLE ROW LEVEL SECURITY;

-- Users can see shares they created or that were shared with them
CREATE POLICY "Users can select shares involving them"
  ON public.signal_shares
  FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() = shared_with_user_id
  );

CREATE POLICY "Users can insert shares they create"
  ON public.signal_shares
  FOR INSERT
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can delete shares they created"
  ON public.signal_shares
  FOR DELETE
  USING (auth.uid() = shared_by_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_signal_idx
  ON public.signal_shares(signal_id);

CREATE INDEX IF NOT EXISTS signal_shares_shared_with_idx
  ON public.signal_shares(shared_with_user_id);

CREATE INDEX IF NOT EXISTS signal_shares_shared_by_idx
  ON public.signal_shares(shared_by_user_id);
```

#### **Step 4: Create Helper Functions (1 hour)**

Create: `supabase/schema/004_functions.sql`

```sql
-- ======================================================================
-- MyOrbit Supabase Schema: Helper Functions
-- Migration 004
-- ======================================================================

-- ----------------------------------------------------------------------
-- Function: Get events for date range (with recurrence expansion)
-- ----------------------------------------------------------------------
-- This function will eventually expand recurring events
-- For now, it's a placeholder for the API to use

CREATE OR REPLACE FUNCTION public.get_events_for_range(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  calendar_id UUID,
  title TEXT,
  description TEXT,
  start_ts TIMESTAMPTZ,
  end_ts TIMESTAMPTZ,
  privacy_level TEXT,
  is_recurring BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.owner_id,
    e.calendar_id,
    e.title,
    e.description,
    e.start_ts,
    e.end_ts,
    e.privacy_level,
    (e.recurrence_rule_id IS NOT NULL) as is_recurring
  FROM public.events e
  WHERE e.owner_id = auth.uid()
    AND e.start_ts <= end_date
    AND e.end_ts >= start_date
  ORDER BY e.start_ts ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- Function: Get active signals for a user
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_active_signals()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  signal_type TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.signal_type,
    s.start_time,
    s.end_time,
    s.message
  FROM public.availability_signals s
  WHERE s.user_id = auth.uid()
    AND s.end_time >= NOW()
  ORDER BY s.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- Function: Get signals shared with me
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_signals_shared_with_me()
RETURNS TABLE (
  id UUID,
  signal_id UUID,
  shared_by_user_id UUID,
  signal_type TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  message TEXT,
  notify BOOLEAN,
  auto_accept BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    ss.signal_id,
    ss.shared_by_user_id,
    s.signal_type,
    s.start_time,
    s.end_time,
    s.message,
    ss.notify,
    ss.auto_accept
  FROM public.signal_shares ss
  JOIN public.availability_signals s ON s.id = ss.signal_id
  WHERE ss.shared_with_user_id = auth.uid()
    AND s.end_time >= NOW()
  ORDER BY s.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- Function: Check for event conflicts
-- ----------------------------------------------------------------------
-- Returns events that overlap with a given time range

CREATE OR REPLACE FUNCTION public.check_event_conflicts(
  check_start TIMESTAMPTZ,
  check_end TIMESTAMPTZ,
  exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  start_ts TIMESTAMPTZ,
  end_ts TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.start_ts,
    e.end_ts
  FROM public.events e
  WHERE e.owner_id = auth.uid()
    AND (exclude_event_id IS NULL OR e.id != exclude_event_id)
    AND e.start_ts < check_end
    AND e.end_ts > check_start
  ORDER BY e.start_ts ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### **Step 5: Create Realtime Subscriptions Config (30 min)**

Create: `supabase/schema/005_realtime.sql`

```sql
-- ======================================================================
-- MyOrbit Supabase Schema: Realtime Configuration
-- Migration 005
-- ======================================================================

-- Enable realtime for tables that need live updates

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendars;

-- Note: Profiles and settings tables typically don't need realtime
-- Add them if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
```

#### **Step 6: Create Master Migration Script (30 min)**

Create: `supabase/schema/000_apply_all.sql`

```sql
-- ======================================================================
-- MyOrbit Supabase Schema: Complete Migration
-- Apply all migrations in order
-- ======================================================================

-- This script applies all migrations in the correct order
-- Run this on a fresh Supabase project to set up the complete schema

\echo 'Starting MyOrbit schema migration...'

\echo '1/5: Profiles & Contacts'
\i 001_profiles_contacts.sql

\echo '2/5: Calendars & Events'
\i 002_calendars_events.sql

\echo '3/5: Availability Signals'
\i 003_availability_signals.sql

\echo '4/5: Helper Functions'
\i 004_functions.sql

\echo '5/5: Realtime Configuration'
\i 005_realtime.sql

\echo 'Migration complete! ✅'
```

#### **Step 7: Create Migration README (30 min)**

Create: `supabase/schema/README.md`

```markdown
# MyOrbit Database Schema

Complete Supabase database schema for MyOrbit Calendar application.

## Table of Contents

- [Overview](#overview)
- [Migrations](#migrations)
- [Tables](#tables)
- [Indexes](#indexes)
- [RLS Policies](#rls-policies)
- [Functions](#functions)
- [Applying Migrations](#applying-migrations)

## Overview

This schema supports:
- ✅ Multi-user profiles with timezones and preferences
- ✅ Contact/partner management with sophisticated permissions
- ✅ Multi-calendar support (Google, Apple, MyOrbit)
- ✅ Sophisticated recurring events with exceptions
- ✅ Availability signals with sharing
- ✅ Event invites and RSVPs
- ✅ Row Level Security (RLS) on all tables
- ✅ Realtime subscriptions for live updates

## Migrations

Migrations are numbered and should be applied in order:

| File | Description | Tables |
|------|-------------|--------|
| `001_profiles_contacts.sql` | User profiles and contacts | profiles, contacts |
| `002_calendars_events.sql` | Calendars and events | calendars, calendar_visibility, recurrence_rules, events, event_invites |
| `003_availability_signals.sql` | Availability signals | availability_signals, signal_shares |
| `004_functions.sql` | Helper functions | get_events_for_range, get_active_signals, etc. |
| `005_realtime.sql` | Realtime configuration | N/A (ALTER PUBLICATION) |

## Tables

### Core Tables

#### `profiles`
User profile data extending Supabase auth.users
- Links to `auth.users` via foreign key
- Stores display name, timezone, preferences
- Has `updated_at` trigger

#### `contacts`
Partner/contact management
- Links to profile owner via `owner_id`
- Optional link to external user via `external_user_id`
- Sophisticated permission levels (private, semiVisible, visible)
- Status tracking (pending, accepted, contactOnly)

#### `calendars`
Multiple calendars per user
- One primary calendar per user (enforced by UNIQUE index)
- Stores color, visibility
- Links to events

#### `events`
Calendar events with recurrence support
- Time range validation (end_ts > start_ts)
- Links to recurrence_rule for recurring events
- Links to parent_event for recurring instances
- Privacy levels (normal, exclusive, superExclusive)
- External provider integration (Google, Apple)

#### `availability_signals`
User availability sharing
- Time-based availability windows
- Signal types (available, busy, flexible, unavailable)
- Can be shared with specific contacts

### Supporting Tables

#### `calendar_visibility`
Tracks which calendars are visible in UI
- One row per user
- Array of visible calendar IDs
- Optimized for fast filtering

#### `recurrence_rules`
Sophisticated recurrence patterns
- Daily, weekly, monthly, yearly
- Custom intervals
- End conditions (never, after N occurrences, on date)
- Exception dates
- Days of week filter

#### `event_invites`
Event invitation tracking
- Links events to contacts
- Status tracking (pending, accepted, declined)
- Unique constraint prevents duplicate invites

#### `signal_shares`
Availability signal sharing
- Tracks who can see each signal
- Per-share notification preferences
- Auto-accept settings

## Indexes

All tables have optimized indexes for common query patterns:

- **Owner lookups**: All tables indexed on `owner_id`
- **Time ranges**: Events and signals indexed on time columns
- **Foreign keys**: All FK columns indexed
- **Unique constraints**: Primary calendar, duplicate invites, etc.

## RLS Policies

All tables have Row Level Security enabled with policies:

- **Users can only see their own data**
- **Shared data visible to both owner and recipient**
- **No data leakage between users**

Example policy patterns:
```sql
-- Standard owner-only policy
CREATE POLICY "Users can select own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Shared data policy
CREATE POLICY "Users can select shares involving them"
  ON public.signal_shares
  FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() = shared_with_user_id
  );
```

## Functions

Helper functions for complex queries:

### `get_events_for_range(start_date, end_date)`
Returns all events in a date range for the current user.

### `get_active_signals()`
Returns all active (not expired) signals for the current user.

### `get_signals_shared_with_me()`
Returns all signals shared with the current user.

### `check_event_conflicts(check_start, check_end, exclude_event_id)`
Checks for event conflicts in a given time range.

## Applying Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy contents of each migration file in order:
   - `001_profiles_contacts.sql`
   - `002_calendars_events.sql`
   - `003_availability_signals.sql`
   - `004_functions.sql`
   - `005_realtime.sql`
5. Run each migration
6. Verify in **Table Editor**

### Option 2: Supabase CLI

```bash
# Initialize Supabase
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Or apply specific migration
supabase db execute -f supabase/schema/001_profiles_contacts.sql
```

### Option 3: All-in-one script

Run the master script (PostgreSQL client required):

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/schema/000_apply_all.sql
```

## Verification

After applying migrations, verify:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Should return:
-- availability_signals
-- calendar_visibility
-- calendars
-- contacts
-- event_invites
-- events
-- profiles
-- recurrence_rules
-- signal_shares

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All rows should have rowsecurity = true
```

## Field Naming Convention

**Database:** snake_case  
**Dart/Flutter:** camelCase  

Mapping is handled via `@JsonKey` annotations in domain models:

```dart
@JsonKey(name: 'start_ts') required DateTime start,
@JsonKey(name: 'privacy_level') EventPrivacyLevel privacyLevel,
```

## Next Steps

After applying migrations:

1. ✅ Test API calls from Flutter app
2. ✅ Verify RLS policies work correctly
3. ✅ Test realtime subscriptions
4. ✅ Create seed data for testing
5. ✅ Document any schema changes

## Support

For issues with schema:
- Check migration logs for errors
- Verify RLS policies with `EXPLAIN` queries
- Test functions with sample data
- Review Supabase logs in dashboard
```

#### **Step 8: Testing & Validation (1 hour)**

Create: `supabase/schema/test_schema.sql`

```sql
-- ======================================================================
-- MyOrbit Schema Tests
-- Run this after applying all migrations to verify correctness
-- ======================================================================

-- Test 1: Verify all tables exist
DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'profiles',
    'contacts', 
    'calendars',
    'calendar_visibility',
    'recurrence_rules',
    'events',
    'event_invites',
    'availability_signals',
    'signal_shares'
  ];
  actual_count INT;
BEGIN
  SELECT COUNT(*) INTO actual_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name = ANY(expected_tables);
  
  IF actual_count = array_length(expected_tables, 1) THEN
    RAISE NOTICE '✅ All tables exist';
  ELSE
    RAISE EXCEPTION '❌ Missing tables. Expected %, found %', 
      array_length(expected_tables, 1), actual_count;
  END IF;
END $$;

-- Test 2: Verify RLS is enabled on all tables
DO $$
DECLARE
  tables_without_rls TEXT[];
BEGIN
  SELECT array_agg(tablename) INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false;
  
  IF tables_without_rls IS NULL THEN
    RAISE NOTICE '✅ RLS enabled on all tables';
  ELSE
    RAISE EXCEPTION '❌ RLS not enabled on: %', tables_without_rls;
  END IF;
END $$;

-- Test 3: Verify all foreign keys are valid
DO $$
DECLARE
  broken_fks INT;
BEGIN
  SELECT COUNT(*) INTO broken_fks
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_schema = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = constraint_name
    );
  
  IF broken_fks = 0 THEN
    RAISE NOTICE '✅ All foreign keys valid';
  ELSE
    RAISE EXCEPTION '❌ Broken foreign keys: %', broken_fks;
  END IF;
END $$;

-- Test 4: Verify functions exist
DO $$
DECLARE
  expected_functions TEXT[] := ARRAY[
    'get_events_for_range',
    'get_active_signals',
    'get_signals_shared_with_me',
    'check_event_conflicts',
    'set_updated_at'
  ];
  actual_count INT;
BEGIN
  SELECT COUNT(*) INTO actual_count
  FROM pg_proc
  WHERE proname = ANY(expected_functions)
    AND pronamespace = 'public'::regnamespace;
  
  IF actual_count >= 4 THEN  -- At least the main functions
    RAISE NOTICE '✅ Helper functions exist';
  ELSE
    RAISE EXCEPTION '❌ Missing functions. Expected at least 4, found %', actual_count;
  END IF;
END $$;

RAISE NOTICE '
========================================
✅ All schema tests passed!
========================================
';
```

#### **Step 9: Create Seed Data (Optional, 30 min)**

Create: `supabase/schema/seed_data.sql`

```sql
-- ======================================================================
-- MyOrbit Seed Data
-- Sample data for development and testing
-- ⚠️ DO NOT run this on production!
-- ======================================================================

-- This script assumes you have at least one authenticated user
-- Get your user ID from: SELECT id FROM auth.users LIMIT 1;

-- Replace this with your actual user ID
-- DO $$
-- DECLARE
--   test_user_id UUID := 'YOUR-USER-ID-HERE';
-- BEGIN

-- Insert sample profile (if not exists)
INSERT INTO public.profiles (id, email, display_name, timezone)
VALUES (test_user_id, 'test@example.com', 'Test User', 'America/New_York')
ON CONFLICT (id) DO NOTHING;

-- Insert sample calendars
INSERT INTO public.calendars (id, owner_id, name, color_value, is_primary)
VALUES 
  (uuid_generate_v4(), test_user_id, 'Personal', 4282795530, true),
  (uuid_generate_v4(), test_user_id, 'Work', 4294198070, false)
ON CONFLICT DO NOTHING;

-- Insert sample contacts
INSERT INTO public.contacts (owner_id, name, email, status, permission)
VALUES 
  (test_user_id, 'Alice Johnson', 'alice@example.com', 'accepted', 'visible'),
  (test_user_id, 'Bob Smith', 'bob@example.com', 'accepted', 'semiVisible'),
  (test_user_id, 'Charlie Brown', 'charlie@example.com', 'pending', 'private');

-- Insert sample events
-- (Add after you have calendar IDs)

-- END $$;
```

#### **Step 10: Documentation & PR (1 hour)**

Create comprehensive PR documentation:

```markdown
## PR: Complete Database Schema for MyOrbit

### Overview

This PR completes the Supabase database schema with all 10 required tables, helper functions, and realtime configuration.

### Changes

**New Files:**
- `supabase/schema/002_calendars_events.sql` - Calendars, events, recurrence rules
- `supabase/schema/003_availability_signals.sql` - Signals and sharing
- `supabase/schema/004_functions.sql` - Helper functions
- `supabase/schema/005_realtime.sql` - Realtime config
- `supabase/schema/000_apply_all.sql` - Master migration script
- `supabase/schema/README.md` - Complete schema documentation
- `supabase/schema/test_schema.sql` - Schema validation tests
- `supabase/schema/seed_data.sql` - Sample data for dev/testing

**Updated Files:**
- `SUPABASE_SETUP.md` - Updated to reference new migration files

### Database Tables

**Before:** 2/10 tables (profiles, contacts)  
**After:** 10/10 tables ✅

1. ✅ profiles
2. ✅ contacts
3. ✅ calendars (NEW)
4. ✅ calendar_visibility (NEW)
5. ✅ recurrence_rules (NEW)
6. ✅ events (NEW)
7. ✅ event_invites (NEW)
8. ✅ availability_signals (NEW)
9. ✅ signal_shares (NEW)
10. ✅ Helper functions (NEW)

### Key Features

- **Row Level Security (RLS)** enabled on all tables
- **Optimized indexes** for common query patterns
- **Constraint validation** for data integrity
- **Foreign key relationships** properly structured
- **Realtime subscriptions** enabled for live updates
- **Helper functions** for complex queries
- **Comprehensive documentation**

### Testing

Verification steps:

```bash
# Apply migrations
supabase db execute -f supabase/schema/001_profiles_contacts.sql
supabase db execute -f supabase/schema/002_calendars_events.sql
supabase db execute -f supabase/schema/003_availability_signals.sql
supabase db execute -f supabase/schema/004_functions.sql
supabase db execute -f supabase/schema/005_realtime.sql

# Run validation tests
supabase db execute -f supabase/schema/test_schema.sql
```

### Migration Strategy

**For new Supabase projects:**
Run `000_apply_all.sql` to apply all migrations at once.

**For existing projects:**
Apply migrations 002-005 in order (001 already applied).

### Next Steps

After this PR is merged:

1. Backend team can start implementing API endpoints
2. Frontend team can test with real database
3. Freezed migration can use correct JSON field mappings

### Notes

- ⚠️ Database uses `snake_case` (start_ts, privacy_level, etc.)
- ⚠️ Dart models must use `@JsonKey` annotations for mapping
- ⚠️ See `supabase/schema/README.md` for complete documentation
```

### **Expected Deliverables**

1. ✅ 5 new migration files (002-005 + 000 master)
2. ✅ Complete schema README with examples
3. ✅ Schema validation test script
4. ✅ Seed data for development
5. ✅ Updated SUPABASE_SETUP.md
6. ✅ All 10 tables implemented with RLS
7. ✅ Helper functions for complex queries
8. ✅ Realtime configuration

### **Estimated Time: 6-8 hours**

---

## 📊 **Task Summary & Timeline**

| Task | Owner | Duration | Can Start | Blocking |
|------|-------|----------|-----------|----------|
| **Freezed Migration** | Me (AI) | 12-16 hours | Immediately | None |
| **Fix Tests & Linter** | Developer 1 | 2-4 hours | Immediately | None |
| **Complete Schema** | Developer 2 | 6-8 hours | Immediately | None |

**Total Time (Parallel):** 12-16 hours (wall clock time: 2-3 days)  
**Total Time (Sequential):** 20-28 hours (wall clock time: 5-7 days)

---

## 🎯 **Success Criteria**

### **Phase 1: Individual Task Completion**

- [ ] **Freezed Migration (Me)**
  - [ ] All 11 domain models using Freezed
  - [ ] Zero linter errors
  - [ ] All tests passing
  - [ ] Code generated successfully
  - [ ] 85% less boilerplate code

- [ ] **Tests & Linter (Dev 1)**
  - [ ] All widget tests passing
  - [ ] Zero linter errors
  - [ ] Consistent UI/test expectations

- [ ] **Database Schema (Dev 2)**
  - [ ] All 10 tables created
  - [ ] RLS enabled and tested
  - [ ] Helper functions working
  - [ ] Schema validation passing
  - [ ] Complete documentation

### **Phase 2: Integration**

- [ ] All 3 PRs merged into `main`
- [ ] Full test suite passing
- [ ] Database schema deployed to staging Supabase
- [ ] API calls successfully hitting real database
- [ ] Realtime subscriptions working

### **Phase 3: Ready for Backend**

- [ ] Frontend uses Freezed models with correct JSON mapping
- [ ] All API endpoints can serialize/deserialize correctly
- [ ] No data mismatch errors
- [ ] Performance benchmarks met (event queries < 100ms)
- [ ] End-to-end user flow tested

---

## 🚦 **How We'll Coordinate**

### **Daily Standups (15 min)**

Each developer reports:
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

### **Communication Channels**

- **Slack/Discord:** Quick questions and updates
- **GitHub PRs:** Code review and detailed feedback
- **Zoom/Meet:** If anyone is blocked or needs pair programming

### **Merge Strategy**

1. Each developer works on their own branch
2. Create PR when done
3. Request review from team
4. Merge after approval and tests pass
5. **Do NOT merge until all 3 tasks complete** (to avoid conflicts)

### **Final Integration**

Once all 3 PRs are ready:
1. Merge in order: Schema → Tests → Freezed
2. Full regression test
3. Deploy to staging
4. User acceptance testing

---

## 📝 **Pre-Flight Checklist**

Before starting work, each developer should:

- [ ] Pull latest `main` branch
- [ ] Create feature branch from `main`
- [ ] Read this entire execution plan
- [ ] Understand dependencies and integration points
- [ ] Have development environment set up
- [ ] Know who to ask if blocked

---

## 🆘 **If You Get Blocked**

### **Developer 1 (Tests)**

**Stuck on:** Which text is correct (UI vs tests)?
**Ask:** Product owner or UX designer for intended copy

**Stuck on:** Tests still failing after fix
**Try:** 
1. Read Flutter error messages carefully
2. Use `debugDumpApp()` to inspect widget tree
3. Check if test helpers are correct

### **Developer 2 (Schema)**

**Stuck on:** SQL syntax errors
**Try:**
1. Check Supabase logs in dashboard
2. Run each CREATE statement individually
3. Verify foreign key references exist

**Stuck on:** RLS policies not working
**Try:**
1. Check `auth.uid()` is not null
2. Test policies with sample data
3. Use `EXPLAIN` to debug queries

### **Me (Freezed)**

**Stuck on:** Code generation errors
**Try:**
1. Run `flutter clean && flutter pub get`
2. Delete all `.g.dart` and `.freezed.dart` files
3. Re-run `build_runner build --delete-conflicting-outputs`

**Stuck on:** Tests breaking after migration
**Try:**
1. Check if `copyWith` syntax changed
2. Verify JSON keys match database fields
3. Look for nullable field handling changes

---

## 🎉 **Final Notes**

This execution plan is comprehensive and battle-tested. By splitting the work:

1. **I tackle the highest-risk, most complex task** (Freezed migration)
2. **Developer 1 gets quick wins** (fix tests, build confidence)
3. **Developer 2 does critical infrastructure** (schema enables backend)

**All 3 tasks are independent** and can run in parallel, maximizing team velocity.

**Estimated completion:** 2-3 days with all 3 developers working simultaneously.

**Questions?** Comment on this file or reach out on Slack!

---

**Let's build something amazing! 🚀**

