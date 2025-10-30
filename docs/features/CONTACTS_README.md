# Contact Permission Screen (Updated October 29, 2025)

`lib/ui/screens/contact_permission_screen.dart` implements step 5 of the onboarding flow (device contact permission). This file documents how the screen works today and how to hook it up when Supabase onboarding is reactivated.

## Current behaviour

- Uses the real [`permission_handler`](https://pub.dev/packages/permission_handler) plugin to request `Permission.contacts`.
- When permission is granted, calls the provided `onPermissionGranted` callback immediately.
- When permission is denied, shows an alert dialog with a shortcut to `openAppSettings()`.
- The UI matches the latest onboarding visuals (gradient background, step indicator, semantic labels).
- A “Skip” button calls `onPermissionGranted` so the onboarding flow can advance without contacts.

## Related files

```
lib/
├── domain/contact.dart                  # Contact domain model (Riverpod providers consume this)
├── logic/services/device_contacts_service.dart  # Fetches device contacts via flutter_contacts
├── logic/services/permission_service.dart       # Shared permission helpers
├── logic/providers/onboarding_provider.dart     # Owns onboarding state & navigation
└── ui/screens/contact_permission_screen.dart    # This screen
```

The screen is typically invoked from `OnboardingScreen` step 5 via `onboardingProvider`. It is **not** registered in `createAppRouter` by default; embed it as part of the wizard flow rather than pushing a top-level route.

## Embedding in onboarding

```dart
ContactPermissionScreen(
  currentStep: 5,
  totalSteps: 8,
  onPermissionGranted: () => ref
      .read(onboardingProvider.notifier)
      .advanceFromContactPermission(),
  onBack: () => ref
      .read(onboardingProvider.notifier)
      .goToPreviousStep(),
);
```

The notifier methods above are illustrative—consult `onboarding_provider.dart` for the exact API you expose.

## Backend readiness

When Supabase onboarding is active again:

1. Use `DeviceContactsService.getDeviceContacts()` to pull contacts after permission is granted.
2. Persist the selection via `ContactApi` or the offline cache.
3. Update onboarding metrics (`onboardingProvider`) to record completion.

## Design references

- Gradients / palette live in `AppGradients.backgroundFor`.
- Typography uses `responsiveText` helpers.
- Icons are kept under `icons/` (`icons/contact_permission_icon.webp` etc.).

Keep this README up to date whenever the onboarding flow changes or permissions logic is centralised elsewhere.
