#!/usr/bin/env dart

/// MyOrbit Test Runner
///
/// Comprehensive test automation script that:
/// - Runs categorized tests (unit, widget, integration)
/// - Generates coverage reports with threshold enforcement
/// - Produces structured JSON output for CI/CD
/// - Supports parallel test execution
/// - Provides detailed reporting and analytics

import 'dart:io';
import 'dart:convert';
import 'package:args/args.dart';
import 'package:yaml/yaml.dart';

void main(List<String> arguments) async {
  final parser = ArgParser()
    ..addOption('category',
        abbr: 'c',
        help: 'Test category to run',
        allowed: [
          'unit',
          'widget',
          'integration',
          'accessibility',
          'golden',
          'all'
        ],
        defaultsTo: 'all')
    ..addFlag('coverage',
        help: 'Generate coverage reports',
        defaultsTo: true)
    ..addFlag('html-report',
        help: 'Generate HTML coverage report',
        defaultsTo: true)
    ..addFlag('json-output',
        abbr: 'j',
        help: 'Generate JSON test results',
        defaultsTo: true)
    ..addFlag('fail-fast',
        abbr: 'f',
        help: 'Stop on first test failure',
        defaultsTo: false)
    ..addOption('concurrency',
        help: 'Number of concurrent test processes',
        defaultsTo: '4')
    ..addFlag('update-goldens',
        abbr: 'u',
        help: 'Update golden files',
        defaultsTo: false)
    ..addFlag('verbose',
        abbr: 'v',
        help: 'Verbose output',
        defaultsTo: false)
    ..addFlag('help',
        abbr: 'h',
        help: 'Show this help message',
        negatable: false);
    print(parser.usage);
    exit(1);
  }
}

class TestRunner {
  final ArgResults args;
  late final Map<String, dynamic> config;
  late final TestResults results;

  TestRunner(this.args) {
    results = TestResults();
  }

  Future<void> run() async {
    print('🚀 MyOrbit Test Runner Starting...\n');

    await _loadConfiguration();
    await _setupTestEnvironment();

    final startTime = DateTime.now();

    try {
      if (args['category'] == 'all') {
        await _runAllCategories();
      } else {
        await _runCategory(args['category']);
      }

      if (args['coverage']) {
        await _generateCoverageReports();
      }

      await _generateResults();
    } finally {
      final duration = DateTime.now().difference(startTime);
      await _printSummary(duration);
    }
  }

  Future<void> _loadConfiguration() async {
    try {
      final configFile = File('test_config.yaml');
      if (!await configFile.exists()) {
        throw Exception('test_config.yaml not found');
      }

      final yamlContent = await configFile.readAsString();
      config = loadYaml(yamlContent);

      print('✅ Configuration loaded');
    } catch (e) {
      print('❌ Failed to load configuration: $e');
      exit(1);
    }
  }

  Future<void> _setupTestEnvironment() async {
    // Create test results directory
    final resultsDir = Directory('test_results');
    if (!await resultsDir.exists()) {
      await resultsDir.create(recursive: true);
    }

    // Create coverage directory
    final coverageDir = Directory('coverage');
    if (!await coverageDir.exists()) {
      await coverageDir.create(recursive: true);
    }

    print('✅ Test environment setup complete');
  }

  Future<void> _runAllCategories() async {
    final categories = config['test_categories'].keys;

    for (final category in categories) {
      if (category != 'golden' || args['update-goldens']) {
        await _runCategory(category);
      }
    }
  }

  Future<void> _runCategory(String category) async {
    print('📋 Running $category tests...');

    final categoryConfig = config['test_categories'][category];
    if (categoryConfig == null) {
      print('❌ Unknown test category: $category');
      return;
    }

    final pattern = categoryConfig['pattern'];
    final exclude = categoryConfig['exclude'] ?? [];

    final testCommand = _buildTestCommand(category, pattern, exclude);
    final result = await _executeCommand(testCommand);

    results.addCategoryResult(category, result);

    if (result.exitCode == 0) {
      print('✅ $category tests passed');
    } else {
      print('❌ $category tests failed');
      if (args['fail-fast']) {
        exit(1);
      }
    }
  }

  String _buildTestCommand(String category, String pattern, List exclude) {
    final List<String> command = ['flutter', 'test'];

    // Add coverage flag
    if (args['coverage']) {
      command.add('--coverage');
    }

    // Add concurrency
    command.addAll(['--concurrency', args['concurrency']]);

    // Add test reporter
    command.addAll(['--reporter', 'json']);

    // Add pattern matching
    if (pattern.isNotEmpty && category != 'all') {
      // Convert pattern to individual test files
      final patterns = pattern.split(',');
      for (final p in patterns) {
        command.add(p.trim());
      }
    }

    // Add golden update flag
    if (args['update-goldens'] && category == 'golden') {
      command.add('--update-goldens');
    }

    return command.join(' ');
  }

  Future<ProcessResult> _executeCommand(String command) async {
    final parts = command.split(' ');
    final executable = parts.first;
    final arguments = parts.skip(1).toList();

    if (args['verbose']) {
      print('Executing: $command');
    }

    return await Process.run(executable, arguments);
  }

  Future<void> _generateCoverageReports() async {
    print('📊 Generating coverage reports...');

    // Generate LCOV report
    await _executeCommand('flutter test --coverage');

    if (args['html-report']) {
      // Generate HTML report (requires genhtml from lcov package)
      try {
        await _executeCommand('genhtml coverage/lcov.info -o coverage/html');
        print('✅ HTML coverage report generated: coverage/html/index.html');
      } catch (e) {
        print(
            '⚠️  Could not generate HTML report (install lcov: brew install lcov)');
      }
    }

    // Check coverage thresholds
    await _checkCoverageThresholds();
  }

  Future<void> _checkCoverageThresholds() async {
    try {
      final lcovFile = File('coverage/lcov.info');
      if (!await lcovFile.exists()) {
        print('⚠️  No coverage data found');
        return;
      }

      final lcovData = await lcovFile.readAsString();
      final coverage = _parseLcovData(lcovData);

      final thresholds = config['coverage'];
      final lineThreshold = thresholds['line_coverage_threshold'];
      final functionThreshold = thresholds['function_coverage_threshold'];
      final branchThreshold = thresholds['branch_coverage_threshold'];

      results.coverage = coverage;

      print('📊 Coverage Summary:');
      print(
          '   Lines: ${coverage['line_coverage']?.toStringAsFixed(1) ?? 'N/A'}% (threshold: $lineThreshold%)');
      print(
          '   Functions: ${coverage['function_coverage']?.toStringAsFixed(1) ?? 'N/A'}% (threshold: $functionThreshold%)');
      print(
          '   Branches: ${coverage['branch_coverage']?.toStringAsFixed(1) ?? 'N/A'}% (threshold: $branchThreshold%)');

      if ((coverage['line_coverage'] ?? 0) < lineThreshold &&
          config['ci_settings']['fail_on_coverage_threshold']) {
        print('❌ Line coverage below threshold');
        exit(1);
      }
    } catch (e) {
      print('⚠️  Could not parse coverage data: $e');
    }
  }

  Map<String, double> _parseLcovData(String lcovData) {
    // Simple LCOV parser - in production, use a proper LCOV parser
    final lines = lcovData.split('\n');
    double totalLines = 0;
    double coveredLines = 0;
    double totalFunctions = 0;
    double coveredFunctions = 0;
    double totalBranches = 0;
    double coveredBranches = 0;

    for (final line in lines) {
      if (line.startsWith('LF:')) {
        totalLines += double.parse(line.substring(3));
      } else if (line.startsWith('LH:')) {
        coveredLines += double.parse(line.substring(3));
      } else if (line.startsWith('FNF:')) {
        totalFunctions += double.parse(line.substring(4));
      } else if (line.startsWith('FNH:')) {
        coveredFunctions += double.parse(line.substring(4));
      } else if (line.startsWith('BRF:')) {
        totalBranches += double.parse(line.substring(4));
      } else if (line.startsWith('BRH:')) {
        coveredBranches += double.parse(line.substring(4));
      }
    }

    return {
      'line_coverage': totalLines > 0 ? (coveredLines / totalLines * 100) : 0.0,
      'function_coverage':
          totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100) : 0.0,
      'branch_coverage':
          totalBranches > 0 ? (coveredBranches / totalBranches * 100) : 0.0,
    };
  }

  Future<void> _generateResults() async {
    if (args['json-output']) {
      final jsonResults = jsonEncode(results.toJson());
      final resultsFile = File('test_results/results.json');
      await resultsFile.writeAsString(jsonResults);
      print('✅ JSON results generated: test_results/results.json');
    }
  }

  Future<void> _printSummary(Duration duration) async {
    print('\n📋 Test Summary');
    print('=' * 50);
    print('Duration: ${duration.inMinutes}m ${duration.inSeconds % 60}s');
    print('Total tests: ${results.totalTests}');
    print('Passed: ${results.passedTests}');
    print('Failed: ${results.failedTests}');
    print('Skipped: ${results.skippedTests}');

    if (results.coverage.isNotEmpty) {
      print('\n📊 Coverage:');
      print(
          'Lines: ${results.coverage['line_coverage']?.toStringAsFixed(1) ?? 'N/A'}%');
      print(
          'Functions: ${results.coverage['function_coverage']?.toStringAsFixed(1) ?? 'N/A'}%');
      print(
          'Branches: ${results.coverage['branch_coverage']?.toStringAsFixed(1) ?? 'N/A'}%');
    }

    final overallSuccess = results.failedTests == 0;
    if (overallSuccess) {
      print('\n🎉 All tests passed!');
      exit(0);
    } else {
      print('\n❌ Some tests failed');
      exit(1);
    }
  }
}

class TestResults {
  final Map<String, ProcessResult> categoryResults = {};
  Map<String, double> coverage = {};

  void addCategoryResult(String category, ProcessResult result) {
    categoryResults[category] = result;
  }

  int get totalTests => categoryResults.values
      .map((r) => _parseTestCount(r.stdout.toString()))
      .fold(0, (a, b) => a + b);

  int get passedTests => categoryResults.values
      .where((r) => r.exitCode == 0)
      .map((r) => _parseTestCount(r.stdout.toString()))
      .fold(0, (a, b) => a + b);

  int get failedTests => categoryResults.values
      .where((r) => r.exitCode != 0)
      .map((r) => _parseTestCount(r.stdout.toString()))
      .fold(0, (a, b) => a + b);

  int get skippedTests => 0; // TODO: Parse skipped tests

  int _parseTestCount(String output) {
    // Simple test count parser - improve for production
    final regex = RegExp(r'(\d+) tests? passed');
    final match = regex.firstMatch(output);
    return match != null ? int.parse(match.group(1)!) : 0;
  }

  Map<String, dynamic> toJson() {
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'total_tests': totalTests,
      'passed_tests': passedTests,
      'failed_tests': failedTests,
      'skipped_tests': skippedTests,
      'coverage': coverage,
      'category_results': categoryResults.map((k, v) => MapEntry(k, {
            'exit_code': v.exitCode,
            'stdout': v.stdout.toString(),
            'stderr': v.stderr.toString(),
          })),
    };
  }
}
