import 'package:flutter/material.dart';
import '../../../core/config/card_config.dart';
import '../../../core/theme_constants.dart';

/// A configurable card widget that can be styled via CardConfig
///
/// This widget consolidates the card pattern used throughout the app,
/// reducing code duplication and enabling consistent styling.
///
/// Example usage:
/// ```dart
/// ConfigurableCard(
///   title: 'Event Title',
///   child: Text('Event details here'),
/// )
/// ```
class ConfigurableCard extends StatelessWidget {
  final CardConfig? config;
  final String? title;
  final Widget child;
  final EdgeInsetsGeometry? margin;
  final CrossAxisAlignment crossAxisAlignment;

  const ConfigurableCard({
    super.key,
    this.config,
    this.title,
    required this.child,
    this.margin,
    this.crossAxisAlignment = CrossAxisAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final effectiveConfig = config ?? CardConfig.standard(isDark: palette.isDark);
    final theme = Theme.of(context);

    return Container(
      margin: margin ?? const EdgeInsets.only(bottom: 16),
      decoration: effectiveConfig.toBoxDecoration(),
      child: Column(
        crossAxisAlignment: crossAxisAlignment,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (title != null) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
              child: Text(
                title!,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: palette.textPrimary,
                ),
              ),
            ),
          ],
          Padding(
            padding: title != null
                ? EdgeInsets.zero
                : effectiveConfig.padding,
            child: child,
          ),
        ],
      ),
    );
  }
}

/// A card section with a title and expandable content
/// This matches the pattern used in create_event_screen.dart
class ConfigurableCardSection extends StatelessWidget {
  final CardConfig? config;
  final String title;
  final Widget child;
  final EdgeInsetsGeometry? margin;

  const ConfigurableCardSection({
    super.key,
    this.config,
    required this.title,
    required this.child,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final effectiveConfig = config ?? CardConfig.standard(isDark: palette.isDark);
    final theme = Theme.of(context);

    return Container(
      decoration: effectiveConfig.toBoxDecoration(),
      margin: margin ?? const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
            child: Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: palette.textPrimary,
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
