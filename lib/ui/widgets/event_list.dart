import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../logic/providers/event_providers.dart';
import 'reschedule_status_badge.dart';

/// Simple event list widget - simplified for MVP
class EventList extends ConsumerWidget {
  final DateTime selectedDate;
  final List<CalendarEvent> events;

  const EventList({
    super.key,
    required this.selectedDate,
    this.events = const [],
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (events.isEmpty) {
      return _buildEmptyState();
    }

    return ListView.builder(
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        return _buildEventCard(event, context, ref);
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.event_note,
            size: 64,
            color: Colors.grey.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          Text(
            'No events scheduled',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey.withValues(alpha: 0.7),
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the + button to add your first event',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.withValues(alpha: 0.6),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildEventCard(
      CalendarEvent event, BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final iconColor = colorScheme.onSurface.withValues(alpha: 0.65);
    final timingStyle = theme.textTheme.bodyMedium?.copyWith(
      color: colorScheme.onSurface.withValues(alpha: 0.8),
      fontWeight: FontWeight.w600,
    );
    final timingSecondaryStyle = theme.textTheme.bodySmall?.copyWith(
      color: colorScheme.onSurface.withValues(alpha: 0.65),
    );
    final descriptionStyle = theme.textTheme.bodyMedium?.copyWith(
      color: colorScheme.onSurface.withValues(alpha: 0.75),
    );

    final timeFormat = DateFormat('h:mm a');
    final dateTimeFormat = DateFormat('EEE, MMM d • h:mm a');

    final dayStart =
        DateTime(selectedDate.year, selectedDate.month, selectedDate.day);
    final dayEnd = dayStart.add(const Duration(days: 1));

    final startsToday = _isSameDay(event.start, selectedDate);
    final endsToday = _isSameDay(event.end, selectedDate);
    final continuesFromPrevious = event.start.isBefore(dayStart);
    final continuesBeyond = event.end.isAfter(dayEnd);
    final isMultiDay = !_isSameDay(event.start, event.end);

    String daySummary;
    if (!continuesFromPrevious && !continuesBeyond) {
      daySummary =
          '${timeFormat.format(event.start)} – ${timeFormat.format(event.end)}';
    } else if (!continuesFromPrevious && continuesBeyond) {
      daySummary = '${timeFormat.format(event.start)} → end of day';
    } else if (continuesFromPrevious && !continuesBeyond) {
      daySummary = 'Until ${timeFormat.format(event.end)}';
    } else {
      daySummary = 'All day (in progress)';
    }

    final supplementary = <String>[];
    if (!startsToday) {
      supplementary.add('Started ${dateTimeFormat.format(event.start)}');
    }
    if (!endsToday) {
      supplementary.add('Ends ${dateTimeFormat.format(event.end)}');
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    event.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'delete') {
                      _showDeleteConfirmation(context, event, ref);
                    }
                  },
                  itemBuilder: (BuildContext context) => [
                    const PopupMenuItem<String>(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Delete'),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            if (event.rescheduleStatus != EventRescheduleStatus.none) ...[
              const SizedBox(height: 8),
              RescheduleStatusBadge(status: event.rescheduleStatus),
            ],
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.access_time,
                  size: 18,
                  color: iconColor,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        daySummary,
                        style: timingStyle,
                      ),
                      for (final line in supplementary)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            line,
                            style: timingSecondaryStyle,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (isMultiDay) ...[
              const SizedBox(height: 8),
              Chip(
                avatar: Icon(
                  Icons.calendar_month,
                  size: 16,
                  color: theme.colorScheme.primary,
                ),
                label: const Text('Spans multiple days'),
              ),
            ],
            if (event.description?.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              Text(
                event.description!,
                style: descriptionStyle,
              ),
            ],
          ],
        ),
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  void _showDeleteConfirmation(
      BuildContext context, CalendarEvent event, WidgetRef ref) {
    showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Event'),
        content: Text('Are you sure you want to delete "${event.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    ).then((confirmed) async {
      if (confirmed == true) {
        try {
          await ref.read(eventListProvider.notifier).deleteEvent(event.id);

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Event "${event.title}" deleted successfully'),
                backgroundColor: Colors.green,
              ),
            );
          }
        } catch (e) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to delete event: ${e.toString()}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    });
  }
}
