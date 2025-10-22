import 'package:flutter/material.dart';
import '../../../core/responsive_utils.dart';

/// Placeholder for the agenda view that lists events for a selected date.
class EventsSectionWidget extends StatelessWidget {
  const EventsSectionWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Upcoming events',
              style: context.responsiveTextTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        EventCardPlaceholder(),
        EventCardPlaceholder(),
      ],
    );
  }
}

class EventCardPlaceholder extends StatelessWidget {
  const EventCardPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 4),
            Text('Title', style: TextStyle(fontWeight: FontWeight.w600)),
            SizedBox(height: 8),
            Text('Time range • Participants'),
          ],
        ),
      ),
    );
  }
}
