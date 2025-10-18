import 'package:flutter/material.dart';

/// Centralized theme constants for the MyOrbit app
///
/// This file contains all color definitions and gradients used throughout the app
/// to ensure visual consistency and make theme updates easier.
class AppColors {
  // Primary brand colors
  static const primary = Color(0xFF4D8CFF);
  static const secondary = Color(0xFFA64D79);
  static const accent = Color(0xFF26C281);

  // Text colors
  static const textPrimary = Color(0xFF1F2C3E);
  static const textSecondary = Color(0xFF6B7280);
  static const textTertiary = Color(0xFF9CA3AF);
  static const textLight = Color(0xFF5B5A78);
  static const textPrimaryDark = Color(0xFFE6E9F4);
  static const textSecondaryDark = Color(0xFFB3B8CC);
  static const textTertiaryDark = Color(0xFF8C92A6);

  // Background colors
  static const backgroundLight = Color(0xFFF3F6FF);
  static const backgroundWhite = Colors.white;
  static const backgroundDark = Color(0xFF11121A);
  static const surfaceDark = Color(0xFF1A1C24);
  static const surfaceVariantDark = Color(0xFF252837);

  // Card colors
  static const cardBlue = Color(0xFF5B8DB8);
  static const cardMaroon = Color(0xFFA64D79);
  static const cardDark = Color(0xFF2C3E50);

  // Event indicator colors
  static const eventOrange = Color(0xFFFF9500);
  static const eventPurple = Color(0xFF7C3BFF);
  static const eventGreen = Color(0xFF26C281);
  static const eventBlue = Color(0xFF4D8CFF);
  static const eventRed = Color(0xFFFF6B6B);

  // Signals
  static const signalAvailable = Color(0xFF1FC7A1);
  static const signalFlex = Color(0xFF7C8CF7);
  static const signalShared = Color(0xFF3DA0FF);
  static const signalMuted = Color(0xFF9CA3AF);
  static const signalOwnDayBackground = Color(0x3326C281);
  static const signalSharedDayBackground = Color(0x332D87FF);

  // Calendar colors
  static const todayBackground = Color(0xFFFF9B8A);
  static const selectedBackground = Color(0xFF8AB4F8);
  static const calendarBorder = Color(0xFF4D8CFF);

  // Activity/Notification colors
  static const activityPurple = Color(0xFF7C3BFF);
  static const activityPurpleLight = Color(0xFFF5F0FF);
  static const activityBlue = Color(0xFF4D8CFF);
  static const activityBlueLight = Color(0xFFEFF6FF);
  static const activityGreen = Color(0xFF26C281);
  static const activityGreenLight = Color(0xFFEFFFF9);
  static const activityRed = Color(0xFFFF6B6B);
  static const activityRedLight = Color(0xFFFFF0F0);

  // Landing page specific colors
  static const landingTextPrimary = Color(0xFF1F1F39);
  static const landingTextSecondary = Color(0xFF5B5A78);
  static const landingTextTertiary = Color(0xFF6C6A88);

  // Challenge section colors
  static const challengePurple = Color(0xFF7C3BFF);
  static const challengeBlue = Color(0xFF2D87FF);
  static const challengeGreen = Color(0xFF26BFA6);
  static const challengeIndigo = Color(0xFF5F63FF);

  // Onboarding colors
  static const onboardingSuccess = Color(0xFF26C281);
  static const onboardingGoogle = Color(0xFF4285F4);

  // Contact/Permission colors
  static const permissionOrange = Color(0xFFFF6B35);
  static const permissionOrangeLight = Color(0xFFFFE4D6);
  static const permissionOrangeBg = Color(0xFFFFF5F0);
  static const permissionError = Color(0xFFD84315);

  // Utility colors
  static const shadowColor = Color(0x14000000);
  static const dividerColor = Color(0xFFE5E7EB);
  static const disabledColor = Color(0xFFB0B0B0);
  static const dividerDark = Color(0xFF2E3241);
  static const overlayDark = Color(0x33FFFFFF);
}

/// Gradient definitions used throughout the app
class AppGradients {
  /// Main background gradient used on most screens
  /// Used in: Dashboard, Calendar, Activity, Onboarding
  static const background = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFB7F0FF), Color(0xFFF7C8FF)],
  );
  static const darkBackground = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
  );

  /// Landing page background gradient (slightly different from main)
  static const landingBackground = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFE6F3FF), Color(0xFFFDE6FF)],
  );

  /// Accent gradient for buttons and highlights
  static const accent = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF7C3BFF), Color(0xFFF13F9C)],
  );

  /// Alternative background for specific screens
  static const alternateBackground = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFB8E6F5), Color(0xFFE8D4F2)],
  );

  /// Gradient used for highlighted event cards in calendar views
  static const eventCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFE8F1FF), Color(0xFFF9E8FF)],
  );

  static LinearGradient backgroundFor(Brightness brightness) {
    return brightness == Brightness.dark ? darkBackground : background;
  }
}

/// Shadow definitions for consistent elevation
class AppShadows {
  static List<BoxShadow> get card => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.1),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get cardElevated => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.08),
          blurRadius: 20,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get button => [
        const BoxShadow(
          color: Color(0x337C3BFF),
          blurRadius: 30,
          offset: Offset(0, 16),
        ),
      ];

  static List<BoxShadow> get subtle => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.05),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ];
}

/// Border radius constants for consistent rounded corners
class AppBorderRadius {
  static const small = 8.0;
  static const medium = 12.0;
  static const large = 16.0;
  static const xLarge = 24.0;
  static const xxLarge = 32.0;
  static const round = 40.0;
}

/// Spacing constants for consistent padding and margins
class AppSpacing {
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 20.0;
  static const xxl = 24.0;
  static const xxxl = 32.0;
}

/// Typography constants for consistent text styles
class AppTextStyles {
  static const heading1 = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
  );

  static const heading2 = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
  );

  static const heading3 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
  );

  static const heading4 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.bold,
    color: AppColors.textPrimary,
  );

  static const bodyLarge = TextStyle(
    fontSize: 18,
    color: AppColors.textPrimary,
  );

  static const bodyMedium = TextStyle(
    fontSize: 16,
    color: AppColors.textPrimary,
  );

  static const bodySmall = TextStyle(
    fontSize: 14,
    color: AppColors.textSecondary,
  );

  static const caption = TextStyle(
    fontSize: 13,
    color: AppColors.textTertiary,
  );
}

/// Responsive typography system - scales text based on screen width
/// Mobile-first approach: base sizes optimized for mobile, scale up on larger screens
class ResponsiveTextStyles {
  ResponsiveTextStyles(this.screenWidth);

  final double screenWidth;

  /// Breakpoints for responsive scaling
  static const double mobile = 480;
  static const double tablet = 600;
  static const double largeTablet = 900;
  static const double desktop = 1200;

  /// Calculate scale factor based on screen width
  /// Mobile (< 600): 1.0x
  /// Tablet (600-900): 1.1x - 1.2x
  /// Large (> 900): 1.3x
  double _getScaleFactor() {
    if (screenWidth < tablet) {
      return 1.0;
    }
    if (screenWidth < largeTablet) {
      return 1.1 + ((screenWidth - tablet) / (largeTablet - tablet)) * 0.1;
    }
    return 1.3;
  }

  TextStyle _scale(TextStyle base) {
    return base.copyWith(
      fontSize: (base.fontSize ?? 16) * _getScaleFactor(),
    );
  }

  // Responsive heading styles
  TextStyle get heading1 => _scale(AppTextStyles.heading1);
  TextStyle get heading2 => _scale(AppTextStyles.heading2);
  TextStyle get heading3 => _scale(AppTextStyles.heading3);
  TextStyle get heading4 => _scale(AppTextStyles.heading4);

  // Responsive body styles
  TextStyle get bodyLarge => _scale(AppTextStyles.bodyLarge);
  TextStyle get bodyMedium => _scale(AppTextStyles.bodyMedium);
  TextStyle get bodySmall => _scale(AppTextStyles.bodySmall);
  TextStyle get caption => _scale(AppTextStyles.caption);

  // Special responsive sizes for buttons and UI controls
  TextStyle get buttonLarge => TextStyle(
        fontSize: 16 * _getScaleFactor(),
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      );

  TextStyle get buttonMedium => TextStyle(
        fontSize: 14 * _getScaleFactor(),
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      );

  TextStyle get buttonSmall => TextStyle(
        fontSize: 12 * _getScaleFactor(),
        fontWeight: FontWeight.w500,
        color: AppColors.textSecondary,
      );

  // Toggle/tab button sizes
  TextStyle get toggleLabel => TextStyle(
        fontSize: 14 * _getScaleFactor(),
        fontWeight: FontWeight.w600,
        color: AppColors.textSecondary,
      );

  // Calendar and data display
  TextStyle get calendarDate => TextStyle(
        fontSize: 20 * _getScaleFactor(),
        fontWeight: FontWeight.bold,
        color: AppColors.textPrimary,
      );

  TextStyle get calendarMonth => TextStyle(
        fontSize: 16 * _getScaleFactor(),
        fontWeight: FontWeight.w500,
        color: AppColors.textSecondary,
      );
}

class AppThemes {
  static ThemeData light() {
    final baseScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
    );

    final colorScheme = baseScheme.copyWith(
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      surface: Colors.white,
      surfaceContainerHighest: const Color(0xFFE8ECFF),
    );

    final textTheme = Typography.englishLike2018.apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.backgroundLight,
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      cardColor: Colors.white,
      dividerColor: AppColors.dividerColor,
      iconTheme: const IconThemeData(color: AppColors.textPrimary),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.secondary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: colorScheme.surfaceContainerHighest,
        selectedColor: colorScheme.primary.withValues(alpha: 0.2),
        disabledColor: AppColors.disabledColor.withValues(alpha: 0.35),
        labelStyle: textTheme.labelMedium,
        secondaryLabelStyle: textTheme.labelMedium,
        brightness: Brightness.light,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: AppColors.primary.withValues(alpha: 0.2),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return textTheme.labelMedium?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            );
          }
          return textTheme.labelMedium?.copyWith(
            color: AppColors.textSecondary,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primary);
          }
          return const IconThemeData(color: AppColors.textSecondary);
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          borderSide: const BorderSide(color: AppColors.dividerColor),
        ),
      ),
    );
  }

  static ThemeData dark() {
    final baseScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.dark,
    );

    final colorScheme = baseScheme.copyWith(
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      surface: AppColors.surfaceDark,
      surfaceContainerHighest: AppColors.surfaceVariantDark,
    );

    final textTheme = Typography.englishLike2018.apply(
      bodyColor: AppColors.textPrimaryDark,
      displayColor: AppColors.textPrimaryDark,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.backgroundDark,
      textTheme: textTheme,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surfaceDark,
        foregroundColor: AppColors.textPrimaryDark,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      cardColor: AppColors.surfaceDark,
      dividerColor: AppColors.dividerDark,
      iconTheme: const IconThemeData(color: AppColors.textPrimaryDark),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.secondary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.surfaceVariantDark,
        selectedColor: AppColors.primary.withValues(alpha: 0.35),
        disabledColor: AppColors.surfaceVariantDark.withValues(alpha: 0.35),
        labelStyle: textTheme.labelMedium,
        secondaryLabelStyle: textTheme.labelMedium,
        brightness: Brightness.dark,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.large),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surfaceDark,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surfaceDark,
        indicatorColor: AppColors.primary.withValues(alpha: 0.2),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return textTheme.labelMedium?.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            );
          }
          return textTheme.labelMedium?.copyWith(
            color: AppColors.textSecondaryDark,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primary);
          }
          return const IconThemeData(color: AppColors.textSecondaryDark);
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceVariantDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.medium),
          borderSide: const BorderSide(color: AppColors.dividerDark),
        ),
      ),
    );
  }
}

class AppPalette {
  AppPalette(this.brightness);

  final Brightness brightness;

  factory AppPalette.of(BuildContext context) => AppPalette(Theme.of(context).brightness);

  /// Static light palette for testing
  static AppPalette get light => AppPalette(Brightness.light);

  bool get isDark => brightness == Brightness.dark;

  Color get background => isDark ? AppColors.backgroundDark : AppColors.backgroundLight;
  Color get surface => isDark ? AppColors.surfaceDark : Colors.white;
  Color get surfaceVariant => isDark ? AppColors.surfaceVariantDark : const Color(0xFFF2F4FF);
  Color get subtleSurface => isDark ? AppColors.surfaceVariantDark : const Color(0xFFF9FAFB);
  Color get textPrimary => isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
  Color get textSecondary => isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;
  Color get textTertiary => isDark ? AppColors.textTertiaryDark : AppColors.textTertiary;
  Color get divider => isDark ? AppColors.dividerDark : AppColors.dividerColor;
  Color get badgeInfoBackground => isDark ? AppColors.surfaceVariantDark : const Color(0xFFE0F2FE);
  Color get badgeInfoBorder =>
      isDark ? AppColors.textSecondaryDark.withValues(alpha: 0.35) : const Color(0xFF38BDF8);
  Color get badgeInfoIcon => isDark ? AppColors.textSecondaryDark : const Color(0xFF0284C7);
  Color get cardShadow =>
      isDark ? Colors.black.withValues(alpha: 0.45) : Colors.black.withValues(alpha: 0.08);
  Color get tabSelectedBackground => surface;
  Color get tabUnselectedText => isDark ? AppColors.textSecondaryDark : AppColors.textSecondary;

  Color highlightFor(Color base) => base.withValues(alpha: isDark ? 0.28 : 0.12);
}
