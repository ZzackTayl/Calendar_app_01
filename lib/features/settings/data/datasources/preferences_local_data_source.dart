import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../domain/user_preferences.dart';

/// Local data source for user preferences using SharedPreferences
abstract class PreferencesLocalDataSource {
  Future<UserPreferences?> getPreferences();
  Future<void> savePreferences(UserPreferences preferences);
  Future<void> deletePreferences();
}

/// SharedPreferences implementation of PreferencesLocalDataSource
class PreferencesSharedPrefsDataSource implements PreferencesLocalDataSource {
  final SharedPreferences sharedPreferences;
  static const _prefsKey = 'user_preferences_v1';

  PreferencesSharedPrefsDataSource({required this.sharedPreferences});

  @override
  Future<UserPreferences?> getPreferences() async {
    final jsonString = sharedPreferences.getString(_prefsKey);
    if (jsonString == null) {
      return null;
    }

    try {
      final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
      return UserPreferences.fromJson(decoded);
    } catch (e) {
      // If parsing fails, return null
      return null;
    }
  }

  @override
  Future<void> savePreferences(UserPreferences preferences) async {
    final jsonString = jsonEncode(preferences.toJson());
    await sharedPreferences.setString(_prefsKey, jsonString);
  }

  @override
  Future<void> deletePreferences() async {
    await sharedPreferences.remove(_prefsKey);
  }
}
