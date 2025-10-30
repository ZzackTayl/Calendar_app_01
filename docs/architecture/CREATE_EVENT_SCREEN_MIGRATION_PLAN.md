# Create Event Screen Migration Plan

## Overview
This document outlines the migration of `create_event_screen.dart` from Riverpod to BLoC, demonstrating both:
1. **BLoC Navigation Pattern** - Navigation in BlocListener, not in BLoC
2. **Configurable Widget Pattern** - Using CardConfig for consistent UI

## Current State (Before Migration)

### State Management
- **Framework**: Riverpod (`ConsumerStatefulWidget`)
- **Provider Used**: `eventListProvider.notifier`
- **Navigation**: Direct `Navigator.of(context).pop(true)` at line 1540

### UI Pattern
- **Card Styling**: Custom `_cardDecoration()` method (lines 484-514)
- **Repeated Pattern**: Every card section manually creates `Container` with decoration

### Key Issues
1. ❌ Using Riverpod while migrating to BLoC
2. ❌ Inconsistent card styling (manual decoration each time)
3. ❌ Navigation tightly coupled with save logic

## Target State (After Migration)

### State Management
- **Framework**: BLoC (`StatefulWidget` + `BlocConsumer`)
- **BLoC Used**: `EventBloc`
- **Navigation**: In `BlocListener` responding to `EventOperationSuccess` state

### UI Pattern
- **Card Styling**: `ConfigurableCard` widget with `CardConfig`
- **Consistency**: All cards use same configuration system
- **Maintainability**: Easy to change card styling app-wide

## Detailed Changes

### 1. Imports (Lines 1-21)
**Before:**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/event_providers.dart';
```

**After:**
```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../presentation/bloc/event/event_bloc.dart';
import '../../presentation/bloc/event/event_event.dart';
import '../../presentation/bloc/event/event_state.dart';
import '../../core/config/card_config.dart';
import '../widgets/core/configurable_card.dart';
```

**Reason**: Switch from Riverpod to BLoC imports, add widget configuration imports.

---

### 2. Widget Declaration (Lines 29-50)
**Before:**
```dart
class CreateEventScreen extends ConsumerStatefulWidget {
  // ...
  @override
  ConsumerState<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends ConsumerState<CreateEventScreen> {
```

**After:**
```dart
class CreateEventScreen extends StatefulWidget {
  // ...
  @override
  State<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends State<CreateEventScreen> {
```

**Reason**: Remove Riverpod dependency, use standard StatefulWidget.

---

### 3. Build Method Wrapper (Line 187)
**Before:**
```dart
@override
Widget build(BuildContext context) {
  final contacts = ref.watch(connectedPartnersProvider);
  // ... rest of UI
}
```

**After:**
```dart
@override
Widget build(BuildContext context) {
  return BlocConsumer<EventBloc, EventState>(
    listener: (context, state) {
      // NAVIGATION LOGIC HERE - BLoC Pattern ✅
      if (state is EventOperationSuccess) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(state.message)),
        );
        // Navigate away - this is where navigation happens!
        Navigator.of(context).pop(true);
      } else if (state is EventError) {
        // Show error
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(state.message)),
        );
      } else if (state is EventLoading) {
        // Update local loading state
        setState(() {
          _isLoading = true;
        });
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    },
    builder: (context, state) {
      // UI rendering stays the same
      return _buildScaffold(context);
    },
  );
}

Widget _buildScaffold(BuildContext context) {
  final contacts = ref.watch(connectedPartnersProvider);
  // ... existing UI code
}
```

**Reason**:
- ✅ Navigation now happens in `BlocListener`, NOT in BLoC or save method
- ✅ Separation of concerns: listener for side effects, builder for UI
- ✅ Demonstrates correct BLoC navigation pattern

---

### 4. Card Decoration Replacement
**Before (Lines 484-514):**
```dart
BoxDecoration _cardDecoration(AppPalette palette) {
  final borderColor = palette.isDark
      ? AppColors.cardBorderBabyBlue
      : AppColors.cardBorderBabyBlue.withValues(alpha: 0.6);

  return BoxDecoration(
    gradient: palette.isDark
        ? const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
          )
        : null,
    color: palette.isDark ? null : Colors.white,
    border: Border.all(color: borderColor, width: 1.5),
    borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
    boxShadow: [/* ... */],
  );
}
```

**After:**
```dart
// Method deleted - no longer needed!
// CardConfig handles this automatically
```

**Before Usage (Example - Lines 268-317):**
```dart
Container(
  decoration: _cardDecoration(palette),
  padding: const EdgeInsets.all(24),
  margin: const EdgeInsets.only(bottom: 16),
  child: Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text('Schedule', style: labelStyle),
      const SizedBox(height: 12),
      _buildScheduleSummaryChip(...),
      // ... more content
    ],
  ),
)
```

**After Usage:**
```dart
ConfigurableCardSection(
  title: 'Schedule',
  child: Column(
    children: [
      _buildScheduleSummaryChip(...),
      const SizedBox(height: 16),
      Text('Use the edit controls...'),
      const SizedBox(height: 16),
      Row(children: [/* buttons */]),
    ],
  ),
)
```

**Code Reduction**:
- Before: ~15 lines per card
- After: ~3 lines per card
- **Savings**: ~12 lines × 8 card sections = **~96 lines removed**

---

### 5. Save Event Method (Lines 1420-1555)
**Before:**
```dart
Future<void> _saveEvent() async {
  // ... validation ...

  setState(() {
    _isLoading = true;
  });

  try {
    final eventListNotifier = ref.read(eventListProvider.notifier);

    if (widget.eventToEdit != null) {
      await eventListNotifier.updateEvent(event);
    } else {
      await eventListNotifier.addEvent(event);
    }

    if (mounted) {
      Navigator.of(context).pop(true); // ❌ Navigation in save method
    }
  } catch (e) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving event: $e')),
      );
    }
  } finally {
    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }
}
```

**After:**
```dart
Future<void> _saveEvent() async {
  // ... validation ...

  // Build candidate event
  final event = CalendarEvent(/* ... */);

  // Dispatch event to BLoC - that's it!
  if (widget.eventToEdit != null) {
    context.read<EventBloc>().add(UpdateEvent(event));
  } else {
    context.read<EventBloc>().add(CreateEvent(event));
  }

  // NO navigation here! ✅
  // Navigation happens in BlocListener when EventOperationSuccess is emitted
}
```

**Reason**:
- ✅ BLoC handles async operation and state management
- ✅ No manual setState for loading
- ✅ No try/catch boilerplate
- ✅ No navigation logic in save method
- **Code Reduction**: ~40 lines → ~10 lines

---

## Benefits Summary

### BLoC Pattern Benefits
1. ✅ **Correct Navigation**: Navigation in UI layer (BlocListener), not in business logic
2. ✅ **State Management**: Centralized in EventBloc, no scattered setState calls
3. ✅ **Testability**: Easy to test BLoC without UI, easy to test UI without real BLoC
4. ✅ **Consistency**: Same pattern as UserBloc and future migrations

### Configurable Widget Benefits
1. ✅ **Code Reduction**: ~96 lines removed from card decorations alone
2. ✅ **Consistency**: All cards guaranteed to look the same
3. ✅ **Maintainability**: Change CardConfig, update all cards app-wide
4. ✅ **Future-Ready**: Easy to add Firebase Remote Config for A/B testing

### Overall Impact
- **Lines Removed**: ~150+ lines
- **Complexity Reduced**: Simpler, more maintainable code
- **Patterns Demonstrated**: Both BLoC navigation and widget configuration working together
- **Migration Template**: Other screens can follow this exact pattern

## Testing Strategy

### 1. Manual Testing
- [ ] Create new event - should navigate away on success
- [ ] Edit existing event - should update and navigate away
- [ ] Trigger validation error - should show error, NOT navigate
- [ ] Trigger network error - should show error, NOT navigate
- [ ] Cancel event creation - should navigate away without saving
- [ ] Dark mode - cards should render correctly
- [ ] Light mode - cards should render correctly

### 2. BLoC Testing
- [ ] CreateEvent with valid data → EventOperationSuccess
- [ ] UpdateEvent with valid data → EventOperationSuccess
- [ ] CreateEvent with API error → EventError
- [ ] Navigation only happens on EventOperationSuccess, NOT on error

### 3. Widget Testing
- [ ] ConfigurableCard renders correctly
- [ ] CardConfig.standard() matches old _cardDecoration()
- [ ] Dark mode card styling correct
- [ ] Light mode card styling correct

## Rollout Plan

### Phase 1: Create Migration (This PR)
- Migrate create_event_screen.dart
- Verify functionality matches existing behavior
- Test navigation pattern thoroughly
- Document any issues

### Phase 2: Monitor (1-2 days)
- Monitor for any regressions
- Collect user feedback
- Fix any edge cases

### Phase 3: Template Other Screens (After Phase 2 success)
- Use this migration as template for:
  - calendar_screen.dart
  - people_groups_screen.dart
  - Other Riverpod screens

## Questions to Address

1. **Should we keep Riverpod providers temporarily?**
   - Yes, keep `connectedPartnersProvider` for contacts until we migrate contacts to BLoC

2. **What about error handling?**
   - BlocListener shows SnackBar for EventError
   - No navigation on error (stays on screen for user to fix)

3. **Loading state management?**
   - EventLoading state triggers local `_isLoading = true`
   - Keeps button disabled during save operation

## Next Steps

1. Review this migration plan
2. Confirm approach is correct
3. Execute migration
4. Test thoroughly
5. Document lessons learned
6. Create template for other screens
