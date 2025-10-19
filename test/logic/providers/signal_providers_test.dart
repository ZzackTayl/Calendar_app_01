import 'package:flutter_test/flutter_test.dart';
import 'package:riverpod/riverpod.dart';

import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/core/supabase_client.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/domain/signal_share.dart';
import 'package:myorbit_calendar/logic/providers/signal_providers.dart';
import 'package:myorbit_calendar/logic/services/api_service.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';

void main() {
  setUp(() {
    SupabaseService.debugOverrideAuthState(isConfigured: true, isAuthenticated: true);
  });

  tearDown(() {
    SignalApi.debugResetOverrides();
    SupabaseService.debugResetAuthOverride();
  });

  test('signalSharesProvider uses remote shares when Supabase is available', () async {
    final now = DateTime.now();
    final remoteShares = [
      SignalShare(
        id: 'share-1',
        signalId: 'signal-1',
        sharedWithUserId: DevDataService.partner1Id,
        sharedByUserId: DevDataService.currentUserId,
        createdAt: now,
        notify: false,
        autoAccept: true,
      ),
    ];

    SignalApi.debugOverride(
      getSignalShares: () async => Success(remoteShares),
    );

    final container = ProviderContainer();
    addTearDown(container.dispose);

    final shares = await container.read(signalSharesProvider.future);

    expect(shares, equals(remoteShares));
    expect(shares.first.notify, isFalse);
    expect(shares.first.autoAccept, isTrue);
  });

  test('signalsSharedWithMeProvider merges remote signals for the viewer', () async {
    final now = DateTime.now();
    final share = SignalShare(
      id: 'share-2',
      signalId: 'signal-visible',
      sharedWithUserId: DevDataService.currentUserId,
      sharedByUserId: DevDataService.partner2Id,
      createdAt: now,
      notify: true,
      autoAccept: false,
    );

    final remoteSignal = AvailabilitySignal(
      id: 'signal-visible',
      userId: DevDataService.partner2Id,
      signalType: SignalType.available,
      startTime: now.subtract(const Duration(hours: 1)),
      endTime: now.add(const Duration(hours: 2)),
      duration: SignalDuration.hours2,
      message: 'Coffee window',
      createdAt: now.subtract(const Duration(hours: 2)),
    );

    SignalApi.debugOverride(
      getSignalShares: () async => Success([share]),
      getSignalsByIds: (ids) async => Success([remoteSignal]),
    );

    final container = ProviderContainer();
    addTearDown(container.dispose);

    final signals = await container.read(signalsSharedWithMeProvider.future);

    expect(signals.length, 1);
    expect(signals.first.id, remoteSignal.id);
    expect(signals.first.message, remoteSignal.message);
  });
}
