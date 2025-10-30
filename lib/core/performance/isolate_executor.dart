import 'dart:async';
import 'dart:developer' as developer;
import 'dart:isolate';

/// Utility for offloading CPU-intensive work to a background isolate.
///
/// Wraps [Isolate.run] and adds lightweight timing logs so we can
/// understand how long the offloaded work took without blocking the UI
/// isolate. Intended for tasks such as AI prompt preparation, large JSON
/// parsing, or reminder grouping when the data set is large.
class IsolateExecutor {
  const IsolateExecutor._();

  /// Executes [task] on a background isolate.
  ///
  /// The [name] is only used for debugging/logging.
  static Future<T> run<T>({
    required FutureOr<T> Function() task,
    String name = 'isolated-task',
  }) async {
    final stopwatch = Stopwatch()..start();
    try {
      return await Isolate.run(task);
    } catch (error, stackTrace) {
      developer.log(
        '[$name] isolate task failed',
        name: 'IsolateExecutor',
        error: error,
        stackTrace: stackTrace,
      );
      rethrow;
    } finally {
      stopwatch.stop();
      developer.log(
        '[$name] task finished in ${stopwatch.elapsedMilliseconds}ms',
        name: 'IsolateExecutor',
      );
    }
  }
}
