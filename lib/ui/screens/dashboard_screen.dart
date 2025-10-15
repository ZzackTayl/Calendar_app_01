import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../core/timezone_service.dart';
import '../../domain/availability_signal.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/signal_providers.dart';
import '../../logic/providers/settings_providers.dart';
import '../../logic/services/dev_data_service.dart';
import '../../logic/services/signals_service.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';
import 'create_event_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  bool _isActivityExpanded = false;

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(settingsControllerProvider);
    final timeZone = settingsAsync.maybeWhen(
      data: (settings) => settings.timeZone,
      orElse: () => TimezoneService.defaultDisplayName,
    );
    final now = TimezoneService.nowIn(timeZone);
    final weekStart = _startOfWeek(now);
    final weekEvents = ref.watch(eventsForWeekProvider(weekStart));
    final upcomingEvents = ref.watch(upcomingEventsProvider);
    final nextEvent = upcomingEvents.isNotEmpty ? upcomingEvents.first : null;
    final pendingInvites = ref.watch(pendingInvitesProvider);
    final connectedPartners = ref.watch(connectedPartnersProvider);
    final recentActivity = DevDataService.getMockRecentActivity();
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final mySignals = mySignalsAsync.asData?.value ?? const [];
    final sharedSignals = sharedSignalsAsync.asData?.value ?? const [];

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(context),
                const SizedBox(height: 12),
                _buildActionButtons(context),
                const SizedBox(height: 16),
                _buildGreeting(),
                const SizedBox(height: 12),
                _buildCalendarCard(context, nextEvent, now, timeZone),
                const SizedBox(height: 8),
                _buildEventsCard(
                  context,
                  weekEvents.length,
                  upcomingEvents.length,
                ),
                const SizedBox(height: 8),
                _buildRecentActivity(context, recentActivity, now, timeZone),
                const SizedBox(height: 8),
                _buildPeopleGroupsCard(
                  context,
                  pendingInvites.length,
                  connectedPartners.length,
                ),
                const SizedBox(height: 8),
                _buildSignalsCard(
                  context,
                  mySignals,
                  sharedSignals,
                  timeZone,
                ),
                const SizedBox(height: 8),
                _buildBottomCards(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // MyOrbit logo
        // Screen reader: "MyOrbit logo"
        Semantics(
          label: 'MyOrbit logo',
          excludeSemantics: true,
          child: SemanticImage(
            label: 'MyOrbit logo',
            child: Image.asset(
              'assets/images/myorbit_logo.png',
              width: 50,
              height: 50,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.public, color: Colors.blue),
                );
              },
            ),
          ),
        ),
        // Notification bell
        // Screen reader: "Notifications, button. You have unread notifications"
        SemanticIconButton(
          label: 'Notifications',
          hint: 'You have unread notifications',
          icon: Icons.notifications,
          size: 28,
          color: AppColors.textPrimary,
          onPressed: () => context.go('/activity'),
          enabled: true,
        ),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      children: [
        // Screen reader: "Create new event, button. Opens event creation dialog"
        Expanded(
          child: SemanticButton(
            label: 'Create new event',
            hint: 'Opens event creation dialog',
            onPressed: () => _showCreateEventDialog(context),
            child: ElevatedButton.icon(
              onPressed: () => _showCreateEventDialog(context),
              icon: const Icon(Icons.add, size: 24),
              label: const Text(
                'New Event',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.cardBlue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 2,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Screen reader: "Add partner, button. Opens partner invitation screen"
        Expanded(
          child: SemanticButton(
            label: 'Add partner',
            hint: 'Opens partner invitation screen',
            onPressed: () => context.go('/people'),
            child: ElevatedButton.icon(
              onPressed: () => context.go('/people'),
              icon: const Icon(Icons.person_add, size: 24),
              label: const Text(
                'Add Partner',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.cardMaroon,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGreeting() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Screen reader: "Good morning, heading" (emoji excluded for clarity)
        SemanticHeading(
          label: 'Good morning',
          child: const Row(
            children: [
              Text(
                'Good morning! ',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              Text(
                '👋',
                style: TextStyle(fontSize: 32),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Here\'s what\'s happening with your calendar',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[700],
          ),
        ),
      ],
    );
  }

  Widget _buildEventsCard(
    BuildContext context,
    int eventsThisWeek,
    int upcomingCount,
  ) {
    final weekLabel = _formatCount(
      eventsThisWeek,
      singular: 'event this week',
      plural: 'events this week',
      zeroText: 'No events this week',
    );

    final upcomingLabel = _formatCount(
      upcomingCount,
      singular: 'upcoming event',
      plural: 'upcoming events',
      zeroText: 'No upcoming events',
    );

    final weekMetricLabel = eventsThisWeek == 0
        ? 'No events this week'
        : '$eventsThisWeek ${eventsThisWeek == 1 ? 'event this week' : 'events this week'}';
    final upcomingMetricLabel = upcomingCount == 0
        ? 'Add an upcoming event'
        : '$upcomingCount ${upcomingCount == 1 ? 'upcoming event' : 'upcoming events'}';

    return SemanticCard(
      label: 'Events card',
      hint:
          '$weekLabel, $upcomingLabel. Tap to view all events and manage them.',
      isButton: true,
      onTap: () => context.go('/calendar'),
      child: GestureDetector(
        key: const Key('events_card'),
        onTap: () => context.go('/calendar'),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.cardBlue,
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              DecorativeElement(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.add,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Events',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Create and manage events',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 120,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      weekMetricLabel,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.right,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      upcomingMetricLabel,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCalendarCard(
    BuildContext context,
    CalendarEvent? nextEvent,
    DateTime now,
    String timeZone,
  ) {
    final event = nextEvent;
    final nextEventTitle = event?.title ?? 'No upcoming events yet';
    final nextEventWindow = event != null
        ? TimezoneService.formatEventWindow(
            start: event.start,
            end: event.end,
            displayName: timeZone,
          )
        : null;
    final nextEventSubtitle = nextEventWindow != null
        ? '${nextEventWindow.dateLabel} • ${nextEventWindow.timeLabel}'
        : 'Add events to see them here';
    final zoneAbbrev =
        TimezoneService.abbreviationFor(timeZone, reference: now);

    return SemanticCard(
      label: 'Calendar card',
      hint: event != null
          ? 'Next event ${event.title}, ${nextEventWindow!.timeLabel} on ${nextEventWindow.dateLabel}. Tap to view calendar.'
          : 'No events scheduled. Tap to add one.',
      isButton: true,
      onTap: () => context.go('/calendar'),
      child: GestureDetector(
        key: const Key('calendar_card'),
        onTap: () => context.go('/calendar'),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.cardMaroon,
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              // Decorative icon - hidden from screen readers
              DecorativeElement(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.calendar_today,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Calendar',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventTitle,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      nextEventSubtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '$timeZone ($zoneAbbrev)',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPeopleGroupsCard(
    BuildContext context,
    int pendingCount,
    int connectedCount,
  ) {
    final pendingLabel = _formatCount(
      pendingCount,
      singular: 'pending invite',
      plural: 'pending invites',
      zeroText: 'No pending invites',
    );

    final connectedLabel = _formatCount(
      connectedCount,
      singular: 'connected partner',
      plural: 'connected partners',
      zeroText: 'No connected partners',
    );

    return SemanticCard(
      label: 'People and Groups card',
      hint:
          '$pendingLabel, $connectedLabel. Tap to manage your connections and permissions.',
      isButton: true,
      onTap: () => context.go('/people'),
      child: GestureDetector(
        key: const Key('people_groups_card'),
        onTap: () => context.go('/people'),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.cardBlue,
            borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
            boxShadow: AppShadows.card,
          ),
          child: Row(
            children: [
              // Decorative icon - hidden from screen readers
              DecorativeElement(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.3),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.people,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'People & Groups',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Manage your connections',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 120,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      pendingLabel,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                      textAlign: TextAlign.right,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      connectedLabel,
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                      textAlign: TextAlign.right,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSignalsCard(
    BuildContext context,
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
    String timeZone,
  ) {
    final totalSignals = mySignals.length + sharedSignals.length;
    final now = TimezoneService.nowIn(timeZone);
    final combinedHighlights = <_DashboardSignalHighlight>[
      ...mySignals.map(
        (signal) => _DashboardSignalHighlight(signal: signal, isOwn: true),
      ),
      ...sharedSignals.map(
        (signal) => _DashboardSignalHighlight(signal: signal, isOwn: false),
      ),
    ]
      ..retainWhere((entry) => entry.signal.endTime.isAfter(now))
      ..sort((a, b) => a.signal.startTime.compareTo(b.signal.startTime));
    final highlightsToShow = combinedHighlights.take(3).toList();

    final label = totalSignals == 0
        ? 'No active signals yet'
        : '$totalSignals signal${totalSignals == 1 ? '' : 's'} active';

    return SemanticCard(
      label: 'Availability signals',
      hint:
          'View and manage availability signals. Double tap to open the signal center.',
      isButton: true,
      onTap: () => context.push('/signals'),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.cardDark,
          borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
          boxShadow: AppShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DecorativeElement(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.25),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.wifi_tethering,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Availability',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 15,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                    ],
                  ),
                ),
                FilledButton.tonal(
                  onPressed: () => context.push('/signals'),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 12),
                  ),
                  child: const Text('View Signals'),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildSummaryChip(
                  label: '${mySignals.length} mine',
                  color: AppColors.signalAvailable,
                ),
                _buildSummaryChip(
                  label: '${sharedSignals.length} partner',
                  color: AppColors.signalShared,
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (highlightsToShow.isEmpty)
              Text(
                'No availability windows are active. Share a signal when you want your circle to reach out.',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              )
            else
              Column(
                children: highlightsToShow
                    .map(
                      (entry) => _SignalHighlightTile(
                        entry: entry,
                        timeZone: timeZone,
                      ),
                    )
                    .toList(),
              ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => context.push(
                      '/signal-availability',
                      extra: TimezoneService.nowIn(timeZone),
                    ),
                    icon: const Icon(Icons.add_circle_outline),
                    label: const Text('Share availability'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.signalAvailable,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.go('/calendar'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(
                          color: Colors.white.withValues(alpha: 0.4)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Calendar view'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryChip({required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildBottomCards(BuildContext context) {
    return Row(
      children: [
        // Screen reader: "Settings card, button. Privacy and preferences. Tap to open settings"
        Expanded(
          child: SemanticCard(
            label: 'Settings card',
            hint: 'Privacy and preferences. Tap to open settings',
            isButton: true,
            onTap: () => context.go('/settings'),
            child: GestureDetector(
              key: const Key('settings_card'),
              onTap: () => context.go('/settings'),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.cardMaroon,
                  borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Decorative icon - hidden from screen readers
                    DecorativeElement(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.settings,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Settings',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Privacy &\npreferences',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Screen reader: "Updates and Guides card, button. Tips and tutorials. Tap to view guides"
        Expanded(
          child: SemanticCard(
            label: 'Updates and Guides card',
            hint: 'Tips and tutorials. Tap to view guides',
            isButton: true,
            onTap: () => context.go('/updates-guides'),
            child: GestureDetector(
              key: const Key('updates_guides_card'),
              onTap: () => context.go('/updates-guides'),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.cardBlue,
                  borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Decorative icon - hidden from screen readers
                    DecorativeElement(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.3),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.menu_book,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Updates &\nGuides',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tips &\ntutorials',
                      style: TextStyle(
                        fontSize: 15,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentActivity(
    BuildContext context,
    List<Map<String, dynamic>> activities,
    DateTime now,
    String timeZone,
  ) {
    final items = activities.take(3).toList();
    final zoneAbbrev =
        TimezoneService.abbreviationFor(timeZone, reference: now);

    return SemanticCard(
      label: 'Recent activity card',
      hint: items.isEmpty
          ? 'No recent activity yet'
          : 'Tap to expand or collapse the activity list',
      isButton: true,
      onTap: () {
        setState(() {
          _isActivityExpanded = !_isActivityExpanded;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.cardMaroon,
          borderRadius: BorderRadius.circular(AppBorderRadius.xLarge),
          boxShadow: AppShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const SemanticHeading(
                  child: Text(
                    'Recent Activity',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                Row(
                  children: [
                    SemanticButton(
                      label: 'View Activity',
                      hint: 'Open the full activity feed',
                      onPressed: () => context.go('/activity'),
                      child: TextButton(
                        onPressed: () => context.go('/activity'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('View Activity'),
                      ),
                    ),
                    IconButton(
                      icon: Icon(
                        _isActivityExpanded
                            ? Icons.expand_less
                            : Icons.expand_more,
                        color: Colors.white,
                      ),
                      onPressed: () {
                        setState(() {
                          _isActivityExpanded = !_isActivityExpanded;
                        });
                      },
                    ),
                  ],
                ),
              ],
            ),
            AnimatedCrossFade(
              firstChild: const SizedBox(height: 12),
              secondChild: Column(
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Times shown in $timeZone ($zoneAbbrev)',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (items.isEmpty)
                    const Text(
                      'No recent activity yet. As you start sharing events, updates will appear here.',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    )
                  else ...[
                    for (final activity in items) ...[
                      _buildActivityItem(
                        title: activity['title'] as String,
                        timestamp: activity['timestamp'] as DateTime,
                        type: activity['type'] as NotificationType,
                        now: now,
                        timeZone: timeZone,
                      ),
                      if (activity != items.last) const SizedBox(height: 16),
                    ],
                  ],
                ],
              ),
              crossFadeState: _isActivityExpanded
                  ? CrossFadeState.showSecond
                  : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 300),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem({
    required String title,
    required DateTime timestamp,
    required NotificationType type,
    required DateTime now,
    required String timeZone,
  }) {
    final dotColor = _notificationColor(type);
    final timeLabel = _formatRelativeTime(timestamp, now, timeZone);

    // Screen reader: "{text}, {time}"
    // Example: "Sam accepted your calendar invite, 1 day ago"
    return SemanticListItem(
      label: title,
      hint: timeLabel,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Decorative dot - hidden from screen readers
          DecorativeElement(
            child: Container(
              margin: const EdgeInsets.only(top: 4),
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  timeLabel,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  DateTime _startOfWeek(DateTime date) {
    final difference = date.weekday % 7;
    final start = date.subtract(Duration(days: difference));
    return DateTime(start.year, start.month, start.day);
  }

  String _formatCount(
    int count, {
    required String singular,
    required String plural,
    String? zeroText,
  }) {
    if (count == 0) {
      return zeroText ?? 'No $plural';
    }
    if (count == 1) {
      return '1 $singular';
    }
    return '$count $plural';
  }

  Color _notificationColor(NotificationType type) {
    switch (type) {
      case NotificationType.eventInvite:
      case NotificationType.partnerRequest:
        return AppColors.eventPurple;
      case NotificationType.partnerAccepted:
      case NotificationType.signalShared:
        return AppColors.eventGreen;
      case NotificationType.eventReminder:
      case NotificationType.eventUpdated:
        return AppColors.eventBlue;
      case NotificationType.eventCancelled:
        return AppColors.cardMaroon;
      case NotificationType.signalReceived:
        return AppColors.cardBlue;
      case NotificationType.system:
        return Colors.white.withValues(alpha: 0.7);
    }
  }

  String _formatRelativeTime(
      DateTime timestamp, DateTime now, String timeZone) {
    final localizedTimestamp = TimezoneService.convert(timestamp, timeZone);
    final localizedNow = TimezoneService.convert(now, timeZone);
    final diff = localizedNow.difference(localizedTimestamp);

    if (diff.inMinutes < 1) {
      return 'Just now';
    }
    if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    }
    if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    }
    if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    }

    return DateFormat('MMM d').format(localizedTimestamp);
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
}

class _DashboardSignalHighlight {
  const _DashboardSignalHighlight({required this.signal, required this.isOwn});

  final AvailabilitySignal signal;
  final bool isOwn;
}

class _SignalHighlightTile extends StatelessWidget {
  const _SignalHighlightTile({required this.entry, required this.timeZone});

  final _DashboardSignalHighlight entry;
  final String timeZone;

  @override
  Widget build(BuildContext context) {
    final signal = entry.signal;
    final localizedStart = TimezoneService.convert(signal.startTime, timeZone);
    final now = TimezoneService.nowIn(timeZone);
    final isOwn = entry.isOwn;
    final color = isOwn ? AppColors.signalAvailable : AppColors.signalShared;
    final ownerName = isOwn
        ? 'You'
        : DevDataService.getMockUserById(signal.userId)?.displayName ??
            'Partner';

    final active = SignalsService.isSignalActive(signal);
    final status = active
        ? 'Active • ${_dashboardFriendlyDuration(signal.endTime.difference(now))} left'
        : localizedStart.isAfter(now)
            ? 'Starts in ${_dashboardFriendlyDuration(localizedStart.difference(now))}'
            : 'Recently ended';

    final window = TimezoneService.formatEventWindow(
      start: signal.startTime,
      end: signal.endTime,
      displayName: timeZone,
    );
    final windowLabel = '${window.dateLabel} • ${window.timeLabel}';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isOwn ? Icons.wifi_tethering : Icons.people_outline,
              color: color,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ownerName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  status,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  windowLabel,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
                if (signal.message != null && signal.message!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '“${signal.message}”',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.75),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _dashboardFriendlyDuration(Duration duration) {
  if (duration.isNegative) return '0m';
  final hours = duration.inHours;
  final minutes = duration.inMinutes.remainder(60);
  if (hours == 0) {
    return '${minutes}m';
  }
  if (minutes == 0) {
    return '${hours}h';
  }
  return '${hours}h ${minutes}m';
}
