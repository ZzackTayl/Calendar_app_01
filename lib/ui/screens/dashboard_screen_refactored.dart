import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import '../widgets/app_gradient_background.dart';

/// Placeholder widget for the refactored dashboard experience.
///
/// The finished implementation will assemble modular dashboard components.
/// Until then this stub documents the intended route without breaking builds.
class DashboardScreenRefactored extends StatelessWidget {
  const DashboardScreenRefactored({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Scaffold(
      backgroundColor: palette.background,
      body: AppGradientBackground(
        child: const Center(
          child: Text('DashboardScreenRefactored is under construction.'),
        ),
      ),
    );
  }
}
