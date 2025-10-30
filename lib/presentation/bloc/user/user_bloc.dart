import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/repositories/user_repository.dart';
import '../../../domain/user_profile.dart';
import 'user_event.dart';
import 'user_state.dart';

/// Business logic component for user management
/// Handles all user-related operations and state management
class UserBloc extends Bloc<UserEvent, UserState> {
  final UserRepository userRepository;

  UserBloc({required this.userRepository}) : super(const UserInitial()) {
    on<LoadUsers>(_onLoadUsers);
    on<LoadUser>(_onLoadUser);
    on<CreateUser>(_onCreateUser);
    on<UpdateUser>(_onUpdateUser);
    on<DeleteUser>(_onDeleteUser);
    on<RefreshUsers>(_onRefreshUsers);
    on<ClearUserError>(_onClearUserError);
  }

  /// Handles loading all users
  Future<void> _onLoadUsers(LoadUsers event, Emitter<UserState> emit) async {
    try {
      emit(const UserLoading());

      final result = await userRepository.getUsers();

      result.when(
        success: (users) {
          developer.log('Bloc: Loaded ${users.length} users', name: 'UserBloc');
          emit(UserLoaded(users));
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to load users: $message', name: 'UserBloc');
          emit(UserError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error loading users: $e',
        name: 'UserBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const UserError(message: 'An unexpected error occurred while loading users'));
    }
  }

  /// Handles loading a specific user
  Future<void> _onLoadUser(LoadUser event, Emitter<UserState> emit) async {
    try {
      emit(const UserLoading());

      final result = await userRepository.getUserById(event.userId);

      result.when(
        success: (user) {
          developer.log('Bloc: Loaded user ${event.userId}', name: 'UserBloc');
          emit(UserDetailLoaded(user));
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to load user ${event.userId}: $message',
              name: 'UserBloc');
          emit(UserError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error loading user ${event.userId}: $e',
        name: 'UserBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const UserError(message: 'An unexpected error occurred while loading user'));
    }
  }

  /// Handles creating a new user
  Future<void> _onCreateUser(CreateUser event, Emitter<UserState> emit) async {
    try {
      emit(const UserLoading());

      final result = await userRepository.createUser(event.user);

      result.when(
        success: (createdUser) {
          developer.log('Bloc: Created user ${createdUser.id}', name: 'UserBloc');
          emit(UserOperationSuccess(
            message: 'User created successfully',
            user: createdUser,
          ));
          // Automatically reload users to show updated list
          add(const LoadUsers());
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to create user: $message', name: 'UserBloc');
          emit(UserError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error creating user: $e',
        name: 'UserBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const UserError(message: 'An unexpected error occurred while creating user'));
    }
  }

  /// Handles updating an existing user
  Future<void> _onUpdateUser(UpdateUser event, Emitter<UserState> emit) async {
    try {
      emit(const UserLoading());

      final result = await userRepository.updateUser(event.user);

      result.when(
        success: (updatedUser) {
          developer.log('Bloc: Updated user ${updatedUser.id}', name: 'UserBloc');
          emit(UserOperationSuccess(
            message: 'User updated successfully',
            user: updatedUser,
          ));
          // Automatically reload users to show updated list
          add(const LoadUsers());
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to update user: $message', name: 'UserBloc');
          emit(UserError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error updating user: $e',
        name: 'UserBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const UserError(message: 'An unexpected error occurred while updating user'));
    }
  }

  /// Handles deleting a user
  Future<void> _onDeleteUser(DeleteUser event, Emitter<UserState> emit) async {
    try {
      // Keep current users list to show while deleting
      List<UserProfile>? currentUsers;
      if (state is UserLoaded) {
        currentUsers = (state as UserLoaded).users;
      }

      emit(const UserLoading());

      final result = await userRepository.deleteUser(event.userId);

      result.when(
        success: (_) {
          developer.log('Bloc: Deleted user ${event.userId}', name: 'UserBloc');
          emit(const UserOperationSuccess(message: 'User deleted successfully'));
          // Automatically reload users to show updated list
          add(const LoadUsers());
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to delete user ${event.userId}: $message',
              name: 'UserBloc');
          emit(UserError(
            message: message,
            previousUsers: currentUsers,
          ));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error deleting user ${event.userId}: $e',
        name: 'UserBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const UserError(message: 'An unexpected error occurred while deleting user'));
    }
  }

  /// Handles refreshing the user list
  Future<void> _onRefreshUsers(RefreshUsers event, Emitter<UserState> emit) async {
    try {
      // If we have current users, show refreshing state
      if (state is UserLoaded) {
        emit(UserRefreshing((state as UserLoaded).users));
      } else {
        emit(const UserLoading());
      }

      final result = await userRepository.getUsers();

      result.when(
        success: (users) {
          developer.log('Bloc: Refreshed ${users.length} users', name: 'UserBloc');
          emit(UserLoaded(users));
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to refresh users: $message', name: 'UserBloc');
          emit(UserError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error refreshing users: $e',
        name: 'UserBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const UserError(message: 'An unexpected error occurred while refreshing users'));
    }
  }

  /// Handles clearing error states
  void _onClearUserError(ClearUserError event, Emitter<UserState> emit) {
    if (state is UserError) {
      final errorState = state as UserError;
      if (errorState.previousUsers != null) {
        emit(UserLoaded(errorState.previousUsers!));
      } else {
        emit(const UserInitial());
      }
    }
  }
}