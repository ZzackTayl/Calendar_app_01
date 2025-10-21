# Test Summary – October 2025

`flutter test --reporter expanded` (run 2025-10-20) executes 454 specs. All assertions pass after adjusting the conflict-resolution merge semantics.

---

## 🧪 Suite Inventory
- **Test files:** 50 (`find test -name "*_test.dart"`), covering providers, services, widgets, screens, navigation, and integration glue.
- **Key focus areas:** timezone helpers, permission flows, onboarding, signal workflows, app shell navigation, calendar migration, reminder scheduling, and API adapters.

---

## ✅ What Passes
- All widget, screen, and integration harnesses now build again after reverting the Google Sign-In singleton usage.
- Google/Apple calendar import tests run in mock mode without compilation errors.
- Widget smoke tests (`test/widget_test.dart`) succeed using the secure-storage fallback (Keychain accessibility now uses `first_unlock`).
- Reminder scheduling, notification helpers, and navigation flows complete without runtime exceptions (aside from the existing reminder initialization warning logs).

---

## 🎯 Next Steps
1. Capture coverage (`flutter test --coverage`) and update any QA dashboards.
2. Manually exercise real-time sync and calendar import flows on devices before claiming production readiness.

---

## 📌 Handy Commands
```bash
# Full suite
flutter test --reporter expanded

# Coverage
flutter test --coverage
```

---

Keep this document aligned with the latest `flutter test` run. Update the table whenever failures change or new areas need targeted attention.
