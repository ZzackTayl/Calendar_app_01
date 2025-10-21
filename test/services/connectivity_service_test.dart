import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:myorbit_calendar/logic/services/connectivity_service.dart';
import 'package:myorbit_calendar/core/supabase_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('ConnectivityService', () {
    late StreamController<ConnectivityResult> controller;
    late int processedCount;

    setUp(() async {
      controller = StreamController<ConnectivityResult>.broadcast();
      processedCount = 0;
      await ConnectivityService.debugReset();
      ConnectivityService.debugOverride(
        stream: controller.stream,
        initialStatus: ConnectivityResult.none,
        currentStatus: () async => ConnectivityResult.none,
      );
      ConnectivityService.debugSetProcessQueueHandler(() async {
        processedCount++;
      });
      SupabaseService.debugOverrideAuthState(
        isConfigured: true,
        isAuthenticated: true,
      );
    });

    tearDown(() async {
      await ConnectivityService.debugReset();
      await controller.close();
      SupabaseService.debugResetAuthOverride();
    });

    test('processes queue when connectivity restores', () async {
      await ConnectivityService.initialize();

      controller.add(ConnectivityResult.wifi);
      await Future<void>.microtask(() {});

      expect(processedCount, 1);
    });

    test('does not reprocess when already connected', () async {
      await ConnectivityService.initialize();

      controller.add(ConnectivityResult.wifi);
      await Future<void>.microtask(() {});

      controller.add(ConnectivityResult.wifi);
      await Future<void>.microtask(() {});

      expect(processedCount, 1);
    });

    test('ignores events when Supabase not authenticated', () async {
      SupabaseService.debugOverrideAuthState(
        isConfigured: true,
        isAuthenticated: false,
      );

      await ConnectivityService.initialize();

      controller.add(ConnectivityResult.mobile);
      await Future<void>.microtask(() {});

      expect(processedCount, 0);
    });
  });
}
