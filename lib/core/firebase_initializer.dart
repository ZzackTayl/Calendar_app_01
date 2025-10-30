import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'env.dart';
import 'firebase_options_dev.dart' as dev;
import 'firebase_options_staging.dart' as staging;
import 'firebase_options_prod.dart' as prod;

/// Handles Firebase initialization with environment-specific configuration
///
/// This utility selects the correct Firebase options based on the APP_ENV
/// environment variable and initializes Firebase accordingly.
class FirebaseInitializer {
  /// Initializes Firebase with the appropriate configuration for the current environment
  ///
  /// The environment is determined by the APP_ENV variable:
  /// - 'dev' → uses firebase_options_dev.dart
  /// - 'staging' → uses firebase_options_staging.dart
  /// - 'prod' → uses firebase_options_prod.dart
  ///
  /// If Firebase is already initialized, this is a no-op.
  ///
  /// Throws [UnsupportedError] if the firebase_options files haven't been generated yet.
  static Future<void> initialize() async {
    // Check if Firebase is already initialized
    try {
      Firebase.app();
      if (kDebugMode) {
        print('Firebase already initialized');
      }
      return;
    } catch (e) {
      // Firebase not initialized yet, continue with initialization
    }

    final environment = Env.firebaseEnvironment;

    if (kDebugMode) {
      print('Initializing Firebase for environment: $environment');
    }

    try {
      FirebaseOptions options;

      switch (environment) {
        case 'prod':
          options = prod.DefaultFirebaseOptions.currentPlatform;
          break;
        case 'staging':
          options = staging.DefaultFirebaseOptions.currentPlatform;
          break;
        case 'dev':
        default:
          options = dev.DefaultFirebaseOptions.currentPlatform;
      }

      await Firebase.initializeApp(options: options);

      if (kDebugMode) {
        print('Firebase initialized successfully for $environment');
      }
    } catch (e) {
      if (e is UnsupportedError) {
        // This happens when firebase_options files haven't been generated yet
        if (kDebugMode) {
          print('Firebase options not configured yet. Please run:');
          print('fvm flutterfire configure --project=myorbit-$environment --out=lib/core/firebase_options_$environment.dart --platforms=android,ios,macos,web');
        }
        rethrow;
      }
      // Re-throw other errors
      rethrow;
    }
  }

  /// Returns whether Firebase has been initialized
  static bool get isInitialized {
    try {
      Firebase.app();
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Gets the current Firebase app instance
  ///
  /// Throws if Firebase hasn't been initialized yet
  static FirebaseApp get app => Firebase.app();
}
