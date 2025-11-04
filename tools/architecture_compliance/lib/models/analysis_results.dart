import 'di_violation.dart';
import 'naming_violation.dart';
import 'pattern_violation.dart';
import 'structure_violation.dart';
import 'violation.dart';

/// Container for all analysis results.
///
/// Aggregates violations from all analyzers and provides
/// convenience methods for accessing and filtering results.
class AnalysisResults {
  const AnalysisResults({
    this.structureViolations = const [],
    this.patternViolations = const [],
    this.diViolations = const [],
    this.namingViolations = const [],
    this.legacyCodeInstances = const [],
    this.migrationProgress,
  });

  /// Violations related to feature module structure
  final List<StructureViolation> structureViolations;

  /// Violations related to code patterns
  final List<PatternViolation> patternViolations;

  /// Violations related to dependency injection
  final List<DIViolation> diViolations;

  /// Violations related to naming conventions
  final List<NamingViolation> namingViolations;

  /// Instances of legacy code (Riverpod) found
  final List<LegacyCodeInstance> legacyCodeInstances;

  /// Migration progress information
  final MigrationProgress? migrationProgress;

  /// Returns all violations as a single list
  List<Violation> get allViolations => [
        ...structureViolations,
        ...patternViolations,
        ...diViolations,
        ...namingViolations,
      ];

  /// Returns the total number of violations
  int get totalViolations => allViolations.length;

  /// Returns violations filtered by severity
  List<Violation> violationsBySeverity(Severity severity) =>
      allViolations.where((v) => v.severity == severity).toList();

  /// Returns the number of error-level violations
  int get errorCount => violationsBySeverity(Severity.error).length;

  /// Returns the number of warning-level violations
  int get warningCount => violationsBySeverity(Severity.warning).length;

  /// Returns the number of info-level violations
  int get infoCount => violationsBySeverity(Severity.info).length;

  /// Returns true if there are any error-level violations
  bool get hasErrors => errorCount > 0;

  /// Returns true if there are any violations at all
  bool get hasViolations => totalViolations > 0;

  /// Returns true if the analysis passed (no errors)
  bool get passed => !hasErrors;

  /// Returns a summary string of the results
  String get summary {
    return 'Total: $totalViolations violations '
        '(Errors: $errorCount, Warnings: $warningCount, Info: $infoCount)';
  }
}

/// Represents an instance of legacy code that needs migration.
class LegacyCodeInstance {
  const LegacyCodeInstance({
    required this.filePath,
    required this.legacyType,
    required this.description,
    this.lineNumber,
  });

  /// Path to the file containing legacy code
  final String filePath;

  /// Type of legacy code (e.g., 'riverpod_import', 'consumer_widget')
  final String legacyType;

  /// Description of the legacy code
  final String description;

  /// Line number where the legacy code occurs
  final int? lineNumber;

  @override
  String toString() {
    final location = lineNumber != null ? '$filePath:$lineNumber' : filePath;
    return '[$legacyType] $description at $location';
  }
}

/// Tracks migration progress from Riverpod to BLoC.
class MigrationProgress {
  const MigrationProgress({
    required this.totalFiles,
    required this.migratedFiles,
    required this.legacyFiles,
    this.remainingFiles = const [],
  });

  /// Total number of files that need migration
  final int totalFiles;

  /// Number of files that have been migrated
  final int migratedFiles;

  /// Number of files still using legacy code
  final int legacyFiles;

  /// List of file paths that still need migration
  final List<String> remainingFiles;

  /// Percentage of migration completion (0-100)
  double get percentComplete {
    if (totalFiles == 0) {
      return 100;
    }
    return (migratedFiles / totalFiles) * 100;
  }

  /// Returns a formatted progress string
  String get progressString {
    return '$migratedFiles/$totalFiles files migrated '
        '(${percentComplete.toStringAsFixed(1)}%)';
  }

  @override
  String toString() => progressString;
}
