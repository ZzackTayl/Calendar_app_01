import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/signal_share.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/logic/services/signals_service.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';

void main() {
  group('SignalsService - createSignal', () {
    const String userId = 'user-123';

    test('Creates signal with 1 hour duration', () {
      final signal = SignalsService.createSignal(
        userId,
        SignalType.available,
        SignalDuration.hour,
        'Available for 1 hour',
      );

      expect(signal.userId, userId);
      expect(signal.signalType, SignalType.available);
      expect(signal.duration, SignalDuration.hour);
      expect(signal.message, 'Available for 1 hour');
      expect(signal.id.isNotEmpty, true);

      final duration = signal.endTime.difference(signal.startTime);
      expect(duration.inHours, 1);
    });

    test('Creates signal with 2 hours duration', () {
      final signal = SignalsService.createSignal(
        userId,
        SignalType.flexible,
        SignalDuration.hours2,
        null,
      );

      final duration = signal.endTime.difference(signal.startTime);
      expect(duration.inHours, 2);
    });

    test('Creates signal with 4 hours duration', () {
      final signal = SignalsService.createSignal(
        userId,
        SignalType.busy,
        SignalDuration.hours4,
        'Busy for 4 hours',
      );

      final duration = signal.endTime.difference(signal.startTime);
      expect(duration.inHours, 4);
    });

    test('Creates signal with day duration', () {
      final signal = SignalsService.createSignal(
        userId,
        SignalType.unavailable,
        SignalDuration.day,
        'Out of office',
      );

      final duration = signal.endTime.difference(signal.startTime);
      expect(duration.inHours, 24);
    });

    test('Creates signal with custom duration', () {
      final customEnd =
          DateTime.now().add(const Duration(hours: 3, minutes: 30));

      final signal = SignalsService.createSignal(
        userId,
        SignalType.available,
        SignalDuration.custom,
        'Custom availability',
        customEndTime: customEnd,
      );

      expect(signal.duration, SignalDuration.custom);
      expect(signal.endTime, customEnd);
    });

    test('Throws error for custom duration without customEndTime', () {
      expect(
        () => SignalsService.createSignal(
          userId,
          SignalType.available,
          SignalDuration.custom,
          null,
        ),
        throwsArgumentError,
      );
    });

    test('Throws error for custom duration with past customEndTime', () {
      final pastTime = DateTime.now().subtract(const Duration(hours: 1));

      expect(
        () => SignalsService.createSignal(
          userId,
          SignalType.available,
          SignalDuration.custom,
          null,
          customEndTime: pastTime,
        ),
        throwsArgumentError,
      );
    });

    test('Throws error for empty userId', () {
      expect(
        () => SignalsService.createSignal(
          '',
          SignalType.available,
          SignalDuration.hour,
          null,
        ),
        throwsArgumentError,
      );
    });

    test('Signal has valid timestamps', () {
      final beforeCreate = DateTime.now();
      final signal = SignalsService.createSignal(
        userId,
        SignalType.available,
        SignalDuration.hour,
        null,
      );
      final afterCreate = DateTime.now();

      expect(
          signal.startTime
              .isAfter(beforeCreate.subtract(const Duration(seconds: 1))),
          true);
      expect(
          signal.startTime
              .isBefore(afterCreate.add(const Duration(seconds: 1))),
          true);
      expect(
          signal.createdAt
              .isAfter(beforeCreate.subtract(const Duration(seconds: 1))),
          true);
      expect(
          signal.createdAt
              .isBefore(afterCreate.add(const Duration(seconds: 1))),
          true);
    });
  });

  group('SignalsService - updateSignal', () {
    late AvailabilitySignal originalSignal;

    setUp(() {
      originalSignal = SignalsService.createSignal(
        'user-123',
        SignalType.available,
        SignalDuration.hour,
        'Original message',
      );
    });

    test('Updates signal type', () {
      final updated = SignalsService.updateSignal(
        originalSignal,
        type: SignalType.busy,
      );

      expect(updated.signalType, SignalType.busy);
      expect(updated.message, originalSignal.message);
    });

    test('Updates signal message', () {
      final updated = SignalsService.updateSignal(
        originalSignal,
        message: 'Updated message',
      );

      expect(updated.message, 'Updated message');
      expect(updated.signalType, originalSignal.signalType);
    });

    test('Updates both type and message', () {
      final updated = SignalsService.updateSignal(
        originalSignal,
        type: SignalType.flexible,
        message: 'New flexible status',
      );

      expect(updated.signalType, SignalType.flexible);
      expect(updated.message, 'New flexible status');
    });

    test('Preserves timing information', () {
      final updated = SignalsService.updateSignal(
        originalSignal,
        type: SignalType.busy,
      );

      expect(updated.startTime, originalSignal.startTime);
      expect(updated.endTime, originalSignal.endTime);
      expect(updated.duration, originalSignal.duration);
    });
  });

  group('SignalsService - cancelSignal', () {
    test('Sets end time to now', () {
      final signal = SignalsService.createSignal(
        'user-123',
        SignalType.available,
        SignalDuration.hours4,
        null,
      );

      final beforeCancel = DateTime.now();
      final cancelled = SignalsService.cancelSignal(signal);
      final afterCancel = DateTime.now();

      expect(
          cancelled.endTime
              .isAfter(beforeCancel.subtract(const Duration(seconds: 1))),
          true);
      expect(
          cancelled.endTime
              .isBefore(afterCancel.add(const Duration(seconds: 1))),
          true);
    });

    test('Cancelled signal is no longer active', () {
      final signal = SignalsService.createSignal(
        'user-123',
        SignalType.available,
        SignalDuration.hours4,
        null,
      );

      expect(SignalsService.isSignalActive(signal), true);

      final cancelled = SignalsService.cancelSignal(signal);
      expect(SignalsService.isSignalActive(cancelled), false);
    });
  });

  group('SignalsService - isSignalActive', () {
    test('Signal starting now and ending in future is active', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'test-1',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now.subtract(const Duration(minutes: 1)),
        endTime: now.add(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isSignalActive(signal), true);
    });

    test('Signal that has expired is not active', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'test-1',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now.subtract(const Duration(hours: 2)),
        endTime: now.subtract(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now.subtract(const Duration(hours: 2)),
      );

      expect(SignalsService.isSignalActive(signal), false);
    });

    test('Signal that starts in future is not active yet', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'test-1',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now.add(const Duration(hours: 1)),
        endTime: now.add(const Duration(hours: 2)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isSignalActive(signal), false);
    });
  });

  group('SignalsService - getActiveSignals', () {
    test('Returns only active signals for user', () {
      final signals = DevDataService.getMockSignals();
      const userId = DevDataService.currentUserId;

      final activeSignals = SignalsService.getActiveSignals(userId, signals);

      // May be empty if no active signals for current user at this moment
      expect(activeSignals.every((s) => s.userId == userId), true);
      expect(
          activeSignals.every((s) => SignalsService.isSignalActive(s)), true);
    });

    test('Returns empty list for user with no signals', () {
      final signals = DevDataService.getMockSignals();
      const userId = 'non-existent-user';

      final activeSignals = SignalsService.getActiveSignals(userId, signals);

      expect(activeSignals, isEmpty);
    });

    test('Returns empty list for empty userId', () {
      final signals = DevDataService.getMockSignals();

      final activeSignals = SignalsService.getActiveSignals('', signals);

      expect(activeSignals, isEmpty);
    });

    test('Returns empty list for empty signals list', () {
      final activeSignals = SignalsService.getActiveSignals('user-123', []);

      expect(activeSignals, isEmpty);
    });
  });

  group('SignalsService - Signal Sharing', () {
    const String signalId = 'signal-123';
    const String sharedWithUserId = 'user-456';
    const String sharedByUserId = 'user-789';

    test('shareSignalWithUser creates valid share', () {
      final share = SignalsService.shareSignalWithUser(
        signalId,
        sharedWithUserId,
        sharedByUserId,
      );

      expect(share.signalId, signalId);
      expect(share.sharedWithUserId, sharedWithUserId);
      expect(share.sharedByUserId, sharedByUserId);
      expect(share.id.isNotEmpty, true);
    });

    test('shareSignalWithUser throws for empty signalId', () {
      expect(
        () => SignalsService.shareSignalWithUser(
            '', sharedWithUserId, sharedByUserId),
        throwsArgumentError,
      );
    });

    test('shareSignalWithUser throws for empty sharedWithUserId', () {
      expect(
        () => SignalsService.shareSignalWithUser(signalId, '', sharedByUserId),
        throwsArgumentError,
      );
    });

    test('shareSignalWithUser throws for empty sharedByUserId', () {
      expect(
        () =>
            SignalsService.shareSignalWithUser(signalId, sharedWithUserId, ''),
        throwsArgumentError,
      );
    });

    test('shareSignalWithPartners creates multiple shares', () {
      final partnerIds = ['partner-1', 'partner-2', 'partner-3'];

      final shares = SignalsService.shareSignalWithPartners(
        signalId,
        partnerIds,
        sharedByUserId,
      );

      expect(shares.length, 3);
      expect(shares.every((s) => s.signalId == signalId), true);
      expect(shares.every((s) => s.sharedByUserId == sharedByUserId), true);
      expect(shares[0].sharedWithUserId, 'partner-1');
      expect(shares[1].sharedWithUserId, 'partner-2');
      expect(shares[2].sharedWithUserId, 'partner-3');
    });

    test('shareSignalWithPartners returns empty for empty inputs', () {
      expect(
        SignalsService.shareSignalWithPartners('', ['p1'], sharedByUserId),
        isEmpty,
      );
      expect(
        SignalsService.shareSignalWithPartners(signalId, [], sharedByUserId),
        isEmpty,
      );
      expect(
        SignalsService.shareSignalWithPartners(signalId, ['p1'], ''),
        isEmpty,
      );
    });
  });

  group('SignalsService - getSignalShares', () {
    test('Returns shares for specific signal', () {
      final allShares = DevDataService.getMockSignalShares();
      const signalId = 'signal-1';

      final shares = SignalsService.getSignalShares(signalId, allShares);

      expect(shares.isNotEmpty, true);
      expect(shares.every((s) => s.signalId == signalId), true);
    });

    test('Returns empty for non-existent signal', () {
      final allShares = DevDataService.getMockSignalShares();

      final shares = SignalsService.getSignalShares('non-existent', allShares);

      expect(shares, isEmpty);
    });

    test('Returns empty for empty signalId', () {
      final allShares = DevDataService.getMockSignalShares();

      final shares = SignalsService.getSignalShares('', allShares);

      expect(shares, isEmpty);
    });
  });

  group('SignalsService - canUserViewSignal', () {
    late AvailabilitySignal signal;
    late List<SignalShare> shares;
    const String ownerId = 'owner-123';
    const String sharedUserId = 'shared-456';
    const String otherUserId = 'other-789';

    setUp(() {
      signal = SignalsService.createSignal(
        ownerId,
        SignalType.available,
        SignalDuration.hour,
        null,
      );

      shares = [
        SignalsService.shareSignalWithUser(signal.id, sharedUserId, ownerId),
      ];
    });

    test('Owner can always view their own signal', () {
      final canView = SignalsService.canUserViewSignal(signal, ownerId, shares);
      expect(canView, true);
    });

    test('User with share can view signal', () {
      final canView =
          SignalsService.canUserViewSignal(signal, sharedUserId, shares);
      expect(canView, true);
    });

    test('User without share cannot view signal', () {
      final canView =
          SignalsService.canUserViewSignal(signal, otherUserId, shares);
      expect(canView, false);
    });

    test('Empty userId cannot view signal', () {
      final canView = SignalsService.canUserViewSignal(signal, '', shares);
      expect(canView, false);
    });
  });

  group('SignalsService - getSignalsSharedWithUser', () {
    test('Returns signals shared with user', () {
      final allSignals = DevDataService.getMockSignals();
      final allShares = DevDataService.getMockSignalShares();
      const userId = DevDataService.currentUserId;

      final sharedSignals = SignalsService.getSignalsSharedWithUser(
        userId,
        allSignals,
        allShares,
      );

      expect(sharedSignals.isNotEmpty, true);
      // Should not include user's own signals
      expect(sharedSignals.every((s) => s.userId != userId), true);
    });

    test('Returns empty for user with no shared signals', () {
      final allSignals = DevDataService.getMockSignals();
      final allShares = DevDataService.getMockSignalShares();

      final sharedSignals = SignalsService.getSignalsSharedWithUser(
        'no-shares-user',
        allSignals,
        allShares,
      );

      expect(sharedSignals, isEmpty);
    });

    test('Returns empty for empty userId', () {
      final allSignals = DevDataService.getMockSignals();
      final allShares = DevDataService.getMockSignalShares();

      final sharedSignals = SignalsService.getSignalsSharedWithUser(
        '',
        allSignals,
        allShares,
      );

      expect(sharedSignals, isEmpty);
    });
  });

  group('SignalsService - getActiveSignalsForUser', () {
    test('Returns both owned and shared active signals', () {
      final allSignals = DevDataService.getMockSignals();
      final allShares = DevDataService.getMockSignalShares();
      const userId = DevDataService.currentUserId;

      final activeSignals = SignalsService.getActiveSignalsForUser(
        userId,
        allSignals,
        allShares,
      );

      expect(activeSignals.isNotEmpty, true);
      expect(
          activeSignals.every((s) => SignalsService.isSignalActive(s)), true);
    });

    test('Removes duplicate signals', () {
      final allSignals = DevDataService.getMockSignals();
      final allShares = DevDataService.getMockSignalShares();
      const userId = DevDataService.currentUserId;

      final activeSignals = SignalsService.getActiveSignalsForUser(
        userId,
        allSignals,
        allShares,
      );

      final signalIds = activeSignals.map((s) => s.id).toList();
      final uniqueIds = signalIds.toSet();
      expect(signalIds.length, uniqueIds.length);
    });
  });

  group('SignalsService - getSignalTimeRemaining', () {
    test('Returns duration for active signal', () {
      final signal = SignalsService.createSignal(
        'user-123',
        SignalType.available,
        SignalDuration.hours2,
        null,
      );

      final remaining = SignalsService.getSignalTimeRemaining(signal);

      expect(remaining, isNotNull);
      expect(remaining!.inMinutes, greaterThan(110)); // ~2 hours minus a bit
      expect(remaining.inMinutes, lessThan(130)); // ~2 hours plus a bit
    });

    test('Returns null for expired signal', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'test-1',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now.subtract(const Duration(hours: 2)),
        endTime: now.subtract(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now.subtract(const Duration(hours: 2)),
      );

      final remaining = SignalsService.getSignalTimeRemaining(signal);

      expect(remaining, isNull);
    });

    test('Returns null for future signal', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'test-1',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now.add(const Duration(hours: 1)),
        endTime: now.add(const Duration(hours: 2)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now,
      );

      final remaining = SignalsService.getSignalTimeRemaining(signal);

      expect(remaining, isNull);
    });
  });

  group('SignalsService - UI Helpers', () {
    test('getSignalTypeLabel returns correct labels', () {
      expect(
          SignalsService.getSignalTypeLabel(SignalType.available), 'Available');
      expect(SignalsService.getSignalTypeLabel(SignalType.busy), 'Busy');
      expect(
          SignalsService.getSignalTypeLabel(SignalType.flexible), 'Flexible');
      expect(SignalsService.getSignalTypeLabel(SignalType.unavailable),
          'Unavailable');
    });

    test('getSignalTypeDescription returns non-empty descriptions', () {
      for (final type in SignalType.values) {
        final description = SignalsService.getSignalTypeDescription(type);
        expect(description.isNotEmpty, true);
        expect(description.length, greaterThan(20));
      }
    });

    test('getSignalTypeColor returns valid colors', () {
      for (final type in SignalType.values) {
        final color = SignalsService.getSignalTypeColor(type);
        expect(color.value, isNotNull);
      }
    });

    test('getSignalDurationLabel returns correct labels', () {
      expect(
          SignalsService.getSignalDurationLabel(SignalDuration.hour), '1 hour');
      expect(SignalsService.getSignalDurationLabel(SignalDuration.hours2),
          '2 hours');
      expect(SignalsService.getSignalDurationLabel(SignalDuration.hours4),
          '4 hours');
      expect(
          SignalsService.getSignalDurationLabel(SignalDuration.day), '1 day');
      expect(SignalsService.getSignalDurationLabel(SignalDuration.custom),
          'Custom');
    });

    test('formatSignalTimeRemaining formats correctly', () {
      expect(
        SignalsService.formatSignalTimeRemaining(
            const Duration(hours: 2, minutes: 30)),
        '2h 30m left',
      );
      expect(
        SignalsService.formatSignalTimeRemaining(const Duration(hours: 1)),
        '1h left',
      );
      expect(
        SignalsService.formatSignalTimeRemaining(const Duration(minutes: 45)),
        '45m left',
      );
      expect(
        SignalsService.formatSignalTimeRemaining(const Duration(seconds: 30)),
        '< 1m left',
      );
      expect(
        SignalsService.formatSignalTimeRemaining(const Duration(hours: -1)),
        'Expired',
      );
    });

    test('getAllSignalTypes returns all types', () {
      final types = SignalsService.getAllSignalTypes();
      expect(types.length, 4);
      expect(types.contains(SignalType.available), true);
      expect(types.contains(SignalType.busy), true);
      expect(types.contains(SignalType.flexible), true);
      expect(types.contains(SignalType.unavailable), true);
    });

    test('getAllSignalDurations returns all durations', () {
      final durations = SignalsService.getAllSignalDurations();
      expect(durations.length, 5);
      expect(durations.contains(SignalDuration.hour), true);
      expect(durations.contains(SignalDuration.hours2), true);
      expect(durations.contains(SignalDuration.hours4), true);
      expect(durations.contains(SignalDuration.day), true);
      expect(durations.contains(SignalDuration.custom), true);
    });

    test('getSignalTypeOptions returns complete information', () {
      final options = SignalsService.getSignalTypeOptions();
      expect(options.length, 4);

      for (final type in SignalType.values) {
        expect(options.containsKey(type), true);
        expect(options[type]!['label'], isNotEmpty);
        expect(options[type]!['description'], isNotEmpty);
        expect(options[type]!['color'], isNotNull);
      }
    });

    test('getSignalDurationOptions returns all durations with labels', () {
      final options = SignalsService.getSignalDurationOptions();
      expect(options.length, 5);

      for (final duration in SignalDuration.values) {
        expect(options.containsKey(duration), true);
        expect(options[duration]!.isNotEmpty, true);
      }
    });
  });

  group('SignalsService - isValidSignal', () {
    test('Valid signal passes validation', () {
      final signal = SignalsService.createSignal(
        'user-123',
        SignalType.available,
        SignalDuration.hour,
        'Test message',
      );

      expect(SignalsService.isValidSignal(signal), true);
    });

    test('Signal with empty id fails validation', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: '',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isValidSignal(signal), false);
    });

    test('Signal with empty userId fails validation', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'signal-123',
        userId: '',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isValidSignal(signal), false);
    });

    test('Signal with end before start fails validation', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'signal-123',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.subtract(const Duration(hours: 1)),
        duration: SignalDuration.hour,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isValidSignal(signal), false);
    });

    test('Custom signal with too short duration fails validation', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'signal-123',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(seconds: 30)),
        duration: SignalDuration.custom,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isValidSignal(signal), false);
    });

    test('Custom signal with too long duration fails validation', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'signal-123',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(days: 8)),
        duration: SignalDuration.custom,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isValidSignal(signal), false);
    });

    test('Custom signal with valid duration passes validation', () {
      final now = DateTime.now();
      final signal = AvailabilitySignal(
        id: 'signal-123',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: now,
        endTime: now.add(const Duration(days: 3)),
        duration: SignalDuration.custom,
        message: null,
        createdAt: now,
      );

      expect(SignalsService.isValidSignal(signal), true);
    });
  });

  group('SignalsService - Integration with DevDataService', () {
    test('Works with mock signals', () {
      final signals = DevDataService.getMockSignals();
      expect(signals.isNotEmpty, true);

      for (final signal in signals) {
        expect(signal.id.isNotEmpty, true);
        expect(signal.userId.isNotEmpty, true);
      }
    });

    test('Works with mock signal shares', () {
      final shares = DevDataService.getMockSignalShares();
      expect(shares.isNotEmpty, true);

      for (final share in shares) {
        expect(share.id.isNotEmpty, true);
        expect(share.signalId.isNotEmpty, true);
        expect(share.sharedWithUserId.isNotEmpty, true);
        expect(share.sharedByUserId.isNotEmpty, true);
      }
    });

    test('Mock data has consistent relationships', () {
      final signals = DevDataService.getMockSignals();
      final shares = DevDataService.getMockSignalShares();

      // All shares should reference existing signals
      final signalIds = signals.map((s) => s.id).toSet();
      for (final share in shares) {
        expect(signalIds.contains(share.signalId), true,
            reason:
                'Share ${share.id} references non-existent signal ${share.signalId}');
      }
    });
  });
}
