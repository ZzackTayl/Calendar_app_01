# Repository Cleanup Baseline

**Date:** November 1, 2025  
**Branch:** cleanup/repository-organization  
**Purpose:** Document repository state before cleanup

---

## Baseline Metrics

### Root Directory Files

**Markdown Files:** 58 files in root directory

**Key Statistics:**
- Total root-level markdown files: 58
- Target after cleanup: ≤10 files
- Reduction goal: ~80%

### Root-Level Markdown Files (Before Cleanup)

```
ACTUAL_FINAL_STATUS.md
ALL_ERRORS_FIXED.md
ALMOST_DONE.md
CALENDAR_SCREEN_MIGRATION_COMPLETE.md
CLEANUP_SUMMARY.md
COMPLETE_MIGRATION_SUMMARY.md
CURRENT_STATUS_HONEST.md
DEVELOPER_2_FINAL_SUMMARY.md
DEVELOPER_2_PROGRESS.md
DEVELOPER_3_FINAL_CHECKLIST.md
DEVELOPER_3_PROGRESS.md
DEVELOPER_QUICKSTART.md
FINAL_COMPLETE_SUMMARY.md
FINAL_MIGRATION_REPORT.md
FINAL_MIGRATION_STATUS.md
FINAL_SESSION_SUMMARY.md
FINAL_STATUS_REPORT.md
FINAL_SUMMARY.md
FINAL_WORK_SUMMARY.md
GEMINI.md
GOOD_NEWS_CUBITS_EXIST.md
HOW_TO_COMPLETE_LOCALIZATION.md
IMMEDIATE_FIXES_NEEDED.md
IMPLEMENTATION_SUMMARY.md
INTEGRATION_SUCCESS.md
INTEGRATION_WORK_PLAN.md
LOCALIZATION_COMPLETE.md
LOCALIZATION_MIGRATION_STATUS.md
LOCALIZATION_PHASE1_SUMMARY.md
MIGRATION_ASSESSMENT_AND_PLAN.md
MIGRATION_COMPLETE.md
MIGRATION_COMPLETE_SUMMARY.md
MIGRATION_README.md
MIGRATION_STATUS_UPDATE.md
MIGRATION_SUMMARY.md
MYORBIT_CLEANARCH_PATTERNS.md
NOTIFICATION_ACTIVITY_READINESS_ASSESSMENT.md
NOTIFICATION_ARCHITECTURE.md
NOTIFICATION_CUBIT_COMPLETE.md
OCTOBER_23_2025_WORK_SUMMARY.md
OCTOBER_24_2025_WORK_SUMMARY.md
OCTOBER_31_2025_PHASE_4_SUMMARY.md
ONE_SCREEN_LEFT.md
PARALLEL_MIGRATION_PLAN.md
PROGRESS_UPDATE.md
QWEN.md
QUICK_START_NEXT_SESSION.md
README.md
REALISTIC_MIGRATION_STATUS.md
REPOSITORY_AUDIT_RECOMMENDATIONS.md
REPOSITORY_ORGANIZATION.md
REPOSITORY_READY_FOR_HANDOFF.md
SESSION_COMPLETE.md
SETTINGS_SCREEN_MIGRATION_COMPLETE.md
SUCCESS_CRITERIA_EXPLAINED.md
TEAM_KICKOFF.md
ULTIMATE_FINAL_SUMMARY.md
WARP.md
WHY_SCREENS_STATUS.md
```

### Files to Keep in Root (Target: ~10)

1. README.md - Primary entry point
2. DEVELOPER_QUICKSTART.md - Quick start guide
3. MYORBIT_CLEANARCH_PATTERNS.md - Architecture patterns
4. REPOSITORY_ORGANIZATION.md - Repository structure guide
5. CHANGELOG.md - Version history (to be created)
6. CONTRIBUTING.md - Contribution guidelines (to be created)
7. LICENSE - License file (if exists)

### Directories

**Documentation:**
- docs/ - Existing documentation directory
- REFERENCE_FROM_CLEANARCH/ - Reference material (read-only)

**Code:**
- lib/ - Application code
- test/ - Test files

**Configuration:**
- .kiro/ - Kiro IDE configuration
- .cursor/ - Cursor IDE configuration
- .idea/ - IntelliJ/Android Studio configuration
- .github/ - GitHub workflows

**Archive:**
- archive/ - Historical code and documentation

---

## Cleanup Plan Summary

### Phase 1: Documentation Consolidation
- Consolidate migration status files → docs/migration/STATUS.md
- Archive session reports → docs/archive/session-notes/
- Organize feature docs → docs/migration/PHASES.md
- Move architecture docs → docs/architecture/
- Consolidate AI agent files → .kiro/steering/

### Phase 2: Code Organization
- Mark legacy Riverpod providers as DEPRECATED
- Document UI screens needing BLoC integration
- Identify Supabase references for migration

### Phase 3: Dependency Cleanup
- Remove Riverpod packages from pubspec.yaml
- Document Supabase package status
- Resolve version constraints

### Phase 4: Test Organization
- Mirror lib/ structure in test/
- Consolidate test helpers
- Archive old Riverpod tests

### Phase 5: Configuration Consolidation
- Consolidate MCP configs
- Document IDE configurations
- Verify environment files

### Phase 6: Agent Resources
- Consolidate Flutter rules → .kiro/steering/
- Single source for AI guidance

### Phase 7: Final Verification
- Run full validation suite
- Verify documentation links
- Create cleanup summary

---

## Success Criteria

- Root markdown files: 58 → ≤10 (83% reduction)
- All documentation organized in docs/ subdirectories
- Legacy code clearly marked
- No broken builds or new test failures
- All documentation links working

---

## Rollback Plan

- All changes in cleanup/repository-organization branch
- Can revert with: `git checkout main`
- Incremental commits allow selective rollback
- Archive preserves all content (nothing deleted)

---

**Baseline documented. Ready to begin cleanup.**
