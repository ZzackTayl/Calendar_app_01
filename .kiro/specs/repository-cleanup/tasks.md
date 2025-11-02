# Implementation Plan

- [x] 1. Pre-Cleanup Preparation
  - Create cleanup branch and document baseline state
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 1.1 Create cleanup branch and backup
  - Run `git checkout -b cleanup/repository-organization`
  - Create backup documentation of current state
  - Document baseline metrics (file counts, analysis results)
  - _Requirements: 1.1, 2.1_

- [x] 1.2 Run baseline validation
  - Execute `flutter analyze` and save output
  - Execute `flutter test` and document current failures
  - Count current markdown files in root
  - Verify `flutter pub get` succeeds
  - _Requirements: 1.1, 5.1_

- [-] 2. Documentation Consolidation
  - Consolidate 50+ root-level markdown files into organized docs/ structure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3_

- [x] 2.1 Create consolidated migration status document
  - Create `docs/migration/STATUS.md`
  - Consolidate content from MIGRATION_COMPLETE.md, MIGRATION_README.md, MIGRATION_ASSESSMENT_AND_PLAN.md, FINAL_MIGRATION_STATUS.md, and related files
  - Include current migration progress, completed phases, and next steps
  - _Requirements: 1.3, 3.2_

- [x] 2.2 Archive session and progress reports
  - Create `docs/archive/session-notes/` directory
  - Move all FINAL_*, COMPLETE_*, SUMMARY_*, DEVELOPER_*_PROGRESS.md, OCTOBER_*_SUMMARY.md files
  - Create index file documenting what was archived and when
  - _Requirements: 1.4, 3.3_

- [x] 2.3 Organize feature-specific documentation
  - Create `docs/migration/PHASES.md` consolidating phase completion summaries
  - Move CALENDAR_SCREEN_MIGRATION_COMPLETE.md, SETTINGS_SCREEN_MIGRATION_COMPLETE.md, NOTIFICATION_CUBIT_COMPLETE.md to docs/migration/
  - Move LOCALIZATION_* files to docs/features/ or consolidate into STATUS.md
  - _Requirements: 1.3, 3.1_

- [x] 2.4 Consolidate implementation and planning documents
  - Move INTEGRATION_WORK_PLAN.md, IMPLEMENTATION_SUMMARY.md to docs/migration/ or docs/archive/
  - Move HOW_TO_COMPLETE_LOCALIZATION.md, IMMEDIATE_FIXES_NEEDED.md to docs/archive/
  - Update references in remaining documents
  - _Requirements: 1.5, 3.2_

- [x] 2.5 Organize architecture documentation
  - Move NOTIFICATION_ARCHITECTURE.md, NOTIFICATION_ACTIVITY_READINESS_ASSESSMENT.md to docs/architecture/
  - Verify MYORBIT_CLEANARCH_PATTERNS.md remains in root as authoritative reference
  - _Requirements: 3.1, 8.2_

- [x] 2.6 Handle repository organization files
  - Keep REPOSITORY_ORGANIZATION.md in root (useful reference)
  - Merge REPOSITORY_AUDIT_RECOMMENDATIONS.md and REPOSITORY_READY_FOR_HANDOFF.md into docs/migration/STATUS.md
  - Archive CLEANUP_SUMMARY.md after this cleanup completes
  - _Requirements: 1.5, 3.2_

- [x] 2.7 Move AI agent files to Kiro steering
  - Move GEMINI.md, QWEN.md content to .kiro/steering/
  - Move TEAM_KICKOFF.md, QUICK_START_NEXT_SESSION.md to docs/archive/session-notes/
  - _Requirements: 4.2, 4.4_

- [x] 2.8 Clean up miscellaneous root files
  - Evaluate Cursor.mcd (move to .cursor/ or delete)
  - Archive or delete save_logo.txt
  - Remove empty WARP.md folder
  - _Requirements: 1.1, 7.5_

- [x] 2.9 Update README.md and create docs navigation
  - Update README.md to reference new documentation structure
  - Create comprehensive docs/README.md with navigation to all documentation
  - Verify all links work
  - _Requirements: 1.2, 3.4_

- [-] 2.10 Commit documentation consolidation
  - Commit changes with message: "docs: consolidate root-level documentation"
  - Verify commit includes all moved files
  - _Requirements: 1.1, 3.1_

- [ ] 3. Code Organization and Legacy Marking
  - Clearly separate and document legacy code vs migrated code
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3.1 Document legacy Riverpod providers
  - Create `lib/logic/providers/README.md` marking directory as DEPRECATED
  - List all provider files and their migration status
  - Reference docs/migration/STATUS.md for migration plan
  - _Requirements: 2.1, 2.2_

- [ ] 3.2 Document legacy UI screens
  - Create or update `lib/ui/screens/README.md`
  - Document which screens need BLoC integration
  - Link to migration documentation
  - _Requirements: 2.3_

- [ ] 3.3 Identify Supabase references
  - Search codebase for Supabase imports and usage
  - Document files requiring Firebase migration in docs/migration/STATUS.md
  - Add TODO comments in code where Supabase is still used
  - _Requirements: 2.4_

- [ ] 3.4 Organize archive directory structure
  - Create archive/old_providers/ directory structure
  - Create archive/docs/session-notes/ for moved documentation
  - Create archive/README.md explaining archive organization
  - _Requirements: 2.5_

- [ ] 3.5 Commit code organization changes
  - Commit with message: "refactor: document legacy code separation"
  - Run `flutter analyze` to verify no new errors introduced
  - _Requirements: 2.1_

- [ ] 4. Dependency Cleanup
  - Remove unused packages from pubspec.yaml
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4.1 Document current dependencies
  - Create backup of pubspec.yaml
  - Run `flutter pub outdated` and save output
  - Document which packages are used where
  - _Requirements: 5.3_

- [ ] 4.2 Remove Riverpod packages
  - Remove flutter_riverpod, riverpod, hooks_riverpod, riverpod_annotation from dependencies
  - Remove riverpod_generator from dev_dependencies
  - Add comment explaining removal and migration to BLoC
  - _Requirements: 5.1_

- [ ] 4.3 Document Supabase package status
  - Add comments to pubspec.yaml for any Supabase packages
  - Document in docs/migration/STATUS.md which features still use Supabase
  - Plan for removal after Firebase migration completes
  - _Requirements: 5.2_

- [ ] 4.4 Resolve version constraints
  - Review and update version constraints for test, mockito, build_runner
  - Attempt to resolve conflicts if possible
  - Document any constraints that must remain
  - _Requirements: 5.4_

- [ ] 4.5 Validate dependency changes
  - Run `flutter pub get` and verify success
  - Run `flutter analyze` and verify no new errors
  - Run `flutter test` and document any new failures
  - _Requirements: 5.1, 5.5_

- [ ] 4.6 Commit dependency cleanup
  - Commit with message: "deps: remove unused Riverpod packages"
  - Include updated pubspec.yaml and pubspec.lock
  - _Requirements: 5.1_

- [ ] 5. Test Directory Organization
  - Reorganize test/ to mirror lib/ structure
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5.1 Create test helpers directory
  - Create test/helpers/ directory
  - Identify shared test utilities across test files
  - Move shared utilities to test/helpers/
  - _Requirements: 6.5_

- [ ] 5.2 Organize test structure to mirror lib
  - Ensure test/core/ mirrors lib/core/
  - Ensure test/features/ mirrors lib/features/
  - Create missing test directories as needed
  - _Requirements: 6.1_

- [ ] 5.3 Organize golden test files
  - Create test/goldens/ subdirectories by feature
  - Move golden files to appropriate subdirectories
  - Update test files to reference new golden paths
  - _Requirements: 6.4_

- [ ] 5.4 Archive old Riverpod test files
  - Identify test files using Riverpod patterns
  - Move to archive/test/old_riverpod_tests/
  - Document which tests need rewriting for BLoC/Either pattern
  - _Requirements: 6.2, 6.3_

- [ ] 5.5 Update test documentation
  - Create or update test/README.md explaining structure
  - Document test helpers and their usage
  - Link to testing guidelines in docs/guides/
  - _Requirements: 6.1_

- [ ] 5.6 Commit test organization
  - Commit with message: "test: reorganize test directory structure"
  - Run `flutter test` and document results
  - _Requirements: 6.1_

- [ ] 6. Configuration File Consolidation
  - Consolidate and clean up configuration files
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 6.1 Evaluate IDE configuration directories
  - Document which IDE configs are actively used (.idea/, .cursor/, .claude/, .gemini/)
  - Add comments to README.md explaining each config directory
  - Update .gitignore for personal IDE configs if needed
  - _Requirements: 7.1, 7.5_

- [ ] 6.2 Consolidate MCP configurations
  - Merge .mcp.json and .cursor/mcp.json into .kiro/settings/mcp.json
  - Remove duplicate .mcp.json and .cursor/mcp.json files
  - Verify MCP configuration is valid
  - _Requirements: 7.2, 7.4_

- [ ] 6.3 Verify environment file configuration
  - Ensure .env is in .gitignore
  - Verify .env.example is comprehensive and up-to-date
  - Document environment variables in README or docs/setup/
  - _Requirements: 7.3_

- [ ] 6.4 Review and document configuration files
  - Document purpose of each config file in root
  - Update docs/guides/ with configuration documentation
  - Ensure analysis_options.yaml, .lcovrc, .pre-commit-config.yaml are documented
  - _Requirements: 7.5, 10.5_

- [ ] 6.5 Commit configuration consolidation
  - Commit with message: "config: consolidate configuration files"
  - Verify IDE still works correctly
  - _Requirements: 7.1_

- [ ] 7. Agent Resources Consolidation
  - Create single source of truth for AI agent guidance
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7.1 Create consolidated Kiro steering files
  - Create .kiro/steering/flutter-rules.md
  - Create .kiro/steering/architecture.md
  - Create .kiro/steering/migration-guide.md
  - Create .kiro/steering/project-context.md
  - _Requirements: 4.2, 4.4_

- [ ] 7.2 Consolidate Flutter rules from multiple sources
  - Merge content from .factory/Resources_For_Agents/rules_for_dart_and_flutter.md
  - Merge content from Resources_For_Agents/rules_for_dart_and_flutter.md
  - Merge content from .cursor/rules/flutteranddartrules.mdc
  - Create single authoritative .kiro/steering/flutter-rules.md
  - _Requirements: 4.1, 4.2_

- [ ] 7.3 Consolidate agent context files
  - Extract relevant content from GEMINI.md and QWEN.md
  - Add to .kiro/steering/project-context.md
  - Include MyOrbit_CleanArch patterns reference
  - _Requirements: 4.2, 4.4_

- [ ] 7.4 Evaluate agent workforce files
  - Review .factory/droids/ directory
  - Determine if still needed or should be archived
  - Archive with documentation if not actively used
  - _Requirements: 4.5_

- [ ] 7.5 Remove duplicate agent resource directories
  - Archive .factory/Resources_For_Agents/ after consolidation
  - Archive Resources_For_Agents/ after consolidation
  - Keep only .kiro/steering/ as single source
  - _Requirements: 4.1, 4.3_

- [ ] 7.6 Commit agent resources consolidation
  - Commit with message: "docs: consolidate agent resources"
  - Verify agent guidance is accessible
  - _Requirements: 4.2_

- [ ] 8. Final Verification and Documentation
  - Verify all changes work correctly and document cleanup
  - _Requirements: 1.1, 3.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8.1 Run full validation suite
  - Execute `flutter clean && flutter pub get`
  - Execute `flutter analyze` and compare to baseline
  - Execute `flutter test` and document results
  - Verify no new errors introduced
  - _Requirements: 10.1, 10.2_

- [ ] 8.2 Verify documentation links
  - Check all links in README.md work
  - Check all links in docs/README.md work
  - Verify MYORBIT_CLEANARCH_PATTERNS.md is accessible
  - Check for broken references in documentation
  - _Requirements: 1.2, 3.4_

- [ ] 8.3 Test developer onboarding flow
  - Follow DEVELOPER_QUICKSTART.md from scratch
  - Verify all referenced files exist
  - Ensure documentation is clear and complete
  - _Requirements: 1.1, 3.4_

- [ ] 8.4 Create cleanup summary document
  - Document all changes made
  - List files moved, consolidated, archived, deleted
  - Include before/after metrics
  - Document any issues encountered
  - _Requirements: 1.1, 3.1_

- [ ] 8.5 Update CHANGELOG.md
  - Add entry for repository cleanup
  - Document major organizational changes
  - Reference cleanup summary document
  - _Requirements: 3.1_

- [ ] 8.6 Verify build succeeds on all platforms
  - Run `flutter build apk --debug` (Android)
  - Run `flutter build ios --debug --no-codesign` (iOS)
  - Verify builds complete successfully
  - _Requirements: 10.1_

- [ ] 8.7 Final commit and documentation
  - Commit with message: "docs: cleanup summary and verification"
  - Create pull request with detailed description
  - Tag for review before merging
  - _Requirements: 1.1, 3.1_

- [ ] 9. Post-Cleanup Tasks (Optional)
  - Additional improvements that can be done after main cleanup
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 9.1 Review and update analysis_options.yaml
  - Ensure linting rules align with Flutter best practices
  - Add any missing recommended rules
  - Document custom rules and their purpose
  - _Requirements: 10.1, 10.2_

- [ ]* 9.2 Evaluate deployment file organization
  - Review firebase.json and firestore.rules placement
  - Consider moving supabase/ to archive if Firebase migration complete
  - Evaluate docker-compose.yml necessity
  - Organize deployment scripts in scripts/ directory
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 9.3 Create comprehensive .gitignore review
  - Ensure all IDE configs are properly ignored
  - Verify build artifacts are ignored
  - Check environment files are ignored
  - Document .gitignore patterns
  - _Requirements: 7.3_

- [ ]* 9.4 Update reference material
  - Review REFERENCE_FROM_CLEANARCH/ for completeness
  - Update MYORBIT_CLEANARCH_PATTERNS.md if needed
  - Ensure reference material matches current MyOrbit_CleanArch
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 9.5 Create developer onboarding checklist
  - Document step-by-step setup process
  - Include common issues and solutions
  - Add links to all relevant documentation
  - _Requirements: 1.1, 3.4_
