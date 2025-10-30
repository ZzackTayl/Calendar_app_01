import 'package:equatable/equatable.dart';
import '../../../domain/user_profile.dart';

/// Base class for all user-related states
abstract class UserState extends Equatable {
  const UserState();

  @override
  List<Object?> get props => [];
}

/// Initial state when the bloc is first created
class UserInitial extends UserState {
  const UserInitial();
}

/// State when a user operation is in progress
class UserLoading extends UserState {
  const UserLoading();
}

/// State when users have been successfully loaded
class UserLoaded extends UserState {
  final List<UserProfile> users;

  const UserLoaded(this.users);

  @override
  List<Object?> get props => [users];
}

/// State when a single user has been loaded
class UserDetailLoaded extends UserState {
  final UserProfile user;

  const UserDetailLoaded(this.user);

  @override
  List<Object?> get props => [user];
}

/// State when a user operation has completed successfully
class UserOperationSuccess extends UserState {
  final String message;
  final UserProfile? user; // Optional user data for create/update operations

  const UserOperationSuccess({
    required this.message,
    this.user,
  });

  @override
  List<Object?> get props => [message, user];
}

/// State when an error occurs
class UserError extends UserState {
  final String message;
  final List<UserProfile>? previousUsers; // Keep previous data if available

  const UserError({
    required this.message,
    this.previousUsers,
  });

  @override
  List<Object?> get props => [message, previousUsers];
}

/// State when refreshing user data (shows loading with existing data)
class UserRefreshing extends UserState {
  final List<UserProfile> currentUsers;

  const UserRefreshing(this.currentUsers);

  @override
  List<Object?> get props => [currentUsers];
}