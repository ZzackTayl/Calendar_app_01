import 'package:serverpod/serverpod.dart';
import '../generated/user.dart';

class UserEndpoint extends Endpoint {
  /// Get all users
  Future<List<User>> getAll(Session session) async {
    try {
      return await User.db.find(session);
    } catch (e) {
      throw Exception('Failed to fetch users: $e');
    }
  }

  /// Get a specific user by ID
  Future<User?> getById(Session session, int id) async {
    try {
      return await User.db.findById(session, id);
    } catch (e) {
      throw Exception('Failed to fetch user: $e');
    }
  }

  /// Get a user by email address
  Future<User?> getByEmail(Session session, String email) async {
    try {
      if (email.trim().isEmpty) {
        throw Exception('Email cannot be empty');
      }

      final users = await User.db.find(
        session,
        where: (t) => t.email.equals(email.trim().toLowerCase()),
        limit: 1,
      );

      return users.isNotEmpty ? users.first : null;
    } catch (e) {
      throw Exception('Failed to fetch user by email: $e');
    }
  }

  /// Create a new user
  Future<User> create(Session session, User user) async {
    try {
      // Validate input
      if (user.name.trim().isEmpty) {
        throw Exception('User name cannot be empty');
      }

      if (user.email.trim().isEmpty) {
        throw Exception('User email cannot be empty');
      }

      // Validate email format
      if (!_isValidEmail(user.email.trim())) {
        throw Exception('Invalid email format');
      }

      // Check if email already exists
      final existingUser = await getByEmail(session, user.email.trim());
      if (existingUser != null) {
        throw Exception('User with this email already exists');
      }

      // Create new user (id should be null for new records)
      final newUser = user.copyWith(
        id: null,
        email: user.email.trim().toLowerCase(),
        name: user.name.trim(),
        createdAt: DateTime.now(),
      );
      
      return await User.db.insertRow(session, newUser);
    } catch (e) {
      throw Exception('Failed to create user: $e');
    }
  }

  /// Update an existing user
  Future<User> update(Session session, User user) async {
    try {
      // Validate input
      if (user.id == null) {
        throw Exception('User ID is required for update');
      }
      
      if (user.name.trim().isEmpty) {
        throw Exception('User name cannot be empty');
      }

      if (user.email.trim().isEmpty) {
        throw Exception('User email cannot be empty');
      }

      // Validate email format
      if (!_isValidEmail(user.email.trim())) {
        throw Exception('Invalid email format');
      }

      // Check if the user exists
      final existing = await User.db.findById(session, user.id!);
      if (existing == null) {
        throw Exception('User not found');
      }

      // Check if email is being changed and if it conflicts with another user
      if (existing.email != user.email.trim().toLowerCase()) {
        final conflictUser = await getByEmail(session, user.email.trim());
        if (conflictUser != null && conflictUser.id != user.id) {
          throw Exception('Another user with this email already exists');
        }
      }

      // Update user with normalized email
      final updatedUser = user.copyWith(
        email: user.email.trim().toLowerCase(),
        name: user.name.trim(),
      );

      return await User.db.updateRow(session, updatedUser);
    } catch (e) {
      throw Exception('Failed to update user: $e');
    }
  }

  /// Delete a user
  Future<bool> delete(Session session, int id) async {
    try {
      // Check if the user exists
      final existing = await User.db.findById(session, id);
      if (existing == null) {
        throw Exception('User not found');
      }

      await User.db.deleteRow(session, existing);
      return true;
    } catch (e) {
      throw Exception('Failed to delete user: $e');
    }
  }

  /// Search users by name
  Future<List<User>> searchByName(Session session, String searchTerm) async {
    try {
      if (searchTerm.trim().isEmpty) {
        return [];
      }

      return await User.db.find(
        session,
        where: (t) => t.name.ilike('%${searchTerm.trim()}%'),
        orderBy: (t) => t.name,
      );
    } catch (e) {
      throw Exception('Failed to search users: $e');
    }
  }

  /// Get users created within a date range
  Future<List<User>> getByDateRange(
    Session session,
    DateTime startDate,
    DateTime endDate,
  ) async {
    try {
      return await User.db.find(
        session,
        where: (t) => t.createdAt.between(startDate, endDate),
        orderBy: (t) => t.createdAt,
        orderDescending: true,
      );
    } catch (e) {
      throw Exception('Failed to fetch users by date range: $e');
    }
  }

  /// Get count of users
  Future<int> count(Session session) async {
    try {
      return await User.db.count(session);
    } catch (e) {
      throw Exception('Failed to count users: $e');
    }
  }

  /// Check if email exists
  Future<bool> emailExists(Session session, String email) async {
    try {
      if (email.trim().isEmpty) {
        return false;
      }

      final user = await getByEmail(session, email);
      return user != null;
    } catch (e) {
      throw Exception('Failed to check email existence: $e');
    }
  }

  /// Simple email validation
  bool _isValidEmail(String email) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(email);
  }
}