import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';
import 'package:myorbit_calendar/ui/screens/settings_screen.dart';
import '../helpers/pump_app.dart';

class _TestSettingsController extends SettingsController {
  _TestSettingsController(this._state);

  final SettingsState _state;

  @override
  Future<SettingsState> build() async => _state;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final defaultSettings = const SettingsState();

  group('SettingsScreen typography', () {
    testWidgets(
        'GIVEN phone width WHEN settings screen renders THEN header uses responsive typography',
        (tester) async {
      await TimezoneService.initialize();
      final view = tester.view;
      view.devicePixelRatio = 1.0;
      view.physicalSize = const Size(480, 800);
      addTearDown(() {
        view.resetPhysicalSize();
        view.resetDevicePixelRatio();
      });

      await tester.pumpApp(
        const SettingsScreen(),
        overrides: [
          settingsControllerProvider.overrideWith(
            () => _TestSettingsController(defaultSettings),
          ),
        ],
      );

      await tester.pumpAndSettle();

      final headerFinder = find.text('Settings');
      expect(headerFinder, findsOneWidget);
      final header = tester.widget<Text>(headerFinder);
      final expectedFontSize = ResponsiveTextStyles(480).heading2.fontSize!;
      expect(header.style, isNotNull);
      expect(header.style!.fontSize, closeTo(expectedFontSize, 0.01));
    });

    testWidgets(
        'GIVEN tablet width WHEN settings screen renders THEN header scales responsively',
        (tester) async {
      await TimezoneService.initialize();
      final view = tester.view;
      view.devicePixelRatio = 1.0;
      view.physicalSize = const Size(800, 1200);
      addTearDown(() {
        view.resetPhysicalSize();
        view.resetDevicePixelRatio();
      });

      await tester.pumpApp(
        const SettingsScreen(),
        overrides: [
          settingsControllerProvider.overrideWith(
            () => _TestSettingsController(defaultSettings),
          ),
        ],
      );

      await tester.pumpAndSettle();

      final headerFinder = find.text('Settings');
      expect(headerFinder, findsOneWidget);
      final header = tester.widget<Text>(headerFinder);
      final expectedFontSize = ResponsiveTextStyles(800).heading2.fontSize!;
      expect(header.style, isNotNull);
      expect(header.style!.fontSize, closeTo(expectedFontSize, 0.01));
    });
  });
}
