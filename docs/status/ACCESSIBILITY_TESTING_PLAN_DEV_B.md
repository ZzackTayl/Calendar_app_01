# Accessibility Testing Plan - Developer B
**Date:** October 22, 2025  
**Owner:** Developer B  
**Status:** ⏳ Waiting on Stream A (localization generation)  
**Reference:** Production Readiness Playbook - Stream B Tasks 3-5

---

## Executive Summary

This document outlines the accessibility regression testing plan that will be executed once Developer A completes Stream A (build pipeline recovery). Historical audits from Oct 2024 identified critical accessibility issues that need verification.

**Blocker:** Cannot run widget tests until `flutter gen-l10n` generates localization files.

---

## Previously Identified Issues (Oct 2024)

### 🚨 High Priority: Calendar Screen - Text Scaling Overflow

**Issue:** 42 RenderFlex overflow exceptions at 200% text scaling  
**Location:** `lib/ui/screens/calendar_screen.dart:1195:20`  
**WCAG Violation:** 1.4.4 Resize text (Level AA)

**Details:**
- Calendar day cells use fixed height (64px)
- Content grows with text scaling but container doesn't adapt
- Results in "overflowed by 13 pixels" errors at 200% scale

**Fix Options Documented:**
1. Use `minHeight` instead of fixed `height`
2. Scale cell size with `textScaleFactor`
3. Use `FittedBox` for text content

**Status:** ❓ Unknown if fixed - needs verification

---

### ⚠️ Medium Priority: Contrast Issues

**Issue:** Text contrast below WCAG AA standards (4.5:1)  
**Locations:**
- Dashboard: "Here's what's happening" subtitle (3.68:1)
- Calendar: Similar subtitle text

**Fix Applied (Oct 2024):**
- Changed `alpha: 0.7` → `alpha: 0.9` in multiple screens
- Per `CONTRAST_LABEL_FIXES_SUMMARY.md`

**Files Modified:**
- `lib/ui/screens/dashboard_screen.dart`
- `lib/ui/screens/events_list_screen.dart`
- `lib/ui/screens/create_event_screen.dart`

**Status:** ✅ Reportedly fixed - needs re-verification

---

### ⚠️ Low Priority: Missing Semantic Labels

**Issue:** IconButtons without tooltips/labels  
**Impact:** Screen readers can't announce button purpose

**Fix Applied (Oct 2024):**
- Added tooltips to various screens:
  - `onboarding_screen.dart`
  - `change_log_screen.dart`
  - `people_groups_screen.dart`
  - `notifications_screen.dart`

**Status:** ✅ Reportedly fixed - needs re-verification

---

## Testing Resources Available

### 1. Accessibility Test Files

**Location:** `test/widgets/accessibility/`

| File | Purpose | Tests |
|------|---------|-------|
| `semantic_text_test.dart` | Tests SemanticText widgets | SemanticText, SemanticHeading, SemanticLiveText, SemanticImage |
| `semantic_card_test.dart` | Tests SemanticCard widgets | Card accessibility wrappers |
| `semantic_button_test.dart` | Tests SemanticButton widgets | Button accessibility wrappers |

### 2. Screen Tests with Accessibility Checks

**Tests that include WCAG matchers:**
- `calendar_screen_test.dart` - 16 tests (3 failing in Oct 2024)
- `dashboard_screen_test.dart` - 32 tests (all passing after fixes)
- Multiple other screen tests (see Grep results)

### 3. Documentation

**Best Practices:**
- `Resources_For_Agents/Accessibility/accessibility_flutter_best_practices.md`
  - WCAG 2.1 guidelines
  - Flutter-specific implementations
  - Testing procedures

**Historical Reports:**
- `docs/archive/status_reports/2024-10/CALENDAR_ACCESSIBILITY_BUGS_FOUND.md`
- `docs/archive/status_reports/2024-10/DASHBOARD_ACCESSIBILITY_BUG_FOUND.md`
- `docs/archive/status_reports/2024-10/CONTRAST_LABEL_FIXES_SUMMARY.md`

---

## Testing Plan (Post Stream A)

### Phase 1: Automated Test Execution (1-2 hours)

**Prerequisites:**
- ✅ Developer A has run `flutter gen-l10n`
- ✅ Localization files committed to repo
- ✅ `flutter test` passes baseline tests

**Actions:**

1. **Run full test suite:**
   ```bash
   flutter test
   ```
   - Expected: ~580 specs passing (per PROJECT_STATUS.md)
   - Currently: 459 passing / 21 failing

2. **Run accessibility-specific tests:**
   ```bash
   flutter test test/widgets/accessibility/
   flutter test test/screens/ --name="WCAG"
   ```

3. **Identify failures:**
   - Document any new accessibility test failures
   - Compare against Oct 2024 baseline
   - Prioritize by WCAG severity

### Phase 2: Calendar Screen Deep Dive (2-3 hours)

**Focus:** Verify 200% text scaling overflow fix

**Test Matrix:**

| Text Scale | Expected | Test Command |
|------------|----------|--------------|
| 100% (default) | ✅ Pass | Normal test run |
| 150% | ✅ Pass | Test with MediaQuery override |
| 200% (WCAG req) | ✅ Pass | Critical test |
| 300% (stress test) | 🤷 Best effort | Edge case |

**Code to Add (if not present):**
```dart
testWidgets(
  'GIVEN 200% text scaling WHEN calendar renders THEN no overflow',
  (tester) async {
    await tester.pumpApp(
      MediaQuery(
        data: const MediaQueryData(textScaleFactor: 2.0),
        child: const CalendarScreen(),
      ),
    );
    
    // Should not throw overflow exceptions
    expect(tester.takeException(), isNull);
  },
);
```

**Manual Testing:**
1. Run app on iOS simulator
2. Settings → Accessibility → Display & Text Size → Larger Text
3. Set to maximum (200%+)
4. Navigate to Calendar screen
5. Verify:
   - ✅ No yellow/black overflow stripes
   - ✅ All text visible
   - ✅ Day cells expand appropriately
   - ✅ UI remains usable

### Phase 3: Contrast Verification (1 hour)

**Test Command:**
```bash
flutter test test/screens/ --name="contrast"
```

**Expected:** All tests pass with `meetsGuideline(textContrastGuideline)`

**Screens to Verify:**
- ✅ Dashboard
- ✅ Calendar
- ✅ Events List
- ✅ Create Event
- ✅ Notifications

**If Failures Found:**
1. Document contrast ratio (expected: ≥4.5:1 for normal text)
2. Identify color values
3. Calculate fix (usually increase alpha from 0.7 to 0.9)
4. Apply fix
5. Re-test

### Phase 4: Touch Target Verification (30 min)

**Test Command:**
```bash
flutter test --name="tap target"
```

**Expected:** All interactive elements meet minimum size:
- Android: 48x48 dp
- iOS: 44x44 pt

**Matchers to Verify:**
```dart
await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
```

### Phase 5: Semantic Labels Audit (1 hour)

**Test Command:**
```bash
flutter test --name="labeled"
```

**Expected:** All interactive elements have semantic labels

**Matcher:**
```dart
await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
```

**Manual Verification:**
1. Enable Flutter Semantics Debugger:
   ```dart
   // In main.dart
   MaterialApp(
     showSemanticsDebugger: true,
     // ...
   )
   ```
2. Run app and visually inspect semantic tree
3. Verify all buttons/tappables show labels

### Phase 6: Screen Reader Testing (2 hours)

**Platform: iOS (VoiceOver)**

1. Enable VoiceOver:
   - Settings → Accessibility → VoiceOver → On
   
2. Test Key Flows:
   - ✅ Navigate Dashboard
   - ✅ Create Event
   - ✅ View Calendar
   - ✅ Open Notifications
   - ✅ Manage Contacts

3. Verify:
   - ✅ All interactive elements announced
   - ✅ Announcement text is meaningful
   - ✅ Focus order is logical
   - ✅ Gestures work as expected

**Platform: Android (TalkBack)**

1. Enable TalkBack:
   - Settings → Accessibility → TalkBack → On
   
2. Repeat key flow tests from iOS

3. Verify Android-specific behaviors

---

## Success Criteria

### Must Pass (Blockers for Production)

- ✅ `flutter test` completes with 0 failures
- ✅ All WCAG Level AA guidelines met:
  - ✅ Text contrast ≥ 4.5:1
  - ✅ Touch targets ≥ 48x48dp (Android) / 44x44pt (iOS)
  - ✅ All interactive elements labeled
  - ✅ 200% text scaling works without overflow
- ✅ Screen reader navigation works on iOS + Android

### Should Pass (High Priority)

- ✅ Calendar screen has no overflow at 300% text scaling
- ✅ Focus order follows visual flow
- ✅ Live regions announce dynamic content
- ✅ Keyboard navigation works (web/desktop)

### Nice to Have (Future Work)

- 🤷 High contrast mode support
- 🤷 Reduced motion support
- 🤷 Bold text support
- 🤷 Colorblind simulation testing

---

## Issue Tracking Template

When accessibility issues are found, document using this template:

```markdown
### Issue: [Brief Description]

**Severity:** [High/Medium/Low]  
**WCAG Guideline:** [e.g., 1.4.3 Contrast Minimum]  
**Impact:** [Who is affected and how]

**Location:**
- File: `path/to/file.dart`
- Line: [line number]
- Widget: [widget type]

**Current State:**
- [What's wrong]
- [Test output if applicable]

**Expected State:**
- [What should happen]
- [WCAG requirement]

**Proposed Fix:**
```dart
// Code change here
```

**Testing:**
- [ ] Automated test passes
- [ ] Manual verification on device
- [ ] Screen reader verified
```

---

## Timeline & Coordination

### Dependencies

**Blocked On:**
- ⏳ Developer A completes Stream A (localization generation)
- ⏳ `flutter test` baseline passes

**Estimated Start:** After Developer A completes (TBD in coordination meeting)

**Estimated Duration:** 8-10 hours total
- Phase 1: 1-2 hours
- Phase 2: 2-3 hours
- Phase 3: 1 hour
- Phase 4: 30 min
- Phase 5: 1 hour
- Phase 6: 2 hours
- Documentation: 1 hour

### Deliverables

Upon completion, Developer B will provide:

1. ✅ Accessibility test results summary
2. ✅ List of issues found (if any) with severity
3. ✅ Fixes implemented (if issues found)
4. ✅ Updated PROJECT_STATUS.md with accessibility section
5. ✅ Screen recording of VoiceOver/TalkBack testing

---

## Resources & Tools

### Testing Tools

**Built-in:**
- `flutter_test` package matchers
- Flutter Semantics Debugger (`showSemanticsDebugger: true`)
- Flutter DevTools Accessibility Scanner

**External:**
- Android Accessibility Scanner (OS app)
- Xcode Accessibility Inspector
- WebAIM Contrast Checker

**Package Options:**
- `flutter_accessibility_scanner` (3rd party WCAG checker)

### Reference Materials

**WCAG 2.1 Guidelines:**
- [1.4.3 Contrast (Minimum) - Level AA](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [1.4.4 Resize Text - Level AA](https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html)
- [2.5.5 Target Size - Level AAA](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [4.1.2 Name, Role, Value - Level A](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)

**Flutter Docs:**
- [Flutter Accessibility](https://docs.flutter.dev/development/accessibility-and-localization/accessibility)
- [Testing for accessibility](https://docs.flutter.dev/testing/accessibility)

---

## Risk Assessment

### Low Risk Areas

- ✅ Semantic widgets already exist (SemanticText, SemanticButton, etc.)
- ✅ Previous fixes documented and reportedly working
- ✅ Comprehensive test suite in place
- ✅ Good documentation available

### Medium Risk Areas

- ⚠️ Calendar screen overflow may not be fixed yet
- ⚠️ Recent UI changes may have regressed contrast
- ⚠️ New screens may not have accessibility tests

### High Risk Areas

- 🚨 None identified - this is primarily verification work

### Mitigation Strategies

- Run automated tests first to catch obvious regressions
- Focus manual testing on previously problematic areas (calendar)
- Document all findings clearly for team review
- Create issues for any new problems found

---

## Next Steps (Immediate)

1. ✅ Share this plan with Developer A and team
2. ⏳ Wait for Developer A to complete Stream A
3. ⏳ Coordinate handoff in next team meeting
4. ⏳ Execute testing plan when unblocked
5. ⏳ Update PROJECT_STATUS.md with results

---

**Plan created by Developer B on October 22, 2025**  
**Status:** Ready to execute once Stream A completes  
**Estimated Effort:** 8-10 hours of focused testing work
