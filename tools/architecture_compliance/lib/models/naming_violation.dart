import 'violation.dart';

/// Violation related to naming conventions.
///
/// Examples:
/// - Cubit file not following {feature}_cubit.dart pattern
/// - Repository class not ending with 'Repository' or 'Impl'
/// - Data source not following naming conventions
class NamingViolation extends Violation {
  const NamingViolation({
    required super.description,
    required super.filePath,
    required super.severity,
    required super.recommendation,
    required this.namingType,
    super.lineNumber,
    this.expectedName,
    this.actualName,
  }) : super(type: 'naming');

  /// Type of naming violation (e.g., 'file', 'class', 'method')
  final String namingType;

  /// Expected name or pattern
  final String? expectedName;

  /// Actual name found
  final String? actualName;

  @override
  String toFormattedString() {
    final buffer = StringBuffer(super.toFormattedString())
      ..write('\n  Naming Type: $namingType');
    if (expectedName != null) {
      buffer.write('\n  Expected: $expectedName');
    }
    if (actualName != null) {
      buffer.write('\n  Found: $actualName');
    }
    return buffer.toString();
  }
}
