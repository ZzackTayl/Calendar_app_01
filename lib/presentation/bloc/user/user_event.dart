import 'package:equatable/equatable.dart';
import '../../../domain/user_profile.dart';

/// Base class for all user-related events
abstract class UserEvent extends Equatable {
  const UserEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load all users
class LoadUsers extends UserEvent {
  const LoadUsers();
}

/// Event to load a specific user by ID
class LoadUser extends UserEvent {
  final String userId;

  const LoadUser(this.userId);

  @override
  List<Object?> get props => [userId];
}

/// Event to create a new user
class CreateUser extends UserEvent {
  final UserProfile user;

  const CreateUser(this.user);

  @override
  List<Object?> get props => [user];
}

/// Event to update an existing user
class UpdateUser extends UserEvent {
  final UserProfile user;

  const UpdateUser(this.user);

  @override
  List<Object?> get props => [user];
}

/// Event to delete a user
class DeleteUser extends UserEvent {
  final String userId;

  const DeleteUser(this.userId);

  @override
  List<Object?> get props => [userId];
}

/// Event to refresh the user list
class RefreshUsers extends UserEvent {
  const RefreshUsers();
}

/// Event to clear any error states
class ClearUserError extends UserEvent {
  const ClearUserError();
}