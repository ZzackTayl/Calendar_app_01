# BLoC Navigation Pattern - Production-Ready Reference Implementation

## Current State of Your Application

### State Management Architecture

Your application currently uses a **hybrid state management approach**:

1. **Riverpod** (Primary) - For most features:
   - User profiles (`userProfileProvider`, `userProfileControllerProvider`)
   - Settings (`settingsControllerProvider`)
   - Contacts (`contactListProvider`)
   - Events (`eventListProvider`)
   - Authentication (`authControllerProvider`)

2. **BLoC** (Available but not yet in use):
   - `UserBloc` is set up in [main.dart:300-304](../../lib/main.dart#L300-L304)
   - Provided globally via `MultiBlocProvider`
   - Ready to be used when you need BLoC features

### When to Use BLoC vs Riverpod

**Use Riverpod** (current approach) when:
- Managing simple state
- Need reactive state with minimal boilerplate
- Working with async data sources
- Current implementation is working well

**Use BLoC** when you need:
- Strict event-driven architecture
- Complex state machines with many transitions
- Event sourcing or time-travel debugging
- Team requires enforced separation of concerns

## Production-Ready Reference: User Profile Edit Feature

This is a complete, production-ready implementation showing the correct BLoC navigation pattern. You can use this as a reference when implementing BLoC features.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER EDITS PROFILE                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ProfileEditScreen (UI Layer)                    │
│                                                               │
│  User clicks "Save"                                           │
│    ↓                                                          │
│  context.read<UserBloc>().add(UpdateUser(profile))           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  UserBloc (Logic Layer)                      │
│                                                               │
│  _onUpdateUser() {                                            │
│    // Validate                                                │
│    // Call repository                                         │
│    // Emit state                                              │
│    emit(UserOperationSuccess(...))  ← NO NAVIGATION HERE     │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           BlocListener (In ProfileEditScreen)                │
│                                                               │
│  listener: (context, state) {                                │
│    if (state is UserOperationSuccess) {                      │
│      context.pop();  ← NAVIGATION HAPPENS HERE               │
│      showSnackBar(...);                                       │
│    }                                                          │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
```

### File: `lib/presentation/screens/profile_edit_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme_constants.dart';
import '../../domain/user_profile.dart';
import '../bloc/user/user_bloc.dart';
import '../bloc/user/user_event.dart';
import '../bloc/user/user_state.dart';

/// Production-ready profile edit screen
///
/// ✅ DEMONSTRATES CORRECT PATTERN:
/// - Uses BlocConsumer for UI rendering AND navigation
/// - Navigation in listener (NOT in BLoC)
/// - Shows loading states
/// - Handles errors gracefully
/// - Form validation
/// - Proper disposal of controllers
class ProfileEditScreen extends StatefulWidget {
  final String userId;

  const ProfileEditScreen({
    super.key,
    required this.userId,
  });

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _bioController;

  bool _isInitialized = false;
  UserProfile? _currentProfile;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _bioController = TextEditingController();

    // Load user data when screen initializes
    context.read<UserBloc>().add(LoadUser(widget.userId));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  void _submitForm() {
    if (_formKey.currentState?.validate() ?? false) {
      if (_currentProfile == null) return;

      final updatedProfile = _currentProfile!.copyWith(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        bio: _bioController.text.trim(),
        updatedAt: DateTime.now(),
      );

      // ✅ Dispatch event to BLoC
      // ✅ NO navigation here - that will happen in the listener
      context.read<UserBloc>().add(UpdateUser(updatedProfile));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        title: const Text('Edit Profile'),
        backgroundColor: palette.surface,
        foregroundColor: palette.textPrimary,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: AppGradients.backgroundFor(theme.brightness),
        ),
        child: BlocConsumer<UserBloc, UserState>(
          // ✅ CORRECT: Listener handles navigation and side effects
          listener: (context, state) {
            if (state is UserDetailLoaded && !_isInitialized) {
              // Initialize form with loaded data
              _currentProfile = state.user;
              _nameController.text = state.user.name;
              _emailController.text = state.user.email;
              _bioController.text = state.user.bio ?? '';
              _isInitialized = true;
            } else if (state is UserOperationSuccess) {
              // ✅ NAVIGATION TRIGGERED BY STATE CHANGE
              // Navigate back to previous screen
              context.pop();

              // Show success message
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.message),
                  backgroundColor: theme.colorScheme.primary,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            } else if (state is UserError) {
              // ✅ SHOW ERROR DIALOG (side effect)
              showDialog(
                context: context,
                builder: (dialogContext) => AlertDialog(
                  title: const Text('Error'),
                  content: Text(state.message),
                  actions: [
                    TextButton(
                      onPressed: () {
                        Navigator.of(dialogContext).pop();
                        context.read<UserBloc>().add(const ClearUserError());
                      },
                      child: const Text('OK'),
                    ),
                  ],
                ),
              );
            }
          },
          // ✅ CORRECT: Builder handles UI rendering
          builder: (context, state) {
            if (state is UserLoading) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Loading profile...',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: palette.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }

            // Show form once data is loaded or during update
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Profile picture (optional)
                    Center(
                      child: Stack(
                        children: [
                          CircleAvatar(
                            radius: 60,
                            backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                            child: Text(
                              _nameController.text.isNotEmpty
                                  ? _nameController.text[0].toUpperCase()
                                  : '?',
                              style: theme.textTheme.headlineLarge?.copyWith(
                                color: theme.colorScheme.primary,
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primary,
                                shape: BoxShape.circle,
                              ),
                              padding: const EdgeInsets.all(8),
                              child: const Icon(
                                Icons.camera_alt,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Name field
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'Name',
                        hintText: 'Enter your name',
                        prefixIcon: const Icon(Icons.person),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      textCapitalization: TextCapitalization.words,
                      validator: (value) {
                        if (value?.trim().isEmpty ?? true) {
                          return 'Name is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Email field
                    TextFormField(
                      controller: _emailController,
                      decoration: InputDecoration(
                        labelText: 'Email',
                        hintText: 'Enter your email',
                        prefixIcon: const Icon(Icons.email),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value?.trim().isEmpty ?? true) {
                          return 'Email is required';
                        }
                        if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                            .hasMatch(value!)) {
                          return 'Enter a valid email address';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Bio field
                    TextFormField(
                      controller: _bioController,
                      decoration: InputDecoration(
                        labelText: 'Bio',
                        hintText: 'Tell us about yourself',
                        prefixIcon: const Icon(Icons.info_outline),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        alignLabelWithHint: true,
                      ),
                      maxLines: 4,
                      maxLength: 200,
                    ),
                    const SizedBox(height: 32),

                    // Save button
                    SizedBox(
                      height: 56,
                      child: ElevatedButton(
                        onPressed: state is UserLoading ? null : _submitForm,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: state is UserLoading
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.white,
                                  ),
                                ),
                              )
                            : const Text(
                                'Save Changes',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
```

### How to Integrate This Pattern

#### 1. Add Route to Router

In [main.dart](../../lib/main.dart), add this route inside the `ShellRoute`:

```dart
GoRoute(
  path: '/profile/edit/:userId',
  builder: (context, state) {
    final userId = state.pathParameters['userId']!;
    return ProfileEditScreen(userId: userId);
  },
),
```

#### 2. Navigate from Settings Screen

In your settings screen, add a button to edit profile:

```dart
ListTile(
  leading: const Icon(Icons.edit),
  title: const Text('Edit Profile'),
  onTap: () {
    final userId = getCurrentUserId(); // Your method to get user ID
    context.push('/profile/edit/$userId');
  },
),
```

## Key Principles Demonstrated

### ✅ DO: Navigation in Listener

```dart
BlocConsumer<UserBloc, UserState>(
  listener: (context, state) {
    if (state is UserOperationSuccess) {
      context.pop();  // ✅ Navigation happens HERE
    }
  },
  builder: (context, state) {
    // UI rendering
  },
)
```

### ❌ DON'T: Navigation in BLoC

```dart
// ❌ NEVER DO THIS
class UserBloc extends Bloc<UserEvent, UserState> {
  final BuildContext context; // ❌ Wrong!

  Future<void> _onUpdateUser(...) async {
    // ...
    Navigator.pop(context); // ❌ Wrong!
  }
}
```

### ✅ DO: Separate Concerns

**BLoC Layer:**
- Handles business logic
- Validates data
- Calls repositories
- Emits states
- NO navigation
- NO BuildContext

**UI Layer:**
- Listens to state changes
- Triggers navigation
- Shows dialogs/snackbars
- Renders UI
- Has BuildContext

## Testing Strategy

### Unit Test for BLoC

```dart
void main() {
  group('UserBloc', () {
    late UserBloc userBloc;
    late MockUserRepository mockRepository;

    setUp(() {
      mockRepository = MockUserRepository();
      userBloc = UserBloc(userRepository: mockRepository);
    });

    tearDown(() {
      userBloc.close();
    });

    test('emits UserOperationSuccess when update succeeds', () async {
      // Arrange
      final user = UserProfile(
        id: '1',
        name: 'Updated Name',
        email: 'test@example.com',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      when(() => mockRepository.updateUser(any()))
          .thenAnswer((_) async => Success(user));

      // Assert
      expectLater(
        userBloc.stream,
        emitsInOrder([
          isA<UserLoading>(),
          isA<UserOperationSuccess>()
              .having((s) => s.user, 'user', user)
              .having((s) => s.message, 'message', 'User updated successfully'),
        ]),
      );

      // Act
      userBloc.add(UpdateUser(user));
    });

    // ✅ Notice: No navigation testing needed in BLoC tests!
  });
}
```

### Widget Test for Navigation

```dart
void main() {
  testWidgets('navigates back when update succeeds', (tester) async {
    // Arrange
    final mockBloc = MockUserBloc();
    final user = UserProfile(
      id: '1',
      name: 'Test',
      email: 'test@example.com',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    whenListen(
      mockBloc,
      Stream.fromIterable([
        UserDetailLoaded(user),
        UserLoading(),
        UserOperationSuccess(
          message: 'Updated',
          user: user,
        ),
      ]),
      initialState: UserDetailLoaded(user),
    );

    // Act
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider.value(
          value: mockBloc,
          child: ProfileEditScreen(userId: '1'),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Assert
    // Verify navigation occurred (screen popped)
    expect(find.byType(ProfileEditScreen), findsNothing);
  });
}
```

## Migration Path

If you decide to migrate features from Riverpod to BLoC:

### Step 1: Create BLoC Classes
```dart
// presentation/bloc/profile/profile_bloc.dart
// presentation/bloc/profile/profile_event.dart
// presentation/bloc/profile/profile_state.dart
```

### Step 2: Add to DI Container
```dart
BlocProvider<ProfileBloc>(
  create: (_) => ProfileBloc(repository: profileRepository),
),
```

### Step 3: Update Screen to Use BLoC
```dart
// Change from:
final profileAsync = ref.watch(userProfileProvider);

// To:
BlocConsumer<ProfileBloc, ProfileState>(
  listener: (context, state) {
    // Handle navigation
  },
  builder: (context, state) {
    // Build UI
  },
)
```

## Summary

- **Current State**: Your app primarily uses Riverpod, UserBloc is available but unused
- **BLoC is Ready**: Set up in main.dart, ready when you need it
- **Use This Reference**: When implementing BLoC features, follow this pattern
- **Key Principle**: Navigation in listener, NEVER in BLoC
- **Flexibility**: You can keep using Riverpod for most things and use BLoC only where it adds value

## See Also

- [NAVIGATION_IN_BLOC_PATTERN.md](./NAVIGATION_IN_BLOC_PATTERN.md) - Detailed patterns and examples
- [NAVIGATION_EXAMPLE_IMPLEMENTATION.md](./NAVIGATION_EXAMPLE_IMPLEMENTATION.md) - Complete example code
- [main.dart:300-304](../../lib/main.dart#L300-L304) - BLoC setup in your app
- [user_bloc.dart](../../lib/presentation/bloc/user/user_bloc.dart) - Your existing UserBloc
