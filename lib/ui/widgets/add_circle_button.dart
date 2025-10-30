import 'package:flutter/material.dart';

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
          child: SizedBox.square(
            dimension: size,
            child: Center(
              child: icon ??
                  Image.asset(
                    'icons/plus_button_blue.webp',
                    width: size,
                    height: size,
                    fit: BoxFit.contain,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}
