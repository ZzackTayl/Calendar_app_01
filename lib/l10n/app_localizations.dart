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

  /// Message showing the number of active availability signals shared by connections.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one {{count} available} other {{count} available}}'**
  String availabilityConnectionsAvailableCount(int count);

  /// Message showing the number of the user's own active availability signals.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, one {{count} active} other {{count} active}}'**
  String availabilityMyActiveCount(int count);

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

  /// Welcome title displayed on the authentication screen.
  ///
  /// In en, this message translates to:
  /// **'Welcome to MyOrbit'**
  String get authWelcomeTitle;

  /// Description text shown when user is on sign up mode.
  ///
  /// In en, this message translates to:
  /// **'Create an account to coordinate calendars with your connections.'**
  String get authSignUpDescription;

  /// Description text shown when user is on sign in mode.
  ///
  /// In en, this message translates to:
  /// **'Sign in to continue coordinating schedules with ease.'**
  String get authSignInDescription;

  /// Button text for creating a new account.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get authCreateAccountButton;

  /// Button text for signing in.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authSignInButton;

  /// Link text for forgot password functionality.
  ///
  /// In en, this message translates to:
  /// **'Forgot password?'**
  String get authForgotPasswordLink;

  /// Button text for Google authentication.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get authContinueWithGoogle;

  /// Prompt text asking if user already has an account.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get authAlreadyHaveAccount;

  /// Prompt text asking if user is new to the app.
  ///
  /// In en, this message translates to:
  /// **'New to MyOrbit?'**
  String get authNewToMyOrbit;

  /// Link text to switch from sign up to sign in.
  ///
  /// In en, this message translates to:
  /// **'Sign in instead'**
  String get authSignInInstead;

  /// Link text to switch from sign in to sign up.
  ///
  /// In en, this message translates to:
  /// **'Create an account'**
  String get authCreateAccountLink;

  /// Toggle option label for sign in mode.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get authSignInToggle;

  /// Toggle option label for sign up mode.
  ///
  /// In en, this message translates to:
  /// **'Sign up'**
  String get authSignUpToggle;

  /// Label for email input field.
  ///
  /// In en, this message translates to:
  /// **'Email address'**
  String get authEmailLabel;

  /// Label for password input field.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get authPasswordLabel;

  /// Label for full name input field.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get authFullNameLabel;

  /// Label for password confirmation input field.
  ///
  /// In en, this message translates to:
  /// **'Confirm password'**
  String get authConfirmPasswordLabel;

  /// Validation error when name field is empty.
  ///
  /// In en, this message translates to:
  /// **'Please enter your name'**
  String get authValidationEnterName;

  /// Validation error when email field is empty.
  ///
  /// In en, this message translates to:
  /// **'Please enter your email'**
  String get authValidationEnterEmail;

  /// Validation error when email format is invalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid email address'**
  String get authValidationValidEmail;

  /// Validation error when password field is empty.
  ///
  /// In en, this message translates to:
  /// **'Please enter your password'**
  String get authValidationEnterPassword;

  /// Validation error when password is too short.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters'**
  String get authValidationPasswordLength;

  /// Validation error when confirm password field is empty.
  ///
  /// In en, this message translates to:
  /// **'Please re-enter your password'**
  String get authValidationReenterPassword;

  /// Validation error when passwords don't match.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match'**
  String get authValidationPasswordsNoMatch;

  /// Error message when passwords don't match during sign up.
  ///
  /// In en, this message translates to:
  /// **'Passwords must match.'**
  String get authErrorPasswordsMatch;

  /// Error message when password is too short during sign up.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 8 characters long.'**
  String get authErrorPasswordMinLength;

  /// Generic error message when authentication fails.
  ///
  /// In en, this message translates to:
  /// **'Authentication failed.'**
  String get authErrorAuthFailed;

  /// Error message when Supabase is not configured.
  ///
  /// In en, this message translates to:
  /// **'Supabase credentials are not configured. Connect the app to Supabase before signing in.'**
  String get authErrorSupabaseNotConfigured;

  /// Placeholder message for forgot password functionality.
  ///
  /// In en, this message translates to:
  /// **'Forgot password tapped — connect to reset flow.'**
  String get authForgotPasswordPlaceholder;

  /// Divider text between email auth and social auth options.
  ///
  /// In en, this message translates to:
  /// **'Or continue with'**
  String get authOrContinueWith;

  /// Button label to jump to today's date in calendar.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get calendarTodayButton;

  /// Generic cancel button label.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get calendarCancelButton;

  /// Dialog title when canceling an availability signal.
  ///
  /// In en, this message translates to:
  /// **'Cancel Signal?'**
  String get calendarCancelSignalTitle;

  /// Confirmation message when canceling an availability signal.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to cancel this availability signal? This cannot be undone.'**
  String get calendarCancelSignalMessage;

  /// Button label to keep the signal and dismiss the dialog.
  ///
  /// In en, this message translates to:
  /// **'Keep'**
  String get calendarKeepButton;

  /// Button label to confirm canceling the signal.
  ///
  /// In en, this message translates to:
  /// **'Cancel Signal'**
  String get calendarCancelSignalButton;

  /// Snackbar message shown after successfully canceling a signal.
  ///
  /// In en, this message translates to:
  /// **'Signal cancelled'**
  String get calendarSignalCancelledMessage;

  /// Menu item title for creating a new event.
  ///
  /// In en, this message translates to:
  /// **'Create event'**
  String get calendarCreateEventTitle;

  /// Menu item title for signaling availability.
  ///
  /// In en, this message translates to:
  /// **'Signal availability'**
  String get calendarSignalAvailabilityTitle;

  /// Menu item subtitle explaining availability signaling.
  ///
  /// In en, this message translates to:
  /// **'Share time with selected partners'**
  String get calendarSignalAvailabilitySubtitle;

  /// Section title for availability signals list.
  ///
  /// In en, this message translates to:
  /// **'Availability signals'**
  String get calendarAvailabilitySignalsTitle;

  /// Menu item title for sharing an availability signal.
  ///
  /// In en, this message translates to:
  /// **'Share availability signal'**
  String get dashboardShareAvailabilitySignal;

  /// Button label for sharing availability.
  ///
  /// In en, this message translates to:
  /// **'Share availability'**
  String get dashboardShareAvailability;

  /// Snackbar message when notifications are cleared.
  ///
  /// In en, this message translates to:
  /// **'Notifications cleared'**
  String get notificationsCleared;

  /// Snackbar message when a notification is dismissed.
  ///
  /// In en, this message translates to:
  /// **'{title} dismissed'**
  String notificationDismissed(String title);

  /// OK button label in notification dialogs.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get notificationsOkButton;

  /// Back button label in onboarding flow.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get onboardingBackButton;

  /// Skip button label in onboarding flow.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get onboardingSkipButton;

  /// Choice chip label to invite connections immediately.
  ///
  /// In en, this message translates to:
  /// **'Invite connections now'**
  String get onboardingInviteNow;

  /// Choice chip label to skip inviting connections.
  ///
  /// In en, this message translates to:
  /// **'I\'ll do this later'**
  String get onboardingInviteLater;

  /// Continue button label in onboarding flow.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get onboardingContinueButton;

  /// Button label to skip sending invites during onboarding.
  ///
  /// In en, this message translates to:
  /// **'Skip invites for now'**
  String get onboardingSkipInvites;

  /// Placeholder message for data export feature.
  ///
  /// In en, this message translates to:
  /// **'Data export options will be available later.'**
  String get settingsDataExportPlaceholder;

  /// Placeholder message for Discord integration.
  ///
  /// In en, this message translates to:
  /// **'Discord invite link will be added soon.'**
  String get settingsDiscordPlaceholder;

  /// Placeholder message for support messaging.
  ///
  /// In en, this message translates to:
  /// **'Support messaging will be wired up next.'**
  String get settingsSupportPlaceholder;

  /// Message shown while loading calendars.
  ///
  /// In en, this message translates to:
  /// **'Loading calendars...'**
  String get settingsLoadingCalendars;

  /// Error message when calendars fail to load.
  ///
  /// In en, this message translates to:
  /// **'Failed to load calendars'**
  String get settingsFailedLoadCalendars;

  /// Dialog title for account deletion confirmation.
  ///
  /// In en, this message translates to:
  /// **'Delete account?'**
  String get settingsDeleteAccountTitle;

  /// Generic cancel button label.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get settingsCancelButton;

  /// Button label to confirm account deletion.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get settingsDeleteAccountButton;

  /// Done button label.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get settingsDoneButton;

  /// Dialog title for calendar visibility settings.
  ///
  /// In en, this message translates to:
  /// **'Calendar Visibility'**
  String get settingsCalendarVisibilityTitle;

  /// Button label to apply changes.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get settingsApplyButton;

  /// Label for selecting only the viewer's own calendar.
  ///
  /// In en, this message translates to:
  /// **'Me'**
  String get calendarFilterSelfLabel;

  /// Label shown when viewing both the viewer and a specific connection.
  ///
  /// In en, this message translates to:
  /// **'Me + {contactName}'**
  String calendarFilterSelfPlusContact(String contactName);

  /// Fallback label when a connection name is unavailable.
  ///
  /// In en, this message translates to:
  /// **'Unknown contact'**
  String get calendarFilterUnknownContact;

  /// Label shown above the connection calendar selector.
  ///
  /// In en, this message translates to:
  /// **'Viewing calendar'**
  String get calendarViewingLabel;

  /// Accessibility label for the connection calendar selector.
  ///
  /// In en, this message translates to:
  /// **'Select whose calendar to view'**
  String get calendarFilterSemanticsLabel;
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
