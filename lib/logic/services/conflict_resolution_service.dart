import '../../domain/event.dart';
import '../../features/contacts/domain/entities/contact.dart';
import 'dart:developer' as developer;

enum ConflictResolutionStrategy {
  /// Keep the most recently modified version
  lastWriteWins,

  /// Merge non-conflicting fields from both versions
  intelligentMerge,

  /// Always use local version
  preferLocal,

  /// Always use remote version
  preferRemote,
}

class ConflictResolutionService {
  static ConflictResolutionStrategy strategy =
      ConflictResolutionStrategy.lastWriteWins;

  /// Resolve conflict between local and remote event versions
  static CalendarEvent resolveEventConflict({
    required CalendarEvent localVersion,
    required CalendarEvent remoteVersion,
  }) {
    developer.log(
      'Resolving event conflict for: ${localVersion.id}',
      name: 'ConflictResolutionService',
    );

    switch (strategy) {
      case ConflictResolutionStrategy.lastWriteWins:
        return _lastWriteWinsEvent(localVersion, remoteVersion);

      case ConflictResolutionStrategy.intelligentMerge:
        return _intelligentMergeEvent(localVersion, remoteVersion);

      case ConflictResolutionStrategy.preferLocal:
        return localVersion;

      case ConflictResolutionStrategy.preferRemote:
        return remoteVersion;
    }
  }

  /// Resolve conflict between local and remote contact versions
  static Contact resolveContactConflict({
    required Contact localVersion,
    required Contact remoteVersion,
  }) {
    developer.log(
      'Resolving contact conflict for: ${localVersion.id}',
      name: 'ConflictResolutionService',
    );

    switch (strategy) {
      case ConflictResolutionStrategy.lastWriteWins:
        return _lastWriteWinsContact(localVersion, remoteVersion);

      case ConflictResolutionStrategy.intelligentMerge:
        return _intelligentMergeContact(localVersion, remoteVersion);

      case ConflictResolutionStrategy.preferLocal:
        return localVersion;

      case ConflictResolutionStrategy.preferRemote:
        return remoteVersion;
    }
  }

  /// Last-Write-Wins: Keep whichever event was modified most recently
  static CalendarEvent _lastWriteWinsEvent(
    CalendarEvent local,
    CalendarEvent remote,
  ) {
    final localTime = local.updatedAt ?? local.createdAt ?? local.start;
    final remoteTime = remote.updatedAt ?? remote.createdAt ?? remote.start;

    if (localTime.isAfter(remoteTime)) {
      developer.log('Local event wins', name: 'ConflictResolutionService');
      return local;
    } else {
      developer.log('Remote event wins', name: 'ConflictResolutionService');
      return remote;
    }
  }

  /// Last-Write-Wins: Keep whichever contact was modified most recently
  static Contact _lastWriteWinsContact(
    Contact local,
    Contact remote,
  ) {
    final localTime = local.updatedAt ??
        local.createdAt ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final remoteTime = remote.updatedAt ??
        remote.createdAt ??
        DateTime.fromMillisecondsSinceEpoch(0);

    if (localTime.isAfter(remoteTime)) {
      developer.log('Local contact wins', name: 'ConflictResolutionService');
      return local;
    } else {
      developer.log('Remote contact wins', name: 'ConflictResolutionService');
      return remote;
    }
  }

  /// Intelligent Merge: Take non-conflicting changes from both versions
  /// This is more sophisticated - if user A changed title and user B changed time,
  /// keep both changes instead of choosing one version
  static CalendarEvent _intelligentMergeEvent(
    CalendarEvent local,
    CalendarEvent remote,
  ) {
    developer.log(
      'Merging event versions intelligently',
      name: 'ConflictResolutionService',
    );
    // Choose base by latest update
    final localTime = local.updatedAt ?? local.createdAt ?? local.start;
    final remoteTime = remote.updatedAt ?? remote.createdAt ?? remote.start;
    final base = localTime.isAfter(remoteTime) ? local : remote;
    final other = identical(base, local) ? remote : local;

    // Merge simple, non-conflicting fields
    var merged = base;

    // If titles differ but times did not change on base vs other, prefer base title
    // (no-op since base retains its title). If description missing on base but present on other, take it.
    if ((merged.description == null || merged.description!.isEmpty) &&
        (other.description != null && other.description!.isNotEmpty)) {
      merged = merged.copyWith(description: other.description);
    }

    // If floating flags differ, keep the one whose time semantics match: compare wall-clock times
    if (merged.isFloating != other.isFloating) {
      // Prefer floating semantics whenever either side indicates the event should float.
      merged =
          merged.copyWith(isFloating: merged.isFloating || other.isFloating);
    }

    // If only time changed in other and title/description same, take other's times
    final sameTitle = (merged.title == other.title);
    final sameDesc = (merged.description ?? '') == (other.description ?? '');
    final timesDiffer = merged.start != other.start || merged.end != other.end;
    if (timesDiffer && sameTitle && sameDesc) {
      merged = merged.copyWith(start: other.start, end: other.end);
    }

    return merged;
  }

  /// Intelligent Merge for contacts
  static Contact _intelligentMergeContact(
    Contact local,
    Contact remote,
  ) {
    developer.log(
      'Merging contact versions intelligently',
      name: 'ConflictResolutionService',
    );

    final localTime = local.updatedAt ??
        local.createdAt ??
        DateTime.fromMillisecondsSinceEpoch(0);
    final remoteTime = remote.updatedAt ??
        remote.createdAt ??
        DateTime.fromMillisecondsSinceEpoch(0);

    return localTime.isAfter(remoteTime) ? local : remote;
  }

  /// Check if two events are in conflict (differ in important fields)
  static bool eventsInConflict(CalendarEvent a, CalendarEvent b) {
    // First check if they are both floating or both fixed
    if (a.isFloating != b.isFloating) {
      // Different event types (one floating, one fixed) are always in conflict
      return a.title != b.title ||
          a.description != b.description ||
          a.start != b.start ||
          a.end != b.end ||
          a.privacyLevel != b.privacyLevel ||
          a.isFloating != b.isFloating;
    }

    // Both events are the same type (floating or fixed)
    if (a.isFloating) {
      // For floating events, compare the time components rather than absolute times
      // since they may be in different timezones
      final localTimeA = _convertToTimeComponents(a.start);
      final localTimeB = _convertToTimeComponents(b.start);
      final localEndA = _convertToTimeComponents(a.end);
      final localEndB = _convertToTimeComponents(b.end);

      return a.title != b.title ||
          a.description != b.description ||
          localTimeA != localTimeB ||
          localEndA != localEndB ||
          a.privacyLevel != b.privacyLevel;
    } else {
      // For fixed events, compare absolute times
      return a.title != b.title ||
          a.description != b.description ||
          a.start != b.start ||
          a.end != b.end ||
          a.privacyLevel != b.privacyLevel;
    }
  }

  /// Helper method to convert DateTime to time components for floating event comparison
  static String _convertToTimeComponents(DateTime dateTime) {
    return '${dateTime.hour}:${dateTime.minute}:${dateTime.second}';
  }

  /// Check if two contacts are in conflict
  static bool contactsInConflict(Contact a, Contact b) {
    return a.name != b.name ||
        a.permission != b.permission ||
        a.colorHex != b.colorHex ||
        a.status != b.status;
  }
}
