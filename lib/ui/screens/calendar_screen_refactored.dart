import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import '../widgets/app_gradient_background.dart';

/// Placeholder implementation for the refactored calendar screen.
///
/// The production widget is still under active development. Keeping this stub
/// in the tree allows dependent routes/tests to compile while the real UI
/// components are finalized.
class CalendarScreenRefactored extends StatelessWidget {
  const CalendarScreenRefactored({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Scaffold(
      backgroundColor: palette.background,
      body: AppGradientBackground(
        child: const Center(
          child: Text('CalendarScreenRefactored is under construction.'),
        ),
      ),
    );
  }
}
