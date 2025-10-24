import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../core/timezone_service.dart';
import '../../core/theme_constants.dart';
import '../../core/responsive_utils.dart';
import '../../core/color_utils.dart';
import '../../logic/utils/contact_color_resolver.dart';
import '../widgets/add_circle_button.dart';
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
    final textTheme = context.responsiveTextTheme;

    return Scaffold(
      backgroundColor: const Color(0xFFE6F3FF),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showQuickEventSheet(context, timeZone),
        icon: const Icon(Icons.bolt),
        label: const Text('Quick event'),
      ),
      body: SafeArea(
        minimum: const EdgeInsets.only(top: 48),
        child: eventsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stackTrace) => Center(
            child: SelectableText.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Error: ',
                    style: textTheme.bodyMedium?.copyWith(color: Colors.red),
                  ),
                  TextSpan(
                    text: error.toString(),
                    style: textTheme.bodyMedium,
                  ),
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
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;
    final textStyles = context.responsiveText;

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
            color: palette.surface,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: palette.cardShadow,
                blurRadius: 12,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LayoutBuilder(
                builder: (context, constraints) {
                  final isNarrow = constraints.maxWidth < 360;
                  final title = Text(
                    'Your Events',
                    style: textStyles.heading3.copyWith(
                      fontWeight: FontWeight.w800,
                      color: palette.textPrimary,
                    ),
                  );
                  final actionButton = AddCircleButton(
                    semanticsLabel: 'Create new event',
                    semanticsHint: 'Opens the create event dialog',
                    onPressed: () => _showCreateEventDialog(context),
                  );
                  if (isNarrow) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        title,
                        const SizedBox(height: 12),
                        actionButton,
                      ],
                    );
                  }
                  return Row(
                    children: [
                      Expanded(child: title),
                      const SizedBox(width: 16),
                      actionButton,
                    ],
                  );
                },
              ),
              const SizedBox(height: 24),
              // Stats row
              LayoutBuilder(
                builder: (context, constraints) {
                  const spacing = 16.0;
                  final maxWidth = constraints.maxWidth;
                  final isCompact = maxWidth < 540;
                  final stats = [
                    _buildStatItem(
                      context: context,
                      count: events.length,
                      label: 'Total\nEvents',
                      color: const Color(0xFF7C3BFF),
                      labelColor: palette.textSecondary,
                    ),
                    _buildStatItem(
                      context: context,
                      count: normalEvents,
                      label: 'Normal',
                      color: const Color(0xFF4CAF50),
                      labelColor: palette.textSecondary,
                    ),
                    _buildStatItem(
                      context: context,
                      count: privateEvents,
                      label: 'Private',
                      color: const Color(0xFFFF9500),
                      labelColor: palette.textSecondary,
                    ),
                  ];
                  final perRow = isCompact ? 2 : 3;
                  final itemWidth = (maxWidth - spacing * (perRow - 1)) / perRow;
                  return Wrap(
                    spacing: spacing,
                    runSpacing: spacing,
                    children: [
                      for (var i = 0; i < stats.length; i++)
                        SizedBox(
                          width: perRow == 2 && i == stats.length - 1
                              ? maxWidth
                              : itemWidth,
                          child: stats[i],
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),

        // Events list
        Expanded(
          child: sortedEvents.isEmpty
              ? Center(
                  child: Text(
                    'No events yet',
                    style: textTheme.bodyMedium?.copyWith(
                      color: palette.textSecondary,
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
    required BuildContext context,
    required int count,
    required String label,
    required Color color,
    required Color labelColor,
  }) {
    final textStyles = context.responsiveText;
    final textTheme = context.responsiveTextTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          count.toString(),
          style: textStyles.heading2.copyWith(
            fontWeight: FontWeight.w800,
            color: color,
            height: 1,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          textAlign: TextAlign.left,
          style: textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: labelColor,
            height: 1.3,
          ),
        ),
      ],
    );
  }

  Widget _buildEventCard(
    BuildContext context,
    WidgetRef ref,
    CalendarEvent event,
    String timeZone,
    List<CalendarEvent> allEvents,
  ) {
    final palette = AppPalette.of(context);
    final textTheme = context.responsiveTextTheme;
    final textStyles = context.responsiveText;

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
    final isSyncedEvent = _isSyncedCalendarEvent(event);
    final displayTitle =
        isSyncedEvent ? _syncedEventHeadline(event) : event.title;

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
    final additionalInvitees = partnerName == null
        ? 0
        : (event.invitedPartnerIds.length - 1).clamp(0, 99);
    final iconColor = ContactColorUtils.onColor(eventColor);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 48),
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
                      style: textStyles.heading3.copyWith(color: iconColor),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        displayTitle,
                        style: textStyles.heading4.copyWith(
                          fontWeight: FontWeight.w700,
                          color: palette.textPrimary,
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
                        style: textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: palette.textSecondary,
                        ),
                      ),
                      if (isSyncedEvent) ...[
                        const SizedBox(height: 8),
                        Text(
                          _syncedEventDetail(event),
                          style: textTheme.bodySmall?.copyWith(
                            color: palette.textTertiary,
                          ),
                        ),
                      ] else if (event.description != null &&
                          event.description!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          event.description!,
                          style: textTheme.bodySmall?.copyWith(
                            color: palette.textTertiary,
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
                            Flexible(
                              child: Text(
                                additionalInvitees > 0
                                    ? 'with $partnerName +$additionalInvitees more'
                                    : 'with $partnerName',
                                style: textTheme.bodySmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: palette.textSecondary,
                                ),
                                softWrap: true,
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
          ),
          Positioned(
            top: 0,
            right: 0,
            child: IconButton(
              icon: const Icon(Icons.edit_outlined, size: 20),
              color: const Color(0xFF7C3BFF),
              onPressed: () => _showEditEventDialog(context, event),
              tooltip: 'Edit event',
            ),
          ),
        ],
      ),
    );
  }

  bool _isSyncedCalendarEvent(CalendarEvent event) =>
      (event.externalProvider ?? '').trim().isNotEmpty;

  String _syncedEventHeadline(CalendarEvent event) {
    final provider = _normalizedProvider(event);
    if (provider == null) {
      return 'Event from a connected calendar';
    }
    return 'Event from ${_providerDisplayName(provider)}';
  }

  String _syncedEventDetail(CalendarEvent event) {
    final provider = _normalizedProvider(event);
    if (provider == null) {
      return 'This event comes from one of your connected calendars.';
    }
    return 'This event is synced from ${_providerDisplayName(provider)}.';
  }

  String? _normalizedProvider(CalendarEvent event) {
    final provider = event.externalProvider?.trim();
    if (provider == null || provider.isEmpty) {
      return null;
    }
    return provider.toLowerCase();
  }

  String _providerDisplayName(String provider) {
    switch (provider) {
      case 'google':
        return 'Google Calendar';
      case 'apple':
      case 'icloud':
        return 'Apple Calendar';
      case 'outlook':
        return 'Outlook Calendar';
      default:
        if (provider.isEmpty) {
          return 'a connected calendar';
        }
        final capitalized = provider.length == 1
            ? provider.toUpperCase()
            : '${provider[0].toUpperCase()}${provider.substring(1)}';
        return capitalized.contains('Calendar')
            ? capitalized
            : '$capitalized Calendar';
    }
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
