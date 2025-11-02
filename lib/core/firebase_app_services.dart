import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';

import 'env.dart';
import 'firebase_initializer.dart';

/// Centralized access to configured Firebase services used throughout the app.
///
/// This singleton-style helper ensures we only touch Firebase SDK instances
/// after the core has been initialized and provides convenient hooks for
/// emulator configuration plus testing overrides.
class FirebaseAppServices {
  FirebaseAppServices._();

  static FirebaseAuth? _authOverride;
  static FirebaseFirestore? _firestoreOverride;
  static FirebaseFunctions? _functionsOverride;
  static FirebaseStorage? _storageOverride;
  static bool _emulatorsConfigured = false;
  static bool? _configuredOverride;
  static bool? _authenticatedOverride;
  static User? _currentUserOverride;

  static FirebaseAuth get auth {
    if (_authOverride != null) {
      return _authOverride!;
    }
    _ensureInitialized('FirebaseAuth');
    return FirebaseAuth.instance;
  }

  static FirebaseFirestore get firestore {
    if (_firestoreOverride != null) {
      return _firestoreOverride!;
    }
    _ensureInitialized('FirebaseFirestore');
    return FirebaseFirestore.instance;
  }

  static FirebaseFunctions get functions {
    if (_functionsOverride != null) {
      return _functionsOverride!;
    }
    _ensureInitialized('FirebaseFunctions');
    final region = Env.firebaseFunctionsRegion;
    return FirebaseFunctions.instanceFor(region: region);
  }

  static FirebaseStorage get storage {
    if (_storageOverride != null) {
      return _storageOverride!;
    }
    _ensureInitialized('FirebaseStorage');
    return FirebaseStorage.instance;
  }

  static bool get isConfigured =>
      _configuredOverride ?? FirebaseInitializer.isInitialized;

  static User? get currentUser {
    if (_currentUserOverride != null) {
      return _currentUserOverride;
    }
    if (!FirebaseInitializer.isInitialized) {
      return null;
    }
    return FirebaseAuth.instance.currentUser;
  }

  static bool get isAuthenticated =>
      _authenticatedOverride ?? currentUser != null;

  static Stream<User?> get authStateChanges {
    if (!FirebaseInitializer.isInitialized) {
      return const Stream<User?>.empty();
    }
    return FirebaseAuth.instance.authStateChanges();
  }

  /// Get the Firebase ID token for the current user
  static Future<String?> getIdToken() async {
    if (!FirebaseInitializer.isInitialized) {
      return null;
    }
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return null;
    }
    return await user.getIdToken();
  }

  /// Configures Firebase emulators based on environment flags.
  ///
  /// This is idempotent and safe to call multiple times.
  static Future<void> configureEmulatorsIfNeeded() async {
    if (_emulatorsConfigured || !isConfigured) {
      return;
    }

    if (!Env.firebaseEmulatorsEnabled) {
      _emulatorsConfigured = true;
      return;
    }

    final host = Env.firebaseEmulatorHost;
    final useAuthEmulator = Env.firebaseAuthEmulatorEnabled;
    final useFirestoreEmulator = Env.firestoreEmulatorEnabled;
    final useFunctionsEmulator = Env.firebaseFunctionsEmulatorEnabled;
    final useStorageEmulator = Env.firebaseStorageEmulatorEnabled;

    if (useAuthEmulator) {
      await FirebaseAuth.instance.useAuthEmulator(
        host,
        Env.firebaseAuthEmulatorPort,
      );
    }

    if (useFirestoreEmulator) {
      FirebaseFirestore.instance.useFirestoreEmulator(
        host,
        Env.firestoreEmulatorPort,
      );
    }

    if (useFunctionsEmulator) {
      FirebaseFunctions.instanceFor(region: Env.firebaseFunctionsRegion)
          .useFunctionsEmulator(
        host,
        Env.firebaseFunctionsEmulatorPort,
      );
    }

    if (useStorageEmulator) {
      FirebaseStorage.instance.useStorageEmulator(
        host,
        Env.firebaseStorageEmulatorPort,
      );
    }

    _emulatorsConfigured = true;
  }

  /// Testing hooks to override Firebase instances without touching the SDK.
  @visibleForTesting
  static void debugOverrideServices({
    FirebaseAuth? auth,
    FirebaseFirestore? firestore,
    FirebaseFunctions? functions,
    FirebaseStorage? storage,
  }) {
    _authOverride = auth;
    _firestoreOverride = firestore;
    _functionsOverride = functions;
    _storageOverride = storage;
  }

  /// Overrides high-level state for deterministic testing.
  @visibleForTesting
  static void debugOverrideAuthState({
    bool? isConfigured,
    bool? isAuthenticated,
    User? currentUser,
  }) {
    _configuredOverride = isConfigured;
    _authenticatedOverride = isAuthenticated;
    _currentUserOverride = currentUser;
  }

  /// Clears any testing overrides.
  @visibleForTesting
  static void debugResetOverrides() {
    _authOverride = null;
    _firestoreOverride = null;
    _functionsOverride = null;
    _storageOverride = null;
    _configuredOverride = null;
    _authenticatedOverride = null;
    _currentUserOverride = null;
    _emulatorsConfigured = false;
  }

  static void _ensureInitialized(String serviceName) {
    if (!FirebaseInitializer.isInitialized) {
      throw StateError(
        '$serviceName requested before Firebase was initialized. '
        'Ensure FirebaseInitializer.initialize() completes first.',
      );
    }
  }
}
