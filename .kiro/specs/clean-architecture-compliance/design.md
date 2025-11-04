
 
   C -->|uses| G[Legacy Code Detector]
    D -->|reads| H[File System]
    E -->|parses| I[Dart AST]
    F -->|analyzes| J[DI Container]
    G -->|scans| H
    C -->|produces| K[Analysis Results]
    K -->|feeds into| L[Compliance Reporter]
    L -->|generates| M[Reports & Metrics]
    M -->|displays to| A
```

## Components and Interfaces

### 1. CLI Tool (`tools/architecture_compliance/cli.dart`)

**Purpose:** Provides command-line interface for developers to verify compliance.

**Commands:**
- `verify` - Run full compliance verification
- `verify-feature <name>` - Verify specific feature module
- `check-naming` - Check naming conventions only
- `check-di` - Check dependency injection only
- `detect-legacy` - Find legacy Riverpod code
- `report` - Generate detailed compliance report
- `migrate-status` - Show migration progress

**Interface:**
```dart
abstract class ComplianceCLI {
  Future<void> runCommand(List<String> args);
  Future<VerificationResult> verifyAll();
  Future<VerificationResult> verifyFeature(String featureName);
  Future<NamingReport> checkNaming();
  Future<DIReport> checkDependencyInjection();
  Future<LegacyReport> detectLegacy();
  Future<ComplianceReport> generateReport();
  Future<MigrationStatus> getMigrationStatus();
}
```

### 2. Compliance Analyzer Engine

#### 2.1 Structure Analyzer (`lib/structure_analyzer.dart`)

**Purpose:** Validates feature module directory structure.

**Responsibilities:**
- Verify feature modules exist in `lib/features/`
- Check for required subdirectories (data, domain, presentation)
- Validate layer separation
- Ensure no cross-layer violations

**Interface:**
```dart
abstract class StructureAnalyzer {
  Future<List<StructureViolation>> analyzeFeature(String featurePath);
  Future<bool> hasRequiredDirectories(String featurePath);
  Future<List<String>> findMissingDirectories(String featurePath);
  Future<List<CrossLayerViolation>> detectCrossLayerViolations(String featurePath);
}
```

**Data Models:**
```dart
class StructureViolation {
  final String featureName;
  final String violationType;
  final String description;
  final String path;
  final Severity severity;
}

enum Severity { error, warning, info }
```

#### 2.2 Pattern Analyzer (`lib/pattern_analyzer.dart`)

**Purpose:** Validates code patterns match MyOrbit_CleanArch standards.

**Responsibilities:**
- Verify Either pattern usage in repositories
- Check AppStateStatus in cubit states
- Validate copyWith methods in state classes
- Ensure proper error handling patterns
- Verify cubit emit patterns

**Interface:**
```dart
abstract class PatternAnalyzer {
  Future<List<PatternViolation>> analyzeRepository(String filePath);
  Future<List<PatternViolation>> analyzeCubit(String filePath);
  Future<bool> usesEitherPattern(String repositoryPath);
  Future<bool> hasAppStateStatus(String statePath);
  Future<bool> hasCopyWith(String statePath);
  Future<List<ErrorHandlingViolation>> checkErrorHandling(String filePath);
}
```

#### 2.3 Dependency Analyzer (`lib/dependency_analyzer.dart`)

**Purpose:** Validates GetIt dependency injection configuration.

**Responsibilities:**
- Parse service_locator_impl.dart
- Verify all repositories are registered
- Verify all cubits are registered
- Check registration types (singleton vs factory)
- Detect missing registrations

**Interface:**
```dart
abstract class DependencyAnalyzer {
  Future<List<DIViolation>> analyzeDependencyInjection();
  Future<List<String>> findUnregisteredRepositories();
  Future<List<String>> findUnregisteredCubits();
  Future<bool> isRegistered(String className);
  Future<RegistrationType> getRegistrationType(String className);
}

enum RegistrationType { singleton, lazySingleton, factory, factoryParam, notRegistered }
```

#### 2.4 Legacy Code Detector (`lib/legacy_detector.dart`)

**Purpose:** Identifies Riverpod code that needs migration.

**Responsibilities:**
- Scan for Riverpod imports
- Detect ConsumerWidget usage
- Find ref.watch/ref.read patterns
- Identify files in lib/logic/providers/
- Calculate migration progress

**Interface:**
```dart
abstract class LegacyDetector {
  Future<List<LegacyCodeInstance>> detectLegacyCode();
  Future<List<String>> findRiverpodImports();
  Future<List<String>> findConsumerWidgets();
  Future<List<String>> findProviderUsage();
  Future<MigrationProgress> calculateProgress();
}

class MigrationProgress {
  final int totalFiles;
  final int migratedFiles;
  final int legacyFiles;
  final double percentComplete;
  final List<String> remainingFiles;
}
```

### 3. Compliance Reporter (`lib/compliance_reporter.dart`)

**Purpose:** Generates reports and metrics from analysis results.

**Responsibilities:**
- Aggregate analysis results
- Calculate compliance scores
- Generate formatted reports
- Provide actionable recommendations
- Track trends over time

**Interface:**
```dart
abstract class ComplianceReporter {
  Future<ComplianceReport> generateReport(AnalysisResults results);
  Future<ComplianceScore> calculateScore(AnalysisResults results);
  Future<List<Recommendation>> generateRecommendations(AnalysisResults results);
  Future<String> formatReport(ComplianceReport report, ReportFormat format);
}

enum ReportFormat { console, markdown, json, html }

class ComplianceReport {
  final DateTime timestamp;
  final ComplianceScore score;
  final List<StructureViolation> structureViolations;
  final List<PatternViolation> patternViolations;
  final List<DIViolation> diViolations;
  final MigrationProgress migrationProgress;
  final List<Recommendation> recommendations;
}

class ComplianceScore {
  final double overall;
  final double structure;
  final double patterns;
  final double dependencyInjection;
  final double naming;
  final String grade; // A, B, C, D, F
}
```

## Data Models

### Core Models

```dart
// Base violation class
abstract class Violation {
  final String type;
  final String description;
  final String filePath;
  final int? lineNumber;
  final Severity severity;
  final String recommendation;
}

// Specific violation types
class StructureViolation extends Violation { }
class PatternViolation extends Violation { }
class DIViolation extends Violation { }
class NamingViolation extends Violation { }

// Analysis results container
class AnalysisResults {
  final List<StructureViolation> structureViolations;
  final List<PatternViolation> patternViolations;
  final List<DIViolation> diViolations;
  final List<NamingViolation> namingViolations;
  final List<LegacyCodeInstance> legacyCode;
  final MigrationProgress migrationProgress;
}

// Recommendation model
class Recommendation {
  final String title;
  final String description;
  final Priority priority;
  final List<String> affectedFiles;
  final String actionItem;
}

enum Priority { critical, high, medium, low }
```

## Error Handling

### Error Types

1. **File System Errors** - Handle missing files, permission issues
2. **Parse Errors** - Handle invalid Dart syntax
3. **Configuration Errors** - Handle missing or invalid configuration
4. **Analysis Errors** - Handle unexpected code patterns

### Error Handling Strategy

```dart
// Use Either pattern for all operations
Future<Either<AnalysisFailure, AnalysisResults>> analyze() async {
  try {
    final results = await _performAnalysis();
    return Right(results);
  } on FileSystemException catch (e) {
    return Left(FileSystemFailure(message: e.message));
  } on ParseException catch (e) {
    return Left(ParseFailure(message: e.message, file: e.file));
  } catch (e) {
    return Left(UnknownFailure(message: e.toString()));
  }
}

// Failure hierarchy
abstract class AnalysisFailure {
  final String message;
}

class FileSystemFailure extends AnalysisFailure { }
class ParseFailure extends AnalysisFailure { }
class ConfigurationFailure extends AnalysisFailure { }
class UnknownFailure extends AnalysisFailure { }
```

## Testing Strategy

### Unit Tests

**Structure Analyzer Tests:**
- Test detection of missing directories
- Test validation of correct structure
- Test cross-layer violation detection

**Pattern Analyzer Tests:**
- Test Either pattern detection
- Test AppStateStatus detection
- Test copyWith method detection
- Test error handling pattern validation

**Dependency Analyzer Tests:**
- Test registration detection
- Test registration type validation
- Test missing registration detection

**Legacy Detector Tests:**
- Test Riverpod import detection
- Test ConsumerWidget detection
- Test migration progress calculation

### Integration Tests

- Test full analysis pipeline
- Test report generation
- Test CLI commands
- Test with real codebase samples

### Test Data

Create sample feature modules:
- `test/fixtures/valid_feature/` - Fully compliant feature
- `test/fixtures/invalid_feature/` - Feature with violations
- `test/fixtures/legacy_feature/` - Feature with Riverpod code

## Implementation Details

### File Parsing Strategy

Use the `analyzer` package to parse Dart files:

```dart
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

Future<CompilationUnit> parseFile(String path) async {
  final content = await File(path).readAsString();
  final result = parseString(content: content);
  return result.unit;
}
```

### Pattern Detection

Use AST visitors to detect patterns:

```dart
class EitherPatternVisitor extends RecursiveAstVisitor<void> {
  bool hasEitherPattern = false;
  
  @override
  void visitMethodDeclaration(MethodDeclaration node) {
    final returnType = node.returnType?.toString() ?? '';
    if (returnType.contains('Either<') && returnType.contains('Future<')) {
      hasEitherPattern = true;
    }
    super.visitMethodDeclaration(node);
  }
}
```

### Configuration

Store configuration in `.kiro/architecture_compliance.yaml`:

```yaml
compliance:
  enabled: true
  strict_mode: false
  ignore_patterns:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - "**/test/**"
  
  rules:
    structure:
      enforce_feature_structure: true
      require_barrel_files: false
    
    patterns:
      require_either_pattern: true
      require_app_state_status: true
      require_copy_with: true
    
    naming:
      cubit_suffix: "Cubit"
      repository_suffix: "Repository"
      impl_suffix: "Impl"
    
    dependency_injection:
      require_registration: true
      enforce_registration_types: true

  thresholds:
    minimum_score: 80.0
    fail_on_critical: true
```

## Performance Considerations

### Optimization Strategies

1. **Caching** - Cache parsed ASTs to avoid re-parsing
2. **Parallel Analysis** - Analyze multiple files concurrently
3. **Incremental Analysis** - Only analyze changed files
4. **Lazy Loading** - Load analysis modules on demand

### Performance Targets

- Analyze single feature: < 1 second
- Analyze entire codebase: < 10 seconds
- Generate report: < 2 seconds

## Security Considerations

1. **File Access** - Only read files, never write or execute
2. **Path Traversal** - Validate all file paths are within project
3. **Resource Limits** - Limit memory usage and file size
4. **Safe Parsing** - Handle malformed Dart files gracefully

## Deployment and Usage

### Installation

Add as a dev dependency:

```yaml
dev_dependencies:
  architecture_compliance:
    path: tools/architecture_compliance
```

### Usage Examples

```bash
# Run full verification
dart run architecture_compliance verify

# Verify specific feature
dart run architecture_compliance verify-feature calendar

# Check naming conventions
dart run architecture_compliance check-naming

# Generate report
dart run architecture_compliance report --format markdown > compliance_report.md

# Check migration status
dart run architecture_compliance migrate-status

# Detect legacy code
dart run architecture_compliance detect-legacy
```

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Check Architecture Compliance
  run: dart run architecture_compliance verify --strict
  
- name: Generate Compliance Report
  run: dart run architecture_compliance report --format markdown > $GITHUB_STEP_SUMMARY
```

## Future Enhancements

1. **Auto-fix Capabilities** - Automatically fix common violations
2. **IDE Integration** - Real-time compliance checking in IDE
3. **Trend Analysis** - Track compliance scores over time
4. **Custom Rules** - Allow project-specific compliance rules
5. **Migration Assistant** - Interactive tool to help migrate legacy code
6. **Documentation Generator** - Generate architecture documentation from code

## References

- MyOrbit_CleanArch canonical project
- MYORBIT_CLEANARCH_PATTERNS.md
- docs/migration/STATUS.md
- Dart analyzer package documentation
- Clean Architecture principles by Robert C. Martin
