import 'violation.dart';

/// Violation related to dependency injection.
///
/// Examples:
/// - Repository not registered in GetIt
/// - Cubit not registered in GetIt
/// - Wrong registration type (e.g., singleton instead of factory)
/// - Missing dependency in registration
class DIViolation extends Violation {
  const DIViolation({
    required super.description,
    required super.filePath,
    required super.severity,
    required super.recommendation,
    required this.className,
    super.lineNumber,
    this.expectedRegistrationType,
    this.actualRegistrationType,
    this.missingDependencies = const [],
  }) : super(type: 'dependency_injection');

  /// Name of the class that should be registered
  final String className;

  /// Expected registration type (e.g., 'factory', 'lazySingleton')
  final String? expectedRegistrationType;

  /// Actual registration type found (if any)
  final String? actualRegistrationType;

  /// List of missing dependencies
  final List<String> missingDependencies;

  @override
  String toFormattedString() {
    final buffer = StringBuffer(super.toFormattedString())
      ..write('\n  Class: $className');
    if (expectedRegistrationType != null) {
      buffer.write('\n  Expected Type: $expectedRegistrationType');
    }
    if (actualRegistrationType != null) {
      buffer.write('\n  Actual Type: $actualRegistrationType');
    }
    if (missingDependencies.isNotEmpty) {
      buffer.write(
        '\n  Missing Dependencies: ${missingDependencies.join(", ")}',
      );
    }
    return buffer.toString();
  }
}
