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

  @override
  String get authWelcomeTitle => 'Welcome to MyOrbit';

  @override
  String get authSignUpDescription =>
      'Create an account to coordinate calendars with your connections.';

  @override
  String get authSignInDescription =>
      'Sign in to continue coordinating schedules with ease.';

  @override
  String get authCreateAccountButton => 'Create account';

  @override
  String get authSignInButton => 'Sign in';

  @override
  String get authForgotPasswordLink => 'Forgot password?';

  @override
  String get authContinueWithGoogle => 'Continue with Google';

  @override
  String get authAlreadyHaveAccount => 'Already have an account?';

  @override
  String get authNewToMyOrbit => 'New to MyOrbit?';

  @override
  String get authSignInInstead => 'Sign in instead';

  @override
  String get authCreateAccountLink => 'Create an account';

  @override
  String get authSignInToggle => 'Sign in';

  @override
  String get authSignUpToggle => 'Sign up';

  @override
  String get authEmailLabel => 'Email address';

  @override
  String get authPasswordLabel => 'Password';

  @override
  String get authFullNameLabel => 'Full name';

  @override
  String get authConfirmPasswordLabel => 'Confirm password';

  @override
  String get authValidationEnterName => 'Please enter your name';

  @override
  String get authValidationEnterEmail => 'Please enter your email';

  @override
  String get authValidationValidEmail => 'Enter a valid email address';

  @override
  String get authValidationEnterPassword => 'Please enter your password';

  @override
  String get authValidationPasswordLength =>
      'Password must be at least 8 characters';

  @override
  String get authValidationReenterPassword => 'Please re-enter your password';

  @override
  String get authValidationPasswordsNoMatch => 'Passwords do not match';

  @override
  String get authErrorPasswordsMatch => 'Passwords must match.';

  @override
  String get authErrorPasswordMinLength =>
      'Password must be at least 8 characters long.';

  @override
  String get authErrorAuthFailed => 'Authentication failed.';

  @override
  String get authErrorSupabaseNotConfigured =>
      'Supabase credentials are not configured. Connect the app to Supabase before signing in.';

  @override
  String get authForgotPasswordPlaceholder =>
      'Forgot password tapped — connect to reset flow.';

  @override
  String get authOrContinueWith => 'Or continue with';

  @override
  String get calendarTodayButton => 'Today';

  @override
  String get calendarCancelButton => 'Cancel';

  @override
  String get calendarCancelSignalTitle => 'Cancel Signal?';

  @override
  String get calendarCancelSignalMessage =>
      'Are you sure you want to cancel this availability signal? This cannot be undone.';

  @override
  String get calendarKeepButton => 'Keep';

  @override
  String get calendarCancelSignalButton => 'Cancel Signal';

  @override
  String get calendarSignalCancelledMessage => 'Signal cancelled';

  @override
  String get calendarCreateEventTitle => 'Create event';

  @override
  String get calendarSignalAvailabilityTitle => 'Signal availability';

  @override
  String get calendarSignalAvailabilitySubtitle =>
      'Share time with selected partners';

  @override
  String get calendarAvailabilitySignalsTitle => 'Availability signals';

  @override
  String get dashboardShareAvailabilitySignal => 'Share availability signal';

  @override
  String get dashboardShareAvailability => 'Share availability';

  @override
  String get notificationsCleared => 'Notifications cleared';

  @override
  String notificationDismissed(String title) {
    return '$title dismissed';
  }

  @override
  String get notificationsOkButton => 'OK';

  @override
  String get onboardingBackButton => 'Back';

  @override
  String get onboardingSkipButton => 'Skip';

  @override
  String get onboardingInviteNow => 'Invite connections now';

  @override
  String get onboardingInviteLater => 'I\'ll do this later';

  @override
  String get onboardingContinueButton => 'Continue';

  @override
  String get onboardingSkipInvites => 'Skip invites for now';

  @override
  String get settingsDataExportPlaceholder =>
      'Data export options will be available later.';

  @override
  String get settingsDiscordPlaceholder =>
      'Discord invite link will be added soon.';

  @override
  String get settingsSupportPlaceholder =>
      'Support messaging will be wired up next.';

  @override
  String get settingsLoadingCalendars => 'Loading calendars...';

  @override
  String get settingsFailedLoadCalendars => 'Failed to load calendars';

  @override
  String get settingsDeleteAccountTitle => 'Delete account?';

  @override
  String get settingsCancelButton => 'Cancel';

  @override
  String get settingsDeleteAccountButton => 'Delete account';

  @override
  String get settingsDoneButton => 'Done';

  @override
  String get settingsCalendarVisibilityTitle => 'Calendar Visibility';

  @override
  String get settingsApplyButton => 'Apply';
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

  @override
  String get authWelcomeTitle => 'Welcome to MyOrbit';

  @override
  String get authSignUpDescription =>
      'Create an account to coordinate calendars with your connections.';

  @override
  String get authSignInDescription =>
      'Sign in to continue coordinating schedules with ease.';

  @override
  String get authCreateAccountButton => 'Create account';

  @override
  String get authSignInButton => 'Sign in';

  @override
  String get authForgotPasswordLink => 'Forgot password?';

  @override
  String get authContinueWithGoogle => 'Continue with Google';

  @override
  String get authAlreadyHaveAccount => 'Already have an account?';

  @override
  String get authNewToMyOrbit => 'New to MyOrbit?';

  @override
  String get authSignInInstead => 'Sign in instead';

  @override
  String get authCreateAccountLink => 'Create an account';

  @override
  String get authSignInToggle => 'Sign in';

  @override
  String get authSignUpToggle => 'Sign up';

  @override
  String get authEmailLabel => 'Email address';

  @override
  String get authPasswordLabel => 'Password';

  @override
  String get authFullNameLabel => 'Full name';

  @override
  String get authConfirmPasswordLabel => 'Confirm password';

  @override
  String get authValidationEnterName => 'Please enter your name';

  @override
  String get authValidationEnterEmail => 'Please enter your email';

  @override
  String get authValidationValidEmail => 'Enter a valid email address';

  @override
  String get authValidationEnterPassword => 'Please enter your password';

  @override
  String get authValidationPasswordLength =>
      'Password must be at least 8 characters';

  @override
  String get authValidationReenterPassword => 'Please re-enter your password';

  @override
  String get authValidationPasswordsNoMatch => 'Passwords do not match';

  @override
  String get authErrorPasswordsMatch => 'Passwords must match.';

  @override
  String get authErrorPasswordMinLength =>
      'Password must be at least 8 characters long.';

  @override
  String get authErrorAuthFailed => 'Authentication failed.';

  @override
  String get authErrorSupabaseNotConfigured =>
      'Supabase credentials are not configured. Connect the app to Supabase before signing in.';

  @override
  String get authForgotPasswordPlaceholder =>
      'Forgot password tapped — connect to reset flow.';

  @override
  String get authOrContinueWith => 'Or continue with';

  @override
  String get calendarTodayButton => 'Today';

  @override
  String get calendarCancelButton => 'Cancel';

  @override
  String get calendarCancelSignalTitle => 'Cancel Signal?';

  @override
  String get calendarCancelSignalMessage =>
      'Are you sure you want to cancel this availability signal? This cannot be undone.';

  @override
  String get calendarKeepButton => 'Keep';

  @override
  String get calendarCancelSignalButton => 'Cancel Signal';

  @override
  String get calendarSignalCancelledMessage => 'Signal cancelled';

  @override
  String get calendarCreateEventTitle => 'Create event';

  @override
  String get calendarSignalAvailabilityTitle => 'Signal availability';

  @override
  String get calendarSignalAvailabilitySubtitle =>
      'Share time with selected partners';

  @override
  String get calendarAvailabilitySignalsTitle => 'Availability signals';

  @override
  String get dashboardShareAvailabilitySignal => 'Share availability signal';

  @override
  String get dashboardShareAvailability => 'Share availability';

  @override
  String get notificationsCleared => 'Notifications cleared';

  @override
  String notificationDismissed(String title) {
    return '$title dismissed';
  }

  @override
  String get notificationsOkButton => 'OK';

  @override
  String get onboardingBackButton => 'Back';

  @override
  String get onboardingSkipButton => 'Skip';

  @override
  String get onboardingInviteNow => 'Invite connections now';

  @override
  String get onboardingInviteLater => 'I\'ll do this later';

  @override
  String get onboardingContinueButton => 'Continue';

  @override
  String get onboardingSkipInvites => 'Skip invites for now';

  @override
  String get settingsDataExportPlaceholder =>
      'Data export options will be available later.';

  @override
  String get settingsDiscordPlaceholder =>
      'Discord invite link will be added soon.';

  @override
  String get settingsSupportPlaceholder =>
      'Support messaging will be wired up next.';

  @override
  String get settingsLoadingCalendars => 'Loading calendars...';

  @override
  String get settingsFailedLoadCalendars => 'Failed to load calendars';

  @override
  String get settingsDeleteAccountTitle => 'Delete account?';

  @override
  String get settingsCancelButton => 'Cancel';

  @override
  String get settingsDeleteAccountButton => 'Delete account';

  @override
  String get settingsDoneButton => 'Done';

  @override
  String get settingsCalendarVisibilityTitle => 'Calendar Visibility';

  @override
  String get settingsApplyButton => 'Apply';
}
