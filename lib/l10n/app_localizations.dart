import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('en', 'US')
  ];

  /// Application title.
  ///
  /// In en, this message translates to:
  /// **'MyOrbit'**
  String get appTitle;

  /// Title displayed on the settings screen.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// Title for the appearance section of settings.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get settingsAppearanceSectionTitle;

  /// Title for the calendar section of settings.
  ///
  /// In en, this message translates to:
  /// **'Calendar'**
  String get settingsCalendarSectionTitle;

  /// Label for calendar visibility option.
  ///
  /// In en, this message translates to:
  /// **'Visibility'**
  String get settingsVisibilityLabel;

  /// Title displayed at the top of the My Orbit screen.
  ///
  /// In en, this message translates to:
  /// **'My Orbit'**
  String get peopleMyOrbitTitle;

  /// Accessibility label for the dashboard quick create button.
  ///
  /// In en, this message translates to:
  /// **'Create event or signal'**
  String get dashboardCreateEventOrSignalLabel;

  /// Hint used for accessibility on quick create buttons.
  ///
  /// In en, this message translates to:
  /// **'Opens quick create options'**
  String get dashboardQuickCreateHint;

  /// Accessibility label for add event/signal button on the calendar screen.
  ///
  /// In en, this message translates to:
  /// **'Add event or availability signal'**
  String get calendarAddEventOrSignalLabel;

  /// Accessibility hint for the add event/signal button on the calendar screen.
  ///
  /// In en, this message translates to:
  /// **'Opens quick create options'**
  String get calendarAddEventOrSignalHint;

  /// Header title for the availability card on the dashboard.
  ///
  /// In en, this message translates to:
  /// **'Availability'**
  String get availabilityTitle;

  /// Message shown when no availability signals are active.
  ///
  /// In en, this message translates to:
  /// **'No active signals yet'**
  String get availabilityNoSignalsLabel;

  /// Message showing the number of active signals.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one {{count} signal active} other {{count} signals active}}'**
  String availabilityActiveCount(int count);

  /// Chip label showing count of the user's own availability signals.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one {{count} mine} other {{count} mine}}'**
  String availabilityMineCount(int count);

  /// Chip label showing count of availability signals shared by connections.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one {{count} connection} other {{count} connections}}'**
  String availabilitySharedCount(int count);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when language+country codes are specified.
  switch (locale.languageCode) {
    case 'en':
      {
        switch (locale.countryCode) {
          case 'US':
            return AppLocalizationsEnUs();
        }
        break;
      }
  }

  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
