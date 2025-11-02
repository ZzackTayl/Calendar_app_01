import 'package:flutter/material.dart';

/// Extension on `BuildContext` to simplify access to `MediaQuery` properties and
/// provide responsive sizing for mobile devices.
extension MediaQueryValues on BuildContext {
  /// Retrieves the `MediaQueryData` for the current context.
  MediaQueryData get mediaQuery => MediaQuery.of(this);

  /// Retrieves the width of the screen.
  double get screenWidth => mediaQuery.size.width;

  /// Retrieves the height of the screen.
  double get screenHeight => mediaQuery.size.height;

  /// Checks if the device is considered a tablet based on screen width.
  /// Returns `true` if the screen719width is greater than 600 pixels.

  bool get isTablet {
    final shortestSide = mediaQuery.size.shortestSide;
    return shortestSide > 600; // More reliable check
  }

  /// Get a responsive width based on a percentage of screen width.
  double responsiveWidth(double percentage) {
    return screenWidth * (percentage / 100);
  }

  /// Get a responsive height based on a percentage of screen height.
  double responsiveHeight(double percentage) {
    return screenHeight * (percentage / 100);
  }

  /// Get a responsive font size based on screen width.
  double responsiveFontSize(double baseFontSize) {
    final scaleFactor = screenWidth / 375; // Reference width (e.g., iPhone 6)
    return baseFontSize *
        scaleFactor.clamp(0.8, 1.2); // Clamp to avoid extreme scaling
  }

  /// Get a constrained width for forms or containers.
  double get constrainedWidth {
    return isTablet ? 400 : screenWidth * 0.9;
  }

  /// Get responsive padding based on screen size.
  EdgeInsets responsivePadding({double horizontal = 5, double vertical = 5}) {
    return EdgeInsets.symmetric(
      horizontal: responsiveWidth(horizontal),
      vertical: responsiveHeight(vertical),
    );
  }
}
