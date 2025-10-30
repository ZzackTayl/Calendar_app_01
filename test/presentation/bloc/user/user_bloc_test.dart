import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/domain/repositories/user_repository.dart';
import 'package:myorbit_calendar/domain/user_profile.dart';
import 'package:myorbit_calendar/presentation/bloc/user/user_bloc.dart';
import 'package:myorbit_calendar/presentation/bloc/user/user_event.dart';
import 'package:myorbit_calendar/presentation/bloc/user/user_state.dart';

import 'user_bloc_test.mocks.dart';

@GenerateMocks([UserRepository])
void main() {
  // Provide dummy values for Mockito
  provideDummy<Result<List<UserProfile>>>(
    const Success<List<UserProfile>>([]),
  );
  provideDummy<Result<UserProfile>>(
    const Success<UserProfile>(
      UserProfile(
        id: 'dummy',
        email: 'dummy@example.com',
        displayName: 'Dummy',
        avatarUrl: null,
        timezone: null,
        createdAt: null,
        updatedAt: null,
      ),
    ),
  );
  provideDummy<Result<void>>(const Success<void>(null));
  late UserBloc userBloc;
  late MockUserRepository mockUserRepository;

  setUp(() {
    mockUserRepository = MockUserRepository();
    userBloc = UserBloc(userRepository: mockUserRepository);
  });

  tearDown(() {
    userBloc.close();
  });

  group('UserBloc', () {
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

    test('initial state is UserInitial', () {
      expect(userBloc.state, equals(const UserInitial()));
    });

    group('LoadUsers', () {
      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserLoaded] when users are loaded successfully',
        build: () {
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => Success(testUsers));
          return userBloc;
        },
        act: (bloc) => bloc.add(const LoadUsers()),
        expect: () => [
          const UserLoading(),
          UserLoaded(testUsers),
        ],
        verify: (_) {
          verify(mockUserRepository.getUsers()).called(1);
        },
      );

      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserError] when loading users fails',
        build: () {
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => const Failure('Network error'));
          return userBloc;
        },
        act: (bloc) => bloc.add(const LoadUsers()),
        expect: () => [
          const UserLoading(),
          const UserError(message:'Network error'),
        ],
        verify: (_) {
          verify(mockUserRepository.getUsers()).called(1);
        },
      );
    });

    group('LoadUser', () {
      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserDetailLoaded] when user is loaded successfully',
        build: () {
          when(mockUserRepository.getUserById('1'))
              .thenAnswer((_) async => Success(testUser));
          return userBloc;
        },
        act: (bloc) => bloc.add(const LoadUser('1')),
        expect: () => [
          const UserLoading(),
          UserDetailLoaded(testUser),
        ],
        verify: (_) {
          verify(mockUserRepository.getUserById('1')).called(1);
        },
      );

      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserError] when loading user fails',
        build: () {
          when(mockUserRepository.getUserById('1'))
              .thenAnswer((_) async => const Failure('User not found'));
          return userBloc;
        },
        act: (bloc) => bloc.add(const LoadUser('1')),
        expect: () => [
          const UserLoading(),
          const UserError(message:'User not found'),
        ],
        verify: (_) {
          verify(mockUserRepository.getUserById('1')).called(1);
        },
      );
    });

    group('CreateUser', () {
      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserOperationSuccess, UserLoading, UserLoaded] when user is created successfully',
        build: () {
          when(mockUserRepository.createUser(testUser))
              .thenAnswer((_) async => Success(testUser));
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => Success(testUsers));
          return userBloc;
        },
        act: (bloc) => bloc.add(CreateUser(testUser)),
        expect: () => [
          const UserLoading(),
          UserOperationSuccess(
            message: 'User created successfully',
            user: testUser,
          ),
          const UserLoading(),
          UserLoaded(testUsers),
        ],
        verify: (_) {
          verify(mockUserRepository.createUser(testUser)).called(1);
          verify(mockUserRepository.getUsers()).called(1);
        },
      );

      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserError] when creating user fails',
        build: () {
          when(mockUserRepository.createUser(testUser))
              .thenAnswer((_) async => const Failure('Email already exists'));
          return userBloc;
        },
        act: (bloc) => bloc.add(CreateUser(testUser)),
        expect: () => [
          const UserLoading(),
          const UserError(message:'Email already exists'),
        ],
        verify: (_) {
          verify(mockUserRepository.createUser(testUser)).called(1);
        },
      );
    });

    group('UpdateUser', () {
      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserOperationSuccess, UserLoading, UserLoaded] when user is updated successfully',
        build: () {
          when(mockUserRepository.updateUser(testUser))
              .thenAnswer((_) async => Success(testUser));
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => Success(testUsers));
          return userBloc;
        },
        act: (bloc) => bloc.add(UpdateUser(testUser)),
        expect: () => [
          const UserLoading(),
          UserOperationSuccess(
            message: 'User updated successfully',
            user: testUser,
          ),
          const UserLoading(),
          UserLoaded(testUsers),
        ],
        verify: (_) {
          verify(mockUserRepository.updateUser(testUser)).called(1);
          verify(mockUserRepository.getUsers()).called(1);
        },
      );

      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserError] when updating user fails',
        build: () {
          when(mockUserRepository.updateUser(testUser))
              .thenAnswer((_) async => const Failure('User not found'));
          return userBloc;
        },
        act: (bloc) => bloc.add(UpdateUser(testUser)),
        expect: () => [
          const UserLoading(),
          const UserError(message:'User not found'),
        ],
        verify: (_) {
          verify(mockUserRepository.updateUser(testUser)).called(1);
        },
      );
    });

    group('DeleteUser', () {
      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserOperationSuccess, UserLoading, UserLoaded] when user is deleted successfully',
        build: () {
          when(mockUserRepository.deleteUser('1'))
              .thenAnswer((_) async => const Success(null));
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => Success([testUsers.last]));
          return userBloc;
        },
        act: (bloc) => bloc.add(const DeleteUser('1')),
        expect: () => [
          const UserLoading(),
          const UserOperationSuccess(message: 'User deleted successfully'),
          const UserLoading(),
          UserLoaded([testUsers.last]),
        ],
        verify: (_) {
          verify(mockUserRepository.deleteUser('1')).called(1);
          verify(mockUserRepository.getUsers()).called(1);
        },
      );

      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserError] when deleting user fails',
        build: () {
          when(mockUserRepository.deleteUser('1'))
              .thenAnswer((_) async => const Failure('User not found'));
          return userBloc;
        },
        act: (bloc) => bloc.add(const DeleteUser('1')),
        expect: () => [
          const UserLoading(),
          const UserError(message:'User not found'),
        ],
        verify: (_) {
          verify(mockUserRepository.deleteUser('1')).called(1);
        },
      );
    });

    group('RefreshUsers', () {
      blocTest<UserBloc, UserState>(
        'emits [UserRefreshing, UserLoaded] when refreshing from UserLoaded state',
        build: () {
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => Success(testUsers));
          return userBloc;
        },
        seed: () => UserLoaded(testUsers),
        act: (bloc) => bloc.add(const RefreshUsers()),
        expect: () => [
          UserRefreshing(testUsers),
          UserLoaded(testUsers),
        ],
        verify: (_) {
          verify(mockUserRepository.getUsers()).called(1);
        },
      );

      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserLoaded] when refreshing from initial state',
        build: () {
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => Success(testUsers));
          return userBloc;
        },
        act: (bloc) => bloc.add(const RefreshUsers()),
        expect: () => [
          const UserLoading(),
          UserLoaded(testUsers),
        ],
        verify: (_) {
          verify(mockUserRepository.getUsers()).called(1);
        },
      );

      blocTest<UserBloc, UserState>(
        'emits [UserLoading, UserError] when refresh fails',
        build: () {
          when(mockUserRepository.getUsers())
              .thenAnswer((_) async => const Failure('Network error'));
          return userBloc;
        },
        act: (bloc) => bloc.add(const RefreshUsers()),
        expect: () => [
          const UserLoading(),
          const UserError(message:'Network error'),
        ],
        verify: (_) {
          verify(mockUserRepository.getUsers()).called(1);
        },
      );
    });
  });
}