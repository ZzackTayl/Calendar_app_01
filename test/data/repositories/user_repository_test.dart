import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/data/datasources/remote/user_remote_data_source.dart';
import 'package:myorbit_calendar/data/repositories/user_repository.dart';
import 'package:myorbit_calendar/domain/user_profile.dart';

import 'user_repository_test.mocks.dart';

@GenerateMocks([UserRemoteDataSource])
void main() {
  late UserRepositoryImpl repository;
  late MockUserRemoteDataSource mockRemoteDataSource;

  setUp(() {
    mockRemoteDataSource = MockUserRemoteDataSource();
    repository = UserRepositoryImpl(remoteDataSource: mockRemoteDataSource);
  });

  group('UserRepositoryImpl', () {
    final testUsers = [
      const UserProfile(
        id: '1',
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar1.jpg',
        timezone: 'America/New_York',
        createdAt: null,
        updatedAt: null,
      ),
      const UserProfile(
        id: '2',
        email: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        timezone: 'America/Los_Angeles',
        createdAt: null,
        updatedAt: null,
      ),
    ];

    final testUser = testUsers.first;

    group('getUsers', () {
      test('returns Success with users when remote data source succeeds', () async {
        // Arrange
        when(mockRemoteDataSource.getUsers())
            .thenAnswer((_) async => testUsers);

        // Act
        final result = await repository.getUsers();

        // Assert
        expect(result, isA<Success<List<UserProfile>>>());
        result.when(
          success: (users) => expect(users, equals(testUsers)),
          failure: (message, exception) => fail('Expected success but got failure'),
        );
        verify(mockRemoteDataSource.getUsers()).called(1);
      });

      test('returns Failure when remote data source throws exception', () async {
        // Arrange
        when(mockRemoteDataSource.getUsers())
            .thenThrow(Exception('Network error'));

        // Act
        final result = await repository.getUsers();

        // Assert
        expect(result, isA<Failure<List<UserProfile>>>());
        result.when(
          success: (users) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, contains('Network error')),
        );
        verify(mockRemoteDataSource.getUsers()).called(1);
      });
    });

    group('getUserById', () {
      test('returns Success with user when remote data source succeeds', () async {
        // Arrange
        when(mockRemoteDataSource.getUserById('1'))
            .thenAnswer((_) async => testUser);

        // Act
        final result = await repository.getUserById('1');

        // Assert
        expect(result, isA<Success<UserProfile>>());
        result.when(
          success: (user) => expect(user, equals(testUser)),
          failure: (message, exception) => fail('Expected success but got failure'),
        );
        verify(mockRemoteDataSource.getUserById('1')).called(1);
      });

      test('returns Failure when remote data source throws exception', () async {
        // Arrange
        when(mockRemoteDataSource.getUserById('1'))
            .thenThrow(Exception('User not found'));

        // Act
        final result = await repository.getUserById('1');

        // Assert
        expect(result, isA<Failure<UserProfile>>());
        result.when(
          success: (user) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, contains('User not found')),
        );
        verify(mockRemoteDataSource.getUserById('1')).called(1);
      });
    });

    group('createUser', () {
      test('returns Success with created user when data is valid', () async {
        // Arrange
        when(mockRemoteDataSource.createUser(testUser))
            .thenAnswer((_) async => testUser);

        // Act
        final result = await repository.createUser(testUser);

        // Assert
        expect(result, isA<Success<UserProfile>>());
        result.when(
          success: (user) => expect(user, equals(testUser)),
          failure: (message, exception) => fail('Expected success but got failure'),
        );
        verify(mockRemoteDataSource.createUser(testUser)).called(1);
      });

      test('returns Failure when email is empty', () async {
        // Arrange
        final invalidUser = testUser.copyWith(email: '');

        // Act
        final result = await repository.createUser(invalidUser);

        // Assert
        expect(result, isA<Failure<UserProfile>>());
        result.when(
          success: (user) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, 'Email is required'),
        );
        verifyNever(mockRemoteDataSource.createUser(any));
      });

      test('returns Failure when display name is empty', () async {
        // Arrange
        final invalidUser = testUser.copyWith(displayName: '');

        // Act
        final result = await repository.createUser(invalidUser);

        // Assert
        expect(result, isA<Failure<UserProfile>>());
        result.when(
          success: (user) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, 'Display name is required'),
        );
        verifyNever(mockRemoteDataSource.createUser(any));
      });

      test('returns Failure when email format is invalid', () async {
        // Arrange
        final invalidUser = testUser.copyWith(email: 'invalid-email');

        // Act
        final result = await repository.createUser(invalidUser);

        // Assert
        expect(result, isA<Failure<UserProfile>>());
        result.when(
          success: (user) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, 'Invalid email format'),
        );
        verifyNever(mockRemoteDataSource.createUser(any));
      });

      test('returns Failure when remote data source throws exception', () async {
        // Arrange
        when(mockRemoteDataSource.createUser(testUser))
            .thenThrow(Exception('Email already exists'));

        // Act
        final result = await repository.createUser(testUser);

        // Assert
        expect(result, isA<Failure<UserProfile>>());
        result.when(
          success: (user) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, contains('Email already exists')),
        );
        verify(mockRemoteDataSource.createUser(testUser)).called(1);
      });
    });

    group('updateUser', () {
      test('returns Success with updated user when data is valid', () async {
        // Arrange
        when(mockRemoteDataSource.updateUser(testUser))
            .thenAnswer((_) async => testUser);

        // Act
        final result = await repository.updateUser(testUser);

        // Assert
        expect(result, isA<Success<UserProfile>>());
        result.when(
          success: (user) => expect(user, equals(testUser)),
          failure: (message, exception) => fail('Expected success but got failure'),
        );
        verify(mockRemoteDataSource.updateUser(testUser)).called(1);
      });

      test('returns Failure when email is empty', () async {
        // Arrange
        final invalidUser = testUser.copyWith(email: '');

        // Act
        final result = await repository.updateUser(invalidUser);

        // Assert
        expect(result, isA<Failure<UserProfile>>());
        result.when(
          success: (user) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, 'Email is required'),
        );
        verifyNever(mockRemoteDataSource.updateUser(any));
      });

      test('returns Failure when remote data source throws exception', () async {
        // Arrange
        when(mockRemoteDataSource.updateUser(testUser))
            .thenThrow(Exception('User not found'));

        // Act
        final result = await repository.updateUser(testUser);

        // Assert
        expect(result, isA<Failure<UserProfile>>());
        result.when(
          success: (user) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, contains('User not found')),
        );
        verify(mockRemoteDataSource.updateUser(testUser)).called(1);
      });
    });

    group('deleteUser', () {
      test('returns Success when remote data source succeeds', () async {
        // Arrange
        when(mockRemoteDataSource.deleteUser('1'))
            .thenAnswer((_) async {});

        // Act
        final result = await repository.deleteUser('1');

        // Assert
        expect(result, isA<Success<void>>());
        result.when(
          success: (_) => expect(true, isTrue),
          failure: (message, exception) => fail('Expected success but got failure'),
        );
        verify(mockRemoteDataSource.deleteUser('1')).called(1);
      });

      test('returns Failure when remote data source throws exception', () async {
        // Arrange
        when(mockRemoteDataSource.deleteUser('1'))
            .thenThrow(Exception('User not found'));

        // Act
        final result = await repository.deleteUser('1');

        // Assert
        expect(result, isA<Failure<void>>());
        result.when(
          success: (_) => fail('Expected failure but got success'),
          failure: (message, exception) => expect(message, contains('User not found')),
        );
        verify(mockRemoteDataSource.deleteUser('1')).called(1);
      });
    });
  });
}