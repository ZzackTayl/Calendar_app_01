# Navigation Pattern - Complete Example Implementation

This document provides a complete, working example of the correct navigation pattern using BLoC in a Flutter application.

## Scenario

We'll implement a user profile update flow where:
1. User fills out a form to update their profile
2. On submit, the BLoC validates and updates the profile
3. On success, navigate to the profile detail screen
4. On error, show an error dialog and stay on the form

## File Structure

```
lib/
├── presentation/
│   └── bloc/
│       └── profile/
│           ├── profile_bloc.dart
│           ├── profile_event.dart
│           └── profile_state.dart
└── ui/
    └── screens/
        ├── edit_profile_screen.dart
        └── profile_detail_screen.dart
```

## Implementation

### 1. Profile State (`profile_state.dart`)

```dart
import 'package:equatable/equatable.dart';
import '../../../domain/user_profile.dart';

/// Base class for all profile-related states
abstract class ProfileState extends Equatable {
  const ProfileState();

  @override
  List<Object?> get props => [];
}

/// Initial state when the bloc is first created
class ProfileInitial extends ProfileState {
  const ProfileInitial();
}

/// State when a profile operation is in progress
class ProfileLoading extends ProfileState {
  const ProfileLoading();
}

/// State when profile has been successfully loaded
class ProfileLoaded extends ProfileState {
  final UserProfile profile;

  const ProfileLoaded(this.profile);

  @override
  List<Object?> get props => [profile];
}

/// State when profile update succeeds
/// This state indicates that navigation should occur
class ProfileUpdateSuccess extends ProfileState {
  final UserProfile updatedProfile;
  final String message;

  const ProfileUpdateSuccess({
    required this.updatedProfile,
    required this.message,
  });

  @override
  List<Object?> get props => [updatedProfile, message];
}

/// State when a profile operation fails
class ProfileError extends ProfileState {
  final String message;
  final UserProfile? currentProfile; // Keep current profile if available

  const ProfileError({
    required this.message,
    this.currentProfile,
  });

  @override
  List<Object?> get props => [message, currentProfile];
}
```

### 2. Profile Event (`profile_event.dart`)

```dart
import 'package:equatable/equatable.dart';
import '../../../domain/user_profile.dart';

/// Base class for all profile-related events
abstract class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load a specific profile
class LoadProfile extends ProfileEvent {
  final String userId;

  const LoadProfile(this.userId);

  @override
  List<Object?> get props => [userId];
}

/// Event to update a profile
class UpdateProfile extends ProfileEvent {
  final UserProfile profile;

  const UpdateProfile(this.profile);

  @override
  List<Object?> get props => [profile];
}

/// Event to clear any error states
class ClearProfileError extends ProfileEvent {
  const ClearProfileError();
}
```

### 3. Profile BLoC (`profile_bloc.dart`)

**Note: This BLoC has NO navigation logic!**

```dart
import 'dart:developer' as developer;
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/repositories/user_repository.dart';
import '../../../domain/user_profile.dart';
import 'profile_event.dart';
import 'profile_state.dart';

/// Business logic component for profile management
/// Handles all profile-related operations and state management
///
/// IMPORTANT: This BLoC contains NO navigation logic.
/// All navigation is handled in the presentation layer using BlocListener.
class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final UserRepository userRepository;

  ProfileBloc({required this.userRepository}) : super(const ProfileInitial()) {
    on<LoadProfile>(_onLoadProfile);
    on<UpdateProfile>(_onUpdateProfile);
    on<ClearProfileError>(_onClearProfileError);
  }

  /// Handles loading a specific profile
  Future<void> _onLoadProfile(
    LoadProfile event,
    Emitter<ProfileState> emit,
  ) async {
    try {
      emit(const ProfileLoading());

      final result = await userRepository.getUserById(event.userId);

      result.when(
        success: (profile) {
          developer.log(
            'Loaded profile for user ${event.userId}',
            name: 'ProfileBloc',
          );
          emit(ProfileLoaded(profile));
        },
        failure: (message, exception) {
          developer.log(
            'Failed to load profile: $message',
            name: 'ProfileBloc',
            error: exception,
          );
          emit(ProfileError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Unexpected error loading profile: $e',
        name: 'ProfileBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const ProfileError(
        message: 'An unexpected error occurred while loading profile',
      ));
    }
  }

  /// Handles updating a profile
  ///
  /// ✅ Notice: NO navigation logic here!
  /// ✅ We simply emit ProfileUpdateSuccess state
  /// ✅ The screen's BlocListener will handle navigation
  Future<void> _onUpdateProfile(
    UpdateProfile event,
    Emitter<ProfileState> emit,
  ) async {
    try {
      // Keep current profile in case of error
      UserProfile? currentProfile;
      if (state is ProfileLoaded) {
        currentProfile = (state as ProfileLoaded).profile;
      }

      emit(const ProfileLoading());

      final result = await userRepository.updateUser(event.profile);

      result.when(
        success: (updatedProfile) {
          developer.log(
            'Successfully updated profile ${updatedProfile.id}',
            name: 'ProfileBloc',
          );

          // ✅ CORRECT: Just emit the success state
          // ✅ The UI layer will handle navigation via BlocListener
          emit(ProfileUpdateSuccess(
            updatedProfile: updatedProfile,
            message: 'Profile updated successfully',
          ));
        },
        failure: (message, exception) {
          developer.log(
            'Failed to update profile: $message',
            name: 'ProfileBloc',
            error: exception,
          );
          emit(ProfileError(
            message: message,
            currentProfile: currentProfile,
          ));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Unexpected error updating profile: $e',
        name: 'ProfileBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const ProfileError(
        message: 'An unexpected error occurred while updating profile',
      ));
    }
  }

  /// Handles clearing error states
  void _onClearProfileError(
    ClearProfileError event,
    Emitter<ProfileState> emit,
  ) {
    if (state is ProfileError) {
      final errorState = state as ProfileError;
      if (errorState.currentProfile != null) {
        emit(ProfileLoaded(errorState.currentProfile!));
      } else {
        emit(const ProfileInitial());
      }
    }
  }
}
```

### 4. Edit Profile Screen (`edit_profile_screen.dart`)

**This is where navigation happens!**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../domain/user_profile.dart';
import '../../presentation/bloc/profile/profile_bloc.dart';
import '../../presentation/bloc/profile/profile_event.dart';
import '../../presentation/bloc/profile/profile_state.dart';
import '../../core/theme_constants.dart';

class EditProfileScreen extends StatefulWidget {
  final String userId;

  const EditProfileScreen({
    super.key,
    required this.userId,
  });

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _bioController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController();
    _bioController = TextEditingController();

    // Load the profile when screen initializes
    context.read<ProfileBloc>().add(LoadProfile(widget.userId));
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
      final profile = UserProfile(
        id: widget.userId,
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        bio: _bioController.text.trim(),
        createdAt: DateTime.now(), // This would come from loaded profile
        updatedAt: DateTime.now(),
      );

      context.read<ProfileBloc>().add(UpdateProfile(profile));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Profile'),
      ),
      body: BlocConsumer<ProfileBloc, ProfileState>(
        // ✅ CORRECT: Navigation happens in listener
        listener: (context, state) {
          if (state is ProfileUpdateSuccess) {
            // ✅ Navigation triggered by state change
            // Navigate to profile detail screen
            context.go('/profile/${state.updatedProfile.id}');

            // Optional: Show success message
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: theme.colorScheme.primary,
              ),
            );
          } else if (state is ProfileError) {
            // ✅ Show error dialog (side effect)
            showDialog(
              context: context,
              builder: (dialogContext) => AlertDialog(
                title: const Text('Error'),
                content: Text(state.message),
                actions: [
                  TextButton(
                    onPressed: () {
                      Navigator.of(dialogContext).pop();
                      // Clear the error state
                      context.read<ProfileBloc>().add(
                            const ClearProfileError(),
                          );
                    },
                    child: const Text('OK'),
                  ),
                ],
              ),
            );
          } else if (state is ProfileLoaded) {
            // ✅ Populate form fields when profile loads
            _nameController.text = state.profile.name;
            _emailController.text = state.profile.email;
            _bioController.text = state.profile.bio ?? '';
          }
        },
        // ✅ Builder handles UI rendering
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Name',
                      hintText: 'Enter your name',
                    ),
                    validator: (value) {
                      if (value?.trim().isEmpty ?? true) {
                        return 'Name is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      hintText: 'Enter your email',
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
                  TextFormField(
                    controller: _bioController,
                    decoration: const InputDecoration(
                      labelText: 'Bio',
                      hintText: 'Tell us about yourself',
                    ),
                    maxLines: 4,
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: state is ProfileLoading ? null : _submitForm,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: state is ProfileLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Save Changes'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
```

### 5. Profile Detail Screen (`profile_detail_screen.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/user_profile.dart';
import '../../presentation/bloc/profile/profile_bloc.dart';
import '../../presentation/bloc/profile/profile_event.dart';
import '../../presentation/bloc/profile/profile_state.dart';
import '../../core/theme_constants.dart';

class ProfileDetailScreen extends StatefulWidget {
  final String userId;

  const ProfileDetailScreen({
    super.key,
    required this.userId,
  });

  @override
  State<ProfileDetailScreen> createState() => _ProfileDetailScreenState();
}

class _ProfileDetailScreenState extends State<ProfileDetailScreen> {
  @override
  void initState() {
    super.initState();
    // Load profile when screen initializes
    context.read<ProfileBloc>().add(LoadProfile(widget.userId));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              // Navigate to edit screen
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BlocProvider.value(
                    value: context.read<ProfileBloc>(),
                    child: EditProfileScreen(userId: widget.userId),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ProfileError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: theme.colorScheme.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    state.message,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: palette.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<ProfileBloc>().add(
                            LoadProfile(widget.userId),
                          );
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state is ProfileLoaded || state is ProfileUpdateSuccess) {
            final profile = state is ProfileLoaded
                ? state.profile
                : (state as ProfileUpdateSuccess).updatedProfile;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: CircleAvatar(
                      radius: 60,
                      child: Text(
                        profile.name.isNotEmpty
                            ? profile.name[0].toUpperCase()
                            : '?',
                        style: theme.textTheme.headlineLarge,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _buildInfoCard(
                    context,
                    'Name',
                    profile.name,
                    Icons.person,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    context,
                    'Email',
                    profile.email,
                    Icons.email,
                  ),
                  if (profile.bio != null && profile.bio!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _buildInfoCard(
                      context,
                      'Bio',
                      profile.bio!,
                      Icons.info,
                    ),
                  ],
                ],
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildInfoCard(
    BuildContext context,
    String label,
    String value,
    IconData icon,
  ) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(12),
        boxShadow: AppShadows.subtle,
      ),
      child: Row(
        children: [
          Icon(icon, color: theme.colorScheme.primary),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: palette.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: palette.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

## Key Takeaways from This Example

### 1. BLoC Layer (Business Logic)
- ✅ **No BuildContext dependency**
- ✅ **No navigation calls**
- ✅ **Pure state emissions**
- ✅ **Easily testable**

### 2. Presentation Layer (UI)
- ✅ **BlocListener handles navigation**
- ✅ **BlocListener handles dialogs/snackbars**
- ✅ **BlocBuilder handles UI rendering**
- ✅ **Clear separation of concerns**

### 3. State Design
- ✅ **Specific states for different outcomes**
- ✅ **ProfileUpdateSuccess indicates navigation should occur**
- ✅ **ProfileError keeps previous state if available**

### 4. Testing Strategy
- ✅ **Unit test the BLoC in isolation**
- ✅ **Widget test the navigation behavior**
- ✅ **Integration test the full flow**

## Navigation Flow Diagram

```
User submits form
     ↓
EditProfileScreen calls:
  context.read<ProfileBloc>().add(UpdateProfile(profile))
     ↓
ProfileBloc._onUpdateProfile()
  - Validates data
  - Calls repository
  - Emits ProfileUpdateSuccess state
     ↓
BlocConsumer.listener receives ProfileUpdateSuccess
     ↓
Listener executes:
  context.go('/profile/${state.updatedProfile.id}')
     ↓
User navigates to ProfileDetailScreen
```

## Conclusion

This example demonstrates the **correct pattern** for handling navigation in a BLoC-based Flutter application:

1. **BLoC emits states** - No navigation logic
2. **UI listens to states** - Navigation happens here
3. **Clear separation** - Business logic vs presentation logic
4. **Highly testable** - Each layer can be tested independently

This pattern ensures your application is maintainable, scalable, and follows Flutter best practices.
