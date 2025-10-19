import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/domain/signal_share.dart';
import 'package:myorbit_calendar/logic/providers/signal_providers.dart';
import 'package:myorbit_calendar/ui/screens/signal_center_screen.dart';

import '../helpers/pump_app.dart';

class _MockActiveSignals extends ActiveSignals {
  _MockActiveSignals(this._signals);

  final List<AvailabilitySignal> _signals;

  @override
  Future<List<AvailabilitySignal>> build() async {
    return _signals;
  }
}

class _MockSignalsSharedWithMe extends SignalsSharedWithMe {
  _MockSignalsSharedWithMe(this._signals);

  final List<AvailabilitySignal> _signals;

  @override
  Future<List<AvailabilitySignal>> build() async {
    return _signals;
  }
}

class _MockSignalShares extends SignalShares {
  _MockSignalShares(this._shares);

  final List<SignalShare> _shares;

  @override
  Future<List<SignalShare>> build() async {
    return _shares;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  AvailabilitySignal buildSignal({
    required String id,
    required String userId,
    required DateTime start,
    required DateTime end,
    SignalType type = SignalType.available,
  }) {
    return AvailabilitySignal(
      id: id,
      userId: userId,
      signalType: type,
      startTime: start,
      endTime: end,
      duration: SignalDuration.hours2,
      message: 'Test signal',
      createdAt: start.subtract(const Duration(hours: 1)),
    );
  }

  group('SignalCenterScreen', () {
    testWidgets('renders active stats and timeline when data is available',
        (tester) async {
      final now = DateTime.now();
      final currentUserId = 'current-user';
      final partnerId = 'partner-1';

      final ownSignal = buildSignal(
        id: 'signal-own',
        userId: currentUserId,
        start: now.subtract(const Duration(minutes: 30)),
        end: now.add(const Duration(hours: 1)),
      );

      final sharedSignal = buildSignal(
        id: 'signal-shared',
        userId: partnerId,
        start: now.subtract(const Duration(minutes: 15)),
        end: now.add(const Duration(hours: 2)),
        type: SignalType.flexible,
      );

      final share = SignalShare(
        id: 'share-1',
        signalId: sharedSignal.id,
        sharedWithUserId: currentUserId,
        sharedByUserId: partnerId,
        createdAt: now.subtract(const Duration(minutes: 20)),
        notify: true,
        autoAccept: false,
      );

      await tester.pumpApp(
        const SignalCenterScreen(),
        overrides: [
          activeSignalsProvider.overrideWith(
            () => _MockActiveSignals([ownSignal]),
          ),
          signalsSharedWithMeProvider.overrideWith(
            () => _MockSignalsSharedWithMe([sharedSignal]),
          ),
          signalSharesProvider.overrideWith(
            () => _MockSignalShares([share]),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Availability Signals'), findsOneWidget);
      expect(find.text('Active now'), findsWidgets);
      expect(find.text('Scheduled'), findsWidgets);
      expect(find.text('Active'), findsWidgets);
      expect(find.byIcon(Icons.wifi_tethering_rounded), findsWidgets);
    });
  });
}
