import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:myorbit_calendar/l10n/app_localizations.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/ui/screens/calendar_screen.dart';

void main() {
  testWidgets('Calendar screen follows a11y guidelines', (WidgetTester tester) async {
    // Initialize TimezoneService before running tests
    await TimezoneService.initialize();
    
    final SemanticsHandle handle = tester.ensureSemantics();

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const CalendarScreen(),
        ),
      ),
    );

    // Check for tap target sizes (minimum 48x48 for Android)
    await expectLater(
      tester,
      meetsGuideline(androidTapTargetGuideline),
      reason: 'All tap targets should meet Android minimum size of 48x48',
    );

    // Check for iOS tap target sizes (minimum 44x44)
    await expectLater(
      tester,
      meetsGuideline(iOSTapTargetGuideline),
      reason: 'All tap targets should meet iOS minimum size of 44x44',
    );

    // Check that tap targets have labels
    await expectLater(
      tester,
      meetsGuideline(labeledTapTargetGuideline),
      reason: 'All interactive elements should be labeled',
    );

    handle.dispose();
  });
}
