import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../../domain/availability_signal.dart';

/// Remote data source for signals using Firestore
abstract class SignalRemoteDataSource {
  Future<List<AvailabilitySignal>> getSignals();
  Future<AvailabilitySignal> getSignal(String id);
  Future<AvailabilitySignal> createSignal(AvailabilitySignal signal);
  Future<AvailabilitySignal> updateSignal(AvailabilitySignal signal);
  Future<void> deleteSignal(String id);
  Future<List<AvailabilitySignal>> getActiveSignals();
  Future<List<AvailabilitySignal>> getSignalsByIds(List<String> ids);
}

/// Firestore implementation of SignalRemoteDataSource
class SignalFirestoreDataSource implements SignalRemoteDataSource {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  SignalFirestoreDataSource({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  String get _userId => _auth.currentUser!.uid;

  CollectionReference<Map<String, dynamic>> get _signalsCollection =>
      _firestore.collection('users').doc(_userId).collection('signals');

  @override
  Future<List<AvailabilitySignal>> getSignals() async {
    final snapshot = await _signalsCollection
        .orderBy('start_time', descending: true)
        .get();

    return snapshot.docs
        .map((doc) => AvailabilitySignal.fromJson({
              ...doc.data(),
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<AvailabilitySignal> getSignal(String id) async {
    final doc = await _signalsCollection.doc(id).get();

    if (!doc.exists) {
      throw Exception('Signal not found');
    }

    return AvailabilitySignal.fromJson({
      ...doc.data()!,
      'id': doc.id,
    });
  }

  @override
  Future<AvailabilitySignal> createSignal(AvailabilitySignal signal) async {
    final docRef = _signalsCollection.doc(signal.id);
    final data = signal.toJson();
    data.remove('id'); // Don't store ID in document data

    await docRef.set(data);

    return signal;
  }

  @override
  Future<AvailabilitySignal> updateSignal(AvailabilitySignal signal) async {
    final data = signal.toJson();
    data.remove('id');

    await _signalsCollection.doc(signal.id).update(data);

    return signal;
  }

  @override
  Future<void> deleteSignal(String id) async {
    await _signalsCollection.doc(id).delete();
  }

  @override
  Future<List<AvailabilitySignal>> getActiveSignals() async {
    final now = DateTime.now();

    final snapshot = await _signalsCollection
        .where('start_time', isLessThanOrEqualTo: now.toIso8601String())
        .where('end_time', isGreaterThan: now.toIso8601String())
        .get();

    return snapshot.docs
        .map((doc) => AvailabilitySignal.fromJson({
              ...doc.data(),
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<List<AvailabilitySignal>> getSignalsByIds(List<String> ids) async {
    if (ids.isEmpty) return [];

    // Firestore 'in' queries are limited to 10 items
    // Split into batches if needed
    final List<AvailabilitySignal> allSignals = [];

    for (var i = 0; i < ids.length; i += 10) {
      final batch = ids.skip(i).take(10).toList();
      final snapshot = await _signalsCollection
          .where(FieldPath.documentId, whereIn: batch)
          .get();

      final signals = snapshot.docs
          .map((doc) => AvailabilitySignal.fromJson({
                ...doc.data(),
                'id': doc.id,
              }))
          .toList();

      allSignals.addAll(signals);
    }

    return allSignals;
  }
}
