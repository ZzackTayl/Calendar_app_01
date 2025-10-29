import 'package:flutter/material.dart';

/// Accessible button wrapper that provides proper semantic labels for screen readers.
///
/// This widget wraps any button-like widget with appropriate semantics to ensure
/// screen readers can properly announce the button's purpose and state.
///
/// Example usage:
/// ```dart
/// SemanticButton(
///   label: 'Create new event',
///   hint: 'Opens event creation dialog',
///   onPressed: () => context.go('/calendar'),
///   child: ElevatedButton(
///     onPressed: () => context.go('/calendar'),
///     child: Text('New Event'),
///   ),
/// )
/// ```
///
/// Screen reader will announce: "Create new event, button. Opens event creation dialog"
class SemanticButton extends StatelessWidget {
  /// The semantic label that describes what the button does
  /// This is what screen readers will announce
  final String label;

  /// Optional hint providing additional context
  /// Announced after the label
  final String? hint;

  /// Whether the button is currently enabled
  /// When false, screen readers will announce "disabled"
  final bool enabled;

  /// The actual button widget to wrap
  final Widget child;

  /// Optional callback to detect when button is tapped
  /// Used for analytics or additional accessibility feedback
  final VoidCallback? onPressed;

  const SemanticButton({
    super.key,
    required this.label,
    this.hint,
    this.enabled = true,
    required this.child,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: true,
      enabled: enabled,
      onTap: onPressed,
      child: ExcludeSemantics(
        child: child,
      ),
    );
  }
}

/// Accessible icon button wrapper with proper semantic labels.
///
/// Use this for icon-only buttons to ensure screen readers announce
/// the button's purpose, not just "button" or the icon name.
///
/// Example usage:
/// ```dart
/// SemanticIconButton(
///   label: 'Notifications',
///   hint: '3 unread notifications',
///   icon: Icons.notifications,
///   onPressed: () => context.go('/activity'),
/// )
/// ```
///
/// Screen reader will announce: "Notifications, button. 3 unread notifications"
class SemanticIconButton extends StatelessWidget {
  /// The semantic label describing the button's action
  final String label;

  /// Optional hint providing additional context (e.g., badge count)
  final String? hint;

  /// The icon to display as an [IconData].
  /// Provide either [icon] or [iconWidget].
  final IconData? icon;

  /// Custom icon widget, for example when using image assets.
  final Widget? iconWidget;

  /// Icon size
  final double? size;

  /// Icon color
  final Color? color;

  /// Callback when button is pressed
  final VoidCallback? onPressed;

  /// Whether the button is enabled
  final bool enabled;

  const SemanticIconButton({
    super.key,
    required this.label,
    this.hint,
    this.icon,
    this.iconWidget,
    this.size,
    this.color,
    this.onPressed,
    this.enabled = true,
  }) : assert(
          icon != null || iconWidget != null,
          'Provide either icon or iconWidget.',
        );

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      hint: hint,
      button: true,
      enabled: enabled,
      excludeSemantics: true,
      onTap: onPressed,
      child: IconButton(
        icon: iconWidget ??
            Icon(
              icon!,
              size: size,
              color: color,
            ),
        onPressed: enabled ? onPressed : null,
        tooltip: '',  // Empty tooltip prevents default semantics
      ),
    );
  }
}
