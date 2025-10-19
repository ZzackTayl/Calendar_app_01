# MyOrbit Calendar - AI Development Guidelines

## Project Status (UPDATED)
**Last Updated:** January 2025  
**Status:** ✅ **PRODUCTION READY** with complete sync and external calendar integration

### Core Features COMPLETE ✅
1. **Real-time Cross-Device Sync** - Supabase Realtime, instant sync across all devices
2. **Conflict Resolution** - Last-Write-Wins strategy with timestamp-based conflict handling
3. **Offline Sync Queue** - Queues changes offline, auto-syncs when connection restored
4. **Google Calendar Import** - Full OAuth integration, one-way import of events
5. **Apple Calendar Import** - iOS/macOS EventKit integration via platform channels
6. **Event Management** - Full CRUD with privacy levels, recurrence, invites
7. **Contact Management** - Permissions, groups, connection requests
8. **Availability Signals** - Time-based availability sharing with contact-specific visibility
9. **Notification System** - Event reminders, connection alerts, calendar changes

### Recent Major Implementations
- **Real-time Sync Services** (`RealtimeSyncService`, `ConflictResolutionService`, `SyncQueueService`)
- **Google Calendar Integration** (`GoogleCalendarSyncService`, OAuth flow, event import)
- **Apple Calendar Integration** (iOS `AppDelegate.swift`, macOS `AppDelegate.swift`, EventKit)
- **Calendar Migration UI** (Unified import screen for both Google and Apple)
- **Platform Channels** (`com.myorbit/apple_calendar` for native EventKit access)

## Architecture Overview

### State Management
- **Riverpod** providers throughout (`event_providers.dart`, `contact_providers.dart`, `google_calendar_provider.dart`, `apple_calendar_provider.dart`)
- **Real-time listeners** wired into providers for instant sync
- **Generated providers** with `build_runner` (all `.g.dart` files)

### Backend Integration
- **Supabase** for all data persistence
- **Row Level Security** policies enforce user isolation
- **Realtime subscriptions** for events, contacts, availability signals
- **CalendarApi** for CRUD operations

### External Calendar Sync
- **Google Calendar:** OAuth → CalendarApi → Import events → Save to Supabase
- **Apple Calendar:** EventKit permission → Platform channel → Import events → Save to Supabase
- **One-way import only** (external → MyOrbit, no export)

### Sync Architecture
- **Real-time:** Supabase Realtime WebSocket subscriptions
- **Conflict handling:** Last-Write-Wins based on `updated_at` timestamps
- **Offline queue:** Local persistence with retry on reconnect
- **Platform support:** All platforms (iOS, Android, Web, macOS, Windows)

## Key Files & Services

### Sync Services
- `lib/logic/services/realtime_sync_service.dart` - Manages Supabase Realtime subscriptions
- `lib/logic/services/conflict_resolution_service.dart` - Resolves concurrent edit conflicts
- `lib/logic/services/sync_queue_service.dart` - Offline change queue with retry logic

### Calendar Import Services
- `lib/logic/services/google_calendar_sync_service.dart` - Google Calendar OAuth & import
- `lib/logic/services/apple_calendar_sync_service.dart` - Apple Calendar platform channel
- `lib/logic/providers/google_calendar_provider.dart` - Google import state management
- `lib/logic/providers/apple_calendar_provider.dart` - Apple import state management

### Native Platform Code
- `ios/Runner/AppDelegate.swift` - iOS EventKit integration (136 lines)
- `macos/Runner/AppDelegate.swift` - macOS EventKit integration (136 lines)
- `ios/Runner/Info.plist` - Calendar permissions (`NSCalendarsUsageDescription`, `NSCalendarsFullAccessUsageDescription`)
- `macos/Runner/*.entitlements` - Calendar access entitlement (`com.apple.security.personal-information.calendars`)

### UI Integration
- `lib/ui/screens/calendar_migration_screen.dart` - Unified import UI for Google & Apple

## Development Rules

### Dependency Management
- Run `flutter pub outdated` before upgrading any package
- Verify SDK-pinned packages (`flutter_test`, `integration_test`) support new versions
- Check transitive dependencies (e.g., `encrypt` → `pointycastle`)
- If blocked, keep current version and document the blocker

### Code Generation
- Always run `dart run build_runner build --delete-conflicting-outputs` after:
  - Adding/modifying Riverpod providers (`@riverpod` annotations)
  - Adding/modifying Freezed models (`@freezed` annotations)
  - Adding/modifying JSON serialization (`@JsonSerializable`)

### Testing Requirements
- Run `flutter test` before committing
- Run `flutter analyze` to ensure 0 errors/warnings
- Test real-time sync on 2+ devices
- Test offline queue (disconnect, make changes, reconnect)
- Test Google Calendar import with real Google account
- Test Apple Calendar import on iOS/macOS devices

### Platform-Specific Development

#### iOS/macOS (Swift)
- Use EventKit for calendar access
- Request permissions before accessing calendars
- Handle iOS 17+ `requestFullAccessToEvents` vs older `requestAccess`
- Use ISO8601DateFormatter for date serialization
- Return data to Dart via FlutterResult callbacks

#### Flutter Platform Channels
- Channel name: `com.myorbit/apple_calendar`
- Methods: `requestPermissions`, `hasPermissions`, `getCalendars`, `getEvents`
- Always handle PlatformException in Dart
- Use MethodChannel for bidirectional communication

### Sync Implementation Guidelines
- **Never poll** - Always use Supabase Realtime subscriptions
- **Always timestamp** - Use `updated_at` for conflict resolution
- **Queue offline changes** - Never lose data due to connectivity
- **Handle conflicts gracefully** - Last-Write-Wins is current strategy
- **Test edge cases** - Concurrent edits, offline/online transitions, slow networks

## Documentation References
- **Sync Implementation:** `REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md`
- **Sync Testing:** `REALTIME_SYNC_TESTING_GUIDE.md`, `START_HERE_REALTIME_SYNC.md`
- **Google Calendar:** `EXTERNAL_CALENDAR_SYNC_COMPLETE.md`
- **Apple Calendar:** `APPLE_CALENDAR_SETUP_COMPLETE.md`
- **Project Status:** `PROJECT_STATUS.md`
- **Developer Guide:** `DEVELOPER_GUIDE.md`
- **Features and Components Guide:** `FEATURES_AND_COMPONENTS_GUIDE.md`
