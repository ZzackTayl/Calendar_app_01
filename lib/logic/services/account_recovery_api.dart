import 'dart:developer' as developer;
import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';

import '../../core/result.dart';

/// Account recovery API using Firebase Auth
class AccountRecoveryApi {
  static FirebaseAuth get _auth => FirebaseAuth.instance;

  /// Request a password reset email
  static Future<Result<void>> requestPasswordReset(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
      return const Success(null);
    } on FirebaseAuthException catch (e) {
      developer.log(
        'Firebase Auth error requesting password reset: ${e.code}',
        name: 'AccountRecoveryApi',
        error: e,
      );
      
      switch (e.code) {
        case 'user-not-found':
          return const Failure('No account found with this email address.', null);
        case 'invalid-email':
          return const Failure('Invalid email address format.', null);
        case 'too-many-requests':
          return const Failure('Too many requests. Please try again later.', null);
        default:
          return Failure('Failed to send password reset email: ${e.message}', e);
      }
    } on SocketException catch (e) {
      return Failure('Unable to connect. Please check your internet connection.', e);
    } catch (e) {
      developer.log(
        'Unexpected error requesting password reset: $e',
        name: 'AccountRecoveryApi',
        error: e,
      );
      return Failure('Failed to send password reset email.', e is Exception ? e : null);
    }
  }

  /// Verify a recovery code (Firebase handles this via email link)
  static Future<Result<void>> verifyRecoveryCode({
    required String identifier,
    required String code,
  }) async {
    try {
      // Firebase Auth handles verification via email link automatically
      // This method is kept for API compatibility but delegates to Firebase
      await _auth.verifyPasswordResetCode(code);
      return const Success(null);
    } on FirebaseAuthException catch (e) {
      developer.log(
        'Firebase Auth error verifying code: ${e.code}',
        name: 'AccountRecoveryApi',
        error: e,
      );
      
      switch (e.code) {
        case 'expired-action-code':
          return const Failure('Recovery code has expired. Please request a new one.', null);
        case 'invalid-action-code':
          return const Failure('Invalid recovery code.', null);
        default:
          return Failure('Failed to verify recovery code: ${e.message}', e);
      }
    } catch (e) {
      developer.log(
        'Unexpected error verifying code: $e',
        name: 'AccountRecoveryApi',
        error: e,
      );
      return Failure('Failed to verify recovery code.', e is Exception ? e : null);
    }
  }

  /// Reset password with verification code
  static Future<Result<void>> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    try {
      await _auth.confirmPasswordReset(
        code: code,
        newPassword: newPassword,
      );
      return const Success(null);
    } on FirebaseAuthException catch (e) {
      developer.log(
        'Firebase Auth error resetting password: ${e.code}',
        name: 'AccountRecoveryApi',
        error: e,
      );
      
      switch (e.code) {
        case 'expired-action-code':
          return const Failure('Recovery code has expired. Please request a new one.', null);
        case 'invalid-action-code':
          return const Failure('Invalid recovery code.', null);
        case 'weak-password':
          return const Failure('Password is too weak. Please use a stronger password.', null);
        default:
          return Failure('Failed to reset password: ${e.message}', e);
      }
    } catch (e) {
      developer.log(
        'Unexpected error resetting password: $e',
        name: 'AccountRecoveryApi',
        error: e,
      );
      return Failure('Failed to reset password.', e is Exception ? e : null);
    }
  }
}
