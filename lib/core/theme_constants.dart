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

  // Background colors
  static const backgroundLight = Color(0xFFF3F6FF);
  static const backgroundWhite = Colors.white;

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
