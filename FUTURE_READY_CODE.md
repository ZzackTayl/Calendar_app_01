## Future-Ready Code Inventory

This log captures features and infrastructure we've already implemented in the codebase that are waiting on additional UI polish or backend wiring. Use it as a quick reference when planning upcoming work so we avoid re‑inventing what already exists.

### Availability Signals Platform
- **Domain models:** `AvailabilitySignal`, `SignalShare`, and related enums live under `lib/domain/`.
- **Business logic:** `SignalsService` (`lib/logic/services/signals_service.dart`) handles creation, validation, sharing, cancellation, and visibility calculations.
- **State management:** Riverpod providers in `lib/logic/providers/signal_providers.dart` expose active signals, shared signals, and helper selectors ready for UI hookups.
- **UI affordances implemented:** 
  - Long-press on a calendar day now offers *Create Event* vs. *Signal Availability* (UI work in progress).
  - Event creation warns when overlapping an active signal and lets the user cancel or trim it (front-end only for now).
- **Still pending:** Dedicated signal creation screens, partner selection UI, history view, backend APIs, and push/SMS integration.

### Event & Activity Enhancements
- **Event cards:** Calendar cards now colorize their icon backgrounds based on invited partners, aligning with the future shared-calendar visual language.
- **Activity feed:** Item removal supports undo via SnackBar; once backend storage exists we can wire the undo action to restore the record.

### Settings Infrastructure
- `SettingsState` now persists advanced toggles (notifications, calendar sharing, availability signal channels/buffers).
- Signal alert delivery preference (push / in-app only / SMS) and event buffer settings are surfaced in the Settings UI.
- Additional per-feature toggles can piggyback on the same persistence layer without structural changes.

### Documentation Hooks
- `FRONTEND_IMPLEMENTATION_PLAN.md` and `MISSING_FEATURES_ROADMAP.md` include signal-related todos that will flip to complete once the UI is finished.
- `BACKEND_TASKS.md` (see companion doc) lists the endpoints and background jobs we’re expecting to wire up later.

> **Reminder:** Keep this file updated whenever we land scaffolding for future features so the team has a single source of truth on “what’s already ready under the hood.” 
