import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// Unused imports removed - will be added back during BLoC migration
// import 'package:intl/intl.dart';

import '../../../core/theme_constants.dart';
// import '../../../core/timezone_service.dart';
// import '../../../core/color_utils.dart';
// import '../../../domain/enums.dart';
// import '../../../domain/event.dart';
// import '../../../domain/contact.dart';
// import '../../logic/providers/contact_providers.dart'; // TODO: Migrate to BLoC
// import '../../logic/providers/event_providers.dart'; // TODO: Migrate to BLoC
// import '../../logic/providers/settings_providers.dart'; // TODO: Migrate to BLoC
// import '../../../logic/utils/contact_color_resolver.dart';
import '../../widgets/accessibility/semantic_button.dart';
// import '../../widgets/accessibility/semantic_card.dart';
import '../../widgets/accessibility/semantic_text.dart';
// import '../../widgets/reschedule_status_badge.dart';
import 'create_event_screen.dart';
import '../../widgets/add_circle_button.dart';

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
    // TODO: Migrate to BLoC - use EventCubit instead
    // final initialQuery = ref.read(eventSearchQueryProvider);
    _searchController = TextEditingController(text: '');
    _searchListener = () {
      // Local search only until migrated to BLoC
      setState(() {});
      // final currentText = _searchController.text;
      // if (ref.read(eventSearchQueryProvider) != currentText) {
      //   ref.read(eventSearchQueryProvider.notifier).setQuery(currentText);
      // }
    };
    _searchController.addListener(_searchListener);
  }

  @override
  void dispose() {
    _searchController.removeListener(_searchListener);
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // TODO: Migrate to BLoC - use EventCubit, SettingsCubit instead
    // final eventsAsync = ref.watch(eventListProvider);
    // final settingsAsync = ref.watch(settingsControllerProvider);
    // final searchQuery = ref.watch(eventSearchQueryProvider);
    final searchQuery = _searchController.text;
    // final timeZone = settingsAsync.maybeWhen(
    //   data: (settings) => settings.timeZone,
    //   orElse: () => TimezoneService.defaultDisplayName,
    // );

    // Listen to search query changes to sync with text controller
    // ref.listen<String>(
    //   eventSearchQueryProvider,
    //   (previous, next) {
    //     if (_searchController.text != next) {
    //       _searchController.text = next;
    //       _searchController.selection = TextSelection.fromPosition(
    //         TextPosition(offset: _searchController.text.length),
    //       );
    //     }
    //   },
    // );

    final palette = AppPalette.of(context);

    return Scaffold(
      backgroundColor: palette.background,
      body: Container(
        decoration: BoxDecoration(
            gradient: palette.isDark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A1C24), Color(0xFF252837)],
                  )
                : AppGradients.backgroundFor(palette.brightness)),
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
                // TODO: Migrate to BLoC - use EventCubit instead
                child: _buildEmptyState(context),
                // child: eventsAsync.when(
                //   data: (events) {
                //     if (events.isEmpty) {
                //       return _buildEmptyState(context);
                //     }
                //     final filteredEvents =
                //         _filterEvents(events, searchQuery, timeZone);
                //     if (filteredEvents.isEmpty) {
                //       return _buildNoResults(context, searchQuery);
                //     }
                //     return _buildEventsList(
                //       context,
                //       ref,
                //       filteredEvents,
                //       timeZone,
                //     );
                //   },
                //   loading: () => const Center(
                //     child: CircularProgressIndicator(),
                //   ),
                //   error: (error, stack) => Center(
                //     child: Text('Error: $error'),
                //   ),
                // ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final palette = AppPalette.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: SemanticHeading(
              label: 'Events',
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  SemanticImage(
                    label: 'Events section icon',
                    child: Image.asset(
                      'icons/events_icon.webp',
                      width: 80,
                      height: 80,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      'Events',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: palette.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AddCircleButton(
            semanticsLabel: 'Add new event',
            semanticsHint: 'Opens event creation dialog',
            onPressed: () => _showCreateEventDialog(context),
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

  // Unused methods removed - will be reimplemented during BLoC migration
  // List<CalendarEvent> _filterEvents(...) { ... }
  // Widget _buildEventsList(...) { ... }
  // Widget _buildEventCard(...) { ... }
  // Widget _buildNoResults(...) { ... }

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
                color: Colors.white.withValues(alpha: 0.9),
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

  // Unused methods removed - will be reimplemented during BLoC migration
  // void _showEditEventDialog(...) { ... }
  // void _confirmDeleteEvent(...) { ... }
}
