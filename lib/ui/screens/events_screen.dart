import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../core/timezone_service.dart';
import '../../core/color_utils.dart';
import '../../logic/utils/contact_color_resolver.dart';
import '../widgets/accessibility/semantic_button.dart';
import 'create_event_screen.dart';
import '../widgets/quick_event_sheet.dart';
import '../widgets/reschedule_status_badge.dart';

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventListProvider);
    final settingsAsync = ref.watch(settingsControllerProvider);
    final timeZone = settingsAsync.maybeWhen(
      data: (settings) => settings.timeZone,
      orElse: () => TimezoneService.defaultDisplayName,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFE6F3FF),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showQuickEventSheet(context, timeZone),
        icon: const Icon(Icons.bolt),
        label: const Text('Quick event'),
      ),
      body: SafeArea(
        minimum: const EdgeInsets.only(top: 24),
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
          data: (events) => _buildContent(context, ref, events, timeZone),
        ),
      ),
    );
  }

  Widget _buildContent(
    BuildContext context,
    WidgetRef ref,
    List<CalendarEvent> events,
    String timeZone,
  ) {
    // Calculate event counts by privacy level
    final normalEvents = events.where((e) => e.privacyLevel == EventPrivacyLevel.normal).length;
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
                    onPressed: () => _showCreateEventDialog(context),
                    child: ElevatedButton.icon(
                      onPressed: () => _showCreateEventDialog(context),
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
                    return _buildEventCard(
                      context,
                      ref,
                      event,
                      timeZone,
                      events,
                    );
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
    BuildContext context,
    WidgetRef ref,
    CalendarEvent event,
    String timeZone,
    List<CalendarEvent> allEvents,
  ) {
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

    final formattedWindow = TimezoneService.formatEventWindow(
      start: event.start,
      end: event.end,
      displayName: timeZone,
    );

    // Resolve connection color and highlight contact
    final contactsAsync = ref.watch(contactListProvider);
    final contactsData = contactsAsync.maybeWhen(
      data: (contactList) => contactList,
      orElse: () => <Contact>[],
    );

    final eventColor = ContactColorResolver.resolveColor(
      event: event,
      contacts: contactsData,
      allEvents: allEvents,
    );
    final highlightContact = ContactColorResolver.preferredContactForEvent(
      event: event,
      contacts: contactsData,
      allEvents: allEvents,
    );
    final partnerName = highlightContact?.name;
    final additionalInvitees =
        partnerName == null ? 0 : (event.invitedPartnerIds.length - 1).clamp(0, 99);
    final iconColor = ContactColorUtils.onColor(eventColor);

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
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: eventColor,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: Text(
                emoji,
                style: TextStyle(fontSize: 28, color: iconColor),
              ),
            ),
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
                if (event.rescheduleStatus != EventRescheduleStatus.none) ...[
                  RescheduleStatusBadge(
                    status: event.rescheduleStatus,
                    dense: true,
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  '${formattedWindow.timeLabel} • ${formattedWindow.dateLabel}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF6B7280),
                  ),
                ),
                if (event.description != null && event.description!.isNotEmpty) ...[
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
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: eventColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        additionalInvitees > 0
                            ? 'with $partnerName +$additionalInvitees more'
                            : 'with $partnerName',
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
          const SizedBox(width: 8),
          // Edit button
          IconButton(
            icon: const Icon(Icons.edit_outlined, size: 20),
            color: const Color(0xFF7C3BFF),
            onPressed: () => _showEditEventDialog(context, event),
            tooltip: 'Edit event',
          ),
        ],
      ),
    );
  }

  /// Show create event dialog as a modal
  void _showCreateEventDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreateEventScreen(),
    );
  }

  /// Show edit event dialog
  void _showEditEventDialog(BuildContext context, CalendarEvent event) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CreateEventScreen(
        eventToEdit: event,
      ),
    );
  }

  void _showQuickEventSheet(
    BuildContext context,
    String timeZone,
  ) {
    showModalBottomSheet<QuickEventSheetResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => QuickEventSheet(timeZone: timeZone),
    ).then((result) {
      if (result == null || !result.openComposer) return;
      if (!context.mounted) return;
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => CreateEventScreen(
          initialTitle: result.draft.title,
          initialStart: result.draft.start,
          initialEnd: result.draft.end,
        ),
      );
    });
  }
}
