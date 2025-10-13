# MyOrbit Testing Guide

Complete guide for testing the MyOrbit calendar application, including unit tests, widget tests, integration tests, and coverage reporting.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Test Categories](#test-categories)
- [Running Tests](#running-tests)
- [Coverage Reporting](#coverage-reporting)
- [Automated Testing](#automated-testing)
- [Writing Tests](#writing-tests)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

MyOrbit uses a comprehensive testing strategy with:

- **Unit Tests**: Business logic, services, and utilities
- **Widget Tests**: UI components and screen interactions  
- **Integration Tests**: Complete user flows and navigation
- **Accessibility Tests**: Screen reader and semantic validation
- **Coverage Reporting**: Line, function, and branch coverage tracking
- **Automated CI/CD**: GitHub Actions integration with PR reporting

### Test Coverage Goals

| Coverage Type | Target | Minimum |
|---------------|--------|---------|
| Line Coverage | 85%    | 80%     |
| Function Coverage | 90% | 85%     |
| Branch Coverage | 80%  | 75%     |

## Quick Start

### 1. Install Dependencies

```bash
# Install Flutter dependencies
flutter pub get

# Install testing tools (macOS)
brew install lcov

# Install pre-commit hooks (optional)
pip install pre-commit
pre-commit install
```

### 2. Run All Tests

```bash
# Simple test run
flutter test

# With coverage
flutter test --coverage

# Using our test runner
dart run scripts/test_runner.dart

# Generate HTML coverage report
./scripts/coverage_report.sh
```

### 3. View Results

- **Coverage Report**: Open `coverage/html/index.html`
- **Test Results**: Check `test_results/results.json`
- **CI/CD**: View GitHub Actions for automated reports

## Test Categories

### Unit Tests (`test/services/`, `test/helpers/`)

Pure unit tests for business logic without UI dependencies.

```bash
# Run unit tests only
flutter test test/services/ test/helpers/ test/*_test.dart

# With our test runner  
dart run scripts/test_runner.dart --category unit
```

**Examples:**
- `test/services/dev_data_service_test.dart`
- `test/services/signals_service_test.dart`
- `test/permission_service_test.dart`

### Widget Tests (`test/widgets/`, `test/screens/`)

UI component tests with widget rendering and interaction validation.

```bash
# Run widget tests only
flutter test test/widgets/ test/screens/

# With our test runner
dart run scripts/test_runner.dart --category widget
```

**Examples:**
- `test/widgets/accessibility/semantic_button_test.dart`
- `test/screens/dashboard_screen_test.dart`
- `test/screens/calendar_screen_test.dart`

### Integration Tests (`test/integration/`)

End-to-end user flow testing with full app context.

```bash
# Run integration tests
flutter test test/integration/

# With our test runner
dart run scripts/test_runner.dart --category integration
```

**Examples:**
- `test/integration/navigation_flow_test.dart`

### Accessibility Tests (`test/widgets/accessibility/`)

Specialized tests for accessibility compliance and semantic validation.

```bash
# Run accessibility tests
flutter test test/widgets/accessibility/

# With our test runner
dart run scripts/test_runner.dart --category accessibility
```

## Running Tests

### Using Flutter CLI

```bash
# All tests
flutter test

# Specific test file
flutter test test/screens/dashboard_screen_test.dart

# With coverage
flutter test --coverage

# Specific pattern
flutter test -n "Dashboard"

# Parallel execution
flutter test --concurrency 4

# Watch mode (re-run on changes)
flutter test --watch
```

### Using Our Test Runner

The custom test runner provides enhanced features:

```bash
# Basic usage
dart run scripts/test_runner.dart

# Specific category
dart run scripts/test_runner.dart --category unit

# Without coverage
dart run scripts/test_runner.dart --no-coverage

# Fail fast (stop on first failure)
dart run scripts/test_runner.dart --fail-fast

# Verbose output
dart run scripts/test_runner.dart --verbose

# Update golden files
dart run scripts/test_runner.dart --category golden --update-goldens
```

### Test Runner Options

| Option | Description | Default |
|--------|-------------|---------|
| `--category, -c` | Test category to run (unit/widget/integration/accessibility/golden/all) | all |
| `--coverage` | Generate coverage reports | true |
| `--html-report` | Generate HTML coverage report | true |
| `--json-output` | Generate JSON test results | true |
| `--fail-fast, -f` | Stop on first test failure | false |
| `--concurrency` | Number of concurrent test processes | 4 |
| `--update-goldens, -u` | Update golden files | false |
| `--verbose, -v` | Verbose output | false |

## Coverage Reporting

### Generate Coverage Reports

```bash
# Using coverage script
./scripts/coverage_report.sh

# Skip tests (use existing coverage)
./scripts/coverage_report.sh --skip-tests

# Custom thresholds
./scripts/coverage_report.sh --line-threshold 85 --function-threshold 90

# Don't fail on threshold
./scripts/coverage_report.sh --no-fail-on-threshold
```

### Coverage Script Options

| Option | Description | Default |
|--------|-------------|---------|
| `--skip-tests` | Skip running tests, use existing coverage data | false |
| `--no-fail-on-threshold` | Don't exit with error if thresholds not met | false |
| `--line-threshold NUM` | Set line coverage threshold | 80 |
| `--function-threshold NUM` | Set function coverage threshold | 85 |
| `--branch-threshold NUM` | Set branch coverage threshold | 75 |

### Coverage Files Generated

- `coverage/lcov.info` - Raw LCOV coverage data
- `coverage/html/index.html` - Interactive HTML report
- `test_results/coverage_summary.json` - JSON summary
- `test_results/coverage_badge.txt` - Badge URL for README

### Understanding Coverage

**Line Coverage**: Percentage of executable lines that were executed
**Function Coverage**: Percentage of functions that were called
**Branch Coverage**: Percentage of decision branches that were taken

## Automated Testing

### Pre-commit Hooks

Automatically run tests before commits:

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files

# Skip for urgent commits
git commit --no-verify -m "urgent fix"
```

**Pre-commit checks:**
- Code formatting (`dart format`)
- Static analysis (`flutter analyze`)
- Critical unit tests (fast subset)
- Widget tests (non-blocking)
- Coverage validation

### GitHub Actions CI/CD

Automated testing runs on:
- **Push** to `main` or `develop` branches
- **Pull Requests** to `main` or `develop`
- **Scheduled** daily at 6 AM UTC

**Workflow stages:**
1. **Code Analysis** - Format and lint checking
2. **Unit & Widget Tests** - Parallel test execution
3. **Integration Tests** - Android emulator testing
4. **Coverage Report** - Report generation and PR comments
5. **Test Results Summary** - Comprehensive reporting

### CI/CD Artifacts

Generated artifacts (available for 30-90 days):
- Test results JSON files
- Coverage reports (HTML + JSON)
- Coverage badges
- Test execution logs

## Writing Tests

### Test Structure

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/dashboard_screen.dart';
import '../helpers/pump_app.dart';

void main() {
  group('DashboardScreen', () {
    testWidgets('displays welcome message', (tester) async {
      await tester.pumpApp(const DashboardScreen());
      
      expect(find.text('Welcome to MyOrbit'), findsOneWidget);
    });
  });
}
```

### Using Test Helpers

Our test helpers make testing easier:

```dart
import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

// Pump widget with providers
await tester.pumpApp(widget, overrides: [
  eventListProvider.overrideWith((ref) => mockEvents),
]);

// Test accessibility
TestHelpers.verifyAccessibility(tester, find.byType(Button));

// Wait for animations
await TestHelpers.waitForAnimations(tester);

// Tap and settle
await TestHelpers.tapAndSettle(tester, find.byIcon(Icons.add));
```

### Mock Providers

Use mock providers for testing:

```dart
import '../helpers/mock_providers.dart';

await tester.pumpApp(
  const DashboardScreen(),
  overrides: [
    eventListProvider.overrideWith((ref) => mockEventList),
    userProfileProvider.overrideWith((ref) => mockUserProfile),
  ],
);
```

### Golden Tests

For visual regression testing:

```bash
# Update golden files
dart run scripts/test_runner.dart --category golden --update-goldens

# Run golden tests
flutter test --update-goldens test/golden/
```

## Troubleshooting

### Common Issues

**Tests timeout**
```bash
# Increase timeout
flutter test --timeout 60s

# Run with more memory
flutter test --enable-vmservice
```

**Coverage not generating**
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter test --coverage
```

**Pre-commit hooks failing**
```bash
# Update hooks
pre-commit autoupdate

# Skip specific hook
SKIP=flutter-analyze git commit -m "message"
```

**Integration tests failing**
```bash
# Check Android emulator
flutter devices

# Reset emulator
flutter emulators --launch <emulator_id>
```

### Debugging Tests

**Add debug prints**
```dart
debugPrint('Widget tree: ${find.byType(MyWidget)}');
```

**Use debugDumpApp**
```dart
debugDumpApp(); // Prints widget tree
```

**Inspect test state**
```dart
await tester.pump(); // Process one frame
await tester.pumpAndSettle(); // Wait for all animations
```

### Performance Issues

**Slow tests**
- Use `setUp` and `tearDown` efficiently
- Mock expensive operations
- Run tests in parallel
- Use test categories to run subsets

**Memory issues**
- Clean up resources in `tearDown`
- Use `addTearDown` for cleanup
- Avoid retaining references

## Best Practices

### Test Organization

1. **Group related tests** using `group()`
2. **Use descriptive test names** that explain what is being tested
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **One assertion per test** when possible
5. **Test edge cases** and error conditions

### Test Data

1. **Use factories** for creating test data
2. **Isolate tests** - don't depend on other tests
3. **Use const constructors** where possible
4. **Mock external dependencies** (APIs, services)

### Widget Testing

1. **Test user interactions** not implementation details
2. **Verify accessibility** properties
3. **Test different screen sizes** and orientations
4. **Use semantic finders** over widget type finders

### Coverage Goals

1. **Focus on critical paths** first
2. **Don't chase 100% coverage** - aim for meaningful coverage
3. **Test business logic thoroughly** (unit tests)
4. **Cover happy path and edge cases**
5. **Exclude generated code** from coverage

### Maintenance

1. **Run tests frequently** during development
2. **Fix failing tests immediately**
3. **Update tests when requirements change**
4. **Review test coverage** regularly
5. **Refactor tests** when code changes

## Configuration Files

### Test Configuration (`test_config.yaml`)

Defines coverage thresholds, test categories, and execution settings.

### LCOV Configuration (`.lcovrc`)

Configures coverage report generation and exclusions.

### Pre-commit Configuration (`.pre-commit-config.yaml`)

Defines pre-commit hooks and their execution order.

### GitHub Actions (`.github/workflows/test.yml`)

CI/CD pipeline configuration for automated testing.

---

## Support

For questions or issues with testing:

1. Check this documentation first
2. Review existing test examples in the codebase
3. Check the [Flutter testing documentation](https://docs.flutter.dev/testing)
4. Create an issue with the `testing` label

Remember: Good tests are an investment in code quality and developer confidence. Write tests that you would want to maintain!