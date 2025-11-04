import 'dart:io';
import 'package:yaml/yaml.dart';

/// Configuration for architecture compliance checking.
///
/// Allows developers to customize which rules are enforced,
/// what files to ignore, and pass/fail thresholds.
class ComplianceConfig {
  const ComplianceConfig({
    this.enabled = true,
    this.strictMode = false,
    this.ignorePatterns = const [],
    this.rules = const RulesConfig(),
    this.thresholds = const ThresholdsConfig(),
  });

  /// Whether compliance checking is enabled
  final bool enabled;

  /// Whether to use strict mode (fail on warnings)
  final bool strictMode;

  /// Glob patterns for files to ignore
  final List<String> ignorePatterns;

  /// Rule configuration
  final RulesConfig rules;

  /// Threshold configuration
  final ThresholdsConfig thresholds;

  /// Loads configuration from a YAML file
  static Future<ComplianceConfig> fromFile(String path) async {
    try {
      final file = File(path);
      if (!await file.exists()) {
        return const ComplianceConfig();
      }

      final content = await file.readAsString();
      final yaml = loadYaml(content) as Map;
      final complianceSection = yaml['compliance'] as Map?;

      if (complianceSection == null) {
        return const ComplianceConfig();
      }

      return ComplianceConfig(
        enabled: complianceSection['enabled'] as bool? ?? true,
        strictMode: complianceSection['strict_mode'] as bool? ?? false,
        ignorePatterns: (complianceSection['ignore_patterns'] as List?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        rules: RulesConfig.fromYaml(
          complianceSection['rules'] as Map? ?? {},
        ),
        thresholds: ThresholdsConfig.fromYaml(
          complianceSection['thresholds'] as Map? ?? {},
        ),
      );
    } catch (e) {
      throw ConfigurationException(
        'Failed to load configuration from $path: $e',
      );
    }
  }

  /// Returns the default configuration
  static ComplianceConfig get defaultConfig => const ComplianceConfig();
}

/// Configuration for compliance rules.
class RulesConfig {
  const RulesConfig({
    this.structure = const StructureRulesConfig(),
    this.patterns = const PatternRulesConfig(),
    this.naming = const NamingRulesConfig(),
    this.dependencyInjection = const DependencyInjectionRulesConfig(),
  });

  final StructureRulesConfig structure;
  final PatternRulesConfig patterns;
  final NamingRulesConfig naming;
  final DependencyInjectionRulesConfig dependencyInjection;

  static RulesConfig fromYaml(Map<dynamic, dynamic> yaml) {
    return RulesConfig(
      structure: StructureRulesConfig.fromYaml(
        yaml['structure'] as Map? ?? {},
      ),
      patterns: PatternRulesConfig.fromYaml(
        yaml['patterns'] as Map? ?? {},
      ),
      naming: NamingRulesConfig.fromYaml(
        yaml['naming'] as Map? ?? {},
      ),
      dependencyInjection: DependencyInjectionRulesConfig.fromYaml(
        yaml['dependency_injection'] as Map? ?? {},
      ),
    );
  }
}

/// Configuration for structure rules.
class StructureRulesConfig {
  const StructureRulesConfig({
    this.enforceFeatureStructure = true,
    this.requireBarrelFiles = false,
  });

  /// Whether to enforce feature module structure
  final bool enforceFeatureStructure;

  /// Whether to require barrel files (e.g., cubit.dart)
  final bool requireBarrelFiles;

  static StructureRulesConfig fromYaml(Map<dynamic, dynamic> yaml) {
    return StructureRulesConfig(
      enforceFeatureStructure:
          yaml['enforce_feature_structure'] as bool? ?? true,
      requireBarrelFiles: yaml['require_barrel_files'] as bool? ?? false,
    );
  }
}

/// Configuration for pattern rules.
class PatternRulesConfig {
  const PatternRulesConfig({
    this.requireEitherPattern = true,
    this.requireAppStateStatus = true,
    this.requireCopyWith = true,
  });

  /// Whether to require Either pattern in repositories
  final bool requireEitherPattern;

  /// Whether to require AppStateStatus in state classes
  final bool requireAppStateStatus;

  /// Whether to require copyWith method in state classes
  final bool requireCopyWith;

  static PatternRulesConfig fromYaml(Map<dynamic, dynamic> yaml) {
    return PatternRulesConfig(
      requireEitherPattern: yaml['require_either_pattern'] as bool? ?? true,
      requireAppStateStatus: yaml['require_app_state_status'] as bool? ?? true,
      requireCopyWith: yaml['require_copy_with'] as bool? ?? true,
    );
  }
}

/// Configuration for naming rules.
class NamingRulesConfig {
  const NamingRulesConfig({
    this.cubitSuffix = 'Cubit',
    this.repositorySuffix = 'Repository',
    this.implSuffix = 'Impl',
  });

  /// Required suffix for cubit classes
  final String cubitSuffix;

  /// Required suffix for repository classes
  final String repositorySuffix;

  /// Required suffix for implementation classes
  final String implSuffix;

  static NamingRulesConfig fromYaml(Map<dynamic, dynamic> yaml) {
    return NamingRulesConfig(
      cubitSuffix: yaml['cubit_suffix'] as String? ?? 'Cubit',
      repositorySuffix: yaml['repository_suffix'] as String? ?? 'Repository',
      implSuffix: yaml['impl_suffix'] as String? ?? 'Impl',
    );
  }
}

/// Configuration for dependency injection rules.
class DependencyInjectionRulesConfig {
  const DependencyInjectionRulesConfig({
    this.requireRegistration = true,
    this.enforceRegistrationTypes = true,
  });

  /// Whether to require all components to be registered
  final bool requireRegistration;

  /// Whether to enforce correct registration types
  final bool enforceRegistrationTypes;

  static DependencyInjectionRulesConfig fromYaml(
    Map<dynamic, dynamic> yaml,
  ) {
    return DependencyInjectionRulesConfig(
      requireRegistration: yaml['require_registration'] as bool? ?? true,
      enforceRegistrationTypes:
          yaml['enforce_registration_types'] as bool? ?? true,
    );
  }
}

/// Configuration for pass/fail thresholds.
class ThresholdsConfig {
  const ThresholdsConfig({
    this.minimumScore = 80.0,
    this.failOnCritical = true,
  });

  /// Minimum compliance score to pass (0-100)
  final double minimumScore;

  /// Whether to fail if there are any critical violations
  final bool failOnCritical;

  static ThresholdsConfig fromYaml(Map<dynamic, dynamic> yaml) {
    return ThresholdsConfig(
      minimumScore: (yaml['minimum_score'] as num?)?.toDouble() ?? 80.0,
      failOnCritical: yaml['fail_on_critical'] as bool? ?? true,
    );
  }
}

/// Exception thrown when configuration loading fails.
class ConfigurationException implements Exception {
  ConfigurationException(this.message);

  final String message;

  @override
  String toString() => 'ConfigurationException: $message';
}
