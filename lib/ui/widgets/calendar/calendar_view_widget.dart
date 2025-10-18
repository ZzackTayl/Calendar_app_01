import 'package:flutter/material.dart';

/// Placeholder for the refactored calendar view (month/week/day).
class CalendarViewWidget extends StatelessWidget {
  const CalendarViewWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Theme.of(context).colorScheme.surface,
      ),
      child: const Center(
        child: Text('Calendar view placeholder'),
      ),
    );
  }
}
