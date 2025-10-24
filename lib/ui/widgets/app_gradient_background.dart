import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';

/// Reusable background widget that applies the app's light/dark gradients.
class AppGradientBackground extends StatelessWidget {
  const AppGradientBackground({
    required this.child,
    super.key,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Container(
      decoration: BoxDecoration(
        gradient: palette.isDark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1A1C24), Color(0xFF252837)],
              )
            : AppGradients.backgroundFor(palette.brightness),
      ),
      child: child,
    );
  }
}
