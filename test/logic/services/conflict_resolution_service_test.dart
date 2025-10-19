import 'package:test/test.dart';
import 'package:myorbit_calendar/logic/services/conflict_resolution_service.dart';
import 'package:myorbit_calendar/domain/event.dart';

void main() {
  group('ConflictResolutionService.intelligentMerge', () {
    CalendarEvent buildEvent({
      required String id,
      required DateTime start,
      required DateTime end,
      String title = 'T',
      String ownerId = 'u1',
      String? description,
      bool isFloating = false,
      DateTime? createdAt,
      DateTime? updatedAt,
    }) {
      return CalendarEvent(
        id: id,
        title: title,
        description: description,
        start: start,
        end: end,
        ownerId: ownerId,
        isFloating: isFloating,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
    }

    setUp(() {
      ConflictResolutionService.strategy =
          ConflictResolutionStrategy.intelligentMerge;
    });

    test('adopts time-only changes when title/description unchanged', () {
      final base = buildEvent(
        id: 'e1',
        start: DateTime(2025, 1, 1, 9),
        end: DateTime(2025, 1, 1, 10),
        description: 'desc',
        updatedAt: DateTime(2025, 1, 2),
      );
      final other = buildEvent(
        id: 'e1',
        start: DateTime(2025, 1, 1, 11),
        end: DateTime(2025, 1, 1, 12),
        description: 'desc',
        updatedAt: DateTime(2025, 1, 1),
      );

      final merged = ConflictResolutionService.resolveEventConflict(
        localVersion: base,
        remoteVersion: other,
      );

      expect(merged.start, other.start);
      expect(merged.end, other.end);
      expect(merged.title, base.title);
    });

    test('prefers floating semantics when types differ', () {
      final base = buildEvent(
        id: 'e2',
        start: DateTime(2025, 3, 1, 9),
        end: DateTime(2025, 3, 1, 10),
        isFloating: false,
        updatedAt: DateTime(2025, 3, 2),
      );
      final other = buildEvent(
        id: 'e2',
        start: DateTime(2025, 3, 1, 9),
        end: DateTime(2025, 3, 1, 10),
        isFloating: true,
        updatedAt: DateTime(2025, 3, 1),
      );

      final merged = ConflictResolutionService.resolveEventConflict(
        localVersion: base,
        remoteVersion: other,
      );

      expect(merged.isFloating, isTrue);
    });
  });
}
