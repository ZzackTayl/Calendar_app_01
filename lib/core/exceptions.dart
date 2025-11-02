/// Custom exceptions for the app
library;

class AuthOfflineException implements Exception {
  final String message;
  
  AuthOfflineException([this.message = 'Authentication unavailable offline']);
  
  @override
  String toString() => 'AuthOfflineException: $message';
}
