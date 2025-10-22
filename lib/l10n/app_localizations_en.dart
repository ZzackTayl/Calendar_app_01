// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'MyOrbit';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsAppearanceSectionTitle => 'Appearance';

  @override
  String get settingsCalendarSectionTitle => 'Calendar';

  @override
  String get settingsVisibilityLabel => 'Visibility';

  @override
  String get peopleMyOrbitTitle => 'My Orbit';

  @override
  String get dashboardCreateEventOrSignalLabel => 'Create event or signal';

  @override
  String get dashboardQuickCreateHint => 'Opens quick create options';

  @override
  String get calendarAddEventOrSignalLabel =>
      'Add event or availability signal';

  @override
  String get calendarAddEventOrSignalHint => 'Opens quick create options';

  @override
  String get availabilityTitle => 'Availability';

  @override
  String get availabilityNoSignalsLabel => 'No active signals yet';

  @override
  String availabilityActiveCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count signals active',
      one: '$count signal active',
    );
    return '$_temp0';
  }

  @override
  String availabilityMineCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count mine',
      one: '$count mine',
    );
    return '$_temp0';
  }

  @override
  String availabilitySharedCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count connections',
      one: '$count connection',
    );
    return '$_temp0';
  }
}

/// The translations for English, as used in the United States (`en_US`).
class AppLocalizationsEnUs extends AppLocalizationsEn {
  AppLocalizationsEnUs() : super('en_US');

  @override
  String get appTitle => 'MyOrbit';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsAppearanceSectionTitle => 'Appearance';

  @override
  String get settingsCalendarSectionTitle => 'Calendar';

  @override
  String get settingsVisibilityLabel => 'Visibility';

  @override
  String get peopleMyOrbitTitle => 'My Orbit';

  @override
  String get dashboardCreateEventOrSignalLabel => 'Create event or signal';

  @override
  String get dashboardQuickCreateHint => 'Opens quick create options';

  @override
  String get calendarAddEventOrSignalLabel =>
      'Add event or availability signal';

  @override
  String get calendarAddEventOrSignalHint => 'Opens quick create options';

  @override
  String get availabilityTitle => 'Availability';

  @override
  String get availabilityNoSignalsLabel => 'No active signals yet';

  @override
  String availabilityActiveCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count signals active',
      one: '$count signal active',
    );
    return '$_temp0';
  }

  @override
  String availabilityMineCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count mine',
      one: '$count mine',
    );
    return '$_temp0';
  }

  @override
  String availabilitySharedCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count connections',
      one: '$count connection',
    );
    return '$_temp0';
  }
}
