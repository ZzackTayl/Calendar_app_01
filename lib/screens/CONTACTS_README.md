# Contact Permission Screen

## Overview
Contact permission screen that matches the app design, with proper architecture for backend integration.

## Current Implementation (Mock)
- Uses `MockContactsService` for UI development
- Returns fake contact data for testing
- Simulates permission requests with delays

## Files Structure

```
lib/
├── models/
│   └── contact.dart              # Contact data model & PermissionStatus enum
├── services/
│   └── contacts_service.dart     # Service interface + Mock implementation
└── screens/
    └── contact_permission_screen.dart  # UI component
```

## How to Use

### In Routes (already configured in main.dart):
```dart
Navigator.pushNamed(context, '/contact-permission');
```

### Standalone Usage:
```dart
ContactPermissionScreen(
  currentStep: 5,
  totalSteps: 8,
  onPermissionGranted: () {
    // Handle success
  },
  onBack: () {
    // Handle back
  },
)
```

## Backend Integration (Later)

### Replace Mock with Real Service:

1. **Add permission package to pubspec.yaml:**
```yaml
dependencies:
  permission_handler: ^11.0.0
  contacts_service: ^0.6.3
```

2. **Create RealContactsService:**
```dart
class RealContactsService implements ContactsService {
  @override
  Future<PermissionStatus> requestPermission() async {
    // Use permission_handler package
    final status = await Permission.contacts.request();
    // Convert to our PermissionStatus enum
  }
  
  @override
  Future<List<Contact>> getContacts() async {
    // Use contacts_service package
    final contacts = await ContactsService.getContacts();
    // Convert to our Contact model
  }
}
```

3. **Swap in main.dart or use dependency injection:**
```dart
// Instead of MockContactsService, use:
final ContactsService _contactsService = RealContactsService();
```

4. **Update platform permissions:**
   - iOS: Add to Info.plist
   - Android: Add to AndroidManifest.xml
   - See package documentation for specifics

## Design Specs
- Background: #E6F3FF
- Primary button: #FF6B35
- Icon background: #FFE4D6
- Privacy section background: #FFF5F0
- Privacy text color: #D84315

## Mock Data
Currently returns 5 mock contacts with names, emails, and phone numbers for testing UI.

