import 'package:flutter/material.dart';

/// Utility helpers to keep accessibility affordances consistent.
class AccessibilityUtils {
  AccessibilityUtils._();

  static const double minTouchTargetSize = 44.0;

  static Widget ensureMinTouchTarget({
    required Widget child,
    double minDimension = minTouchTargetSize,
  }) {
    return ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: minDimension,
        minHeight: minDimension,
      ),
      child: child,
    );
  }

  static Widget semanticButton({
    required Widget child,
    required String label,
    String? hint,
    VoidCallback? onPressed,
    bool enabled = true,
    bool selected = false,
  }) {
    return Semantics(
      label: label,
      hint: hint,
      button: true,
      enabled: enabled,
      selected: selected,
      onTap: onPressed,
      child: ensureMinTouchTarget(child: child),
    );
  }

  static Widget semanticHeading({
    required Widget child,
    required String label,
    int level = 1,
  }) {
    return Semantics(
      header: true,
      label: label,
      hint: level > 1 ? 'Heading level $level' : null,
      child: child,
    );
  }

  static Widget semanticTextField({
    required Widget child,
    required String label,
    String? hint,
    String? value,
    bool enabled = true,
    bool isRequired = false,
  }) {
    final computedHint = isRequired
        ? [
            if (hint != null && hint.isNotEmpty) hint,
            'Required field',
          ].join('. ')
        : hint;

    return Semantics(
      label: label,
      hint: computedHint,
      value: value,
      textField: true,
      enabled: enabled,
      child: child,
    );
  }

  static Widget semanticCard({
    required Widget child,
    required String label,
    String? hint,
    bool isButton = false,
    VoidCallback? onTap,
  }) {
    return Semantics(
      container: true,
      label: label,
      hint: hint,
      button: isButton,
      onTap: onTap,
      child: child,
    );
  }

  static Widget focusable({
    required Widget child,
    required String label,
    String? hint,
    VoidCallback? onTap,
    bool enabled = true,
  }) {
    return Focus(
      child: Semantics(
        button: onTap != null,
        enabled: enabled,
        label: label,
        hint: hint,
        onTap: onTap,
        child: child,
      ),
    );
  }

  static Widget liveRegion({
    required Widget child,
    required String label,
  }) {
    return Semantics(
      label: label,
      liveRegion: true,
      child: child,
    );
  }

  static Widget semanticGroup({
    required String label,
    required Widget child,
  }) {
    return Semantics(
      container: true,
      label: label,
      child: child,
    );
  }
}

/// Extension helpers for widgets to opt into the utilities.
extension AccessibilityExtension on Widget {
  Widget asSemanticButton({
    required String label,
    String? hint,
    VoidCallback? onPressed,
    bool enabled = true,
    bool selected = false,
  }) {
    return AccessibilityUtils.semanticButton(
      child: this,
      label: label,
      hint: hint,
      onPressed: onPressed,
      enabled: enabled,
      selected: selected,
    );
  }

  Widget asSemanticHeading({required String label, int level = 1}) {
    return AccessibilityUtils.semanticHeading(
      child: this,
      label: label,
      level: level,
    );
  }

  Widget withMinTouchTarget([double size = AccessibilityUtils.minTouchTargetSize]) {
    return AccessibilityUtils.ensureMinTouchTarget(
      child: this,
      minDimension: size,
    );
  }

  Widget asSemanticCard({
    required String label,
    String? hint,
    bool isButton = false,
    VoidCallback? onTap,
  }) {
    return AccessibilityUtils.semanticCard(
      child: this,
      label: label,
      hint: hint,
      isButton: isButton,
      onTap: onTap,
    );
  }
}
