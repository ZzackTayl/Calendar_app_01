# Implementation Plan

- [x] 1. Set up project structure and core interfaces
  - Create directory structure for the compliance tool
  - Define core interfaces and abstract classes
  - Set up configuration file structure
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 1.1 Create tool directory structure
  - Create `tools/architecture_compliance/` directory
  - Create subdirectories: `lib/`, `bin/`, `test/`
  - Create `pubspec.yaml` for the tool package
  - _Requirements: 1.1_

- [x] 1.2 Define core data models
  - Create `lib/models/violation.dart` with base Violation class
  - Create specific violation types (StructureViolation, PatternViolation, DIViolation, NamingViolation)
  - Create `lib/models/analysis_results.dart` with AnalysisResults class
  - Create `lib/models/compliance_report.dart` with report models
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.3 Create configuration system
  - Create `lib/config/compliance_config.dart` for configuration models
  - Implement YAML configuration parser
  - Create default configuration template
  - Add configuration validation
  - _Requirements: 1.1_

- [ ] 2. Implement Structure Analyzer
  - Build feature module structure validation
  - Implement directory existence checks
  - Create cross-layer violation detection
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 2.1 Create StructureAnalyzer class
  - Create `lib/analyzers/structure_analyzer.dart`
  - Implement interface with required methods
  - Add file system scanning logic
  - _Requirements: 6.1, 6.2_

- [ ] 2.2 Implement directory validation
  - Create method to check for data/domain/presentation directories
  - Implement validation for required subdirectories
  - Add reporting for missing directories
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 2.3 Implement cross-layer violation detection
  - Parse import statements in feature files
  - Detect imports that violate layer boundaries
  - Generate violation reports with file paths and line numbers
  - _Requirements: 1.1, 6.1_

- [ ] 2.4 Write unit tests for Structure Analyzer
  - Create test fixtures with valid and invalid feature structures
  - Test directory validation logic
  - Test cross-layer violation detection
  - _Requirements: 9.1, 9.3, 9.4_


- [ ] 3. Implement Pattern Analyzer
  - Build Either pattern detection
  - Implement AppStateStatus validation
  - Create copyWith method detection
  - Validate error handling patterns
  - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.1 Create PatternAnalyzer class with AST parsing
  - Create `lib/analyzers/pattern_analyzer.dart`
  - Set up Dart analyzer package integration
  - Implement AST visitor base classes
  - _Requirements: 1.3, 4.1_

- [ ] 3.2 Implement Either pattern detection
  - Create AST visitor to detect Either<Failure, T> return types
  - Validate repository methods use Either pattern
  - Check for proper fold() usage in cubits
  - Generate violations for non-compliant code
  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 3.3 Implement state management pattern validation
  - Create AST visitor to detect AppStateStatus in state classes
  - Validate copyWith method presence
  - Check for proper emit() usage in cubits
  - Validate state transitions (loading → success/failure)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.4 Implement error handling validation
  - Detect try-catch blocks in repository implementations
  - Validate error wrapping in Either
  - Check for proper failure state emissions
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 3.5 Write unit tests for Pattern Analyzer
  - Create test fixtures with compliant and non-compliant code
  - Test Either pattern detection
  - Test state management pattern validation
  - Test error handling validation
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 4. Implement Dependency Analyzer
  - Parse GetIt service locator configuration
  - Validate repository registrations
  - Validate cubit registrations
  - Check registration types
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4.1 Create DependencyAnalyzer class
  - Create `lib/analyzers/dependency_analyzer.dart`
  - Implement service locator file parsing
  - Build registration detection logic
  - _Requirements: 3.1, 3.2_

- [ ] 4.2 Implement registration validation
  - Parse `lib/core/di/service_locator_impl.dart`
  - Extract all registered classes
  - Validate registration types (singleton, factory, etc.)
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 4.3 Implement missing registration detection
  - Scan all repository and cubit files
  - Cross-reference with registered classes
  - Generate violations for unregistered components
  - _Requirements: 3.1, 3.5_

- [ ] 4.4 Write unit tests for Dependency Analyzer
  - Create test fixtures with DI configuration
  - Test registration detection
  - Test missing registration detection
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 5. Implement Legacy Code Detector
  - Scan for Riverpod imports
  - Detect ConsumerWidget usage
  - Find provider usage patterns
  - Calculate migration progress
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 5.1 Create LegacyDetector class
  - Create `lib/analyzers/legacy_detector.dart`
  - Implement file scanning logic
  - Set up pattern matching for legacy code
  - _Requirements: 7.1, 7.2_

- [ ] 5.2 Implement Riverpod detection
  - Scan for flutter_riverpod imports
  - Detect ConsumerWidget and ConsumerStatefulWidget
  - Find ref.watch and ref.read patterns
  - Identify files in lib/logic/providers/
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 5.3 Implement migration progress calculation
  - Count total UI screen files
  - Count migrated vs legacy screens
  - Calculate percentage complete
  - Generate list of remaining files
  - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ] 5.4 Write unit tests for Legacy Detector
  - Create test fixtures with legacy and migrated code
  - Test Riverpod detection
  - Test migration progress calculation
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 6. Implement Naming Convention Validator
  - Validate cubit file naming
  - Validate repository naming
  - Validate data source naming
  - Check class name conventions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6.1 Create NamingValidator class
  - Create `lib/analyzers/naming_validator.dart`
  - Implement file name pattern matching
  - Implement class name validation
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6.2 Implement file naming validation
  - Validate cubit files follow {feature}_cubit.dart pattern
  - Validate repository files follow naming conventions
  - Validate data source files follow naming conventions
  - Generate violations for non-compliant names
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 6.3 Implement class naming validation
  - Parse class declarations
  - Validate cubit classes end with "Cubit"
  - Validate repository implementations end with "Impl"
  - _Requirements: 2.5_

- [ ] 6.4 Write unit tests for Naming Validator
  - Test file naming validation
  - Test class naming validation
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 7. Implement Compliance Reporter
  - Aggregate analysis results
  - Calculate compliance scores
  - Generate formatted reports
  - Provide recommendations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7.1 Create ComplianceReporter class
  - Create `lib/reporters/compliance_reporter.dart`
  - Implement result aggregation logic
  - Create scoring algorithm
  - _Requirements: 1.1, 10.1_

- [ ] 7.2 Implement compliance scoring
  - Calculate scores for each category (structure, patterns, DI, naming)
  - Calculate overall compliance score
  - Assign letter grades (A, B, C, D, F)
  - _Requirements: 1.1, 1.2_

- [ ] 7.3 Implement report generation
  - Create console output formatter
  - Create markdown report formatter
  - Create JSON report formatter
  - Add color coding for severity levels
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 7.4 Implement recommendation engine
  - Analyze violations to generate actionable recommendations
  - Prioritize recommendations by severity and impact
  - Group related violations
  - _Requirements: 1.4, 1.5_

- [ ] 7.5 Write unit tests for Compliance Reporter
  - Test scoring algorithm
  - Test report formatting
  - Test recommendation generation
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 8. Implement CLI Tool
  - Create command-line interface
  - Implement verify command
  - Implement report command
  - Implement migration status command
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8.1 Create CLI entry point
  - Create `bin/architecture_compliance.dart`
  - Set up argument parsing with args package
  - Implement command routing
  - _Requirements: 1.1_

- [ ] 8.2 Implement verify commands
  - Implement `verify` command for full analysis
  - Implement `verify-feature` command for single feature
  - Add progress indicators
  - Add colored output for results
  - _Requirements: 1.1, 1.2_

- [ ] 8.3 Implement specialized check commands
  - Implement `check-naming` command
  - Implement `check-di` command
  - Implement `detect-legacy` command
  - _Requirements: 1.3, 7.1, 7.2, 7.3_

- [ ] 8.4 Implement reporting commands
  - Implement `report` command with format options
  - Implement `migrate-status` command
  - Add file output options
  - _Requirements: 1.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8.5 Add CLI help and documentation
  - Create comprehensive help text for each command
  - Add usage examples
  - Create error messages for invalid usage
  - _Requirements: 8.1, 8.2_

- [ ] 8.6 Write integration tests for CLI
  - Test each command with sample codebase
  - Test error handling
  - Test output formatting
  - _Requirements: 9.2, 9.3, 9.4_

- [ ] 9. Create documentation and examples
  - Write user guide
  - Create example configurations
  - Document all violation types
  - Create troubleshooting guide
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 9.1 Create user documentation
  - Write README.md for the tool
  - Document installation instructions
  - Document all CLI commands with examples
  - Create configuration guide
  - _Requirements: 8.1, 8.2_

- [ ] 9.2 Create developer documentation
  - Document architecture of the tool
  - Create API documentation for analyzers
  - Document how to add new rules
  - _Requirements: 8.1, 8.3_

- [ ] 9.3 Create example configurations
  - Create example compliance config files
  - Document all configuration options
  - Provide templates for different strictness levels
  - _Requirements: 8.4_

- [ ] 9.4 Create violation reference guide
  - Document all violation types
  - Provide examples of violations
  - Include fix recommendations for each violation type
  - _Requirements: 8.5_

- [ ] 10. Integration and testing
  - Create test fixtures
  - Run full test suite
  - Test with real codebase
  - Validate against MyOrbit_CleanArch
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10.1 Create comprehensive test fixtures
  - Create valid feature module fixture
  - Create invalid feature module fixtures with various violations
  - Create legacy code fixtures
  - _Requirements: 9.1, 9.2_

- [ ] 10.2 Run tool against MyOrbit Calendar codebase
  - Execute full verification on current codebase
  - Validate detection of known issues
  - Verify migration progress calculation
  - _Requirements: 9.4, 9.5_

- [ ] 10.3 Run tool against MyOrbit_CleanArch reference
  - Verify tool reports 100% compliance for reference project
  - Validate no false positives
  - _Requirements: 9.4_

- [ ] 10.4 Performance testing
  - Measure analysis time for single feature
  - Measure analysis time for full codebase
  - Optimize slow operations if needed
  - _Requirements: 9.4_

- [ ] 11. CI/CD integration
  - Create GitHub Actions workflow
  - Add compliance check to PR process
  - Configure failure thresholds
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 11.1 Create GitHub Actions workflow file
  - Create `.github/workflows/architecture_compliance.yml`
  - Configure to run on pull requests
  - Add compliance verification step
  - _Requirements: 1.1_

- [ ] 11.2 Configure compliance reporting in CI
  - Generate compliance report in workflow
  - Add report to PR comments or summary
  - Configure failure conditions
  - _Requirements: 1.2, 1.3, 1.4_

- [ ] 11.3 Add compliance badge to README
  - Generate compliance score badge
  - Add to main project README
  - _Requirements: 1.5_
