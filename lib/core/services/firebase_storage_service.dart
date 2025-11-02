import 'package:firebase_storage/firebase_storage.dart';

import '../firebase_initializer.dart';

/// Thin wrapper around [FirebaseStorage] that ensures Firebase has been
/// initialized before exposing the storage instance. This prevents accidental
/// access prior to `Firebase.initializeApp()` completing during bootstrap.
class FirebaseStorageService {
  FirebaseStorageService._();

  /// Returns the shared [FirebaseStorage] instance.
  ///
  /// Throws a [StateError] when Firebase hasn't finished initializing. This is
  /// intentionally strict so that call sites surface bootstrap ordering bugs
  /// early in development and tests, rather than silently failing at runtime.
  static FirebaseStorage get instance {
    if (!FirebaseInitializer.isInitialized) {
      throw StateError(
        'FirebaseStorage accessed before Firebase.initializeApp completed.',
      );
    }
    return FirebaseStorage.instance;
  }

  /// Convenience helper for building storage references within the
  /// "profile-pictures" bucket namespace.
  static Reference profilePicturesRoot(String userId) {
    return instance.ref().child('profile-pictures').child(userId);
  }
}
