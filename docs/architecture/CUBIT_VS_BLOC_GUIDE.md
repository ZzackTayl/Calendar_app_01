# Cubit vs BLoC Decision Guide

## Overview
This guide helps you choose between **Cubit** (lightweight, 2 files) and **BLoC** (full pattern, 3 files) for state management.

**General Rule**: Use Cubit for 80% of cases, BLoC for 20% of complex cases.

---

## Quick Decision Tree

```
Is this state management for...
├─ Simple UI state (toggles, selections, visibility)?
│  └─ ✅ Use CUBIT
│
├─ Async operations (API calls, database)?
│  └─ ✅ Use BLOC
│
├─ Navigation triggers?
│  └─ ✅ Use BLOC
│
├─ Complex business logic?
│  └─ ✅ Use BLOC
│
└─ Local-only synchronous state?
   └─ ✅ Use CUBIT
```

---

## File Structure Comparison

### Cubit Structure (2 files)
```
lib/presentation/cubit/expansion/
├── expansion_state.dart    ← State definition
└── expansion_cubit.dart    ← Logic (direct methods, no events)
```

### BLoC Structure (3 files)
```
lib/presentation/bloc/event/
├── event_event.dart    ← Event definitions (CreateEvent, UpdateEvent, etc.)
├── event_state.dart    ← State definitions
└── event_bloc.dart     ← Event handlers and business logic
```

---

## When to Use CUBIT

### ✅ Perfect for Simple UI State

| Use Case | Example | Why Cubit? |
|----------|---------|------------|
| **Expansion Toggles** | `_isPrivacyExpanded`, `_isInviteesExpanded` | Simple boolean, synchronous |
| **Tab Selection** | Current tab index in bottom nav | Just an integer, no async |
| **Filter Selection** | Selected filter in list screen | Local UI state |
| **Theme Toggle** | Dark mode on/off | Synchronous preference |
| **Visibility Toggles** | Show/hide password, tooltips | Simple boolean |
| **Search Query** | User's search input string | Local string state |
| **Sort Order** | Ascending/descending | Simple enum |

### Example: Expansion State (CUBIT) ✅

**Files needed**: 2

`expansion_state.dart`:
```dart
class ExpansionState extends Equatable {
  final bool isPrivacyExpanded;
  final bool isInviteesExpanded;

  const ExpansionState({
    this.isPrivacyExpanded = false,
    this.isInviteesExpanded = false,
  });

  @override
  List<Object?> get props => [isPrivacyExpanded, isInviteesExpanded];
}
```

`expansion_cubit.dart`:
```dart
class ExpansionCubit extends Cubit<ExpansionState> {
  ExpansionCubit() : super(const ExpansionState());

  // Direct methods - NO EVENTS!
  void togglePrivacyExpansion() {
    emit(state.copyWith(
      isPrivacyExpanded: !state.isPrivacyExpanded,
    ));
  }
}
```

**Usage in UI**:
```dart
// Provide Cubit
BlocProvider(
  create: (_) => ExpansionCubit(),
  child: CreateEventScreen(),
)

// Use in widget
BlocBuilder<ExpansionCubit, ExpansionState>(
  builder: (context, state) {
    return ExpansionPanel(
      isExpanded: state.isPrivacyExpanded,
      onTap: () => context.read<ExpansionCubit>().togglePrivacyExpansion(),
    );
  },
)
```

**Benefits**:
- ✅ Simple: 2 files instead of 3
- ✅ Direct calls: `cubit.togglePrivacy()` instead of `bloc.add(TogglePrivacy())`
- ✅ Less boilerplate
- ✅ Easier to understand

---

## When to Use BLOC

### ✅ Perfect for Complex Operations

| Use Case | Example | Why BLoC? |
|----------|---------|-----------|
| **Data Operations** | Creating/updating/deleting events | Async API calls |
| **Navigation Triggers** | Navigate after successful save | EventOperationSuccess state |
| **Authentication** | Login/logout workflows | Complex async logic |
| **Form Submission** | Validate + submit to API | Multi-step async process |
| **Real-time Sync** | Listening to database changes | Async streams |
| **Multi-step Workflows** | Onboarding flow with validation | Complex state machine |

### Example: Event Management (BLOC) ✅

**Files needed**: 3

`event_event.dart`:
```dart
abstract class EventEvent extends Equatable {
  const EventEvent();
}

class CreateEvent extends EventEvent {
  final CalendarEvent event;
  const CreateEvent(this.event);

  @override
  List<Object?> get props => [event];
}

class UpdateEvent extends EventEvent {
  final CalendarEvent event;
  const UpdateEvent(this.event);

  @override
  List<Object?> get props => [event];
}
```

`event_state.dart`:
```dart
abstract class EventState extends Equatable {
  const EventState();
}

class EventInitial extends EventState {
  const EventInitial();
}

class EventLoading extends EventState {
  const EventLoading();
}

class EventOperationSuccess extends EventState {
  final String message;
  final CalendarEvent? event;

  const EventOperationSuccess({required this.message, this.event});

  @override
  List<Object?> get props => [message, event];
}
```

`event_bloc.dart`:
```dart
class EventBloc extends Bloc<EventEvent, EventState> {
  final EventRepository eventRepository;

  EventBloc({required this.eventRepository}) : super(const EventInitial()) {
    on<CreateEvent>(_onCreateEvent);
    on<UpdateEvent>(_onUpdateEvent);
  }

  Future<void> _onCreateEvent(CreateEvent event, Emitter<EventState> emit) async {
    emit(const EventLoading());

    final result = await eventRepository.createEvent(event.event);

    result.when(
      success: (createdEvent) {
        emit(EventOperationSuccess(
          message: 'Event created successfully',
          event: createdEvent,
        ));
      },
      failure: (message, _) {
        emit(EventError(message: message));
      },
    );
  }
}
```

**Usage in UI**:
```dart
BlocConsumer<EventBloc, EventState>(
  listener: (context, state) {
    // Navigation triggered by state change
    if (state is EventOperationSuccess) {
      Navigator.of(context).pop();
    }
  },
  builder: (context, state) {
    return ElevatedButton(
      onPressed: () {
        // Dispatch event
        context.read<EventBloc>().add(CreateEvent(event));
      },
      child: Text('Save'),
    );
  },
)
```

**Benefits**:
- ✅ Clear event tracking (audit log of what happened)
- ✅ Testable event handlers
- ✅ Separation of business logic from UI
- ✅ Navigation in listener (correct pattern)

---

## Real Examples from Codebase

### CUBIT Examples (Simple UI State) ✅

Found in `create_event_screen.dart`:
```dart
// BEFORE (StatefulWidget with setState)
bool _isPrivacyExpanded = false;

setState(() {
  _isPrivacyExpanded = !_isPrivacyExpanded;
});

// AFTER (Cubit)
context.read<ExpansionCubit>().togglePrivacyExpansion();
```

Found in `dashboard_screen.dart`:
```dart
// BEFORE
bool _isSignalsExpanded = false;

// AFTER (Cubit candidate)
context.read<DashboardExpansionCubit>().toggleSignals();
```

Found in `activity_screen.dart`:
```dart
// BEFORE
bool _isOlderExpanded = false;

// AFTER (Cubit candidate)
context.read<ActivityExpansionCubit>().toggleOlder();
```

### BLOC Examples (Complex Operations) ✅

**EventBloc**: Handles async API calls, navigation triggers
**UserBloc**: Handles user CRUD operations, network requests
**AuthBloc** (future): Complex authentication workflows

---

## Migration Strategy

### Current State
- ❌ Many screens use `setState` for simple UI state
- ✅ EventBloc and UserBloc correctly use BLoC pattern
- ⚠️ Need to identify which states should use Cubit

### Phase 1: Convert Simple Toggles to Cubit
Target all `bool _isExpanded` variables:
- `create_event_screen.dart` → ExpansionCubit
- `dashboard_screen.dart` → DashboardExpansionCubit
- `activity_screen.dart` → ActivityExpansionCubit
- `notifications_screen.dart` → NotificationExpansionCubit

### Phase 2: Keep Complex Operations as BLoC
- EventBloc (async operations, navigation)
- UserBloc (async operations, navigation)
- Future: AuthBloc, ContactsBloc, etc.

---

## Decision Checklist

Before creating new state management, ask:

### Use CUBIT if ALL are true:
- [ ] No async operations (no API calls, no database)
- [ ] No navigation triggers
- [ ] Simple data types (bool, int, string, enum)
- [ ] UI-only concern (doesn't persist)
- [ ] Synchronous updates

### Use BLOC if ANY are true:
- [ ] Requires async operations (API, database, streams)
- [ ] Triggers navigation
- [ ] Complex business logic
- [ ] Needs event sourcing/audit trail
- [ ] Multiple async sources (API + realtime sync)

---

## Testing Comparison

### Testing Cubit (Simple)
```dart
test('togglePrivacyExpansion changes state', () {
  final cubit = ExpansionCubit();

  expect(cubit.state.isPrivacyExpanded, false);

  cubit.togglePrivacyExpansion();

  expect(cubit.state.isPrivacyExpanded, true);
});
```

### Testing BLoC (More Complex)
```dart
blocTest<EventBloc, EventState>(
  'CreateEvent emits EventOperationSuccess',
  build: () => EventBloc(eventRepository: mockRepository),
  act: (bloc) => bloc.add(CreateEvent(testEvent)),
  expect: () => [
    EventLoading(),
    EventOperationSuccess(message: 'Event created successfully'),
  ],
);
```

---

## Summary

| Criteria | CUBIT | BLOC |
|----------|-------|------|
| **Files** | 2 (state, cubit) | 3 (event, state, bloc) |
| **Async** | ❌ No | ✅ Yes |
| **Navigation** | ❌ No | ✅ Yes |
| **Complexity** | Simple | Complex |
| **Use Cases** | 80% (UI state) | 20% (business logic) |
| **Examples** | Toggles, tabs, filters | API calls, workflows |
| **Events** | Direct methods | Event classes |
| **Testing** | Simple unit tests | BlocTest with expectations |

**Remember**:
- Cubit is a **subset** of BLoC (less features, simpler)
- Start with Cubit, migrate to BLoC only when needed
- Don't over-engineer simple UI state with full BLoC

---

## Next Steps

1. ✅ Use ExpansionCubit for `create_event_screen.dart` toggles
2. ✅ Keep EventBloc for event CRUD operations
3. Create similar Cubits for other screens with simple UI state
4. Reserve BLoC for data operations and navigation triggers
