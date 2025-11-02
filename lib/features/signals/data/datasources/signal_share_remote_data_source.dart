import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../../domain/signal_share.dart';

/// Remote data source for signal shares using Firestore
abstract class SignalShareRemoteDataSource {
  Future<List<SignalShare>> getSignalShares();
  Future<SignalShare> createShare(SignalShare share);
  Future<List<SignalShare>> createMultipleShares(List<SignalShare> shares);
  Future<void> deleteShare(String shareId);
  Future<List<SignalShare>> getSharesForSignal(String signalId);
  Future<List<SignalShare>> getSharesWithUser(String userId);
}

/// Firestore implementation of SignalShareRemoteDataSource
class SignalShareFirestoreDataSource implements SignalShareRemoteDataSource {
  final FirebaseFirestore _firestore;
  final FirebaseAuth _auth;

  SignalShareFirestoreDataSource({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _firestore = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  String get _userId => _auth.currentUser!.uid;

  CollectionReference<Map<String, dynamic>> get _sharesCollection =>
      _firestore.collection('signal_shares');

  @override
  Future<List<SignalShare>> getSignalShares() async {
    // Get shares where current user is either the sharer or the recipient
    final asSharerSnapshot = await _sharesCollection
        .where('shared_by_user_id', isEqualTo: _userId)
        .get();

    final asRecipientSnapshot = await _sharesCollection
        .where('shared_with_user_id', isEqualTo: _userId)
        .get();

    final allDocs = [
      ...asSharerSnapshot.docs,
      ...asRecipientSnapshot.docs,
    ];

    // Remove duplicates by ID
    final uniqueDocs = <String, QueryDocumentSnapshot<Map<String, dynamic>>>{};
    for (final doc in allDocs) {
      uniqueDocs[doc.id] = doc;
    }

    return uniqueDocs.values
        .map((doc) => SignalShare.fromJson({
              ...doc.data(),
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<SignalShare> createShare(SignalShare share) async {
    final docRef = _sharesCollection.doc(share.id);
    final data = share.toJson();
    data.remove('id');

    await docRef.set(data);

    return share;
  }

  @override
  Future<List<SignalShare>> createMultipleShares(
    List<SignalShare> shares,
  ) async {
    final batch = _firestore.batch();

    for (final share in shares) {
      final docRef = _sharesCollection.doc(share.id);
      final data = share.toJson();
      data.remove('id');
      batch.set(docRef, data);
    }

    await batch.commit();

    return shares;
  }

  @override
  Future<void> deleteShare(String shareId) async {
    await _sharesCollection.doc(shareId).delete();
  }

  @override
  Future<List<SignalShare>> getSharesForSignal(String signalId) async {
    final snapshot = await _sharesCollection
        .where('signal_id', isEqualTo: signalId)
        .get();

    return snapshot.docs
        .map((doc) => SignalShare.fromJson({
              ...doc.data(),
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<List<SignalShare>> getSharesWithUser(String userId) async {
    final snapshot = await _sharesCollection
        .where('shared_with_user_id', isEqualTo: userId)
        .where('shared_by_user_id', isEqualTo: _userId)
        .get();

    return snapshot.docs
        .map((doc) => SignalShare.fromJson({
              ...doc.data(),
              'id': doc.id,
            }))
        .toList();
  }
}
