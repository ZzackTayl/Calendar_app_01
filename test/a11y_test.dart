import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:myorbit_calendar/ui/screens/calendar_screen.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';

// Mock localization delegate to avoid requiring generated localization files
class MockAppLocalizationsDelegate extends LocalizationsDelegate<Strings> {
  const MockAppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => true;

  @override
  Future<Strings> load(Locale locale) async => const Strings();

  @override
  bool shouldReload(MockAppLocalizationsDelegate old) => false;
}

class Strings {
  const Strings();
  
  // Add all the localization strings that calendar_screen.dart uses
  String get calendarTodayButton => 'Today';
  String get calendarCancelButton => 'Cancel';
  String get calendarKeepButton => 'Keep';
  String get calendarSignalCancelledMessage => 'Signal cancelled';
  String get calendarCancelSignalTitle => 'Cancel Signal';
  String get calendarCancelSignalMessage => 'Are you sure you want to cancel this signal?';
  String get calendarCancelSignalButton => 'Cancel Signal';
  String get calendarCreateEventTitle => 'Create Event';
  String get calendarSignalAvailabilityTitle => 'Signal Availability';
  String get calendarSignalAvailabilitySubtitle => 'Share when you\'re available';
  String get calendarAvailabilitySignalsTitle => 'Availability Signals';
  String get calendarAddEventOrSignalLabel => 'Add event or signal';
  String get calendarAddEventOrSignalHint => 'Create a new event or availability signal';
}

void main() {
  testWidgets('Calendar screen follows a11y guidelines', (WidgetTester tester) async {
    // Initialize TimezoneService before running tests
    await TimezoneService.initialize();
    
    final SemanticsHandle handle = tester.ensureSemantics();

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          localizationsDelegates: const [
            MockAppLocalizationsDelegate(),
          ],
          supportedLocales: const [
            Locale('en', 'US'),
          ],
          home: CalendarScreen(),
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