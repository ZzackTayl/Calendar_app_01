// Clean dependency injection for user management
// This creates all the dependencies needed for the user management feature

import '../../data/datasources/remote/auth_firebase_data_source.dart';
import '../../data/datasources/remote/auth_remote_data_source.dart';
import '../../data/datasources/remote/user_remote_data_source.dart';
import '../../data/datasources/remote/user_firestore_data_source.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/user_repository.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/repositories/user_repository.dart';
import '../../presentation/bloc/user/user_bloc.dart';
import '../firebase_initializer.dart';

/// Simple dependency injection container
/// This follows clean architecture principles by managing dependencies
class UserDependencyInjection {
  // Singleton instances
  static UserRemoteDataSource? _userRemoteDataSource;
  static UserRepository? _userRepository;

  // Configuration flag to control data source selection
  static bool _useFirestore = false;

  /// Configure whether to use Firestore or mock data
  ///
  /// Set this to true once Firebase is initialized and configured.
  /// Until then, the app will use mock data for development.
  ///
  /// Example usage in main.dart:
  /// ```dart
  /// await FirebaseInitializer.initialize();
  /// UserDependencyInjection.useFirestore = true;
  /// ```
  static set useFirestore(bool value) {
    if (value && !FirebaseInitializer.isInitialized) {
      throw StateError(
        'Cannot use Firestore before Firebase is initialized. '
        'Call FirebaseInitializer.initialize() first.',
      );
    }
    _useFirestore = value;
    // Reset singletons to pick up new data source
    _userRemoteDataSource = null;
    _userRepository = null;
  }

  /// Whether the app is currently configured to use Firestore
  static bool get isUsingFirestore => _useFirestore;

  /// Gets the user remote data source
  ///
  /// Returns either:
  /// - UserFirestoreDataSource if Firebase is initialized and useFirestore is true
  /// - UserRemoteDataSourceImpl (mock) otherwise
  static UserRemoteDataSource get userRemoteDataSource {
    if (_userRemoteDataSource != null) {
      return _userRemoteDataSource!;
    }

    if (_useFirestore && FirebaseInitializer.isInitialized) {
      _userRemoteDataSource = UserFirestoreDataSource();
    } else {
      _userRemoteDataSource = UserRemoteDataSourceImpl();
    }

    return _userRemoteDataSource!;
  }

  /// Gets the user repository with all dependencies injected
  static UserRepository get userRepository {
    return _userRepository ??= UserRepositoryImpl(
      remoteDataSource: userRemoteDataSource,
    );
  }

  /// Creates a new UserBloc instance with all dependencies
  /// Use this in your UI widgets to create the bloc
  static UserBloc createUserBloc() {
    return UserBloc(userRepository: userRepository);
  }

  /// Resets all dependencies (useful for testing)
  static void reset() {
    _userRemoteDataSource = null;
    _userRepository = null;
  }

  /// Allows injecting custom implementations (useful for testing)
  static void setUserRemoteDataSource(UserRemoteDataSource dataSource) {
    _userRemoteDataSource = dataSource;
    _userRepository = null; // Reset repository to use new data source
  }

  /// Allows injecting custom repository (useful for testing)
  static void setUserRepository(UserRepository repository) {
    _userRepository = repository;
  }
}

/// Dependency factory for authentication modules.
class AuthDependencyInjection {
  static AuthRemoteDataSource? _authRemoteDataSource;
  static AuthRepository? _authRepository;
  static bool _useFirebaseAuth = false;

  /// Enables Firebase-backed authentication once Firebase is initialized.
  static set useFirebaseAuth(bool value) {
    if (value && !FirebaseInitializer.isInitialized) {
      throw StateError(
        'Cannot enable Firebase authentication before Firebase.initializeApp() completes.',
      );
    }
    _useFirebaseAuth = value;
    _authRemoteDataSource = null;
    _authRepository = null;
  }

  static bool get isUsingFirebaseAuth => _useFirebaseAuth;

  static AuthRemoteDataSource get authRemoteDataSource {
    if (_authRemoteDataSource != null) {
      return _authRemoteDataSource!;
    }

    if (_useFirebaseAuth && FirebaseInitializer.isInitialized) {
      _authRemoteDataSource = FirebaseAuthRemoteDataSource();
    } else {
      _authRemoteDataSource = MockAuthRemoteDataSource();
    }

    return _authRemoteDataSource!;
  }

  static AuthRepository get authRepository {
    return _authRepository ??= AuthRepositoryImpl(
      remoteDataSource: authRemoteDataSource,
    );
  }

  static void reset() {
    _authRemoteDataSource = null;
    _authRepository = null;
  }

  static void setAuthRemoteDataSource(AuthRemoteDataSource dataSource) {
    _authRemoteDataSource = dataSource;
    _authRepository = null;
  }

  static void setAuthRepository(AuthRepository repository) {
    _authRepository = repository;
  }
}
