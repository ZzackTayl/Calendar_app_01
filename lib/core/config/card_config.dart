import 'package:flutter/material.dart';
import '../theme_constants.dart';

/// Configuration class for card appearance and behavior
/// This allows cards to be styled consistently across the app
/// and can be modified via Firebase Remote Config in the future
class CardConfig {
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final List<BoxShadow> shadows;
  final Gradient? gradient;
  final Color? backgroundColor;
  final Border? border;
  final double? borderWidth;
  final Color? borderColor;

  CardConfig({
    EdgeInsetsGeometry? padding,
    double? borderRadius,
    List<BoxShadow>? shadows,
    this.gradient,
    this.backgroundColor,
    this.border,
    this.borderWidth,
    this.borderColor,
  })  : padding = padding ?? const EdgeInsets.all(24),
        borderRadius = borderRadius ?? AppBorderRadius.xLarge,
        shadows = shadows ?? AppShadows.card;

  /// Standard card configuration - matches create_event_screen pattern
  factory CardConfig.standard({bool isDark = false}) {
    final borderColor = isDark
        ? AppColors.cardBorderBabyBlue
        : AppColors.cardBorderBabyBlue.withValues(alpha: 0.6);

    return CardConfig(
      padding: const EdgeInsets.all(24),
      borderRadius: AppBorderRadius.xLarge,
      gradient: isDark
          ? const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
            )
          : null,
      backgroundColor: isDark ? null : Colors.white,
      borderWidth: 1.5,
      borderColor: borderColor,
      shadows: isDark
          ? const [
              BoxShadow(
                color: Color(0x55000000),
                blurRadius: 18,
                offset: Offset(0, 10),
              ),
            ]
          : [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
    );
  }

  /// Compact card with less padding
  factory CardConfig.compact({bool isDark = false}) {
    return CardConfig.standard(isDark: isDark).copyWith(
      padding: const EdgeInsets.all(16),
      borderRadius: AppBorderRadius.large,
    );
  }

  /// Card configuration for sections (with bottom margin)
  factory CardConfig.section({bool isDark = false}) {
    return CardConfig.standard(isDark: isDark);
  }

  /// Create a copy with modifications
  CardConfig copyWith({
    EdgeInsetsGeometry? padding,
    double? borderRadius,
    List<BoxShadow>? shadows,
    Gradient? gradient,
    Color? backgroundColor,
    Border? border,
    double? borderWidth,
    Color? borderColor,
  }) {
    return CardConfig(
      padding: padding ?? this.padding,
      borderRadius: borderRadius ?? this.borderRadius,
      shadows: shadows ?? this.shadows,
      gradient: gradient ?? this.gradient,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      border: border ?? this.border,
      borderWidth: borderWidth ?? this.borderWidth,
      borderColor: borderColor ?? this.borderColor,
    );
  }

  /// Convert to BoxDecoration
  BoxDecoration toBoxDecoration() {
    return BoxDecoration(
      gradient: gradient,
      color: backgroundColor,
      border: border ??
          (borderColor != null
              ? Border.all(
                  color: borderColor!,
                  width: borderWidth ?? 1.0,
                )
              : null),
      borderRadius: BorderRadius.circular(borderRadius),
      boxShadow: shadows,
    );
  }

  /// Create from JSON (for Firebase Remote Config)
  factory CardConfig.fromJson(Map<String, dynamic> json) {
    return CardConfig(
      padding: EdgeInsets.all(json['padding'] as double? ?? 24),
      borderRadius: json['borderRadius'] as double? ?? AppBorderRadius.xLarge,
      // Note: Add gradient and shadows parsing when needed
    );
  }

  /// Convert to JSON (for Firebase Remote Config)
  Map<String, dynamic> toJson() {
    return {
      'padding': (padding as EdgeInsets?)?.top ?? 24.0,
      'borderRadius': borderRadius,
      // Note: Add gradient and shadows serialization when needed
    };
  }
}
