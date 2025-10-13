import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/contact_providers.dart';
import '../widgets/accessibility/semantic_button.dart';

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventListProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFE6F3FF),
      body: SafeArea(
        child: eventsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: SelectableText.rich(
              TextSpan(
                children: [
                  const TextSpan(
                    text: 'Error: ',
                    style: TextStyle(color: Colors.red),
                  ),
                  TextSpan(text: error.toString()),
                ],
              ),
            ),
          ),
          data: (events) => _buildContent(context, ref, events),
        ),
      ),
    );
  }

  Widget _buildContent(
      BuildContext context, WidgetRef ref, List<CalendarEvent> events) {
    // Calculate event counts by privacy level
    final normalEvents =
        events.where((e) => e.privacyLevel == EventPrivacyLevel.normal).length;
    final privateEvents = events
        .where((e) =>
            e.privacyLevel == EventPrivacyLevel.exclusive ||
            e.privacyLevel == EventPrivacyLevel.superExclusive)
        .length;

    // Sort events by start time
    final sortedEvents = List<CalendarEvent>.from(events)
      ..sort((a, b) => a.start.compareTo(b.start));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with stats card
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Your Events',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1F2C3E),
                    ),
                  ),
                  SemanticButton(
                    label: 'New Event',
                    onPressed: () {
                      // TODO: Navigate to create event screen
                    },
                    child: ElevatedButton.icon(
                      onPressed: () {
                        // TODO: Navigate to create event screen
                      },
                      icon: const Icon(Icons.add, size: 20),
                      label: const Text('New Event'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFA64D79),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 14,
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Stats row
              Row(
                children: [
                  _buildStatItem(
                    count: events.length,
                    label: 'Total\nEvents',
                    color: const Color(0xFF7C3BFF),
                  ),
                  const SizedBox(width: 32),
                  _buildStatItem(
                    count: normalEvents,
                    label: 'Normal',
                    color: const Color(0xFF4CAF50),
                  ),
                  const SizedBox(width: 32),
                  _buildStatItem(
                    count: privateEvents,
                    label: 'Private',
                    color: const Color(0xFFFF9500),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Events list
        Expanded(
          child: sortedEvents.isEmpty
              ? const Center(
                  child: Text(
                    'No events yet',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.black54,
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: sortedEvents.length,
                  itemBuilder: (context, index) {
                    final event = sortedEvents[index];
                    return _buildEventCard(context, ref, event);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildStatItem({
    required int count,
    required String label,
    required Color color,
  }) {
    return Expanded(
      child: Column(
        children: [
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w900,
              color: color,
              height: 1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B7280),
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEventCard(
      BuildContext context, WidgetRef ref, CalendarEvent event) {
    // Determine emoji based on title or type
    String emoji = '💜'; // Default
    if (event.title.toLowerCase().contains('date')) {
      emoji = '💜';
    } else if (event.title.toLowerCase().contains('coffee') ||
        event.title.toLowerCase().contains('lunch') ||
        event.title.toLowerCase().contains('dinner')) {
      emoji = '🧡';
    } else if (event.title.toLowerCase().contains('game') ||
        event.title.toLowerCase().contains('board')) {
      emoji = '🎮';
    } else if (event.title.toLowerCase().contains('meet')) {
      emoji = '👥';
    }

    // Format dates
    final dateFormat = DateFormat('EEE, MMM d');
    final timeFormat = DateFormat('h:mm a');
    final startTime = timeFormat.format(event.start);
    final endTime = timeFormat.format(event.end);
    final date = dateFormat.format(event.start);

    // Get contact info for invited partners
    final contacts = ref.watch(contactListProvider);
    final contactsData = contacts.maybeWhen(
      data: (contactList) => contactList,
      orElse: () => <Contact>[],
    );

    // Get avatar color based on first invited partner
    Color avatarColor = const Color(0xFF7C6FD6); // Default purple
    String? partnerName;

    if (event.invitedPartnerIds.isNotEmpty) {
      final partnerId = event.invitedPartnerIds.first;
      final partner = contactsData.where((c) => c.id == partnerId).firstOrNull;

      if (partner != null) {
        partnerName = partner.name;
        // Assign color based on first letter
        if (partner.name.toLowerCase().startsWith('a')) {
          avatarColor = const Color(0xFF7C6FD6); // Purple
        } else if (partner.name.toLowerCase().startsWith('s')) {
          avatarColor = const Color(0xFFE89C4B); // Orange
        } else if (partner.name.toLowerCase().startsWith('j')) {
          avatarColor = const Color(0xFF5AC18E); // Green
        }
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Emoji icon
          Text(
            emoji,
            style: const TextStyle(fontSize: 40),
          ),
          const SizedBox(width: 16),
          // Event details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$startTime - $endTime • $date',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                  ),
                ),
                if (event.description != null &&
                    event.description!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    event.description!,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                ],
                if (partnerName != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: avatarColor,
                        child: Text(
                          partnerName[0].toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'with $partnerName',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF6B7280),
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
}
