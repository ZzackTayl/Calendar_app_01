part of 'calendar_migration_cubit.dart';

/// Migration status enum
enum MigrationStatus {
  initial,
  authenticating,
  importing,
  success,
  error,
}

/// State for CalendarMigrationCubit following MyOrbit_CleanArch pattern
class CalendarMigrationState {
  final AppStateStatus status;
  final MigrationStatus migrationStatus;
  final String message;
  final int importedCount;
  final int totalCount;
  final List<CalendarMigrationRecord> migrationHistory;

  const CalendarMigrationState({
    this.status = AppStateStatus.initial,
    this.migrationStatus = MigrationStatus.initial,
    this.message = '',
    this.importedCount = 0,
    this.totalCount = 0,
    this.migrationHistory = const [],
  });

  /// Get import progress percentage (0-100)
  double get progress {
    if (totalCount == 0) {
      return 0;
    }
    return (importedCount / totalCount) * 100;
  }

  /// Check if migration is in progress
  bool get isImporting =>
      migrationStatus == MigrationStatus.importing ||
      migrationStatus == MigrationStatus.authenticating;

  CalendarMigrationState copyWith({
    AppStateStatus? status,
    MigrationStatus? migrationStatus,
    String? message,
    int? importedCount,
    int? totalCount,
    List<CalendarMigrationRecord>? migrationHistory,
  }) {
    return CalendarMigrationState(
      status: status ?? this.status,
      migrationStatus: migrationStatus ?? this.migrationStatus,
      message: message ?? this.message,
      importedCount: importedCount ?? this.importedCount,
      totalCount: totalCount ?? this.totalCount,
      migrationHistory: migrationHistory ?? this.migrationHistory,
    );
  }
}
