# Contact Flow Documentation

## Screens Created

### 1. Contact Permission Screen (`/contact-permission`)
- **Step:** 5 of 8 (63%)
- Shows permission request UI with privacy promise
- Uses mock service to simulate permission request
- On success, navigates to Add Contacts Method screen

### 2. Add Contacts Method Screen (`/add-contacts-method`)
- **Step:** 7 of 8 (88%)
- Shows two options:
  1. Add as contacts for reference (no calendar access)
  2. Invite them to the app (full calendar sharing)
- Displays selected contacts (currently shows Riley Chen)
- On completion, navigates to dashboard

## How to Test the Flow

### Option 1: Direct Navigation
Add a button anywhere in your app:
```dart
ElevatedButton(
  onPressed: () {
    Navigator.pushNamed(context, '/contact-permission');
  },
  child: Text('Test Contact Flow'),
)
```

### Option 2: From Landing/Onboarding
Integrate into your existing onboarding flow by navigating to `/contact-permission` at the appropriate step.

### Option 3: Test URLs (Web)
- These routes are **not** registered by default. Add temporary routes for `/contact-permission` and `/add-contacts-method` in `createAppRouter` before using direct URLs.

## Flow Sequence

1. User taps "Allow Contact Access" on permission screen
2. Mock service simulates permission grant (500ms delay)
3. Navigates to method selection screen
4. User selects add method (reference or invite)
5. User taps "Add Contacts"
6. Navigates to dashboard

## Mock Data

**Riley Chen** is shown as selected contact with:
- Initials: RC
- Blue circle avatar (#4A90E2)
- Full name displayed

## Customization

To change selected contacts in `/add-contacts-method` route, edit `main.dart`:
```dart
selectedContacts: [
  Contact(id: '1', name: 'Your Name', email: 'email@example.com'),
  // Add more contacts
],
```

## Backend Integration (Future)

Both screens are ready for backend integration:
- Permission requests use `ContactsService` interface
- Easy to swap `MockContactsService` with real implementation
- See `CONTACTS_README.md` for details
