# Test Failures Analysis

## Summary
- **Total Tests**: 324
- **Passing**: 306
- **Failing**: 18
- **Pass Rate**: 94.4%

## Failure Categories

### 1. Landing Screen Overflow (1 failure)
**File**: `test/widget_test.dart`
**Issue**: Row at line 132 overflows by 40 pixels
**Root Cause**: The button text "Sign up for early access" + icon + spacing is too wide for small screens (424px width in test)
**Fix**: Wrap Row in Flexible or reduce padding/text size

### 2. Navigation Tests - Ambiguous Text Finders (5 failures)
**Files**: 
- `test/navigation_test.dart` (2 failures)
- `test/integration/navigation_flow_test.dart` (3 failures)

**Issue**: `find.text('Calendar')` finds 2 widgets:
1. AppBar title "Calendar" in CalendarScreen
2. NavigationBar label "Calendar"

**Fix**: Use more specific finders:
- `find.widgetWithText(NavigationDestination, 'Calendar')` for nav items
- Or use keys on navigation items

### 3. Calendar Screen Scrollable Test (1 failure)
**File**: `test/screens/calendar_screen_test.dart`
**Issue**: Expected `SingleChildScrollView` but found 0
**Root Cause**: CalendarScreen doesn't have a SingleChildScrollView - it uses Column with Expanded
**Fix**: Update test to match actual implementation (no scrollview needed)

### 4. Dashboard Accessibility Test (1 failure)
**File**: `test/screens/dashboard_screen_test.dart`
**Issue**: Found 2 widgets with semantic label "MyOrbit logo"
**Root Cause**: Logo appears twice in widget tree (possibly in header and elsewhere)
**Fix**: Make test expect `findsWidgets` instead of `findsOneWidget`, or ensure only one logo has the semantic label

### 5. Error Widget Tests - Duplicate Widgets (6 failures)
**Files**:
- `test/widgets/error/error_view_test.dart` (3 failures)
- `test/widgets/error/empty_state_test.dart` (2 failures)

**Issue**: Tests find 2 Center widgets, 2 Text widgets with same content
**Root Cause**: ErrorView/EmptyState are wrapped in test scaffold which adds extra Center/Text
**Fix**: Use more specific finders or adjust test setup

### 6. Snackbar Tests (3 failures)
**File**: `test/widgets/error/error_view_test.dart`
**Issue**: `ScaffoldMessenger.showSnackBar` called without descendant Scaffolds
**Root Cause**: Test doesn't wrap widget in Scaffold/ScaffoldMessenger
**Fix**: Wrap test widget in ScaffoldMessenger.of(context) or MaterialApp with Scaffold

## Priority Fixes

1. **High Priority** (breaks core functionality):
   - Navigation tests (5 failures) - affects navigation testing
   - Snackbar tests (3 failures) - affects error handling testing

2. **Medium Priority** (incorrect expectations):
   - Calendar scrollable test (1 failure)
   - Dashboard accessibility test (1 failure)
   - Error widget tests (6 failures)

3. **Low Priority** (cosmetic):
   - Landing screen overflow (1 failure)

## Fix Strategy

1. Fix navigation tests by using specific finders with keys
2. Fix snackbar tests by adding proper scaffold wrapper
3. Fix calendar test by removing scrollview expectation
4. Fix dashboard test by adjusting semantic expectations
5. Fix error widget tests by using more specific finders
6. Fix landing screen by making button responsive