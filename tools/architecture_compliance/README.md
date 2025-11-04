# Architecture Compliance Tool

A comprehensive tool to verify and enforce clean architecture compliance for the MyOrbit Calendar application, ensuring all code follows the MyOrbit_CleanArch canonical patterns.

## Overview

This tool provides automated analysis, reporting, and guidance to ensure the codebase maintains clean architecture principles throughout development and migration.

## Features

- **Structure Analysis** - Validates feature module directory structure
- **Pattern Analysis** - Verifies Either pattern, AppStateStatus, and error handling
- **Dependency Analysis** - Validates GetIt dependency injection configuration
- **Legacy Detection** - Identifies Riverpod code that needs migration
- **Naming Validation** - Enforces consistent naming conventions
- **Compliance Reporting** - Generates detailed reports with scores and recommendations
- **Migration Tracking** - Tracks progress of Riverpod to BLoC migration

## Installation

From the root of the MyOrbit Calendar project:

```bash
cd tools/architecture_compliance
dart pub get
```

## Usage

### Run Full Verification

```bash
dart run tools/architecture_compliance/bin/architecture_compliance.dart verify
```

### Verify Specific Feature

```bash
dart run tools/architecture_compliance/bin/architecture_compliance.dart verify-feature calendar
```

### Check Naming Conventions

```bash
dart run tools/architecture_compliance/bin/architecture_compliance.dart check-naming
```

### Check Dependency Injection

```bash
dart run tools/architecture_compliance/bin/architecture_compliance.dart check-di
```

### Detect Legacy Code

```bash
dart run tools/architecture_compliance/bin/architecture_compliance.dart detect-legacy
```

### Generate Compliance Report

```bash
# Console output
dart run tools/architecture_compliance/bin/architecture_compliance.dart report

# Markdown output
dart run tools/architecture_compliance/bin/architecture_compliance.dart report --format markdown > compliance_report.md

# JSON output
dart run tools/architecture_compliance/bin/architecture_compliance.dart report --format json > compliance_report.json
```

### Check Migration Status

```bash
dart run tools/architecture_compliance/bin/architecture_compliance.dart migrate-status
```

## Configuration

Create a configuration file at `.kiro/architecture_compliance.yaml`:

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

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Check Architecture Compliance
  run: dart run tools/architecture_compliance/bin/architecture_compliance.dart verify --strict
  
- name: Generate Compliance Report
  run: dart run tools/architecture_compliance/bin/architecture_compliance.dart report --format markdown > $GITHUB_STEP_SUMMARY
```

## Development

### Running Tests

```bash
cd tools/architecture_compliance
dart test
```

### Project Structure

```
tools/architecture_compliance/
├── bin/
│   └── architecture_compliance.dart    # CLI entry point
├── lib/
│   ├── analyzers/                      # Analysis components
│   │   ├── structure_analyzer.dart
│   │   ├── pattern_analyzer.dart
│   │   ├── dependency_analyzer.dart
│   │   ├── legacy_detector.dart
│   │   └── naming_validator.dart
│   ├── models/                         # Data models
│   │   ├── violation.dart
│   │   ├── analysis_results.dart
│   │   └── compliance_report.dart
│   ├── reporters/                      # Report generation
│   │   └── compliance_reporter.dart
│   └── config/                         # Configuration
│       └── compliance_config.dart
├── test/                               # Tests
│   ├── analyzers/
│   ├── models/
│   └── fixtures/
└── pubspec.yaml

```

## References

- [MyOrbit_CleanArch Patterns](../../MYORBIT_CLEANARCH_PATTERNS.md)
- [Migration Status](../../docs/migration/STATUS.md)
- [Developer Quick Start](../../DEVELOPER_QUICKSTART.md)

## License

Part of the MyOrbit Calendar project.
