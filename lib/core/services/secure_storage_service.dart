import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thin wrapper around [FlutterSecureStorage] that falls back to an in-memory
/// map on unsupported platforms (e.g., Flutter web tests). This keeps the data
/// path uniform while ensuring production builds rely on the OS key store.
class SecureStorageService {
  SecureStorageService._();

  static final Map<String, String> _memoryStore = <String, String>{};
  static FlutterSecureStorage? _storage;
  static const bool _forceNativeSecureStorage =
      bool.fromEnvironment('ENABLE_NATIVE_SECURE_STORAGE', defaultValue: false);
  static bool _useMemoryFallback =
      !_forceNativeSecureStorage &&
          !kIsWeb &&
          defaultTargetPlatform == TargetPlatform.macOS;

  static FlutterSecureStorage get _secureStorage {
    return _storage ??= const FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
      ),
      iOptions: IOSOptions(
        accessibility: KeychainAccessibility.first_unlock,
      ),
      mOptions: MacOsOptions(
        accessibility: KeychainAccessibility.first_unlock,
      ),
      wOptions: WindowsOptions(),
      lOptions: LinuxOptions(),
    );
  }

  static bool get _shouldUseMemoryStore => kIsWeb || _useMemoryFallback;

  static bool _shouldFallbackToMemory(Object error) {
    if (error is PlatformException) {
      final mergedMessage = '${error.code} ${error.message} ${error.details}'
          .toLowerCase();
      if (mergedMessage.contains('entitlement') ||
          mergedMessage.contains('-34018')) {
        return true;
      }
    }
    return false;
  }

  static Future<String?> read(String key) async {
    if (_shouldUseMemoryStore) {
      return _memoryStore[key];
    }
    try {
      return await _secureStorage.read(key: key).timeout(
        const Duration(seconds: 3),
        onTimeout: () {
          debugPrint('⚠️  Secure storage read timeout for key: $key');
          return null;
        },
      );
    } catch (e) {
      debugPrint('⚠️  Secure storage read error for key $key: $e');
      if (_shouldFallbackToMemory(e)) {
        _useMemoryFallback = true;
        return _memoryStore[key];
      }
      return null;
    }
  }

  static Future<void> write(String key, String value) async {
    if (_shouldUseMemoryStore) {
      _memoryStore[key] = value;
      return;
    }
    try {
      await _secureStorage.write(key: key, value: value).timeout(
        const Duration(seconds: 3),
        onTimeout: () {
          debugPrint('⚠️  Secure storage write timeout for key: $key');
        },
      );
    } catch (e) {
      debugPrint('⚠️  Secure storage write error for key $key: $e');
      if (_shouldFallbackToMemory(e)) {
        _useMemoryFallback = true;
        _memoryStore[key] = value;
      }
      // swallow write errors; callers can retry or handle null reads later
    }
  }

  static Future<void> delete(String key) async {
    if (_shouldUseMemoryStore) {
      _memoryStore.remove(key);
      return;
    }
    try {
      await _secureStorage.delete(key: key);
    } catch (e) {
      if (_shouldFallbackToMemory(e)) {
        _useMemoryFallback = true;
        _memoryStore.remove(key);
      }
      // ignore delete failures otherwise
    }
  }
}
