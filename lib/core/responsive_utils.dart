import 'package:flutter/material.dart';
import 'theme_constants.dart';

/// Responsive utilities for building adaptive UIs
/// Provides breakpoint detection and responsive helpers
class ResponsiveUtils {
  ResponsiveUtils(this.screenWidth);

  final double screenWidth;

  /// Get responsive text styles for current screen width
  ResponsiveTextStyles get textStyles => ResponsiveTextStyles(screenWidth);

  /// Breakpoint detection helpers
  bool get isSmallPhone => screenWidth < ResponsiveTextStyles.mobile;
  bool get isPhone => screenWidth < ResponsiveTextStyles.tablet;
  bool get isTablet =>
      screenWidth >= ResponsiveTextStyles.tablet &&
      screenWidth < ResponsiveTextStyles.largeTablet;
  bool get isLargeTablet =>
      screenWidth >= ResponsiveTextStyles.largeTablet &&
      screenWidth < ResponsiveTextStyles.desktop;
  bool get isDesktop => screenWidth >= ResponsiveTextStyles.desktop;

  /// Get responsive horizontal padding for screens
  double get screenHorizontalPadding {
    if (isPhone) return AppSpacing.lg; // 16
    if (isTablet) return AppSpacing.xl; // 20
    return AppSpacing.xxxl; // 32
  }

  /// Get max width constraint for content (prevents stretching on desktop)
  double get contentMaxWidth {
    if (isPhone) return double.infinity;
    if (isTablet) return 600;
    if (isLargeTablet) return 800;
    return 1000;
  }

  /// Responsive spacing multiplier (compress on small screens, expand on large)
  double get spacingMultiplier {
    if (isSmallPhone) return 0.8;
    if (isPhone) return 1.0;
    if (isTablet) return 1.1;
    if (isLargeTablet) return 1.2;
    return 1.3;
  }

  /// Get column count for grid layouts
  int get gridColumns {
    if (isPhone) return 1;
    if (isTablet) return 2;
    if (isLargeTablet) return 3;
    return 4;
  }

  /// Responsive icon sizes
  double get iconSizeSmall => 16 * (isPhone ? 1.0 : 1.1);
  double get iconSizeMedium => 20 * (isPhone ? 1.0 : 1.1);
  double get iconSizeLarge => 24 * (isPhone ? 1.0 : 1.1);
  double get iconSizeXLarge => 32 * (isPhone ? 1.0 : 1.2);
}

/// Extension method for easy access in BuildContext
extension ResponsiveX on BuildContext {
  ResponsiveUtils get responsive =>
      ResponsiveUtils(MediaQuery.sizeOf(this).width);

  /// Shortcut to responsive text styles
  ResponsiveTextStyles get responsiveText =>
      ResponsiveUtils(MediaQuery.sizeOf(this).width).textStyles;
}
