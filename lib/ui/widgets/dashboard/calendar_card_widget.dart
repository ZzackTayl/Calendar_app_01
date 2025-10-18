import 'package:flutter/material.dart';

/// Placeholder card summarising calendar state on the dashboard.
class CalendarCardWidget extends StatelessWidget {
  const CalendarCardWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Calendar overview',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 8),
            Text('This card will display upcoming event summaries.'),
          ],
        ),
      ),
    );
  }
}
