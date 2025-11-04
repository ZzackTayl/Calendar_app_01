/// Base class for all compliance violations.
///
/// Violations represent deviations from clean architecture patterns
/// and are categorized by severity and type.
abstract class Violation {
  const Violation({
    required this.type,
    required this.description,
    required this.filePath,
    required this.severity,
    required this.recommendation,
    this.lineNumber,
  });

  /// The type of violation (e.g., 'structure', 'pattern', 'naming')
  final String type;

  /// Human-readable description of the violation
  final String description;

  /// Path to the file containing the violation
  final String filePath;

  /// Line number where the violation occurs (if applicable)
  final int? lineNumber;

  /// Severity level of the violation
  final Severity severity;

  /// Recommended action to fix the violation
  final String recommendation;

  /// Returns a formatted string representation of the violation
  String toFormattedString() {
    final location = lineNumber != null ? '$filePath:$lineNumber' : filePath;
    return '[$severity] $type: $description\n'
        '  Location: $location\n'
        '  Fix: $recommendation';
  }

  @override
  String toString() => toFormattedString();
}

/// Severity levels for violations
enum Severity {
  /// Critical violations that must be fixed immediately
  error,

  /// Important violations that should be fixed soon
  warning,

  /// Minor violations or suggestions for improvement
  info,
}

extension SeverityX on Severity {
  /// Returns a human-readable label for the severity
  String get label {
    switch (this) {
      case Severity.error:
        return 'ERROR';
      case Severity.warning:
        return 'WARNING';
      case Severity.info:
        return 'INFO';
    }
  }

  /// Returns a color code for terminal output
  String get colorCode {
    switch (this) {
      case Severity.error:
        return '\x1B[31m'; // Red
      case Severity.warning:
        return '\x1B[33m'; // Yellow
      case Severity.info:
        return '\x1B[36m'; // Cyan
    }
  }

  /// Returns the reset color code
  static String get resetColor => '\x1B[0m';
}
