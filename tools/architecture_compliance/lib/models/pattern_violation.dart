import 'violation.dart';

/// Violation related to code patterns.
///
/// Examples:
/// - Repository not using Either pattern
/// - State class missing AppStateStatus
/// - Missing copyWith method
/// - Improper error handling
class PatternViolation extends Violation {
  const PatternViolation({
    required super.description,
    required super.filePath,
    required super.severity,
    required super.recommendation,
    required this.patternType,
    super.lineNumber,
    this.expectedPattern,
    this.actualPattern,
    this.className,
  }) : super(type: 'pattern');

  /// Type of pattern violation (e.g., 'either', 'state', 'error_handling')
  final String patternType;

  /// The expected pattern
  final String? expectedPattern;

  /// The actual pattern found
  final String? actualPattern;

  /// Name of the class with the violation
  final String? className;

  @override
  String toFormattedString() {
    final buffer = StringBuffer(super.toFormattedString())
      ..write('\n  Pattern Type: $patternType');
    if (className != null) {
      buffer.write('\n  Class: $className');
    }
    if (expectedPattern != null) {
      buffer.write('\n  Expected: $expectedPattern');
    }
    if (actualPattern != null) {
      buffer.write('\n  Found: $actualPattern');
    }
    return buffer.toString();
  }
}
