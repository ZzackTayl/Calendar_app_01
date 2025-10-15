import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';

import 'package:encrypt/encrypt.dart';
import 'package:pointycastle/export.dart' as pc;

/// Service for handling end-to-end encryption of sensitive calendar data
/// Uses AES encryption with PBKDF2 key derivation for secure data protection
class EncryptionService {
  static const int _keyLength = 32; // 256 bits
  static const int _iterations = 10000;

  /// Generates a secure key from a password using PBKDF2
  static Key _deriveKey(String password, Uint8List salt) {
    final derivator = pc.PBKDF2KeyDerivator(
      pc.HMac(pc.SHA256Digest(), 64),
    );
    derivator.init(
      pc.Pbkdf2Parameters(
        salt,
        _iterations,
        _keyLength,
      ),
    );
    final keyBytes =
        derivator.process(Uint8List.fromList(utf8.encode(password)));
    return Key(keyBytes);
  }

  /// Generates a random salt for key derivation
  static Uint8List _generateSalt() {
    final random = Random.secure();
    final salt = Uint8List(16); // 128 bits
    for (int i = 0; i < salt.length; i++) {
      salt[i] = random.nextInt(256);
    }
    return salt;
  }

  /// Encrypts a string value
  /// Returns a base64 encoded string containing the salt, iv, and encrypted data
  static String encrypt(String data, String password) {
    final salt = _generateSalt();
    final key = _deriveKey(password, salt);

    final iv = IV.fromSecureRandom(16); // 128 bits
    final encrypter = Encrypter(AES(key, mode: AESMode.cbc));

    final encrypted = encrypter.encrypt(data, iv: iv);

    // Combine salt + iv + encrypted data and encode as base64
    final combined = <int>[
      ...salt,
      ...iv.bytes,
      ...encrypted.bytes,
    ];

    return base64Encode(combined);
  }

  /// Decrypts a string value
  /// Input is a base64 encoded string containing the salt, iv, and encrypted data
  static String? decrypt(String encryptedData, String password) {
    try {
      final bytes = base64Decode(encryptedData);

      // Extract salt (first 16 bytes), iv (next 16 bytes), and encrypted data (remaining)
      if (bytes.length < 32) {
        throw Exception('Invalid encrypted data format');
      }

      final salt = Uint8List.fromList(bytes.sublist(0, 16));
      final ivBytes = Uint8List.fromList(bytes.sublist(16, 32));
      final encryptedBytes = Uint8List.fromList(bytes.sublist(32));

      final key = _deriveKey(password, salt);
      final iv = IV(ivBytes);
      final encrypter = Encrypter(AES(key, mode: AESMode.cbc));

      final encrypted = Encrypted(encryptedBytes);
      return encrypter.decrypt(encrypted, iv: iv);
    } catch (e) {
      // Return null if decryption fails (invalid password or corrupted data)
      return null;
    }
  }

  /// Encrypts a map of data
  static String encryptMap(Map<String, dynamic> data, String password) {
    final jsonString = jsonEncode(data);
    return encrypt(jsonString, password);
  }

  /// Decrypts a map of data
  static Map<String, dynamic>? decryptMap(
      String encryptedData, String password) {
    final decryptedJson = decrypt(encryptedData, password);
    if (decryptedJson != null) {
      try {
        return jsonDecode(decryptedJson) as Map<String, dynamic>;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /// Generates a secure master key for user encryption
  static String generateSecureMasterKey() {
    final random = Random.secure();
    final key = Uint8List(32); // 256 bits
    for (int i = 0; i < key.length; i++) {
      key[i] = random.nextInt(256);
    }
    // Convert to hex string for storage
    return key.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  }
}

/// Service for managing user-specific encryption keys
class UserEncryptionManager {
  static final UserEncryptionManager _instance =
      UserEncryptionManager._internal();
  factory UserEncryptionManager() => _instance;
  UserEncryptionManager._internal();

  String? _userEncryptionKey;
  String? _currentUserId;

  /// Initializes encryption for a specific user
  void initializeForUser(String userId, String? userEncryptionKey) {
    _currentUserId = userId;
    _userEncryptionKey = userEncryptionKey;
  }

  /// Checks if encryption is properly initialized for the current user
  bool isInitialized() {
    return _userEncryptionKey != null && _currentUserId != null;
  }

  /// Encrypts sensitive data for the current user
  String? encryptSensitiveData(String data) {
    if (!isInitialized()) {
      return null;
    }
    return EncryptionService.encrypt(data, _userEncryptionKey!);
  }

  /// Decrypts sensitive data for the current user
  String? decryptSensitiveData(String encryptedData) {
    if (!isInitialized()) {
      return null;
    }
    return EncryptionService.decrypt(encryptedData, _userEncryptionKey!);
  }

  /// Encrypts a map of sensitive data
  String? encryptSensitiveMap(Map<String, dynamic> data) {
    if (!isInitialized()) {
      return null;
    }
    return EncryptionService.encryptMap(data, _userEncryptionKey!);
  }

  /// Decrypts a map of sensitive data
  Map<String, dynamic>? decryptSensitiveMap(String encryptedData) {
    if (!isInitialized()) {
      return null;
    }
    return EncryptionService.decryptMap(encryptedData, _userEncryptionKey!);
  }
}
