# Contacts & Invite Flow (Updated October 29, 2025)

This document summarises how the modern contact/onboarding flow works in the Flutter app today. All screens run inside the Riverpod-based architecture; the previous mock-only flow has been removed.

## Screens involved

1. **Contact permission (onboarding step 5)** – `lib/ui/screens/contact_permission_screen.dart`  
   Requests device contact permission using `permission_handler`. On grant/skip it advances the onboarding state.

2. **Add contact selection (`/add-contact`)** – `lib/ui/screens/add_contact_selection_screen.dart`  
   Two-tab experience within the main app:
   - **From Contacts:** Loads device contacts through `DeviceContactsService`. Supports search, multi-select, and pushes selections into the Riverpod contact queue.
   - **Send Invite:** Uses `SendInviteButton` to push invites through `ApiService` (Supabase when configured, or offline mock when not).

3. **People & Groups (`/people`)** – `lib/ui/screens/people_groups_screen.dart`  
   Shows Connected, Pending, and Contacts tabs. Integrates with onboarding state to finish invite flows, edit names, adjust permissions, and send follow-up invites.

## Flow at a glance

```
Onboarding (step 4) ──▶ ContactPermissionScreen
       │                  └─ permission granted/skip
       ▼
DeviceContactsService.getDeviceContacts()
       │
       └─▶ AddContactSelectionScreen (From Contacts tab)
               ├─ store selection via contact providers
               └─ send invites via ApiService / DevDataService
       ▼
PeopleGroupsScreen (Connected/Pending/Contacts management)
```

## Implementation notes

- **Device contacts:** `DeviceContactsService` wraps the `flutter_contacts` plugin and returns a `Result<List<DeviceContact>>`. On failure it surfaces an error message the UI displays inline.
- **Onboarding state:** `onboardingProvider` tracks wizard progress, snackbar messaging, and navigation. Use the notifier methods to transition between steps rather than pushing routes manually.
- **Offline mode:** When Supabase is not configured the contact providers fall back to `DevDataService`. Invites execute locally and appear under the Pending tab for demonstration purposes.
- **Supabase mode:** When credentials are provided, `ApiService` + `ContactApi` handle invitations, pending queue, and accepted partners. The same UI widgets are reused.
- **Permissions:** Contact-level permission chips (`PartnerPermission`) and event privacy overrides are defined in `lib/domain/contact.dart` and `lib/domain/enums.dart`.

## Testing the flow

- **Automated coverage:** Dedicated widget tests have not yet been added for `AddContactSelectionScreen`. When analyzer/test debt is cleared, add golden/widget coverage to guard the multi-tab UX.
- **Manual smoke test:** From the dashboard tap “Add connection” → verify device contacts appear (grant permission if prompted) → send invite → check Pending/Connected tabs → ensure My Orbit counts update.

## Future integration TODOs

- Persist device contact selections to Supabase once staging credentials are reintroduced.
- Update onboarding copy for the consent dialog once legal review lands.
- Consider wiring the onboarding “Invite method” step directly to `/add-contact` for consistency.

Refer to `CONTACTS_README.md` for implementation detail on the permission screen itself.
