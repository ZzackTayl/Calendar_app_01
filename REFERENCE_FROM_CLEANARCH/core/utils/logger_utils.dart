part of 'utils.dart';

class LoggerUtils {
  void logInfo(String tag, String message) {
    developer.log('INFO: $message', name: tag);
  }

  void logError(String tag, String message) {
    developer.log('ERROR: $message', name: tag);
  }

  void logSuccess(String tag, String message) {
    developer.log('✅ [$tag] $message');
  }

  void logWarning(String tag, String message) {
    developer.log('⚠️ [$tag] $message');
  }
}
