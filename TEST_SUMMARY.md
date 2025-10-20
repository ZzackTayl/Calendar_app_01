# Test Summary – February 2025

The goal of this document is to provide an honest snapshot of the current automated test landscape so new engineers know where to focus.

---

## 🧪 Suite Inventory

- **Total test files:** 46 (`find test -name "*_test.dart"`)
- Coverage spans providers, services, widgets, screens, navigation flows, and integrations.
- Notable areas: timezone service, permission service, signal workflows, onboarding, app shell, invite components, calendar sharing, notifications, and API integration tests.

---

## ✅ Current Status

- Latest targeted suites (notifications, signal providers, API mappers) pass after the taxonomy refresh.
- Timezone initialisation is centralised in the shared test helper, preventing previous hangs.
- The calendar sharing widget test uses fake providers to avoid Supabase dependencies, ensuring offline-friendly runs.
- ⚠️ Run `flutter test` before each release to capture new additions; recent edits introduced extra coverage that has not yet been exercised by a full CI run.

---

## 🔬 Focus Areas

- Continue to watch timezone-dependent tests when new environments (CI runners, different OSes) are added.
- Build on the integration coverage by adding more offline/online branching tests.

---

## 📌 Quick Commands

```bash
# Full suite
flutter test

# Coverage report
flutter test --coverage

# Targeted debugging (example)
flutter test --reporter expanded test/screens/calendar_sharing_screen_test.dart
```

---

## 🤝 Expectations for New Contributors

- Keep new tests deterministic—avoid real network or timezone calls; follow the existing patterns of using fake providers.
- Update this document whenever suite health or coverage milestones change.
