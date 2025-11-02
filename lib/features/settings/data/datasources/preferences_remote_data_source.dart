import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../../domain/user_preferences.dart';

/// Remote data source for user preferences using Firestore
abstract class PreferencesRemoteDataSource {
  Future<UserPreferences?> getPreferences();
  Future<UserPreferences> savePreferences(UserPreferences preferences);
  Future<void> deletePreferences();
}

/// Firestore implementation of PreferencesRemoteDataSource
class PreferencesFirestoreDataSource implements PreferencesRemoteDataSource {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  PreferencesFirestoreDataSource({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  String get _userId => _auth.currentUser!.uid;

  DocumentReference<Map<String, dynamic>> get _preferencesDoc =>
      _firestore.collection('users').doc(_userId).collection('preferences').doc('default');

  @override
  Future<UserPreferences?> getPreferences() async {
    final doc = await _preferencesDoc.get();

    if (!doc.exists) {
      return null;
    }

    return UserPreferences.fromJson({
      ...doc.data()!,
      'id': doc.id,
    });
  }

  @override
  Future<UserPreferences> savePreferences(UserPreferences preferences) async {
    final data = preferences.toJson();
    data.remove('id'); // Don't store ID in document data

    await _preferencesDoc.set(data, SetOptions(merge: true));

    return preferences;
  }

  @override
  Future<void> deletePreferences() async {
    await _preferencesDoc.delete();
  }
}
