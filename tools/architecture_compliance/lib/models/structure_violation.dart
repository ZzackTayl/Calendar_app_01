import 'violation.dart';

/// Violation related to feature module structure.
///
/// Examples:
/// - Missing required directories (data, domain, presentation)
/// - Incorrect directory hierarchy
/// - Cross-layer violations (e.g., presentation importing from data)
class StructureViolation extends Violation {
  const StructureViolation({
    required super.description,
    required super.filePath,
    required super.severity,
    required super.recommendation,
    required this.featureName,
    super.lineNumber,
    this.missingDirectories = const [],
    this.violatedLayer,
  }) : super(type: 'structure');

  /// Name of the feature module with the violation
  final String featureName;

  /// List of missing directories (if applicable)
  final List<String> missingDirectories;

  /// The layer that was violated (if applicable)
  final String? violatedLayer;

  @override
  String toFormattedString() {
    final buffer = StringBuffer(super.toFormattedString())
      ..write('\n  Feature: $featureName');
    if (missingDirectories.isNotEmpty) {
      buffer.write('\n  Missing: ${missingDirectories.join(", ")}');
    }
    if (violatedLayer != null) {
      buffer.write('\n  Violated Layer: $violatedLayer');
    }
    return buffer.toString();
  }
}
