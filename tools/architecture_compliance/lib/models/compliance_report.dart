import 'analysis_results.dart';

/// Comprehensive compliance report with scores and recommendations.
class ComplianceReport {
  const ComplianceReport({
    required this.timestamp,
    required this.score,
    required this.results,
    this.recommendations = const [],
  });

  /// When the report was generated
  final DateTime timestamp;

  /// Overall compliance score
  final ComplianceScore score;

  /// Analysis results
  final AnalysisResults results;

  /// List of recommendations for improvement
  final List<Recommendation> recommendations;

  /// Returns a formatted timestamp
  String get formattedTimestamp {
    return '${timestamp.year}-${timestamp.month.toString().padLeft(2, '0')}-'
        '${timestamp.day.toString().padLeft(2, '0')} '
        '${timestamp.hour.toString().padLeft(2, '0')}:'
        '${timestamp.minute.toString().padLeft(2, '0')}';
  }
}

/// Compliance score breakdown.
class ComplianceScore {
  const ComplianceScore({
    required this.overall,
    required this.structure,
    required this.patterns,
    required this.dependencyInjection,
    required this.naming,
  });

  /// Overall compliance score (0-100)
  final double overall;

  /// Structure compliance score (0-100)
  final double structure;

  /// Pattern compliance score (0-100)
  final double patterns;

  /// Dependency injection compliance score (0-100)
  final double dependencyInjection;

  /// Naming convention compliance score (0-100)
  final double naming;

  /// Returns a letter grade based on the overall score
  String get grade {
    if (overall >= 90) {
      return 'A';
    }
    if (overall >= 80) {
      return 'B';
    }
    if (overall >= 70) {
      return 'C';
    }
    if (overall >= 60) {
      return 'D';
    }
    return 'F';
  }

  /// Returns a color code for the grade
  String get gradeColor {
    switch (grade) {
      case 'A':
        return '\x1B[32m'; // Green
      case 'B':
        return '\x1B[36m'; // Cyan
      case 'C':
        return '\x1B[33m'; // Yellow
      case 'D':
        return '\x1B[33m'; // Yellow
      case 'F':
        return '\x1B[31m'; // Red
      default:
        return '\x1B[0m'; // Reset
    }
  }

  /// Returns true if the score passes the minimum threshold
  bool passesThreshold(double threshold) => overall >= threshold;

  @override
  String toString() {
    return 'Overall: ${overall.toStringAsFixed(1)}% (Grade: $grade)\n'
        '  Structure: ${structure.toStringAsFixed(1)}%\n'
        '  Patterns: ${patterns.toStringAsFixed(1)}%\n'
        '  Dependency Injection: ${dependencyInjection.toStringAsFixed(1)}%\n'
        '  Naming: ${naming.toStringAsFixed(1)}%';
  }
}

/// Recommendation for improving compliance.
class Recommendation {
  const Recommendation({
    required this.title,
    required this.description,
    required this.priority,
    required this.actionItem,
    this.affectedFiles = const [],
  });

  /// Short title of the recommendation
  final String title;

  /// Detailed description
  final String description;

  /// Priority level
  final Priority priority;

  /// Specific action to take
  final String actionItem;

  /// List of files affected by this recommendation
  final List<String> affectedFiles;

  /// Returns a formatted string representation
  String toFormattedString() {
    final buffer = StringBuffer()
      ..writeln('[${priority.label}] $title')
      ..writeln('  $description')
      ..writeln('  Action: $actionItem');
    if (affectedFiles.isNotEmpty) {
      buffer.writeln('  Affected Files (${affectedFiles.length}):');
      for (final file in affectedFiles.take(5)) {
        buffer.writeln('    - $file');
      }
      if (affectedFiles.length > 5) {
        buffer.writeln('    ... and ${affectedFiles.length - 5} more');
      }
    }
    return buffer.toString();
  }

  @override
  String toString() => toFormattedString();
}

/// Priority levels for recommendations.
enum Priority {
  /// Must be fixed immediately
  critical,

  /// Should be fixed soon
  high,

  /// Should be fixed eventually
  medium,

  /// Nice to have
  low,
}

extension PriorityX on Priority {
  /// Returns a human-readable label
  String get label {
    switch (this) {
      case Priority.critical:
        return 'CRITICAL';
      case Priority.high:
        return 'HIGH';
      case Priority.medium:
        return 'MEDIUM';
      case Priority.low:
        return 'LOW';
    }
  }

  /// Returns a color code for terminal output
  String get colorCode {
    switch (this) {
      case Priority.critical:
        return '\x1B[31m'; // Red
      case Priority.high:
        return '\x1B[33m'; // Yellow
      case Priority.medium:
        return '\x1B[36m'; // Cyan
      case Priority.low:
        return '\x1B[37m'; // White
    }
  }
}
