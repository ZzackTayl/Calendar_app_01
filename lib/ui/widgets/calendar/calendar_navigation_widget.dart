import 'package:flutter/material.dart';

/// Lightweight stand-in for the future calendar navigation header.
class CalendarNavigationWidget extends StatelessWidget {
  const CalendarNavigationWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(16),
      child: Text(
        'Calendar navigation placeholder',
        style: TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  }
}
