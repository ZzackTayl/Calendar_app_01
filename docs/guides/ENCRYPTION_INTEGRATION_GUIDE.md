# Encryption Integration Guide

**Status:** DEFERRED - Encryption temporarily removed for development  
**Last Updated:** October 20, 2025  
**Priority:** Re-enable before production deployment

---

## Overview

This app includes an `EncryptionService` for securing sensitive user data (settings, calendar events, contact information). During development, encryption was **temporarily removed from the settings provider** because it was causing app initialization to hang.

**Important:** You must re-enable encryption before deploying to production.

---

## What Was Changed (October 20, 2025)

### Files Modified
- **`lib/logic/providers/settings_providers.dart`**
  - Removed import: `import '../../core/services/encryption_service.dart';`
  - Removed encryption/decryption in `build()` method
  - Removed encryption in `_save()` method
  - Removed `_getEncryptionKey()` helper method

### Before (With Encryption - CAUSED HANGING):
```dart
import '../../core/services/encryption_service.dart';

@override
Future<SettingsState> build() async {
  final prefs = await SharedPreferences.getInstance();
  final encryptedString = prefs.getString(_prefsKey);
  if (encryptedString == null) {
    return const SettingsState();
  }

  try {
    String? decryptedString = EncryptionService.decrypt(encryptedString, _getEncryptionKey());
    decryptedString ??= encryptedString;
    final decoded = jsonDecode(decryptedString) as Map<String, dynamic>;
    return SettingsState.fromJson(decoded);
  } catch (_) {
    return const SettingsState();
  }
}

Future<void> _save(SettingsState settings) async {
  final prefs = await SharedPreferences.getInstance();
  final jsonString = jsonEncode(settings.toJson());
  final encryptedString = EncryptionService.encrypt(jsonString, _getEncryptionKey());
  await prefs.setString(_prefsKey, encryptedString);
}

String _getEncryptionKey() {
  return 'myorbit_settings_key_v1';
}
```

### After (Without Encryption - CURRENT):
```dart
@override
Future<SettingsState> build() async {
  final prefs = await SharedPreferences.getInstance();
  final jsonString = prefs.getString(_prefsKey);
  if (jsonString == null) {
    return const SettingsState();
  }

  try {
    final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
    return SettingsState.fromJson(decoded);
  } catch (_) {
    return const SettingsState();
  }
}

Future<void> _save(SettingsState settings) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_prefsKey, jsonEncode(settings.toJson()));
}
```

---

## Encryption Service Location

The encryption service is **still available** and ready to use:

### Primary Service
- **File:** `lib/core/services/encryption_service.dart`
- **Class:** `EncryptionService`
- **Algorithm:** AES-256 with PBKDF2 key derivation
- **Dependencies:** 
  - `encrypt: ^5.0.3`
  - `pointycastle: ^3.9.1`

### Secure Storage Service
- **File:** `lib/core/services/secure_storage_service.dart`
- **Purpose:** Store encryption keys securely using platform-specific keychains
- **Uses:** `flutter_secure_storage` package

---

## How to Re-Enable Encryption (Production Checklist)

### Step 1: Understand the Hanging Issue
The original implementation caused the app to hang because:
1. Encryption was called synchronously on app startup
2. PBKDF2 key derivation (10,000 iterations) is CPU-intensive
3. No timeout or async isolation was implemented

### Step 2: Choose the Right Encryption Strategy

#### Option A: Encrypt Only Sensitive Fields (Recommended)
Instead of encrypting all settings, only encrypt truly sensitive data:
- Calendar event details (titles, descriptions, locations)
- Contact information (names, phone numbers, emails)
- User profile data
- Authentication tokens (if stored locally)

**Do NOT encrypt:**
- UI preferences (dark mode, language)
- Non-sensitive settings (timezone, notification preferences)

#### Option B: Use Async Isolation for Settings Encryption
If you must encrypt settings, run encryption in an isolate:
```dart
import 'dart:isolate';

Future<String> _encryptAsync(String data, String key) async {
  return await compute(_encryptInIsolate, {'data': data, 'key': key});
}

String _encryptInIsolate(Map<String, String> params) {
  return EncryptionService.encrypt(params['data']!, params['key']!);
}
```

### Step 3: Implement User-Specific Encryption Keys

**Current Issue:** The removed code used a hardcoded key: `'myorbit_settings_key_v1'`

**Production Solution:**
```dart
// Store key in secure storage
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class EncryptionKeyManager {
  static const _storage = FlutterSecureStorage();
  static const _keyName = 'user_encryption_master_key';
  
  /// Get or create user's encryption key
  static Future<String> getUserEncryptionKey(String userId) async {
    String? key = await _storage.read(key: '${_keyName}_$userId');
    
    if (key == null) {
      // Generate new secure key for this user
      key = EncryptionService.generateSecureMasterKey();
      await _storage.write(key: '${_keyName}_$userId', value: key);
    }
    
    return key;
  }
  
  /// Clear key on logout
  static Future<void> clearUserEncryptionKey(String userId) async {
    await _storage.delete(key: '${_keyName}_$userId');
  }
}
```

### Step 4: Update Settings Provider (Production Version)

```dart
import 'dart:isolate';
import 'package:flutter/foundation.dart';
import '../../core/services/encryption_service.dart';
import '../../core/services/encryption_key_manager.dart';

class SettingsController extends _$SettingsController {
  static const _prefsKey = 'settings_state_v1';
  String? _encryptionKey;

  @override
  Future<SettingsState> build() async {
    // Initialize encryption key from secure storage
    final userId = ref.read(currentUserProvider).value?.id;
    if (userId != null) {
      _encryptionKey = await EncryptionKeyManager.getUserEncryptionKey(userId);
    }
    
    final prefs = await SharedPreferences.getInstance();
    final storedString = prefs.getString(_prefsKey);
    
    if (storedString == null) {
      return const SettingsState();
    }

    try {
      String jsonString;
      
      // Try to decrypt if we have a key
      if (_encryptionKey != null) {
        jsonString = await compute(_decryptInIsolate, {
          'data': storedString,
          'key': _encryptionKey!,
        }) ?? storedString;
      } else {
        jsonString = storedString;
      }
      
      final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
      return SettingsState.fromJson(decoded);
    } catch (e) {
      debugPrint('⚠️  Failed to load settings: $e');
      return const SettingsState();
    }
  }

  Future<void> _save(SettingsState settings) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = jsonEncode(settings.toJson());
    
    String toStore;
    if (_encryptionKey != null) {
      toStore = await compute(_encryptInIsolate, {
        'data': jsonString,
        'key': _encryptionKey!,
      });
    } else {
      toStore = jsonString;
    }
    
    await prefs.setString(_prefsKey, toStore);
  }
  
  static String? _decryptInIsolate(Map<String, String> params) {
    return EncryptionService.decrypt(params['data']!, params['key']!);
  }
  
  static String _encryptInIsolate(Map<String, String> params) {
    return EncryptionService.encrypt(params['data']!, params['key']!);
  }
}
```

### Step 5: Test Encryption Performance

Before deploying, benchmark encryption performance:

```dart
// Add to test/services/encryption_service_test.dart
void main() {
  test('Encryption performance benchmark', () async {
    final data = jsonEncode({'test': 'data' * 1000}); // 4KB
    final key = EncryptionService.generateSecureMasterKey();
    
    final stopwatch = Stopwatch()..start();
    final encrypted = EncryptionService.encrypt(data, key);
    final encryptTime = stopwatch.elapsedMilliseconds;
    
    stopwatch.reset();
    final decrypted = EncryptionService.decrypt(encrypted, key);
    final decryptTime = stopwatch.elapsedMilliseconds;
    
    print('Encrypt: ${encryptTime}ms, Decrypt: ${decryptTime}ms');
    
    // Should be under 100ms on most devices
    expect(encryptTime, lessThan(100));
    expect(decryptTime, lessThan(100));
  });
}
```

---

## Pre-Production Checklist

- [ ] Review security assessment: `docs/security_assessment_2025-10-20.md`
- [ ] Implement `EncryptionKeyManager` with secure storage
- [ ] Move encryption to compute isolates
- [ ] Re-enable encryption for sensitive data only
- [ ] Test app startup performance (<3s on average device)
- [ ] Add encryption key backup/recovery flow
- [ ] Document key rotation strategy
- [ ] Add encryption status to privacy policy
- [ ] Test data migration from unencrypted to encrypted storage
- [ ] Verify encryption doesn't break SharedPreferences limits (1MB per key)

---

## Additional Resources

- **Encryption Service Implementation:** `lib/core/services/encryption_service.dart`
- **Secure Storage Service:** `lib/core/services/secure_storage_service.dart`
- **Security Assessment:** `docs/security_assessment_2025-10-20.md`
- **User Encryption Manager:** `lib/logic/services/user_encryption_manager.dart` (in EncryptionService)

---

## Questions or Concerns?

If you need help re-integrating encryption:
1. Review this guide thoroughly
2. Check the security assessment document
3. Test encryption in an isolated environment first
4. Consider consulting a security expert for key management strategy

**Remember:** The encryption infrastructure is ready and working. We just need to integrate it properly without blocking the UI thread.
