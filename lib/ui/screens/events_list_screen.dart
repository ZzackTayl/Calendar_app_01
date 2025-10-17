import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../core/timezone_service.dart';
import '../../core/color_utils.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../logic/utils/contact_color_resolver.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import '../widgets/reschedule_status_badge.dart';
import 'create_event_screen.dart';

/// Events List Screen - displays all events in a scrollable list with search
class EventsListScreen extends ConsumerStatefulWidget {
  const EventsListScreen({super.key});

  @override
  ConsumerState<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends ConsumerState<EventsListScreen> {
  late final TextEditingController _searchController;
  late final VoidCallback _searchListener;

  @override
  void initState() {
    super.initState();
    final initialQuery = ref.read(eventSearchQueryProvider);
    _searchController = TextEditingController(text: initialQuery);
    _searchListener = () {
      final currentText = _searchController.text;
      if (ref.read(eventSearchQueryProvider) != currentText) {
        ref.read(eventSearchQueryProvider.notifier).setQuery(currentText);
      }
    };
    _searchController.addListener(_searchListener);
    ref.listen<String>(
      eventSearchQueryProvider,
      (previous, next) {
        if (_searchController.text != next) {
          _searchController.text = next;
          _searchController.selection = TextSelection.fromPosition(
            TextPosition(offset: _searchController.text.length),
          );
        }
      },
    );
  }

  @override
  void dispose() {
    _searchController.removeListener(_searchListener);
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(eventListProvider);
    final settingsAsync = ref.watch(settingsControllerProvider);
    final searchQuery = ref.watch(eventSearchQueryProvider);
    final timeZone = settingsAsync.maybeWhen(
      data: (settings) => settings.timeZone,
      orElse: () => TimezoneService.defaultDisplayName,
    );

    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      body: Container(
        decoration: BoxDecoration(
            gradient: AppGradients.backgroundFor(palette.brightness)),
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: _buildSearchField(context, searchQuery),
              ),
              Expanded(
                child: eventsAsync.when(
                  data: (events) {
                    if (events.isEmpty) {
                      return _buildEmptyState(context);
                    }
                    final filteredEvents =
                        _filterEvents(events, searchQuery, timeZone);
                    if (filteredEvents.isEmpty) {
                      return _buildNoResults(context, searchQuery);
                    }
                    return _buildEventsList(
                      context,
                      ref,
                      filteredEvents,
                      timeZone,
                    );
                  },
                  loading: () => const Center(
                    child: CircularProgressIndicator(),
                  ),
                  error: (error, stack) => Center(
                    child: Text('Error: $error'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SemanticHeading(
            child: Text(
              'Events',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          SemanticButton(
            label: 'Add new event',
            hint: 'Opens event creation dialog',
            onPressed: () => _showCreateEventDialog(context),
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(24),
                boxShadow: AppShadows.card,
              ),
              child: const Icon(
                Icons.add,
                color: Colors.white,
                size: 28,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchField(BuildContext context, String searchQuery) {
    final theme = Theme.of(context);
    return Semantics(
      label: 'Search events',
      hint: 'Filter events by name, description, or date',
      textField: true,
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.9),
          prefixIcon: const Icon(Icons.search, color: Colors.grey),
          suffixIcon: searchQuery.trim().isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.clear),
                  color: Colors.grey[600],
                  tooltip: 'Clear search',
                  onPressed: () {
                    _searchController.clear();
                  },
                ),
          hintText: 'Search all events...',
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide.none,
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
        ),
        style: theme.textTheme.bodyLarge?.copyWith(
          color: AppColors.textPrimary,
        ),
      ),
    );
  }

  List<CalendarEvent> _filterEvents(
    List<CalendarEvent> events,
    String query,
    String timeZone,
  ) {
    final trimmedQuery = query.trim();
    if (trimmedQuery.isEmpty) {
      return List<CalendarEvent>.from(events)
        ..sort((a, b) => a.start.compareTo(b.start));
    }

    final lowerQuery = trimmedQuery.toLowerCase();
    final sortedEvents = List<CalendarEvent>.from(events)
      ..sort((a, b) => a.start.compareTo(b.start));

    return sortedEvents.where((event) {
      final titleMatch = event.title.toLowerCase().contains(lowerQuery);
      final descriptionMatch =
          (event.description ?? '').toLowerCase().contains(lowerQuery);
      final window = TimezoneService.formatEventWindow(
        start: event.start,
        end: event.end,
        displayName: timeZone,
      );
      final windowText =
          '${window.dateLabel} ${window.timeLabel}'.toLowerCase();
      return titleMatch || descriptionMatch || windowText.contains(lowerQuery);
    }).toList();
  }

  Widget _buildEventsList(
    BuildContext context,
    WidgetRef ref,
    List<CalendarEvent> events,
    String timeZone,
  ) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      itemCount: events.length,
      separatorBuilder: (context, index) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final event = events[index];
        return _buildEventCard(context, ref, event, timeZone, events);
      },
    );
  }

  Widget _buildEventCard(
    BuildContext context,
    WidgetRef ref,
    CalendarEvent event,
    String timeZone,
    List<CalendarEvent> allEvents,
  ) {
    final formattedWindow = TimezoneService.formatEventWindow(
      start: event.start,
      end: event.end,
      displayName: timeZone,
    );
    final tzStart = TimezoneService.convert(event.start, timeZone);
    final startDisplay = DateFormat('h:mm a').format(tzStart);
    final startParts = startDisplay.split(' ');

    final contactsAsync = ref.watch(contactListProvider);
    final contacts = contactsAsync.maybeWhen(
      data: (value) => value,
      orElse: () => const <Contact>[],
    );

    final accentColor = ContactColorResolver.resolveColor(
      event: event,
      contacts: contacts,
      allEvents: allEvents,
    );
    final highlightContact = ContactColorResolver.preferredContactForEvent(
      event: event,
      contacts: contacts,
      allEvents: allEvents,
    );
    final partnerName = highlightContact?.name;
    final additionalInvitees = partnerName == null
        ? 0
        : (event.invitedPartnerIds.length - 1).clamp(0, 99);
    final onAccent = ContactColorUtils.onColor(accentColor);

    return SemanticCard(
      label: event.title,
      hint: '${formattedWindow.timeLabel} on ${formattedWindow.dateLabel}',
      isButton: true,
      onTap: () => _showEditEventDialog(context, event),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              accentColor.withValues(alpha: 0.18),
              accentColor.withValues(alpha: 0.08),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: accentColor.withValues(alpha: 0.3),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: accentColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    startParts.first,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: onAccent,
                    ),
                  ),
                  Text(
                    startParts.length > 1 ? startParts[1] : '',
                    style: TextStyle(
                      fontSize: 10,
                      color: onAccent.withValues(alpha: 0.75),
                    ),
                  ),
                ],
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
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (event.rescheduleStatus != EventRescheduleStatus.none) ...[
                    RescheduleStatusBadge(
                      status: event.rescheduleStatus,
                      dense: true,
                    ),
                    const SizedBox(height: 6),
                  ],
                  Text(
                    '${formattedWindow.dateLabel} • ${formattedWindow.timeLabel}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  if (event.description != null &&
                      event.description!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      event.description!,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                  ],
                  if (partnerName != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: accentColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          additionalInvitees > 0
                              ? 'with $partnerName +$additionalInvitees more'
                              : 'with $partnerName',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            Column(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  color: AppColors.primary,
                  onPressed: () => _showEditEventDialog(context, event),
                  tooltip: 'Edit event',
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 20),
                  color: Colors.red,
                  onPressed: () => _confirmDeleteEvent(context, ref, event),
                  tooltip: 'Delete event',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoResults(BuildContext context, String query) {
    final trimmedQuery = query.trim();
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off_outlined,
              size: 64,
              color: Colors.white.withValues(alpha: 0.85),
            ),
            const SizedBox(height: 20),
            Text(
              'No events found',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Nothing matches "$trimmedQuery". Try a different keyword or clear the search.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.8),
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.event_available_outlined,
              size: 64,
              color: Colors.white.withValues(alpha: 0.8),
            ),
            const SizedBox(height: 24),
            const SemanticText(
              label: 'No events yet',
              isHeader: true,
              child: Text(
                'No events yet',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Create your first event to get started with your calendar',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.7),
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SemanticButton(
              label: 'Create your first event',
              hint: 'Opens event creation dialog',
              onPressed: () => _showCreateEventDialog(context),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: AppShadows.card,
                ),
                child: const Text(
                  'Create Event',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateEventDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreateEventScreen(),
    );
  }

  void _showEditEventDialog(BuildContext context, CalendarEvent event) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CreateEventScreen(eventToEdit: event),
    );
  }

  void _confirmDeleteEvent(
    BuildContext context,
    WidgetRef ref,
    CalendarEvent event,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Event?'),
        content: Text('Are you sure you want to delete "${event.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              ref.read(eventListProvider.notifier).deleteEvent(event.id);
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}
