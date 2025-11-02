# Design Document

## Overview

This design outlines a systematic approach to cleaning up and organizing the MyOrbit Calendar Flutter repository. The cleanup will be performed in phases, prioritizing high-impact changes that improve developer experience while preserving important historical context and reference material.

The design follows a conservative approach: archive rather than delete, consolidate rather than scatter, and document all changes for future reference.

## Architecture

### Cleanup Strategy

The cleanup follows a **phased approach** with clear rollback points:

1. **Phase 1: Documentation Consolidation** - Organize root-level markdown files
2. **Phase 2: Code Organization** - Separate legacy from migrated code
3. **Phase 3: Dependency Cleanup** - Remove unused packages
4. **Phase 4: Test Organization** - Structure test directory
5. **Phase 5: Configuration Cleanup** - Consolidate config files
6. **Phase 6: Agent Resources** - Organize AI assistance files
7. **Phase 7: Final Verification** - Ensure nothing is broken

### Directory Structure (Target State)

```
myorbit_calendar/
├── .kiro/                          # Kiro IDE configuration
│   ├── settings/
│   │   └── mcp.json               # MCP configuration (consolidated)
│   ├── specs/                      # Feature specs
│   └── steering/                   # Agent guidance (consolidated)
│
├── docs/                           # All documentation
│   ├── README.md                   # Documentation index
│   ├── architecture/               # Architecture decisions
│   ├── guides/                     # Developer guides
│   ├── migration/                  # Migration documentation
│   │   ├── STATUS.md              # Current migration status (consolidated)
│   │   └── PHASES.md              # Phase completion summaries
│   ├── operations/                 # Deployment & operations
│   ├── reference/                  # Technical reference
│   └── archive/                    # Outdated documentation
│
├── lib/                            # Application code
│   ├── core/                       # Shared infrastructure
│   ├── features/                   # Clean architecture features (NEW)
│   ├── presentation/               # Presentation layer
│   ├── domain/                     # Domain models (SHARED)
│   ├── logic/                      # Legacy code (TO MIGRATE)
│   │   └── providers/             # Riverpod providers (DEPRECATED)
│   └── ui/                         # Legacy UI (TO MIGRATE)
│
├── test/                           # Tests mirroring lib/
│   ├── core/
│   ├── features/
│   ├── helpers/                    # Shared test utilities
│   └── goldens/                    # Golden test files
│
├── archive/                        # Historical code & docs
│   ├── docs/                       # Old documentation
│   ├── lib/                        # Deprecated code
│   ├── old_providers/              # Removed Riverpod providers
│   └── test/                       # Old test files
│
├── REFERENCE_FROM_CLEANARCH/       # Read-only reference (DO NOT MODIFY)
│
├── scripts/                        # Build & deployment scripts
│
├── README.md                       # Primary entry point
├── DEVELOPER_QUICKSTART.md         # Quick start guide
├── MYORBIT_CLEANARCH_PATTERNS.md   # Architecture patterns
└── [platform directories]          # android/, ios/, web/, etc.
```

## Components and Interfaces

### 1. Documentation Consolidation System

**Purpose:** Reduce root-level documentation clutter from 50+ files to ~5 essential files.

**Components:**

#### Root-Level Documentation (Keep)
- `README.md` - Primary project overview
- `DEVELOPER_QUICKSTART.md` - Quick start for new developers
- `MYORBIT_CLEANARCH_PATTERNS.md` - Architecture patterns reference
- `CHANGELOG.md` - Version history (create if needed)
- `CONTRIBUTING.md` - Contribution guidelines (create if needed)

#### Files to Consolidate

**Migration Status Files** (30+ files) → `docs/migration/STATUS.md`
- MIGRATION_COMPLETE.md
- MIGRATION_README.md
- MIGRATION_ASSESSMENT_AND_PLAN.md
- FINAL_MIGRATION_STATUS.md
- FINAL_MIGRATION_REPORT.md
- COMPLETE_MIGRATION_SUMMARY.md
- MIGRATION_COMPLETE_SUMMARY.md
- MIGRATION_STATUS_UPDATE.md
- MIGRATION_SUMMARY.md
- REALISTIC_MIGRATION_STATUS.md
- PARALLEL_MIGRATION_PLAN.md

**Session/Progress Files** → `docs/archive/session-notes/`
- ACTUAL_FINAL_STATUS.md
- ALL_ERRORS_FIXED.md
- ALMOST_DONE.md
- FINAL_COMPLETE_SUMMARY.md
- FINAL_SESSION_SUMMARY.md
- FINAL_STATUS_REPORT.md
- FINAL_SUMMARY.md
- FINAL_WORK_SUMMARY.md
- ULTIMATE_FINAL_SUMMARY.md
- DEVELOPER_2_FINAL_SUMMARY.md
- DEVELOPER_2_PROGRESS.md
- DEVELOPER_3_FINAL_CHECKLIST.md
- DEVELOPER_3_PROGRESS.md
- OCTOBER_23_2025_WORK_SUMMARY.md
- OCTOBER_24_2025_WORK_SUMMARY.md
- OCTOBER_31_2025_PHASE_4_SUMMARY.md
- PROGRESS_UPDATE.md
- SESSION_COMPLETE.md

**Feature-Specific Files** → `docs/migration/PHASES.md` or `docs/features/`
- CALENDAR_SCREEN_MIGRATION_COMPLETE.md
- SETTINGS_SCREEN_MIGRATION_COMPLETE.md
- NOTIFICATION_CUBIT_COMPLETE.md
- LOCALIZATION_COMPLETE.md
- LOCALIZATION_MIGRATION_STATUS.md
- LOCALIZATION_PHASE1_SUMMARY.md
- INTEGRATION_SUCCESS.md
- ONE_SCREEN_LEFT.md

**Implementation Plans** → `docs/migration/` or `docs/archive/`
- INTEGRATION_WORK_PLAN.md
- IMPLEMENTATION_SUMMARY.md
- HOW_TO_COMPLETE_LOCALIZATION.md
- IMMEDIATE_FIXES_NEEDED.md

**Status/Assessment Files** → `docs/migration/STATUS.md`
- CURRENT_STATUS_HONEST.md
- GOOD_NEWS_CUBITS_EXIST.md
- WHY_SCREENS_STATUS.md
- SUCCESS_CRITERIA_EXPLAINED.md

**Repository Organization** → Keep or consolidate
- REPOSITORY_ORGANIZATION.md (keep, it's useful)
- REPOSITORY_AUDIT_RECOMMENDATIONS.md → merge into STATUS.md
- REPOSITORY_READY_FOR_HANDOFF.md → merge into STATUS.md
- CLEANUP_SUMMARY.md → archive after this cleanup

**Notification/Architecture** → `docs/architecture/`
- NOTIFICATION_ACTIVITY_READINESS_ASSESSMENT.md
- NOTIFICATION_ARCHITECTURE.md

**AI Agent Files** → `.kiro/steering/`
- GEMINI.md
- QWEN.md
- TEAM_KICKOFF.md
- QUICK_START_NEXT_SESSION.md

**Misc Files** → Evaluate individually
- Cursor.mcd → .cursor/ or delete
- save_logo.txt → archive/ or delete
- WARP.md → delete (empty folder)

### 2. Code Organization System

**Purpose:** Clear separation between migrated and legacy code.

**Strategy:**

#### Legacy Code Identification
```
lib/logic/providers/          → Mark as DEPRECATED, plan for removal
lib/ui/screens/              → Document BLoC integration needs
```

#### Migration Tracking
Create `lib/logic/providers/README.md`:
```markdown
# Legacy Riverpod Providers (DEPRECATED)

⚠️ These providers are being phased out in favor of BLoC/Cubit.

## Migration Status
- [ ] apple_calendar_provider.dart → features/external_calendar/
- [ ] calendar_providers.dart → features/calendar/
- [ ] contact_providers.dart → features/contacts/
- [x] auth (migrated to presentation/cubit/auth/)
...

See: docs/migration/STATUS.md for details
```

#### Archive Organization
```
archive/
├── old_providers/           # Removed Riverpod providers
│   └── [timestamp]/        # Organized by removal date
├── old_ui/                  # Deprecated UI components
├── docs/                    # Old documentation
│   ├── session-notes/      # Progress reports
│   └── outdated/           # Superseded docs
└── README.md               # Archive index
```

### 3. Dependency Management System

**Purpose:** Clean pubspec.yaml of unused packages.

**Packages to Remove:**

```yaml
# REMOVE - Riverpod (after migration complete)
flutter_riverpod: ^3.0.3
riverpod: ^3.0.3
hooks_riverpod: ^3.0.3
riverpod_annotation: ^3.0.3
riverpod_generator: ^3.0.3  # if present

# EVALUATE - Supabase (after Firebase migration)
# Document which features still use these
# supabase_flutter: ...
# supabase: ...
```

**Packages to Keep:**
```yaml
# State Management (NEW)
flutter_bloc: ^9.1.1
get_it: ^7.6.0
dartz: ^0.10.1

# Firebase (NEW)
firebase_core: ^4.2.0
firebase_auth: ^6.1.1
cloud_firestore: ^6.0.3
# ... other Firebase packages
```

**Version Constraint Fixes:**
```yaml
# Current constraints causing issues
test: 1.26.2  # Flutter SDK test_api pin prevents 1.26.3
mockito: 5.5.0  # Analyzer constraints prevent 5.5.1
build_runner: 2.7.1  # build_runner >=2.9.0 conflicts with mockito 5.5.0
```

### 4. Test Organization System

**Purpose:** Mirror lib/ structure and consolidate test utilities.

**Structure:**
```
test/
├── core/                    # Tests for lib/core/
│   ├── di/
│   ├── error/
│   └── utils/
├── features/                # Tests for lib/features/
│   ├── calendar/
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   └── contacts/
│       └── ...
├── helpers/                 # Shared test utilities
│   ├── mock_data.dart
│   ├── test_helpers.dart
│   └── firebase_mocks.dart
├── goldens/                 # Golden test files
│   ├── calendar/
│   └── contacts/
└── integration/             # Integration tests
```

**Files to Archive:**
```
archive/test/
├── old_riverpod_tests/     # Tests using Riverpod patterns
└── outdated_goldens/       # Old golden files
```

### 5. Configuration Consolidation System

**Purpose:** Minimize configuration file clutter.

**IDE Configurations:**

Evaluate necessity:
```
.idea/          → Keep (IntelliJ/Android Studio)
.vscode/        → Keep if exists (VS Code)
.cursor/        → Evaluate (Cursor IDE specific)
.claude/        → Evaluate (Claude AI specific)
.gemini/        → Evaluate (Gemini AI specific)
```

**Decision Matrix:**
- Keep if actively used by team
- Document purpose in README
- Consider .gitignore for personal configs

**MCP Configuration:**

Consolidate to single location:
```
.kiro/settings/mcp.json     # Primary MCP config
.mcp.json                   # Remove (duplicate)
.cursor/mcp.json            # Remove (duplicate)
```

**Environment Files:**
```
.env                        # Gitignored, local only
.env.example                # Keep, comprehensive template
```

### 6. Agent Resources System

**Purpose:** Single source of truth for AI agent guidance.

**Consolidation Plan:**

```
.kiro/steering/
├── flutter-rules.md        # Consolidated from multiple sources
├── architecture.md         # MyOrbit_CleanArch patterns
├── migration-guide.md      # Migration context
└── project-context.md      # Project-specific guidance
```

**Sources to Consolidate:**
```
.factory/Resources_For_Agents/rules_for_dart_and_flutter.md
Resources_For_Agents/rules_for_dart_and_flutter.md
.cursor/rules/flutteranddartrules.mdc
GEMINI.md
QWEN.md
```

**Agent Workforce Files:**
```
.factory/droids/            # Evaluate if still needed
                           # If not, archive with documentation
```

## Data Models

### File Tracking Model

```dart
class FileAction {
  final String sourcePath;
  final String? targetPath;
  final ActionType action;
  final String reason;
  final DateTime timestamp;
}

enum ActionType {
  keep,           // No change
  move,           // Move to new location
  consolidate,    // Merge with other files
  archive,        // Move to archive/
  delete,         // Remove completely
}
```

### Cleanup Report Model

```dart
class CleanupReport {
  final int filesProcessed;
  final int filesMoved;
  final int filesDeleted;
  final int filesConsolidated;
  final List<FileAction> actions;
  final List<String> warnings;
  final DateTime completedAt;
}
```

## Error Handling

### Validation Before Changes

1. **Git Status Check**
   - Ensure working directory is clean
   - Create cleanup branch: `git checkout -b cleanup/repository-organization`

2. **Backup Creation**
   - Create backup of root-level markdown files
   - Document current state in `CLEANUP_BACKUP_[timestamp].md`

3. **Dependency Validation**
   - Run `flutter pub get` before changes
   - Verify no compilation errors: `flutter analyze`
   - Run tests: `flutter test` (document current failures)

### Rollback Strategy

1. **Git-based Rollback**
   - All changes in single branch
   - Can revert entire cleanup: `git checkout main`

2. **Incremental Commits**
   - Commit after each phase
   - Can cherry-pick or revert specific phases

3. **Archive Preservation**
   - Never delete, always archive
   - Can restore from archive/ if needed

### Error Scenarios

| Error | Detection | Resolution |
|-------|-----------|------------|
| Broken imports | `flutter analyze` | Restore moved files, update imports |
| Missing documentation | Manual review | Restore from archive/ |
| Test failures | `flutter test` | Document if pre-existing, fix if new |
| Build failures | `flutter build` | Restore dependencies, check configs |

## Testing Strategy

### Pre-Cleanup Validation

1. **Baseline Metrics**
   ```bash
   # Document current state
   flutter analyze > pre_cleanup_analysis.txt
   flutter test > pre_cleanup_tests.txt
   find . -name "*.md" | wc -l > pre_cleanup_doc_count.txt
   ```

2. **Dependency Check**
   ```bash
   flutter pub get
   flutter pub outdated
   ```

### Post-Cleanup Validation

1. **Compilation Check**
   ```bash
   flutter clean
   flutter pub get
   flutter analyze
   # Should have same or fewer errors than baseline
   ```

2. **Test Execution**
   ```bash
   flutter test
   # Document any new failures
   ```

3. **Build Verification**
   ```bash
   flutter build apk --debug
   flutter build ios --debug --no-codesign
   # Verify builds succeed
   ```

4. **Documentation Verification**
   - Verify all links in README.md work
   - Check docs/README.md navigation
   - Ensure MYORBIT_CLEANARCH_PATTERNS.md is accessible

### Manual Testing

1. **Developer Experience**
   - Clone repo fresh
   - Follow DEVELOPER_QUICKSTART.md
   - Verify all referenced files exist

2. **Documentation Navigation**
   - Start from README.md
   - Follow all documentation links
   - Verify no broken references

3. **IDE Integration**
   - Open in IDE
   - Verify configurations load
   - Check no errors in IDE

## Implementation Phases

### Phase 1: Documentation Consolidation (2-3 hours)

**Goal:** Reduce root-level markdown files from 50+ to ~5

**Steps:**
1. Create `docs/migration/STATUS.md` consolidating all migration status
2. Create `docs/archive/session-notes/` for progress reports
3. Move files according to consolidation plan
4. Update README.md with new structure
5. Create `docs/README.md` navigation guide
6. Commit: "docs: consolidate root-level documentation"

**Validation:**
- Root has ≤10 markdown files
- All moved files accessible via docs/README.md
- No broken links in README.md

### Phase 2: Code Organization (1-2 hours)

**Goal:** Clear separation of legacy and migrated code

**Steps:**
1. Create `lib/logic/providers/README.md` marking as deprecated
2. Document which providers are migrated
3. Create archive structure
4. Update lib/README.md if needed
5. Commit: "refactor: document legacy code separation"

**Validation:**
- `flutter analyze` shows no new errors
- Legacy code clearly marked
- Migration status documented

### Phase 3: Dependency Cleanup (1 hour)

**Goal:** Remove unused packages

**Steps:**
1. Document current dependencies
2. Remove Riverpod packages (if migration complete)
3. Update pubspec.yaml comments
4. Run `flutter pub get`
5. Run `flutter analyze`
6. Commit: "deps: remove unused Riverpod packages"

**Validation:**
- `flutter pub get` succeeds
- `flutter analyze` shows no new errors
- Build succeeds

### Phase 4: Test Organization (1-2 hours)

**Goal:** Mirror lib/ structure in test/

**Steps:**
1. Create test/helpers/ directory
2. Move shared test utilities
3. Organize golden files
4. Archive old test files
5. Update test documentation
6. Commit: "test: reorganize test directory structure"

**Validation:**
- `flutter test` runs (document failures)
- Test structure mirrors lib/
- Test utilities consolidated

### Phase 5: Configuration Cleanup (1 hour)

**Goal:** Consolidate configuration files

**Steps:**
1. Evaluate IDE configurations
2. Consolidate MCP configs to .kiro/settings/mcp.json
3. Update .gitignore if needed
4. Document configuration in README
5. Commit: "config: consolidate configuration files"

**Validation:**
- No duplicate configs
- IDE still works
- MCP configuration valid

### Phase 6: Agent Resources (1 hour)

**Goal:** Single source for AI guidance

**Steps:**
1. Create .kiro/steering/ files
2. Consolidate agent rules
3. Archive redundant files
4. Update agent documentation
5. Commit: "docs: consolidate agent resources"

**Validation:**
- Single flutter-rules.md exists
- Agent guidance accessible
- No duplicate rules

### Phase 7: Final Verification (1 hour)

**Goal:** Ensure nothing is broken

**Steps:**
1. Run full test suite
2. Build for all platforms
3. Review all documentation links
4. Create cleanup summary
5. Update CHANGELOG.md
6. Commit: "docs: cleanup summary and verification"

**Validation:**
- All tests pass (or document pre-existing failures)
- Builds succeed
- Documentation complete
- No broken links

## Success Criteria

### Quantitative Metrics

- Root-level markdown files: 50+ → ≤10 (80% reduction)
- Documentation organization: 100% in docs/ subdirectories
- Legacy code: 100% marked as deprecated
- Test structure: 100% mirrors lib/ structure
- Configuration files: Consolidated to single locations
- Agent resources: Single source of truth

### Qualitative Metrics

- New developer onboarding time reduced
- Documentation easier to navigate
- Clear separation of concerns
- No broken builds or tests
- Improved IDE performance (fewer files to index)

### Rollback Criteria

Rollback if:
- Build failures introduced
- More than 5 new test failures
- Critical documentation lost
- Team cannot find essential files
- IDE configurations broken

## Future Considerations

### Post-Cleanup Tasks

1. **Riverpod Removal** (after UI migration)
   - Remove all Riverpod packages
   - Archive lib/logic/providers/
   - Update all documentation

2. **Supabase Removal** (after Firebase migration)
   - Remove Supabase packages
   - Archive supabase/ directory
   - Update environment files

3. **Test Updates** (ongoing)
   - Update tests for Either pattern
   - Improve test coverage
   - Add integration tests

4. **Documentation Maintenance**
   - Regular review of docs/
   - Archive outdated content
   - Keep CHANGELOG.md updated

### Monitoring

- Monthly review of root directory
- Quarterly documentation audit
- Track new file additions
- Prevent documentation sprawl
