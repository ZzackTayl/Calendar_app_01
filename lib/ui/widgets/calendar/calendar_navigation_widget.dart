import 'package:flutter/material.dart';
import '../../../core/responsive_utils.dart';

/// Lightweight stand-in for the future calendar navigation header.
class CalendarNavigationWidget extends StatelessWidget {
  const CalendarNavigationWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(16),
      child: Text(
        'Calendar navigation placeholder',
        style: context.responsiveTextTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
