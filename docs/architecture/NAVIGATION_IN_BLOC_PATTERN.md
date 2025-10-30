# Navigation in BLoC Pattern - Best Practices

## Overview

This document outlines the correct pattern for handling navigation and routing in a Flutter application using the BLoC (Business Logic Component) pattern. The fundamental principle is:

**Navigation logic MUST be executed in the Presentation Layer (screens/widgets) in response to state changes, NOT inside BLoC or Cubit classes.**

## Why This Matters

### Separation of Concerns
- **BLoCs/Cubits** should handle business logic and state management only
- **Widgets** should handle UI presentation and navigation
- Mixing navigation in BLoCs violates Single Responsibility Principle (SRP)

### Testability
- BLoCs with navigation logic require mocking `BuildContext` and navigation
- Pure BLoCs (no navigation) can be tested with simple unit tests
- Navigation can be tested separately in widget/integration tests

### Reusability
- BLoCs without navigation logic can be reused across different screens
- The same state can trigger different navigation in different contexts

## Current State of the Codebase

### ✅ Good News: No Violations Found

After auditing the codebase, I found:
- **UserBloc** ([user_bloc.dart](../../lib/presentation/bloc/user/user_bloc.dart)) contains NO navigation logic
- All navigation calls use `context.push()` or `context.pop()` and are properly located in screen widgets
- The current architecture already follows best practices

### Current Navigation Implementation

Navigation in the codebase currently uses **go_router** and is implemented directly in screen widgets:

**Examples from the codebase:**
1. [add_contact_selection_screen.dart:160](../../lib/ui/screens/add_contact_selection_screen.dart#L160) - Close dialog
2. [add_contact_selection_screen.dart:416](../../lib/ui/screens/add_contact_selection_screen.dart#L416) - Navigate back after success
3. [people_groups_screen.dart:208](../../lib/ui/screens/people_groups_screen.dart#L208) - Navigate to add contact

## The Correct Pattern: BlocListener/BlocConsumer

When using BLoC pattern, navigation should be triggered using `BlocListener` or `BlocConsumer` widgets in response to state changes.

### Pattern Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                Screen Widget                          │   │
│  │                                                       │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │         BlocListener/BlocConsumer          │     │   │
│  │  │                                             │     │   │
│  │  │  listen: (context, state) {                │     │   │
│  │  │    if (state is SuccessState) {            │     │   │
│  │  │      Navigator.push(...) ← NAVIGATION HERE │     │   │
│  │  │    }                                        │     │   │
│  │  │  }                                          │     │   │
│  │  └────────────────────────────────────────────┘     │   │
│  │                                                       │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │         BlocBuilder (for UI)                │     │   │
│  │  │  Renders UI based on state                  │     │   │
│  │  └────────────────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ Events
                            ↑ States
┌─────────────────────────────────────────────────────────────┐
│                      Logic Layer (BLoC)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  UserBloc/Cubit                       │   │
│  │                                                       │   │
│  │  - Handles events                                    │   │
│  │  - Emits states                                      │   │
│  │  - NO navigation logic                               │   │
│  │  - NO BuildContext usage                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Examples

### Example 1: Simple Navigation After User Creation

#### ❌ INCORRECT - Navigation in BLoC

```dart
// DON'T DO THIS!
class UserBloc extends Bloc<UserEvent, UserState> {
  final BuildContext context; // ❌ BLoC should NOT depend on BuildContext

  UserBloc({required this.context}) : super(UserInitial()) {
    on<CreateUser>(_onCreateUser);
  }

  Future<void> _onCreateUser(CreateUser event, Emitter<UserState> emit) async {
    emit(UserLoading());

    final result = await userRepository.createUser(event.user);

    result.when(
      success: (user) {
        emit(UserCreated(user));

        // ❌ WRONG! Navigation should NOT be here
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => UserDetailScreen(user: user)),
        );
      },
      failure: (message, _) {
        emit(UserError(message));
      },
    );
  }
}
```

#### ✅ CORRECT - Navigation in Widget with BlocListener

```dart
// BLoC - Clean, testable, no navigation
class UserBloc extends Bloc<UserEvent, UserState> {
  final UserRepository userRepository;

  UserBloc({required this.userRepository}) : super(UserInitial()) {
    on<CreateUser>(_onCreateUser);
  }

  Future<void> _onCreateUser(CreateUser event, Emitter<UserState> emit) async {
    emit(UserLoading());

    final result = await userRepository.createUser(event.user);

    result.when(
      success: (user) {
        emit(UserCreated(user)); // ✅ Just emit state
      },
      failure: (message, _) {
        emit(UserError(message));
      },
    );
  }
}

// Widget - Handles navigation in response to state
class CreateUserScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocListener<UserBloc, UserState>(
      // ✅ Navigation happens HERE in response to state changes
      listener: (context, state) {
        if (state is UserCreated) {
          // Navigate to detail screen
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => UserDetailScreen(user: state.user),
            ),
          );
        } else if (state is UserError) {
          // Show error dialog
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      child: BlocBuilder<UserBloc, UserState>(
        builder: (context, state) {
          if (state is UserLoading) {
            return Center(child: CircularProgressIndicator());
          }

          // Form UI here
          return CreateUserForm(
            onSubmit: (user) {
              context.read<UserBloc>().add(CreateUser(user));
            },
          );
        },
      ),
    );
  }
}
```

### Example 2: Using BlocConsumer (Combined Builder + Listener)

When you need both UI updates AND navigation based on state, use `BlocConsumer`:

```dart
class CreateUserScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocConsumer<UserBloc, UserState>(
      // ✅ Listener for side effects (navigation, dialogs, snackbars)
      listener: (context, state) {
        if (state is UserCreated) {
          context.go('/users/${state.user.id}'); // Using go_router
        } else if (state is UserError) {
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              title: Text('Error'),
              content: Text(state.message),
            ),
          );
        }
      },
      // ✅ Builder for UI rendering
      builder: (context, state) {
        if (state is UserLoading) {
          return Center(child: CircularProgressIndicator());
        }

        return CreateUserForm(
          onSubmit: (user) {
            context.read<UserBloc>().add(CreateUser(user));
          },
        );
      },
    );
  }
}
```

### Example 3: Complex Navigation Flow with Multiple States

```dart
// Define specific navigation states
abstract class UserState extends Equatable {
  const UserState();
}

class UserInitial extends UserState {
  @override
  List<Object?> get props => [];
}

class UserLoading extends UserState {
  @override
  List<Object?> get props => [];
}

class UserCreated extends UserState {
  final UserProfile user;
  const UserCreated(this.user);

  @override
  List<Object?> get props => [user];
}

class UserUpdated extends UserState {
  final UserProfile user;
  const UserUpdated(this.user);

  @override
  List<Object?> get props => [user];
}

class UserDeleted extends UserState {
  const UserDeleted();

  @override
  List<Object?> get props => [];
}

class UserError extends UserState {
  final String message;
  const UserError(this.message);

  @override
  List<Object?> get props => [message];
}

// Screen with complex navigation
class UserManagementScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocListener<UserBloc, UserState>(
      listener: (context, state) {
        // ✅ Different navigation for different states
        if (state is UserCreated) {
          // Navigate to the new user's profile
          context.push('/users/${state.user.id}');
        } else if (state is UserUpdated) {
          // Show success message, stay on current screen
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('User updated successfully')),
          );
        } else if (state is UserDeleted) {
          // Navigate back to list
          context.pop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('User deleted')),
          );
        } else if (state is UserError) {
          // Show error dialog, don't navigate
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              title: Text('Error'),
              content: Text(state.message),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text('OK'),
                ),
              ],
            ),
          );
        }
      },
      child: BlocBuilder<UserBloc, UserState>(
        builder: (context, state) {
          // UI rendering based on state
          // ...
        },
      ),
    );
  }
}
```

## State Design for Navigation

### Create Specific Navigation States

When a state should trigger navigation, make it explicit:

```dart
// ❌ Generic state - unclear if it should trigger navigation
class DataLoaded extends MyState {
  final Data data;
  const DataLoaded(this.data);
}

// ✅ Specific states - clear intent
class DataLoadedAndStayOnScreen extends MyState {
  final Data data;
  const DataLoadedAndStayOnScreen(this.data);
}

class DataSavedNavigateBack extends MyState {
  const DataSavedNavigateBack();
}

class DataCreatedNavigateToDetail extends MyState {
  final Data data;
  const DataCreatedNavigateToDetail(this.data);
}
```

### Or Use a Navigation Action Field

```dart
class UserOperationSuccess extends UserState {
  final String message;
  final UserProfile? user;
  final NavigationAction? navigationAction;

  const UserOperationSuccess({
    required this.message,
    this.user,
    this.navigationAction,
  });

  @override
  List<Object?> get props => [message, user, navigationAction];
}

enum NavigationAction {
  none,
  goBack,
  goToDetail,
  goToList,
}

// In the listener:
listener: (context, state) {
  if (state is UserOperationSuccess) {
    switch (state.navigationAction) {
      case NavigationAction.goBack:
        context.pop();
        break;
      case NavigationAction.goToDetail:
        context.push('/users/${state.user!.id}');
        break;
      case NavigationAction.goToList:
        context.go('/users');
        break;
      case NavigationAction.none:
      case null:
        // Do nothing
        break;
    }
  }
}
```

## Testing

### Testing BLoCs (Unit Tests)

Without navigation logic, BLoCs are easy to unit test:

```dart
void main() {
  group('UserBloc', () {
    late UserBloc userBloc;
    late MockUserRepository mockUserRepository;

    setUp(() {
      mockUserRepository = MockUserRepository();
      userBloc = UserBloc(userRepository: mockUserRepository);
    });

    tearDown(() {
      userBloc.close();
    });

    test('emits UserCreated when user is created successfully', () async {
      // Arrange
      final user = UserProfile(id: '1', name: 'Test User');
      when(() => mockUserRepository.createUser(any()))
          .thenAnswer((_) async => Success(user));

      // Assert later
      expectLater(
        userBloc.stream,
        emitsInOrder([
          isA<UserLoading>(),
          isA<UserCreated>()
              .having((s) => s.user, 'user', user),
        ]),
      );

      // Act
      userBloc.add(CreateUser(user));
    });
  });
}
```

### Testing Navigation (Widget Tests)

Navigation is tested separately in widget tests:

```dart
void main() {
  testWidgets('navigates to detail screen when user is created', (tester) async {
    // Arrange
    final mockBloc = MockUserBloc();
    final user = UserProfile(id: '1', name: 'Test User');

    whenListen(
      mockBloc,
      Stream.fromIterable([
        UserInitial(),
        UserLoading(),
        UserCreated(user),
      ]),
      initialState: UserInitial(),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider.value(
          value: mockBloc,
          child: CreateUserScreen(),
        ),
      ),
    );

    // Act - wait for the UserCreated state
    await tester.pumpAndSettle();

    // Assert - verify navigation occurred
    expect(find.byType(UserDetailScreen), findsOneWidget);
  });
}
```

## Common Pitfalls

### 1. Passing BuildContext to BLoC

```dart
// ❌ DON'T DO THIS
class UserBloc extends Bloc<UserEvent, UserState> {
  final BuildContext context;

  UserBloc({required this.context}) : super(UserInitial());
}
```

**Why it's wrong:**
- BLoC outlives the widget lifecycle
- BuildContext becomes invalid when widget is disposed
- Makes BLoC untestable
- Violates separation of concerns

### 2. Using Navigator Directly in BLoC Event Handlers

```dart
// ❌ DON'T DO THIS
Future<void> _onCreateUser(CreateUser event, Emitter<UserState> emit) async {
  final result = await repository.createUser(event.user);

  result.when(
    success: (user) {
      Navigator.of(context).push(...); // ❌ Wrong!
    },
  );
}
```

### 3. Forgetting to Use BlocListener

```dart
// ❌ INCOMPLETE - Navigation won't work
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<UserBloc, UserState>(
      builder: (context, state) {
        // Only rebuilds UI, doesn't handle navigation
        if (state is UserCreated) {
          // This navigation won't execute!
          context.push('/success');
        }
        return Container();
      },
    );
  }
}
```

**Fix:** Use `BlocListener` for navigation and `BlocBuilder` for UI rendering.

## Summary

### ✅ DO
- Use `BlocListener` or `BlocConsumer` for navigation
- Keep navigation logic in the presentation layer (widgets/screens)
- Emit clear, specific states that indicate navigation intent
- Test BLoCs and navigation separately

### ❌ DON'T
- Pass `BuildContext` to BLoCs or Cubits
- Call `Navigator.push/pop` inside BLoC event handlers
- Mix navigation logic with business logic
- Use `BlocBuilder` alone for triggering navigation

## References

- Current UserBloc implementation: [lib/presentation/bloc/user/user_bloc.dart](../../lib/presentation/bloc/user/user_bloc.dart)
- Example screen with navigation: [lib/ui/screens/add_contact_selection_screen.dart](../../lib/ui/screens/add_contact_selection_screen.dart)
- BLoC package documentation: https://bloclibrary.dev
- Flutter navigation: https://docs.flutter.dev/ui/navigation
