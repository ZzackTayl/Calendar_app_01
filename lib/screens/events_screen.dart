import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/event_provider.dart';
import '../widgets/add_event_dialog.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFB7F0FF), Color(0xFFF7C8FF)],
          ),
        ),
        child: SafeArea(
          child: Consumer<EventProvider>(
            builder: (context, eventProvider, _) {
              final allEvents = eventProvider.events;
              final normalEvents =
                  allEvents.where((event) => event.partnerId != null).length;
              final privateEvents =
                  allEvents.where((event) => event.partnerId == null).length;

              return SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 24),
                    _buildEventsSummary(normalEvents + privateEvents,
                        normalEvents, privateEvents),
                    const SizedBox(height: 24),
                    _buildEventsList(allEvents),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        TextButton.icon(
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushReplacementNamed(context, '/dashboard');
            }
          },
          style: TextButton.styleFrom(
            foregroundColor: Colors.black87,
            textStyle:
                const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          label: const Text('Back'),
        ),
        const Spacer(),
        GestureDetector(
          onTap: () => _showAddEventDialog(context),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF8B2E5B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.add, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'New Event',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEventsSummary(
      int totalEvents, int normalEvents, int privateEvents) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your Events',
            style: TextStyle(
              color: Colors.black87,
              fontWeight: FontWeight.w700,
              fontSize: 24,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Manage your upcoming activities',
            style: TextStyle(
              color: Colors.black54,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _buildSummaryBox(
                  'Total Events',
                  totalEvents.toString(),
                  const Color(0xFF7C3BFF),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildSummaryBox(
                  'Normal',
                  normalEvents.toString(),
                  const Color(0xFF4CAF50),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildSummaryBox(
                  'Private',
                  privateEvents.toString(),
                  const Color(0xFFFF7043),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black54.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 24,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Colors.black54,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventsList(List<CalendarEvent> events) {
    if (events.isEmpty) {
      return _buildEmptyState();
    }

    // Sort events by date (upcoming first)
    final sortedEvents = List<CalendarEvent>.from(events);
    sortedEvents.sort((a, b) => a.date.compareTo(b.date));

    return Column(
      children: sortedEvents.map((event) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: _buildEventCard(event),
        );
      }).toList(),
    );
  }

  Widget _buildEventCard(CalendarEvent event) {
    final timeLabel = event.time != null && event.time!.isNotEmpty
        ? event.time!
        : DateFormat('h:mm a').format(event.date);
    final dateLabel = DateFormat('EEE, MMM d').format(event.date);

    // Determine event type and color
    final isPrivate = event.partnerId == null;
    Color eventColor;
    IconData icon;

    if (isPrivate) {
      eventColor = const Color(0xFFFF7043); // Orange for private
      icon = Icons.lock;
    } else if (event.title.toLowerCase().contains('date')) {
      eventColor = const Color(0xFF7C3BFF); // Purple for date night
      icon = Icons.favorite;
    } else if (event.title.toLowerCase().contains('coffee')) {
      eventColor = const Color(0xFFFFC107); // Yellow for coffee
      icon = Icons.favorite;
    } else if (event.title.toLowerCase().contains('board game')) {
      eventColor = const Color(0xFF4CAF50); // Green for board games
      icon = Icons.casino;
    } else {
      eventColor = const Color(0xFF7C3BFF); // Default purple
      icon = Icons.favorite;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: eventColor,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              icon,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: const TextStyle(
                    color: Colors.black87,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$timeLabel • $dateLabel',
                  style: const TextStyle(
                    color: Colors.black54,
                    fontSize: 14,
                  ),
                ),
                if (event.description != null &&
                    event.description!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    event.description!,
                    style: const TextStyle(
                      color: Colors.black54,
                      fontSize: 13,
                    ),
                  ),
                ],
                if (event.partnerName != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: eventColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'with ${event.partnerName}',
                        style: const TextStyle(
                          color: Colors.black54,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            Icons.event_note_outlined,
            size: 64,
            color: Colors.black54.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            'No events yet',
            style: TextStyle(
              color: Colors.black87,
              fontWeight: FontWeight.w600,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Create your first event to get started',
            style: TextStyle(
              color: Colors.black54,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: () => _showAddEventDialog(context),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF8B2E5B),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Create Event',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddEventDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AddEventDialog(
          selectedDate: DateTime.now(),
          onEventAdded: () {
            setState(() {});
          },
        );
      },
    );
  }
}
