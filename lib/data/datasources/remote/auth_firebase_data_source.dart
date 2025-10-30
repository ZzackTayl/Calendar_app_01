import 'dart:developer' as developer;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'auth_remote_data_source.dart';

/// Thrown when Firebase reports the account exists with different credentials.
class AccountExistsWithDifferentCredentialException implements Exception {
  AccountExistsWithDifferentCredentialException(this.email, {this.pendingCredential});

  final String email;
  final AuthCredential? pendingCredential;

  @override
  String toString() =>
      'AccountExistsWithDifferentCredentialException(email: $email, hasPendingCredential: ${pendingCredential != null})';
}

/// Firebase-backed implementation of [AuthRemoteDataSource].
class FirebaseAuthRemoteDataSource implements AuthRemoteDataSource {
  FirebaseAuthRemoteDataSource({
    FirebaseAuth? firebaseAuth,
    GoogleSignIn? googleSignIn,
    String? webClientId,
  })  : _auth = firebaseAuth ?? FirebaseAuth.instance,
        _googleSignIn = googleSignIn ?? GoogleSignIn.instance,
        _webClientId = webClientId;

  final FirebaseAuth _auth;
  final GoogleSignIn _googleSignIn;
  final String? _webClientId;
  bool _googleSignInInitialized = false;

  Future<void> _ensureGoogleSignInInitialized() async {
    if (_googleSignInInitialized) {
      return;
    }

    await _googleSignIn.initialize(
      clientId: _webClientId,
    );
    _googleSignInInitialized = true;
  }

  @override
  Future<void> signInWithGoogle() async {
    try {
      if (kIsWeb) {
        final provider = GoogleAuthProvider();
        await _auth.signInWithPopup(provider);
        return;
      }

      await _ensureGoogleSignInInitialized();

      final account = await _googleSignIn.authenticate();
      final authentication = account.authentication;
      final credential = GoogleAuthProvider.credential(
        idToken: authentication.idToken,
      );

      await _auth.signInWithCredential(credential);
    } on FirebaseAuthException catch (error) {
      if (error.code == 'account-exists-with-different-credential') {
        final email = error.email ?? 'unknown';
        developer.log(
          'Account exists with different credential for $email',
          name: 'FirebaseAuthRemoteDataSource',
          error: error,
        );
        throw AccountExistsWithDifferentCredentialException(
          email,
          pendingCredential: error.credential,
        );
      }

      rethrow;
    }
  }

  @override
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  @override
  Future<void> signUpWithEmail({
    required String email,
    required String password,
  }) async {
    await _auth.createUserWithEmailAndPassword(email: email, password: password);
  }

  @override
  Future<void> signOut() async {
    await _auth.signOut();
    if (!kIsWeb) {
      await _ensureGoogleSignInInitialized();
      await _googleSignIn.signOut();
    }
  }
}
