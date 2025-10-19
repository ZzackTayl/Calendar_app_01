import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'sync_status_provider.g.dart';

enum SyncStatus {
  syncing,
  synced,
  error,
  offline,
}

@riverpod
class SyncStatusNotifier extends _$SyncStatusNotifier {
  @override
  SyncStatus build() {
    return SyncStatus.synced;
  }

  void setSyncing() => state = SyncStatus.syncing;
  void setSynced() => state = SyncStatus.synced;
  void setError() => state = SyncStatus.error;
  void setOffline() => state = SyncStatus.offline;
}

/// Get display text for sync status
@riverpod
String syncStatusText(Ref ref) {
  final status = ref.watch(syncStatusProvider);

  return switch (status) {
    SyncStatus.syncing => 'Syncing...',
    SyncStatus.synced => 'Synced',
    SyncStatus.error => 'Sync error',
    SyncStatus.offline => 'Offline',
  };
}

/// Get icon name for sync status
@riverpod
String syncStatusIcon(Ref ref) {
  final status = ref.watch(syncStatusProvider);

  return switch (status) {
    SyncStatus.syncing => 'sync',
    SyncStatus.synced => 'check_circle',
    SyncStatus.error => 'error',
    SyncStatus.offline => 'cloud_off',
  };
}
