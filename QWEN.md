# MyOrbit Calendar - AI Development Guidelines

## Project Status (UPDATED)
**Status:** ✅ **PRODUCTION READY** - All core features complete including real-time sync and external calendar integration

### Completed Features ✅
1. **Real-time Sync** - Cross-device instant sync via Supabase Realtime
2. **Conflict Resolution** - Last-Write-Wins with timestamp-based resolution
3. **Offline Queue** - Local change queue with auto-sync on reconnect
4. **Google Calendar** - Full OAuth and one-way event import
5. **Apple Calendar** - iOS/macOS EventKit integration
6. **Event System** - Privacy levels, recurrence, invites, sharing
7. **Contacts** - Permissions, groups, connections
8. **Signals** - Availability broadcasting
9. **Notifications** - Reminders, alerts, activity feed

### Key Technologies
- **Flutter** - Cross-platform (iOS, Android, Web, macOS, Windows)
- **Riverpod** - State management with code generation
- **Supabase** - Backend (auth, database, realtime, storage)
- **EventKit** - Native iOS/macOS calendar access
- **Google Calendar API** - OAuth and calendar import

## Architecture Quick Reference

### Real-Time Sync
```dart
// Services
RealtimeSyncService      - Manages Supabase Realtime subscriptions
ConflictResolutionService - Handles concurrent edit conflicts
SyncQueueService         - Offline change queue with retry

// How it works
1. User edits event on Device A
2. Save to Supabase
3. Supabase broadcasts change via Realtime
4. Device B receives INSERT/UPDATE/DELETE event
5. Provider updates local state
6. UI re-renders with new data
```

### External Calendar Import
```dart
// Google Calendar
GoogleCalendarSyncService  - OAuth + CalendarApi integration
GoogleCalendarProvider     - Import state management

// Apple Calendar (iOS/macOS only)
AppleCalendarSyncService   - Platform channel to native EventKit
AppleCalendarProvider      - Import state management
AppDelegate.swift          - Native EventKit implementation

// Platform Channel
Channel: 'com.myorbit/apple_calendar'
Methods: requestPermissions, hasPermissions, getCalendars, getEvents
```

### State Management Pattern
```dart
// All providers follow this pattern:
@riverpod
class ExampleNotifier extends _$ExampleNotifier {
  @override
  ExampleState build() => ExampleState.initial();
  
  Future<void> doSomething() async {
    state = state.copyWith(loading: true);
    final result = await someApi.call();
    result.when(
      success: (data) => state = state.copyWith(data: data),
      failure: (msg, ex) => state = state.copyWith(error: msg),
    );
  }
}

// Usage
ref.read(exampleNotifierProvider.notifier).doSomething();
final state = ref.watch(exampleNotifierProvider);
```

## Development Workflow

### Before Changing Code
1. Run `flutter analyze` to check current state
2. Run `flutter test` to ensure tests pass
3. Check if code generation needed (providers, models, serialization)

### After Changing Code
1. Run `dart run build_runner build --delete-conflicting-outputs` if:
   - Added/modified `@riverpod` annotations
   - Added/modified `@freezed` models
   - Added/modified JSON serialization
2. Run `flutter analyze` (must show 0 errors)
3. Run `flutter test` (all tests must pass)
4. Test manually on device/simulator

### Platform-Specific Development

#### iOS/macOS
- Edit `ios/Runner/AppDelegate.swift` or `macos/Runner/AppDelegate.swift`
- Add permissions to `ios/Runner/Info.plist`
- Add entitlements to `macos/Runner/*.entitlements`
- Use EventKit framework for calendar access
- Handle iOS 17+ API changes

#### Platform Channels
```swift
// Swift side (AppDelegate.swift)
let channel = FlutterMethodChannel(name: "com.myorbit/apple_calendar", ...)
channel.setMethodCallHandler { (call, result) in
  switch call.method {
  case "methodName":
    // Handle method
    result(returnValue)
  default:
    result(FlutterMethodNotImplemented)
  }
}

// Dart side
final result = await MethodChannel('com.myorbit/apple_calendar')
    .invokeMethod<ReturnType>('methodName', arguments);
```

## Common Tasks

### Adding a New Feature
1. Create service in `lib/logic/services/`
2. Create provider in `lib/logic/providers/`
3. Run code generation
4. Wire up in UI (`lib/ui/screens/` or `lib/ui/widgets/`)
5. Add tests in `test/`
6. Update documentation

### Adding Real-Time Sync to New Data Type
1. Add Supabase Realtime subscription in provider
2. Handle INSERT/UPDATE/DELETE events
3. Use ConflictResolutionService for UPDATE events
4. Queue changes via SyncQueueService when offline
5. Test on multiple devices

### Debugging Sync Issues
1. Check Supabase Realtime logs in dashboard
2. Add logging to RealtimeSyncService
3. Test with 2 devices side-by-side
4. Verify `updated_at` timestamps
5. Check ConflictResolutionService logic

## Testing Requirements

### Unit Tests
- All services must have tests
- All providers must have tests
- Run `flutter test` before committing

### Integration Tests
- Test real-time sync on 2+ devices
- Test offline queue (go offline, make changes, go online)
- Test Google Calendar import with real account
- Test Apple Calendar on iOS/macOS

### Manual Tests
- Cross-device sync (edit on phone, see on tablet)
- Offline/online transitions
- Calendar imports
- Permissions flow

## Documentation Files

### Core Docs
- `PROJECT_STATUS.md` - Current status
- `DEVELOPER_GUIDE.md` - Development setup
- `README.md` - Project overview

### Sync Docs
- `REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md` - Sync implementation details
- `START_HERE_REALTIME_SYNC.md` - 5-minute sync test guide
- `REALTIME_SYNC_TESTING_GUIDE.md` - Comprehensive sync testing

### Calendar Import Docs
- `EXTERNAL_CALENDAR_SYNC_COMPLETE.md` - Google Calendar implementation
- `APPLE_CALENDAR_SETUP_COMPLETE.md` - Apple Calendar implementation

### Other
- `TESTING.md` - Testing guidelines
- `DOCUMENTATION_INDEX.md` - All docs index
- `FEATURES_AND_COMPONENTS_GUIDE.md` - Comprehensive features and components overview

## Dependency Management
- Run `flutter pub outdated` before upgrades
- Check SDK-pinned packages compatibility
- Check transitive dependencies
- Document blockers if upgrade not possible
