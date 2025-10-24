import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import 'accessibility/semantic_button.dart';

/// Circular add button used across dashboard, calendar, and events screens.
class AddCircleButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String semanticsLabel;
  final String? semanticsHint;
  final Widget? icon;
  final double size;

  const AddCircleButton({
    super.key,
    required this.onPressed,
    required this.semanticsLabel,
    this.semanticsHint,
    this.icon,
    this.size = 56,
  });

  @override
  Widget build(BuildContext context) {
    return SemanticButton(
      label: semanticsLabel,
      hint: semanticsHint,
      onPressed: onPressed,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: AppColors.cardBlue,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.16),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: icon ??
                  const Icon(
                    Icons.add,
                    size: 28,
                    color: Colors.white,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}
