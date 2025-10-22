# VERIFICATION GUIDE - How to Prove Everything Works

**Purpose**: Run tests to verify that all schema fixes are correct before setting up Supabase
**Time to complete**: 10-15 minutes
**Difficulty**: Easy (just run commands)

---

## TL;DR - Quick Verification

```bash
# Run all schema validation tests
flutter test test/schema_validation_test.dart -v

# Run database field alignment tests
flutter test test/database_field_alignment_test.dart -v

# Run both together
flutter test test/schema_validation_test.dart test/database_field_alignment_test.dart -v
```

If all tests pass ✅, the schema is correct and you're ready for Supabase.

---

## STEP-BY-STEP VERIFICATION

### Step 1: Prepare Your Environment (2 minutes)

```bash
# Navigate to project directory
cd /Users/zackstewart/Documents/GitHub/calendar_app

# Ensure dependencies are up to date
flutter pub get

# Clean build artifacts (optional but recommended)
flutter clean
```

### Step 2: Run Schema Validation Tests (5 minutes)

These tests verify that domain models serialize/deserialize correctly:

```bash
flutter test test/schema_validation_test.dart -v
```

**What these tests check** ✅:
- [ ] UserPreferences has all 16 settings fields
- [ ] UserPreferences round-trip conversion preserves all data
- [ ] AvailabilitySignal serializes with correct field names
- [ ] Signals support all 4 types (available, busy, flexible, unavailable)
- [ ] Signals support all duration presets (hour, hours2, hours4, day, custom)
- [ ] CalendarEvent privacy levels serialize correctly (normal, exclusive, superExclusive)
- [ ] CalendarEvent external provider/event ID stored properly
- [ ] CalendarEvent reschedule status persists (5 different states)
- [ ] UserCalendar provider field exists (google, apple, outlook, caldav, myorbit)
- [ ] Notifications serialize with all required fields
- [ ] Contacts handle status and permission enums
- [ ] All enums are complete and valid
- [ ] JSON deserialization handles optional fields

**Expected output**:
```
00:00 +13: Schema Validation Tests: UserPreferences serializes to JSON with correct schema field names ✓
00:00 +14: Schema Validation Tests: UserPreferences round-trip conversion preserves all data ✓
00:00 +15: Schema Validation Tests: AvailabilitySignal serializes with correct schema field names ✓
...
00:10 +40 -1: Schema Validation Tests (completed)
```

All tests should show ✓ (checkmark).

### Step 3: Run Database Field Alignment Tests (3 minutes)

These tests verify that Dart field names align with database column names:

```bash
flutter test test/database_field_alignment_test.dart -v
```

**What these tests check** ✅:
- [ ] UserPreferences field mapping (id, user_id, dark_mode_enabled, etc)
- [ ] AvailabilitySignal field mapping (user_id, signal_type, start_time, end_time)
- [ ] CalendarEvent field mapping (privacy_level, reschedule_status, external_provider)
- [ ] UserCalendar provider field mapping
- [ ] Notification field mapping
- [ ] Contact field mapping
- [ ] Privacy level enum values exactly match database
- [ ] Reschedule status enum values exactly match database
- [ ] Signal type enum values exactly match database
- [ ] Contact status enum values exactly match database
- [ ] Contact permission enum values exactly match database
- [ ] Calendar provider enum values exactly match database

**Expected output**:
```
00:00 +1: Database Field Alignment Tests: User Preferences field mapping is complete ✓
00:00 +2: Database Field Alignment Tests: Availability Signal field mapping is complete ✓
...
00:03 +12 -0: Database Field Alignment Tests (completed)
```

All tests should show ✓ (checkmark).

### Step 4: Run Both Test Suites Together (5 minutes)

```bash
flutter test test/schema_validation_test.dart test/database_field_alignment_test.dart -v
```

**Expected output**:
```
✓ All tests passed
Total: 52 tests
Passed: 52
Failed: 0
```

---

## UNDERSTANDING THE TEST RESULTS

### ✅ If All Tests Pass

**What this means**:
- Domain models match the schema perfectly
- All field names are correct (camelCase in Dart ↔ snake_case in DB)
- All enums have valid values
- JSON serialization/deserialization works
- No data is lost in conversions
- **You are ready for Supabase** ✅

### ❌ If Tests Fail

**What each type of failure means**:

#### "Expected X, got Y"
- **Problem**: Enum value doesn't match
- **Fix**: Check the enum value is correct in the test
- **Example**: If test expects 'exclusive' but enum has 'private'

#### "Field count mismatch"
- **Problem**: Missing fields in model or schema
- **Fix**: Add missing field to domain model or database schema
- **Example**: If test expects 16 fields but UserPreferences has 15

#### "Key error"
- **Problem**: JSON key doesn't match field name
- **Fix**: Update the toJson() method in the domain model
- **Example**: If test sends 'userId' but JSON has 'user_id'

---

## TEST RESULTS INTERPRETATION

### Test 1: UserPreferences Round-Trip
**What it tests**: Settings sync across devices

**Success means**:
```dart
original.darkModeEnabled = true
json = original.toJson()
restored = UserPreferences.fromJson(json)
restored.darkModeEnabled == true ✓ (survives conversion)
```

**Failure would mean**: Settings lost during Supabase sync

### Test 2: AvailabilitySignal Recurrence
**What it tests**: Recurring signals support

**Success means**:
```dart
signal.isRecurring = true
signal.recurrenceRuleId = "rule-123"
json = signal.toJson()
restored = AvailabilitySignal.fromJson(json)
restored.isRecurring == true ✓
restored.recurrenceRuleId == "rule-123" ✓
```

**Failure would mean**: Can't save recurring signals to Supabase

### Test 3: CalendarEvent Privacy Levels
**What it tests**: Privacy filtering

**Success means**:
```dart
event.privacyLevel = EventPrivacyLevel.exclusive
json = event.toJson()
// DB stores exactly: privacy_level = 'exclusive'
restored.privacyLevel == EventPrivacyLevel.exclusive ✓
```

**Failure would mean**: Privacy levels corrupt in Supabase

### Test 4: Calendar Provider Tracking
**What it tests**: Google/Apple Calendar integration

**Success means**:
```dart
calendar.provider = 'google'
calendar.externalCalendarId = 'google-cal-id-123'
json = calendar.toJson()
// DB stores exactly: provider = 'google', external_calendar_id = 'google-cal-id-123'
restored.provider == 'google' ✓
```

**Failure would mean**: Can't track calendar sources in Supabase

### Test 5: Enum Alignment
**What it tests**: Data consistency between Dart and DB

**Success means**:
```
Dart SignalType.available → DB signal_type = 'available' ✓
Dart EventPrivacyLevel.exclusive → DB privacy_level = 'exclusive' ✓
```

**Failure would mean**: Enum values don't match CHECK constraints in DB

---

## WHAT EACH TEST COVERS

| Test Category | # Tests | What It Proves |
|---|---|---|
| UserPreferences | 2 | Settings sync works correctly |
| AvailabilitySignal | 3 | Signals & recurring support work |
| CalendarEvent | 3 | Events, privacy, reschedule, provider tracking work |
| UserCalendar | 1 | Calendar provider field exists |
| Notification | 1 | Notifications can persist in DB |
| Contact | 1 | Contact enums work correctly |
| Enum Completeness | 5 | All enum values are valid |
| Type Safety | 2 | JSON deserialization handles all cases |
| Field Mapping | 6 | All Dart ↔ DB field names match |
| Enum Constraints | 7 | Enum values match DB CHECK constraints |
| **TOTAL** | **31** | **All schema fixes work correctly** |

---

## COMMON TEST ISSUES & SOLUTIONS

### Issue: "No tests found"
**Cause**: Tests not found or incorrect file path
**Solution**:
```bash
# Verify test files exist
ls test/schema_validation_test.dart
ls test/database_field_alignment_test.dart

# If not found, make sure you're in the right directory
pwd  # Should show: /Users/zackstewart/Documents/GitHub/calendar_app
```

### Issue: "Import error: cannot find package"
**Cause**: Dependencies not installed
**Solution**:
```bash
flutter pub get
flutter pub upgrade
```

### Issue: "Test timed out"
**Cause**: Test running too long (shouldn't happen, these tests are fast)
**Solution**:
```bash
# Run with explicit timeout
flutter test test/schema_validation_test.dart --timeout=30s
```

### Issue: "Test X failed with message Y"
**Cause**: Schema doesn't match test expectations
**Solution**:
1. Read the error message carefully
2. Check which test failed
3. Look at that test in the test file
4. Compare expected values to actual values
5. Update either the domain model or the test
6. Run again

---

## VERIFICATION CHECKLIST

Before setting up Supabase, verify:

- [ ] Downloaded latest test files
- [ ] `flutter pub get` runs successfully
- [ ] Both test files exist: `schema_validation_test.dart` and `database_field_alignment_test.dart`
- [ ] Can run: `flutter test test/schema_validation_test.dart -v`
- [ ] Schema validation tests: **ALL PASS** ✅
- [ ] Can run: `flutter test test/database_field_alignment_test.dart -v`
- [ ] Database field alignment tests: **ALL PASS** ✅
- [ ] Combined run (both files): **ALL PASS** ✅
- [ ] Screenshot or log of test results saved
- [ ] No unexpected errors in console
- [ ] Ready to proceed with Supabase setup

---

## WHAT HAPPENS NEXT

### If all tests pass ✅
1. Schema is correct and ready for Supabase
2. No frontend code changes needed
3. Follow `SUPABASE_SETUP_CHECKLIST.md`
4. Everything will work seamlessly

### If tests fail ❌
1. Identify which test failed
2. Read the error message
3. Check the corresponding test in the test file
4. Either:
   - Fix the domain model (if the code is wrong)
   - Fix the test (if the test is wrong)
5. Run tests again
6. Once all pass, proceed to Supabase

---

## FINAL CONFIDENCE CHECK

After all tests pass, you should feel confident that:

✅ All data types are correct (no int vs string mismatches)
✅ All field names are correct (camelCase ↔ snake_case conversions work)
✅ All enums are supported (Dart enums ↔ DB string values)
✅ All required fields are present
✅ Optional fields are handled correctly
✅ Round-trip conversions work (JSON → Dart → JSON → DB)
✅ Calendar provider tracking works
✅ Recurring signals supported
✅ Cross-device settings sync ready
✅ Persistent notifications supported
✅ Event reschedule workflows persistent

**Result**: You're ready to set up Supabase with confidence! 🚀

---

## NEXT STEPS

1. Run the verification tests (10-15 min)
2. All tests pass? ✅ Proceed to `SUPABASE_SETUP_CHECKLIST.md`
3. Any test failures? ❌ Review the error and check the corresponding test

**You've got this!** These tests exist specifically so you can verify everything works before committing to Supabase setup.
