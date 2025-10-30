import '../../../domain/user_profile.dart';

/// Abstract interface for user remote data operations
/// This will be implemented with Firebase later
abstract class UserRemoteDataSource {
  Future<List<UserProfile>> getUsers();
  Future<UserProfile> getUserById(String id);
  Future<UserProfile> createUser(UserProfile user);
  Future<UserProfile> updateUser(UserProfile user);
  Future<void> deleteUser(String id);
}

/// Mock implementation for development and testing without Firebase.
class UserRemoteDataSourceImpl implements UserRemoteDataSource {
  // Mock data for development
  static final List<UserProfile> _mockUsers = [
    UserProfile(
      id: '1',
      email: 'john.doe@example.com',
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar1.jpg',
      timezone: 'America/New_York',
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    UserProfile(
      id: '2',
      email: 'jane.smith@example.com',
      displayName: 'Jane Smith',
      avatarUrl: 'https://example.com/avatar2.jpg',
      timezone: 'America/Los_Angeles',
      createdAt: DateTime.now().subtract(const Duration(days: 20)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    UserProfile(
      id: '3',
      email: 'admin@example.com',
      displayName: 'Admin User',
      avatarUrl: 'https://example.com/avatar3.jpg',
      timezone: 'UTC',
      createdAt: DateTime.now().subtract(const Duration(days: 100)),
      updatedAt: DateTime.now().subtract(const Duration(minutes: 30)),
    ),
  ];

  @override
  Future<List<UserProfile>> getUsers() async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 500));

    // Return copy of mock data
    return List.from(_mockUsers);
  }

  @override
  Future<UserProfile> getUserById(String id) async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 300));

    try {
      return _mockUsers.firstWhere((user) => user.id == id);
    } catch (e) {
      throw Exception('User not found with id: $id');
    }
  }

  @override
  Future<UserProfile> createUser(UserProfile user) async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 800));

    // Check if email already exists
    final existingUser = _mockUsers.where((u) => u.email == user.email);
    if (existingUser.isNotEmpty) {
      throw Exception('User with email ${user.email} already exists');
    }

    // Create new user with timestamp
    final newUser = user.copyWith(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    _mockUsers.add(newUser);
    return newUser;
  }

  @override
  Future<UserProfile> updateUser(UserProfile user) async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 600));

    final index = _mockUsers.indexWhere((u) => u.id == user.id);
    if (index == -1) {
      throw Exception('User not found with id: ${user.id}');
    }

    // Update user with new timestamp
    final updatedUser = user.copyWith(updatedAt: DateTime.now());
    _mockUsers[index] = updatedUser;
    return updatedUser;
  }

  @override
  Future<void> deleteUser(String id) async {
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 400));

    final index = _mockUsers.indexWhere((u) => u.id == id);
    if (index == -1) {
      throw Exception('User not found with id: $id');
    }

    _mockUsers.removeAt(index);
  }
}
