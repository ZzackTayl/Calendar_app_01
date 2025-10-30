import 'dart:developer' as developer;
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../domain/user_profile.dart';
import 'user_remote_data_source.dart';

/// Firestore implementation of UserRemoteDataSource
///
/// This implementation uses Cloud Firestore to store and retrieve user data.
/// Collection structure: users/{userId}
class UserFirestoreDataSource implements UserRemoteDataSource {
  final FirebaseFirestore _firestore;

  /// Creates a new UserFirestoreDataSource
  ///
  /// [firestore] - The Firestore instance to use. If not provided, uses the default instance.
  UserFirestoreDataSource({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  /// Collection reference for users
  CollectionReference<Map<String, dynamic>> get _usersCollection =>
      _firestore.collection('users');

  @override
  Future<List<UserProfile>> getUsers() async {
    try {
      developer.log('Fetching all users from Firestore', name: 'UserFirestoreDataSource');

      final snapshot = await _usersCollection.get();

      final users = snapshot.docs.map((doc) {
        final data = doc.data();
        return _userFromFirestore(doc.id, data);
      }).toList();

      developer.log('Successfully fetched ${users.length} users', name: 'UserFirestoreDataSource');
      return users;
    } catch (e, stackTrace) {
      developer.log(
        'Failed to fetch users from Firestore: $e',
        name: 'UserFirestoreDataSource',
        error: e,
        stackTrace: stackTrace,
      );
      throw Exception('Failed to fetch users: $e');
    }
  }

  @override
  Future<UserProfile> getUserById(String id) async {
    try {
      developer.log('Fetching user $id from Firestore', name: 'UserFirestoreDataSource');

      final doc = await _usersCollection.doc(id).get();

      if (!doc.exists) {
        throw Exception('User not found with id: $id');
      }

      final user = _userFromFirestore(doc.id, doc.data()!);
      developer.log('Successfully fetched user $id', name: 'UserFirestoreDataSource');
      return user;
    } catch (e, stackTrace) {
      developer.log(
        'Failed to fetch user $id from Firestore: $e',
        name: 'UserFirestoreDataSource',
        error: e,
        stackTrace: stackTrace,
      );
      if (e.toString().contains('not found')) {
        rethrow;
      }
      throw Exception('Failed to fetch user: $e');
    }
  }

  @override
  Future<UserProfile> createUser(UserProfile user) async {
    try {
      developer.log('Creating user in Firestore', name: 'UserFirestoreDataSource');

      // Check if user with email already exists
      final existingUsers = await _usersCollection
          .where('email', isEqualTo: user.email)
          .limit(1)
          .get();

      if (existingUsers.docs.isNotEmpty) {
        throw Exception('User with email ${user.email} already exists');
      }

      // Generate new document ID if not provided
      final docRef = user.id.isEmpty
          ? _usersCollection.doc()
          : _usersCollection.doc(user.id);

      final now = DateTime.now();
      final newUser = user.copyWith(
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
      );

      await docRef.set(_userToFirestore(newUser));

      developer.log('Successfully created user ${newUser.id}', name: 'UserFirestoreDataSource');
      return newUser;
    } catch (e, stackTrace) {
      developer.log(
        'Failed to create user in Firestore: $e',
        name: 'UserFirestoreDataSource',
        error: e,
        stackTrace: stackTrace,
      );
      if (e.toString().contains('already exists')) {
        rethrow;
      }
      throw Exception('Failed to create user: $e');
    }
  }

  @override
  Future<UserProfile> updateUser(UserProfile user) async {
    try {
      developer.log('Updating user ${user.id} in Firestore', name: 'UserFirestoreDataSource');

      final docRef = _usersCollection.doc(user.id);
      final doc = await docRef.get();

      if (!doc.exists) {
        throw Exception('User not found with id: ${user.id}');
      }

      final updatedUser = user.copyWith(updatedAt: DateTime.now());
      await docRef.update(_userToFirestore(updatedUser));

      developer.log('Successfully updated user ${user.id}', name: 'UserFirestoreDataSource');
      return updatedUser;
    } catch (e, stackTrace) {
      developer.log(
        'Failed to update user ${user.id} in Firestore: $e',
        name: 'UserFirestoreDataSource',
        error: e,
        stackTrace: stackTrace,
      );
      if (e.toString().contains('not found')) {
        rethrow;
      }
      throw Exception('Failed to update user: $e');
    }
  }

  @override
  Future<void> deleteUser(String id) async {
    try {
      developer.log('Deleting user $id from Firestore', name: 'UserFirestoreDataSource');

      final docRef = _usersCollection.doc(id);
      final doc = await docRef.get();

      if (!doc.exists) {
        throw Exception('User not found with id: $id');
      }

      await docRef.delete();

      developer.log('Successfully deleted user $id', name: 'UserFirestoreDataSource');
    } catch (e, stackTrace) {
      developer.log(
        'Failed to delete user $id from Firestore: $e',
        name: 'UserFirestoreDataSource',
        error: e,
        stackTrace: stackTrace,
      );
      if (e.toString().contains('not found')) {
        rethrow;
      }
      throw Exception('Failed to delete user: $e');
    }
  }

  /// Converts Firestore document data to UserProfile
  UserProfile _userFromFirestore(String id, Map<String, dynamic> data) {
    return UserProfile(
      id: id,
      email: data['email'] as String,
      displayName: data['displayName'] as String?,
      avatarUrl: data['avatarUrl'] as String?,
      timezone: data['timezone'] as String?,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  /// Converts UserProfile to Firestore document data
  Map<String, dynamic> _userToFirestore(UserProfile user) {
    return {
      'email': user.email,
      'displayName': user.displayName,
      'avatarUrl': user.avatarUrl,
      'timezone': user.timezone,
      // Firestore requires a non-null DateTime when converting to Timestamp.
      // Use server timestamps when the domain model hasn't set values yet.
      'createdAt': user.createdAt != null
          ? Timestamp.fromDate(user.createdAt!)
          : FieldValue.serverTimestamp(),
      'updatedAt': user.updatedAt != null
          ? Timestamp.fromDate(user.updatedAt!)
          : FieldValue.serverTimestamp(),
    };
  }
}
