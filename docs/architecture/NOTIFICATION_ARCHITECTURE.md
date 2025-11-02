# 📱 Notification System Architecture Guide

> **Simple explanation of how the notification system works with BLoC and Clean Architecture**

---

## 🎯 What Problem Does This Solve?

The notification system manages user notifications (event reminders, invites, system messages) with:
- ✅ Works online AND offline
- ✅ Syncs with Supabase when connected
- ✅ Stores locally for offline access
- ✅ Automatically cleans up old notifications (14-day retention)
- ✅ Separates business logic from UI

---

## 📊 The Big Picture: How It Works

```
USER TAPS BUTTON                                        UI UPDATES
       ↓                                                     ↑
[UI Widget] ──→ [BLoC] ──→ [Use Case] ──→ [Repository] ──→ [Data Source]
                  ↑                                            ↓
                  └────────────── [Result] ←───────────────┘
```

**In plain English:**
1. User taps "Mark as Read" button
2. Widget sends event to BLoC
3. BLoC calls the "Mark As Read" use case
4. Use case validates and calls repository
5. Repository syncs to Supabase (if online) and saves locally
6. Result comes back through the chain
7. BLoC updates state
8. Widget rebuilds with new state

---

## 🏗️ Architecture Layers

### Layer 1: Domain (Business Rules) 📋
**Location:** `lib/domain/`

**What it contains:**
- `Notification` model - What a notification looks like
- `NotificationRepository` interface - What operations we can do
- Use cases - Business rules (e.g., "deduplication", "14-day retention")

**Think of it as:** The rules of the game. No implementation details, just what should happen.

**Example:**
```dart
// This is the RULE: notifications older than 14 days should be deleted
class ApplyRetentionRulesUseCase {
  Future<Result<int>> execute(List<Notification> notifications) {
    final cutoff = DateTime.now().subtract(Duration(days: 14));
    // Business logic here...
  }
}
```

---

### Layer 2: Data (How We Store & Fetch) 💾
**Location:** `lib/data/`

**What it contains:**
- `NotificationRepositoryImpl` - Implementation that combines remote + local
- `NotificationRemoteDataSource` - Talks to Supabase
- `NotificationLocalDataSource` - Talks to SharedPreferences

**Think of it as:** The actual implementation of data storage. Domain layer says "get notifications", data layer knows HOW.

**Example:**
```dart
// Repository decides WHERE to get data from
Future<Result<List<Notification>>> getNotifications() async {
  if (!SupabaseService.isConfigured) {
    return getMockNotifications(); // Offline mode
  }

  try {
    final remote = await remoteDataSource.getNotifications(); // Try Supabase
    await localDataSource.saveLocalNotifications(remote); // Cache it
    return Success(remote);
  } catch (e) {
    return await getLocalNotifications(); // Fallback to cache
  }
}
```

---

### Layer 3: Presentation (State Management) 🎨
**Location:** `lib/presentation/bloc/notification/`

**What it contains:**
- `NotificationEvent` - Things the user can do (tap buttons, refresh, etc.)
- `NotificationState` - Current state of notifications (loading, loaded, error)
- `NotificationBloc` - Coordinator between UI and business logic

**Think of it as:** The traffic controller. Takes user actions (events), calls business logic (use cases), and tells UI what to show (states).

**Example:**
```dart
// User taps "Mark All Read" button
class MarkAllNotificationsAsRead extends NotificationEvent {}

// BLoC handles it:
void _onMarkAllAsRead(event, emit) async {
  final result = await _markAllAsReadUseCase.execute();

  result.when(
    success: (_) => emit(NotificationLoaded(...)), // ✅ Update UI
    failure: (msg) => emit(NotificationError(msg)), // ❌ Show error
  );
}
```

---

## 🔌 How to Wire It All Together (Dependency Injection)

### Step 1: Create Data Sources
```dart
// These talk to actual storage
final remoteDataSource = NotificationRemoteDataSource();
final localDataSource = NotificationLocalDataSource();
```

### Step 2: Create Repository
```dart
// Repository uses both data sources
final repository = NotificationRepositoryImpl(
  remoteDataSource: remoteDataSource,
  localDataSource: localDataSource,
);
```

### Step 3: Create Use Cases
```dart
// Each use case gets the repository
final getNotificationsUseCase = GetNotificationsUseCase(repository);
final markAsReadUseCase = MarkNotificationAsReadUseCase(repository);
final dismissUseCase = DismissNotificationUseCase(repository);
// ... 7 more use cases
```

### Step 4: Create BLoC
```dart
// BLoC gets all the use cases
final notificationBloc = NotificationBloc(
  getNotificationsUseCase: getNotificationsUseCase,
  markAsReadUseCase: markAsReadUseCase,
  dismissUseCase: dismissUseCase,
  // ... all 10 use cases
);
```

### Step 5: Provide to Widget Tree (Using flutter_bloc)
```dart
RepositoryProvider<NotificationRepository>(
  create: (context) => NotificationRepositoryImpl(
    remoteDataSource: NotificationRemoteDataSource(),
    localDataSource: NotificationLocalDataSource(),
  ),
  child: BlocProvider<NotificationBloc>(
    create: (context) {
      final repository = context.read<NotificationRepository>();

      // Create all use cases
      final getNotificationsUseCase = GetNotificationsUseCase(repository);
      // ... create other use cases

      return NotificationBloc(
        getNotificationsUseCase: getNotificationsUseCase,
        // ... inject all use cases
      );
    },
    child: MyApp(),
  ),
)
```

---

## 📱 How to Use in UI

### Example: Notifications Screen

```dart
class NotificationsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<NotificationBloc, NotificationState>(
      builder: (context, state) {
        // Handle different states
        if (state is NotificationLoading) {
          return CircularProgressIndicator();
        }

        if (state is NotificationLoaded) {
          final notifications = state.notifications;
          final unreadCount = state.unreadCount; // Pre-computed!

          return ListView.builder(
            itemCount: notifications.length,
            itemBuilder: (context, index) {
              final notification = notifications[index];
              return NotificationTile(notification: notification);
            },
          );
        }

        if (state is NotificationError) {
          return Text('Error: ${state.message}');
        }

        return SizedBox.shrink();
      },
    );
  }
}
```

### Example: Mark as Read Button

```dart
IconButton(
  icon: Icon(Icons.done),
  onPressed: () {
    // Dispatch event to BLoC
    context.read<NotificationBloc>().add(
      MarkNotificationAsRead(notification.id),
    );
  },
)
```

### Example: Pull to Refresh

```dart
RefreshIndicator(
  onRefresh: () async {
    context.read<NotificationBloc>().add(RefreshNotifications());

    // Wait for loading to complete
    await context.read<NotificationBloc>().stream.first;
  },
  child: NotificationsList(),
)
```

---

## 🔄 Data Flow Examples

### Example 1: Loading Notifications (App Startup)

```
1. Widget builds → shows loading spinner
2. BLoC receives LoadNotifications event
3. BLoC calls GetNotificationsUseCase
4. Use case calls Repository.getNotifications()
5. Repository tries Supabase (if online)
   ├─ Success → saves to local cache → returns notifications
   └─ Failure → reads from local cache → returns cached notifications
6. Use case applies retention rules (deletes old ones)
7. Use case returns Result<List<Notification>>
8. BLoC emits NotificationLoaded(notifications, unreadCount, centerVisible)
9. Widget rebuilds → shows notification list
```

**Time:** ~500ms online, ~50ms offline (cached)

---

### Example 2: Marking Notification as Read

```
1. User taps notification
2. Widget dispatches MarkNotificationAsRead(id)
3. BLoC receives event
4. BLoC calls MarkNotificationAsReadUseCase
5. Use case:
   a. Updates notification locally (optimistic update)
   b. Saves to SharedPreferences
   c. If online: syncs to Supabase
6. Use case returns Success()
7. BLoC updates state with modified notification
8. Widget rebuilds → notification shows as read ✓
```

**Time:** ~50ms (instant for user, sync happens in background)

---

### Example 3: Dismissing All Notifications

```
1. User taps "Clear All" button
2. Widget dispatches DismissAllNotifications()
3. BLoC calls DismissAllNotificationsUseCase
4. Use case:
   a. Filters notifications where showInCenter=true
   b. Marks all as dismissed locally
   c. Saves to SharedPreferences
   d. If online: bulk dismiss via Supabase API
5. BLoC emits updated state
6. Widget rebuilds → notification center is empty
```

**Time:** ~100ms (even for 50+ notifications)

---

## 🎓 Key Concepts Explained Simply

### What is a "Use Case"?
**Think of it as:** A single action a user wants to do.

**Examples:**
- MarkNotificationAsReadUseCase = "Mark this notification as read"
- DismissAllNotificationsUseCase = "Clear all notifications"
- ApplyRetentionRulesUseCase = "Delete old notifications"

**Why use cases?**
- Business rules are in ONE place (not scattered)
- Easy to test (mock the repository)
- Can reuse across different UIs (mobile, web, desktop)

---

### What is "Result<T>" Type?
**Think of it as:** A box that either contains data OR an error message.

```dart
// Instead of throwing exceptions:
try {
  final data = await dangerousFunction();
} catch (e) {
  // handle error
}

// We use Result:
final result = await safeFunction();
result.when(
  success: (data) => print('Got data: $data'),
  failure: (message, exception) => print('Error: $message'),
);
```

**Why?**
- Forces you to handle errors (can't forget)
- No try-catch spaghetti code
- Type-safe error handling

---

### What is "Optimistic Update"?
**Think of it as:** Show the change immediately, sync in background.

**Example:**
```dart
// User taps "Mark as Read"
1. Update UI immediately (notification looks read) ← OPTIMISTIC
2. Save to local storage (fast, always works)
3. Sync to Supabase (slow, might fail) ← ACTUAL
4. If sync fails: keep local change, show warning
```

**Why?**
- App feels instant (no waiting for network)
- Works offline
- Better user experience

---

### What are "Computed Properties" in State?
**Think of it as:** Pre-calculating expensive operations once, reuse many times.

```dart
class NotificationLoaded extends NotificationState {
  final List<Notification> notifications; // All notifications (500+)
  final int unreadCount;                  // Pre-computed (3 unread)
  final List<Notification> centerVisible; // Pre-computed (12 visible)

  // Widget can access instantly without recalculating:
  Text('You have ${state.unreadCount} unread notifications')
}
```

**Why?**
- UI doesn't recalculate on every build (performance)
- Consistent values across widgets
- Business logic in one place

---

## 🛡️ Critical Business Rules

### 1. 14-Day Retention Policy
- Notifications older than 14 days are auto-deleted
- Applied on app startup and refresh
- Deleted from both local and remote storage

### 2. 3-Day Center Visibility
- Only notifications from last 3 days show in notification center
- Older ones still in history (activity feed)
- Automatically dismissed after 3 days

### 3. Deduplication
- Can't add notification with duplicate ID
- Prevents duplicate banners/toasts
- Checked in AddNotificationUseCase

### 4. Offline-First
- All operations save locally first
- Remote sync happens in background
- App works without internet

---

## 🧪 Testing Strategy

### Unit Tests (Use Cases)
```dart
test('MarkAsReadUseCase marks notification as read', () async {
  // Mock repository
  final mockRepo = MockNotificationRepository();
  when(mockRepo.markAsReadRemote('123')).thenAnswer((_) async => Success(null));

  // Create use case with mock
  final useCase = MarkNotificationAsReadUseCase(mockRepo);

  // Execute
  final result = await useCase.execute('123');

  // Verify
  expect(result, isA<Success>());
  verify(mockRepo.markAsReadRemote('123')).called(1);
});
```

### BLoC Tests
```dart
blocTest<NotificationBloc, NotificationState>(
  'emits NotificationLoaded when LoadNotifications succeeds',
  build: () => NotificationBloc(/* mock use cases */),
  act: (bloc) => bloc.add(LoadNotifications()),
  expect: () => [
    NotificationLoading(),
    NotificationLoaded(notifications: [...], unreadCount: 3),
  ],
);
```

### Widget Tests
```dart
testWidgets('shows notifications when loaded', (tester) async {
  await tester.pumpWidget(
    BlocProvider<NotificationBloc>(
      create: (_) => mockBloc,
      child: NotificationsScreen(),
    ),
  );

  expect(find.text('Event Reminder'), findsOneWidget);
});
```

---

## 🚀 Quick Start Checklist

- [x] ✅ Domain layer created (repository interface, use cases)
- [x] ✅ Data layer created (repository impl, data sources)
- [x] ✅ Presentation layer created (BLoC, events, states)
- [ ] ⏳ Wire up DI in app initialization
- [ ] ⏳ Migrate existing UI from Riverpod to BLoC
- [ ] ⏳ Add unit tests
- [ ] ⏳ Add integration tests

---

## 📚 File Reference

```
lib/
├── domain/
│   ├── notification.dart                    # Notification model
│   ├── repositories/
│   │   └── notification_repository.dart     # Interface
│   └── use_cases/notifications/
│       ├── get_notifications_use_case.dart
│       ├── mark_notification_as_read_use_case.dart
│       ├── dismiss_notification_use_case.dart
│       └── ... (7 more use cases)
│
├── data/
│   ├── datasources/
│   │   ├── remote/
│   │   │   └── notification_remote_data_source.dart  # Supabase
│   │   └── local/
│   │       └── notification_local_data_source.dart   # SharedPrefs
│   └── repositories/
│       └── notification_repository_impl.dart         # Implementation
│
└── presentation/bloc/notification/
    ├── notification_event.dart              # User actions
    ├── notification_state.dart              # UI states
    └── notification_bloc.dart               # State management
```

---

## ❓ Common Questions

**Q: Why so many files? Isn't this overkill?**
A: Each file has ONE job. Easy to find bugs, easy to test, easy for new developers.

**Q: What if I just want to add a notification?**
A: `context.read<NotificationBloc>().add(AddNotification(notification));` - that's it!

**Q: What happens if Supabase is down?**
A: App still works! Uses local cache. Syncs when connection returns.

**Q: How do I debug issues?**
A: Check `developer.log()` messages. Every layer logs what it's doing.

**Q: Can I use this for web/desktop?**
A: Yes! Domain layer is pure Dart. Just change data sources (LocalStorage instead of SharedPreferences).

---

## 🎉 Benefits of This Architecture

✅ **Testable** - Mock any layer easily
✅ **Maintainable** - Change one layer without affecting others
✅ **Scalable** - Add new use cases without modifying existing code
✅ **Offline-First** - Works without internet
✅ **Type-Safe** - Catches errors at compile time
✅ **Clear Separation** - UI, business logic, and data are separate
✅ **Easy to Understand** - Each file does ONE thing

---

**Made with ❤️ using Clean Architecture + BLoC Pattern**
