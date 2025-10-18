import 'package:flutter/material.dart';

/// Placeholder widget for event statistics on the dashboard.
class EventsCardWidget extends StatelessWidget {
  const EventsCardWidget({super.key});

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
              'Event insights',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 8),
            Text('Metrics and quick links will appear here.'),
          ],
        ),
      ),
    );
  }
}
