# Requirements Document

## Introduction

This document defines the requirements for cleaning up and organizing the MyOrbit Calendar Flutter repository. The project has completed a migration from Riverpod + Supabase to BLoC/Cubit + Firebase following Clean Architecture patterns. The repository now contains significant documentation clutter, redundant files, and mixed old/new code that needs systematic organization.

## Glossary

- **Repository**: The MyOrbit Calendar Flutter codebase
- **Root Directory**: The top-level directory of the repository containing lib/, docs/, and configuration files
- **Documentation Clutter**: Redundant, outdated, or misplaced markdown files in the root directory
- **Legacy Code**: Old Riverpod providers and Supabase references that need removal
- **Migrated Code**: New BLoC/Cubit + Firebase code following Clean Architecture
- **Archive Directory**: The archive/ folder containing old code and documentation
- **Reference Material**: REFERENCE_FROM_CLEANARCH/ directory with canonical examples
- **Agent Resources**: .factory/ and Resources_For_Agents/ directories with AI agent guidelines

## Requirements

### Requirement 1

**User Story:** As a developer joining the project, I want a clean root directory with only essential files, so that I can quickly understand the project structure without being overwhelmed by documentation clutter.

#### Acceptance Criteria

1. WHEN a developer views the root directory, THE Repository SHALL contain no more than 10 markdown documentation files
2. WHEN a developer needs project information, THE Repository SHALL provide a single README.md as the primary entry point
3. WHEN a developer looks for migration information, THE Repository SHALL consolidate all migration status files into the docs/migration/ directory
4. WHEN a developer examines the root, THE Repository SHALL remove all redundant status report files (FINAL_*, COMPLETE_*, SUMMARY_*, etc.)
5. WHERE multiple files contain similar information, THE Repository SHALL merge them into single authoritative documents

### Requirement 2

**User Story:** As a developer maintaining the codebase, I want clear separation between active code and archived code, so that I can focus on relevant files without confusion.

#### Acceptance Criteria

1. WHEN examining the lib/ directory, THE Repository SHALL clearly separate migrated features from legacy Riverpod providers
2. WHEN legacy code exists, THE Repository SHALL move deprecated Riverpod providers to archive/old_providers/
3. WHEN old UI code exists, THE Repository SHALL document which screens need BLoC integration
4. WHEN Supabase references exist, THE Repository SHALL identify and document all files requiring Firebase migration
5. WHERE code is no longer used, THE Repository SHALL move it to the archive/ directory with clear documentation

### Requirement 3

**User Story:** As a developer working on the migration, I want organized documentation that follows a clear hierarchy, so that I can find relevant information quickly.

#### Acceptance Criteria

1. WHEN documentation exists, THE Repository SHALL organize all docs into appropriate subdirectories (docs/migration/, docs/architecture/, docs/guides/, etc.)
2. WHEN multiple documentation files cover the same topic, THE Repository SHALL consolidate them into single authoritative sources
3. WHEN documentation is outdated, THE Repository SHALL move it to docs/archive/ with timestamps
4. WHEN new developers need guidance, THE Repository SHALL provide a clear docs/README.md with navigation
5. WHERE documentation references external projects, THE Repository SHALL maintain clear links to MyOrbit_CleanArch source of truth

### Requirement 4

**User Story:** As a developer using AI assistance, I want consolidated agent resources in a single location, so that AI tools have consistent guidance.

#### Acceptance Criteria

1. WHEN agent resources exist in multiple locations, THE Repository SHALL consolidate .factory/ and Resources_For_Agents/ into a single directory
2. WHEN AI agents need Flutter guidance, THE Repository SHALL provide a single authoritative rules file
3. WHEN agent resources are duplicated, THE Repository SHALL remove redundant files
4. WHEN agent configurations exist, THE Repository SHALL organize them in .kiro/steering/ following Kiro conventions
5. WHERE agent resources are outdated, THE Repository SHALL update or remove them

### Requirement 5

**User Story:** As a developer managing dependencies, I want a clean pubspec.yaml with only necessary packages, so that the project has minimal dependencies and clear purpose for each.

#### Acceptance Criteria

1. WHEN Riverpod packages are no longer used, THE Repository SHALL remove flutter_riverpod, riverpod, hooks_riverpod, and riverpod_annotation from dependencies
2. WHEN Supabase packages exist, THE Repository SHALL document which need removal after Firebase migration completes
3. WHEN dev dependencies are outdated, THE Repository SHALL update or remove them
4. WHEN package versions conflict, THE Repository SHALL resolve version constraints
5. WHERE packages are unused, THE Repository SHALL remove them and document the removal

### Requirement 6

**User Story:** As a developer running tests, I want a clean test directory structure that mirrors the lib/ structure, so that I can easily find and maintain tests.

#### Acceptance Criteria

1. WHEN test files exist, THE Repository SHALL organize them to mirror the lib/ directory structure
2. WHEN old test files use Riverpod patterns, THE Repository SHALL move them to archive/test/ with documentation
3. WHEN test files are outdated, THE Repository SHALL document which tests need updates for Either pattern
4. WHEN golden test files exist, THE Repository SHALL organize them in test/goldens/ subdirectories by feature
5. WHERE test utilities are shared, THE Repository SHALL consolidate them in test/helpers/

### Requirement 7

**User Story:** As a developer configuring the project, I want minimal configuration files in the root directory, so that the project structure is clean and maintainable.

#### Acceptance Criteria

1. WHEN multiple IDE configuration directories exist, THE Repository SHALL evaluate which are necessary (.idea/, .cursor/, .claude/, .gemini/)
2. WHEN configuration files are duplicated, THE Repository SHALL consolidate them
3. WHEN environment files exist, THE Repository SHALL ensure .env.example is comprehensive and .env is gitignored
4. WHEN MCP configurations exist in multiple locations, THE Repository SHALL consolidate to .kiro/settings/mcp.json
5. WHERE configuration files are unused, THE Repository SHALL remove them with documentation

### Requirement 8

**User Story:** As a developer understanding the architecture, I want clear reference material that doesn't clutter the main codebase, so that I can learn patterns without confusion.

#### Acceptance Criteria

1. WHEN reference material exists, THE Repository SHALL keep REFERENCE_FROM_CLEANARCH/ as read-only examples
2. WHEN architecture patterns are documented, THE Repository SHALL maintain MYORBIT_CLEANARCH_PATTERNS.md as the single source of truth
3. WHEN multiple pattern documents exist, THE Repository SHALL consolidate them
4. WHEN reference material is outdated, THE Repository SHALL update it to match current MyOrbit_CleanArch patterns
5. WHERE reference examples are incomplete, THE Repository SHALL document what's missing

### Requirement 9

**User Story:** As a developer deploying the application, I want organized deployment and infrastructure files, so that I can understand the deployment process clearly.

#### Acceptance Criteria

1. WHEN Firebase configuration exists, THE Repository SHALL organize firebase.json, firestore.rules in the root with clear documentation
2. WHEN Supabase files exist, THE Repository SHALL move supabase/ directory to archive/ after Firebase migration
3. WHEN Docker configuration exists, THE Repository SHALL evaluate if docker-compose.yml is still needed
4. WHEN deployment scripts exist, THE Repository SHALL organize them in scripts/ directory
5. WHERE deployment documentation exists, THE Repository SHALL consolidate it in docs/operations/

### Requirement 10

**User Story:** As a developer maintaining code quality, I want clear analysis and linting configuration, so that all developers follow the same standards.

#### Acceptance Criteria

1. WHEN analysis options exist, THE Repository SHALL maintain a single analysis_options.yaml with comprehensive rules
2. WHEN linting rules are defined, THE Repository SHALL ensure they align with Flutter best practices
3. WHEN pre-commit hooks exist, THE Repository SHALL document their purpose in .pre-commit-config.yaml
4. WHEN code coverage configuration exists, THE Repository SHALL maintain .lcovrc with appropriate settings
5. WHERE quality tools are configured, THE Repository SHALL document their usage in docs/guides/
