import 'dart:io';
import 'package:path/path.dart' as path;
import 'compliance_config.dart';

/// Utility for loading compliance configuration.
class ConfigLoader {
  /// Default configuration file path relative to project root
  static const String defaultConfigPath = '.kiro/architecture_compliance.yaml';

  /// Loads configuration from the default location or returns default config
  static Future<ComplianceConfig> loadConfig({
    String? projectRoot,
    String? configPath,
  }) async {
    final root = projectRoot ?? Directory.current.path;
    final configFile = configPath ?? defaultConfigPath;
    final fullPath = path.join(root, configFile);

    try {
      return await ComplianceConfig.fromFile(fullPath);
    } on ConfigurationException {
      // If config file doesn't exist or is invalid, use defaults
      return ComplianceConfig.defaultConfig;
    }
  }

  /// Checks if a configuration file exists
  static Future<bool> configExists({
    String? projectRoot,
    String? configPath,
  }) async {
    final root = projectRoot ?? Directory.current.path;
    final configFile = configPath ?? defaultConfigPath;
    final fullPath = path.join(root, configFile);
    return File(fullPath).exists();
  }

  /// Creates a default configuration file at the specified location
  static Future<void> createDefaultConfig({
    String? projectRoot,
    String? configPath,
  }) async {
    final root = projectRoot ?? Directory.current.path;
    final configFile = configPath ?? defaultConfigPath;
    final fullPath = path.join(root, configFile);

    // Ensure directory exists
    final dir = Directory(path.dirname(fullPath));
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }

    // Read template from package
    final templatePath = path.join(
      path.dirname(Platform.script.toFilePath()),
      '..',
      'config_template.yaml',
    );

    final template = await File(templatePath).readAsString();
    await File(fullPath).writeAsString(template);
  }

  /// Validates a configuration file
  static Future<ConfigValidationResult> validateConfig({
    String? projectRoot,
    String? configPath,
  }) async {
    final root = projectRoot ?? Directory.current.path;
    final configFile = configPath ?? defaultConfigPath;
    final fullPath = path.join(root, configFile);

    try {
      await ComplianceConfig.fromFile(fullPath);
      return ConfigValidationResult(
        isValid: true,
        message: 'Configuration is valid',
      );
    } on ConfigurationException catch (e) {
      return ConfigValidationResult(
        isValid: false,
        message: e.message,
      );
    } catch (e) {
      return ConfigValidationResult(
        isValid: false,
        message: 'Unexpected error: $e',
      );
    }
  }
}

/// Result of configuration validation.
class ConfigValidationResult {
  const ConfigValidationResult({
    required this.isValid,
    required this.message,
  });

  final bool isValid;
  final String message;
}
